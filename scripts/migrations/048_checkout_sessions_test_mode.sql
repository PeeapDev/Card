-- Migration: Add is_test_mode and reference columns to checkout_sessions
-- Required for v0 SDK integration to support test mode payments

-- Add is_test_mode column to track test vs live payments
ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT false;

-- Add reference column for external payment reference tracking
ALTER TABLE checkout_sessions
ADD COLUMN IF NOT EXISTS reference VARCHAR(255);

-- Create index for test mode filtering
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_is_test_mode ON checkout_sessions(is_test_mode);

-- Create index for reference lookups
CREATE INDEX IF NOT EXISTS idx_checkout_sessions_reference ON checkout_sessions(reference);

-- Add comments
COMMENT ON COLUMN checkout_sessions.is_test_mode IS 'Whether this is a test mode payment (true) or live payment (false)';
COMMENT ON COLUMN checkout_sessions.reference IS 'External payment reference provided by merchant';
