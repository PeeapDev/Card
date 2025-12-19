-- Migration: 050_user_settings_cashbox.sql
-- Description: Add Cash Box app settings and user payment preferences
-- Date: 2025-01-XX

-- Add cashbox columns to user_apps_settings
ALTER TABLE user_apps_settings
ADD COLUMN IF NOT EXISTS cashbox_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cashbox_setup_completed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cashbox_auto_deposit_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cashbox_auto_deposit_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS cashbox_auto_deposit_amount DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS cashbox_auto_deposit_frequency VARCHAR(20) DEFAULT 'monthly';

-- Create user_payment_preferences table for general payment settings
CREATE TABLE IF NOT EXISTS user_payment_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
  default_currency VARCHAR(3) DEFAULT 'SLE',
  auto_convert_currency BOOLEAN DEFAULT false,
  show_balance_on_home BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_payment_preferences_user_id ON user_payment_preferences(user_id);

-- Enable RLS on user_payment_preferences
ALTER TABLE user_payment_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_payment_preferences
-- Users can view their own payment preferences
DROP POLICY IF EXISTS "users_view_own_payment_prefs" ON user_payment_preferences;
CREATE POLICY "users_view_own_payment_prefs" ON user_payment_preferences
  FOR SELECT USING (auth.uid() = user_id OR auth.uid()::text = user_id::text);

-- Users can insert their own payment preferences
DROP POLICY IF EXISTS "users_insert_own_payment_prefs" ON user_payment_preferences;
CREATE POLICY "users_insert_own_payment_prefs" ON user_payment_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid()::text = user_id::text);

-- Users can update their own payment preferences
DROP POLICY IF EXISTS "users_update_own_payment_prefs" ON user_payment_preferences;
CREATE POLICY "users_update_own_payment_prefs" ON user_payment_preferences
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid()::text = user_id::text);

-- Admin policy for viewing all preferences
DROP POLICY IF EXISTS "admin_view_all_payment_prefs" ON user_payment_preferences;
CREATE POLICY "admin_view_all_payment_prefs" ON user_payment_preferences
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role IN ('ADMIN', 'SUPER_ADMIN')
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_payment_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-updating updated_at
DROP TRIGGER IF EXISTS update_user_payment_preferences_timestamp ON user_payment_preferences;
CREATE TRIGGER update_user_payment_preferences_timestamp
  BEFORE UPDATE ON user_payment_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_payment_preferences_updated_at();

-- Grant permissions
GRANT ALL ON user_payment_preferences TO authenticated;
GRANT ALL ON user_payment_preferences TO service_role;
