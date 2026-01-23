-- =============================================
-- COMBINED SCHOOL INTEGRATION MIGRATIONS
-- Run this entire file in Supabase SQL Editor
-- https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql
-- =============================================

-- =============================================
-- MIGRATION 1: Update OAuth redirect URIs
-- =============================================
UPDATE oauth_clients
SET redirect_uris = ARRAY[
    'https://school.peeap.com/auth/callback',
    'https://*.gov.school.edu.sl/peeap/callback',
    'https://*.gov.school.edu.sl/peeap/student-callback',
    'https://*.gov.school.edu.sl/peeap-settings/callback',
    'https://*.gov.school.edu.sl/peeap-settings/student-callback',
    'http://localhost:8000/peeap/callback',
    'http://localhost:8000/peeap-settings/callback',
    'http://localhost:5173/auth/callback'
]
WHERE client_id = 'school_saas';

-- =============================================
-- MIGRATION 2: Student Wallets Table
-- =============================================
CREATE TABLE IF NOT EXISTS student_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    index_number VARCHAR(50) NOT NULL UNIQUE,
    peeap_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    student_phone VARCHAR(20),
    student_email VARCHAR(255),
    class_name VARCHAR(100),
    section VARCHAR(50),
    school_id INTEGER NOT NULL,
    peeap_school_id VARCHAR(50),
    daily_limit DECIMAL(15,2) DEFAULT 50000,
    daily_spent DECIMAL(15,2) DEFAULT 0,
    daily_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    pin_hash VARCHAR(255) NOT NULL,
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TIMESTAMP WITH TIME ZONE,
    parent_phone VARCHAR(20),
    parent_email VARCHAR(255),
    parent_user_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_transaction_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_student_wallets_index ON student_wallets(index_number);
CREATE INDEX IF NOT EXISTS idx_student_wallets_user ON student_wallets(peeap_user_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_wallet ON student_wallets(wallet_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_school ON student_wallets(school_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_peeap_school ON student_wallets(peeap_school_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_status ON student_wallets(status) WHERE status = 'active';

ALTER TABLE student_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select student_wallets" ON student_wallets;
CREATE POLICY "Allow select student_wallets" ON student_wallets FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert student_wallets" ON student_wallets;
CREATE POLICY "Allow insert student_wallets" ON student_wallets FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update student_wallets" ON student_wallets;
CREATE POLICY "Allow update student_wallets" ON student_wallets FOR UPDATE USING (true);

-- =============================================
-- MIGRATION 3: School Vendors Table
-- =============================================
CREATE TABLE IF NOT EXISTS school_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id INTEGER NOT NULL,
    peeap_school_id VARCHAR(50),
    vendor_id VARCHAR(50) NOT NULL UNIQUE,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_type VARCHAR(50) DEFAULT 'canteen',
    peeap_user_id UUID REFERENCES users(id),
    peeap_wallet_id UUID REFERENCES wallets(id),
    is_active BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_vendors_school ON school_vendors(school_id);
CREATE INDEX IF NOT EXISTS idx_school_vendors_vendor ON school_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_school_vendors_active ON school_vendors(is_active) WHERE is_active = true;

ALTER TABLE school_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_vendors" ON school_vendors;
CREATE POLICY "Allow all school_vendors" ON school_vendors FOR ALL USING (true);

-- =============================================
-- MIGRATION 4: School Products Table
-- =============================================
CREATE TABLE IF NOT EXISTS school_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id VARCHAR(50) NOT NULL REFERENCES school_vendors(vendor_id) ON DELETE CASCADE,
    sku VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',
    category VARCHAR(100),
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    max_per_day INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_products_vendor ON school_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_school_products_available ON school_products(is_available) WHERE is_available = true;

ALTER TABLE school_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_products" ON school_products;
CREATE POLICY "Allow all school_products" ON school_products FOR ALL USING (true);

-- =============================================
-- MIGRATION 5: School Transactions Table
-- =============================================
CREATE TABLE IF NOT EXISTS school_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(50) NOT NULL UNIQUE,
    session_id VARCHAR(50),
    school_id INTEGER NOT NULL,
    peeap_school_id VARCHAR(50),
    student_wallet_id UUID REFERENCES student_wallets(id),
    index_number VARCHAR(50),
    payer_wallet_id UUID REFERENCES wallets(id),
    vendor_id VARCHAR(50),
    vendor_name VARCHAR(255),
    vendor_wallet_id UUID REFERENCES wallets(id),
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),
    type VARCHAR(50) DEFAULT 'payment',
    status VARCHAR(20) DEFAULT 'pending',
    items JSONB,
    receipt_number VARCHAR(50),
    receipt_url TEXT,
    description TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_transactions_id ON school_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_school_transactions_school ON school_transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_school_transactions_student ON school_transactions(index_number);
CREATE INDEX IF NOT EXISTS idx_school_transactions_vendor ON school_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_school_transactions_status ON school_transactions(status);
CREATE INDEX IF NOT EXISTS idx_school_transactions_created ON school_transactions(created_at DESC);

ALTER TABLE school_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_transactions" ON school_transactions;
CREATE POLICY "Allow all school_transactions" ON school_transactions FOR ALL USING (true);

-- =============================================
-- MIGRATION 6: Quick Access Tokens Table
-- =============================================
CREATE TABLE IF NOT EXISTS quick_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    school_id INTEGER,
    peeap_school_id VARCHAR(50),
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,
    source_system VARCHAR(100),
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_quick_access_tokens_user ON quick_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_access_tokens_hash ON quick_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_quick_access_tokens_valid ON quick_access_tokens(expires_at) WHERE is_revoked = false;

ALTER TABLE quick_access_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all quick_access_tokens" ON quick_access_tokens;
CREATE POLICY "Allow all quick_access_tokens" ON quick_access_tokens FOR ALL USING (true);

-- =============================================
-- MIGRATION 7: Helper Functions
-- =============================================

-- Function to reset daily spending limit
CREATE OR REPLACE FUNCTION reset_student_daily_spending()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.daily_reset_at::date < CURRENT_DATE THEN
        NEW.daily_spent := 0;
        NEW.daily_reset_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS student_wallets_reset_daily ON student_wallets;
CREATE TRIGGER student_wallets_reset_daily
    BEFORE UPDATE ON student_wallets
    FOR EACH ROW
    EXECUTE FUNCTION reset_student_daily_spending();

-- =============================================
-- Done!
-- =============================================
DO $$
BEGIN
    RAISE NOTICE '✅ All school integration migrations completed successfully!';
    RAISE NOTICE 'Tables created: student_wallets, school_vendors, school_products, school_transactions, quick_access_tokens';
END $$;
