-- Migration: Create payouts table for tracking Monime payouts
-- This table stores payout records for users and merchants

-- Create payouts table
CREATE TABLE IF NOT EXISTS payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) NOT NULL UNIQUE, -- payout_xxx ID
    user_id UUID REFERENCES users(id) ON DELETE SET NULL, -- User initiating the payout (for users or merchant owners)
    wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL, -- Source wallet
    merchant_id UUID REFERENCES merchant_businesses(id) ON DELETE SET NULL, -- For merchant payouts

    -- Payout type
    payout_type VARCHAR(50) NOT NULL DEFAULT 'USER_CASHOUT', -- USER_CASHOUT, MERCHANT_WITHDRAWAL, MERCHANT_SETTLEMENT

    -- Amount details
    amount DECIMAL(18, 2) NOT NULL, -- Amount being sent
    fee DECIMAL(18, 2) DEFAULT 0, -- Platform fee
    total_deduction DECIMAL(18, 2) NOT NULL, -- Total deducted from wallet (amount + fee)
    currency VARCHAR(10) NOT NULL DEFAULT 'SLE',

    -- Destination
    destination_type VARCHAR(50) NOT NULL, -- 'momo' or 'bank'
    provider_id VARCHAR(50) NOT NULL, -- e.g., 'm17' for Orange Money, 'slb001' for bank
    provider_name VARCHAR(100), -- e.g., 'Orange Money', 'Bank of Sierra Leone'
    account_number VARCHAR(100) NOT NULL, -- Phone number or bank account number
    account_name VARCHAR(255), -- Recipient name

    -- Status tracking
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED

    -- Monime integration
    monime_payout_id VARCHAR(255), -- Monime payout ID
    monime_status VARCHAR(50), -- Monime status
    monime_fees JSONB, -- Fees charged by Monime
    failure_code VARCHAR(100), -- Error code if failed
    failure_message TEXT, -- Error message if failed

    -- Metadata
    description TEXT,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payouts_user_id ON payouts(user_id);
CREATE INDEX IF NOT EXISTS idx_payouts_wallet_id ON payouts(wallet_id);
CREATE INDEX IF NOT EXISTS idx_payouts_merchant_id ON payouts(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payouts_status ON payouts(status);
CREATE INDEX IF NOT EXISTS idx_payouts_payout_type ON payouts(payout_type);
CREATE INDEX IF NOT EXISTS idx_payouts_monime_payout_id ON payouts(monime_payout_id);
CREATE INDEX IF NOT EXISTS idx_payouts_created_at ON payouts(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payouts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS payouts_updated_at ON payouts;
CREATE TRIGGER payouts_updated_at
    BEFORE UPDATE ON payouts
    FOR EACH ROW
    EXECUTE FUNCTION update_payouts_updated_at();

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Service role can do everything
CREATE POLICY "Service role full access on payouts"
    ON payouts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Users can view their own payouts
CREATE POLICY "Users view own payouts"
    ON payouts
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- Merchants can view their business payouts
CREATE POLICY "Merchants view business payouts"
    ON payouts
    FOR SELECT
    TO authenticated
    USING (
        merchant_id IN (
            SELECT id FROM merchant_businesses WHERE merchant_id = auth.uid()
        )
    );

-- Add comments
COMMENT ON TABLE payouts IS 'Payout records for user cashouts and merchant withdrawals via Monime';
COMMENT ON COLUMN payouts.external_id IS 'Public payout ID (payout_xxx) used in APIs';
COMMENT ON COLUMN payouts.payout_type IS 'Type of payout: USER_CASHOUT (user withdrawing to momo/bank), MERCHANT_WITHDRAWAL (merchant cashout), MERCHANT_SETTLEMENT (auto-settlement)';
COMMENT ON COLUMN payouts.destination_type IS 'Destination type: momo (mobile money) or bank';
COMMENT ON COLUMN payouts.provider_id IS 'Provider ID from Monime: m17 (Orange Money), m18 (Africell), slb001 (bank) etc';
