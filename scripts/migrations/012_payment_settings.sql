-- Payment Settings Migration
-- Creates table for storing admin payment gateway settings

-- Create payment_settings table
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Monime Configuration
    monime_access_token VARCHAR(500),
    monime_space_id VARCHAR(100),
    monime_webhook_secret VARCHAR(255),
    monime_source_account_id VARCHAR(100),
    monime_payout_account_id VARCHAR(100),
    monime_enabled BOOLEAN NOT NULL DEFAULT false,

    -- Withdrawal Settings
    withdrawal_mobile_money_enabled BOOLEAN NOT NULL DEFAULT true,
    withdrawal_bank_transfer_enabled BOOLEAN NOT NULL DEFAULT true,
    min_withdrawal_amount DECIMAL(19, 4) NOT NULL DEFAULT 1000,
    max_withdrawal_amount DECIMAL(19, 4) NOT NULL DEFAULT 50000000,
    daily_withdrawal_limit DECIMAL(19, 4) NOT NULL DEFAULT 100000000,
    withdrawal_fee_percent DECIMAL(5, 2) NOT NULL DEFAULT 1.5,
    withdrawal_fee_flat DECIMAL(19, 4) NOT NULL DEFAULT 100,
    withdrawal_require_pin BOOLEAN NOT NULL DEFAULT true,
    withdrawal_auto_approve_under DECIMAL(19, 4) NOT NULL DEFAULT 1000000,

    -- Deposit Settings
    deposit_checkout_enabled BOOLEAN NOT NULL DEFAULT true,
    deposit_payment_code_enabled BOOLEAN NOT NULL DEFAULT true,
    deposit_mobile_money_enabled BOOLEAN NOT NULL DEFAULT true,
    min_deposit_amount DECIMAL(19, 4) NOT NULL DEFAULT 100,
    max_deposit_amount DECIMAL(19, 4) NOT NULL DEFAULT 100000000,

    -- Timestamps
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_payment_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_payment_settings_updated_at ON payment_settings;
CREATE TRIGGER trigger_payment_settings_updated_at
    BEFORE UPDATE ON payment_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_payment_settings_updated_at();

-- Insert default settings row (singleton pattern)
INSERT INTO payment_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Add comments
COMMENT ON TABLE payment_settings IS 'Stores admin payment gateway configuration settings';
COMMENT ON COLUMN payment_settings.monime_access_token IS 'Encrypted Monime API access token';
COMMENT ON COLUMN payment_settings.monime_space_id IS 'Monime workspace ID';
