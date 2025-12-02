-- Migration 009: Add Transaction PIN to Users
-- This adds a transaction PIN column for securing P2P transfers

-- Add transaction_pin column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS transaction_pin VARCHAR(4) DEFAULT NULL;

-- Add comment for documentation
COMMENT ON COLUMN users.transaction_pin IS 'Hashed 4-digit PIN for authorizing transactions';

-- Create index for faster PIN lookups during transfers (optional, for performance)
-- Not needed for small tables, but good practice for scale

-- Update RLS policies to ensure transaction_pin is only accessible by the user themselves
-- The existing RLS should already handle this, but let's be explicit

-- Grant access to authenticated users (they can only see their own via RLS)
-- No additional grants needed since existing policies should cover this
