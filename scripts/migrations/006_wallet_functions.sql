-- ============================================
-- Wallet Functions - Production Grade
-- Atomic operations for wallet transactions
-- ============================================

-- 1. Wallet Deposit Function
CREATE OR REPLACE FUNCTION wallet_deposit(
    p_wallet_id UUID,
    p_amount NUMERIC,
    p_reference TEXT DEFAULT NULL,
    p_description TEXT DEFAULT 'Deposit'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_wallet_status TEXT;
BEGIN
    -- Check wallet exists and is active
    SELECT status INTO v_wallet_status
    FROM wallets
    WHERE id = p_wallet_id;

    IF v_wallet_status IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    IF v_wallet_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Wallet is not active';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Update wallet balance
    UPDATE wallets
    SET balance = balance + p_amount,
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
        'DEPOSIT',
        p_amount,
        'SLE',
        'COMPLETED',
        p_description,
        COALESCE(p_reference, 'DEP-' || EXTRACT(EPOCH FROM NOW())::TEXT)
    )
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;

-- 2. Wallet Transfer Function (Atomic)
CREATE OR REPLACE FUNCTION wallet_transfer(
    p_from_wallet_id UUID,
    p_to_wallet_id UUID,
    p_amount NUMERIC,
    p_description TEXT DEFAULT 'Transfer'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_from_balance NUMERIC;
    v_from_status TEXT;
    v_to_status TEXT;
    v_reference TEXT;
BEGIN
    -- Generate reference
    v_reference := 'TRF-' || EXTRACT(EPOCH FROM NOW())::TEXT;

    -- Lock both wallets to prevent race conditions
    SELECT balance, status INTO v_from_balance, v_from_status
    FROM wallets
    WHERE id = p_from_wallet_id
    FOR UPDATE;

    SELECT status INTO v_to_status
    FROM wallets
    WHERE id = p_to_wallet_id
    FOR UPDATE;

    -- Validations
    IF v_from_status IS NULL THEN
        RAISE EXCEPTION 'Source wallet not found';
    END IF;

    IF v_to_status IS NULL THEN
        RAISE EXCEPTION 'Destination wallet not found';
    END IF;

    IF v_from_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Source wallet is not active';
    END IF;

    IF v_to_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Destination wallet is not active';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    IF v_from_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    IF p_from_wallet_id = p_to_wallet_id THEN
        RAISE EXCEPTION 'Cannot transfer to same wallet';
    END IF;

    -- Debit source wallet
    UPDATE wallets
    SET balance = balance - p_amount,
        updated_at = NOW()
    WHERE id = p_from_wallet_id;

    -- Credit destination wallet
    UPDATE wallets
    SET balance = balance + p_amount,
        updated_at = NOW()
    WHERE id = p_to_wallet_id;

    -- Create debit transaction
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        currency,
        status,
        description,
        reference
    ) VALUES (
        p_from_wallet_id,
        'TRANSFER',
        -p_amount,
        'SLE',
        'COMPLETED',
        p_description || ' (sent)',
        v_reference
    )
    RETURNING id INTO v_transaction_id;

    -- Create credit transaction
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        currency,
        status,
        description,
        reference
    ) VALUES (
        p_to_wallet_id,
        'TRANSFER',
        p_amount,
        'SLE',
        'COMPLETED',
        p_description || ' (received)',
        v_reference
    );

    RETURN v_transaction_id;
END;
$$;

-- 3. Wallet Withdrawal Function
CREATE OR REPLACE FUNCTION wallet_withdraw(
    p_wallet_id UUID,
    p_amount NUMERIC,
    p_reference TEXT DEFAULT NULL,
    p_description TEXT DEFAULT 'Withdrawal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_transaction_id UUID;
    v_balance NUMERIC;
    v_status TEXT;
BEGIN
    -- Lock wallet
    SELECT balance, status INTO v_balance, v_status
    FROM wallets
    WHERE id = p_wallet_id
    FOR UPDATE;

    -- Validations
    IF v_status IS NULL THEN
        RAISE EXCEPTION 'Wallet not found';
    END IF;

    IF v_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Wallet is not active';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    IF v_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance';
    END IF;

    -- Update wallet balance
    UPDATE wallets
    SET balance = balance - p_amount,
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
        'WITHDRAWAL',
        -p_amount,
        'SLE',
        'COMPLETED',
        p_description,
        COALESCE(p_reference, 'WTH-' || EXTRACT(EPOCH FROM NOW())::TEXT)
    )
    RETURNING id INTO v_transaction_id;

    RETURN v_transaction_id;
END;
$$;

-- 4. Get Wallet Balance Function
CREATE OR REPLACE FUNCTION get_wallet_balance(p_wallet_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance NUMERIC;
BEGIN
    SELECT balance INTO v_balance
    FROM wallets
    WHERE id = p_wallet_id;

    RETURN COALESCE(v_balance, 0);
END;
$$;

-- 5. Grant permissions
GRANT EXECUTE ON FUNCTION wallet_deposit TO authenticated;
GRANT EXECUTE ON FUNCTION wallet_transfer TO authenticated;
GRANT EXECUTE ON FUNCTION wallet_withdraw TO authenticated;
GRANT EXECUTE ON FUNCTION get_wallet_balance TO authenticated;

-- Done
SELECT 'Wallet functions created successfully!' as status;
