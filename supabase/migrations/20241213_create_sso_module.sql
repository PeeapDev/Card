-- SSO Module Configuration
-- Adds SSO as a configurable module in the platform

-- =============================================
-- 1. Insert SSO Module (Internal)
-- =============================================
INSERT INTO modules (
  code,
  name,
  description,
  category,
  version,
  icon,
  is_enabled,
  is_system,
  config,
  dependencies
) VALUES (
  'sso_internal',
  'Internal SSO',
  'Single Sign-On between Peeap domains (my.peeap.com, plus.peeap.com, etc.)',
  'security',
  '1.0.0',
  '🔐',
  true,
  true,
  '{
    "enabled_apps": ["my", "plus", "checkout", "developer"],
    "token_expiry_minutes": 5,
    "session_expiry_days": 7,
    "allowed_redirect_domains": [
      "peeap.com",
      "my.peeap.com",
      "plus.peeap.com",
      "checkout.peeap.com",
      "developer.peeap.com"
    ],
    "require_mfa_for_sso": false,
    "log_sso_events": true
  }'::jsonb,
  ARRAY[]::text[]
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = NOW();

-- =============================================
-- 2. Insert SSO Module (External/OAuth)
-- =============================================
INSERT INTO modules (
  code,
  name,
  description,
  category,
  version,
  icon,
  is_enabled,
  is_system,
  config,
  dependencies
) VALUES (
  'sso_external',
  'External SSO (OAuth)',
  'Allow third-party websites to use "Login with Peeap" authentication',
  'security',
  '1.0.0',
  '🌐',
  false,
  true,
  '{
    "enabled": false,
    "authorization_code_expiry_minutes": 10,
    "access_token_expiry_hours": 1,
    "refresh_token_expiry_days": 30,
    "allowed_scopes": ["profile", "email", "wallet:read", "transactions:read"],
    "require_client_approval": true,
    "max_clients_per_user": 10,
    "rate_limit_per_client": 1000,
    "require_https_redirect": true
  }'::jsonb,
  ARRAY['sso_internal']::text[]
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = NOW();

-- =============================================
-- 3. Insert Shared API Module
-- =============================================
INSERT INTO modules (
  code,
  name,
  description,
  category,
  version,
  icon,
  is_enabled,
  is_system,
  config,
  dependencies
) VALUES (
  'shared_api',
  'Shared API',
  'Cross-domain API access for contacts, wallet, transfers, and checkout',
  'feature',
  '1.0.0',
  '🔗',
  true,
  true,
  '{
    "enabled_endpoints": [
      "/shared/user",
      "/shared/contacts",
      "/shared/wallet",
      "/shared/wallet/transactions",
      "/shared/transfer",
      "/shared/checkout/create"
    ],
    "rate_limit_per_minute": 60,
    "require_sso_session": true,
    "allow_oauth_tokens": true,
    "max_transaction_amount": 1000000,
    "transfer_requires_pin": false
  }'::jsonb,
  ARRAY['sso_internal']::text[]
) ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  config = EXCLUDED.config,
  updated_at = NOW();

-- =============================================
-- 4. SSO Settings Table
-- =============================================
CREATE TABLE IF NOT EXISTS sso_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default SSO settings
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

-- =============================================
-- 5. SSO Event Logs Table
-- =============================================
CREATE TABLE IF NOT EXISTS sso_event_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL, -- 'token_generated', 'token_validated', 'session_created', 'oauth_authorized', etc.
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  source_app VARCHAR(50),
  target_app VARCHAR(50),
  client_id VARCHAR(64), -- For OAuth events
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for SSO event logs
CREATE INDEX IF NOT EXISTS idx_sso_events_user ON sso_event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sso_events_type ON sso_event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_sso_events_created ON sso_event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sso_events_client ON sso_event_logs(client_id) WHERE client_id IS NOT NULL;

-- RLS for SSO event logs
ALTER TABLE sso_event_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert sso_event_logs" ON sso_event_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow admin select sso_event_logs" ON sso_event_logs
  FOR SELECT USING (true);

-- =============================================
-- 6. OAuth Client Analytics
-- =============================================
CREATE TABLE IF NOT EXISTS oauth_client_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(64) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  authorizations_count INTEGER DEFAULT 0,
  token_requests_count INTEGER DEFAULT 0,
  api_calls_count INTEGER DEFAULT 0,
  unique_users_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(client_id, date)
);

-- Index for analytics
CREATE INDEX IF NOT EXISTS idx_oauth_analytics_client ON oauth_client_analytics(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_analytics_date ON oauth_client_analytics(date);

-- Function to increment OAuth analytics
CREATE OR REPLACE FUNCTION increment_oauth_analytics(
  p_client_id VARCHAR(64),
  p_field VARCHAR(50)
)
RETURNS void AS $$
BEGIN
  INSERT INTO oauth_client_analytics (client_id, date)
  VALUES (p_client_id, CURRENT_DATE)
  ON CONFLICT (client_id, date) DO UPDATE
  SET updated_at = NOW();

  EXECUTE format(
    'UPDATE oauth_client_analytics SET %I = %I + 1, updated_at = NOW() WHERE client_id = $1 AND date = CURRENT_DATE',
    p_field, p_field
  ) USING p_client_id;
END;
$$ LANGUAGE plpgsql;
