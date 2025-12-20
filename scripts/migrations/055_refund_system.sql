-- Refund System Migration
-- Creates the refund_requests table and related functions
-- Refund period: 5 days before funds are released to recipient

-- =====================================================
-- REFUND REQUESTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Transaction reference
    reference VARCHAR(100) UNIQUE NOT NULL,
    original_transaction_id UUID REFERENCES transactions(id),

    -- Sender (the one initiating the refund)
    sender_id UUID NOT NULL REFERENCES users(id),
    sender_wallet_id UUID NOT NULL REFERENCES wallets(id),

    -- Recipient (the one receiving the refund)
    recipient_id UUID NOT NULL REFERENCES users(id),
    recipient_wallet_id UUID NOT NULL REFERENCES wallets(id),

    -- Amount details
    amount DECIMAL(18, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'SLE',

    -- Refund reason/note
    reason TEXT,

    -- Status: pending, completed, cancelled, expired
    status VARCHAR(20) DEFAULT 'pending',

    -- Status for each party
    sender_status VARCHAR(20) DEFAULT 'completed', -- Shows as completed for sender
    recipient_status VARCHAR(20) DEFAULT 'pending', -- Shows as pending for recipient

    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    release_at TIMESTAMPTZ NOT NULL, -- When funds will be released (5 days after creation)
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Cancellation details
    cancelled_by UUID REFERENCES users(id),
    cancellation_reason TEXT,

    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Audit
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_refund_requests_sender ON refund_requests(sender_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_recipient ON refund_requests(recipient_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status ON refund_requests(status);
CREATE INDEX IF NOT EXISTS idx_refund_requests_release_at ON refund_requests(release_at);
CREATE INDEX IF NOT EXISTS idx_refund_requests_reference ON refund_requests(reference);

-- =====================================================
-- RLS POLICIES FOR REFUND REQUESTS
-- =====================================================
ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own refund requests (as sender or recipient)
DROP POLICY IF EXISTS refund_requests_select_own ON refund_requests;
CREATE POLICY refund_requests_select_own ON refund_requests
    FOR SELECT
    USING (
        auth.uid() = sender_id OR
        auth.uid() = recipient_id OR
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND (roles::text LIKE '%admin%' OR roles::text LIKE '%superadmin%')
        )
    );

-- Users can insert refund requests (as sender)
DROP POLICY IF EXISTS refund_requests_insert ON refund_requests;
CREATE POLICY refund_requests_insert ON refund_requests
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

-- Users can update refund requests (recipient can cancel, sender can update metadata)
DROP POLICY IF EXISTS refund_requests_update ON refund_requests;
CREATE POLICY refund_requests_update ON refund_requests
    FOR UPDATE
    USING (
        auth.uid() = sender_id OR
        auth.uid() = recipient_id OR
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND (roles::text LIKE '%admin%' OR roles::text LIKE '%superadmin%')
        )
    );

-- =====================================================
-- FUNCTION: Create Refund Request
-- =====================================================
CREATE OR REPLACE FUNCTION create_refund_request(
    p_sender_id UUID,
    p_recipient_id UUID,
    p_amount DECIMAL(18, 2),
    p_reason TEXT DEFAULT NULL,
    p_original_transaction_id UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_sender_wallet_id UUID;
    v_recipient_wallet_id UUID;
    v_sender_balance DECIMAL(18, 2);
    v_reference VARCHAR(100);
    v_release_at TIMESTAMPTZ;
    v_refund_id UUID;
    v_transaction_id UUID;
BEGIN
    -- Generate reference
    v_reference := 'REF-' || to_char(NOW(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 8);

    -- Calculate release date (5 days from now)
    v_release_at := NOW() + INTERVAL '5 days';

    -- Get sender's primary wallet
    SELECT id INTO v_sender_wallet_id
    FROM wallets
    WHERE user_id = p_sender_id AND status = 'ACTIVE'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_sender_wallet_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Sender wallet not found');
    END IF;

    -- Get recipient's primary wallet
    SELECT id INTO v_recipient_wallet_id
    FROM wallets
    WHERE user_id = p_recipient_id AND status = 'ACTIVE'
    ORDER BY created_at ASC
    LIMIT 1;

    IF v_recipient_wallet_id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Recipient wallet not found');
    END IF;

    -- Check sender's balance
    SELECT balance INTO v_sender_balance
    FROM wallets
    WHERE id = v_sender_wallet_id
    FOR UPDATE;

    IF v_sender_balance < p_amount THEN
        RETURN json_build_object('success', false, 'error', 'Insufficient balance');
    END IF;

    -- Deduct from sender's wallet
    UPDATE wallets
    SET balance = balance - p_amount,
        available_balance = COALESCE(available_balance, balance) - p_amount,
        updated_at = NOW()
    WHERE id = v_sender_wallet_id;

    -- Create refund request
    INSERT INTO refund_requests (
        reference,
        original_transaction_id,
        sender_id,
        sender_wallet_id,
        recipient_id,
        recipient_wallet_id,
        amount,
        reason,
        status,
        sender_status,
        recipient_status,
        release_at
    ) VALUES (
        v_reference,
        p_original_transaction_id,
        p_sender_id,
        v_sender_wallet_id,
        p_recipient_id,
        v_recipient_wallet_id,
        p_amount,
        p_reason,
        'pending',
        'completed',
        'pending',
        v_release_at
    ) RETURNING id INTO v_refund_id;

    -- Create transaction record for sender (shows as completed/sent)
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        currency,
        status,
        description,
        reference,
        user_id,
        metadata
    ) VALUES (
        v_sender_wallet_id,
        'refund',
        -p_amount,
        'SLE',
        'completed',
        COALESCE(p_reason, 'Refund sent'),
        v_reference,
        p_sender_id,
        jsonb_build_object('refund_id', v_refund_id, 'recipient_id', p_recipient_id, 'type', 'refund_sent')
    ) RETURNING id INTO v_transaction_id;

    -- Create transaction record for recipient (shows as pending)
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        currency,
        status,
        description,
        reference,
        user_id,
        metadata
    ) VALUES (
        v_recipient_wallet_id,
        'refund',
        p_amount,
        'SLE',
        'pending',
        COALESCE(p_reason, 'Refund pending - available in 5 days'),
        v_reference,
        p_recipient_id,
        jsonb_build_object('refund_id', v_refund_id, 'sender_id', p_sender_id, 'type', 'refund_received', 'release_at', v_release_at)
    );

    RETURN json_build_object(
        'success', true,
        'refund_id', v_refund_id,
        'reference', v_reference,
        'amount', p_amount,
        'release_at', v_release_at,
        'transaction_id', v_transaction_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Cancel Refund (by recipient)
-- =====================================================
CREATE OR REPLACE FUNCTION cancel_refund_request(
    p_refund_id UUID,
    p_cancelled_by UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
    v_refund refund_requests%ROWTYPE;
    v_is_recipient BOOLEAN;
BEGIN
    -- Get refund request
    SELECT * INTO v_refund
    FROM refund_requests
    WHERE id = p_refund_id
    FOR UPDATE;

    IF v_refund.id IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Refund request not found');
    END IF;

    -- Check if already processed
    IF v_refund.status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Refund request is already ' || v_refund.status);
    END IF;

    -- Check if user is the recipient
    v_is_recipient := (p_cancelled_by = v_refund.recipient_id);

    IF NOT v_is_recipient THEN
        -- Check if admin
        IF NOT EXISTS (
            SELECT 1 FROM users
            WHERE id = p_cancelled_by
            AND (roles::text LIKE '%admin%' OR roles::text LIKE '%superadmin%')
        ) THEN
            RETURN json_build_object('success', false, 'error', 'Only the recipient can cancel a refund');
        END IF;
    END IF;

    -- Return money to sender's wallet
    UPDATE wallets
    SET balance = balance + v_refund.amount,
        available_balance = COALESCE(available_balance, balance) + v_refund.amount,
        updated_at = NOW()
    WHERE id = v_refund.sender_wallet_id;

    -- Update refund request status
    UPDATE refund_requests
    SET status = 'cancelled',
        sender_status = 'refunded',
        recipient_status = 'cancelled',
        cancelled_at = NOW(),
        cancelled_by = p_cancelled_by,
        cancellation_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_refund_id;

    -- Update sender's transaction to show refund returned
    UPDATE transactions
    SET status = 'reversed',
        description = 'Refund cancelled - money returned',
        updated_at = NOW()
    WHERE reference = v_refund.reference
    AND wallet_id = v_refund.sender_wallet_id;

    -- Update recipient's transaction to show cancelled
    UPDATE transactions
    SET status = 'cancelled',
        description = COALESCE(p_reason, 'Refund cancelled by recipient'),
        updated_at = NOW()
    WHERE reference = v_refund.reference
    AND wallet_id = v_refund.recipient_wallet_id;

    -- Create a new transaction for sender showing returned funds
    INSERT INTO transactions (
        wallet_id,
        type,
        amount,
        currency,
        status,
        description,
        reference,
        user_id,
        metadata
    ) VALUES (
        v_refund.sender_wallet_id,
        'refund_return',
        v_refund.amount,
        v_refund.currency,
        'completed',
        'Refund returned - recipient declined',
        v_refund.reference || '-RET',
        v_refund.sender_id,
        jsonb_build_object('refund_id', p_refund_id, 'original_reference', v_refund.reference)
    );

    RETURN json_build_object(
        'success', true,
        'message', 'Refund cancelled and money returned to sender',
        'refund_id', p_refund_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCTION: Process Pending Refunds (to be called by cron)
-- =====================================================
CREATE OR REPLACE FUNCTION process_pending_refunds()
RETURNS JSON AS $$
DECLARE
    v_refund refund_requests%ROWTYPE;
    v_processed INTEGER := 0;
    v_errors INTEGER := 0;
BEGIN
    -- Find all pending refunds where release_at has passed
    FOR v_refund IN
        SELECT * FROM refund_requests
        WHERE status = 'pending'
        AND release_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        BEGIN
            -- Credit recipient's wallet
            UPDATE wallets
            SET balance = balance + v_refund.amount,
                available_balance = COALESCE(available_balance, balance) + v_refund.amount,
                updated_at = NOW()
            WHERE id = v_refund.recipient_wallet_id;

            -- Update refund request status
            UPDATE refund_requests
            SET status = 'completed',
                sender_status = 'completed',
                recipient_status = 'completed',
                completed_at = NOW(),
                updated_at = NOW()
            WHERE id = v_refund.id;

            -- Update recipient's transaction to completed
            UPDATE transactions
            SET status = 'completed',
                description = 'Refund received',
                updated_at = NOW()
            WHERE reference = v_refund.reference
            AND wallet_id = v_refund.recipient_wallet_id;

            v_processed := v_processed + 1;
        EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors + 1;
            RAISE NOTICE 'Error processing refund %: %', v_refund.id, SQLERRM;
        END;
    END LOOP;

    RETURN json_build_object(
        'success', true,
        'processed', v_processed,
        'errors', v_errors
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION create_refund_request TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_refund_request TO authenticated;
GRANT EXECUTE ON FUNCTION process_pending_refunds TO service_role;

-- =====================================================
-- Output confirmation
-- =====================================================
SELECT 'Refund system migration completed successfully!' as message;
