const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://akiecgwcxadcpqlvntmf.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs'
);

async function createPageViewsTable() {
  console.log('Creating page_views table...');

  // First check if table exists by trying to query it
  const { error: checkError } = await supabase.from('page_views').select('id').limit(1);

  if (!checkError) {
    console.log('Table page_views already exists!');
    return;
  }

  if (checkError && !checkError.message.includes('does not exist')) {
    console.log('Table exists but has other error:', checkError.message);
    return;
  }

  // Create the table using Supabase's REST API for schema changes
  // Since we can't run DDL directly, we'll insert a test record to create schema
  // Actually, we need to use the Supabase dashboard or the SQL editor

  console.log(`
================================================================================
PLEASE RUN THIS SQL IN SUPABASE DASHBOARD (SQL Editor):
================================================================================

CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id UUID REFERENCES users(id),
  page_path VARCHAR(500) NOT NULL,
  page_title VARCHAR(255),
  referrer VARCHAR(500),
  user_agent TEXT,
  ip_address VARCHAR(45),
  country VARCHAR(100),
  city VARCHAR(100),
  device_type VARCHAR(50),
  browser VARCHAR(100),
  os VARCHAR(100),
  screen_width INTEGER,
  screen_height INTEGER,
  duration_seconds INTEGER DEFAULT 0,
  is_bounce BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Allow insert from authenticated and anon users
CREATE POLICY "Allow insert page views" ON page_views
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

-- Allow superadmin/admin to read all page views
CREATE POLICY "Allow admin read page views" ON page_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'superadmin')
    )
  );

================================================================================
  `);
}

createPageViewsTable();
