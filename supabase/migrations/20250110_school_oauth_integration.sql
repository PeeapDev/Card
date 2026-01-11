-- School OAuth Integration Migration
-- Adds support for School SaaS SSO with Peeap Pay

-- =============================================
-- 1. Add metadata column to oauth_authorization_codes
-- Stores school-specific data like index_number, school_id
-- =============================================
ALTER TABLE oauth_authorization_codes
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for querying by metadata
CREATE INDEX IF NOT EXISTS idx_oauth_auth_codes_metadata ON oauth_authorization_codes USING GIN (metadata);

-- =============================================
-- 2. Register School SaaS OAuth Client
-- =============================================
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  name,
  description,
  logo_url,
  website_url,
  redirect_uris,
  scopes,
  is_active,
  is_confidential
) VALUES (
  'school_saas',
  'school_secret_' || encode(gen_random_bytes(32), 'hex'),
  'School Management System',
  'Official School SaaS integration for gov.school.edu.sl',
  'https://gov.school.edu.sl/logo.png',
  'https://gov.school.edu.sl',
  ARRAY[
    -- Production redirect URIs (wildcard pattern handled in code)
    'https://*.gov.school.edu.sl/peeap/callback',
    'https://*.gov.school.edu.sl/peeap/student-callback',
    -- Allow any subdomain callback
    'https://ses.gov.school.edu.sl/peeap/callback',
    'https://ses.gov.school.edu.sl/peeap/student-callback',
    'https://fyp.gov.school.edu.sl/peeap/callback',
    'https://fyp.gov.school.edu.sl/peeap/student-callback',
    -- Development/testing
    'http://localhost:8000/peeap/callback',
    'http://localhost:8000/peeap/student-callback',
    'http://127.0.0.1:8000/peeap/callback',
    'http://127.0.0.1:8000/peeap/student-callback'
  ],
  ARRAY[
    'profile',
    'email',
    'phone',
    'wallet:read',
    'wallet:write',
    'school:connect',
    'school:manage',
    'student:sync',
    'fee:pay',
    'transactions:read'
  ],
  true,
  true
) ON CONFLICT (client_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  redirect_uris = EXCLUDED.redirect_uris,
  scopes = EXCLUDED.scopes,
  is_active = EXCLUDED.is_active;

-- =============================================
-- 3. School Portal OAuth Client (for school.peeap.com)
-- =============================================
INSERT INTO oauth_clients (
  client_id,
  client_secret,
  name,
  description,
  redirect_uris,
  scopes,
  is_active,
  is_confidential
) VALUES (
  'school-portal',
  'school_portal_' || encode(gen_random_bytes(32), 'hex'),
  'Peeap School Portal',
  'Internal school portal at school.peeap.com',
  ARRAY[
    'https://school.peeap.com/auth/callback',
    'http://localhost:5173/auth/callback',
    'http://localhost:3000/auth/callback'
  ],
  ARRAY[
    'profile',
    'email',
    'school_admin',
    'school:connect',
    'school:manage'
  ],
  true,
  true
) ON CONFLICT (client_id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  redirect_uris = EXCLUDED.redirect_uris,
  scopes = EXCLUDED.scopes;

-- =============================================
-- 4. Create school_connections table
-- Tracks which schools are connected to Peeap
-- =============================================
CREATE TABLE IF NOT EXISTS school_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id VARCHAR(100) NOT NULL, -- School's internal ID (from their system)
  peeap_school_id VARCHAR(50) NOT NULL UNIQUE, -- Our generated ID (sch_xxx)
  school_name VARCHAR(255) NOT NULL,
  school_domain VARCHAR(255), -- e.g., ses.gov.school.edu.sl
  connected_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  connected_by_email VARCHAR(255),
  access_token_id UUID REFERENCES oauth_access_tokens(id) ON DELETE SET NULL,
  status VARCHAR(20) DEFAULT 'active', -- active, suspended, disconnected
  settings JSONB DEFAULT '{
    "auto_sync_students": true,
    "sync_fee_payments": true,
    "sync_transport_payments": true,
    "enable_vendor_payments": true
  }'::jsonb,
  stats JSONB DEFAULT '{
    "students_linked": 0,
    "total_transactions": 0,
    "total_volume": 0
  }'::jsonb,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_connections_school_id ON school_connections(school_id);
CREATE INDEX IF NOT EXISTS idx_school_connections_peeap_id ON school_connections(peeap_school_id);
CREATE INDEX IF NOT EXISTS idx_school_connections_domain ON school_connections(school_domain);
CREATE INDEX IF NOT EXISTS idx_school_connections_status ON school_connections(status);

-- RLS
ALTER TABLE school_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select school_connections" ON school_connections
  FOR SELECT USING (true);

CREATE POLICY "Allow insert school_connections" ON school_connections
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update school_connections" ON school_connections
  FOR UPDATE USING (true);

-- =============================================
-- 5. Create student_wallet_links table
-- Links students (via index_number) to Peeap wallets
-- =============================================
CREATE TABLE IF NOT EXISTS student_wallet_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  index_number VARCHAR(50) NOT NULL, -- National student ID (WAEC/BECE)
  peeap_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID, -- Reference to wallet
  current_school_id VARCHAR(100), -- Current school's ID
  peeap_school_id VARCHAR(50), -- Current school's Peeap ID
  student_name VARCHAR(255),
  student_phone VARCHAR(20),
  status VARCHAR(20) DEFAULT 'active', -- active, transferred, graduated
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_school_change_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(index_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_wallet_links_index ON student_wallet_links(index_number);
CREATE INDEX IF NOT EXISTS idx_student_wallet_links_user ON student_wallet_links(peeap_user_id);
CREATE INDEX IF NOT EXISTS idx_student_wallet_links_school ON student_wallet_links(peeap_school_id);

-- RLS
ALTER TABLE student_wallet_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow select student_wallet_links" ON student_wallet_links
  FOR SELECT USING (true);

CREATE POLICY "Allow insert student_wallet_links" ON student_wallet_links
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update student_wallet_links" ON student_wallet_links
  FOR UPDATE USING (true);

-- =============================================
-- 6. Update oauth_clients validation for wildcards
-- Function to validate redirect URIs with wildcard support
-- =============================================
CREATE OR REPLACE FUNCTION validate_oauth_redirect_uri(
  p_client_id VARCHAR,
  p_redirect_uri TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_allowed_uris TEXT[];
  v_uri TEXT;
  v_pattern TEXT;
BEGIN
  -- Get allowed URIs for client
  SELECT redirect_uris INTO v_allowed_uris
  FROM oauth_clients
  WHERE client_id = p_client_id AND is_active = true;

  IF v_allowed_uris IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check exact match first
  IF p_redirect_uri = ANY(v_allowed_uris) THEN
    RETURN TRUE;
  END IF;

  -- Check wildcard patterns (*.domain.com)
  FOREACH v_uri IN ARRAY v_allowed_uris LOOP
    IF v_uri LIKE 'https://*.%' THEN
      -- Convert wildcard to regex pattern
      v_pattern := '^https://[a-zA-Z0-9-]+\.' ||
                   regexp_replace(substring(v_uri from 11), '([./$^])', '\\\1', 'g');
      IF p_redirect_uri ~ v_pattern THEN
        RETURN TRUE;
      END IF;
    END IF;
  END LOOP;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. Webhook registration for schools
-- =============================================
CREATE TABLE IF NOT EXISTS school_webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  peeap_school_id VARCHAR(50) NOT NULL REFERENCES school_connections(peeap_school_id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  events TEXT[] NOT NULL DEFAULT ARRAY[
    'transaction.completed',
    'fee.paid',
    'transport.fee_paid',
    'wallet.topup',
    'student.transferred'
  ],
  secret VARCHAR(128) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_webhooks_school ON school_webhooks(peeap_school_id);
CREATE INDEX IF NOT EXISTS idx_school_webhooks_active ON school_webhooks(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE school_webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all school_webhooks" ON school_webhooks
  FOR ALL USING (true);

-- =============================================
-- Log this migration
-- =============================================
DO $$
BEGIN
  RAISE NOTICE 'School OAuth integration migration completed successfully';
  RAISE NOTICE 'Created: oauth_authorization_codes.metadata column';
  RAISE NOTICE 'Created: school_saas and school-portal OAuth clients';
  RAISE NOTICE 'Created: school_connections table';
  RAISE NOTICE 'Created: student_wallet_links table';
  RAISE NOTICE 'Created: school_webhooks table';
  RAISE NOTICE 'Created: validate_oauth_redirect_uri function';
END $$;
