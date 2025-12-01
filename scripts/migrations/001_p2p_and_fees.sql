-- P2P Transfer, Fees, and Wallet System Migration
-- Run this migration to set up the P2P transfer infrastructure

-- =====================================================
-- ADD MISSING COLUMNS TO EXISTING WALLETS TABLE
-- =====================================================
DO $$
BEGIN
    -- Add wallet_type column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'wallet_type') THEN
        ALTER TABLE wallets ADD COLUMN wallet_type VARCHAR(20) DEFAULT 'primary';
    END IF;

    -- Add available_balance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'available_balance') THEN
        ALTER TABLE wallets ADD COLUMN available_balance DECIMAL(18, 2) DEFAULT 0.00;
    END IF;

    -- Add pending_balance column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'pending_balance') THEN
        ALTER TABLE wallets ADD COLUMN pending_balance DECIMAL(18, 2) DEFAULT 0.00;
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'is_active') THEN
        ALTER TABLE wallets ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add is_frozen column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'is_frozen') THEN
        ALTER TABLE wallets ADD COLUMN is_frozen BOOLEAN DEFAULT false;
    END IF;

    -- Add frozen_reason column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'frozen_reason') THEN
        ALTER TABLE wallets ADD COLUMN frozen_reason TEXT;
    END IF;

    -- Add frozen_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'frozen_at') THEN
        ALTER TABLE wallets ADD COLUMN frozen_at TIMESTAMPTZ;
    END IF;

    -- Add daily_limit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'daily_limit') THEN
        ALTER TABLE wallets ADD COLUMN daily_limit DECIMAL(18, 2) DEFAULT 5000.00;
    END IF;

    -- Add monthly_limit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'monthly_limit') THEN
        ALTER TABLE wallets ADD COLUMN monthly_limit DECIMAL(18, 2) DEFAULT 25000.00;
    END IF;

    -- Add per_transaction_limit column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'wallets' AND column_name = 'per_transaction_limit') THEN
        ALTER TABLE wallets ADD COLUMN per_transaction_limit DECIMAL(18, 2) DEFAULT 2500.00;
    END IF;
END $$;

-- Update existing wallets to have wallet_type = 'primary' if null
UPDATE wallets SET wallet_type = 'primary' WHERE wallet_type IS NULL;

-- Sync available_balance with balance for existing records
UPDATE wallets SET available_balance = balance WHERE available_balance IS NULL OR available_balance = 0;

-- =====================================================
-- FEE CONFIGURATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS fee_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    user_type VARCHAR(50) NOT NULL,
    fee_type VARCHAR(20) NOT NULL,
    fee_value DECIMAL(10, 4) DEFAULT 0,
    min_fee DECIMAL(18, 2),
    max_fee DECIMAL(18, 2),
    tier_config JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fee_configs_category_user_type_name_key'
    ) THEN
        ALTER TABLE fee_configs ADD CONSTRAINT fee_configs_category_user_type_name_key UNIQUE (category, user_type, name);
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- =====================================================
-- TRANSFER LIMITS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS transfer_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(50) NOT NULL,
    daily_limit DECIMAL(18, 2) NOT NULL,
    monthly_limit DECIMAL(18, 2) NOT NULL,
    per_transaction_limit DECIMAL(18, 2) NOT NULL,
    min_amount DECIMAL(18, 2) DEFAULT 0.01,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'transfer_limits_user_type_key'
    ) THEN
        ALTER TABLE transfer_limits ADD CONSTRAINT transfer_limits_user_type_key UNIQUE (user_type);
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END $$;

-- =====================================================
-- P2P TRANSFERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS p2p_transfers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_wallet_id UUID NOT NULL REFERENCES wallets(id),
    recipient_id UUID NOT NULL REFERENCES users(id),
    recipient_wallet_id UUID NOT NULL REFERENCES wallets(id),
    amount DECIMAL(18, 2) NOT NULL,
    fee DECIMAL(18, 2) DEFAULT 0,
    net_amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    method VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    note TEXT,
    idempotency_key VARCHAR(100),
    signed_token TEXT,
    metadata JSONB,
    error_code VARCHAR(50),
    error_message TEXT,
    completed_at TIMESTAMPTZ,
    reversed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_p2p_transfers_sender ON p2p_transfers(sender_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_recipient ON p2p_transfers(recipient_id);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_status ON p2p_transfers(status);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_created ON p2p_transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_p2p_transfers_idempotency ON p2p_transfers(idempotency_key);

-- =====================================================
-- TRANSFER LINKS TABLE (for claiming transfers)
-- =====================================================
CREATE TABLE IF NOT EXISTS transfer_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(255) UNIQUE NOT NULL,
    sender_id UUID NOT NULL REFERENCES users(id),
    amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    recipient_id UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    p2p_transfer_id UUID REFERENCES p2p_transfers(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_links_token ON transfer_links(token);
CREATE INDEX IF NOT EXISTS idx_transfer_links_sender ON transfer_links(sender_id);
CREATE INDEX IF NOT EXISTS idx_transfer_links_status ON transfer_links(status);

-- =====================================================
-- DAILY TRANSACTION TOTALS (for limit tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS daily_transaction_totals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    total_sent DECIMAL(18, 2) DEFAULT 0,
    total_received DECIMAL(18, 2) DEFAULT 0,
    transaction_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'daily_transaction_totals_user_id_date_key'
    ) THEN
        ALTER TABLE daily_transaction_totals ADD CONSTRAINT daily_transaction_totals_user_id_date_key UNIQUE (user_id, date);
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_daily_totals_user_date ON daily_transaction_totals(user_id, date);

-- =====================================================
-- AGENT SUBSCRIPTIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS agent_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    tier VARCHAR(20) NOT NULL,
    price_monthly DECIMAL(10, 2),
    status VARCHAR(20) DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    payment_method JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'agent_subscriptions_user_id_key'
    ) THEN
        ALTER TABLE agent_subscriptions ADD CONSTRAINT agent_subscriptions_user_id_key UNIQUE (user_id);
    END IF;
EXCEPTION WHEN others THEN
    NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_user ON agent_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_agent_subscriptions_tier ON agent_subscriptions(tier);

-- =====================================================
-- INSERT DEFAULT FEE CONFIGURATIONS
-- =====================================================
INSERT INTO fee_configs (name, description, category, user_type, fee_type, fee_value, min_fee, max_fee, is_active)
VALUES
    -- P2P Fees
    ('Standard User P2P Fee', 'Fee for regular user P2P transfers', 'p2p', 'standard', 'percentage', 1.0, 0.10, 10.00, true),
    ('Agent P2P Fee', 'Fee for agent P2P transfers', 'p2p', 'agent', 'percentage', 0.5, 0.10, 5.00, true),
    ('Agent+ P2P Fee', 'Fee for Agent+ P2P transfers (unlimited volume)', 'p2p', 'agent_plus', 'percentage', 0.2, 0.05, 5.00, true),
    ('Merchant P2P Fee', 'Fee for merchant P2P transfers', 'p2p', 'merchant', 'percentage', 0.5, 0.10, 25.00, true),

    -- Transfer Fees
    ('Internal Transfer Fee', 'Fee for transfers between users', 'transfer', 'all_users', 'percentage', 0.5, 0.00, 100.00, true),
    ('External Transfer Fee', 'Fee for transfers to external banks', 'transfer', 'all_users', 'fixed', 2.50, NULL, NULL, true),
    ('International Transfer Fee', 'Fee for international transfers', 'transfer', 'all_users', 'percentage', 2.5, 5.00, 500.00, true),

    -- Card Fees
    ('Virtual Card Creation', 'One-time fee for virtual card', 'card', 'all_users', 'fixed', 1.00, NULL, NULL, true),
    ('Physical Card Creation', 'One-time fee for physical card', 'card', 'all_users', 'fixed', 10.00, NULL, NULL, true),
    ('Card Transaction Fee', 'Per transaction fee', 'card', 'all_users', 'percentage', 1.5, 0.10, 50.00, true),
    ('Card Monthly Maintenance', 'Monthly card maintenance fee', 'card', 'all_users', 'fixed', 1.00, NULL, NULL, true),

    -- Merchant Fees
    ('Payment Processing Fee', 'Fee for processing payments', 'merchant', 'merchant', 'percentage', 2.9, 0.30, NULL, true),
    ('Payout Fee', 'Fee for merchant payouts', 'merchant', 'merchant', 'percentage', 0.25, 0.25, 25.00, true),
    ('Chargeback Fee', 'Fee per chargeback', 'merchant', 'merchant', 'fixed', 15.00, NULL, NULL, true)
ON CONFLICT (category, user_type, name) DO UPDATE SET
    fee_value = EXCLUDED.fee_value,
    min_fee = EXCLUDED.min_fee,
    max_fee = EXCLUDED.max_fee,
    updated_at = NOW();

-- =====================================================
-- INSERT DEFAULT TRANSFER LIMITS
-- =====================================================
INSERT INTO transfer_limits (user_type, daily_limit, monthly_limit, per_transaction_limit, min_amount, is_active)
VALUES
    ('standard', 5000.00, 25000.00, 2500.00, 1.00, true),
    ('agent', 50000.00, 250000.00, 25000.00, 0.50, true),
    ('agent_plus', 1000000.00, 10000000.00, 500000.00, 0.01, true),
    ('merchant', 100000.00, 1000000.00, 50000.00, 0.01, true)
ON CONFLICT (user_type) DO UPDATE SET
    daily_limit = EXCLUDED.daily_limit,
    monthly_limit = EXCLUDED.monthly_limit,
    per_transaction_limit = EXCLUDED.per_transaction_limit,
    min_amount = EXCLUDED.min_amount,
    updated_at = NOW();

-- =====================================================
-- CREATE WALLET FOR EXISTING USERS (trigger)
-- =====================================================
CREATE OR REPLACE FUNCTION create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO wallets (user_id, wallet_type, currency, balance, available_balance)
    VALUES (NEW.id, 'primary', 'USD', 0.00, 0.00)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_wallet_for_user ON users;
CREATE TRIGGER trigger_create_wallet_for_user
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_wallet_for_user();

-- =====================================================
-- UPDATE WALLET BALANCE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION update_wallet_balance(
    p_wallet_id UUID,
    p_amount DECIMAL(18, 2),
    p_operation VARCHAR(10)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_current_balance DECIMAL(18, 2);
BEGIN
    SELECT balance INTO v_current_balance FROM wallets WHERE id = p_wallet_id FOR UPDATE;

    IF p_operation = 'debit' THEN
        IF v_current_balance < p_amount THEN
            RETURN FALSE;
        END IF;
        UPDATE wallets SET
            balance = balance - p_amount,
            available_balance = available_balance - p_amount,
            updated_at = NOW()
        WHERE id = p_wallet_id;
    ELSIF p_operation = 'credit' THEN
        UPDATE wallets SET
            balance = balance + p_amount,
            available_balance = available_balance + p_amount,
            updated_at = NOW()
        WHERE id = p_wallet_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Output confirmation
-- =====================================================
SELECT 'P2P Transfer and Fees migration completed successfully!' as message;
