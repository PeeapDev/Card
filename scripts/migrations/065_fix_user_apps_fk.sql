-- Migration: 065_fix_user_apps_fk.sql
-- Description: Fix foreign key constraint to reference public.users instead of auth.users
-- This fixes the "Key (user_id)=xxx is not present in table users" error

-- Step 1: Drop the existing foreign key constraint
ALTER TABLE user_apps_settings
DROP CONSTRAINT IF EXISTS user_apps_settings_user_id_fkey;

-- Step 2: Re-add the foreign key constraint explicitly referencing public.users
ALTER TABLE user_apps_settings
ADD CONSTRAINT user_apps_settings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Make sure RLS is disabled (we use service_role key)
ALTER TABLE user_apps_settings DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT ALL ON user_apps_settings TO authenticated;
GRANT ALL ON user_apps_settings TO service_role;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
