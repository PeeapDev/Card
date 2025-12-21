-- Migration: 061_gateway_fee_settings
-- Description: Add gateway fee columns for dynamic fee configuration
-- Created: 2024-12-20

-- Add gateway fee columns to payment_settings
ALTER TABLE payment_settings
ADD COLUMN IF NOT EXISTS gateway_deposit_fee_percent DECIMAL(5,2) DEFAULT 1.5,
ADD COLUMN IF NOT EXISTS gateway_withdrawal_fee_percent DECIMAL(5,2) DEFAULT 0;

-- Update existing row with default Monime fees
UPDATE payment_settings
SET
  gateway_deposit_fee_percent = 1.5,
  gateway_withdrawal_fee_percent = 0
WHERE id = '00000000-0000-0000-0000-000000000001';

-- Add comment explaining these columns
COMMENT ON COLUMN payment_settings.gateway_deposit_fee_percent IS 'Fee percentage charged by payment gateway (e.g., Monime) on deposits';
COMMENT ON COLUMN payment_settings.gateway_withdrawal_fee_percent IS 'Fee percentage charged by payment gateway on withdrawals/payouts';
