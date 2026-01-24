-- Card Service Database Schema
-- This migration creates all card-related tables in the dedicated card database
--
-- IMPORTANT: This database does NOT contain users or wallets tables.
-- User/wallet references are stored as UUIDs and validated via API calls to the main database.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- CARD TYPES (Admin-defined card products/templates)
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    card_image_url TEXT,
    price DECIMAL(15, 2) NOT NULL DEFAULT 0,
    transaction_fee_percentage DECIMAL(5, 4) DEFAULT 0,
    transaction_fee_fixed DECIMAL(15, 2) DEFAULT 0,
    required_kyc_level INT DEFAULT 1,
    card_type VARCHAR(20) NOT NULL DEFAULT 'VIRTUAL' CHECK (card_type IN ('VIRTUAL', 'PHYSICAL')),
    is_active BOOLEAN DEFAULT true,
    daily_limit DECIMAL(15, 2) DEFAULT 100000,
    weekly_limit DECIMAL(15, 2) DEFAULT 500000,
    monthly_limit DECIMAL(15, 2) DEFAULT 1000000,
    per_transaction_limit DECIMAL(15, 2) DEFAULT 50000,
    color_gradient VARCHAR(255) DEFAULT 'from-blue-600 to-blue-800',
    features JSONB DEFAULT '[]'::jsonb,
    -- Feature flags
    allow_negative_balance BOOLEAN DEFAULT false,
    allow_buy_now_pay_later BOOLEAN DEFAULT false,
    high_transaction_limit BOOLEAN DEFAULT false,
    no_transaction_fees BOOLEAN DEFAULT false,
    cashback_enabled BOOLEAN DEFAULT false,
    cashback_percentage DECIMAL(5, 2) DEFAULT 0,
    overdraft_limit DECIMAL(15, 2) DEFAULT 0,
    bnpl_max_amount DECIMAL(15, 2) DEFAULT 0,
    bnpl_interest_rate DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- ISSUED CARDS (Virtual closed-loop cards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS issued_cards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,  -- Reference to main DB users table
    wallet_id UUID NOT NULL,  -- Reference to main DB wallets table
    card_type_id UUID REFERENCES card_types(id),

    -- Card identifiers
    card_number VARCHAR(19) NOT NULL UNIQUE,
    card_last_four VARCHAR(4) NOT NULL,
    card_uid VARCHAR(32),
    card_uid_hash VARCHAR(64),

    -- Card metadata
    card_name VARCHAR(100) DEFAULT 'Virtual Card',
    card_label VARCHAR(50),
    card_color VARCHAR(20) DEFAULT '#1a1a2e',

    -- Expiry
    expiry_month INT NOT NULL,
    expiry_year INT NOT NULL,

    -- Security (hashed, never stored in plain text)
    cvv_hash VARCHAR(64) NOT NULL,
    pin_hash VARCHAR(64),
    activation_code VARCHAR(12),
    activation_code_hash VARCHAR(64),

    -- Status
    card_status VARCHAR(20) DEFAULT 'pending' CHECK (card_status IN ('pending', 'active', 'frozen', 'blocked', 'expired', 'terminated')),
    is_frozen BOOLEAN DEFAULT false,

    -- Spending limits
    daily_limit DECIMAL(15, 2) DEFAULT 100000,
    weekly_limit DECIMAL(15, 2) DEFAULT 500000,
    monthly_limit DECIMAL(15, 2) DEFAULT 1000000,
    per_transaction_limit DECIMAL(15, 2) DEFAULT 50000,

    -- Spending tracking
    daily_spent DECIMAL(15, 2) DEFAULT 0,
    weekly_spent DECIMAL(15, 2) DEFAULT 0,
    monthly_spent DECIMAL(15, 2) DEFAULT 0,
    spent_today DECIMAL(15, 2) DEFAULT 0,
    spent_this_month DECIMAL(15, 2) DEFAULT 0,
    last_spending_reset_daily TIMESTAMP WITH TIME ZONE,
    last_spending_reset_weekly TIMESTAMP WITH TIME ZONE,
    last_spending_reset_monthly TIMESTAMP WITH TIME ZONE,

    -- Controls
    contactless_enabled BOOLEAN DEFAULT true,
    international_enabled BOOLEAN DEFAULT false,
    online_payments_enabled BOOLEAN DEFAULT true,
    atm_withdrawals_enabled BOOLEAN DEFAULT false,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    activated_at TIMESTAMP WITH TIME ZONE,
    frozen_at TIMESTAMP WITH TIME ZONE,
    blocked_at TIMESTAMP WITH TIME ZONE,
    terminated_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- CARD TRANSACTIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES issued_cards(id),
    wallet_id UUID,  -- Reference to main DB

    -- Transaction identifiers
    transaction_reference VARCHAR(50) NOT NULL UNIQUE,
    authorization_code VARCHAR(20),

    -- Transaction details
    type VARCHAR(30) NOT NULL CHECK (type IN ('purchase', 'refund', 'topup', 'withdrawal', 'p2p_send', 'p2p_receive', 'fee', 'activation_credit')),
    amount DECIMAL(15, 2) NOT NULL,
    fee_amount DECIMAL(15, 2) DEFAULT 0,
    net_amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'SLE',

    -- Balance tracking
    balance_before DECIMAL(15, 2),
    balance_after DECIMAL(15, 2),

    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'authorized', 'captured', 'completed', 'failed', 'reversed', 'declined')),
    decline_reason VARCHAR(100),
    decline_code VARCHAR(10),

    -- Merchant info
    merchant_id VARCHAR(50),
    merchant_name VARCHAR(200),
    merchant_category VARCHAR(50),
    merchant_mcc VARCHAR(4),
    merchant_location TEXT,

    -- Terminal info
    terminal_id VARCHAR(50),
    terminal_type VARCHAR(20),

    -- Description
    description TEXT,

    -- Security
    fraud_score INT DEFAULT 0,
    fraud_check_result VARCHAR(20),
    crypto_validation_result VARCHAR(20),

    -- Location
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Device
    device_fingerprint VARCHAR(255),
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Offline support
    is_offline BOOLEAN DEFAULT false,
    synced_at TIMESTAMP WITH TIME ZONE,

    -- Refund tracking
    original_transaction_id UUID REFERENCES card_transactions(id),
    refund_amount DECIMAL(15, 2),
    refund_status VARCHAR(20),

    -- Settlement
    settlement_batch_id VARCHAR(50),
    settled_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    authorized_at TIMESTAMP WITH TIME ZONE,
    captured_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- CARD ORDERS (Purchase requests for new cards)
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,  -- Reference to main DB
    card_type_id UUID NOT NULL REFERENCES card_types(id),
    wallet_id UUID NOT NULL,  -- Reference to main DB

    -- Payment
    amount_paid DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',
    transaction_id VARCHAR(50),

    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'GENERATED', 'ACTIVATED', 'CANCELLED')),

    -- Generated card
    generated_card_id UUID REFERENCES issued_cards(id),
    card_number VARCHAR(19),
    qr_code_data TEXT,

    -- Review
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,

    -- Shipping (for physical cards)
    shipping_address JSONB,
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,

    -- NFC Programming
    nfc_programmed BOOLEAN DEFAULT false,
    nfc_card_uid VARCHAR(32),
    nfc_programmed_at TIMESTAMP WITH TIME ZONE,

    -- Activation
    activated_at TIMESTAMP WITH TIME ZONE,

    -- Gift card support
    is_gift BOOLEAN DEFAULT false,
    gift_recipient_id UUID,
    cardholder_name VARCHAR(200),
    card_pin VARCHAR(64),  -- Hashed

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CARD LIMIT HISTORY (Audit trail for limit changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_limit_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES issued_cards(id),
    changed_by UUID,
    change_reason TEXT,

    -- Old values
    old_daily_limit DECIMAL(15, 2),
    old_weekly_limit DECIMAL(15, 2),
    old_monthly_limit DECIMAL(15, 2),
    old_per_transaction_limit DECIMAL(15, 2),

    -- New values
    new_daily_limit DECIMAL(15, 2),
    new_weekly_limit DECIMAL(15, 2),
    new_monthly_limit DECIMAL(15, 2),
    new_per_transaction_limit DECIMAL(15, 2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CARD CONTROLS HISTORY (Audit trail for control changes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_controls_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES issued_cards(id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('freeze', 'unfreeze', 'block', 'unblock', 'activate', 'terminate')),
    performed_by UUID,
    reason TEXT,
    ip_address VARCHAR(45),
    device_fingerprint VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CARD TOKENS (Token vault for secure card references)
-- ============================================================================
CREATE TABLE IF NOT EXISTS card_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    card_id UUID NOT NULL REFERENCES issued_cards(id),
    token VARCHAR(64) NOT NULL UNIQUE,
    bin VARCHAR(8) NOT NULL,
    last_four VARCHAR(4) NOT NULL,
    token_type VARCHAR(20) DEFAULT 'NETWORK' CHECK (token_type IN ('NETWORK', 'MERCHANT', 'INTERNAL')),
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED')),
    merchant_id VARCHAR(50),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Card types
CREATE INDEX IF NOT EXISTS idx_card_types_active ON card_types(is_active);

-- Issued cards
CREATE INDEX IF NOT EXISTS idx_issued_cards_user_id ON issued_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_issued_cards_wallet_id ON issued_cards(wallet_id);
CREATE INDEX IF NOT EXISTS idx_issued_cards_status ON issued_cards(card_status);
CREATE INDEX IF NOT EXISTS idx_issued_cards_number ON issued_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_issued_cards_uid_hash ON issued_cards(card_uid_hash);

-- Card transactions
CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_wallet_id ON card_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_status ON card_transactions(status);
CREATE INDEX IF NOT EXISTS idx_card_transactions_created ON card_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_transactions_reference ON card_transactions(transaction_reference);
CREATE INDEX IF NOT EXISTS idx_card_transactions_merchant ON card_transactions(merchant_id);

-- Card orders
CREATE INDEX IF NOT EXISTS idx_card_orders_user_id ON card_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_card_orders_status ON card_orders(status);
CREATE INDEX IF NOT EXISTS idx_card_orders_created ON card_orders(created_at DESC);

-- Card tokens
CREATE INDEX IF NOT EXISTS idx_card_tokens_card_id ON card_tokens(card_id);
CREATE INDEX IF NOT EXISTS idx_card_tokens_token ON card_tokens(token);
CREATE INDEX IF NOT EXISTS idx_card_tokens_merchant ON card_tokens(merchant_id) WHERE merchant_id IS NOT NULL;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate Luhn-valid card number
CREATE OR REPLACE FUNCTION generate_card_number(prefix VARCHAR DEFAULT '620000')
RETURNS VARCHAR AS $$
DECLARE
    partial VARCHAR;
    check_digit INT;
    i INT;
    digit INT;
    sum INT := 0;
    len INT;
BEGIN
    -- Generate random middle digits
    partial := prefix || lpad(floor(random() * 1000000000)::TEXT, 9, '0');
    len := length(partial);

    -- Calculate Luhn check digit
    FOR i IN REVERSE len..1 LOOP
        digit := (partial::TEXT)[i:i]::INT;
        IF (len - i + 1) % 2 = 0 THEN
            digit := digit * 2;
            IF digit > 9 THEN
                digit := digit - 9;
            END IF;
        END IF;
        sum := sum + digit;
    END LOOP;

    check_digit := (10 - (sum % 10)) % 10;

    RETURN partial || check_digit::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Issue a new virtual card
CREATE OR REPLACE FUNCTION request_card(
    p_user_id UUID,
    p_wallet_id UUID,
    p_card_name VARCHAR,
    p_card_label VARCHAR DEFAULT NULL,
    p_card_color VARCHAR DEFAULT '#1a1a2e'
)
RETURNS JSONB AS $$
DECLARE
    v_card_number VARCHAR;
    v_card_id UUID;
    v_cvv VARCHAR(3);
    v_cvv_hash VARCHAR(64);
    v_activation_code VARCHAR(12);
    v_activation_code_hash VARCHAR(64);
    v_expiry_month INT;
    v_expiry_year INT;
BEGIN
    -- Generate card number
    v_card_number := generate_card_number('620000');

    -- Generate CVV
    v_cvv := lpad((floor(random() * 900) + 100)::TEXT, 3, '0');
    v_cvv_hash := encode(digest(v_cvv, 'sha256'), 'hex');

    -- Generate activation code
    v_activation_code := upper(encode(gen_random_bytes(6), 'hex'));
    v_activation_code_hash := encode(digest(v_activation_code, 'sha256'), 'hex');

    -- Set expiry (3 years from now)
    v_expiry_month := EXTRACT(MONTH FROM CURRENT_DATE);
    v_expiry_year := EXTRACT(YEAR FROM CURRENT_DATE) + 3;

    -- Insert the card
    INSERT INTO issued_cards (
        user_id,
        wallet_id,
        card_number,
        card_last_four,
        card_name,
        card_label,
        card_color,
        expiry_month,
        expiry_year,
        cvv_hash,
        activation_code,
        activation_code_hash,
        card_status
    ) VALUES (
        p_user_id,
        p_wallet_id,
        v_card_number,
        RIGHT(v_card_number, 4),
        p_card_name,
        p_card_label,
        p_card_color,
        v_expiry_month,
        v_expiry_year,
        v_cvv_hash,
        v_activation_code,
        v_activation_code_hash,
        'pending'
    ) RETURNING id INTO v_card_id;

    -- Return the card details (CVV only returned once at creation)
    RETURN jsonb_build_object(
        'success', true,
        'card_id', v_card_id,
        'card_last_four', RIGHT(v_card_number, 4),
        'activation_code', v_activation_code,
        'cvv', v_cvv,
        'message', 'Card issued successfully. Save your CVV - it will not be shown again.'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Activate a card
CREATE OR REPLACE FUNCTION activate_card(
    p_card_id UUID,
    p_user_id UUID,
    p_activation_code VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_card issued_cards%ROWTYPE;
    v_code_hash VARCHAR(64);
BEGIN
    -- Get the card
    SELECT * INTO v_card FROM issued_cards WHERE id = p_card_id AND user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Card not found');
    END IF;

    IF v_card.card_status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Card is already activated or blocked');
    END IF;

    -- Verify activation code
    v_code_hash := encode(digest(p_activation_code, 'sha256'), 'hex');
    IF v_card.activation_code_hash != v_code_hash THEN
        RETURN jsonb_build_object('success', false, 'message', 'Invalid activation code');
    END IF;

    -- Activate the card
    UPDATE issued_cards SET
        card_status = 'active',
        activated_at = CURRENT_TIMESTAMP,
        activation_code = NULL,  -- Clear activation code after use
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_card_id;

    -- Record in history
    INSERT INTO card_controls_history (card_id, action, performed_by, reason)
    VALUES (p_card_id, 'activate', p_user_id, 'User activated card');

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Card activated successfully'
    );
END;
$$ LANGUAGE plpgsql;

-- Verify CVV for payment
CREATE OR REPLACE FUNCTION verify_card_cvv(
    p_card_number VARCHAR,
    p_cvv VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_card issued_cards%ROWTYPE;
    v_cvv_hash VARCHAR(64);
BEGIN
    -- Get the card
    SELECT * INTO v_card FROM issued_cards WHERE card_number = p_card_number;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card not found');
    END IF;

    IF v_card.card_status != 'active' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Card is ' || v_card.card_status);
    END IF;

    -- Verify CVV
    v_cvv_hash := encode(digest(p_cvv, 'sha256'), 'hex');
    IF v_card.cvv_hash != v_cvv_hash THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid CVV');
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'cardId', v_card.id,
        'maskedNumber', '****' || v_card.card_last_four,
        'cardholderName', v_card.card_name,
        'walletId', v_card.wallet_id,
        'status', v_card.card_status
    );
END;
$$ LANGUAGE plpgsql;

-- Reset daily spending (called by cron job)
CREATE OR REPLACE FUNCTION reset_daily_spending()
RETURNS void AS $$
BEGIN
    UPDATE issued_cards SET
        daily_spent = 0,
        spent_today = 0,
        last_spending_reset_daily = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE card_status = 'active'
    AND (last_spending_reset_daily IS NULL OR last_spending_reset_daily < CURRENT_DATE);
END;
$$ LANGUAGE plpgsql;

-- Reset weekly spending
CREATE OR REPLACE FUNCTION reset_weekly_spending()
RETURNS void AS $$
BEGIN
    UPDATE issued_cards SET
        weekly_spent = 0,
        last_spending_reset_weekly = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE card_status = 'active'
    AND (last_spending_reset_weekly IS NULL OR last_spending_reset_weekly < date_trunc('week', CURRENT_TIMESTAMP));
END;
$$ LANGUAGE plpgsql;

-- Reset monthly spending
CREATE OR REPLACE FUNCTION reset_monthly_spending()
RETURNS void AS $$
BEGIN
    UPDATE issued_cards SET
        monthly_spent = 0,
        spent_this_month = 0,
        last_spending_reset_monthly = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE card_status = 'active'
    AND (last_spending_reset_monthly IS NULL OR last_spending_reset_monthly < date_trunc('month', CURRENT_TIMESTAMP));
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_issued_cards_updated_at
    BEFORE UPDATE ON issued_cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_card_orders_updated_at
    BEFORE UPDATE ON card_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER tr_card_types_updated_at
    BEFORE UPDATE ON card_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Record limit changes
CREATE OR REPLACE FUNCTION record_limit_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.daily_limit != NEW.daily_limit OR
       OLD.weekly_limit != NEW.weekly_limit OR
       OLD.monthly_limit != NEW.monthly_limit OR
       OLD.per_transaction_limit != NEW.per_transaction_limit THEN

        INSERT INTO card_limit_history (
            card_id,
            old_daily_limit, old_weekly_limit, old_monthly_limit, old_per_transaction_limit,
            new_daily_limit, new_weekly_limit, new_monthly_limit, new_per_transaction_limit
        ) VALUES (
            NEW.id,
            OLD.daily_limit, OLD.weekly_limit, OLD.monthly_limit, OLD.per_transaction_limit,
            NEW.daily_limit, NEW.weekly_limit, NEW.monthly_limit, NEW.per_transaction_limit
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_issued_cards_limit_change
    AFTER UPDATE ON issued_cards
    FOR EACH ROW EXECUTE FUNCTION record_limit_change();

COMMIT;
