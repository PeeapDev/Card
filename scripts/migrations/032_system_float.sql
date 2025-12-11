-- Migration: System Float (Master Balance Control)
-- Description: Creates a controlled system float wallet to prevent corruption and overspending
-- The platform must not allow any transaction that exceeds the available system float
-- Only superadmin can inject funds, close float, or reset opening balances

-- ============================================
-- SYSTEM FLOAT TABLE (Single Active Row)
-- ============================================
CREATE TABLE IF NOT EXISTS system_float (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    currency VARCHAR(3) NOT NULL,
    opening_balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
    current_balance DECIMAL(20, 2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(20, 2),
    total_inflows DECIMAL(20, 2) NOT NULL DEFAULT 0,
    total_outflows DECIMAL(20, 2) NOT NULL DEFAULT 0,
    cycle_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cycle_end_date TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'suspended')),
    financial_year VARCHAR(10), -- e.g., '2024', '2024-2025'
    description TEXT,
    updated_by UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_system_float_currency ON system_float(currency);
CREATE INDEX IF NOT EXISTS idx_system_float_status ON system_float(status);
CREATE INDEX IF NOT EXISTS idx_system_float_active ON system_float(currency, status) WHERE status = 'active';

-- ============================================
-- SYSTEM FLOAT HISTORY (Immutable Audit Log)
-- ============================================
CREATE TABLE IF NOT EXISTS system_float_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    float_id UUID NOT NULL REFERENCES system_float(id),
    currency VARCHAR(3) NOT NULL,
    amount DECIMAL(20, 2) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('opening', 'replenishment', 'closing', 'adjustment', 'debit', 'credit')),
    previous_balance DECIMAL(20, 2) NOT NULL,
    new_balance DECIMAL(20, 2) NOT NULL,
    description TEXT,
    reference VARCHAR(100),
    transaction_id UUID, -- Link to transaction that caused the change
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for history lookups
CREATE INDEX IF NOT EXISTS idx_float_history_float_id ON system_float_history(float_id);
CREATE INDEX IF NOT EXISTS idx_float_history_type ON system_float_history(type);
CREATE INDEX IF NOT EXISTS idx_float_history_created_at ON system_float_history(created_at);
CREATE INDEX IF NOT EXISTS idx_float_history_currency ON system_float_history(currency);

-- ============================================
-- PREVENT DELETION AND UPDATES ON HISTORY
-- ============================================
CREATE OR REPLACE FUNCTION prevent_float_history_modification()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION 'Deletion of float history records is not allowed';
    ELSIF TG_OP = 'UPDATE' THEN
        RAISE EXCEPTION 'Modification of float history records is not allowed';
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_float_history_delete ON system_float_history;
CREATE TRIGGER prevent_float_history_delete
    BEFORE DELETE OR UPDATE ON system_float_history
    FOR EACH ROW
    EXECUTE FUNCTION prevent_float_history_modification();

-- ============================================
-- FUNCTION: Get Active Float for Currency
-- ============================================
CREATE OR REPLACE FUNCTION get_active_float(p_currency VARCHAR(3))
RETURNS system_float AS $$
DECLARE
    v_float system_float;
BEGIN
    SELECT * INTO v_float
    FROM system_float
    WHERE currency = p_currency AND status = 'active'
    ORDER BY created_at DESC
    LIMIT 1;

    RETURN v_float;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Check Float Availability
-- Returns TRUE if float has enough balance
-- ============================================
CREATE OR REPLACE FUNCTION check_float_availability(
    p_currency VARCHAR(3),
    p_amount DECIMAL(20, 2)
)
RETURNS BOOLEAN AS $$
DECLARE
    v_float system_float;
BEGIN
    v_float := get_active_float(p_currency);

    IF v_float.id IS NULL THEN
        -- No active float for this currency, allow transaction (backward compatibility)
        RETURN TRUE;
    END IF;

    IF v_float.status != 'active' THEN
        RETURN FALSE;
    END IF;

    RETURN v_float.current_balance >= p_amount;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Open New Float (Superadmin Only)
-- ============================================
CREATE OR REPLACE FUNCTION open_system_float(
    p_currency VARCHAR(3),
    p_opening_balance DECIMAL(20, 2),
    p_financial_year VARCHAR(10),
    p_description TEXT,
    p_admin_id UUID
)
RETURNS system_float AS $$
DECLARE
    v_existing system_float;
    v_new_float system_float;
BEGIN
    -- Check if there's already an active float for this currency
    SELECT * INTO v_existing
    FROM system_float
    WHERE currency = p_currency AND status = 'active'
    LIMIT 1;

    IF v_existing.id IS NOT NULL THEN
        RAISE EXCEPTION 'An active float already exists for currency %. Close it first.', p_currency;
    END IF;

    -- Create new float
    INSERT INTO system_float (
        currency,
        opening_balance,
        current_balance,
        total_inflows,
        total_outflows,
        cycle_start_date,
        status,
        financial_year,
        description,
        created_by,
        updated_by
    ) VALUES (
        p_currency,
        p_opening_balance,
        p_opening_balance,
        p_opening_balance,
        0,
        NOW(),
        'active',
        p_financial_year,
        p_description,
        p_admin_id,
        p_admin_id
    ) RETURNING * INTO v_new_float;

    -- Record in history
    INSERT INTO system_float_history (
        float_id,
        currency,
        amount,
        type,
        previous_balance,
        new_balance,
        description,
        reference,
        created_by
    ) VALUES (
        v_new_float.id,
        p_currency,
        p_opening_balance,
        'opening',
        0,
        p_opening_balance,
        p_description,
        'OPENING-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
        p_admin_id
    );

    RETURN v_new_float;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Replenish Float (Superadmin Only)
-- ============================================
CREATE OR REPLACE FUNCTION replenish_system_float(
    p_currency VARCHAR(3),
    p_amount DECIMAL(20, 2),
    p_description TEXT,
    p_admin_id UUID
)
RETURNS system_float AS $$
DECLARE
    v_float system_float;
    v_previous_balance DECIMAL(20, 2);
BEGIN
    -- Get active float
    SELECT * INTO v_float
    FROM system_float
    WHERE currency = p_currency AND status = 'active'
    FOR UPDATE;

    IF v_float.id IS NULL THEN
        RAISE EXCEPTION 'No active float exists for currency %', p_currency;
    END IF;

    v_previous_balance := v_float.current_balance;

    -- Update float balance
    UPDATE system_float
    SET
        current_balance = current_balance + p_amount,
        total_inflows = total_inflows + p_amount,
        updated_by = p_admin_id,
        updated_at = NOW()
    WHERE id = v_float.id
    RETURNING * INTO v_float;

    -- Record in history
    INSERT INTO system_float_history (
        float_id,
        currency,
        amount,
        type,
        previous_balance,
        new_balance,
        description,
        reference,
        created_by
    ) VALUES (
        v_float.id,
        p_currency,
        p_amount,
        'replenishment',
        v_previous_balance,
        v_float.current_balance,
        p_description,
        'REPLENISH-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
        p_admin_id
    );

    RETURN v_float;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Close Float (Superadmin Only)
-- ============================================
CREATE OR REPLACE FUNCTION close_system_float(
    p_currency VARCHAR(3),
    p_description TEXT,
    p_admin_id UUID
)
RETURNS system_float AS $$
DECLARE
    v_float system_float;
    v_previous_balance DECIMAL(20, 2);
BEGIN
    -- Get active float
    SELECT * INTO v_float
    FROM system_float
    WHERE currency = p_currency AND status = 'active'
    FOR UPDATE;

    IF v_float.id IS NULL THEN
        RAISE EXCEPTION 'No active float exists for currency %', p_currency;
    END IF;

    v_previous_balance := v_float.current_balance;

    -- Close the float
    UPDATE system_float
    SET
        closing_balance = current_balance,
        cycle_end_date = NOW(),
        status = 'closed',
        description = COALESCE(description, '') || ' | Closed: ' || p_description,
        updated_by = p_admin_id,
        updated_at = NOW()
    WHERE id = v_float.id
    RETURNING * INTO v_float;

    -- Record in history
    INSERT INTO system_float_history (
        float_id,
        currency,
        amount,
        type,
        previous_balance,
        new_balance,
        description,
        reference,
        created_by
    ) VALUES (
        v_float.id,
        p_currency,
        0,
        'closing',
        v_previous_balance,
        v_float.closing_balance,
        p_description,
        'CLOSING-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
        p_admin_id
    );

    RETURN v_float;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Debit Float (Called during transactions)
-- ============================================
CREATE OR REPLACE FUNCTION debit_system_float(
    p_currency VARCHAR(3),
    p_amount DECIMAL(20, 2),
    p_transaction_id UUID,
    p_description TEXT DEFAULT 'Transaction debit'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_float system_float;
    v_previous_balance DECIMAL(20, 2);
BEGIN
    -- Get active float
    SELECT * INTO v_float
    FROM system_float
    WHERE currency = p_currency AND status = 'active'
    FOR UPDATE;

    -- If no float exists, allow transaction (backward compatibility)
    IF v_float.id IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if enough balance
    IF v_float.current_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient system float. Available: %, Required: %', v_float.current_balance, p_amount;
    END IF;

    v_previous_balance := v_float.current_balance;

    -- Debit the float
    UPDATE system_float
    SET
        current_balance = current_balance - p_amount,
        total_outflows = total_outflows + p_amount,
        updated_at = NOW()
    WHERE id = v_float.id;

    -- Record in history
    INSERT INTO system_float_history (
        float_id,
        currency,
        amount,
        type,
        previous_balance,
        new_balance,
        description,
        reference,
        transaction_id,
        created_by
    ) VALUES (
        v_float.id,
        p_currency,
        p_amount,
        'debit',
        v_previous_balance,
        v_previous_balance - p_amount,
        p_description,
        'DEBIT-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
        p_transaction_id,
        NULL
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Credit Float (When money returns)
-- ============================================
CREATE OR REPLACE FUNCTION credit_system_float(
    p_currency VARCHAR(3),
    p_amount DECIMAL(20, 2),
    p_transaction_id UUID,
    p_description TEXT DEFAULT 'Transaction credit'
)
RETURNS BOOLEAN AS $$
DECLARE
    v_float system_float;
    v_previous_balance DECIMAL(20, 2);
BEGIN
    -- Get active float
    SELECT * INTO v_float
    FROM system_float
    WHERE currency = p_currency AND status = 'active'
    FOR UPDATE;

    -- If no float exists, skip
    IF v_float.id IS NULL THEN
        RETURN TRUE;
    END IF;

    v_previous_balance := v_float.current_balance;

    -- Credit the float
    UPDATE system_float
    SET
        current_balance = current_balance + p_amount,
        total_inflows = total_inflows + p_amount,
        updated_at = NOW()
    WHERE id = v_float.id;

    -- Record in history
    INSERT INTO system_float_history (
        float_id,
        currency,
        amount,
        type,
        previous_balance,
        new_balance,
        description,
        reference,
        transaction_id,
        created_by
    ) VALUES (
        v_float.id,
        p_currency,
        p_amount,
        'credit',
        v_previous_balance,
        v_previous_balance + p_amount,
        p_description,
        'CREDIT-' || TO_CHAR(NOW(), 'YYYYMMDD-HH24MISS'),
        p_transaction_id,
        NULL
    );

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Get Float Summary for Dashboard
-- ============================================
CREATE OR REPLACE FUNCTION get_float_summary()
RETURNS TABLE (
    id UUID,
    currency VARCHAR(3),
    opening_balance DECIMAL(20, 2),
    current_balance DECIMAL(20, 2),
    closing_balance DECIMAL(20, 2),
    total_inflows DECIMAL(20, 2),
    total_outflows DECIMAL(20, 2),
    net_change DECIMAL(20, 2),
    utilization_percentage DECIMAL(5, 2),
    status VARCHAR(20),
    financial_year VARCHAR(10),
    cycle_start_date TIMESTAMPTZ,
    cycle_end_date TIMESTAMPTZ
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        sf.id,
        sf.currency,
        sf.opening_balance,
        sf.current_balance,
        sf.closing_balance,
        sf.total_inflows,
        sf.total_outflows,
        (sf.total_inflows - sf.total_outflows) as net_change,
        CASE
            WHEN sf.opening_balance > 0 THEN
                ROUND(((sf.opening_balance - sf.current_balance) / sf.opening_balance * 100)::DECIMAL, 2)
            ELSE 0
        END as utilization_percentage,
        sf.status,
        sf.financial_year,
        sf.cycle_start_date,
        sf.cycle_end_date
    FROM system_float sf
    ORDER BY sf.status = 'active' DESC, sf.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE system_float ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_float_history ENABLE ROW LEVEL SECURITY;

-- Only superadmin can view and manage float
DROP POLICY IF EXISTS system_float_select ON system_float;
CREATE POLICY system_float_select ON system_float
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (u.roles LIKE '%superadmin%' OR u.roles LIKE '%admin%')
        )
    );

DROP POLICY IF EXISTS system_float_insert ON system_float;
CREATE POLICY system_float_insert ON system_float
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.roles LIKE '%superadmin%'
        )
    );

DROP POLICY IF EXISTS system_float_update ON system_float;
CREATE POLICY system_float_update ON system_float
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND u.roles LIKE '%superadmin%'
        )
    );

-- History is read-only for admin, insert only via functions
DROP POLICY IF EXISTS float_history_select ON system_float_history;
CREATE POLICY float_history_select ON system_float_history
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = auth.uid()
            AND (u.roles LIKE '%superadmin%' OR u.roles LIKE '%admin%')
        )
    );

-- Allow insert from service role (functions run as service role)
DROP POLICY IF EXISTS float_history_insert ON system_float_history;
CREATE POLICY float_history_insert ON system_float_history
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE system_float IS 'Master balance control - prevents corruption and overspending. Only superadmin can inject/close funds.';
COMMENT ON TABLE system_float_history IS 'Immutable audit log of all float operations. Cannot be updated or deleted.';
COMMENT ON FUNCTION check_float_availability IS 'Checks if system has enough float to process a transaction';
COMMENT ON FUNCTION open_system_float IS 'Opens a new financial cycle with opening balance. Superadmin only.';
COMMENT ON FUNCTION replenish_system_float IS 'Adds additional capital to the float. Superadmin only.';
COMMENT ON FUNCTION close_system_float IS 'Closes the financial cycle. Superadmin only.';
COMMENT ON FUNCTION debit_system_float IS 'Called during user transactions to reduce float.';
COMMENT ON FUNCTION credit_system_float IS 'Called when money returns to the system.';
