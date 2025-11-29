-- Database Seed Script for PaymentSystem
--
-- Run with: docker exec -i payment-system-db psql -U payment_admin -d payment_system < scripts/seed.sql
-- Or: psql -U payment_admin -d payment_system -f scripts/seed.sql
--
-- Test Credentials:
--   Email: test@example.com
--   Password: Test123!@#
--
-- Password hash generated with bcrypt (12 rounds)

-- Create enum types if they don't exist
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'LOCKED', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE kyc_status AS ENUM ('NOT_STARTED', 'PENDING', 'APPROVED', 'REJECTED', 'EXPIRED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create users table if not exists
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    status user_status DEFAULT 'PENDING_VERIFICATION',
    kyc_status kyc_status DEFAULT 'NOT_STARTED',
    email_verified BOOLEAN DEFAULT false,
    phone_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMPTZ,
    phone_verified_at TIMESTAMPTZ,
    email_verification_code VARCHAR(10),
    email_verification_expires_at TIMESTAMPTZ,
    phone_verification_code VARCHAR(10),
    phone_verification_expires_at TIMESTAMPTZ,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(255),
    roles TEXT,
    metadata JSONB,
    last_login_at TIMESTAMPTZ,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    suspended_at TIMESTAMPTZ,
    suspended_reason VARCHAR(500),
    kyc_tier INTEGER DEFAULT 0,
    kyc_approved_at TIMESTAMPTZ,
    date_of_birth DATE,
    address JSONB,
    password_changed_at TIMESTAMPTZ,
    verification_token VARCHAR(255),
    verification_token_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Insert test user (password: Test123!@#)
-- bcrypt hash with 12 rounds
INSERT INTO users (
    external_id,
    email,
    password_hash,
    first_name,
    last_name,
    status,
    kyc_status,
    email_verified,
    roles,
    kyc_tier,
    created_at,
    updated_at
) VALUES (
    'usr_test_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'test@example.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4a.W/YwU4Y.XKXii', -- Test123!@#
    'Test',
    'User',
    'ACTIVE',
    'APPROVED',
    true,
    'user',
    1,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert admin user (password: Admin123!@#)
INSERT INTO users (
    external_id,
    email,
    password_hash,
    first_name,
    last_name,
    status,
    kyc_status,
    email_verified,
    roles,
    kyc_tier,
    created_at,
    updated_at
) VALUES (
    'usr_admin_' || EXTRACT(EPOCH FROM NOW())::TEXT,
    'admin@example.com',
    '$2b$12$8K1p/a0dL1LXMIz.WxXRq.qlBjfKRzPQ7Fd2XjHFVLmQOXVCZgXmG', -- Admin123!@#
    'Admin',
    'User',
    'ACTIVE',
    'APPROVED',
    true,
    'admin,user',
    2,
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Output confirmation
SELECT
    'Seeded users:' as message;

SELECT
    email,
    first_name || ' ' || last_name as name,
    status,
    kyc_status
FROM users
WHERE email IN ('test@example.com', 'admin@example.com');
