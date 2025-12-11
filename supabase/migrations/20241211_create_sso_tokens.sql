-- SSO Tokens Table
-- Stores one-time tokens for cross-domain authentication between my.peeap.com and plus.peeap.com

CREATE TABLE IF NOT EXISTS sso_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) NOT NULL UNIQUE,
  target_app VARCHAR(50) NOT NULL, -- 'plus' or 'my'
  tier VARCHAR(50), -- 'basic', 'business', 'business_plus'
  redirect_path TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_sso_tokens_token ON sso_tokens(token);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_sso_tokens_expires_at ON sso_tokens(expires_at);

-- Enable RLS
ALTER TABLE sso_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Allow insert from authenticated users (or service role)
CREATE POLICY "Allow insert sso_tokens" ON sso_tokens
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow select for unused tokens
CREATE POLICY "Allow select unused sso_tokens" ON sso_tokens
  FOR SELECT
  USING (used_at IS NULL);

-- Policy: Allow update to mark as used
CREATE POLICY "Allow update sso_tokens" ON sso_tokens
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Policy: Allow delete for cleanup
CREATE POLICY "Allow delete sso_tokens" ON sso_tokens
  FOR DELETE
  USING (true);
