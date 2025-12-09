-- Migration: Secure NFC Payment System
-- Production-grade security for real payment processing
-- Implements cryptographic protection, fraud prevention, and audit trails

-- Drop existing tables to recreate with security
DROP TABLE IF EXISTS nfc_tag_transactions CASCADE;
DROP TABLE IF EXISTS nfc_tags CASCADE;
DROP TABLE IF EXISTS nfc_payment_tokens CASCADE;
DROP TABLE IF EXISTS nfc_payment_audit CASCADE;
DROP TABLE IF EXISTS nfc_fraud_alerts CASCADE;

-- ============================================================================
-- NFC PAYMENT LINKS (Permanent payment endpoints)
-- ============================================================================
CREATE TABLE nfc_payment_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Unique identifiers
    link_id VARCHAR(64) UNIQUE NOT NULL, -- Cryptographically random ID
    short_code VARCHAR(12) UNIQUE NOT NULL, -- Human-readable short code

    -- Owner information
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,

    -- Link configuration
    name VARCHAR(100) NOT NULL,
    description TEXT,

    -- Security settings
    secret_key VARCHAR(128) NOT NULL, -- Server-side secret for signing tokens
    pin_hash VARCHAR(256), -- Optional PIN for high-value transactions
    pin_required_above DECIMAL(15,2) DEFAULT 100.00, -- PIN required above this amount

    -- Limits
    single_transaction_limit DECIMAL(15,2) DEFAULT 1000.00,
    daily_limit DECIMAL(15,2) DEFAULT 5000.00,
    monthly_limit DECIMAL(15,2) DEFAULT 50000.00,
    daily_transaction_count_limit INTEGER DEFAULT 50,

    -- Usage tracking
    daily_amount_used DECIMAL(15,2) DEFAULT 0,
    daily_transaction_count INTEGER DEFAULT 0,
    monthly_amount_used DECIMAL(15,2) DEFAULT 0,
    last_limit_reset_date DATE DEFAULT CURRENT_DATE,
    last_monthly_reset_date DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,

    -- Statistics
    total_transactions INTEGER DEFAULT 0,
    total_amount_received DECIMAL(15,2) DEFAULT 0,
    total_failed_attempts INTEGER DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'blocked', 'inactive')),
    suspension_reason TEXT,
    blocked_at TIMESTAMPTZ,
    blocked_by UUID REFERENCES users(id),

    -- Fraud prevention
    fraud_score INTEGER DEFAULT 0, -- 0-100, higher = more suspicious
    last_fraud_check_at TIMESTAMPTZ,
    requires_review BOOLEAN DEFAULT false,

    -- Timestamps
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NFC PAYMENT TOKENS (One-time use tokens for each transaction)
-- ============================================================================
CREATE TABLE nfc_payment_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Token identification
    token VARCHAR(128) UNIQUE NOT NULL, -- Cryptographically secure token
    token_hash VARCHAR(256) NOT NULL, -- SHA-256 hash for verification

    -- Link reference
    payment_link_id UUID NOT NULL REFERENCES nfc_payment_links(id) ON DELETE CASCADE,

    -- Transaction details (locked at token creation)
    amount DECIMAL(15,2), -- NULL = open amount (payer enters)
    currency VARCHAR(10) DEFAULT 'SLE',

    -- Security
    nonce VARCHAR(64) NOT NULL, -- Prevents replay attacks
    signature VARCHAR(256) NOT NULL, -- HMAC signature of token data

    -- Expiry
    expires_at TIMESTAMPTZ NOT NULL,

    -- Usage
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired', 'cancelled', 'failed')),
    used_at TIMESTAMPTZ,
    used_by_user_id UUID REFERENCES users(id),
    used_by_wallet_id UUID REFERENCES wallets(id),

    -- Device tracking
    created_from_ip INET,
    created_from_device TEXT,
    used_from_ip INET,
    used_from_device TEXT,

    -- Result
    transaction_id UUID,
    failure_reason TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NFC PAYMENT AUDIT LOG (Complete audit trail)
-- ============================================================================
CREATE TABLE nfc_payment_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event identification
    event_type VARCHAR(50) NOT NULL, -- 'link_created', 'token_generated', 'payment_attempted', 'payment_completed', 'payment_failed', 'fraud_detected', etc.
    severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('debug', 'info', 'warning', 'error', 'critical')),

    -- References
    payment_link_id UUID REFERENCES nfc_payment_links(id) ON DELETE SET NULL,
    token_id UUID REFERENCES nfc_payment_tokens(id) ON DELETE SET NULL,
    transaction_id UUID,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Event details
    event_data JSONB NOT NULL DEFAULT '{}',

    -- Request information
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(256),
    geo_location JSONB, -- {country, city, lat, lng}

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NFC FRAUD ALERTS
-- ============================================================================
CREATE TABLE nfc_fraud_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Alert identification
    alert_type VARCHAR(50) NOT NULL, -- 'velocity', 'geo_anomaly', 'amount_anomaly', 'device_change', 'brute_force', etc.
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    -- References
    payment_link_id UUID REFERENCES nfc_payment_links(id) ON DELETE CASCADE,
    token_id UUID REFERENCES nfc_payment_tokens(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- Alert details
    description TEXT NOT NULL,
    evidence JSONB NOT NULL DEFAULT '{}',

    -- Resolution
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive', 'confirmed_fraud')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,

    -- Action taken
    action_taken VARCHAR(50), -- 'none', 'suspended', 'blocked', 'refunded', etc.

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX idx_nfc_payment_links_user_id ON nfc_payment_links(user_id);
CREATE INDEX idx_nfc_payment_links_wallet_id ON nfc_payment_links(wallet_id);
CREATE INDEX idx_nfc_payment_links_link_id ON nfc_payment_links(link_id);
CREATE INDEX idx_nfc_payment_links_short_code ON nfc_payment_links(short_code);
CREATE INDEX idx_nfc_payment_links_status ON nfc_payment_links(status);
CREATE INDEX idx_nfc_payment_links_created_at ON nfc_payment_links(created_at DESC);

CREATE INDEX idx_nfc_payment_tokens_token ON nfc_payment_tokens(token);
CREATE INDEX idx_nfc_payment_tokens_token_hash ON nfc_payment_tokens(token_hash);
CREATE INDEX idx_nfc_payment_tokens_payment_link_id ON nfc_payment_tokens(payment_link_id);
CREATE INDEX idx_nfc_payment_tokens_status ON nfc_payment_tokens(status);
CREATE INDEX idx_nfc_payment_tokens_expires_at ON nfc_payment_tokens(expires_at);

CREATE INDEX idx_nfc_payment_audit_event_type ON nfc_payment_audit(event_type);
CREATE INDEX idx_nfc_payment_audit_payment_link_id ON nfc_payment_audit(payment_link_id);
CREATE INDEX idx_nfc_payment_audit_created_at ON nfc_payment_audit(created_at DESC);
CREATE INDEX idx_nfc_payment_audit_severity ON nfc_payment_audit(severity);

CREATE INDEX idx_nfc_fraud_alerts_payment_link_id ON nfc_fraud_alerts(payment_link_id);
CREATE INDEX idx_nfc_fraud_alerts_status ON nfc_fraud_alerts(status);
CREATE INDEX idx_nfc_fraud_alerts_severity ON nfc_fraud_alerts(severity);
CREATE INDEX idx_nfc_fraud_alerts_created_at ON nfc_fraud_alerts(created_at DESC);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate cryptographically secure random string
CREATE OR REPLACE FUNCTION generate_secure_random(length INTEGER DEFAULT 32)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN encode(gen_random_bytes(length), 'hex');
END;
$$;

-- Generate short code (human readable)
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
    chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Removed confusing chars (0, O, 1, I)
    result TEXT := '';
    i INTEGER;
BEGIN
    FOR i IN 1..8 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    END LOOP;
    RETURN result;
END;
$$;

-- Create NFC payment link with security
CREATE OR REPLACE FUNCTION create_nfc_payment_link(
    p_user_id UUID,
    p_wallet_id UUID,
    p_card_id UUID DEFAULT NULL,
    p_name VARCHAR(100) DEFAULT 'NFC Payment',
    p_description TEXT DEFAULT NULL,
    p_single_limit DECIMAL(15,2) DEFAULT 1000.00,
    p_daily_limit DECIMAL(15,2) DEFAULT 5000.00,
    p_pin VARCHAR(6) DEFAULT NULL
)
RETURNS TABLE(
    link_id VARCHAR(64),
    short_code VARCHAR(12),
    payment_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_link_id VARCHAR(64);
    v_short_code VARCHAR(12);
    v_secret_key VARCHAR(128);
    v_pin_hash VARCHAR(256);
    v_payment_link_uuid UUID;
BEGIN
    -- Generate secure identifiers
    v_link_id := 'nfc_' || generate_secure_random(24);
    v_short_code := generate_short_code();
    v_secret_key := generate_secure_random(64);

    -- Ensure short code is unique
    WHILE EXISTS (SELECT 1 FROM nfc_payment_links WHERE nfc_payment_links.short_code = v_short_code) LOOP
        v_short_code := generate_short_code();
    END LOOP;

    -- Hash PIN if provided
    IF p_pin IS NOT NULL THEN
        v_pin_hash := encode(digest(p_pin || v_secret_key, 'sha256'), 'hex');
    END IF;

    -- Create the payment link
    INSERT INTO nfc_payment_links (
        link_id,
        short_code,
        user_id,
        wallet_id,
        card_id,
        name,
        description,
        secret_key,
        pin_hash,
        single_transaction_limit,
        daily_limit
    ) VALUES (
        v_link_id,
        v_short_code,
        p_user_id,
        p_wallet_id,
        p_card_id,
        p_name,
        p_description,
        v_secret_key,
        v_pin_hash,
        p_single_limit,
        p_daily_limit
    )
    RETURNING id INTO v_payment_link_uuid;

    -- Log the creation
    INSERT INTO nfc_payment_audit (
        event_type,
        severity,
        payment_link_id,
        user_id,
        event_data
    ) VALUES (
        'link_created',
        'info',
        v_payment_link_uuid,
        p_user_id,
        jsonb_build_object(
            'name', p_name,
            'has_pin', p_pin IS NOT NULL,
            'single_limit', p_single_limit,
            'daily_limit', p_daily_limit
        )
    );

    RETURN QUERY SELECT v_link_id, v_short_code, '/pay/nfc/' || v_short_code;
END;
$$;

-- Generate one-time payment token
CREATE OR REPLACE FUNCTION generate_nfc_payment_token(
    p_short_code VARCHAR(12),
    p_amount DECIMAL(15,2) DEFAULT NULL,
    p_expiry_minutes INTEGER DEFAULT 5,
    p_ip_address INET DEFAULT NULL,
    p_device_info TEXT DEFAULT NULL
)
RETURNS TABLE(
    token VARCHAR(128),
    expires_at TIMESTAMPTZ,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_link RECORD;
    v_token VARCHAR(128);
    v_token_hash VARCHAR(256);
    v_nonce VARCHAR(64);
    v_signature VARCHAR(256);
    v_expires_at TIMESTAMPTZ;
    v_data_to_sign TEXT;
BEGIN
    -- Get payment link
    SELECT * INTO v_link
    FROM nfc_payment_links
    WHERE short_code = p_short_code;

    IF v_link IS NULL THEN
        RETURN QUERY SELECT NULL::VARCHAR(128), NULL::TIMESTAMPTZ, false, 'Invalid payment link'::TEXT;
        RETURN;
    END IF;

    -- Check status
    IF v_link.status != 'active' THEN
        RETURN QUERY SELECT NULL::VARCHAR(128), NULL::TIMESTAMPTZ, false, ('Payment link is ' || v_link.status)::TEXT;
        RETURN;
    END IF;

    -- Check daily limits
    IF v_link.last_limit_reset_date < CURRENT_DATE THEN
        UPDATE nfc_payment_links
        SET daily_amount_used = 0,
            daily_transaction_count = 0,
            last_limit_reset_date = CURRENT_DATE
        WHERE id = v_link.id;
        v_link.daily_amount_used := 0;
        v_link.daily_transaction_count := 0;
    END IF;

    IF p_amount IS NOT NULL AND (v_link.daily_amount_used + p_amount) > v_link.daily_limit THEN
        RETURN QUERY SELECT NULL::VARCHAR(128), NULL::TIMESTAMPTZ, false, 'Daily limit exceeded'::TEXT;
        RETURN;
    END IF;

    IF v_link.daily_transaction_count >= v_link.daily_transaction_count_limit THEN
        RETURN QUERY SELECT NULL::VARCHAR(128), NULL::TIMESTAMPTZ, false, 'Daily transaction limit exceeded'::TEXT;
        RETURN;
    END IF;

    -- Generate token components
    v_token := 'PT_' || generate_secure_random(48);
    v_token_hash := encode(digest(v_token, 'sha256'), 'hex');
    v_nonce := generate_secure_random(32);
    v_expires_at := NOW() + (p_expiry_minutes || ' minutes')::INTERVAL;

    -- Create signature (HMAC-like using SHA256)
    v_data_to_sign := v_token || '|' || v_nonce || '|' || COALESCE(p_amount::TEXT, 'open') || '|' || v_expires_at::TEXT;
    v_signature := encode(digest(v_data_to_sign || v_link.secret_key, 'sha256'), 'hex');

    -- Store token
    INSERT INTO nfc_payment_tokens (
        token,
        token_hash,
        payment_link_id,
        amount,
        nonce,
        signature,
        expires_at,
        created_from_ip,
        created_from_device
    ) VALUES (
        v_token,
        v_token_hash,
        v_link.id,
        p_amount,
        v_nonce,
        v_signature,
        v_expires_at,
        p_ip_address,
        p_device_info
    );

    -- Log token generation
    INSERT INTO nfc_payment_audit (
        event_type,
        severity,
        payment_link_id,
        event_data,
        ip_address
    ) VALUES (
        'token_generated',
        'info',
        v_link.id,
        jsonb_build_object(
            'amount', p_amount,
            'expires_at', v_expires_at,
            'expiry_minutes', p_expiry_minutes
        ),
        p_ip_address
    );

    RETURN QUERY SELECT v_token, v_expires_at, true, NULL::TEXT;
END;
$$;

-- Validate and process NFC payment
CREATE OR REPLACE FUNCTION process_nfc_payment(
    p_token VARCHAR(128),
    p_payer_user_id UUID,
    p_payer_wallet_id UUID,
    p_amount DECIMAL(15,2),
    p_pin VARCHAR(6) DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_device_info TEXT DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    transaction_id UUID,
    error_code VARCHAR(50),
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_record RECORD;
    v_link RECORD;
    v_payer_wallet RECORD;
    v_recipient_wallet RECORD;
    v_data_to_sign TEXT;
    v_expected_signature VARCHAR(256);
    v_transaction_id UUID;
    v_pin_hash VARCHAR(256);
    v_fee DECIMAL(15,2);
    v_net_amount DECIMAL(15,2);
BEGIN
    -- Get and validate token
    SELECT * INTO v_token_record
    FROM nfc_payment_tokens
    WHERE token = p_token
    FOR UPDATE; -- Lock the row

    IF v_token_record IS NULL THEN
        -- Log failed attempt
        INSERT INTO nfc_payment_audit (event_type, severity, event_data, ip_address)
        VALUES ('payment_failed', 'warning', jsonb_build_object('reason', 'Invalid token'), p_ip_address);

        RETURN QUERY SELECT false, NULL::UUID, 'INVALID_TOKEN'::VARCHAR(50), 'Invalid payment token'::TEXT;
        RETURN;
    END IF;

    -- Check token status
    IF v_token_record.status != 'pending' THEN
        INSERT INTO nfc_payment_audit (event_type, severity, payment_link_id, token_id, event_data, ip_address)
        VALUES ('payment_failed', 'warning', v_token_record.payment_link_id, v_token_record.id,
                jsonb_build_object('reason', 'Token already used', 'status', v_token_record.status), p_ip_address);

        RETURN QUERY SELECT false, NULL::UUID, 'TOKEN_USED'::VARCHAR(50), 'Token has already been used'::TEXT;
        RETURN;
    END IF;

    -- Check expiry
    IF v_token_record.expires_at < NOW() THEN
        UPDATE nfc_payment_tokens SET status = 'expired' WHERE id = v_token_record.id;

        INSERT INTO nfc_payment_audit (event_type, severity, payment_link_id, token_id, event_data, ip_address)
        VALUES ('payment_failed', 'info', v_token_record.payment_link_id, v_token_record.id,
                jsonb_build_object('reason', 'Token expired'), p_ip_address);

        RETURN QUERY SELECT false, NULL::UUID, 'TOKEN_EXPIRED'::VARCHAR(50), 'Payment token has expired'::TEXT;
        RETURN;
    END IF;

    -- Get payment link
    SELECT * INTO v_link
    FROM nfc_payment_links
    WHERE id = v_token_record.payment_link_id
    FOR UPDATE;

    -- Verify signature
    v_data_to_sign := v_token_record.token || '|' || v_token_record.nonce || '|' ||
                      COALESCE(v_token_record.amount::TEXT, 'open') || '|' || v_token_record.expires_at::TEXT;
    v_expected_signature := encode(digest(v_data_to_sign || v_link.secret_key, 'sha256'), 'hex');

    IF v_token_record.signature != v_expected_signature THEN
        -- This is a serious security issue - potential forgery
        UPDATE nfc_payment_tokens SET status = 'failed', failure_reason = 'Signature mismatch' WHERE id = v_token_record.id;
        UPDATE nfc_payment_links SET fraud_score = fraud_score + 20, requires_review = true WHERE id = v_link.id;

        INSERT INTO nfc_fraud_alerts (alert_type, severity, payment_link_id, token_id, description, evidence)
        VALUES ('signature_mismatch', 'critical', v_link.id, v_token_record.id,
                'Token signature verification failed - potential forgery attempt',
                jsonb_build_object('expected_sig', LEFT(v_expected_signature, 16) || '...',
                                   'received_sig', LEFT(v_token_record.signature, 16) || '...',
                                   'ip', p_ip_address));

        INSERT INTO nfc_payment_audit (event_type, severity, payment_link_id, token_id, event_data, ip_address)
        VALUES ('fraud_detected', 'critical', v_link.id, v_token_record.id,
                jsonb_build_object('reason', 'Signature mismatch'), p_ip_address);

        RETURN QUERY SELECT false, NULL::UUID, 'SECURITY_ERROR'::VARCHAR(50), 'Payment verification failed'::TEXT;
        RETURN;
    END IF;

    -- Check link status
    IF v_link.status != 'active' THEN
        RETURN QUERY SELECT false, NULL::UUID, 'LINK_INACTIVE'::VARCHAR(50), 'Payment link is not active'::TEXT;
        RETURN;
    END IF;

    -- Validate amount
    IF v_token_record.amount IS NOT NULL AND p_amount != v_token_record.amount THEN
        RETURN QUERY SELECT false, NULL::UUID, 'AMOUNT_MISMATCH'::VARCHAR(50),
                     ('Amount must be exactly ' || v_token_record.amount)::TEXT;
        RETURN;
    END IF;

    IF p_amount > v_link.single_transaction_limit THEN
        RETURN QUERY SELECT false, NULL::UUID, 'LIMIT_EXCEEDED'::VARCHAR(50),
                     ('Amount exceeds single transaction limit of ' || v_link.single_transaction_limit)::TEXT;
        RETURN;
    END IF;

    -- Reset daily limits if needed
    IF v_link.last_limit_reset_date < CURRENT_DATE THEN
        v_link.daily_amount_used := 0;
        v_link.daily_transaction_count := 0;
    END IF;

    IF (v_link.daily_amount_used + p_amount) > v_link.daily_limit THEN
        RETURN QUERY SELECT false, NULL::UUID, 'DAILY_LIMIT'::VARCHAR(50), 'Daily limit exceeded'::TEXT;
        RETURN;
    END IF;

    -- Check PIN if required
    IF v_link.pin_hash IS NOT NULL AND p_amount >= v_link.pin_required_above THEN
        IF p_pin IS NULL THEN
            RETURN QUERY SELECT false, NULL::UUID, 'PIN_REQUIRED'::VARCHAR(50),
                         ('PIN required for amounts above ' || v_link.pin_required_above)::TEXT;
            RETURN;
        END IF;

        v_pin_hash := encode(digest(p_pin || v_link.secret_key, 'sha256'), 'hex');
        IF v_pin_hash != v_link.pin_hash THEN
            -- Track failed PIN attempts
            UPDATE nfc_payment_links SET total_failed_attempts = total_failed_attempts + 1 WHERE id = v_link.id;

            -- Block after too many failed attempts
            IF v_link.total_failed_attempts >= 5 THEN
                UPDATE nfc_payment_links SET status = 'suspended', suspension_reason = 'Too many failed PIN attempts' WHERE id = v_link.id;

                INSERT INTO nfc_fraud_alerts (alert_type, severity, payment_link_id, description, evidence)
                VALUES ('brute_force', 'high', v_link.id, 'Too many failed PIN attempts',
                        jsonb_build_object('failed_attempts', v_link.total_failed_attempts + 1, 'ip', p_ip_address));
            END IF;

            RETURN QUERY SELECT false, NULL::UUID, 'INVALID_PIN'::VARCHAR(50), 'Incorrect PIN'::TEXT;
            RETURN;
        END IF;
    END IF;

    -- Prevent self-payment
    IF p_payer_user_id = v_link.user_id THEN
        RETURN QUERY SELECT false, NULL::UUID, 'SELF_PAYMENT'::VARCHAR(50), 'Cannot pay yourself'::TEXT;
        RETURN;
    END IF;

    -- Get payer wallet and check balance
    SELECT * INTO v_payer_wallet
    FROM wallets
    WHERE id = p_payer_wallet_id AND user_id = p_payer_user_id
    FOR UPDATE;

    IF v_payer_wallet IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'INVALID_WALLET'::VARCHAR(50), 'Invalid payer wallet'::TEXT;
        RETURN;
    END IF;

    IF v_payer_wallet.balance < p_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, 'INSUFFICIENT_BALANCE'::VARCHAR(50), 'Insufficient balance'::TEXT;
        RETURN;
    END IF;

    -- Get recipient wallet
    SELECT * INTO v_recipient_wallet
    FROM wallets
    WHERE id = v_link.wallet_id
    FOR UPDATE;

    IF v_recipient_wallet IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 'RECIPIENT_ERROR'::VARCHAR(50), 'Recipient wallet not found'::TEXT;
        RETURN;
    END IF;

    -- Calculate fee (1% with minimum)
    v_fee := GREATEST(p_amount * 0.01, 0.10);
    v_net_amount := p_amount - v_fee;

    -- Generate transaction ID
    v_transaction_id := gen_random_uuid();

    -- Process the payment
    -- Deduct from payer
    UPDATE wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = p_payer_wallet_id;

    -- Credit to recipient
    UPDATE wallets
    SET balance = balance + v_net_amount,
        updated_at = NOW()
    WHERE id = v_link.wallet_id;

    -- Update token
    UPDATE nfc_payment_tokens
    SET status = 'used',
        used_at = NOW(),
        used_by_user_id = p_payer_user_id,
        used_by_wallet_id = p_payer_wallet_id,
        used_from_ip = p_ip_address,
        used_from_device = p_device_info,
        transaction_id = v_transaction_id
    WHERE id = v_token_record.id;

    -- Update payment link stats
    UPDATE nfc_payment_links
    SET total_transactions = total_transactions + 1,
        total_amount_received = total_amount_received + v_net_amount,
        daily_amount_used = daily_amount_used + p_amount,
        daily_transaction_count = daily_transaction_count + 1,
        last_used_at = NOW(),
        last_limit_reset_date = CURRENT_DATE
    WHERE id = v_link.id;

    -- Create transaction records
    INSERT INTO transactions (id, external_id, wallet_id, type, amount, fee, currency, status, description, metadata)
    VALUES
        (v_transaction_id, 'NFC_' || v_transaction_id::TEXT, p_payer_wallet_id, 'TRANSFER', -p_amount, v_fee, 'SLE', 'COMPLETED',
         'NFC Payment to ' || v_link.name,
         jsonb_build_object(
             'method', 'nfc_payment',
             'payment_link_id', v_link.id,
             'token_id', v_token_record.id,
             'recipient_user_id', v_link.user_id,
             'recipient_wallet_id', v_link.wallet_id
         )),
        (gen_random_uuid(), 'NFC_' || v_transaction_id::TEXT || '_IN', v_link.wallet_id, 'TRANSFER', v_net_amount, 0, 'SLE', 'COMPLETED',
         'NFC Payment received',
         jsonb_build_object(
             'method', 'nfc_payment',
             'payment_link_id', v_link.id,
             'token_id', v_token_record.id,
             'payer_user_id', p_payer_user_id,
             'payer_wallet_id', p_payer_wallet_id,
             'gross_amount', p_amount,
             'fee_deducted', v_fee
         ));

    -- Audit log
    INSERT INTO nfc_payment_audit (event_type, severity, payment_link_id, token_id, transaction_id, user_id, event_data, ip_address)
    VALUES ('payment_completed', 'info', v_link.id, v_token_record.id, v_transaction_id, p_payer_user_id,
            jsonb_build_object(
                'amount', p_amount,
                'fee', v_fee,
                'net_amount', v_net_amount,
                'payer_wallet', p_payer_wallet_id,
                'recipient_wallet', v_link.wallet_id
            ), p_ip_address);

    RETURN QUERY SELECT true, v_transaction_id, NULL::VARCHAR(50), NULL::TEXT;
END;
$$;

-- Validate payment link (for public lookup)
CREATE OR REPLACE FUNCTION validate_nfc_payment_link(p_short_code VARCHAR(12))
RETURNS TABLE(
    valid BOOLEAN,
    recipient_name TEXT,
    recipient_user_id UUID,
    status VARCHAR(20),
    single_limit DECIMAL(15,2),
    requires_pin_above DECIMAL(15,2)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_link RECORD;
    v_user RECORD;
BEGIN
    SELECT * INTO v_link
    FROM nfc_payment_links
    WHERE short_code = p_short_code;

    IF v_link IS NULL THEN
        RETURN QUERY SELECT false, NULL::TEXT, NULL::UUID, NULL::VARCHAR(20), NULL::DECIMAL(15,2), NULL::DECIMAL(15,2);
        RETURN;
    END IF;

    SELECT first_name, last_name INTO v_user
    FROM users WHERE id = v_link.user_id;

    RETURN QUERY SELECT
        v_link.status = 'active',
        (v_user.first_name || ' ' || v_user.last_name)::TEXT,
        v_link.user_id,
        v_link.status,
        v_link.single_transaction_limit,
        v_link.pin_required_above;
END;
$$;

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE nfc_payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_payment_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_payment_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfc_fraud_alerts ENABLE ROW LEVEL SECURITY;

-- Payment Links policies
CREATE POLICY "Service role full access on nfc_payment_links" ON nfc_payment_links FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users view own payment links" ON nfc_payment_links FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create own payment links" ON nfc_payment_links FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own payment links" ON nfc_payment_links FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all payment links" ON nfc_payment_links FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.roles LIKE '%admin%'));

-- Tokens policies (mostly server-side)
CREATE POLICY "Service role full access on nfc_payment_tokens" ON nfc_payment_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users view own tokens" ON nfc_payment_tokens FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM nfc_payment_links WHERE nfc_payment_links.id = payment_link_id AND nfc_payment_links.user_id = auth.uid()));

-- Audit log policies
CREATE POLICY "Service role full access on nfc_payment_audit" ON nfc_payment_audit FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Users view own audit logs" ON nfc_payment_audit FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM nfc_payment_links WHERE nfc_payment_links.id = payment_link_id AND nfc_payment_links.user_id = auth.uid()));
CREATE POLICY "Admins view all audit logs" ON nfc_payment_audit FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.roles LIKE '%admin%'));

-- Fraud alerts policies
CREATE POLICY "Service role full access on nfc_fraud_alerts" ON nfc_fraud_alerts FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Admins view fraud alerts" ON nfc_fraud_alerts FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.roles LIKE '%admin%'));

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_nfc_payment_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS nfc_payment_links_updated_at ON nfc_payment_links;
CREATE TRIGGER nfc_payment_links_updated_at
    BEFORE UPDATE ON nfc_payment_links
    FOR EACH ROW
    EXECUTE FUNCTION update_nfc_payment_links_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE nfc_payment_links IS 'Secure NFC payment endpoints with cryptographic protection';
COMMENT ON TABLE nfc_payment_tokens IS 'One-time use payment tokens with signature verification';
COMMENT ON TABLE nfc_payment_audit IS 'Complete audit trail for all NFC payment activities';
COMMENT ON TABLE nfc_fraud_alerts IS 'Fraud detection alerts for security review';
COMMENT ON FUNCTION create_nfc_payment_link IS 'Creates a new secure NFC payment link with server-side secret';
COMMENT ON FUNCTION generate_nfc_payment_token IS 'Generates a one-time use payment token with cryptographic signature';
COMMENT ON FUNCTION process_nfc_payment IS 'Validates and processes NFC payment with full security checks';
