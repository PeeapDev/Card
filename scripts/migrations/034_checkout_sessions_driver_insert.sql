-- Migration: Allow all operations on checkout_sessions for driver collection
-- Since the app uses custom auth (not Supabase Auth), we use permissive policies

-- Allow all operations for anon role (app uses custom auth with anon key)
DROP POLICY IF EXISTS "Allow all checkout session operations" ON checkout_sessions;
CREATE POLICY "Allow all checkout session operations"
    ON checkout_sessions
    FOR ALL
    USING (true)
    WITH CHECK (true);

COMMENT ON POLICY "Allow all checkout session operations" ON checkout_sessions IS 'Allows all operations since app uses custom auth system';
