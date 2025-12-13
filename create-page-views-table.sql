-- Run this SQL in Supabase Dashboard > SQL Editor
-- Creates the page_views table for website analytics tracking

CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  user_id UUID,
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

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_page_path ON page_views(page_path);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views(user_id);

-- Enable Row Level Security
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert page views (for tracking)
CREATE POLICY "Allow insert page views" ON page_views
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow admins to read all page views
CREATE POLICY "Allow admin read page views" ON page_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.roles IN ('admin', 'superadmin')
    )
  );

-- Grant permissions
GRANT INSERT ON page_views TO anon;
GRANT INSERT ON page_views TO authenticated;
GRANT SELECT ON page_views TO authenticated;
