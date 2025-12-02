-- Create search_users RPC function for user search
-- This function searches users by username, phone, name, or email

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
    searcher_role TEXT;
    searcher_level INTEGER;
BEGIN
    -- Get the current user's role level
    SELECT COALESCE(
        (SELECT MAX(r.level)
         FROM user_roles ur
         JOIN roles r ON r.id = ur.role_id
         WHERE ur.user_id = auth.uid()),
        10  -- Default to 'user' level if no roles found
    ) INTO searcher_level;

    -- Clean up query
    clean_query := LOWER(TRIM(p_query));

    -- Remove @ prefix if present
    IF clean_query LIKE '@%' THEN
        clean_query := SUBSTRING(clean_query FROM 2);
    END IF;

    RETURN QUERY
    SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.phone,
        u.email,
        u.profile_picture
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    WHERE
        u.status = 'ACTIVE'
        AND u.id != auth.uid()  -- Exclude self
        AND (
            -- Search by username
            LOWER(u.username) LIKE '%' || clean_query || '%'
            -- Search by phone
            OR u.phone LIKE '%' || clean_query || '%'
            -- Search by first name
            OR LOWER(u.first_name) LIKE '%' || clean_query || '%'
            -- Search by last name
            OR LOWER(u.last_name) LIKE '%' || clean_query || '%'
            -- Search by email
            OR LOWER(u.email) LIKE '%' || clean_query || '%'
        )
        AND (
            -- If searcher is admin (level >= 80), they can see everyone
            searcher_level >= 80
            -- Otherwise, only show users with level <= 10 (regular users)
            OR COALESCE(r.level, 10) <= 10
        )
    GROUP BY u.id, u.first_name, u.last_name, u.username, u.phone, u.email, u.profile_picture
    ORDER BY
        -- Prioritize exact username matches
        CASE WHEN LOWER(u.username) = clean_query THEN 0 ELSE 1 END,
        u.first_name
    LIMIT p_limit;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION search_users TO authenticated;

-- Add comment
COMMENT ON FUNCTION search_users IS 'Search for users by username, phone, name, or email with RBAC filtering';
