-- ============================================================================
-- PAYMENT GATEWAY MODULES
-- Add payment gateway integrations as configurable modules
-- ============================================================================

-- Add settings_path column to modules table for linking to configuration pages
ALTER TABLE modules ADD COLUMN IF NOT EXISTS settings_path VARCHAR(255);

-- Add Monime as a payment gateway module
INSERT INTO modules (code, name, description, category, is_enabled, is_system, icon, settings_path, config)
VALUES
    ('monime', 'Monime Payment Gateway', 'Mobile money payment processing via Monime. Supports Orange Money, Africell Money, and other mobile wallets in Sierra Leone.', 'payment', false, true, '📱', '/admin/settings/payment', '{
        "provider": "monime",
        "supported_currencies": ["SLE"],
        "supported_methods": ["orange_money", "africell_money", "qcell_money"],
        "features": ["checkout", "deposits", "withdrawals", "payouts"]
    }'::jsonb),

    ('paystack', 'Paystack Payment Gateway', 'Accept card payments and bank transfers via Paystack. Supports Visa, Mastercard, and bank transfers.', 'payment', false, false, '💳', '/admin/settings/paystack', '{
        "provider": "paystack",
        "supported_currencies": ["NGN", "GHS", "ZAR", "USD"],
        "supported_methods": ["card", "bank_transfer", "ussd"],
        "features": ["checkout", "recurring", "split_payments"]
    }'::jsonb),

    ('stripe', 'Stripe Payment Gateway', 'Global payment processing with Stripe. Supports cards, wallets, and local payment methods.', 'payment', false, false, '💰', '/admin/settings/stripe', '{
        "provider": "stripe",
        "supported_currencies": ["USD", "EUR", "GBP"],
        "supported_methods": ["card", "apple_pay", "google_pay"],
        "features": ["checkout", "recurring", "connect", "radar"]
    }'::jsonb),

    ('deposits', 'Wallet Deposits', 'Allow users to deposit funds into their wallets via enabled payment gateways.', 'feature', false, true, '📥', '/admin/settings/payment', '{
        "requires": ["monime", "paystack", "stripe"],
        "require_any": true
    }'::jsonb),

    ('withdrawals', 'Wallet Withdrawals', 'Allow users to withdraw funds from their wallets to mobile money or bank accounts.', 'feature', false, true, '📤', '/admin/settings/payment', '{
        "requires": ["monime", "paystack"],
        "require_any": true
    }'::jsonb)
ON CONFLICT (code) DO UPDATE SET
    description = EXCLUDED.description,
    settings_path = EXCLUDED.settings_path,
    config = EXCLUDED.config;

-- Update existing modules with settings paths
UPDATE modules SET settings_path = '/admin/settings/kyc' WHERE code = 'kyc_advanced';
UPDATE modules SET settings_path = '/admin/settings/loyalty' WHERE code = 'loyalty_rewards';
UPDATE modules SET settings_path = '/admin/settings/billing' WHERE code = 'bill_payments';

-- Create payment_gateway_config table for storing gateway-specific credentials
-- This allows multiple gateway configurations without cluttering payment_settings
CREATE TABLE IF NOT EXISTS payment_gateway_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_code VARCHAR(100) NOT NULL REFERENCES modules(code) ON DELETE CASCADE,
    environment VARCHAR(20) DEFAULT 'sandbox', -- 'sandbox' or 'production'

    -- Common fields
    is_active BOOLEAN DEFAULT false,
    api_key_encrypted TEXT, -- Encrypted API key
    secret_key_encrypted TEXT, -- Encrypted secret key
    webhook_secret_encrypted TEXT,

    -- Gateway-specific config (JSONB for flexibility)
    config JSONB DEFAULT '{}',

    -- Metadata
    last_verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(module_code, environment)
);

-- Create index for quick lookups
CREATE INDEX IF NOT EXISTS idx_payment_gateway_config_module ON payment_gateway_config(module_code);
CREATE INDEX IF NOT EXISTS idx_payment_gateway_config_active ON payment_gateway_config(is_active);

-- Migrate existing Monime settings from payment_settings to payment_gateway_config
INSERT INTO payment_gateway_config (module_code, environment, is_active, api_key_encrypted, config)
SELECT
    'monime',
    'production',
    monime_enabled,
    monime_access_token,
    jsonb_build_object(
        'space_id', monime_space_id,
        'webhook_secret', monime_webhook_secret,
        'source_account_id', monime_source_account_id,
        'payout_account_id', monime_payout_account_id,
        'backend_url', backend_url,
        'frontend_url', frontend_url
    )
FROM payment_settings
WHERE id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT (module_code, environment) DO UPDATE SET
    is_active = EXCLUDED.is_active,
    api_key_encrypted = EXCLUDED.api_key_encrypted,
    config = EXCLUDED.config,
    updated_at = NOW();

-- Update Monime module is_enabled based on payment_settings
UPDATE modules
SET is_enabled = (
    SELECT monime_enabled FROM payment_settings WHERE id = '00000000-0000-0000-0000-000000000001'
)
WHERE code = 'monime';

-- Comments
COMMENT ON TABLE payment_gateway_config IS 'Payment gateway credentials and configuration for each enabled gateway';
COMMENT ON COLUMN modules.settings_path IS 'Admin panel path for configuring this module';
