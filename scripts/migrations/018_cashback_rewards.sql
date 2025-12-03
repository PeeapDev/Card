-- ============================================
-- Cashback Rewards System Migration
-- Run this in Supabase SQL Editor
-- ============================================
--
-- This creates:
-- 1. cashback_rewards table to track earned cashback
-- 2. user_cashback_balance view for quick balance lookups
-- 3. Functions to credit cashback and redeem rewards
-- ============================================

-- 1. Create cashback_rewards table
CREATE TABLE IF NOT EXISTS cashback_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    card_id UUID REFERENCES cards(id) ON DELETE SET NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Cashback details
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SLE',
    percentage_applied DECIMAL(5,2) NOT NULL,

    -- Original transaction info
    original_amount DECIMAL(18,2) NOT NULL,
    transaction_type VARCHAR(50),
    merchant_name VARCHAR(255),

    -- Status tracking
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, CREDITED, REDEEMED, EXPIRED
    credited_at TIMESTAMPTZ,
    redeemed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create cashback_redemptions table
CREATE TABLE IF NOT EXISTS cashback_redemptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,

    -- Redemption details
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SLE',

    -- Processing
    status VARCHAR(30) DEFAULT 'PENDING', -- PENDING, COMPLETED, FAILED
    transaction_id UUID REFERENCES transactions(id),
    processed_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_cashback_rewards_user_id ON cashback_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_cashback_rewards_status ON cashback_rewards(status);
CREATE INDEX IF NOT EXISTS idx_cashback_rewards_card_id ON cashback_rewards(card_id);
CREATE INDEX IF NOT EXISTS idx_cashback_rewards_created_at ON cashback_rewards(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cashback_redemptions_user_id ON cashback_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_cashback_redemptions_status ON cashback_redemptions(status);

-- 4. Create view for user cashback balance
CREATE OR REPLACE VIEW user_cashback_balance AS
SELECT
    user_id,
    currency,
    COALESCE(SUM(CASE WHEN status = 'CREDITED' THEN amount ELSE 0 END), 0) as available_balance,
    COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END), 0) as pending_balance,
    COALESCE(SUM(CASE WHEN status = 'REDEEMED' THEN amount ELSE 0 END), 0) as total_redeemed,
    COALESCE(SUM(amount), 0) as lifetime_earned,
    COUNT(*) as total_rewards
FROM cashback_rewards
GROUP BY user_id, currency;

-- 5. Function to credit cashback for a transaction
CREATE OR REPLACE FUNCTION credit_cashback(
    p_user_id UUID,
    p_card_id UUID,
    p_transaction_id UUID,
    p_original_amount DECIMAL,
    p_cashback_percentage DECIMAL,
    p_transaction_type VARCHAR DEFAULT 'PAYMENT',
    p_merchant_name VARCHAR DEFAULT NULL,
    p_currency VARCHAR DEFAULT 'SLE'
)
RETURNS UUID AS $$
DECLARE
    v_cashback_amount DECIMAL;
    v_reward_id UUID;
    v_expires_at TIMESTAMPTZ;
BEGIN
    -- Calculate cashback amount
    v_cashback_amount := ROUND(p_original_amount * (p_cashback_percentage / 100), 2);

    -- Only create reward if amount > 0
    IF v_cashback_amount <= 0 THEN
        RETURN NULL;
    END IF;

    -- Set expiry (90 days from now)
    v_expires_at := NOW() + INTERVAL '90 days';

    -- Insert cashback reward
    INSERT INTO cashback_rewards (
        user_id,
        card_id,
        transaction_id,
        amount,
        currency,
        percentage_applied,
        original_amount,
        transaction_type,
        merchant_name,
        status,
        credited_at,
        expires_at,
        description
    ) VALUES (
        p_user_id,
        p_card_id,
        p_transaction_id,
        v_cashback_amount,
        p_currency,
        p_cashback_percentage,
        p_original_amount,
        p_transaction_type,
        p_merchant_name,
        'CREDITED',
        NOW(),
        v_expires_at,
        'Cashback reward for ' || COALESCE(p_merchant_name, p_transaction_type)
    )
    RETURNING id INTO v_reward_id;

    RETURN v_reward_id;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to redeem cashback to wallet
CREATE OR REPLACE FUNCTION redeem_cashback(
    p_user_id UUID,
    p_wallet_id UUID,
    p_amount DECIMAL DEFAULT NULL  -- NULL means redeem all available
)
RETURNS TABLE (
    success BOOLEAN,
    redemption_id UUID,
    amount_redeemed DECIMAL,
    message TEXT
) AS $$
DECLARE
    v_available_balance DECIMAL;
    v_redeem_amount DECIMAL;
    v_redemption_id UUID;
    v_transaction_id UUID;
    v_currency VARCHAR;
BEGIN
    -- Get wallet currency
    SELECT currency INTO v_currency FROM wallets WHERE id = p_wallet_id;
    IF v_currency IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'Wallet not found'::TEXT;
        RETURN;
    END IF;

    -- Calculate available balance
    SELECT COALESCE(SUM(amount), 0)
    INTO v_available_balance
    FROM cashback_rewards
    WHERE user_id = p_user_id
      AND currency = v_currency
      AND status = 'CREDITED'
      AND (expires_at IS NULL OR expires_at > NOW());

    -- Determine amount to redeem
    IF p_amount IS NULL THEN
        v_redeem_amount := v_available_balance;
    ELSE
        v_redeem_amount := LEAST(p_amount, v_available_balance);
    END IF;

    -- Check minimum redemption (0.01)
    IF v_redeem_amount < 0.01 THEN
        RETURN QUERY SELECT false, NULL::UUID, 0::DECIMAL, 'Insufficient cashback balance'::TEXT;
        RETURN;
    END IF;

    -- Create redemption record
    INSERT INTO cashback_redemptions (user_id, wallet_id, amount, currency, status)
    VALUES (p_user_id, p_wallet_id, v_redeem_amount, v_currency, 'PENDING')
    RETURNING id INTO v_redemption_id;

    -- Credit wallet
    UPDATE wallets
    SET balance = balance + v_redeem_amount,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    -- Create transaction record
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        status,
        description,
        metadata
    ) VALUES (
        p_wallet_id,
        'CASHBACK_REDEMPTION',
        v_redeem_amount,
        'COMPLETED',
        'Cashback redemption',
        jsonb_build_object('redemption_id', v_redemption_id)
    )
    RETURNING id INTO v_transaction_id;

    -- Update redemption with transaction
    UPDATE cashback_redemptions
    SET transaction_id = v_transaction_id,
        status = 'COMPLETED',
        processed_at = NOW(),
        updated_at = NOW()
    WHERE id = v_redemption_id;

    -- Mark rewards as redeemed (FIFO - oldest first)
    WITH rewards_to_redeem AS (
        SELECT id, amount,
            SUM(amount) OVER (ORDER BY created_at) as running_total
        FROM cashback_rewards
        WHERE user_id = p_user_id
          AND currency = v_currency
          AND status = 'CREDITED'
          AND (expires_at IS NULL OR expires_at > NOW())
        ORDER BY created_at
    )
    UPDATE cashback_rewards
    SET status = 'REDEEMED',
        redeemed_at = NOW(),
        updated_at = NOW()
    WHERE id IN (
        SELECT id FROM rewards_to_redeem
        WHERE running_total <= v_redeem_amount OR amount <= v_redeem_amount
    );

    RETURN QUERY SELECT true, v_redemption_id, v_redeem_amount, 'Cashback redeemed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 7. Function to expire old cashback rewards
CREATE OR REPLACE FUNCTION expire_old_cashback()
RETURNS INTEGER AS $$
DECLARE
    v_expired_count INTEGER;
BEGIN
    UPDATE cashback_rewards
    SET status = 'EXPIRED',
        updated_at = NOW()
    WHERE status = 'CREDITED'
      AND expires_at IS NOT NULL
      AND expires_at < NOW();

    GET DIAGNOSTICS v_expired_count = ROW_COUNT;
    RETURN v_expired_count;
END;
$$ LANGUAGE plpgsql;

-- 8. RLS Policies
ALTER TABLE cashback_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashback_redemptions ENABLE ROW LEVEL SECURITY;

-- Cashback rewards policies
DROP POLICY IF EXISTS "cashback_rewards_select_own" ON cashback_rewards;
CREATE POLICY "cashback_rewards_select_own" ON cashback_rewards
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    ));

DROP POLICY IF EXISTS "cashback_rewards_insert_system" ON cashback_rewards;
CREATE POLICY "cashback_rewards_insert_system" ON cashback_rewards
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "cashback_rewards_update_system" ON cashback_rewards;
CREATE POLICY "cashback_rewards_update_system" ON cashback_rewards
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

-- Cashback redemptions policies
DROP POLICY IF EXISTS "cashback_redemptions_select_own" ON cashback_redemptions;
CREATE POLICY "cashback_redemptions_select_own" ON cashback_redemptions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    ));

DROP POLICY IF EXISTS "cashback_redemptions_insert_own" ON cashback_redemptions;
CREATE POLICY "cashback_redemptions_insert_own" ON cashback_redemptions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cashback_redemptions_update_system" ON cashback_redemptions;
CREATE POLICY "cashback_redemptions_update_system" ON cashback_redemptions
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

-- 9. Grant permissions
GRANT EXECUTE ON FUNCTION credit_cashback(UUID, UUID, UUID, DECIMAL, DECIMAL, VARCHAR, VARCHAR, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION redeem_cashback(UUID, UUID, DECIMAL) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_cashback() TO authenticated;

-- 10. Verify setup
SELECT 'Cashback rewards table created' as status;
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'cashback_rewards' ORDER BY ordinal_position;
