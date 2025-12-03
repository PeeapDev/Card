-- Migration: Fix merchant_businesses RLS policies
-- Issue: The app uses custom JWT tokens, not Supabase Auth, so auth.uid() returns NULL
-- Solution: Disable RLS for authenticated users (using service role key) or use permissive policies

-- Drop existing RLS policies for merchant_businesses
DROP POLICY IF EXISTS "Merchants can view own businesses" ON merchant_businesses;
DROP POLICY IF EXISTS "Merchants can insert own businesses" ON merchant_businesses;
DROP POLICY IF EXISTS "Merchants can create own businesses" ON merchant_businesses;
DROP POLICY IF EXISTS "Merchants can update own businesses" ON merchant_businesses;
DROP POLICY IF EXISTS "Admins can delete businesses" ON merchant_businesses;

-- Since the app uses custom JWT (not Supabase Auth), auth.uid() will always be null
-- Option 1: Disable RLS entirely (simpler, the app handles auth at the API level)
-- ALTER TABLE merchant_businesses DISABLE ROW LEVEL SECURITY;

-- Option 2: Create permissive policies for authenticated role
-- This allows any authenticated user (with anon key) to perform operations
-- The app's business logic will enforce proper authorization

-- Allow all selects for authenticated users
CREATE POLICY "Allow authenticated select"
    ON merchant_businesses FOR SELECT
    TO authenticated, anon
    USING (true);

-- Allow all inserts for authenticated users
CREATE POLICY "Allow authenticated insert"
    ON merchant_businesses FOR INSERT
    TO authenticated, anon
    WITH CHECK (true);

-- Allow all updates for authenticated users
CREATE POLICY "Allow authenticated update"
    ON merchant_businesses FOR UPDATE
    TO authenticated, anon
    USING (true);

-- Allow all deletes for authenticated users (admin check done at app level)
CREATE POLICY "Allow authenticated delete"
    ON merchant_businesses FOR DELETE
    TO authenticated, anon
    USING (true);

-- Also fix business_transactions if it exists
DROP POLICY IF EXISTS "Users can view own business transactions" ON business_transactions;
DROP POLICY IF EXISTS "System can insert business transactions" ON business_transactions;

-- Create permissive policies for business_transactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_transactions') THEN
        EXECUTE 'CREATE POLICY "Allow authenticated select transactions" ON business_transactions FOR SELECT TO authenticated, anon USING (true)';
        EXECUTE 'CREATE POLICY "Allow authenticated insert transactions" ON business_transactions FOR INSERT TO authenticated, anon WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "Allow authenticated update transactions" ON business_transactions FOR UPDATE TO authenticated, anon USING (true)';
        EXECUTE 'CREATE POLICY "Allow authenticated delete transactions" ON business_transactions FOR DELETE TO authenticated, anon USING (true)';
    END IF;
END $$;

-- =============================================
-- STORAGE BUCKET SETUP
-- =============================================

-- Create the uploads storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'uploads',
    'uploads',
    true,
    5242880, -- 5MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;

-- Allow anyone to upload to the uploads bucket
CREATE POLICY "Allow public uploads"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow anyone to read from the uploads bucket
CREATE POLICY "Allow public reads"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'uploads');

-- Allow anyone to update files in the uploads bucket
CREATE POLICY "Allow public updates"
ON storage.objects FOR UPDATE
TO anon, authenticated
USING (bucket_id = 'uploads');

-- Allow anyone to delete from the uploads bucket
CREATE POLICY "Allow public deletes"
ON storage.objects FOR DELETE
TO anon, authenticated
USING (bucket_id = 'uploads');

COMMENT ON POLICY "Allow authenticated select" ON merchant_businesses IS 'Allows all authenticated users to view businesses - app handles authorization';
COMMENT ON POLICY "Allow authenticated insert" ON merchant_businesses IS 'Allows all authenticated users to create businesses - app handles authorization';
COMMENT ON POLICY "Allow authenticated update" ON merchant_businesses IS 'Allows all authenticated users to update businesses - app handles authorization';
COMMENT ON POLICY "Allow authenticated delete" ON merchant_businesses IS 'Allows all authenticated users to delete businesses - app handles authorization';
