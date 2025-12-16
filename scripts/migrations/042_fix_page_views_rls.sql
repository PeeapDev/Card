-- Migration: Fix page_views RLS policies
-- The roles column is an array, so we need to use array operators

-- Drop existing policies
DROP POLICY IF EXISTS "Allow insert page views" ON page_views;
DROP POLICY IF EXISTS "Allow admin read page views" ON page_views;

-- Policy: Allow anyone (including anonymous) to insert page views
CREATE POLICY "Allow insert page views" ON page_views
  FOR INSERT
  WITH CHECK (true);

-- Policy: Allow admins/superadmins to read all page views
CREATE POLICY "Allow admin read page views" ON page_views
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.roles && ARRAY['admin', 'superadmin'])
    )
  );

-- Make sure anon can insert (for visitors without accounts)
GRANT INSERT ON page_views TO anon;
GRANT INSERT ON page_views TO authenticated;
GRANT SELECT ON page_views TO authenticated;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
