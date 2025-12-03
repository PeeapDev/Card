-- ============================================
-- Cash-Out System Migration
-- Run this in Supabase SQL Editor
-- ============================================
--
-- This creates:
-- 1. cash_out_requests table for tracking withdrawals
-- 2. agent_locations table for finding nearby agents
-- 3. Functions for cash-out operations
-- ============================================

-- 1. Create agent_locations table
CREATE TABLE IF NOT EXISTS agent_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    business_name VARCHAR(255) NOT NULL,

    -- Location
    address TEXT NOT NULL,
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100) DEFAULT 'Sierra Leone',
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),

    -- Contact
    phone VARCHAR(30),
    whatsapp VARCHAR(30),

    -- Operating hours
    operating_hours JSONB DEFAULT '{"mon": "08:00-18:00", "tue": "08:00-18:00", "wed": "08:00-18:00", "thu": "08:00-18:00", "fri": "08:00-18:00", "sat": "09:00-14:00", "sun": "closed"}',
    is_open_now BOOLEAN DEFAULT false,

    -- Cash availability
    cash_available BOOLEAN DEFAULT true,
    daily_limit DECIMAL(18,2) DEFAULT 50000,
    min_amount DECIMAL(18,2) DEFAULT 10,
    max_amount DECIMAL(18,2) DEFAULT 10000,

    -- Status
    is_active BOOLEAN DEFAULT true,
    verified BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0,
    total_transactions INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create cash_out_requests table
CREATE TABLE IF NOT EXISTS cash_out_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES users(id) ON DELETE SET NULL,
    agent_location_id UUID REFERENCES agent_locations(id) ON DELETE SET NULL,

    -- Request details
    amount DECIMAL(18,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'SLE',
    fee DECIMAL(18,2) DEFAULT 0,
    total_deducted DECIMAL(18,2) NOT NULL,

    -- Verification
    code VARCHAR(6) NOT NULL,
    code_expires_at TIMESTAMPTZ NOT NULL,
    code_verified_at TIMESTAMPTZ,

    -- Status tracking
    status VARCHAR(30) DEFAULT 'PENDING',  -- PENDING, APPROVED, PROCESSING, COMPLETED, CANCELLED, EXPIRED

    -- For QR/NFC scan
    qr_code_data TEXT,

    -- Transaction reference
    wallet_id UUID REFERENCES wallets(id),
    transaction_id UUID REFERENCES transactions(id),

    -- Timestamps
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_agent_locations_agent_id ON agent_locations(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_locations_active ON agent_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_agent_locations_coords ON agent_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_cash_out_requests_user_id ON cash_out_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_cash_out_requests_agent_id ON cash_out_requests(agent_id);
CREATE INDEX IF NOT EXISTS idx_cash_out_requests_status ON cash_out_requests(status);
CREATE INDEX IF NOT EXISTS idx_cash_out_requests_code ON cash_out_requests(code);

-- 4. Generate 6-digit cash-out code
CREATE OR REPLACE FUNCTION generate_cash_out_code()
RETURNS VARCHAR(6) AS $$
DECLARE
    v_code VARCHAR(6);
    v_exists INTEGER;
BEGIN
    LOOP
        v_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
        SELECT COUNT(*) INTO v_exists
        FROM cash_out_requests
        WHERE code = v_code
          AND status IN ('PENDING', 'APPROVED', 'PROCESSING')
          AND code_expires_at > NOW();

        IF v_exists = 0 THEN
            EXIT;
        END IF;
    END LOOP;
    RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- 5. Create cash-out request function
CREATE OR REPLACE FUNCTION create_cash_out_request(
    p_user_id UUID,
    p_amount DECIMAL,
    p_wallet_id UUID,
    p_agent_location_id UUID DEFAULT NULL,
    p_currency VARCHAR DEFAULT 'SLE'
)
RETURNS TABLE (
    success BOOLEAN,
    request_id UUID,
    code VARCHAR(6),
    message TEXT
) AS $$
DECLARE
    v_code VARCHAR(6);
    v_request_id UUID;
    v_wallet_balance DECIMAL;
    v_fee DECIMAL;
    v_total DECIMAL;
    v_code_expires TIMESTAMPTZ;
BEGIN
    -- Calculate fee (1% with minimum of 1)
    v_fee := GREATEST(ROUND(p_amount * 0.01, 2), 1);
    v_total := p_amount + v_fee;

    -- Check wallet balance
    SELECT balance INTO v_wallet_balance FROM wallets WHERE id = p_wallet_id;

    IF v_wallet_balance IS NULL THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(6), 'Wallet not found'::TEXT;
        RETURN;
    END IF;

    IF v_wallet_balance < v_total THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR(6), 'Insufficient balance'::TEXT;
        RETURN;
    END IF;

    -- Generate code
    v_code := generate_cash_out_code();
    v_code_expires := NOW() + INTERVAL '30 minutes';

    -- Deduct from wallet (hold)
    UPDATE wallets
    SET balance = balance - v_total,
        updated_at = NOW()
    WHERE id = p_wallet_id;

    -- Create request
    INSERT INTO cash_out_requests (
        user_id,
        agent_location_id,
        amount,
        currency,
        fee,
        total_deducted,
        code,
        code_expires_at,
        wallet_id,
        status,
        qr_code_data
    ) VALUES (
        p_user_id,
        p_agent_location_id,
        p_amount,
        p_currency,
        v_fee,
        v_total,
        v_code,
        v_code_expires,
        p_wallet_id,
        'PENDING',
        'CASHOUT_' || p_user_id::TEXT || '_' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT
    )
    RETURNING id INTO v_request_id;

    RETURN QUERY SELECT true, v_request_id, v_code, 'Cash-out request created successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 6. Verify and complete cash-out (agent side)
CREATE OR REPLACE FUNCTION complete_cash_out(
    p_code VARCHAR(6),
    p_agent_id UUID
)
RETURNS TABLE (
    success BOOLEAN,
    request_id UUID,
    amount DECIMAL,
    user_name TEXT,
    message TEXT
) AS $$
DECLARE
    v_request RECORD;
    v_user_name TEXT;
    v_transaction_id UUID;
BEGIN
    -- Find the request by code
    SELECT * INTO v_request
    FROM cash_out_requests
    WHERE code = p_code
      AND status IN ('PENDING', 'APPROVED')
      AND code_expires_at > NOW();

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::DECIMAL, NULL::TEXT, 'Invalid or expired code'::TEXT;
        RETURN;
    END IF;

    -- Get user name
    SELECT CONCAT(first_name, ' ', last_name) INTO v_user_name
    FROM users WHERE id = v_request.user_id;

    -- Create transaction record
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        status,
        description,
        metadata
    ) VALUES (
        v_request.wallet_id,
        'CASH_OUT',
        -v_request.total_deducted,
        'COMPLETED',
        'Cash withdrawal at agent',
        jsonb_build_object('cash_out_id', v_request.id, 'agent_id', p_agent_id, 'code', p_code)
    )
    RETURNING id INTO v_transaction_id;

    -- Update request
    UPDATE cash_out_requests
    SET status = 'COMPLETED',
        agent_id = p_agent_id,
        code_verified_at = NOW(),
        completed_at = NOW(),
        transaction_id = v_transaction_id,
        updated_at = NOW()
    WHERE id = v_request.id;

    -- Update agent stats
    UPDATE agent_locations
    SET total_transactions = total_transactions + 1,
        updated_at = NOW()
    WHERE agent_id = p_agent_id;

    RETURN QUERY SELECT true, v_request.id, v_request.amount, v_user_name, 'Cash-out completed successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 7. Cancel cash-out request
CREATE OR REPLACE FUNCTION cancel_cash_out(
    p_request_id UUID,
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    v_request RECORD;
BEGIN
    -- Find the request
    SELECT * INTO v_request
    FROM cash_out_requests
    WHERE id = p_request_id
      AND user_id = p_user_id
      AND status = 'PENDING';

    IF NOT FOUND THEN
        RETURN QUERY SELECT false, 'Request not found or cannot be cancelled'::TEXT;
        RETURN;
    END IF;

    -- Refund wallet
    UPDATE wallets
    SET balance = balance + v_request.total_deducted,
        updated_at = NOW()
    WHERE id = v_request.wallet_id;

    -- Update request
    UPDATE cash_out_requests
    SET status = 'CANCELLED',
        cancelled_at = NOW(),
        cancel_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_request_id;

    RETURN QUERY SELECT true, 'Cash-out request cancelled and funds refunded'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 8. Expire old requests (run periodically)
CREATE OR REPLACE FUNCTION expire_old_cash_out_requests()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_request RECORD;
BEGIN
    FOR v_request IN
        SELECT * FROM cash_out_requests
        WHERE status = 'PENDING' AND code_expires_at < NOW()
    LOOP
        -- Refund wallet
        UPDATE wallets
        SET balance = balance + v_request.total_deducted,
            updated_at = NOW()
        WHERE id = v_request.wallet_id;

        -- Mark as expired
        UPDATE cash_out_requests
        SET status = 'EXPIRED',
            updated_at = NOW()
        WHERE id = v_request.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 9. RLS Policies
ALTER TABLE agent_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cash_out_requests ENABLE ROW LEVEL SECURITY;

-- Agent locations - public read, agent write
DROP POLICY IF EXISTS "agent_locations_select_all" ON agent_locations;
CREATE POLICY "agent_locations_select_all" ON agent_locations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "agent_locations_insert_agent" ON agent_locations;
CREATE POLICY "agent_locations_insert_agent" ON agent_locations
    FOR INSERT TO authenticated
    WITH CHECK (agent_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    ));

DROP POLICY IF EXISTS "agent_locations_update_agent" ON agent_locations;
CREATE POLICY "agent_locations_update_agent" ON agent_locations
    FOR UPDATE TO authenticated
    USING (agent_id = auth.uid() OR EXISTS (
        SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN')
    ));

-- Cash-out requests - user and agent access
DROP POLICY IF EXISTS "cash_out_select_own" ON cash_out_requests;
CREATE POLICY "cash_out_select_own" ON cash_out_requests
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR agent_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('ADMIN', 'SUPER_ADMIN', 'AGENT')
        )
    );

DROP POLICY IF EXISTS "cash_out_insert_user" ON cash_out_requests;
CREATE POLICY "cash_out_insert_user" ON cash_out_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "cash_out_update_system" ON cash_out_requests;
CREATE POLICY "cash_out_update_system" ON cash_out_requests
    FOR UPDATE TO authenticated
    USING (true) WITH CHECK (true);

-- 10. Grant permissions
GRANT EXECUTE ON FUNCTION generate_cash_out_code() TO authenticated;
GRANT EXECUTE ON FUNCTION create_cash_out_request(UUID, DECIMAL, UUID, UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_cash_out(VARCHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_cash_out(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_cash_out_requests() TO authenticated;

-- 11. Verify
SELECT 'Cash-out system tables created' as status;
