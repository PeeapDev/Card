-- User Apps Settings Table
-- Stores app preferences for regular users (events, etc.)

CREATE TABLE IF NOT EXISTS user_apps_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  events_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_apps_settings_user_id ON user_apps_settings(user_id);

-- Enable RLS
ALTER TABLE user_apps_settings ENABLE ROW LEVEL SECURITY;

-- Users can read and manage their own settings
CREATE POLICY "Users can view own app settings"
  ON user_apps_settings FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can insert own app settings"
  ON user_apps_settings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own app settings"
  ON user_apps_settings FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON user_apps_settings TO authenticated;
GRANT ALL ON user_apps_settings TO service_role;
