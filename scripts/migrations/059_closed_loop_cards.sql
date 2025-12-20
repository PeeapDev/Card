-- =====================================================
-- CLOSED-LOOP CARD SYSTEM
-- Peeap Virtual Card Infrastructure
-- =====================================================
-- This migration creates a complete closed-loop card system
-- Cards work only within the Peeap ecosystem (platform merchants, P2P)
-- Can be upgraded to open-loop (Visa/MC) when partnering with card issuers
-- =====================================================

-- Card Status Enum
DO $$ BEGIN
    CREATE TYPE card_status AS ENUM (
        'pending',      -- Card requested, awaiting approval
        'active',       -- Card is active and usable
        'frozen',       -- Temporarily frozen by user or admin
        'blocked',      -- Blocked due to fraud or violations
        'expired',      -- Card has expired
        'cancelled'     -- Permanently cancelled
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Card Type Enum
DO $$ BEGIN
    CREATE TYPE card_type AS ENUM (
        'virtual',      -- Virtual card (no physical)
        'physical'      -- Physical card (future use)
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Card Transaction Status Enum
DO $$ BEGIN
    CREATE TYPE card_transaction_status AS ENUM (
        'pending',      -- Transaction initiated
        'authorized',   -- Amount held/reserved
        'completed',    -- Transaction settled
        'declined',     -- Transaction declined
        'reversed',     -- Transaction reversed/refunded
        'expired'       -- Authorization expired
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- ISSUED CARDS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS issued_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,

    -- Card Details (encrypted in production)
    card_number VARCHAR(16) NOT NULL UNIQUE,  -- 16-digit card number
    card_last_four VARCHAR(4) NOT NULL,       -- Last 4 digits for display
    expiry_month INTEGER NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
    expiry_year INTEGER NOT NULL CHECK (expiry_year >= 2024),
    cvv_hash VARCHAR(255) NOT NULL,           -- Hashed CVV (never store plain)

    -- Card Info
    card_type card_type DEFAULT 'virtual',
    card_status card_status DEFAULT 'pending',
    card_name VARCHAR(100) NOT NULL,          -- Name on card
    card_label VARCHAR(50),                   -- User's custom label (e.g., "Shopping Card")

    -- Card Design
    card_color VARCHAR(20) DEFAULT '#1a1a2e', -- Card background color
    card_design VARCHAR(50) DEFAULT 'default', -- Design template

    -- Spending Limits (in lowest currency unit - e.g., cents)
    daily_limit BIGINT DEFAULT 500000,        -- Default 5000.00
    weekly_limit BIGINT DEFAULT 2000000,      -- Default 20000.00
    monthly_limit BIGINT DEFAULT 5000000,     -- Default 50000.00
    per_transaction_limit BIGINT DEFAULT 100000, -- Default 1000.00

    -- Spending Tracking (resets periodically)
    daily_spent BIGINT DEFAULT 0,
    weekly_spent BIGINT DEFAULT 0,
    monthly_spent BIGINT DEFAULT 0,
    last_daily_reset TIMESTAMPTZ DEFAULT NOW(),
    last_weekly_reset TIMESTAMPTZ DEFAULT NOW(),
    last_monthly_reset TIMESTAMPTZ DEFAULT NOW(),

    -- Controls
    online_payments_enabled BOOLEAN DEFAULT TRUE,
    contactless_enabled BOOLEAN DEFAULT TRUE,
    atm_withdrawals_enabled BOOLEAN DEFAULT FALSE,  -- For future physical cards
    international_enabled BOOLEAN DEFAULT FALSE,    -- For future open-loop

    -- Merchant Category Controls (MCC codes to block)
    blocked_categories TEXT[] DEFAULT '{}',   -- e.g., {'gambling', 'adult'}
    allowed_merchants UUID[] DEFAULT '{}',    -- Specific merchant IDs (empty = all allowed)
    blocked_merchants UUID[] DEFAULT '{}',    -- Specific merchant IDs to block

    -- 3D Secure (for future open-loop integration)
    three_ds_enrolled BOOLEAN DEFAULT FALSE,
    three_ds_secret_hash VARCHAR(255),        -- Hashed 3DS password

    -- PIN (for physical cards / ATM)
    pin_hash VARCHAR(255),
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TIMESTAMPTZ,

    -- Activation
    activated_at TIMESTAMPTZ,
    activation_code VARCHAR(6),               -- Code sent via SMS/Email
    activation_attempts INTEGER DEFAULT 0,

    -- Admin
    issued_by UUID REFERENCES users(id),
    approved_by UUID REFERENCES users(id),
    approved_at TIMESTAMPTZ,
    blocked_reason TEXT,
    blocked_by UUID REFERENCES users(id),
    blocked_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CARD TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS card_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES issued_cards(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id),

    -- Transaction Details
    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN (
        'purchase',      -- Payment at merchant
        'refund',        -- Refund from merchant
        'p2p_send',      -- Card-to-card transfer (send)
        'p2p_receive',   -- Card-to-card transfer (receive)
        'top_up',        -- Add funds to card
        'withdrawal',    -- ATM withdrawal (future)
        'fee'            -- Card fees
    )),

    -- Amount
    amount BIGINT NOT NULL,                   -- Amount in lowest unit
    currency VARCHAR(3) DEFAULT 'SLE',

    -- Status
    status card_transaction_status DEFAULT 'pending',

    -- Merchant Info (for purchases)
    merchant_id UUID REFERENCES businesses(id),
    merchant_name VARCHAR(255),
    merchant_category VARCHAR(50),            -- MCC description
    merchant_mcc VARCHAR(4),                  -- MCC code

    -- Authorization
    auth_code VARCHAR(20),                    -- Authorization code
    auth_expires_at TIMESTAMPTZ,              -- When auth expires

    -- Reference
    reference VARCHAR(100) UNIQUE,
    external_reference VARCHAR(100),          -- Merchant's reference
    description TEXT,

    -- Location (optional)
    location_lat DECIMAL(10, 8),
    location_lng DECIMAL(11, 8),
    location_name VARCHAR(255),

    -- Decline Info
    decline_reason VARCHAR(100),
    decline_code VARCHAR(10),

    -- Settlement
    settled_at TIMESTAMPTZ,
    settlement_amount BIGINT,                 -- Final settled amount
    settlement_reference VARCHAR(100),

    -- Related Records
    related_wallet_transaction_id UUID,       -- Link to wallet transaction
    related_card_transaction_id UUID,         -- For P2P: link to counterpart

    -- Metadata
    device_info JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CARD LIMIT HISTORY TABLE
-- Track limit changes for audit
-- =====================================================
CREATE TABLE IF NOT EXISTS card_limit_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES issued_cards(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id),

    limit_type VARCHAR(20) NOT NULL CHECK (limit_type IN (
        'daily', 'weekly', 'monthly', 'per_transaction'
    )),
    old_limit BIGINT,
    new_limit BIGINT,
    reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CARD CONTROLS HISTORY TABLE
-- Track control changes for audit
-- =====================================================
CREATE TABLE IF NOT EXISTS card_controls_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES issued_cards(id) ON DELETE CASCADE,
    changed_by UUID REFERENCES users(id),

    control_type VARCHAR(50) NOT NULL,        -- e.g., 'online_payments', 'frozen'
    old_value TEXT,
    new_value TEXT,
    reason TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_issued_cards_user_id ON issued_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_issued_cards_wallet_id ON issued_cards(wallet_id);
CREATE INDEX IF NOT EXISTS idx_issued_cards_status ON issued_cards(card_status);
CREATE INDEX IF NOT EXISTS idx_issued_cards_card_number ON issued_cards(card_number);
CREATE INDEX IF NOT EXISTS idx_issued_cards_last_four ON issued_cards(card_last_four);
CREATE INDEX IF NOT EXISTS idx_issued_cards_created_at ON issued_cards(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_user_id ON card_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_wallet_id ON card_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_status ON card_transactions(status);
CREATE INDEX IF NOT EXISTS idx_card_transactions_merchant_id ON card_transactions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_reference ON card_transactions(reference);
CREATE INDEX IF NOT EXISTS idx_card_transactions_created_at ON card_transactions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_card_limit_history_card_id ON card_limit_history(card_id);
CREATE INDEX IF NOT EXISTS idx_card_controls_history_card_id ON card_controls_history(card_id);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate unique card number (closed-loop prefix: 6000)
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS VARCHAR(16) AS $$
DECLARE
    new_number VARCHAR(16);
    exists_check BOOLEAN;
BEGIN
    LOOP
        -- Format: 6000 XXXX XXXX XXXX (6000 prefix for closed-loop)
        new_number := '6000' || LPAD(FLOOR(RANDOM() * 999999999999)::TEXT, 12, '0');

        -- Check if number exists
        SELECT EXISTS(SELECT 1 FROM issued_cards WHERE card_number = new_number) INTO exists_check;

        IF NOT exists_check THEN
            RETURN new_number;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Generate CVV (returns plain CVV, caller must hash it)
CREATE OR REPLACE FUNCTION generate_cvv()
RETURNS VARCHAR(3) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 999)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Generate activation code
CREATE OR REPLACE FUNCTION generate_activation_code()
RETURNS VARCHAR(6) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- Request a new card
CREATE OR REPLACE FUNCTION request_card(
    p_user_id UUID,
    p_wallet_id UUID,
    p_card_name VARCHAR(100),
    p_card_label VARCHAR(50) DEFAULT NULL,
    p_card_color VARCHAR(20) DEFAULT '#1a1a2e'
)
RETURNS JSON AS $$
DECLARE
    v_card_number VARCHAR(16);
    v_cvv VARCHAR(3);
    v_activation_code VARCHAR(6);
    v_expiry_month INTEGER;
    v_expiry_year INTEGER;
    v_card_id UUID;
    v_wallet_currency VARCHAR(3);
BEGIN
    -- Verify wallet belongs to user
    SELECT currency INTO v_wallet_currency
    FROM wallets
    WHERE id = p_wallet_id AND user_id = p_user_id;

    IF v_wallet_currency IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'Wallet not found or does not belong to user'
        );
    END IF;

    -- Check if user already has an active card for this wallet
    IF EXISTS (
        SELECT 1 FROM issued_cards
        WHERE user_id = p_user_id
        AND wallet_id = p_wallet_id
        AND card_status IN ('pending', 'active')
    ) THEN
        RETURN json_build_object(
            'success', FALSE,
            'error', 'User already has an active or pending card for this wallet'
        );
    END IF;

    -- Generate card details
    v_card_number := generate_card_number();
    v_cvv := generate_cvv();
    v_activation_code := generate_activation_code();

    -- Set expiry (3 years from now)
    v_expiry_month := EXTRACT(MONTH FROM NOW());
    v_expiry_year := EXTRACT(YEAR FROM NOW()) + 3;

    -- Create the card
    INSERT INTO issued_cards (
        user_id,
        wallet_id,
        card_number,
        card_last_four,
        expiry_month,
        expiry_year,
        cvv_hash,
        card_name,
        card_label,
        card_color,
        activation_code,
        card_status
    ) VALUES (
        p_user_id,
        p_wallet_id,
        v_card_number,
        RIGHT(v_card_number, 4),
        v_expiry_month,
        v_expiry_year,
        crypt(v_cvv, gen_salt('bf')),
        p_card_name,
        p_card_label,
        p_card_color,
        v_activation_code,
        'pending'
    )
    RETURNING id INTO v_card_id;

    RETURN json_build_object(
        'success', TRUE,
        'card_id', v_card_id,
        'card_last_four', RIGHT(v_card_number, 4),
        'activation_code', v_activation_code,
        'cvv', v_cvv,  -- Return CVV only once during creation
        'message', 'Card requested successfully. Pending approval.'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activate card with code
CREATE OR REPLACE FUNCTION activate_card(
    p_card_id UUID,
    p_user_id UUID,
    p_activation_code VARCHAR(6)
)
RETURNS JSON AS $$
DECLARE
    v_card RECORD;
BEGIN
    -- Get card details
    SELECT * INTO v_card
    FROM issued_cards
    WHERE id = p_card_id AND user_id = p_user_id;

    IF v_card.id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Card not found');
    END IF;

    IF v_card.card_status != 'pending' THEN
        RETURN json_build_object('success', FALSE, 'error', 'Card is not pending activation');
    END IF;

    -- Check attempts
    IF v_card.activation_attempts >= 5 THEN
        UPDATE issued_cards SET card_status = 'blocked', blocked_reason = 'Too many activation attempts'
        WHERE id = p_card_id;
        RETURN json_build_object('success', FALSE, 'error', 'Card blocked due to too many attempts');
    END IF;

    -- Verify code
    IF v_card.activation_code != p_activation_code THEN
        UPDATE issued_cards SET activation_attempts = activation_attempts + 1
        WHERE id = p_card_id;
        RETURN json_build_object('success', FALSE, 'error', 'Invalid activation code');
    END IF;

    -- Activate card
    UPDATE issued_cards SET
        card_status = 'active',
        activated_at = NOW(),
        activation_code = NULL,
        activation_attempts = 0
    WHERE id = p_card_id;

    RETURN json_build_object('success', TRUE, 'message', 'Card activated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Freeze/Unfreeze card
CREATE OR REPLACE FUNCTION toggle_card_freeze(
    p_card_id UUID,
    p_user_id UUID,
    p_freeze BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_card RECORD;
    v_new_status card_status;
BEGIN
    SELECT * INTO v_card
    FROM issued_cards
    WHERE id = p_card_id AND user_id = p_user_id;

    IF v_card.id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Card not found');
    END IF;

    IF v_card.card_status NOT IN ('active', 'frozen') THEN
        RETURN json_build_object('success', FALSE, 'error', 'Card cannot be frozen/unfrozen in current status');
    END IF;

    v_new_status := CASE WHEN p_freeze THEN 'frozen'::card_status ELSE 'active'::card_status END;

    UPDATE issued_cards SET
        card_status = v_new_status,
        updated_at = NOW()
    WHERE id = p_card_id;

    -- Log the change
    INSERT INTO card_controls_history (card_id, changed_by, control_type, old_value, new_value, reason)
    VALUES (p_card_id, p_user_id, 'freeze', v_card.card_status::TEXT, v_new_status::TEXT, p_reason);

    RETURN json_build_object(
        'success', TRUE,
        'message', CASE WHEN p_freeze THEN 'Card frozen' ELSE 'Card unfrozen' END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update card limits
CREATE OR REPLACE FUNCTION update_card_limits(
    p_card_id UUID,
    p_user_id UUID,
    p_daily_limit BIGINT DEFAULT NULL,
    p_weekly_limit BIGINT DEFAULT NULL,
    p_monthly_limit BIGINT DEFAULT NULL,
    p_per_transaction_limit BIGINT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_card RECORD;
BEGIN
    SELECT * INTO v_card
    FROM issued_cards
    WHERE id = p_card_id AND user_id = p_user_id;

    IF v_card.id IS NULL THEN
        RETURN json_build_object('success', FALSE, 'error', 'Card not found');
    END IF;

    -- Log and update each changed limit
    IF p_daily_limit IS NOT NULL AND p_daily_limit != v_card.daily_limit THEN
        INSERT INTO card_limit_history (card_id, changed_by, limit_type, old_limit, new_limit)
        VALUES (p_card_id, p_user_id, 'daily', v_card.daily_limit, p_daily_limit);
    END IF;

    IF p_weekly_limit IS NOT NULL AND p_weekly_limit != v_card.weekly_limit THEN
        INSERT INTO card_limit_history (card_id, changed_by, limit_type, old_limit, new_limit)
        VALUES (p_card_id, p_user_id, 'weekly', v_card.weekly_limit, p_weekly_limit);
    END IF;

    IF p_monthly_limit IS NOT NULL AND p_monthly_limit != v_card.monthly_limit THEN
        INSERT INTO card_limit_history (card_id, changed_by, limit_type, old_limit, new_limit)
        VALUES (p_card_id, p_user_id, 'monthly', v_card.monthly_limit, p_monthly_limit);
    END IF;

    IF p_per_transaction_limit IS NOT NULL AND p_per_transaction_limit != v_card.per_transaction_limit THEN
        INSERT INTO card_limit_history (card_id, changed_by, limit_type, old_limit, new_limit)
        VALUES (p_card_id, p_user_id, 'per_transaction', v_card.per_transaction_limit, p_per_transaction_limit);
    END IF;

    -- Update limits
    UPDATE issued_cards SET
        daily_limit = COALESCE(p_daily_limit, daily_limit),
        weekly_limit = COALESCE(p_weekly_limit, weekly_limit),
        monthly_limit = COALESCE(p_monthly_limit, monthly_limit),
        per_transaction_limit = COALESCE(p_per_transaction_limit, per_transaction_limit),
        updated_at = NOW()
    WHERE id = p_card_id;

    RETURN json_build_object('success', TRUE, 'message', 'Limits updated successfully');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Process card payment (closed-loop)
CREATE OR REPLACE FUNCTION process_card_payment(
    p_card_number VARCHAR(16),
    p_cvv VARCHAR(3),
    p_expiry_month INTEGER,
    p_expiry_year INTEGER,
    p_amount BIGINT,
    p_merchant_id UUID,
    p_description TEXT DEFAULT NULL,
    p_reference VARCHAR(100) DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_card RECORD;
    v_merchant RECORD;
    v_wallet RECORD;
    v_auth_code VARCHAR(20);
    v_transaction_id UUID;
    v_new_balance BIGINT;
    v_tx_reference VARCHAR(100);
BEGIN
    -- Get card
    SELECT * INTO v_card
    FROM issued_cards
    WHERE card_number = p_card_number;

    IF v_card.id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'CARD_NOT_FOUND',
            'decline_reason', 'Card not found'
        );
    END IF;

    -- Verify CVV
    IF v_card.cvv_hash != crypt(p_cvv, v_card.cvv_hash) THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'INVALID_CVV',
            'decline_reason', 'Invalid CVV'
        );
    END IF;

    -- Verify expiry
    IF p_expiry_month != v_card.expiry_month OR p_expiry_year != v_card.expiry_year THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'INVALID_EXPIRY',
            'decline_reason', 'Invalid expiry date'
        );
    END IF;

    -- Check card is active
    IF v_card.card_status != 'active' THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'CARD_NOT_ACTIVE',
            'decline_reason', 'Card is ' || v_card.card_status::TEXT
        );
    END IF;

    -- Check online payments enabled
    IF NOT v_card.online_payments_enabled THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'ONLINE_DISABLED',
            'decline_reason', 'Online payments are disabled for this card'
        );
    END IF;

    -- Check merchant is valid and not blocked
    SELECT * INTO v_merchant
    FROM businesses
    WHERE id = p_merchant_id AND status = 'approved';

    IF v_merchant.id IS NULL THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'INVALID_MERCHANT',
            'decline_reason', 'Merchant not found or not approved'
        );
    END IF;

    -- Check if merchant is blocked
    IF p_merchant_id = ANY(v_card.blocked_merchants) THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'MERCHANT_BLOCKED',
            'decline_reason', 'This merchant is blocked on your card'
        );
    END IF;

    -- Check spending limits
    IF p_amount > v_card.per_transaction_limit THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'EXCEEDS_TXN_LIMIT',
            'decline_reason', 'Amount exceeds per-transaction limit'
        );
    END IF;

    IF v_card.daily_spent + p_amount > v_card.daily_limit THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'EXCEEDS_DAILY_LIMIT',
            'decline_reason', 'Amount exceeds daily limit'
        );
    END IF;

    IF v_card.weekly_spent + p_amount > v_card.weekly_limit THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'EXCEEDS_WEEKLY_LIMIT',
            'decline_reason', 'Amount exceeds weekly limit'
        );
    END IF;

    IF v_card.monthly_spent + p_amount > v_card.monthly_limit THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'EXCEEDS_MONTHLY_LIMIT',
            'decline_reason', 'Amount exceeds monthly limit'
        );
    END IF;

    -- Check wallet balance
    SELECT * INTO v_wallet
    FROM wallets
    WHERE id = v_card.wallet_id;

    IF v_wallet.balance < p_amount THEN
        RETURN json_build_object(
            'success', FALSE,
            'decline_code', 'INSUFFICIENT_FUNDS',
            'decline_reason', 'Insufficient balance'
        );
    END IF;

    -- Generate authorization code and reference
    v_auth_code := 'AUTH' || LPAD(FLOOR(RANDOM() * 9999999999)::TEXT, 10, '0');
    v_tx_reference := COALESCE(p_reference, 'CRD-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTR(gen_random_uuid()::TEXT, 1, 8));

    -- Deduct from wallet
    UPDATE wallets SET
        balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = v_card.wallet_id
    RETURNING balance INTO v_new_balance;

    -- Update spending tracking
    UPDATE issued_cards SET
        daily_spent = daily_spent + p_amount,
        weekly_spent = weekly_spent + p_amount,
        monthly_spent = monthly_spent + p_amount,
        updated_at = NOW()
    WHERE id = v_card.id;

    -- Create transaction record
    INSERT INTO card_transactions (
        card_id,
        user_id,
        wallet_id,
        transaction_type,
        amount,
        currency,
        status,
        merchant_id,
        merchant_name,
        auth_code,
        reference,
        external_reference,
        description,
        settled_at,
        settlement_amount
    ) VALUES (
        v_card.id,
        v_card.user_id,
        v_card.wallet_id,
        'purchase',
        p_amount,
        v_wallet.currency,
        'completed',
        p_merchant_id,
        v_merchant.business_name,
        v_auth_code,
        v_tx_reference,
        p_reference,
        COALESCE(p_description, 'Payment at ' || v_merchant.business_name),
        NOW(),
        p_amount
    )
    RETURNING id INTO v_transaction_id;

    -- Create wallet transaction record
    INSERT INTO transactions (
        user_id,
        wallet_id,
        type,
        amount,
        currency,
        status,
        reference,
        description,
        metadata
    ) VALUES (
        v_card.user_id,
        v_card.wallet_id,
        'card_payment',
        p_amount,
        v_wallet.currency,
        'completed',
        v_tx_reference,
        'Card payment at ' || v_merchant.business_name,
        jsonb_build_object('card_transaction_id', v_transaction_id, 'merchant_id', p_merchant_id)
    );

    RETURN json_build_object(
        'success', TRUE,
        'transaction_id', v_transaction_id,
        'auth_code', v_auth_code,
        'reference', v_tx_reference,
        'amount', p_amount,
        'new_balance', v_new_balance,
        'message', 'Payment approved'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reset daily spending (called by cron)
CREATE OR REPLACE FUNCTION reset_daily_spending()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE issued_cards SET
        daily_spent = 0,
        last_daily_reset = NOW()
    WHERE last_daily_reset < DATE_TRUNC('day', NOW());

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Reset weekly spending (called by cron on Mondays)
CREATE OR REPLACE FUNCTION reset_weekly_spending()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE issued_cards SET
        weekly_spent = 0,
        last_weekly_reset = NOW()
    WHERE last_weekly_reset < DATE_TRUNC('week', NOW());

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Reset monthly spending (called by cron on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_spending()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE issued_cards SET
        monthly_spent = 0,
        last_monthly_reset = NOW()
    WHERE last_monthly_reset < DATE_TRUNC('month', NOW());

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE issued_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_limit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_controls_history ENABLE ROW LEVEL SECURITY;

-- Issued Cards Policies
DROP POLICY IF EXISTS "Users can view own cards" ON issued_cards;
CREATE POLICY "Users can view own cards" ON issued_cards
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own cards" ON issued_cards;
CREATE POLICY "Users can update own cards" ON issued_cards
    FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can view all cards" ON issued_cards;
CREATE POLICY "Admins can view all cards" ON issued_cards
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles IN ('admin', 'superadmin'))
    );

DROP POLICY IF EXISTS "Admins can update all cards" ON issued_cards;
CREATE POLICY "Admins can update all cards" ON issued_cards
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles IN ('admin', 'superadmin'))
    );

DROP POLICY IF EXISTS "Service role full access to cards" ON issued_cards;
CREATE POLICY "Service role full access to cards" ON issued_cards
    FOR ALL USING (auth.role() = 'service_role');

-- Card Transactions Policies
DROP POLICY IF EXISTS "Users can view own card transactions" ON card_transactions;
CREATE POLICY "Users can view own card transactions" ON card_transactions
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Merchants can view their card transactions" ON card_transactions;
CREATE POLICY "Merchants can view their card transactions" ON card_transactions
    FOR SELECT USING (
        merchant_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Admins can view all card transactions" ON card_transactions;
CREATE POLICY "Admins can view all card transactions" ON card_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND roles IN ('admin', 'superadmin'))
    );

DROP POLICY IF EXISTS "Service role full access to card transactions" ON card_transactions;
CREATE POLICY "Service role full access to card transactions" ON card_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- Limit History Policies
DROP POLICY IF EXISTS "Users can view own limit history" ON card_limit_history;
CREATE POLICY "Users can view own limit history" ON card_limit_history
    FOR SELECT USING (
        card_id IN (SELECT id FROM issued_cards WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Service role full access to limit history" ON card_limit_history;
CREATE POLICY "Service role full access to limit history" ON card_limit_history
    FOR ALL USING (auth.role() = 'service_role');

-- Controls History Policies
DROP POLICY IF EXISTS "Users can view own controls history" ON card_controls_history;
CREATE POLICY "Users can view own controls history" ON card_controls_history
    FOR SELECT USING (
        card_id IN (SELECT id FROM issued_cards WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Service role full access to controls history" ON card_controls_history;
CREATE POLICY "Service role full access to controls history" ON card_controls_history
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_card_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_issued_cards_timestamp ON issued_cards;
CREATE TRIGGER trigger_update_issued_cards_timestamp
    BEFORE UPDATE ON issued_cards
    FOR EACH ROW
    EXECUTE FUNCTION update_card_timestamp();

DROP TRIGGER IF EXISTS trigger_update_card_transactions_timestamp ON card_transactions;
CREATE TRIGGER trigger_update_card_transactions_timestamp
    BEFORE UPDATE ON card_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_card_timestamp();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE issued_cards IS 'Closed-loop virtual cards issued to users';
COMMENT ON TABLE card_transactions IS 'All card transaction records';
COMMENT ON TABLE card_limit_history IS 'Audit trail for card limit changes';
COMMENT ON TABLE card_controls_history IS 'Audit trail for card control changes';

COMMENT ON FUNCTION process_card_payment IS 'Process a card payment at a platform merchant (closed-loop)';
COMMENT ON FUNCTION request_card IS 'Request a new virtual card';
COMMENT ON FUNCTION activate_card IS 'Activate a pending card with activation code';
COMMENT ON FUNCTION toggle_card_freeze IS 'Freeze or unfreeze a card';

-- Grant permissions
GRANT EXECUTE ON FUNCTION request_card TO authenticated;
GRANT EXECUTE ON FUNCTION activate_card TO authenticated;
GRANT EXECUTE ON FUNCTION toggle_card_freeze TO authenticated;
GRANT EXECUTE ON FUNCTION update_card_limits TO authenticated;
GRANT EXECUTE ON FUNCTION process_card_payment TO service_role;
GRANT EXECUTE ON FUNCTION reset_daily_spending TO service_role;
GRANT EXECUTE ON FUNCTION reset_weekly_spending TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_spending TO service_role;
