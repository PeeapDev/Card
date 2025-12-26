-- Migration: 066_roles_array.sql
-- Description: Convert roles column from VARCHAR to TEXT[] array for multi-role support
-- This enables users to have multiple roles (user + merchant, user + agent, etc.)

-- =====================================================
-- STEP 1: Drop ALL policies that reference users.roles
-- =====================================================

-- Users table
DROP POLICY IF EXISTS "users_select_policy" ON users;

-- API Keys
DROP POLICY IF EXISTS "Admins can manage api_keys" ON api_keys;

-- Webhooks
DROP POLICY IF EXISTS "Admins can manage webhooks" ON webhooks;

-- Module system
DROP POLICY IF EXISTS "Admins can manage module_config" ON module_config;
DROP POLICY IF EXISTS "Admins can manage module_instances" ON module_instances;
DROP POLICY IF EXISTS "Admins can manage module_data" ON module_data;

-- Admin notifications
DROP POLICY IF EXISTS "Admins can view notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON admin_notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON admin_notifications;

-- NFC tags
DROP POLICY IF EXISTS "Admins can view nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Admins can insert nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Admins can update nfc_tags" ON nfc_tags;
DROP POLICY IF EXISTS "Admins can view all nfc_tag_assignments" ON nfc_tag_assignments;
DROP POLICY IF EXISTS "Admins can manage nfc_tag_assignments" ON nfc_tag_assignments;

-- NFC payments
DROP POLICY IF EXISTS "Admins can view all nfc_payments" ON nfc_payments;
DROP POLICY IF EXISTS "Admins can insert nfc_payments" ON nfc_payments;
DROP POLICY IF EXISTS "Admins can update nfc_payments" ON nfc_payments;

-- Platform earnings
DROP POLICY IF EXISTS "Admins can view platform_earnings" ON platform_earnings;

-- System float
DROP POLICY IF EXISTS "Admins can view all float accounts" ON system_float_accounts;
DROP POLICY IF EXISTS "Superadmins can insert float accounts" ON system_float_accounts;
DROP POLICY IF EXISTS "Superadmins can update float accounts" ON system_float_accounts;
DROP POLICY IF EXISTS "Admins can view all float transactions" ON system_float_transactions;

-- Checkout sessions
DROP POLICY IF EXISTS "Admin full access to checkout_sessions" ON checkout_sessions;

-- Page views
DROP POLICY IF EXISTS "Admins can view all page_views" ON page_views;

-- Bank accounts
DROP POLICY IF EXISTS "admins_view_all_bank_accounts" ON user_bank_accounts;

-- KYC applications
DROP POLICY IF EXISTS "admins_manage_kyc" ON kyc_applications;

-- Custom modules storage
DROP POLICY IF EXISTS "admins_manage_module_code" ON storage.objects;
DROP POLICY IF EXISTS "admins_delete_module_code" ON storage.objects;

-- =====================================================
-- STEP 2: Alter the column type
-- =====================================================

-- Drop the existing default (required before type change)
ALTER TABLE users
ALTER COLUMN roles DROP DEFAULT;

-- Convert roles column from VARCHAR to TEXT[] array
ALTER TABLE users
ALTER COLUMN roles TYPE text[]
USING CASE
  WHEN roles IS NULL THEN ARRAY['user']::text[]
  WHEN roles = '' THEN ARRAY['user']::text[]
  ELSE ARRAY[roles]::text[]
END;

-- Set new default for new users
ALTER TABLE users
ALTER COLUMN roles SET DEFAULT ARRAY['user']::text[];

-- =====================================================
-- STEP 3: Recreate all policies with array syntax
-- =====================================================

-- Helper function to check admin role with array
CREATE OR REPLACE FUNCTION is_admin_user(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND ('admin' = ANY(roles) OR 'superadmin' = ANY(roles))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Users table policy
CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        id = auth.uid()
        OR user_role_level(auth.uid()) >= 80
        OR (status = 'ACTIVE' AND 'user' = ANY(roles))
    );

-- API Keys (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'api_keys') THEN
    EXECUTE 'CREATE POLICY "Admins can manage api_keys" ON api_keys
      FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Webhooks (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'webhooks') THEN
    EXECUTE 'CREATE POLICY "Admins can manage webhooks" ON webhooks
      FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Module config (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_config') THEN
    EXECUTE 'CREATE POLICY "Admins can manage module_config" ON module_config
      FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Module instances (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_instances') THEN
    EXECUTE 'CREATE POLICY "Admins can manage module_instances" ON module_instances
      FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Module data (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_data') THEN
    EXECUTE 'CREATE POLICY "Admins can manage module_data" ON module_data
      FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Admin notifications (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'admin_notifications') THEN
    EXECUTE 'CREATE POLICY "Admins can view notifications" ON admin_notifications
      FOR SELECT USING (is_admin_user(auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can insert notifications" ON admin_notifications
      FOR INSERT WITH CHECK (is_admin_user(auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can update notifications" ON admin_notifications
      FOR UPDATE USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- NFC tags (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_tags') THEN
    EXECUTE 'CREATE POLICY "Admins can view nfc_tags" ON nfc_tags
      FOR SELECT USING (is_admin_user(auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can insert nfc_tags" ON nfc_tags
      FOR INSERT WITH CHECK (is_admin_user(auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can update nfc_tags" ON nfc_tags
      FOR UPDATE USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- NFC tag assignments (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_tag_assignments') THEN
    EXECUTE 'CREATE POLICY "Admins can view all nfc_tag_assignments" ON nfc_tag_assignments
      FOR SELECT USING (is_admin_user(auth.uid()) OR user_id = auth.uid())';
    EXECUTE 'CREATE POLICY "Admins can manage nfc_tag_assignments" ON nfc_tag_assignments
      FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- NFC payments (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_payments') THEN
    EXECUTE 'CREATE POLICY "Admins can view all nfc_payments" ON nfc_payments
      FOR SELECT USING (is_admin_user(auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can insert nfc_payments" ON nfc_payments
      FOR INSERT WITH CHECK (is_admin_user(auth.uid()))';
    EXECUTE 'CREATE POLICY "Admins can update nfc_payments" ON nfc_payments
      FOR UPDATE USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Platform earnings (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'platform_earnings') THEN
    EXECUTE 'CREATE POLICY "Admins can view platform_earnings" ON platform_earnings
      FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- System float accounts (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_float_accounts') THEN
    EXECUTE 'CREATE POLICY "Admins can view all float accounts" ON system_float_accounts
      FOR SELECT USING (is_admin_user(auth.uid()))';
    EXECUTE 'CREATE POLICY "Superadmins can insert float accounts" ON system_float_accounts
      FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND ''superadmin'' = ANY(roles)))';
    EXECUTE 'CREATE POLICY "Superadmins can update float accounts" ON system_float_accounts
      FOR UPDATE USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND ''superadmin'' = ANY(roles)))';
  END IF;
END $$;

-- System float transactions (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_float_transactions') THEN
    EXECUTE 'CREATE POLICY "Admins can view all float transactions" ON system_float_transactions
      FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Checkout sessions (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'checkout_sessions') THEN
    EXECUTE 'CREATE POLICY "Admin full access to checkout_sessions" ON checkout_sessions
      FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Page views (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'page_views') THEN
    EXECUTE 'CREATE POLICY "Admins can view all page_views" ON page_views
      FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- Bank accounts admin policy (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_bank_accounts') THEN
    EXECUTE 'CREATE POLICY "admins_view_all_bank_accounts" ON user_bank_accounts
      FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- KYC applications (if table exists)
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'kyc_applications') THEN
    EXECUTE 'CREATE POLICY "admins_manage_kyc" ON kyc_applications
      FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Create indexes and helper functions
-- =====================================================

-- Create GIN index for array queries
CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);

-- Create helper function to check if user has a role
CREATE OR REPLACE FUNCTION user_has_role(user_roles text[], check_role text)
RETURNS boolean AS $$
BEGIN
  RETURN check_role = ANY(user_roles);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create helper function to add a role to user
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

-- Create helper function to remove a role from user
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
