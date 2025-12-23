-- Migration: 064_user_apps_settings_fix.sql
-- Description: Ensure user_apps_settings table exists with all required columns
-- This migration safely creates or updates the table structure

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own app settings" ON user_apps_settings;
DROP POLICY IF EXISTS "Users can insert own app settings" ON user_apps_settings;
DROP POLICY IF EXISTS "Users can update own app settings" ON user_apps_settings;
DROP POLICY IF EXISTS "users_view_own_app_settings" ON user_apps_settings;
DROP POLICY IF EXISTS "users_insert_own_app_settings" ON user_apps_settings;
DROP POLICY IF EXISTS "users_update_own_app_settings" ON user_apps_settings;
DROP POLICY IF EXISTS "Service role full access" ON user_apps_settings;

-- Create table if not exists (using gen_random_uuid instead of uuid_generate_v4 for compatibility)
CREATE TABLE IF NOT EXISTS user_apps_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  events_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Add cashbox columns if they don't exist
DO $$
BEGIN
    -- cashbox_enabled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_apps_settings' AND column_name = 'cashbox_enabled') THEN
        ALTER TABLE user_apps_settings ADD COLUMN cashbox_enabled BOOLEAN DEFAULT false;
    END IF;

    -- cashbox_setup_completed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_apps_settings' AND column_name = 'cashbox_setup_completed') THEN
        ALTER TABLE user_apps_settings ADD COLUMN cashbox_setup_completed BOOLEAN DEFAULT false;
    END IF;

    -- cashbox_auto_deposit_enabled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_apps_settings' AND column_name = 'cashbox_auto_deposit_enabled') THEN
        ALTER TABLE user_apps_settings ADD COLUMN cashbox_auto_deposit_enabled BOOLEAN DEFAULT false;
    END IF;

    -- cashbox_auto_deposit_wallet_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_apps_settings' AND column_name = 'cashbox_auto_deposit_wallet_id') THEN
        ALTER TABLE user_apps_settings ADD COLUMN cashbox_auto_deposit_wallet_id UUID;
    END IF;

    -- cashbox_auto_deposit_amount
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_apps_settings' AND column_name = 'cashbox_auto_deposit_amount') THEN
        ALTER TABLE user_apps_settings ADD COLUMN cashbox_auto_deposit_amount DECIMAL(15, 2);
    END IF;

    -- cashbox_auto_deposit_frequency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_apps_settings' AND column_name = 'cashbox_auto_deposit_frequency') THEN
        ALTER TABLE user_apps_settings ADD COLUMN cashbox_auto_deposit_frequency VARCHAR(20) DEFAULT 'monthly';
    END IF;

    -- cashbox_pin_lock_enabled
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_apps_settings' AND column_name = 'cashbox_pin_lock_enabled') THEN
        ALTER TABLE user_apps_settings ADD COLUMN cashbox_pin_lock_enabled BOOLEAN DEFAULT false;
    END IF;

    -- cashbox_pin_hash
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_apps_settings' AND column_name = 'cashbox_pin_hash') THEN
        ALTER TABLE user_apps_settings ADD COLUMN cashbox_pin_hash VARCHAR(255);
    END IF;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_apps_settings_user_id ON user_apps_settings(user_id);

-- IMPORTANT: Disable RLS for this table since we use supabaseAdmin (service_role)
-- The app handles authorization by verifying user.id matches the resource owner
ALTER TABLE user_apps_settings DISABLE ROW LEVEL SECURITY;

-- Grant permissions (service_role bypasses RLS anyway, but explicit grants help)
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

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
