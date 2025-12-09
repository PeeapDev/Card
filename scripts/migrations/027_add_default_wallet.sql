-- Migration: Add default_wallet_id to users table
-- This allows users to set their preferred default wallet for transactions

-- Add default_wallet_id column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS default_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_default_wallet ON users(default_wallet_id);

-- Add comment
COMMENT ON COLUMN users.default_wallet_id IS 'The user''s preferred default wallet for transactions';
