-- ============================================================================
-- COMPREHENSIVE FEE SETTINGS
-- Add fee columns for all transaction types
-- ============================================================================

-- Add P2P transfer fees
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS p2p_fee_percent DECIMAL(5,2) DEFAULT 0;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS p2p_fee_flat DECIMAL(10,2) DEFAULT 0;

-- Add card transaction fees
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS card_txn_fee_percent DECIMAL(5,2) DEFAULT 1.5;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS card_txn_fee_flat DECIMAL(10,2) DEFAULT 0;

-- Add card creation fees
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS virtual_card_fee DECIMAL(10,2) DEFAULT 1;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS physical_card_fee DECIMAL(10,2) DEFAULT 10;

-- Add checkout/merchant fees
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS checkout_fee_percent DECIMAL(5,2) DEFAULT 2.9;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS checkout_fee_flat DECIMAL(10,2) DEFAULT 0.30;

-- Add merchant payout fees
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS merchant_payout_fee_percent DECIMAL(5,2) DEFAULT 0.25;
ALTER TABLE payment_settings ADD COLUMN IF NOT EXISTS merchant_payout_fee_flat DECIMAL(10,2) DEFAULT 0;

-- Comments
COMMENT ON COLUMN payment_settings.p2p_fee_percent IS 'Percentage fee for P2P transfers';
COMMENT ON COLUMN payment_settings.p2p_fee_flat IS 'Flat fee for P2P transfers';
COMMENT ON COLUMN payment_settings.card_txn_fee_percent IS 'Percentage fee for card transactions';
COMMENT ON COLUMN payment_settings.card_txn_fee_flat IS 'Flat fee for card transactions';
COMMENT ON COLUMN payment_settings.virtual_card_fee IS 'One-time fee for virtual card creation';
COMMENT ON COLUMN payment_settings.physical_card_fee IS 'One-time fee for physical card creation';
COMMENT ON COLUMN payment_settings.checkout_fee_percent IS 'Percentage fee for merchant checkout payments';
COMMENT ON COLUMN payment_settings.checkout_fee_flat IS 'Flat fee for merchant checkout payments';
COMMENT ON COLUMN payment_settings.merchant_payout_fee_percent IS 'Percentage fee for merchant payouts';
COMMENT ON COLUMN payment_settings.merchant_payout_fee_flat IS 'Flat fee for merchant payouts';
