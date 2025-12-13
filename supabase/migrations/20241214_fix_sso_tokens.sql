-- Fix SSO Tokens Table
-- Adds missing columns: source_app, client_id, scope

-- Add source_app column (which app generated the token)
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS source_app VARCHAR(50);

-- Add client_id column (for OAuth tokens)
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS client_id VARCHAR(64);

-- Add scope column (OAuth scopes)
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS scope TEXT;

-- Add index for source_app queries
CREATE INDEX IF NOT EXISTS idx_sso_tokens_source_app ON sso_tokens(source_app);

-- Add index for client_id queries (OAuth)
CREATE INDEX IF NOT EXISTS idx_sso_tokens_client_id ON sso_tokens(client_id) WHERE client_id IS NOT NULL;
