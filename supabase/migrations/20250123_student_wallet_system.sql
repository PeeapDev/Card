-- =============================================
-- Student Wallet System for School Integration
-- Migration for Flow 3: Student wallet creation with index number
-- =============================================

-- =============================================
-- 1. Create student_wallets table
-- Links index numbers to Peeap wallets
-- =============================================
CREATE TABLE IF NOT EXISTS student_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Student identification
    index_number VARCHAR(50) NOT NULL UNIQUE, -- Primary identifier (e.g., SL-2025-02-00368)
    peeap_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,

    -- Student info
    student_name VARCHAR(255) NOT NULL,
    student_phone VARCHAR(20),
    student_email VARCHAR(255),
    class_name VARCHAR(100),
    section VARCHAR(50),

    -- School info
    school_id INTEGER NOT NULL,
    peeap_school_id VARCHAR(50), -- Reference to school_connections.peeap_school_id

    -- Wallet settings
    daily_limit DECIMAL(15,2) DEFAULT 50000,
    daily_spent DECIMAL(15,2) DEFAULT 0,
    daily_reset_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- PIN (hashed)
    pin_hash VARCHAR(255) NOT NULL,
    pin_attempts INTEGER DEFAULT 0,
    pin_locked_until TIMESTAMP WITH TIME ZONE,

    -- Parent/Guardian info
    parent_phone VARCHAR(20),
    parent_email VARCHAR(255),
    parent_user_id UUID REFERENCES users(id), -- If parent has Peeap account

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, suspended, locked, graduated

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_transaction_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_wallets_index ON student_wallets(index_number);
CREATE INDEX IF NOT EXISTS idx_student_wallets_user ON student_wallets(peeap_user_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_wallet ON student_wallets(wallet_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_school ON student_wallets(school_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_peeap_school ON student_wallets(peeap_school_id);
CREATE INDEX IF NOT EXISTS idx_student_wallets_status ON student_wallets(status) WHERE status = 'active';

-- RLS
ALTER TABLE student_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select student_wallets" ON student_wallets;
CREATE POLICY "Allow select student_wallets" ON student_wallets
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert student_wallets" ON student_wallets;
CREATE POLICY "Allow insert student_wallets" ON student_wallets
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update student_wallets" ON student_wallets;
CREATE POLICY "Allow update student_wallets" ON student_wallets
    FOR UPDATE USING (true);

-- =============================================
-- 2. Create school_vendors table
-- Stores vendors authorized for each school
-- =============================================
CREATE TABLE IF NOT EXISTS school_vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id INTEGER NOT NULL,
    peeap_school_id VARCHAR(50),

    -- Vendor info
    vendor_id VARCHAR(50) NOT NULL UNIQUE,
    vendor_name VARCHAR(255) NOT NULL,
    vendor_type VARCHAR(50) DEFAULT 'canteen', -- canteen, bookshop, uniform, transport

    -- Peeap account (if vendor has one)
    peeap_user_id UUID REFERENCES users(id),
    peeap_wallet_id UUID REFERENCES wallets(id),

    -- Settings
    is_active BOOLEAN DEFAULT true,
    commission_rate DECIMAL(5,2) DEFAULT 0, -- % fee for vendor

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_vendors_school ON school_vendors(school_id);
CREATE INDEX IF NOT EXISTS idx_school_vendors_vendor ON school_vendors(vendor_id);
CREATE INDEX IF NOT EXISTS idx_school_vendors_active ON school_vendors(is_active) WHERE is_active = true;

-- RLS
ALTER TABLE school_vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_vendors" ON school_vendors;
CREATE POLICY "Allow all school_vendors" ON school_vendors
    FOR ALL USING (true);

-- =============================================
-- 3. Create school_products table
-- Products available from vendors
-- =============================================
CREATE TABLE IF NOT EXISTS school_products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id VARCHAR(50) NOT NULL REFERENCES school_vendors(vendor_id) ON DELETE CASCADE,

    -- Product info
    sku VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',
    category VARCHAR(100),
    image_url TEXT,

    -- Availability
    is_available BOOLEAN DEFAULT true,
    max_per_day INTEGER, -- Optional daily limit

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_products_vendor ON school_products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_school_products_available ON school_products(is_available) WHERE is_available = true;

-- RLS
ALTER TABLE school_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_products" ON school_products;
CREATE POLICY "Allow all school_products" ON school_products
    FOR ALL USING (true);

-- =============================================
-- 4. Create school_transactions table
-- Tracks all school-related transactions
-- =============================================
CREATE TABLE IF NOT EXISTS school_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction identification
    transaction_id VARCHAR(50) NOT NULL UNIQUE,
    session_id VARCHAR(50),

    -- School context
    school_id INTEGER NOT NULL,
    peeap_school_id VARCHAR(50),

    -- Payer (student)
    student_wallet_id UUID REFERENCES student_wallets(id),
    index_number VARCHAR(50),
    payer_wallet_id UUID REFERENCES wallets(id),

    -- Recipient (vendor)
    vendor_id VARCHAR(50),
    vendor_name VARCHAR(255),
    vendor_wallet_id UUID REFERENCES wallets(id),

    -- Amount
    amount DECIMAL(15,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',

    -- Balance changes
    balance_before DECIMAL(15,2),
    balance_after DECIMAL(15,2),

    -- Type and status
    type VARCHAR(50) DEFAULT 'payment', -- payment, topup, refund, fee_payment
    status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed, refunded

    -- Items purchased
    items JSONB,

    -- Receipt
    receipt_number VARCHAR(50),
    receipt_url TEXT,

    -- Metadata
    description TEXT,
    metadata JSONB,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_school_transactions_id ON school_transactions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_school_transactions_school ON school_transactions(school_id);
CREATE INDEX IF NOT EXISTS idx_school_transactions_student ON school_transactions(index_number);
CREATE INDEX IF NOT EXISTS idx_school_transactions_vendor ON school_transactions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_school_transactions_status ON school_transactions(status);
CREATE INDEX IF NOT EXISTS idx_school_transactions_created ON school_transactions(created_at DESC);

-- RLS
ALTER TABLE school_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all school_transactions" ON school_transactions;
CREATE POLICY "Allow all school_transactions" ON school_transactions
    FOR ALL USING (true);

-- =============================================
-- 5. Function to reset daily spending limit
-- =============================================
CREATE OR REPLACE FUNCTION reset_student_daily_spending()
RETURNS TRIGGER AS $$
BEGIN
    -- Reset daily_spent if it's a new day
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
-- 6. Function to verify PIN
-- =============================================
CREATE OR REPLACE FUNCTION verify_student_pin(
    p_index_number VARCHAR,
    p_pin VARCHAR
) RETURNS TABLE (
    valid BOOLEAN,
    wallet_id UUID,
    peeap_user_id UUID,
    balance DECIMAL,
    daily_limit DECIMAL,
    daily_spent DECIMAL,
    error_code VARCHAR,
    error_message TEXT
) AS $$
DECLARE
    v_student student_wallets%ROWTYPE;
    v_wallet wallets%ROWTYPE;
BEGIN
    -- Get student
    SELECT * INTO v_student FROM student_wallets WHERE index_number = p_index_number;

    IF NOT FOUND THEN
        RETURN QUERY SELECT
            false, NULL::UUID, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
            'WALLET_NOT_FOUND'::VARCHAR, 'No wallet found for this index number'::TEXT;
        RETURN;
    END IF;

    -- Check if locked
    IF v_student.pin_locked_until IS NOT NULL AND v_student.pin_locked_until > NOW() THEN
        RETURN QUERY SELECT
            false, NULL::UUID, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
            'ACCOUNT_LOCKED'::VARCHAR,
            ('Account locked until ' || v_student.pin_locked_until::TEXT)::TEXT;
        RETURN;
    END IF;

    -- Verify PIN
    IF v_student.pin_hash != crypt(p_pin, v_student.pin_hash) THEN
        -- Increment attempts
        UPDATE student_wallets
        SET pin_attempts = pin_attempts + 1,
            pin_locked_until = CASE
                WHEN pin_attempts >= 4 THEN NOW() + INTERVAL '30 minutes'
                ELSE NULL
            END
        WHERE index_number = p_index_number;

        RETURN QUERY SELECT
            false, NULL::UUID, NULL::UUID, NULL::DECIMAL, NULL::DECIMAL, NULL::DECIMAL,
            'INVALID_PIN'::VARCHAR, 'Invalid PIN'::TEXT;
        RETURN;
    END IF;

    -- Reset attempts on success
    UPDATE student_wallets SET pin_attempts = 0 WHERE index_number = p_index_number;

    -- Get wallet balance
    SELECT * INTO v_wallet FROM wallets WHERE id = v_student.wallet_id;

    RETURN QUERY SELECT
        true,
        v_student.wallet_id,
        v_student.peeap_user_id,
        v_wallet.balance,
        v_student.daily_limit,
        v_student.daily_spent,
        NULL::VARCHAR,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 7. Quick Access JWT Settings
-- Store JWT secret configuration
-- =============================================
-- Note: JWT secret should be stored as environment variable
-- PEEAP_JWT_SECRET in the API gateway

-- Add quick_access_tokens table for session management
CREATE TABLE IF NOT EXISTS quick_access_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    school_id INTEGER,
    peeap_school_id VARCHAR(50),

    -- Token info
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_used_at TIMESTAMP WITH TIME ZONE,

    -- Source
    source_system VARCHAR(100), -- e.g., 'ses.gov.school.edu.sl'

    -- Status
    is_revoked BOOLEAN DEFAULT false,
    revoked_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quick_access_tokens_user ON quick_access_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_quick_access_tokens_hash ON quick_access_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_quick_access_tokens_valid ON quick_access_tokens(expires_at)
    WHERE is_revoked = false;

-- RLS
ALTER TABLE quick_access_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all quick_access_tokens" ON quick_access_tokens;
CREATE POLICY "Allow all quick_access_tokens" ON quick_access_tokens
    FOR ALL USING (true);

-- =============================================
-- 8. Log this migration
-- =============================================
DO $$
BEGIN
    RAISE NOTICE 'Student Wallet System migration completed successfully';
    RAISE NOTICE 'Created: student_wallets table';
    RAISE NOTICE 'Created: school_vendors table';
    RAISE NOTICE 'Created: school_products table';
    RAISE NOTICE 'Created: school_transactions table';
    RAISE NOTICE 'Created: quick_access_tokens table';
    RAISE NOTICE 'Created: verify_student_pin function';
    RAISE NOTICE 'Created: reset_student_daily_spending function';
END $$;
