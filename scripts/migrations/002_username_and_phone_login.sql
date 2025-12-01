-- Migration: Add username field and fix wallet trigger
-- Run this in Supabase SQL Editor

-- 1. Add username column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS username VARCHAR(50) UNIQUE;

-- 2. Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- 3. Create index for phone lookups (for phone-based login)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- 4. Drop the problematic wallet trigger if it exists
DROP TRIGGER IF EXISTS create_wallet_on_user_insert ON users;
DROP TRIGGER IF EXISTS trigger_create_wallet_for_user ON users;

-- 5. Drop the old function if it exists (CASCADE to drop dependent triggers)
DROP FUNCTION IF EXISTS create_wallet_for_user() CASCADE;

-- 6. Create a proper RPC function for user creation with wallet
CREATE OR REPLACE FUNCTION create_user_with_wallet(
  p_external_id VARCHAR,
  p_email VARCHAR DEFAULT NULL,
  p_password_hash VARCHAR DEFAULT NULL,
  p_first_name VARCHAR DEFAULT NULL,
  p_last_name VARCHAR DEFAULT NULL,
  p_phone VARCHAR DEFAULT NULL,
  p_username VARCHAR DEFAULT NULL,
  p_roles VARCHAR DEFAULT 'user',
  p_wallet_external_id VARCHAR DEFAULT NULL,
  p_initial_balance DECIMAL DEFAULT 0
) RETURNS jsonb AS $$
DECLARE
  v_user_id UUID;
  v_wallet_id UUID;
  v_result jsonb;
BEGIN
  -- Generate username if not provided
  IF p_username IS NULL OR p_username = '' THEN
    p_username := 'user' || EXTRACT(EPOCH FROM NOW())::TEXT;
  END IF;

  -- Insert user
  INSERT INTO users (
    external_id,
    email,
    password_hash,
    first_name,
    last_name,
    phone,
    username,
    roles,
    status,
    kyc_status,
    kyc_tier,
    email_verified,
    phone_verified,
    created_at,
    updated_at
  ) VALUES (
    p_external_id,
    NULLIF(p_email, ''),
    p_password_hash,
    p_first_name,
    p_last_name,
    p_phone,
    p_username,
    p_roles,
    'ACTIVE',
    'APPROVED',
    1,
    CASE WHEN p_email IS NOT NULL AND p_email != '' THEN TRUE ELSE FALSE END,
    CASE WHEN p_phone IS NOT NULL AND p_phone != '' THEN TRUE ELSE FALSE END,
    NOW(),
    NOW()
  ) RETURNING id INTO v_user_id;

  -- Create wallet
  INSERT INTO wallets (
    external_id,
    user_id,
    wallet_type,
    currency,
    balance,
    status,
    daily_limit,
    monthly_limit,
    created_at,
    updated_at
  ) VALUES (
    COALESCE(p_wallet_external_id, 'wal_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6)),
    v_user_id,
    'primary',
    'USD',
    p_initial_balance,
    'ACTIVE',
    5000,
    50000,
    NOW(),
    NOW()
  ) RETURNING id INTO v_wallet_id;

  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'wallet_id', v_wallet_id,
    'username', p_username
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 7. Create function to search users by username or phone
CREATE OR REPLACE FUNCTION search_users(
  p_query VARCHAR,
  p_limit INT DEFAULT 10
) RETURNS TABLE (
  id UUID,
  first_name VARCHAR,
  last_name VARCHAR,
  username VARCHAR,
  phone VARCHAR,
  email VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.username,
    u.phone,
    u.email
  FROM users u
  WHERE
    u.status = 'ACTIVE'
    AND (
      u.username ILIKE '%' || p_query || '%'
      OR u.phone ILIKE '%' || p_query || '%'
      OR u.first_name ILIKE '%' || p_query || '%'
      OR u.last_name ILIKE '%' || p_query || '%'
      OR CONCAT(u.first_name, ' ', u.last_name) ILIKE '%' || p_query || '%'
    )
  ORDER BY
    CASE
      WHEN u.username = p_query THEN 0
      WHEN u.phone = p_query THEN 1
      WHEN u.username ILIKE p_query || '%' THEN 2
      ELSE 3
    END,
    u.first_name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- 8. Update existing users with auto-generated usernames (if null)
UPDATE users
SET username = LOWER(CONCAT(
  COALESCE(SUBSTR(first_name, 1, 1), ''),
  COALESCE(last_name, ''),
  '_',
  SUBSTR(MD5(id::TEXT), 1, 4)
))
WHERE username IS NULL;

-- 9. Add quick login test users with usernames (run if users don't have usernames)
UPDATE users SET username = 'admin' WHERE email = 'admin@example.com' AND username IS NULL;
UPDATE users SET username = 'johndoe' WHERE email = 'user@example.com' AND username IS NULL;
UPDATE users SET username = 'janesmith' WHERE email = 'user2@example.com' AND username IS NULL;
UPDATE users SET username = 'merchant' WHERE email = 'merchant@example.com' AND username IS NULL;
UPDATE users SET username = 'developer' WHERE email = 'developer@example.com' AND username IS NULL;
UPDATE users SET username = 'agent' WHERE email = 'agent@example.com' AND username IS NULL;

-- Grant permissions
GRANT EXECUTE ON FUNCTION create_user_with_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION create_user_with_wallet TO anon;
GRANT EXECUTE ON FUNCTION search_users TO authenticated;
GRANT EXECUTE ON FUNCTION search_users TO anon;
