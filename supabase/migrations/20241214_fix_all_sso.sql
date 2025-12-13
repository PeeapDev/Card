-- =============================================
-- COMPLETE SSO FIX MIGRATION
-- Run this in Supabase Dashboard SQL Editor
-- =============================================

-- 1. Fix sso_tokens table - Add missing columns
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS source_app VARCHAR(50);
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS client_id VARCHAR(64);
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS scope TEXT;

-- Create indexes for new columns
CREATE INDEX IF NOT EXISTS idx_sso_tokens_source_app ON sso_tokens(source_app);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_client_id ON sso_tokens(client_id) WHERE client_id IS NOT NULL;

-- 2. Ensure sso_settings table exists with proper structure
CREATE TABLE IF NOT EXISTS sso_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- 3. Insert default SSO settings (if not exists)
INSERT INTO sso_settings (setting_key, setting_value, description) VALUES
  ('internal_sso', '{
    "enabled": true,
    "apps": {
      "my": {"enabled": true, "domain": "my.peeap.com", "dev_port": 5173},
      "plus": {"enabled": true, "domain": "plus.peeap.com", "dev_port": 3000},
      "checkout": {"enabled": true, "domain": "checkout.peeap.com", "dev_port": 5174},
      "developer": {"enabled": false, "domain": "developer.peeap.com", "dev_port": 5175}
    },
    "token_expiry_minutes": 5,
    "session_expiry_days": 7
  }', 'Internal SSO configuration between Peeap domains'),

  ('external_sso', '{
    "enabled": false,
    "require_approval": true,
    "allowed_scopes": ["profile", "email", "wallet:read", "transactions:read"],
    "dangerous_scopes": ["wallet:write", "transfers:write"],
    "token_expiry": {
      "authorization_code_minutes": 10,
      "access_token_hours": 1,
      "refresh_token_days": 30
    }
  }', 'External OAuth SSO for third-party integrations'),

  ('shared_api', '{
    "enabled": true,
    "endpoints": {
      "user": true,
      "contacts": true,
      "wallet": true,
      "transactions": true,
      "transfer": true,
      "checkout": true
    },
    "rate_limits": {
      "per_minute": 60,
      "per_hour": 1000
    },
    "transfer_settings": {
      "require_pin": false,
      "max_amount": 1000000,
      "daily_limit": 5000000
    }
  }', 'Shared API configuration for cross-domain access')
ON CONFLICT (setting_key) DO NOTHING;

-- 4. Enable RLS on sso_settings
ALTER TABLE sso_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for sso_settings
DROP POLICY IF EXISTS "Allow select sso_settings" ON sso_settings;
CREATE POLICY "Allow select sso_settings" ON sso_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin update sso_settings" ON sso_settings;
CREATE POLICY "Allow admin update sso_settings" ON sso_settings
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow admin insert sso_settings" ON sso_settings;
CREATE POLICY "Allow admin insert sso_settings" ON sso_settings
  FOR INSERT WITH CHECK (true);

-- 5. Reload schema cache
SELECT pg_notify('pgrst', 'reload schema');

-- 6. Verify tables exist
SELECT 'sso_tokens columns' as check_type,
       column_name,
       data_type
FROM information_schema.columns
WHERE table_name = 'sso_tokens'
  AND column_name IN ('source_app', 'client_id', 'scope');

SELECT 'sso_settings data' as check_type,
       setting_key
FROM sso_settings;
