-- ============================================================================
-- PLATFORM EARNINGS TRACKING
-- Track profit from withdrawal fees, transaction fees, subscriptions, etc.
-- Note: No fees on deposits - we charge 2% on withdrawals/payouts
-- ============================================================================

-- Add deposit fee columns to payment_settings (keeping for backwards compatibility, but set to 0)
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS deposit_fee_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS deposit_fee_flat DECIMAL(10,2) DEFAULT 0;

-- Ensure deposit fees are 0 (we don't charge on deposits)
UPDATE payment_settings
SET deposit_fee_percent = 0, deposit_fee_flat = 0
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Create platform_earnings table to track all platform profits
CREATE TABLE IF NOT EXISTS platform_earnings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    earning_type VARCHAR(50) NOT NULL, -- 'deposit_fee', 'withdrawal_fee', 'transaction_fee', 'checkout_fee'
    source_type VARCHAR(50) NOT NULL,  -- 'user', 'merchant'
    source_id UUID,                     -- user_id or merchant_id
    transaction_id UUID,                -- related transaction
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SLE',
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_platform_earnings_type ON platform_earnings(earning_type);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_source ON platform_earnings(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_created ON platform_earnings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_earnings_currency ON platform_earnings(currency);

-- Create view for daily earnings summary
CREATE OR REPLACE VIEW v_daily_earnings AS
SELECT
    DATE(created_at) as date,
    earning_type,
    currency,
    COUNT(*) as transaction_count,
    SUM(amount) as total_amount
FROM platform_earnings
GROUP BY DATE(created_at), earning_type, currency
ORDER BY DATE(created_at) DESC;

-- Create function to record platform earning
CREATE OR REPLACE FUNCTION record_platform_earning(
    p_earning_type VARCHAR(50),
    p_source_type VARCHAR(50),
    p_source_id UUID,
    p_transaction_id UUID,
    p_amount DECIMAL(15,2),
    p_currency VARCHAR(10) DEFAULT 'SLE',
    p_description TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_earning_id UUID;
BEGIN
    INSERT INTO platform_earnings (
        earning_type, source_type, source_id, transaction_id,
        amount, currency, description, metadata
    ) VALUES (
        p_earning_type, p_source_type, p_source_id, p_transaction_id,
        p_amount, p_currency, p_description, p_metadata
    ) RETURNING id INTO v_earning_id;

    RETURN v_earning_id;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE platform_earnings ENABLE ROW LEVEL SECURITY;

-- Only admins can view platform earnings (using LIKE for text roles column)
CREATE POLICY "Admins can view platform_earnings" ON platform_earnings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE users.id = auth.uid()
            AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
        )
    );

-- Comments
COMMENT ON TABLE platform_earnings IS 'Platform earnings from transaction fees (withdrawal, checkout, subscriptions)';
COMMENT ON COLUMN platform_earnings.earning_type IS 'Type of earning: withdrawal_fee, transaction_fee, checkout_fee, subscription_fee';
COMMENT ON COLUMN platform_earnings.source_type IS 'Source of earning: user or merchant';
COMMENT ON COLUMN payment_settings.deposit_fee_percent IS 'Deprecated - we do not charge deposit fees (set to 0)';
COMMENT ON COLUMN payment_settings.deposit_fee_flat IS 'Deprecated - we do not charge deposit fees (set to 0)';
