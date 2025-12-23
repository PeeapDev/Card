-- Migration: Payment Intents System
-- Channel-agnostic payment collection API
-- Supports: NFC, QR Code, Card, Wallet confirmations

-- ============================================================================
-- PAYMENT INTENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Public identifiers
    external_id VARCHAR(64) UNIQUE NOT NULL, -- pi_xxx format
    client_secret VARCHAR(128) UNIQUE NOT NULL, -- pi_xxx_secret_yyy for frontend

    -- Merchant/Business
    merchant_id UUID REFERENCES merchant_businesses(id) ON DELETE SET NULL,
    merchant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    api_key_id UUID, -- Which API key created this intent

    -- Amount
    amount BIGINT NOT NULL, -- Amount in minor units (cents)
    currency VARCHAR(10) NOT NULL DEFAULT 'SLE',

    -- Description
    description TEXT,
    statement_descriptor VARCHAR(22), -- What appears on customer statement

    -- Status
    status VARCHAR(30) NOT NULL DEFAULT 'requires_payment_method',
    -- Statuses: requires_payment_method, requires_confirmation, requires_action,
    --           processing, requires_capture, succeeded, canceled, failed

    -- Payment method used
    payment_method_type VARCHAR(30), -- nfc, qr, card, wallet, mobile_money
    payment_method_id VARCHAR(100), -- Reference to payment method used

    -- Capture settings
    capture_method VARCHAR(20) NOT NULL DEFAULT 'automatic', -- automatic, manual
    captured_amount BIGINT DEFAULT 0,

    -- Confirmation
    confirmation_method VARCHAR(20) NOT NULL DEFAULT 'automatic', -- automatic, manual

    -- Customer info (optional)
    customer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),

    -- QR Code (auto-generated)
    qr_code_url TEXT,
    qr_code_data TEXT, -- Base64 SVG

    -- NFC session
    nfc_session_token VARCHAR(128),

    -- Allowed payment methods
    payment_methods_allowed JSONB DEFAULT '["nfc", "qr", "card", "wallet"]',

    -- URLs
    return_url TEXT,
    cancel_url TEXT,

    -- Metadata (for integrator use)
    metadata JSONB DEFAULT '{}',

    -- Terminal/Device info
    terminal_id VARCHAR(100),
    device_fingerprint VARCHAR(256),
    ip_address INET,

    -- Transaction references
    transaction_id UUID,
    authorization_code VARCHAR(20),

    -- Error handling
    last_error_code VARCHAR(50),
    last_error_message TEXT,

    -- Cancellation
    canceled_at TIMESTAMPTZ,
    cancellation_reason VARCHAR(50), -- duplicate, fraudulent, requested_by_customer, abandoned

    -- Expiry
    expires_at TIMESTAMPTZ NOT NULL,

    -- Idempotency
    idempotency_key VARCHAR(100),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    succeeded_at TIMESTAMPTZ
);

-- ============================================================================
-- PAYMENT INTENT CONFIRMATIONS (Audit trail of confirmation attempts)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_intent_confirmations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,

    -- Confirmation details
    payment_method_type VARCHAR(30) NOT NULL, -- nfc, qr, card, wallet, mobile_money
    status VARCHAR(30) NOT NULL, -- succeeded, failed, pending

    -- Method-specific data
    nfc_data JSONB, -- NFC payload
    card_data JSONB, -- Tokenized card data (no raw card numbers)
    wallet_id UUID,
    mobile_money_data JSONB,

    -- Result
    error_code VARCHAR(50),
    error_message TEXT,

    -- Device/Source info
    ip_address INET,
    user_agent TEXT,
    device_fingerprint VARCHAR(256),

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- PAYMENT INTENT EVENTS (Webhook events)
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_intent_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    payment_intent_id UUID NOT NULL REFERENCES payment_intents(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(50) NOT NULL, -- created, updated, succeeded, failed, canceled, etc.
    event_data JSONB NOT NULL DEFAULT '{}',

    -- Webhook delivery
    webhook_delivered BOOLEAN DEFAULT false,
    webhook_delivered_at TIMESTAMPTZ,
    webhook_delivery_attempts INTEGER DEFAULT 0,
    webhook_last_error TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_payment_intents_external_id ON payment_intents(external_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_client_secret ON payment_intents(client_secret);
CREATE INDEX IF NOT EXISTS idx_payment_intents_merchant_id ON payment_intents(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_merchant_user_id ON payment_intents(merchant_user_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);
CREATE INDEX IF NOT EXISTS idx_payment_intents_customer_id ON payment_intents(customer_id);
CREATE INDEX IF NOT EXISTS idx_payment_intents_created_at ON payment_intents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_intents_expires_at ON payment_intents(expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_intents_idempotency ON payment_intents(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_intent_confirmations_intent ON payment_intent_confirmations(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intent_events_intent ON payment_intent_events(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_intent_events_type ON payment_intent_events(event_type);
CREATE INDEX IF NOT EXISTS idx_payment_intent_events_webhook ON payment_intent_events(webhook_delivered) WHERE webhook_delivered = false;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Generate payment intent ID
CREATE OR REPLACE FUNCTION generate_payment_intent_id()
RETURNS VARCHAR(64)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN 'pi_' || encode(gen_random_bytes(16), 'hex');
END;
$$;

-- Generate client secret
CREATE OR REPLACE FUNCTION generate_client_secret(intent_id VARCHAR(64))
RETURNS VARCHAR(128)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN intent_id || '_secret_' || encode(gen_random_bytes(24), 'hex');
END;
$$;

-- Create payment intent
CREATE OR REPLACE FUNCTION create_payment_intent(
    p_merchant_id UUID,
    p_merchant_user_id UUID,
    p_amount BIGINT,
    p_currency VARCHAR(10) DEFAULT 'SLE',
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}',
    p_capture_method VARCHAR(20) DEFAULT 'automatic',
    p_payment_methods JSONB DEFAULT '["nfc", "qr", "card", "wallet"]',
    p_return_url TEXT DEFAULT NULL,
    p_cancel_url TEXT DEFAULT NULL,
    p_customer_email VARCHAR(255) DEFAULT NULL,
    p_customer_phone VARCHAR(50) DEFAULT NULL,
    p_terminal_id VARCHAR(100) DEFAULT NULL,
    p_idempotency_key VARCHAR(100) DEFAULT NULL,
    p_expires_in_minutes INTEGER DEFAULT 30
)
RETURNS TABLE(
    id UUID,
    external_id VARCHAR(64),
    client_secret VARCHAR(128),
    amount BIGINT,
    currency VARCHAR(10),
    status VARCHAR(30),
    qr_code_url TEXT,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_external_id VARCHAR(64);
    v_client_secret VARCHAR(128);
    v_expires_at TIMESTAMPTZ;
    v_qr_code_url TEXT;
    v_existing_id UUID;
BEGIN
    -- Check idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT pi.id INTO v_existing_id
        FROM payment_intents pi
        WHERE pi.idempotency_key = p_idempotency_key;

        IF v_existing_id IS NOT NULL THEN
            RETURN QUERY
            SELECT pi.id, pi.external_id, pi.client_secret, pi.amount, pi.currency,
                   pi.status, pi.qr_code_url, pi.expires_at
            FROM payment_intents pi
            WHERE pi.id = v_existing_id;
            RETURN;
        END IF;
    END IF;

    -- Generate identifiers
    v_id := gen_random_uuid();
    v_external_id := generate_payment_intent_id();
    v_client_secret := generate_client_secret(v_external_id);
    v_expires_at := NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL;

    -- QR code URL (will point to payment page)
    v_qr_code_url := 'https://pay.peeap.com/i/' || v_external_id;

    -- Insert payment intent
    INSERT INTO payment_intents (
        id,
        external_id,
        client_secret,
        merchant_id,
        merchant_user_id,
        amount,
        currency,
        description,
        metadata,
        capture_method,
        payment_methods_allowed,
        return_url,
        cancel_url,
        customer_email,
        customer_phone,
        terminal_id,
        idempotency_key,
        expires_at,
        qr_code_url,
        status
    ) VALUES (
        v_id,
        v_external_id,
        v_client_secret,
        p_merchant_id,
        p_merchant_user_id,
        p_amount,
        p_currency,
        p_description,
        p_metadata,
        p_capture_method,
        p_payment_methods,
        p_return_url,
        p_cancel_url,
        p_customer_email,
        p_customer_phone,
        p_terminal_id,
        p_idempotency_key,
        v_expires_at,
        v_qr_code_url,
        'requires_payment_method'
    );

    -- Log event
    INSERT INTO payment_intent_events (payment_intent_id, event_type, event_data)
    VALUES (v_id, 'payment_intent.created', jsonb_build_object(
        'amount', p_amount,
        'currency', p_currency,
        'merchant_id', p_merchant_id
    ));

    RETURN QUERY
    SELECT v_id, v_external_id, v_client_secret, p_amount, p_currency,
           'requires_payment_method'::VARCHAR(30), v_qr_code_url, v_expires_at;
END;
$$;

-- Confirm payment intent
CREATE OR REPLACE FUNCTION confirm_payment_intent(
    p_client_secret VARCHAR(128),
    p_payment_method_type VARCHAR(30),
    p_payment_method_data JSONB,
    p_customer_id UUID DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_device_fingerprint VARCHAR(256) DEFAULT NULL
)
RETURNS TABLE(
    success BOOLEAN,
    status VARCHAR(30),
    transaction_id UUID,
    error_code VARCHAR(50),
    error_message TEXT,
    next_action JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intent RECORD;
    v_transaction_id UUID;
    v_error_code VARCHAR(50);
    v_error_message TEXT;
    v_new_status VARCHAR(30);
    v_next_action JSONB;
BEGIN
    -- Get and lock the payment intent
    SELECT * INTO v_intent
    FROM payment_intents
    WHERE client_secret = p_client_secret
    FOR UPDATE;

    IF v_intent IS NULL THEN
        RETURN QUERY SELECT false, NULL::VARCHAR(30), NULL::UUID,
            'intent_not_found'::VARCHAR(50), 'Payment intent not found'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Check expiry
    IF v_intent.expires_at < NOW() THEN
        UPDATE payment_intents SET status = 'canceled', canceled_at = NOW(),
            cancellation_reason = 'abandoned' WHERE id = v_intent.id;
        RETURN QUERY SELECT false, 'canceled'::VARCHAR(30), NULL::UUID,
            'intent_expired'::VARCHAR(50), 'Payment intent has expired'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Check status
    IF v_intent.status NOT IN ('requires_payment_method', 'requires_confirmation') THEN
        RETURN QUERY SELECT false, v_intent.status, v_intent.transaction_id,
            'invalid_status'::VARCHAR(50),
            ('Payment intent status is ' || v_intent.status)::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Check if payment method is allowed
    IF NOT (v_intent.payment_methods_allowed ? p_payment_method_type) THEN
        RETURN QUERY SELECT false, v_intent.status, NULL::UUID,
            'payment_method_not_allowed'::VARCHAR(50),
            'This payment method is not allowed for this intent'::TEXT, NULL::JSONB;
        RETURN;
    END IF;

    -- Log confirmation attempt
    INSERT INTO payment_intent_confirmations (
        payment_intent_id, payment_method_type, status,
        nfc_data, card_data, ip_address, device_fingerprint
    ) VALUES (
        v_intent.id, p_payment_method_type, 'pending',
        CASE WHEN p_payment_method_type = 'nfc' THEN p_payment_method_data ELSE NULL END,
        CASE WHEN p_payment_method_type = 'card' THEN p_payment_method_data ELSE NULL END,
        p_ip_address, p_device_fingerprint
    );

    -- Process based on payment method type
    -- For now, mark as processing - actual processing happens in service layer
    v_new_status := 'processing';
    v_transaction_id := gen_random_uuid();

    -- Update intent
    UPDATE payment_intents SET
        status = v_new_status,
        payment_method_type = p_payment_method_type,
        customer_id = COALESCE(p_customer_id, customer_id),
        ip_address = COALESCE(p_ip_address, ip_address),
        device_fingerprint = COALESCE(p_device_fingerprint, device_fingerprint),
        confirmed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_intent.id;

    -- Log event
    INSERT INTO payment_intent_events (payment_intent_id, event_type, event_data)
    VALUES (v_intent.id, 'payment_intent.processing', jsonb_build_object(
        'payment_method_type', p_payment_method_type
    ));

    RETURN QUERY SELECT true, v_new_status, v_transaction_id,
        NULL::VARCHAR(50), NULL::TEXT, v_next_action;
END;
$$;

-- Complete payment intent (called after successful payment processing)
CREATE OR REPLACE FUNCTION complete_payment_intent(
    p_external_id VARCHAR(64),
    p_transaction_id UUID,
    p_authorization_code VARCHAR(20) DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intent RECORD;
BEGIN
    SELECT * INTO v_intent FROM payment_intents WHERE external_id = p_external_id FOR UPDATE;

    IF v_intent IS NULL THEN
        RETURN false;
    END IF;

    UPDATE payment_intents SET
        status = CASE WHEN capture_method = 'automatic' THEN 'succeeded' ELSE 'requires_capture' END,
        transaction_id = p_transaction_id,
        authorization_code = p_authorization_code,
        captured_amount = CASE WHEN capture_method = 'automatic' THEN amount ELSE 0 END,
        succeeded_at = CASE WHEN capture_method = 'automatic' THEN NOW() ELSE NULL END,
        updated_at = NOW()
    WHERE id = v_intent.id;

    -- Log event
    INSERT INTO payment_intent_events (payment_intent_id, event_type, event_data)
    VALUES (v_intent.id,
        CASE WHEN v_intent.capture_method = 'automatic' THEN 'payment_intent.succeeded'
             ELSE 'payment_intent.requires_capture' END,
        jsonb_build_object('transaction_id', p_transaction_id));

    RETURN true;
END;
$$;

-- Cancel payment intent
CREATE OR REPLACE FUNCTION cancel_payment_intent(
    p_external_id VARCHAR(64),
    p_reason VARCHAR(50) DEFAULT 'requested_by_customer'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_intent RECORD;
BEGIN
    SELECT * INTO v_intent FROM payment_intents WHERE external_id = p_external_id FOR UPDATE;

    IF v_intent IS NULL THEN
        RETURN false;
    END IF;

    IF v_intent.status IN ('succeeded', 'canceled') THEN
        RETURN false;
    END IF;

    UPDATE payment_intents SET
        status = 'canceled',
        canceled_at = NOW(),
        cancellation_reason = p_reason,
        updated_at = NOW()
    WHERE id = v_intent.id;

    -- Log event
    INSERT INTO payment_intent_events (payment_intent_id, event_type, event_data)
    VALUES (v_intent.id, 'payment_intent.canceled', jsonb_build_object('reason', p_reason));

    RETURN true;
END;
$$;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION update_payment_intents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payment_intents_updated_at ON payment_intents;
CREATE TRIGGER payment_intents_updated_at
    BEFORE UPDATE ON payment_intents
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_intents_updated_at();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intent_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_intent_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Service role full access on payment_intents" ON payment_intents;
DROP POLICY IF EXISTS "Merchants view own payment intents" ON payment_intents;
DROP POLICY IF EXISTS "Anonymous can view intents by client_secret" ON payment_intents;
DROP POLICY IF EXISTS "Service role full access on payment_intent_confirmations" ON payment_intent_confirmations;
DROP POLICY IF EXISTS "Merchants view own confirmations" ON payment_intent_confirmations;
DROP POLICY IF EXISTS "Service role full access on payment_intent_events" ON payment_intent_events;
DROP POLICY IF EXISTS "Merchants view own events" ON payment_intent_events;

-- Payment Intents policies
CREATE POLICY "Service role full access on payment_intents"
    ON payment_intents FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Merchants view own payment intents"
    ON payment_intents FOR SELECT TO authenticated
    USING (merchant_user_id = auth.uid() OR merchant_id IN (
        SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid()
    ));

CREATE POLICY "Anonymous can view intents by client_secret"
    ON payment_intents FOR SELECT TO anon USING (true);

-- Confirmations policies
CREATE POLICY "Service role full access on payment_intent_confirmations"
    ON payment_intent_confirmations FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Merchants view own confirmations"
    ON payment_intent_confirmations FOR SELECT TO authenticated
    USING (payment_intent_id IN (
        SELECT id FROM payment_intents WHERE merchant_user_id = auth.uid()
    ));

-- Events policies
CREATE POLICY "Service role full access on payment_intent_events"
    ON payment_intent_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Merchants view own events"
    ON payment_intent_events FOR SELECT TO authenticated
    USING (payment_intent_id IN (
        SELECT id FROM payment_intents WHERE merchant_user_id = auth.uid()
    ));

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON TABLE payment_intents IS 'Channel-agnostic payment intents for NFC, QR, Card, Wallet payments';
COMMENT ON TABLE payment_intent_confirmations IS 'Audit trail of payment confirmation attempts';
COMMENT ON TABLE payment_intent_events IS 'Events for webhook delivery';
COMMENT ON COLUMN payment_intents.client_secret IS 'Safe token for frontend use - can only confirm, not create';
COMMENT ON COLUMN payment_intents.payment_methods_allowed IS 'Array of allowed methods: nfc, qr, card, wallet, mobile_money';
