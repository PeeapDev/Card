-- ============================================
-- Create Default Superadmin Account
-- Run this in Supabase SQL Editor
-- ============================================
--
-- CREDENTIALS AFTER RUNNING:
--
-- SUPERADMIN:
--   Email: superadmin@cardpay.com
--   Password: SuperAdmin@123!
--
-- ADMIN:
--   Email: admin@cardpay.com
--   Password: Admin@123!
--
-- ============================================

-- 1. Insert default superadmin user
INSERT INTO users (
    external_id,
    email,
    phone,
    password_hash,
    first_name,
    last_name,
    status,
    kyc_status,
    kyc_tier,
    email_verified,
    roles
)
VALUES (
    'usr_superadmin_001',
    'superadmin@cardpay.com',
    '+23299000001',
    'SuperAdmin@123!',
    'Super',
    'Admin',
    'ACTIVE',
    'APPROVED',
    3,
    true,
    'superadmin,admin'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = 'SuperAdmin@123!',
    roles = 'superadmin,admin',
    status = 'ACTIVE';

-- 2. Insert default admin user
INSERT INTO users (
    external_id,
    email,
    phone,
    password_hash,
    first_name,
    last_name,
    status,
    kyc_status,
    kyc_tier,
    email_verified,
    roles
)
VALUES (
    'usr_admin_001',
    'admin@cardpay.com',
    '+23299000002',
    'Admin@123!',
    'System',
    'Admin',
    'ACTIVE',
    'APPROVED',
    3,
    true,
    'admin'
)
ON CONFLICT (email) DO UPDATE SET
    password_hash = 'Admin@123!',
    roles = 'admin',
    status = 'ACTIVE';

-- 3. Create wallets for both users
INSERT INTO wallets (external_id, user_id, currency, balance, status, daily_limit, monthly_limit)
SELECT 'wal_superadmin_' || EXTRACT(EPOCH FROM NOW())::TEXT, id, 'SLE', 100000.00, 'ACTIVE', 50000, 500000
FROM users WHERE email = 'superadmin@cardpay.com'
AND NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = (SELECT id FROM users WHERE email = 'superadmin@cardpay.com'));

INSERT INTO wallets (external_id, user_id, currency, balance, status, daily_limit, monthly_limit)
SELECT 'wal_admin_' || EXTRACT(EPOCH FROM NOW())::TEXT, id, 'SLE', 50000.00, 'ACTIVE', 25000, 250000
FROM users WHERE email = 'admin@cardpay.com'
AND NOT EXISTS (SELECT 1 FROM wallets WHERE user_id = (SELECT id FROM users WHERE email = 'admin@cardpay.com'));

-- Verify the users were created
SELECT id, email, first_name, last_name, roles, status FROM users WHERE email IN ('superadmin@cardpay.com', 'admin@cardpay.com');
