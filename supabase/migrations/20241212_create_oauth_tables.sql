-- OAuth Tables for Third-Party SSO Integration
-- Enables "Login with Peeap" for external applications

-- =============================================
-- 1. OAuth Clients Table
-- Stores registered third-party applications
-- =============================================
CREATE TABLE IF NOT EXISTS oauth_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(64) NOT NULL UNIQUE,
  client_secret VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  logo_url TEXT,
  website_url TEXT,
  redirect_uris TEXT[] NOT NULL, -- Array of allowed redirect URIs
  scopes TEXT[] NOT NULL DEFAULT ARRAY['profile'], -- Allowed scopes
  is_active BOOLEAN DEFAULT true,
  is_confidential BOOLEAN DEFAULT true, -- Server-side apps vs public clients
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_clients_client_id ON oauth_clients(client_id);
CREATE INDEX IF NOT EXISTS idx_oauth_clients_owner ON oauth_clients(owner_user_id);

-- =============================================
-- 2. OAuth Authorization Codes Table
-- Stores temporary authorization codes
-- =============================================
CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(128) NOT NULL UNIQUE,
  client_id VARCHAR(64) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  redirect_uri TEXT NOT NULL,
  scope TEXT NOT NULL,
  code_challenge VARCHAR(128), -- For PKCE
  code_challenge_method VARCHAR(10), -- 'plain' or 'S256'
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_code ON oauth_authorization_codes(code);
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_expires ON oauth_authorization_codes(expires_at);

-- =============================================
-- 3. OAuth Access Tokens Table
-- Stores access and refresh tokens
-- =============================================
CREATE TABLE IF NOT EXISTS oauth_access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token VARCHAR(128) NOT NULL UNIQUE,
  refresh_token VARCHAR(128) UNIQUE,
  client_id VARCHAR(64) NOT NULL,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  revoked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_access ON oauth_access_tokens(access_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_refresh ON oauth_access_tokens(refresh_token);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user ON oauth_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON oauth_access_tokens(expires_at);

-- =============================================
-- 4. OAuth User Consents Table
-- Tracks which scopes a user has approved for each client
-- =============================================
CREATE TABLE IF NOT EXISTS oauth_user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id VARCHAR(64) NOT NULL,
  scopes TEXT[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, client_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_oauth_consents_user ON oauth_user_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_consents_client ON oauth_user_consents(client_id);

-- =============================================
-- 5. Update SSO Tokens Table (add source_app and scope)
-- =============================================
ALTER TABLE sso_tokens
  ADD COLUMN IF NOT EXISTS source_app VARCHAR(50),
  ADD COLUMN IF NOT EXISTS client_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS scope TEXT;

-- =============================================
-- 6. User Sessions Table (for server-side sessions)
-- =============================================
CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token VARCHAR(128) NOT NULL UNIQUE,
  app VARCHAR(50) NOT NULL, -- 'my', 'plus', 'checkout', 'developer'
  tier VARCHAR(50),
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at);

-- =============================================
-- Row Level Security Policies
-- =============================================

-- OAuth Clients
ALTER TABLE oauth_clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read oauth_clients" ON oauth_clients
  FOR SELECT USING (is_active = true);

CREATE POLICY "Allow owner manage oauth_clients" ON oauth_clients
  FOR ALL USING (owner_user_id = auth.uid());

-- OAuth Authorization Codes
ALTER TABLE oauth_authorization_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert oauth_auth_codes" ON oauth_authorization_codes
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select oauth_auth_codes" ON oauth_authorization_codes
  FOR SELECT USING (used_at IS NULL);

CREATE POLICY "Allow update oauth_auth_codes" ON oauth_authorization_codes
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete oauth_auth_codes" ON oauth_authorization_codes
  FOR DELETE USING (true);

-- OAuth Access Tokens
ALTER TABLE oauth_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert oauth_tokens" ON oauth_access_tokens
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select oauth_tokens" ON oauth_access_tokens
  FOR SELECT USING (revoked_at IS NULL);

CREATE POLICY "Allow update oauth_tokens" ON oauth_access_tokens
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete oauth_tokens" ON oauth_access_tokens
  FOR DELETE USING (true);

-- OAuth User Consents
ALTER TABLE oauth_user_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow user manage consents" ON oauth_user_consents
  FOR ALL USING (user_id = auth.uid());

-- User Sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert user_sessions" ON user_sessions
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow select user_sessions" ON user_sessions
  FOR SELECT USING (true);

CREATE POLICY "Allow update user_sessions" ON user_sessions
  FOR UPDATE USING (true);

CREATE POLICY "Allow delete user_sessions" ON user_sessions
  FOR DELETE USING (true);

-- =============================================
-- Helper Functions
-- =============================================

-- Function to clean up expired tokens and codes
CREATE OR REPLACE FUNCTION cleanup_oauth_expired()
RETURNS void AS $$
BEGIN
  -- Delete expired authorization codes
  DELETE FROM oauth_authorization_codes
  WHERE expires_at < NOW();

  -- Delete expired access tokens (not revoked ones - keep for audit)
  DELETE FROM oauth_access_tokens
  WHERE expires_at < NOW() AND revoked_at IS NULL;

  -- Delete expired SSO tokens
  DELETE FROM sso_tokens
  WHERE expires_at < NOW();

  -- Delete expired sessions
  DELETE FROM user_sessions
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. User Contacts Table (for shared API)
-- =============================================
CREATE TABLE IF NOT EXISTS user_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  contact_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nickname VARCHAR(100),
  is_favorite BOOLEAN DEFAULT false,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, contact_user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_contacts_user ON user_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_contact ON user_contacts(contact_user_id);
CREATE INDEX IF NOT EXISTS idx_user_contacts_favorite ON user_contacts(user_id, is_favorite) WHERE is_favorite = true;

-- RLS
ALTER TABLE user_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own contacts" ON user_contacts
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own contacts" ON user_contacts
  FOR ALL USING (user_id = auth.uid());

-- =============================================
-- Seed a test OAuth client (for development)
-- =============================================
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  name,
  description,
  redirect_uris,
  scopes,
  is_active
) VALUES (
  'test_client_001',
  'test_secret_001_' || encode(gen_random_bytes(16), 'hex'),
  'Test Application',
  'A test OAuth client for development',
  ARRAY['http://localhost:3001/callback', 'http://localhost:3001/auth/callback'],
  ARRAY['profile', 'email', 'wallet:read'],
  true
) ON CONFLICT (client_id) DO NOTHING;
