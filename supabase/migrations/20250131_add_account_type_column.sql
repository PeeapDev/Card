-- Add missing columns to users table for student wallet creation
-- Run this in Supabase SQL Editor

-- Add all potentially missing columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'personal';
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS roles VARCHAR(100) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_id_unique ON users(external_id) WHERE external_id IS NOT NULL;

-- Update existing users
UPDATE users SET account_type = 'personal' WHERE account_type IS NULL;
UPDATE users SET status = 'ACTIVE' WHERE status IS NULL;
UPDATE users SET is_verified = true WHERE is_verified IS NULL;

-- Refresh the schema cache (IMPORTANT - this makes PostgREST see the new columns)
NOTIFY pgrst, 'reload schema';
