-- Migration: Add developer_mode_enabled column to users table
-- This allows the developer mode setting to persist in the database instead of localStorage

-- Add developer_mode_enabled column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS developer_mode_enabled BOOLEAN DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN users.developer_mode_enabled IS 'Whether developer mode is enabled for this user (shows API keys, webhooks, etc.)';

-- Create index for potential queries filtering by developer mode
CREATE INDEX IF NOT EXISTS idx_users_developer_mode ON users(developer_mode_enabled) WHERE developer_mode_enabled = true;
