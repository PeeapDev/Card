-- Migration: 066_roles_array.sql
-- Description: Convert roles column from VARCHAR to TEXT[] array for multi-role support
-- This enables users to have multiple roles (user + merchant, user + agent, etc.)

-- Step 1: Convert roles column from VARCHAR to TEXT[] array
-- Handle existing data by wrapping single role in array
ALTER TABLE users
ALTER COLUMN roles TYPE text[]
USING CASE
  WHEN roles IS NULL THEN ARRAY['user']::text[]
  WHEN roles = '' THEN ARRAY['user']::text[]
  ELSE ARRAY[roles]::text[]
END;

-- Step 2: Set default for new users
ALTER TABLE users
ALTER COLUMN roles SET DEFAULT ARRAY['user']::text[];

-- Step 3: Create index for array queries (GIN index for containment queries)
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);

-- Step 4: Create helper function to check if user has a role
CREATE OR REPLACE FUNCTION user_has_role(user_roles text[], check_role text)
RETURNS boolean AS $$
BEGIN
  RETURN check_role = ANY(user_roles);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 5: Create helper function to add a role to user
CREATE OR REPLACE FUNCTION add_user_role(user_id_param uuid, new_role text)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET roles = array_append(roles, new_role),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = user_id_param
    AND NOT (new_role = ANY(roles));
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create helper function to remove a role from user
CREATE OR REPLACE FUNCTION remove_user_role(user_id_param uuid, role_to_remove text)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET roles = array_remove(roles, role_to_remove),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
