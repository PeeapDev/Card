-- Add RLS policies for system_float tables
-- Allow authenticated users to read float data

-- Enable RLS if not already enabled
ALTER TABLE system_float ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_float_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow authenticated read system_float" ON system_float;
DROP POLICY IF EXISTS "Allow authenticated read system_float_history" ON system_float_history;

-- Create read policies for authenticated users
CREATE POLICY "Allow authenticated read system_float"
ON system_float FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated read system_float_history"
ON system_float_history FOR SELECT
TO authenticated
USING (true);

-- Also allow admins to insert/update
CREATE POLICY "Allow admin write system_float"
ON system_float FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND (users.role = 'ADMIN' OR users.role = 'SUPERADMIN')
  )
);

CREATE POLICY "Allow admin write system_float_history"
ON system_float_history FOR INSERT
TO authenticated
WITH CHECK (true);
