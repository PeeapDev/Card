-- Migration: Exchange System for Multi-Currency Wallets
-- This creates the exchange rates, transactions, and permissions tables

-- =====================================================
-- EXCHANGE RATES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(18, 8) NOT NULL,  -- e.g., 1 USD = 22.50 SLE
    margin_percentage DECIMAL(5, 2) DEFAULT 0,  -- Admin margin on top of rate
    is_active BOOLEAN DEFAULT true,
    set_by UUID REFERENCES users(id),
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency)
);

-- Create index for active rate lookups
CREATE INDEX IF NOT EXISTS idx_exchange_rates_active ON exchange_rates(from_currency, to_currency, is_active);

-- =====================================================
-- EXCHANGE TRANSACTIONS TABLE (Audit Log)
-- =====================================================
CREATE TABLE IF NOT EXISTS exchange_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    from_wallet_id UUID NOT NULL REFERENCES wallets(id),
    to_wallet_id UUID NOT NULL REFERENCES wallets(id),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    from_amount DECIMAL(18, 4) NOT NULL,
    to_amount DECIMAL(18, 4) NOT NULL,
    exchange_rate DECIMAL(18, 8) NOT NULL,
    fee_amount DECIMAL(18, 4) DEFAULT 0,
    fee_currency VARCHAR(3),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    rate_id UUID REFERENCES exchange_rates(id),
    reference VARCHAR(50),
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for exchange transactions
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_user ON exchange_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_status ON exchange_transactions(status);
CREATE INDEX IF NOT EXISTS idx_exchange_transactions_created ON exchange_transactions(created_at DESC);

-- =====================================================
-- EXCHANGE PERMISSIONS TABLE (Per User Type)
-- =====================================================
CREATE TABLE IF NOT EXISTS exchange_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_type VARCHAR(50) NOT NULL UNIQUE,  -- 'superadmin', 'admin', 'merchant', 'agent', 'user'
    can_exchange BOOLEAN DEFAULT false,
    daily_limit DECIMAL(18, 2),  -- Daily limit in USD equivalent
    monthly_limit DECIMAL(18, 2),  -- Monthly limit in USD equivalent
    min_amount DECIMAL(18, 2) DEFAULT 1,  -- Minimum exchange amount
    max_amount DECIMAL(18, 2),  -- Maximum single exchange amount
    fee_percentage DECIMAL(5, 2) DEFAULT 0,  -- Fee percentage for this user type
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INSERT DEFAULT PERMISSIONS
-- =====================================================
INSERT INTO exchange_permissions (user_type, can_exchange, daily_limit, monthly_limit, fee_percentage) VALUES
    ('superadmin', true, NULL, NULL, 0),
    ('admin', true, 100000, 1000000, 0),
    ('merchant', true, 50000, 500000, 0.5),
    ('agent', true, 25000, 250000, 0.5),
    ('user', false, 5000, 50000, 1.0)
ON CONFLICT (user_type) DO NOTHING;

-- =====================================================
-- INSERT DEFAULT EXCHANGE RATES
-- =====================================================
INSERT INTO exchange_rates (from_currency, to_currency, rate, margin_percentage, is_active)
VALUES
    ('USD', 'SLE', 22.50, 0, true),
    ('SLE', 'USD', 0.044444, 0, true)
ON CONFLICT (from_currency, to_currency) DO NOTHING;

-- =====================================================
-- ENABLE RLS
-- =====================================================
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES FOR EXCHANGE RATES
-- =====================================================
-- Everyone can view active exchange rates
CREATE POLICY "exchange_rates_select_all" ON exchange_rates
    FOR SELECT USING (is_active = true);

-- Only admins can manage exchange rates
CREATE POLICY "exchange_rates_admin_all" ON exchange_rates
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND roles IN ('admin', 'superadmin')
        )
    );

-- =====================================================
-- RLS POLICIES FOR EXCHANGE TRANSACTIONS
-- =====================================================
-- Users can view their own exchange transactions
CREATE POLICY "exchange_transactions_select_own" ON exchange_transactions
    FOR SELECT USING (user_id = auth.uid());

-- Admins can view all exchange transactions
CREATE POLICY "exchange_transactions_admin_select" ON exchange_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND roles IN ('admin', 'superadmin')
        )
    );

-- Users can insert their own exchange transactions
CREATE POLICY "exchange_transactions_insert_own" ON exchange_transactions
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- =====================================================
-- RLS POLICIES FOR EXCHANGE PERMISSIONS
-- =====================================================
-- Everyone can view exchange permissions
CREATE POLICY "exchange_permissions_select_all" ON exchange_permissions
    FOR SELECT USING (true);

-- Only superadmins can manage exchange permissions
CREATE POLICY "exchange_permissions_admin_all" ON exchange_permissions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND roles = 'superadmin'
        )
    );

-- =====================================================
-- FUNCTION: Get Current Exchange Rate
-- =====================================================
CREATE OR REPLACE FUNCTION get_exchange_rate(
    p_from_currency VARCHAR(3),
    p_to_currency VARCHAR(3)
)
RETURNS TABLE (
    rate DECIMAL(18, 8),
    margin_percentage DECIMAL(5, 2),
    effective_rate DECIMAL(18, 8)
) AS $$
DECLARE
    v_rate DECIMAL(18, 8);
    v_margin DECIMAL(5, 2);
BEGIN
    SELECT er.rate, er.margin_percentage
    INTO v_rate, v_margin
    FROM exchange_rates er
    WHERE er.from_currency = p_from_currency
    AND er.to_currency = p_to_currency
    AND er.is_active = true
    LIMIT 1;

    IF v_rate IS NULL THEN
        RAISE EXCEPTION 'Exchange rate not found for % to %', p_from_currency, p_to_currency;
    END IF;

    RETURN QUERY SELECT
        v_rate,
        v_margin,
        v_rate * (1 - v_margin / 100);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Check User Can Exchange
-- =====================================================
CREATE OR REPLACE FUNCTION can_user_exchange(
    p_user_id UUID,
    p_amount DECIMAL(18, 4) DEFAULT 0
)
RETURNS TABLE (
    allowed BOOLEAN,
    reason TEXT,
    daily_remaining DECIMAL(18, 2),
    monthly_remaining DECIMAL(18, 2)
) AS $$
DECLARE
    v_user_role VARCHAR(50);
    v_permission RECORD;
    v_daily_used DECIMAL(18, 2);
    v_monthly_used DECIMAL(18, 2);
    v_daily_remaining DECIMAL(18, 2);
    v_monthly_remaining DECIMAL(18, 2);
BEGIN
    -- Get user role
    SELECT roles INTO v_user_role FROM users WHERE id = p_user_id;

    IF v_user_role IS NULL THEN
        RETURN QUERY SELECT false, 'User not found'::TEXT, 0::DECIMAL(18,2), 0::DECIMAL(18,2);
        RETURN;
    END IF;

    -- Get permission for user type
    SELECT * INTO v_permission FROM exchange_permissions WHERE user_type = v_user_role;

    IF v_permission IS NULL THEN
        RETURN QUERY SELECT false, 'No exchange permission configured for your account type'::TEXT, 0::DECIMAL(18,2), 0::DECIMAL(18,2);
        RETURN;
    END IF;

    IF NOT v_permission.can_exchange THEN
        RETURN QUERY SELECT false, 'Exchange is not enabled for your account type'::TEXT, 0::DECIMAL(18,2), 0::DECIMAL(18,2);
        RETURN;
    END IF;

    -- Calculate daily usage (convert all to USD equivalent)
    SELECT COALESCE(SUM(
        CASE
            WHEN from_currency = 'USD' THEN from_amount
            ELSE from_amount * 0.044444  -- Approximate SLE to USD
        END
    ), 0) INTO v_daily_used
    FROM exchange_transactions
    WHERE user_id = p_user_id
    AND created_at >= CURRENT_DATE
    AND status = 'COMPLETED';

    -- Calculate monthly usage
    SELECT COALESCE(SUM(
        CASE
            WHEN from_currency = 'USD' THEN from_amount
            ELSE from_amount * 0.044444
        END
    ), 0) INTO v_monthly_used
    FROM exchange_transactions
    WHERE user_id = p_user_id
    AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
    AND status = 'COMPLETED';

    -- Calculate remaining limits
    v_daily_remaining := COALESCE(v_permission.daily_limit - v_daily_used, 999999999);
    v_monthly_remaining := COALESCE(v_permission.monthly_limit - v_monthly_used, 999999999);

    -- Check limits
    IF v_permission.daily_limit IS NOT NULL AND v_daily_used + p_amount > v_permission.daily_limit THEN
        RETURN QUERY SELECT false, 'Daily exchange limit exceeded'::TEXT, v_daily_remaining, v_monthly_remaining;
        RETURN;
    END IF;

    IF v_permission.monthly_limit IS NOT NULL AND v_monthly_used + p_amount > v_permission.monthly_limit THEN
        RETURN QUERY SELECT false, 'Monthly exchange limit exceeded'::TEXT, v_daily_remaining, v_monthly_remaining;
        RETURN;
    END IF;

    -- Check min/max amount
    IF v_permission.min_amount IS NOT NULL AND p_amount > 0 AND p_amount < v_permission.min_amount THEN
        RETURN QUERY SELECT false, ('Minimum exchange amount is ' || v_permission.min_amount)::TEXT, v_daily_remaining, v_monthly_remaining;
        RETURN;
    END IF;

    IF v_permission.max_amount IS NOT NULL AND p_amount > v_permission.max_amount THEN
        RETURN QUERY SELECT false, ('Maximum exchange amount is ' || v_permission.max_amount)::TEXT, v_daily_remaining, v_monthly_remaining;
        RETURN;
    END IF;

    RETURN QUERY SELECT true, NULL::TEXT, v_daily_remaining, v_monthly_remaining;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCTION: Execute Exchange Between Wallets
-- =====================================================
CREATE OR REPLACE FUNCTION execute_wallet_exchange(
    p_user_id UUID,
    p_from_wallet_id UUID,
    p_to_wallet_id UUID,
    p_amount DECIMAL(18, 4)
)
RETURNS TABLE (
    success BOOLEAN,
    transaction_id UUID,
    from_amount DECIMAL(18, 4),
    to_amount DECIMAL(18, 4),
    rate_used DECIMAL(18, 8),
    fee_amount DECIMAL(18, 4),
    error_message TEXT
) AS $$
DECLARE
    v_from_wallet RECORD;
    v_to_wallet RECORD;
    v_rate DECIMAL(18, 8);
    v_margin DECIMAL(5, 2);
    v_effective_rate DECIMAL(18, 8);
    v_to_amount DECIMAL(18, 4);
    v_fee DECIMAL(18, 4);
    v_fee_percentage DECIMAL(5, 2);
    v_user_role VARCHAR(50);
    v_can_exchange BOOLEAN;
    v_exchange_reason TEXT;
    v_transaction_id UUID;
    v_reference VARCHAR(50);
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4), 'Amount must be positive'::TEXT;
        RETURN;
    END IF;

    -- Check user can exchange
    SELECT allowed, reason INTO v_can_exchange, v_exchange_reason
    FROM can_user_exchange(p_user_id, p_amount);

    IF NOT v_can_exchange THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4), v_exchange_reason;
        RETURN;
    END IF;

    -- Lock and get from wallet
    SELECT * INTO v_from_wallet
    FROM wallets
    WHERE id = p_from_wallet_id AND user_id = p_user_id
    FOR UPDATE;

    IF v_from_wallet IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4), 'Source wallet not found or not owned by user'::TEXT;
        RETURN;
    END IF;

    IF v_from_wallet.status != 'ACTIVE' THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4), 'Source wallet is not active'::TEXT;
        RETURN;
    END IF;

    IF v_from_wallet.balance < p_amount THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4), 'Insufficient balance in source wallet'::TEXT;
        RETURN;
    END IF;

    -- Lock and get to wallet
    SELECT * INTO v_to_wallet
    FROM wallets
    WHERE id = p_to_wallet_id AND user_id = p_user_id
    FOR UPDATE;

    IF v_to_wallet IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4), 'Destination wallet not found or not owned by user'::TEXT;
        RETURN;
    END IF;

    IF v_to_wallet.status != 'ACTIVE' THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4), 'Destination wallet is not active'::TEXT;
        RETURN;
    END IF;

    -- Check wallets have different currencies
    IF v_from_wallet.currency = v_to_wallet.currency THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4), 'Cannot exchange between wallets with same currency. Use transfer instead.'::TEXT;
        RETURN;
    END IF;

    -- Get exchange rate
    SELECT er.rate, er.margin_percentage
    INTO v_rate, v_margin
    FROM exchange_rates er
    WHERE er.from_currency = v_from_wallet.currency
    AND er.to_currency = v_to_wallet.currency
    AND er.is_active = true;

    IF v_rate IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL(18,4), 0::DECIMAL(18,4), 0::DECIMAL(18,8), 0::DECIMAL(18,4),
            ('Exchange rate not available for ' || v_from_wallet.currency || ' to ' || v_to_wallet.currency)::TEXT;
        RETURN;
    END IF;

    -- Get user fee percentage
    SELECT roles INTO v_user_role FROM users WHERE id = p_user_id;
    SELECT COALESCE(fee_percentage, 0) INTO v_fee_percentage
    FROM exchange_permissions WHERE user_type = v_user_role;

    -- Calculate effective rate (with margin)
    v_effective_rate := v_rate * (1 - COALESCE(v_margin, 0) / 100);

    -- Calculate to amount
    v_to_amount := p_amount * v_effective_rate;

    -- Calculate fee (from the destination amount)
    v_fee := v_to_amount * (v_fee_percentage / 100);
    v_to_amount := v_to_amount - v_fee;

    -- Generate reference
    v_reference := 'EXC-' || EXTRACT(EPOCH FROM NOW())::TEXT || '-' || SUBSTR(MD5(RANDOM()::TEXT), 1, 6);

    -- Debit from wallet
    UPDATE wallets SET
        balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = p_from_wallet_id;

    -- Credit to wallet
    UPDATE wallets SET
        balance = balance + v_to_amount,
        updated_at = NOW()
    WHERE id = p_to_wallet_id;

    -- Record exchange transaction
    INSERT INTO exchange_transactions (
        user_id,
        from_wallet_id,
        to_wallet_id,
        from_currency,
        to_currency,
        from_amount,
        to_amount,
        exchange_rate,
        fee_amount,
        fee_currency,
        status,
        reference
    ) VALUES (
        p_user_id,
        p_from_wallet_id,
        p_to_wallet_id,
        v_from_wallet.currency,
        v_to_wallet.currency,
        p_amount,
        v_to_amount,
        v_effective_rate,
        v_fee,
        v_to_wallet.currency,
        'COMPLETED',
        v_reference
    ) RETURNING id INTO v_transaction_id;

    RETURN QUERY SELECT
        true,
        v_transaction_id,
        p_amount,
        v_to_amount,
        v_effective_rate,
        v_fee,
        NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- UPDATED TIMESTAMP TRIGGERS
-- =====================================================
CREATE OR REPLACE FUNCTION update_exchange_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exchange_rates_updated_at
    BEFORE UPDATE ON exchange_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_exchange_updated_at();

CREATE TRIGGER exchange_transactions_updated_at
    BEFORE UPDATE ON exchange_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_exchange_updated_at();

CREATE TRIGGER exchange_permissions_updated_at
    BEFORE UPDATE ON exchange_permissions
    FOR EACH ROW
    EXECUTE FUNCTION update_exchange_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE exchange_rates IS 'Currency exchange rates set by admin';
COMMENT ON TABLE exchange_transactions IS 'Audit log of all currency exchanges';
COMMENT ON TABLE exchange_permissions IS 'Exchange permissions and limits per user type';
COMMENT ON FUNCTION get_exchange_rate IS 'Get current exchange rate between two currencies';
COMMENT ON FUNCTION can_user_exchange IS 'Check if user is allowed to exchange and their remaining limits';
COMMENT ON FUNCTION execute_wallet_exchange IS 'Execute a currency exchange between user wallets';

-- Done
SELECT 'Exchange system tables and functions created successfully' as status;
