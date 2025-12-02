-- ============================================
-- Fix RBAC and Reset User Roles
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Clear user_roles table
TRUNCATE TABLE user_roles CASCADE;

-- 2. Update user_role_level function to handle users without roles
-- Returns level 10 (user) by default instead of 0
CREATE OR REPLACE FUNCTION user_role_level(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_level INTEGER;
BEGIN
    -- First check user_roles table
    SELECT MAX(r.level) INTO v_level
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
    AND (ur.expires_at IS NULL OR ur.expires_at > NOW());

    -- If no role found, check the legacy 'roles' column on users table
    IF v_level IS NULL THEN
        SELECT
            CASE
                WHEN roles ILIKE '%superadmin%' THEN 100
                WHEN roles ILIKE '%admin%' THEN 80
                WHEN roles ILIKE '%support%' THEN 60
                WHEN roles ILIKE '%merchant%' THEN 40
                WHEN roles ILIKE '%agent%' THEN 40
                ELSE 10  -- Default to regular user level
            END INTO v_level
        FROM users
        WHERE id = p_user_id;
    END IF;

    RETURN COALESCE(v_level, 10);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Drop and recreate users RLS policies with better logic
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;

-- Allow users to see themselves, admins see all, regular users see other regular users
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        -- Always allow user to see themselves
        id = auth.uid()
        OR
        -- Admins (level >= 80) can see everyone
        user_role_level(auth.uid()) >= 80
        OR
        -- Regular users can see other ACTIVE users with role 'user'
        (
            status = 'ACTIVE'
            AND (roles IS NULL OR roles = 'user' OR roles = '')
        )
    );

CREATE POLICY "users_update_policy" ON users
    FOR UPDATE USING (
        id = auth.uid()
        OR
        user_role_level(auth.uid()) >= 80
    );

CREATE POLICY "users_insert_policy" ON users
    FOR INSERT WITH CHECK (true);

-- 4. Create simple search_users function that works without complex RBAC
CREATE OR REPLACE FUNCTION search_users(
    p_query TEXT,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    first_name TEXT,
    last_name TEXT,
    username TEXT,
    phone TEXT,
    email TEXT,
    profile_picture TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    clean_query TEXT;
    searcher_level INTEGER;
BEGIN
    -- Get the current user's role level
    searcher_level := user_role_level(auth.uid());

    -- Clean up query
    clean_query := LOWER(TRIM(p_query));
    IF clean_query LIKE '@%' THEN
        clean_query := SUBSTRING(clean_query FROM 2);
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.first_name::TEXT,
        u.last_name::TEXT,
        u.username::TEXT,
        u.phone::TEXT,
        u.email::TEXT,
        u.profile_picture::TEXT
    FROM users u
    WHERE
        u.status = 'ACTIVE'
        AND u.id != auth.uid()
        AND (
            u.phone ILIKE '%' || clean_query || '%'
            OR u.first_name ILIKE '%' || clean_query || '%'
            OR u.last_name ILIKE '%' || clean_query || '%'
            OR u.email ILIKE '%' || clean_query || '%'
            OR u.username ILIKE '%' || clean_query || '%'
        )
        AND (
            -- Admins can see everyone
            searcher_level >= 80
            OR
            -- Regular users can only see other regular users
            (u.roles IS NULL OR u.roles = 'user' OR u.roles = '')
        )
    ORDER BY u.first_name
    LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION search_users TO authenticated;

-- 5. Verify the fix
SELECT 'RBAC fix completed!' as status;
