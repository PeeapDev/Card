/**
 * Run SSO tokens migration on Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Creating sso_tokens table...');

  // Check if table exists first
  const { data: existingTable, error: checkError } = await supabase
    .from('sso_tokens')
    .select('id')
    .limit(1);

  if (!checkError) {
    console.log('sso_tokens table already exists');
    return;
  }

  // Table doesn't exist, we need to create it via SQL
  // Since we can't run raw SQL with anon key, let's try inserting
  // The table needs to be created in Supabase dashboard

  console.log('\n⚠️  Please create the sso_tokens table in Supabase dashboard:');
  console.log('\n1. Go to: https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql/new');
  console.log('\n2. Run this SQL:\n');
  console.log(`
CREATE TABLE IF NOT EXISTS sso_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  target_app VARCHAR(50) NOT NULL,
  tier VARCHAR(50),
  redirect_path TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast token lookups
CREATE INDEX IF NOT EXISTS idx_sso_tokens_token ON sso_tokens(token);

-- Index for cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_sso_tokens_expires_at ON sso_tokens(expires_at);

-- Disable RLS for now (or configure policies as needed)
ALTER TABLE sso_tokens DISABLE ROW LEVEL SECURITY;
  `);
  console.log('\n3. Click "Run" to execute the SQL');
}

runMigration().catch(console.error);
