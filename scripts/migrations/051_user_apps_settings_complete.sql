-- Migration: 051_user_apps_settings_complete.sql
-- Description: Complete user apps settings table with Cash Box support
-- This migration creates or updates the user_apps_settings table with all required columns

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view own app settings" ON user_apps_settings;
DROP POLICY IF EXISTS "Users can insert own app settings" ON user_apps_settings;
DROP POLICY IF EXISTS "Users can update own app settings" ON user_apps_settings;
DROP POLICY IF EXISTS "users_view_own_app_settings" ON user_apps_settings;
DROP POLICY IF EXISTS "users_insert_own_app_settings" ON user_apps_settings;
DROP POLICY IF EXISTS "users_update_own_app_settings" ON user_apps_settings;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS user_apps_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  events_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Add cashbox columns if they don't exist
ALTER TABLE user_apps_settings
ADD COLUMN IF NOT EXISTS cashbox_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cashbox_setup_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cashbox_auto_deposit_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cashbox_auto_deposit_wallet_id UUID,
ADD COLUMN IF NOT EXISTS cashbox_auto_deposit_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS cashbox_auto_deposit_frequency VARCHAR(20) DEFAULT 'monthly',
ADD COLUMN IF NOT EXISTS cashbox_pin_lock_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cashbox_pin_hash VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_apps_settings_user_id ON user_apps_settings(user_id);

-- Enable RLS
ALTER TABLE user_apps_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies - using text comparison for compatibility
-- Users can view their own settings
CREATE POLICY "users_view_own_app_settings" ON user_apps_settings
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id::text);

-- Users can insert their own settings
CREATE POLICY "users_insert_own_app_settings" ON user_apps_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own settings
CREATE POLICY "users_update_own_app_settings" ON user_apps_settings
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = user_id::text)
  WITH CHECK (auth.uid()::text = user_id::text);

-- Grant permissions
GRANT ALL ON user_apps_settings TO authenticated;
GRANT ALL ON user_apps_settings TO service_role;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_apps_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_user_apps_settings_timestamp ON user_apps_settings;
CREATE TRIGGER update_user_apps_settings_timestamp
  BEFORE UPDATE ON user_apps_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_apps_settings_updated_at();
