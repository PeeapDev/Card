-- ============================================
-- Complete Card Management System Migration
-- Run this in Supabase SQL Editor
-- ============================================
--
-- This is a COMPLETE migration that creates:
-- 1. card_types table with all features
-- 2. card_orders table
-- 3. Required columns on cards table
-- 4. All necessary functions
-- 5. RLS policies
-- ============================================

-- 1. Create card_types table with ALL features
CREATE TABLE IF NOT EXISTS card_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    card_image_url TEXT,
    price DECIMAL(18,2) NOT NULL DEFAULT 0,
    transaction_fee_percentage DECIMAL(5,2) DEFAULT 0,
    transaction_fee_fixed DECIMAL(18,2) DEFAULT 0,
    required_kyc_level INTEGER DEFAULT 1,
    card_type VARCHAR(20) DEFAULT 'VIRTUAL',
    is_active BOOLEAN DEFAULT true,
    daily_limit DECIMAL(18,2) DEFAULT 5000,
    monthly_limit DECIMAL(18,2) DEFAULT 50000,
    color_gradient VARCHAR(100) DEFAULT 'from-blue-600 to-blue-800',
    features JSONB DEFAULT '[]'::jsonb,
    -- Feature flags
    allow_negative_balance BOOLEAN DEFAULT false,
    allow_buy_now_pay_later BOOLEAN DEFAULT false,
    high_transaction_limit BOOLEAN DEFAULT false,
    no_transaction_fees BOOLEAN DEFAULT false,
    cashback_enabled BOOLEAN DEFAULT false,
    cashback_percentage DECIMAL(5,2) DEFAULT 0,
    overdraft_limit DECIMAL(18,2) DEFAULT 0,
    bnpl_max_amount DECIMAL(18,2) DEFAULT 0,
    bnpl_interest_rate DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create card_orders table
CREATE TABLE IF NOT EXISTS card_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    card_type_id UUID NOT NULL REFERENCES card_types(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),
    amount_paid DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SLE',
    status VARCHAR(30) DEFAULT 'PENDING',
    transaction_id UUID,
    generated_card_id UUID,
    card_number VARCHAR(12),
    qr_code_data TEXT,
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    shipping_address JSONB,
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    activated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add columns to cards table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'card_type_id') THEN
        ALTER TABLE cards ADD COLUMN card_type_id UUID REFERENCES card_types(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'qr_code') THEN
        ALTER TABLE cards ADD COLUMN qr_code TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'card_order_id') THEN
        ALTER TABLE cards ADD COLUMN card_order_id UUID;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'physical_card_activated') THEN
        ALTER TABLE cards ADD COLUMN physical_card_activated BOOLEAN DEFAULT false;
    END IF;

    -- Feature flags on cards
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'allow_negative_balance') THEN
        ALTER TABLE cards ADD COLUMN allow_negative_balance BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'allow_buy_now_pay_later') THEN
        ALTER TABLE cards ADD COLUMN allow_buy_now_pay_later BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'no_transaction_fees') THEN
        ALTER TABLE cards ADD COLUMN no_transaction_fees BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'cashback_enabled') THEN
        ALTER TABLE cards ADD COLUMN cashback_enabled BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'cashback_percentage') THEN
        ALTER TABLE cards ADD COLUMN cashback_percentage DECIMAL(5,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'overdraft_limit') THEN
        ALTER TABLE cards ADD COLUMN overdraft_limit DECIMAL(18,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'bnpl_max_amount') THEN
        ALTER TABLE cards ADD COLUMN bnpl_max_amount DECIMAL(18,2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'bnpl_balance') THEN
        ALTER TABLE cards ADD COLUMN bnpl_balance DECIMAL(18,2) DEFAULT 0;
    END IF;
END $$;

-- 4. Create indexes
CREATE INDEX IF NOT EXISTS idx_card_types_active ON card_types(is_active);
CREATE INDEX IF NOT EXISTS idx_card_orders_user_id ON card_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_card_orders_status ON card_orders(status);
CREATE INDEX IF NOT EXISTS idx_card_orders_card_type_id ON card_orders(card_type_id);

-- 5. Generate 12-digit card number function
CREATE OR REPLACE FUNCTION generate_closed_loop_card_number()
RETURNS VARCHAR(12) AS $$
DECLARE
    card_num VARCHAR(12);
    prefix VARCHAR(4) := '6200';
    existing_count INTEGER;
BEGIN
    LOOP
        card_num := prefix || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');
        SELECT COUNT(*) INTO existing_count FROM cards WHERE card_number = card_num;
        IF existing_count = 0 THEN
            SELECT COUNT(*) INTO existing_count FROM card_orders WHERE card_number = card_num;
            IF existing_count = 0 THEN
                EXIT;
            END IF;
        END IF;
    END LOOP;
    RETURN card_num;
END;
$$ LANGUAGE plpgsql;

-- 6. Generate QR code function
CREATE OR REPLACE FUNCTION generate_card_qr_code(p_card_order_id UUID)
RETURNS TEXT AS $$
BEGIN
    RETURN 'CARD_' || p_card_order_id::TEXT || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '_' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 7. RLS Policies for card_types
ALTER TABLE card_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_types_select_all" ON card_types;
CREATE POLICY "card_types_select_all" ON card_types FOR SELECT USING (true);

DROP POLICY IF EXISTS "card_types_insert_auth" ON card_types;
CREATE POLICY "card_types_insert_auth" ON card_types FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "card_types_update_auth" ON card_types;
CREATE POLICY "card_types_update_auth" ON card_types FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "card_types_delete_auth" ON card_types;
CREATE POLICY "card_types_delete_auth" ON card_types FOR DELETE TO authenticated USING (true);

-- 8. RLS Policies for card_orders
ALTER TABLE card_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "card_orders_select_all" ON card_orders;
CREATE POLICY "card_orders_select_all" ON card_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "card_orders_insert_auth" ON card_orders;
CREATE POLICY "card_orders_insert_auth" ON card_orders FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "card_orders_update_auth" ON card_orders;
CREATE POLICY "card_orders_update_auth" ON card_orders FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION generate_closed_loop_card_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_card_qr_code(UUID) TO authenticated;

-- 10. Verify tables were created
SELECT 'card_types columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'card_types' ORDER BY ordinal_position;

SELECT 'card_orders columns:' as info;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'card_orders' ORDER BY ordinal_position;
