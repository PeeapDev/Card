/**
 * Create users table in Supabase
 * Run this script to create the users table for SSO sync
 */

console.log(`
Please create the users table in Supabase dashboard:

1. Go to: https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql/new

2. Run this SQL:

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  phone VARCHAR(50),
  roles VARCHAR(255) DEFAULT 'user',
  tier VARCHAR(50) DEFAULT 'basic',
  business_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast email lookups
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Disable RLS (for development - enable in production with proper policies)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

3. Click "Run"

Note: The id is VARCHAR because the web app's user IDs may not be UUIDs.
`);
