-- Migration: Add wallet_type and name columns to wallets table
-- This supports driver wallets and other wallet types

-- Add wallet_type column
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'primary';

-- Add name column for wallet display names
ALTER TABLE wallets
ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Create index for wallet_type lookups
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON wallets(wallet_type);

-- Create index for finding wallets by user and type
CREATE INDEX IF NOT EXISTS idx_wallets_user_type ON wallets(user_id, wallet_type);

-- Add comment
COMMENT ON COLUMN wallets.wallet_type IS 'Type of wallet: primary, driver, pot, merchant';
COMMENT ON COLUMN wallets.name IS 'Display name for the wallet';

-- Done
SELECT 'Added wallet_type and name columns to wallets table' as status;
