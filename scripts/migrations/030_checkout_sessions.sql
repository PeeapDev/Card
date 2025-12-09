-- Migration: Create checkout_sessions table for SDK/API checkout
-- This table stores checkout session records that redirect to hosted checkout

-- Create checkout_sessions table
CREATE TABLE IF NOT EXISTS checkout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) NOT NULL UNIQUE, -- cs_xxx session ID
    merchant_id UUID REFERENCES merchant_businesses(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- OPEN, PAID, EXPIRED, CANCELLED
    amount BIGINT NOT NULL, -- Amount in whole units (e.g., 100 = Le 100)
    currency_code VARCHAR(10) NOT NULL DEFAULT 'SLE',
    description TEXT,
    merchant_name VARCHAR(255),
    merchant_logo_url TEXT,
    brand_color VARCHAR(20) DEFAULT '#4F46E5',
    success_url TEXT,
    cancel_url TEXT,
    return_url TEXT,
    payment_methods JSONB DEFAULT '{"qr": true, "card": true, "mobile": true}',
    metadata JSONB,
    idempotency_key VARCHAR(100),
    monime_session_id VARCHAR(255), -- Monime checkout session ID if mobile money
    expires_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_external_id ON checkout_sessions(external_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_merchant_id ON checkout_sessions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_status ON checkout_sessions(status);
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_created_at ON checkout_sessions(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_sessions_idempotency ON checkout_sessions(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_checkout_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS checkout_sessions_updated_at ON checkout_sessions;
CREATE TRIGGER checkout_sessions_updated_at
    BEFORE UPDATE ON checkout_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_checkout_sessions_updated_at();

-- Enable RLS
ALTER TABLE checkout_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can do everything
CREATE POLICY "Service role full access on checkout_sessions"
    ON checkout_sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Anonymous users can view sessions (for checkout page)
CREATE POLICY "Anonymous can view checkout sessions"
    ON checkout_sessions
    FOR SELECT
    TO anon
    USING (true);

-- Merchants can view their own sessions
CREATE POLICY "Merchants view own checkout sessions"
    ON checkout_sessions
    FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid()
        )
    );

-- Add comments
COMMENT ON TABLE checkout_sessions IS 'Checkout sessions for SDK/API payments - redirects to hosted checkout';
COMMENT ON COLUMN checkout_sessions.external_id IS 'Public session ID (cs_xxx) used in URLs';
COMMENT ON COLUMN checkout_sessions.amount IS 'Amount in whole units. e.g., 100 = Le 100';
