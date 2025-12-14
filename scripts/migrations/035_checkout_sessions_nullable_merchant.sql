-- Migration: Make merchant_id nullable in checkout_sessions for driver collection
-- This allows drivers to create checkout sessions without a merchant business

-- Make merchant_id nullable
ALTER TABLE checkout_sessions ALTER COLUMN merchant_id DROP NOT NULL;

-- Add driver_id column to track driver collections
ALTER TABLE checkout_sessions ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Create index for driver_id
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_driver_id ON checkout_sessions(driver_id);

-- Add comment
COMMENT ON COLUMN checkout_sessions.driver_id IS 'User ID of driver for driver collection sessions (null for merchant sessions)';
