-- Migration: Add business_id to wallets for business-specific wallets
-- Each business gets its own wallet for receiving payments

-- Add business_id column to wallets table
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES merchant_businesses(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_wallets_business_id ON wallets(business_id) WHERE business_id IS NOT NULL;

-- Create a wallet for each existing business that doesn't have one
INSERT INTO wallets (
  external_id,
  user_id,
  business_id,
  currency,
  balance,
  available_balance,
  status,
  wallet_type,
  is_active,
  name
)
SELECT
  'wallet_biz_' || REPLACE(b.id::text, '-', ''),
  b.merchant_id,
  b.id,
  'SLE',
  0,
  0,
  'active',
  'business',
  true,
  b.name || ' Wallet'
FROM merchant_businesses b
WHERE NOT EXISTS (
  SELECT 1 FROM wallets w WHERE w.business_id = b.id
);
