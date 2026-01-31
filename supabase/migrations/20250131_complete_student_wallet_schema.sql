-- COMPLETE SCHEMA FIX FOR STUDENT WALLET SYSTEM
-- Run this ENTIRE script in Supabase SQL Editor

-- ============================================
-- 1. USERS TABLE - All missing columns
-- ============================================
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50) DEFAULT 'personal';
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE users ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin VARCHAR(10);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS wallet_pin_locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;

-- Handle roles column - might be text or text[]
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'roles') THEN
        ALTER TABLE users ADD COLUMN roles TEXT[] DEFAULT ARRAY['user']::TEXT[];
    END IF;
END $$;

-- ============================================
-- 2. WALLETS TABLE - All missing columns
-- ============================================
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS external_id VARCHAR(255);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'SLE';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_balance DECIMAL(15,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(50) DEFAULT 'personal';
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS daily_limit DECIMAL(15,2) DEFAULT 50000;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS monthly_limit DECIMAL(15,2) DEFAULT 500000;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'ACTIVE';

-- ============================================
-- 3. STUDENT_WALLET_LINKS TABLE - Create if not exists, add all columns
-- ============================================
CREATE TABLE IF NOT EXISTS student_wallet_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nsi VARCHAR(100),
    index_number VARCHAR(100),
    peeap_user_id UUID,
    peeap_wallet_id UUID,
    school_id INTEGER,
    current_school_id VARCHAR(100),
    student_name VARCHAR(255),
    student_phone VARCHAR(50),
    student_email VARCHAR(255),
    class_name VARCHAR(100),
    section VARCHAR(50),
    daily_limit DECIMAL(15,2) DEFAULT 50000,
    monthly_limit DECIMAL(15,2) DEFAULT 500000,
    is_active BOOLEAN DEFAULT true,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    linked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns if table already exists but missing columns
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS nsi VARCHAR(100);
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS index_number VARCHAR(100);
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS peeap_user_id UUID;
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS peeap_wallet_id UUID;
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS school_id INTEGER;
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS current_school_id VARCHAR(100);
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS student_name VARCHAR(255);
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS student_phone VARCHAR(50);
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS student_email VARCHAR(255);
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS class_name VARCHAR(100);
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS section VARCHAR(50);
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS daily_limit DECIMAL(15,2) DEFAULT 50000;
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS monthly_limit DECIMAL(15,2) DEFAULT 500000;
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE student_wallet_links ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 4. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_users_account_type ON users(account_type);
CREATE INDEX IF NOT EXISTS idx_users_external_id ON users(external_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_external_id ON wallets(external_id);
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_student_wallet_links_nsi ON student_wallet_links(nsi);
CREATE INDEX IF NOT EXISTS idx_student_wallet_links_peeap_user ON student_wallet_links(peeap_user_id);
CREATE INDEX IF NOT EXISTS idx_student_wallet_links_school ON student_wallet_links(school_id);
CREATE INDEX IF NOT EXISTS idx_student_wallet_links_active ON student_wallet_links(is_active);

-- ============================================
-- 5. REFRESH SCHEMA CACHE (CRITICAL!)
-- ============================================
NOTIFY pgrst, 'reload schema';

-- Done! All tables should now have all required columns.
