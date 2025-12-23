-- ============================================================================
-- NFC PREPAID CARD SYSTEM - HELPER FUNCTIONS
-- Migration: 002_nfc_helper_functions.sql
-- Description: Stored procedures and RPC functions for NFC card operations
-- ============================================================================

-- ============================================================================
-- INVENTORY MANAGEMENT FUNCTIONS
-- ============================================================================

-- Add to vendor inventory value
CREATE OR REPLACE FUNCTION add_to_inventory_value(
    p_vendor_id UUID,
    p_amount DECIMAL(15,2)
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_new_value DECIMAL(15,2);
BEGIN
    UPDATE nfc_card_vendors
    SET current_inventory_value = current_inventory_value + p_amount
    WHERE id = p_vendor_id
    RETURNING current_inventory_value INTO v_new_value;

    RETURN v_new_value;
END;
$$ LANGUAGE plpgsql;

-- Increment inventory sold count
CREATE OR REPLACE FUNCTION increment_inventory_sold(
    p_inventory_id UUID,
    p_sale_amount DECIMAL(15,2),
    p_commission DECIMAL(15,2)
)
RETURNS VOID AS $$
BEGIN
    UPDATE nfc_vendor_inventory
    SET
        cards_sold = cards_sold + 1,
        sales_value = sales_value + p_sale_amount,
        commission_earned = commission_earned + p_commission
    WHERE id = p_inventory_id;
END;
$$ LANGUAGE plpgsql;

-- Increment batch activated count
CREATE OR REPLACE FUNCTION increment_batch_activated(
    p_batch_id UUID
)
RETURNS VOID AS $$
BEGIN
    UPDATE nfc_card_batches
    SET cards_activated = cards_activated + 1
    WHERE id = p_batch_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- WALLET OPERATIONS
-- ============================================================================

-- Debit wallet balance
CREATE OR REPLACE FUNCTION debit_wallet(
    p_wallet_id UUID,
    p_amount DECIMAL(15,2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance DECIMAL(15,2);
BEGIN
    -- Get current balance with lock
    SELECT available_balance INTO v_current_balance
    FROM wallets
    WHERE id = p_wallet_id
    FOR UPDATE;

    IF v_current_balance IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    IF v_current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    UPDATE wallets
    SET
        available_balance = available_balance - p_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Credit wallet balance
CREATE OR REPLACE FUNCTION credit_wallet(
    p_wallet_id UUID,
    p_amount DECIMAL(15,2)
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE wallets
    SET
        available_balance = available_balance + p_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRANSACTION PROCESSING FUNCTIONS
-- ============================================================================

-- Process NFC card payment (atomic transaction)
CREATE OR REPLACE FUNCTION process_nfc_payment(
    p_card_id UUID,
    p_amount DECIMAL(15,2),
    p_fee DECIMAL(15,2),
    p_merchant_id UUID,
    p_terminal_id VARCHAR(30),
    p_latitude DECIMAL(10,7) DEFAULT NULL,
    p_longitude DECIMAL(10,7) DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    transaction_id UUID,
    authorization_code VARCHAR(12),
    new_balance DECIMAL(15,2),
    decline_code VARCHAR(10),
    decline_reason VARCHAR(50)
) AS $$
DECLARE
    v_card RECORD;
    v_program RECORD;
    v_total_debit DECIMAL(15,2);
    v_auth_code VARCHAR(12);
    v_txn_ref VARCHAR(30);
    v_txn_id UUID;
BEGIN
    -- Initialize return values
    success := FALSE;
    transaction_id := NULL;
    authorization_code := NULL;
    new_balance := NULL;
    decline_code := NULL;
    decline_reason := NULL;

    -- Lock the card row
    SELECT c.*, p.per_transaction_limit, p.daily_transaction_limit
    INTO v_card
    FROM nfc_prepaid_cards c
    JOIN nfc_card_programs p ON c.program_id = p.id
    WHERE c.id = p_card_id
    FOR UPDATE;

    IF NOT FOUND THEN
        decline_code := '14';
        decline_reason := 'Card not found';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check card state
    IF v_card.state != 'ACTIVATED' THEN
        IF v_card.state = 'SUSPENDED' THEN
            decline_code := '03';
            decline_reason := 'Card suspended';
        ELSIF v_card.state = 'BLOCKED' THEN
            decline_code := '04';
            decline_reason := 'Card blocked';
        ELSE
            decline_code := '02';
            decline_reason := 'Card not activated';
        END IF;
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check expiry
    IF v_card.expires_at < CURRENT_DATE THEN
        decline_code := '05';
        decline_reason := 'Card expired';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check per-transaction limit
    IF p_amount > COALESCE(v_card.per_transaction_limit, v_card.per_transaction_limit) THEN
        decline_code := '06';
        decline_reason := 'Transaction limit exceeded';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check daily limit
    IF v_card.daily_spent + p_amount > COALESCE(v_card.daily_limit, v_card.daily_transaction_limit) THEN
        decline_code := '07';
        decline_reason := 'Daily limit exceeded';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Calculate total debit
    v_total_debit := p_amount + p_fee;

    -- Check balance
    IF v_card.balance < v_total_debit THEN
        decline_code := '01';
        decline_reason := 'Insufficient balance';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Generate authorization code and transaction reference
    v_auth_code := UPPER(encode(gen_random_bytes(6), 'hex'));
    v_txn_ref := 'TXN-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || UPPER(encode(gen_random_bytes(4), 'hex'));

    -- Debit card balance and update spending trackers
    UPDATE nfc_prepaid_cards
    SET
        balance = balance - v_total_debit,
        daily_spent = daily_spent + p_amount,
        weekly_spent = weekly_spent + p_amount,
        monthly_spent = monthly_spent + p_amount,
        daily_transaction_count = daily_transaction_count + 1,
        last_used_at = NOW(),
        last_location_lat = p_latitude,
        last_location_lng = p_longitude
    WHERE id = p_card_id;

    -- Create transaction record
    INSERT INTO nfc_card_transactions (
        transaction_reference,
        authorization_code,
        card_id,
        transaction_type,
        amount,
        fee_amount,
        net_amount,
        currency,
        balance_before,
        balance_after,
        state,
        merchant_id,
        terminal_id,
        latitude,
        longitude,
        crypto_validation_result,
        authorized_at,
        captured_at
    ) VALUES (
        v_txn_ref,
        v_auth_code,
        p_card_id,
        'PURCHASE',
        p_amount,
        p_fee,
        p_amount - p_fee,
        v_card.currency,
        v_card.balance,
        v_card.balance - v_total_debit,
        'CAPTURED',
        p_merchant_id,
        p_terminal_id,
        p_latitude,
        p_longitude,
        'VALID',
        NOW(),
        NOW()
    )
    RETURNING id INTO v_txn_id;

    -- Set success values
    success := TRUE;
    transaction_id := v_txn_id;
    authorization_code := v_auth_code;
    new_balance := v_card.balance - v_total_debit;

    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CARD LIFECYCLE FUNCTIONS
-- ============================================================================

-- Activate card
CREATE OR REPLACE FUNCTION activate_nfc_card(
    p_card_id UUID,
    p_user_id UUID,
    p_wallet_id UUID,
    p_device_fingerprint VARCHAR(255) DEFAULT NULL,
    p_latitude DECIMAL(10,7) DEFAULT NULL,
    p_longitude DECIMAL(10,7) DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    initial_balance DECIMAL(15,2),
    error_message TEXT
) AS $$
DECLARE
    v_card RECORD;
    v_program RECORD;
BEGIN
    -- Initialize
    success := FALSE;
    initial_balance := 0;
    error_message := NULL;

    -- Lock the card
    SELECT c.*, p.initial_balance AS program_initial_balance
    INTO v_card
    FROM nfc_prepaid_cards c
    JOIN nfc_card_programs p ON c.program_id = p.id
    WHERE c.id = p_card_id
    FOR UPDATE;

    IF NOT FOUND THEN
        error_message := 'Card not found';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if already activated
    IF v_card.state = 'ACTIVATED' THEN
        error_message := 'Card already activated';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if in valid state for activation
    IF v_card.state NOT IN ('SOLD', 'INACTIVE') THEN
        error_message := 'Card cannot be activated (state: ' || v_card.state || ')';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check expiry
    IF v_card.expires_at < CURRENT_DATE THEN
        error_message := 'Card has expired';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Activate the card
    UPDATE nfc_prepaid_cards
    SET
        state = 'ACTIVATED',
        user_id = p_user_id,
        wallet_id = p_wallet_id,
        balance = v_card.program_initial_balance,
        activated_at = NOW(),
        last_device_fingerprint = p_device_fingerprint,
        last_location_lat = p_latitude,
        last_location_lng = p_longitude,
        activation_code = NULL  -- Clear activation code after use
    WHERE id = p_card_id;

    -- Update batch stats
    UPDATE nfc_card_batches
    SET cards_activated = cards_activated + 1
    WHERE id = v_card.batch_id;

    -- Create initial balance transaction if applicable
    IF v_card.program_initial_balance > 0 THEN
        INSERT INTO nfc_card_transactions (
            transaction_reference,
            card_id,
            transaction_type,
            amount,
            fee_amount,
            net_amount,
            currency,
            balance_before,
            balance_after,
            state,
            captured_at
        ) VALUES (
            'ACT-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || UPPER(encode(gen_random_bytes(4), 'hex')),
            p_card_id,
            'ACTIVATION_CREDIT',
            v_card.program_initial_balance,
            0,
            v_card.program_initial_balance,
            v_card.currency,
            0,
            v_card.program_initial_balance,
            'CAPTURED',
            NOW()
        );
    END IF;

    success := TRUE;
    initial_balance := v_card.program_initial_balance;

    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Freeze card
CREATE OR REPLACE FUNCTION freeze_nfc_card(
    p_card_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE nfc_prepaid_cards
    SET
        state = 'SUSPENDED',
        suspended_at = NOW()
    WHERE id = p_card_id
      AND user_id = p_user_id
      AND state = 'ACTIVATED';

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Unfreeze card
CREATE OR REPLACE FUNCTION unfreeze_nfc_card(
    p_card_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE nfc_prepaid_cards
    SET
        state = 'ACTIVATED',
        suspended_at = NULL
    WHERE id = p_card_id
      AND user_id = p_user_id
      AND state = 'SUSPENDED';

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Block card (permanent)
CREATE OR REPLACE FUNCTION block_nfc_card(
    p_card_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    v_rows_affected INTEGER;
BEGIN
    UPDATE nfc_prepaid_cards
    SET
        state = 'BLOCKED',
        blocked_at = NOW()
    WHERE id = p_card_id
      AND user_id = p_user_id
      AND state IN ('ACTIVATED', 'SUSPENDED');

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    IF v_rows_affected > 0 THEN
        -- Log the block action
        INSERT INTO nfc_audit_log (
            event_type,
            event_category,
            entity_type,
            entity_id,
            actor_type,
            actor_id,
            action,
            new_values
        ) VALUES (
            'CARD_BLOCKED',
            'CARD_LIFECYCLE',
            'nfc_prepaid_cards',
            p_card_id,
            'USER',
            p_user_id,
            'BLOCK',
            jsonb_build_object('reason', p_reason)
        );
    END IF;

    RETURN v_rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- RELOAD FUNCTIONS
-- ============================================================================

-- Reload card from wallet
CREATE OR REPLACE FUNCTION reload_nfc_card(
    p_card_id UUID,
    p_user_id UUID,
    p_amount DECIMAL(15,2),
    p_source_wallet_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    new_balance DECIMAL(15,2),
    transaction_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_card RECORD;
    v_program RECORD;
    v_wallet RECORD;
    v_fee DECIMAL(15,2);
    v_total_charge DECIMAL(15,2);
    v_txn_ref VARCHAR(30);
    v_txn_id UUID;
BEGIN
    -- Initialize
    success := FALSE;
    new_balance := NULL;
    transaction_id := NULL;
    error_message := NULL;

    -- Get card with program
    SELECT c.*, p.*
    INTO v_card
    FROM nfc_prepaid_cards c
    JOIN nfc_card_programs p ON c.program_id = p.id
    WHERE c.id = p_card_id
      AND c.user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        error_message := 'Card not found or access denied';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if card is active
    IF v_card.state != 'ACTIVATED' THEN
        error_message := 'Card is not active';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check if card is reloadable
    IF NOT v_card.is_reloadable THEN
        error_message := 'This card type is not reloadable';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check reload limits
    IF p_amount < COALESCE(v_card.min_reload_amount, 0) THEN
        error_message := 'Reload amount below minimum';
        RETURN NEXT;
        RETURN;
    END IF;

    IF p_amount > COALESCE(v_card.max_reload_amount, 999999999) THEN
        error_message := 'Reload amount exceeds maximum';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Check max balance
    IF v_card.balance + p_amount > v_card.max_balance THEN
        error_message := 'Reload would exceed maximum balance';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Calculate fee
    v_fee := ROUND((p_amount * COALESCE(v_card.reload_fee_percentage, 0) / 100) + COALESCE(v_card.reload_fee_fixed, 0), 2);
    v_total_charge := p_amount + v_fee;

    -- Get wallet and verify balance
    SELECT * INTO v_wallet
    FROM wallets
    WHERE id = p_source_wallet_id
      AND owner_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        error_message := 'Wallet not found';
        RETURN NEXT;
        RETURN;
    END IF;

    IF v_wallet.available_balance < v_total_charge THEN
        error_message := 'Insufficient wallet balance';
        RETURN NEXT;
        RETURN;
    END IF;

    -- Debit wallet
    UPDATE wallets
    SET available_balance = available_balance - v_total_charge
    WHERE id = p_source_wallet_id;

    -- Credit card
    UPDATE nfc_prepaid_cards
    SET balance = balance + p_amount
    WHERE id = p_card_id
    RETURNING balance INTO new_balance;

    -- Create transaction
    v_txn_ref := 'RLD-' || EXTRACT(EPOCH FROM NOW())::BIGINT || '-' || UPPER(encode(gen_random_bytes(4), 'hex'));

    INSERT INTO nfc_card_transactions (
        transaction_reference,
        card_id,
        transaction_type,
        amount,
        fee_amount,
        net_amount,
        currency,
        balance_before,
        balance_after,
        state,
        captured_at
    ) VALUES (
        v_txn_ref,
        p_card_id,
        'RELOAD',
        p_amount,
        v_fee,
        p_amount,
        v_card.currency,
        v_card.balance,
        new_balance,
        'CAPTURED',
        NOW()
    )
    RETURNING id INTO v_txn_id;

    -- Create reload record
    INSERT INTO nfc_card_reloads (
        card_id,
        transaction_id,
        reload_amount,
        fee_amount,
        total_charged,
        reload_source,
        source_wallet_id,
        balance_before,
        balance_after,
        status,
        completed_at
    ) VALUES (
        p_card_id,
        v_txn_id,
        p_amount,
        v_fee,
        v_total_charge,
        'WALLET',
        p_source_wallet_id,
        v_card.balance,
        new_balance,
        'COMPLETED',
        NOW()
    );

    success := TRUE;
    transaction_id := v_txn_id;

    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- REPORTING FUNCTIONS
-- ============================================================================

-- Get card balance
CREATE OR REPLACE FUNCTION get_nfc_card_balance(
    p_card_id UUID,
    p_user_id UUID
)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_balance DECIMAL(15,2);
BEGIN
    SELECT balance INTO v_balance
    FROM nfc_prepaid_cards
    WHERE id = p_card_id
      AND user_id = p_user_id;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Get vendor sales summary
CREATE OR REPLACE FUNCTION get_vendor_sales_summary(
    p_vendor_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_cards_sold INTEGER,
    gross_sales DECIMAL(15,2),
    total_commission DECIMAL(15,2),
    net_payable DECIMAL(15,2)
) AS $$
BEGIN
    SELECT
        COUNT(*)::INTEGER,
        COALESCE(SUM(sale_price), 0),
        COALESCE(SUM(commission_amount), 0),
        COALESCE(SUM(net_amount), 0)
    INTO
        total_cards_sold,
        gross_sales,
        total_commission,
        net_payable
    FROM nfc_vendor_sales
    WHERE vendor_id = p_vendor_id
      AND (p_start_date IS NULL OR sold_at >= p_start_date)
      AND (p_end_date IS NULL OR sold_at <= p_end_date);

    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- Get daily transaction summary
CREATE OR REPLACE FUNCTION get_daily_transaction_summary(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_transactions INTEGER,
    successful_transactions INTEGER,
    declined_transactions INTEGER,
    total_volume DECIMAL(15,2),
    total_fees DECIMAL(15,2),
    average_transaction DECIMAL(15,2)
) AS $$
BEGIN
    SELECT
        COUNT(*)::INTEGER,
        COUNT(*) FILTER (WHERE state = 'CAPTURED')::INTEGER,
        COUNT(*) FILTER (WHERE state = 'DECLINED')::INTEGER,
        COALESCE(SUM(amount) FILTER (WHERE state = 'CAPTURED'), 0),
        COALESCE(SUM(fee_amount) FILTER (WHERE state = 'CAPTURED'), 0),
        COALESCE(AVG(amount) FILTER (WHERE state = 'CAPTURED'), 0)
    INTO
        total_transactions,
        successful_transactions,
        declined_transactions,
        total_volume,
        total_fees,
        average_transaction
    FROM nfc_card_transactions
    WHERE DATE(created_at) = p_date
      AND transaction_type = 'PURCHASE';

    RETURN NEXT;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- CLEANUP FUNCTIONS
-- ============================================================================

-- Clean expired challenges
CREATE OR REPLACE FUNCTION cleanup_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    DELETE FROM nfc_challenges
    WHERE expires_at < NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Create challenges table if not exists
CREATE TABLE IF NOT EXISTS nfc_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    challenge_id VARCHAR(50) UNIQUE NOT NULL,
    challenge VARCHAR(64) NOT NULL,
    card_uid_hash VARCHAR(64) NOT NULL,
    terminal_id VARCHAR(30),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_nfc_challenges_expiry ON nfc_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_nfc_challenges_card ON nfc_challenges(card_uid_hash);

-- ============================================================================
-- SCHEDULED JOBS (to be run via cron/pg_cron)
-- ============================================================================

-- Example pg_cron schedules (run these manually or via pg_cron extension):
-- SELECT cron.schedule('reset-daily-spending', '0 0 * * *', 'SELECT reset_nfc_daily_spending()');
-- SELECT cron.schedule('reset-weekly-spending', '0 0 * * 0', 'SELECT reset_nfc_weekly_spending()');
-- SELECT cron.schedule('reset-monthly-spending', '0 0 1 * *', 'SELECT reset_nfc_monthly_spending()');
-- SELECT cron.schedule('cleanup-challenges', '*/5 * * * *', 'SELECT cleanup_expired_challenges()');
