-- Migration: Add session timeout settings to site_settings
-- This allows superadmins to configure auto-logout for inactive users

-- Add session_timeout_minutes column to site_settings
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 0;

-- Add comment explaining the column
COMMENT ON COLUMN site_settings.session_timeout_minutes IS 'Session timeout in minutes. 0 = disabled (no auto-logout). Any positive value = auto-logout after X minutes of inactivity.';
