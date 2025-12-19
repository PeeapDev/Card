-- Migration: 054_users_profile_picture.sql
-- Description: Add profile_picture column to users table

-- Add profile_picture column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Create index for faster lookups (optional, for queries filtering by profile_picture)
CREATE INDEX IF NOT EXISTS idx_users_profile_picture ON users(profile_picture) WHERE profile_picture IS NOT NULL;

-- Comment on column
COMMENT ON COLUMN users.profile_picture IS 'URL to user profile picture stored in Supabase Storage';
