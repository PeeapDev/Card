-- Migration: Fix RLS policies for business_categories table
-- The current policy uses JWT claims which don't work well with Supabase client
-- We need to check the user's role from the users table instead

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view active business categories" ON business_categories;
DROP POLICY IF EXISTS "Admins can manage business categories" ON business_categories;

-- Create helper function to check if current user is admin or superadmin
CREATE OR REPLACE FUNCTION is_admin_or_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND roles LIKE '%admin%'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Allow anyone to read active categories (for dropdowns, etc.)
CREATE POLICY "Anyone can view active business categories"
    ON business_categories
    FOR SELECT
    USING (status = 'ACTIVE' OR is_admin_or_superadmin());

-- Admin and superadmin can insert new categories
CREATE POLICY "Admins can insert business categories"
    ON business_categories
    FOR INSERT
    WITH CHECK (is_admin_or_superadmin());

-- Admin and superadmin can update categories
CREATE POLICY "Admins can update business categories"
    ON business_categories
    FOR UPDATE
    USING (is_admin_or_superadmin())
    WITH CHECK (is_admin_or_superadmin());

-- Admin and superadmin can delete categories
CREATE POLICY "Admins can delete business categories"
    ON business_categories
    FOR DELETE
    USING (is_admin_or_superadmin());

-- Comment
COMMENT ON FUNCTION is_admin_or_superadmin() IS 'Helper function to check if current authenticated user has admin or superadmin role';
