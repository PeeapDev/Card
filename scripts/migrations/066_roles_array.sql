-- Migration: 066_roles_array.sql
-- Description: Convert roles column from VARCHAR to TEXT[] array for multi-role support

-- =====================================================
-- STEP 1: Drop ALL policies that reference users.roles
-- =====================================================

DROP POLICY IF EXISTS "users_select_policy" ON users;

DO $$
BEGIN
  -- API system
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'api_keys') THEN
    DROP POLICY IF EXISTS "Admins can manage api_keys" ON api_keys;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'api_requests') THEN
    DROP POLICY IF EXISTS "Admins can view api_requests" ON api_requests;
  END IF;

  -- Webhooks
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'webhooks') THEN
    DROP POLICY IF EXISTS "Admins can manage webhooks" ON webhooks;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'webhook_deliveries') THEN
    DROP POLICY IF EXISTS "Admins can view webhook_deliveries" ON webhook_deliveries;
  END IF;

  -- Module system
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_config') THEN
    DROP POLICY IF EXISTS "Admins can manage module_config" ON module_config;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_instances') THEN
    DROP POLICY IF EXISTS "Admins can manage module_instances" ON module_instances;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_data') THEN
    DROP POLICY IF EXISTS "Admins can manage module_data" ON module_data;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_events') THEN
    DROP POLICY IF EXISTS "Admins can view module_events" ON module_events;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_packages') THEN
    DROP POLICY IF EXISTS "Admins can manage module_packages" ON module_packages;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'module_files') THEN
    DROP POLICY IF EXISTS "Admins can manage module_files" ON module_files;
  END IF;

  -- Admin notifications
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'admin_notifications') THEN
    DROP POLICY IF EXISTS "Admins can view notifications" ON admin_notifications;
    DROP POLICY IF EXISTS "Admins can insert notifications" ON admin_notifications;
    DROP POLICY IF EXISTS "Admins can update notifications" ON admin_notifications;
    DROP POLICY IF EXISTS "Admins view all notifications" ON admin_notifications;
    DROP POLICY IF EXISTS "Admins update notifications" ON admin_notifications;
    DROP POLICY IF EXISTS "Admins can view all notifications" ON admin_notifications;
  END IF;

  -- NFC system
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_tags') THEN
    DROP POLICY IF EXISTS "Admins can view nfc_tags" ON nfc_tags;
    DROP POLICY IF EXISTS "Admins can insert nfc_tags" ON nfc_tags;
    DROP POLICY IF EXISTS "Admins can update nfc_tags" ON nfc_tags;
    DROP POLICY IF EXISTS "Admins view all nfc_tags" ON nfc_tags;
    DROP POLICY IF EXISTS "Admins update nfc_tags" ON nfc_tags;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_tag_assignments') THEN
    DROP POLICY IF EXISTS "Admins can view all nfc_tag_assignments" ON nfc_tag_assignments;
    DROP POLICY IF EXISTS "Admins can manage nfc_tag_assignments" ON nfc_tag_assignments;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_payments') THEN
    DROP POLICY IF EXISTS "Admins can view all nfc_payments" ON nfc_payments;
    DROP POLICY IF EXISTS "Admins can insert nfc_payments" ON nfc_payments;
    DROP POLICY IF EXISTS "Admins can update nfc_payments" ON nfc_payments;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_payment_links') THEN
    DROP POLICY IF EXISTS "Admins view all payment links" ON nfc_payment_links;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_payment_audit') THEN
    DROP POLICY IF EXISTS "Admins view all audit logs" ON nfc_payment_audit;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_fraud_alerts') THEN
    DROP POLICY IF EXISTS "Admins view fraud alerts" ON nfc_fraud_alerts;
  END IF;

  -- Platform earnings
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'platform_earnings') THEN
    DROP POLICY IF EXISTS "Admins can view platform_earnings" ON platform_earnings;
  END IF;

  -- System float
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_float') THEN
    DROP POLICY IF EXISTS "system_float_select" ON system_float;
    DROP POLICY IF EXISTS "system_float_insert" ON system_float;
    DROP POLICY IF EXISTS "system_float_update" ON system_float;
    DROP POLICY IF EXISTS "system_float_delete" ON system_float;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_float_accounts') THEN
    DROP POLICY IF EXISTS "Admins can view all float accounts" ON system_float_accounts;
    DROP POLICY IF EXISTS "Superadmins can insert float accounts" ON system_float_accounts;
    DROP POLICY IF EXISTS "Superadmins can update float accounts" ON system_float_accounts;
    DROP POLICY IF EXISTS "Allow admin write system_float" ON system_float_accounts;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_float_transactions') THEN
    DROP POLICY IF EXISTS "Admins can view all float transactions" ON system_float_transactions;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'system_float_history') THEN
    DROP POLICY IF EXISTS "Allow admin write system_float_history" ON system_float_history;
    DROP POLICY IF EXISTS "float_history_select" ON system_float_history;
    DROP POLICY IF EXISTS "float_history_insert" ON system_float_history;
    DROP POLICY IF EXISTS "float_history_update" ON system_float_history;
    DROP POLICY IF EXISTS "float_history_delete" ON system_float_history;
  END IF;

  -- Mobile money float
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'mobile_money_float') THEN
    DROP POLICY IF EXISTS "superadmin_view_float" ON mobile_money_float;
    DROP POLICY IF EXISTS "superadmin_manage_float" ON mobile_money_float;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'mobile_money_float_history') THEN
    DROP POLICY IF EXISTS "superadmin_view_float_history" ON mobile_money_float_history;
  END IF;

  -- Checkout sessions
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'checkout_sessions') THEN
    DROP POLICY IF EXISTS "Admin full access to checkout_sessions" ON checkout_sessions;
    DROP POLICY IF EXISTS "Admins can view all checkout sessions" ON checkout_sessions;
  END IF;

  -- Page views
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'page_views') THEN
    DROP POLICY IF EXISTS "Admins can view all page_views" ON page_views;
    DROP POLICY IF EXISTS "Allow admin read page views" ON page_views;
  END IF;

  -- Bank accounts
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_bank_accounts') THEN
    DROP POLICY IF EXISTS "admins_view_all_bank_accounts" ON user_bank_accounts;
  END IF;

  -- Payment preferences
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_payment_preferences') THEN
    DROP POLICY IF EXISTS "admin_view_all_payment_prefs" ON user_payment_preferences;
  END IF;

  -- KYC applications
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'kyc_applications') THEN
    DROP POLICY IF EXISTS "admins_manage_kyc" ON kyc_applications;
    DROP POLICY IF EXISTS "kyc_applications_admin_all" ON kyc_applications;
    DROP POLICY IF EXISTS "kyc_applications_select" ON kyc_applications;
    DROP POLICY IF EXISTS "kyc_applications_insert" ON kyc_applications;
    DROP POLICY IF EXISTS "kyc_applications_update" ON kyc_applications;
  END IF;

  -- Card management
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'card_types') THEN
    DROP POLICY IF EXISTS "card_types_admin_policy" ON card_types;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'card_orders') THEN
    DROP POLICY IF EXISTS "card_orders_admin_update_policy" ON card_orders;
  END IF;

  -- Pots
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'pots') THEN
    DROP POLICY IF EXISTS "pots_delete_admin" ON pots;
  END IF;

  -- Business categories
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'business_categories') THEN
    DROP POLICY IF EXISTS "Admins can manage business categories" ON business_categories;
    DROP POLICY IF EXISTS "Admins can insert business categories" ON business_categories;
    DROP POLICY IF EXISTS "Admins can update business categories" ON business_categories;
    DROP POLICY IF EXISTS "Admins can delete business categories" ON business_categories;
  END IF;

  -- Businesses
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'businesses') THEN
    DROP POLICY IF EXISTS "Admins can delete businesses" ON businesses;
  END IF;

  -- Subscriptions
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'merchant_subscriptions') THEN
    DROP POLICY IF EXISTS "Admins can view all subscriptions" ON merchant_subscriptions;
    DROP POLICY IF EXISTS "Admins can manage all subscriptions" ON merchant_subscriptions;
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'subscription_invoices') THEN
    DROP POLICY IF EXISTS "Admins can manage all invoices" ON subscription_invoices;
  END IF;

END $$;

-- =====================================================
-- STEP 2: Alter the column type
-- =====================================================

ALTER TABLE users ALTER COLUMN roles DROP DEFAULT;

ALTER TABLE users
ALTER COLUMN roles TYPE text[]
USING CASE
  WHEN roles IS NULL THEN ARRAY['user']::text[]
  WHEN roles = '' THEN ARRAY['user']::text[]
  ELSE ARRAY[roles]::text[]
END;

ALTER TABLE users ALTER COLUMN roles SET DEFAULT ARRAY['user']::text[];

-- =====================================================
-- STEP 3: Create helper function and recreate policies
-- =====================================================

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

CREATE POLICY "users_select_policy" ON users
    FOR SELECT USING (
        id = auth.uid()
        OR user_role_level(auth.uid()) >= 80
        OR (status = 'ACTIVE' AND 'user' = ANY(roles))
    );

-- Recreate admin policies using helper function
DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'api_keys') THEN
    EXECUTE 'CREATE POLICY "Admins can manage api_keys" ON api_keys FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'api_requests') THEN
    EXECUTE 'CREATE POLICY "Admins can view api_requests" ON api_requests FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'webhooks') THEN
    EXECUTE 'CREATE POLICY "Admins can manage webhooks" ON webhooks FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'webhook_deliveries') THEN
    EXECUTE 'CREATE POLICY "Admins can view webhook_deliveries" ON webhook_deliveries FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'admin_notifications') THEN
    EXECUTE 'CREATE POLICY "Admins can view notifications" ON admin_notifications FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'nfc_tags') THEN
    EXECUTE 'CREATE POLICY "Admins can view nfc_tags" ON nfc_tags FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'platform_earnings') THEN
    EXECUTE 'CREATE POLICY "Admins can view platform_earnings" ON platform_earnings FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'checkout_sessions') THEN
    EXECUTE 'CREATE POLICY "Admins can view all checkout sessions" ON checkout_sessions FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'page_views') THEN
    EXECUTE 'CREATE POLICY "Admins can view all page_views" ON page_views FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'user_bank_accounts') THEN
    EXECUTE 'CREATE POLICY "admins_view_all_bank_accounts" ON user_bank_accounts FOR SELECT USING (is_admin_user(auth.uid()))';
  END IF;
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'kyc_applications') THEN
    EXECUTE 'CREATE POLICY "admins_manage_kyc" ON kyc_applications FOR ALL USING (is_admin_user(auth.uid()))';
  END IF;
END $$;

-- =====================================================
-- STEP 4: Create indexes and helper functions
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_users_roles ON users USING GIN (roles);

CREATE OR REPLACE FUNCTION user_has_role(user_roles text[], check_role text)
RETURNS boolean AS $$
BEGIN
  RETURN check_role = ANY(user_roles);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

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

CREATE OR REPLACE FUNCTION remove_user_role(user_id_param uuid, role_to_remove text)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET roles = array_remove(roles, role_to_remove),
      updated_at = CURRENT_TIMESTAMP
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
