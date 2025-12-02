-- ============================================
-- Enhanced Card Management System Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Create card_types table (Admin-configured card products)
CREATE TABLE IF NOT EXISTS card_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    card_image_url TEXT,
    price DECIMAL(18,2) NOT NULL DEFAULT 0,
    transaction_fee_percentage DECIMAL(5,2) DEFAULT 0,
    transaction_fee_fixed DECIMAL(18,2) DEFAULT 0,
    required_kyc_level INTEGER DEFAULT 1, -- 1=Basic, 2=Advanced, 3=Enhanced
    card_type VARCHAR(20) DEFAULT 'VIRTUAL', -- VIRTUAL, PHYSICAL
    is_active BOOLEAN DEFAULT true,
    daily_limit DECIMAL(18,2) DEFAULT 1000,
    monthly_limit DECIMAL(18,2) DEFAULT 10000,
    color_gradient VARCHAR(100) DEFAULT 'from-blue-600 to-blue-800',
    features JSONB DEFAULT '[]'::jsonb, -- Array of feature strings
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create card_orders table (User card purchase requests)
CREATE TABLE IF NOT EXISTS card_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    card_type_id UUID NOT NULL REFERENCES card_types(id),
    wallet_id UUID NOT NULL REFERENCES wallets(id),

    -- Order details
    amount_paid DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SLE',
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, GENERATED, ACTIVATED, CANCELLED

    -- Transaction reference
    transaction_id UUID,

    -- Card generation (filled when admin generates card)
    generated_card_id UUID REFERENCES cards(id),
    card_number VARCHAR(12), -- 12-digit closed-loop card number
    qr_code_data TEXT, -- Unique QR code identifier

    -- Review details
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Physical card shipping
    shipping_address JSONB,
    tracking_number VARCHAR(100),
    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    -- Activation
    activated_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Add card_type_id and qr_code to existing cards table
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'card_type_id') THEN
        ALTER TABLE cards ADD COLUMN card_type_id UUID REFERENCES card_types(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'qr_code') THEN
        ALTER TABLE cards ADD COLUMN qr_code TEXT UNIQUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'card_order_id') THEN
        ALTER TABLE cards ADD COLUMN card_order_id UUID REFERENCES card_orders(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cards' AND column_name = 'physical_card_activated') THEN
        ALTER TABLE cards ADD COLUMN physical_card_activated BOOLEAN DEFAULT false;
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_card_types_active ON card_types(is_active);
CREATE INDEX IF NOT EXISTS idx_card_orders_user_id ON card_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_card_orders_status ON card_orders(status);
CREATE INDEX IF NOT EXISTS idx_card_orders_card_type_id ON card_orders(card_type_id);
CREATE INDEX IF NOT EXISTS idx_cards_qr_code ON cards(qr_code);
CREATE INDEX IF NOT EXISTS idx_cards_card_type_id ON cards(card_type_id);

-- 5. Generate 12-digit closed-loop card number function
CREATE OR REPLACE FUNCTION generate_closed_loop_card_number()
RETURNS VARCHAR(12) AS $$
DECLARE
    card_num VARCHAR(12);
    prefix VARCHAR(4) := '6200'; -- Closed-loop card prefix
    existing_count INTEGER;
BEGIN
    LOOP
        -- Generate 8 random digits
        card_num := prefix || LPAD(FLOOR(RANDOM() * 100000000)::TEXT, 8, '0');

        -- Check if card number already exists
        SELECT COUNT(*) INTO existing_count FROM cards WHERE card_number = card_num;

        IF existing_count = 0 THEN
            -- Also check card_orders
            SELECT COUNT(*) INTO existing_count FROM card_orders WHERE card_number = card_num;
            IF existing_count = 0 THEN
                EXIT;
            END IF;
        END IF;
    END LOOP;

    RETURN card_num;
END;
$$ LANGUAGE plpgsql;

-- 6. Generate unique QR code function
CREATE OR REPLACE FUNCTION generate_card_qr_code(p_card_order_id UUID)
RETURNS TEXT AS $$
DECLARE
    qr_data TEXT;
BEGIN
    -- Format: CARD_{order_id}_{timestamp}_{random}
    qr_data := 'CARD_' || p_card_order_id::TEXT || '_' ||
               EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT || '_' ||
               LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    RETURN qr_data;
END;
$$ LANGUAGE plpgsql;

-- 7. Card order creation with wallet deduction function
CREATE OR REPLACE FUNCTION create_card_order(
    p_user_id UUID,
    p_card_type_id UUID,
    p_wallet_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_card_type RECORD;
    v_wallet RECORD;
    v_order_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Get card type details
    SELECT * INTO v_card_type FROM card_types WHERE id = p_card_type_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Card type not found or inactive';
    END IF;

    -- Get wallet and check balance
    SELECT * INTO v_wallet FROM wallets WHERE id = p_wallet_id AND user_id = p_user_id AND status = 'ACTIVE';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Wallet not found or inactive';
    END IF;

    IF v_wallet.balance < v_card_type.price THEN
        RAISE EXCEPTION 'Insufficient wallet balance. Required: %, Available: %', v_card_type.price, v_wallet.balance;
    END IF;

    -- Deduct from wallet
    UPDATE wallets
    SET balance = balance - v_card_type.price,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    -- Create transaction record
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        currency,
        status,
        description,
        reference
    ) VALUES (
        p_wallet_id,
        'PAYMENT',
        v_card_type.price,
        v_wallet.currency,
        'COMPLETED',
        'Card purchase: ' || v_card_type.name,
        'CARD_ORDER_' || gen_random_uuid()::TEXT
    ) RETURNING id INTO v_transaction_id;

    -- Create card order
    INSERT INTO card_orders (
        user_id,
        card_type_id,
        wallet_id,
        amount_paid,
        currency,
        status,
        transaction_id
    ) VALUES (
        p_user_id,
        p_card_type_id,
        p_wallet_id,
        v_card_type.price,
        v_wallet.currency,
        'PENDING',
        v_transaction_id
    ) RETURNING id INTO v_order_id;

    RETURN v_order_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Admin generate card function
CREATE OR REPLACE FUNCTION admin_generate_card(
    p_order_id UUID,
    p_admin_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_order RECORD;
    v_card_type RECORD;
    v_user RECORD;
    v_card_id UUID;
    v_card_number VARCHAR(12);
    v_qr_code TEXT;
    v_expiry_date DATE;
BEGIN
    -- Get order details
    SELECT * INTO v_order FROM card_orders WHERE id = p_order_id AND status = 'PENDING';
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found or already processed';
    END IF;

    -- Get card type
    SELECT * INTO v_card_type FROM card_types WHERE id = v_order.card_type_id;

    -- Get user for cardholder name
    SELECT * INTO v_user FROM users WHERE id = v_order.user_id;

    -- Generate card number and QR code
    v_card_number := generate_closed_loop_card_number();
    v_qr_code := generate_card_qr_code(p_order_id);
    v_expiry_date := CURRENT_DATE + INTERVAL '3 years';

    -- Create the card
    INSERT INTO cards (
        user_id,
        wallet_id,
        card_type_id,
        card_order_id,
        card_number,
        masked_number,
        cvv,
        expiry_month,
        expiry_year,
        cardholder_name,
        type,
        status,
        qr_code,
        daily_limit,
        monthly_limit,
        physical_card_activated
    ) VALUES (
        v_order.user_id,
        v_order.wallet_id,
        v_order.card_type_id,
        p_order_id,
        v_card_number,
        '****' || RIGHT(v_card_number, 4),
        LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0'),
        EXTRACT(MONTH FROM v_expiry_date)::INTEGER,
        EXTRACT(YEAR FROM v_expiry_date)::INTEGER,
        UPPER(v_user.first_name || ' ' || v_user.last_name),
        v_card_type.card_type,
        CASE WHEN v_card_type.card_type = 'VIRTUAL' THEN 'ACTIVE' ELSE 'INACTIVE' END,
        v_qr_code,
        v_card_type.daily_limit,
        v_card_type.monthly_limit,
        CASE WHEN v_card_type.card_type = 'VIRTUAL' THEN true ELSE false END
    ) RETURNING id INTO v_card_id;

    -- Update order with generated card details
    UPDATE card_orders SET
        status = 'GENERATED',
        generated_card_id = v_card_id,
        card_number = v_card_number,
        qr_code_data = v_qr_code,
        reviewed_by = p_admin_id,
        reviewed_at = NOW(),
        review_notes = p_notes,
        updated_at = NOW()
    WHERE id = p_order_id;

    RETURN v_card_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Activate physical card by QR code
CREATE OR REPLACE FUNCTION activate_card_by_qr(
    p_qr_code TEXT,
    p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_card RECORD;
BEGIN
    -- Find card by QR code
    SELECT * INTO v_card FROM cards WHERE qr_code = p_qr_code;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid QR code';
    END IF;

    -- Verify ownership
    IF v_card.user_id != p_user_id THEN
        RAISE EXCEPTION 'This card does not belong to you';
    END IF;

    -- Check if already activated
    IF v_card.physical_card_activated = true THEN
        RAISE EXCEPTION 'Card is already activated';
    END IF;

    -- Activate the card
    UPDATE cards SET
        status = 'ACTIVE',
        physical_card_activated = true,
        updated_at = NOW()
    WHERE id = v_card.id;

    -- Update order status
    UPDATE card_orders SET
        status = 'ACTIVATED',
        activated_at = NOW(),
        updated_at = NOW()
    WHERE generated_card_id = v_card.id;

    RETURN v_card.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Row Level Security Policies
ALTER TABLE card_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_orders ENABLE ROW LEVEL SECURITY;

-- Card types: Anyone can read active types, only admins can manage
DROP POLICY IF EXISTS "card_types_select_policy" ON card_types;
CREATE POLICY "card_types_select_policy" ON card_types
    FOR SELECT USING (
        is_active = true
        OR user_role_level(auth.uid()) >= 80
    );

DROP POLICY IF EXISTS "card_types_admin_policy" ON card_types;
CREATE POLICY "card_types_admin_policy" ON card_types
    FOR ALL USING (user_role_level(auth.uid()) >= 80);

-- Card orders: Users see own orders, admins see all
DROP POLICY IF EXISTS "card_orders_select_policy" ON card_orders;
CREATE POLICY "card_orders_select_policy" ON card_orders
    FOR SELECT USING (
        user_id = auth.uid()
        OR user_role_level(auth.uid()) >= 80
    );

DROP POLICY IF EXISTS "card_orders_insert_policy" ON card_orders;
CREATE POLICY "card_orders_insert_policy" ON card_orders
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "card_orders_admin_update_policy" ON card_orders;
CREATE POLICY "card_orders_admin_update_policy" ON card_orders
    FOR UPDATE USING (user_role_level(auth.uid()) >= 80);

-- 11. Insert default card types
INSERT INTO card_types (name, description, price, required_kyc_level, card_type, is_active, color_gradient, features)
VALUES
    ('Basic Virtual Card', 'Perfect for online transactions', 0, 1, 'VIRTUAL', true, 'from-blue-500 to-blue-700', '["Instant issuance", "Online payments", "No annual fee"]'::jsonb),
    ('Premium Virtual Card', 'Higher limits and premium features', 10.00, 2, 'VIRTUAL', true, 'from-purple-600 to-purple-800', '["Higher daily limits", "Priority support", "Cashback rewards"]'::jsonb),
    ('Physical Card - Standard', 'Contactless NFC-enabled card', 25.00, 2, 'PHYSICAL', true, 'from-gray-700 to-gray-900', '["NFC tap payments", "ATM withdrawals", "Physical card delivery"]'::jsonb),
    ('Physical Card - Premium', 'Premium metal card with exclusive benefits', 50.00, 3, 'PHYSICAL', true, 'from-yellow-600 to-yellow-800', '["Metal card", "Airport lounge access", "Travel insurance", "Concierge service"]'::jsonb)
ON CONFLICT DO NOTHING;

-- 12. Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION generate_closed_loop_card_number() TO authenticated;
GRANT EXECUTE ON FUNCTION generate_card_qr_code(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION create_card_order(UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_generate_card(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_card_by_qr(TEXT, UUID) TO authenticated;
