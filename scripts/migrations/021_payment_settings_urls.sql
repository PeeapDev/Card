-- Payment Settings with URL columns
-- Creates table if not exists, then adds URL columns

-- Create payment_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS payment_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Monime Configuration
    monime_access_token VARCHAR(500),
    monime_space_id VARCHAR(100),
    monime_webhook_secret VARCHAR(255),
    monime_source_account_id VARCHAR(100),
    monime_payout_account_id VARCHAR(100),
    monime_enabled BOOLEAN NOT NULL DEFAULT false,

    -- URL Configuration (for Monime redirects)
    monime_success_url VARCHAR(500),
    monime_cancel_url VARCHAR(500),
    backend_url VARCHAR(255),
    frontend_url VARCHAR(255),

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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings row (singleton pattern)
INSERT INTO payment_settings (id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Add comments
COMMENT ON TABLE payment_settings IS 'Stores admin payment gateway configuration settings';
COMMENT ON COLUMN payment_settings.backend_url IS 'Backend API URL for building Monime callback URLs';
COMMENT ON COLUMN payment_settings.frontend_url IS 'Frontend app URL for redirects after Monime payment';
