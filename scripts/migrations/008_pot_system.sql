-- ============================================
-- Pot (Locked Wallet) System Migration
-- A dedicated locked-savings wallet system
-- ============================================

-- 1. Create pots table
CREATE TABLE IF NOT EXISTS pots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_amount DECIMAL(18,2),
    target_amount DECIMAL(18,2), -- Alias for goal_amount for compatibility
    maturity_date TIMESTAMPTZ,
    lock_type VARCHAR(30) DEFAULT 'time_based' CHECK (lock_type IN ('time_based', 'goal_based', 'manual', 'hybrid')),
    lock_period_days INTEGER,
    lock_end_date TIMESTAMPTZ,

    -- Auto-deposit settings
    auto_deposit_enabled BOOLEAN DEFAULT false,
    auto_deposit_amount DECIMAL(18,2),
    auto_deposit_frequency VARCHAR(20) CHECK (auto_deposit_frequency IN ('daily', 'weekly', 'bi_weekly', 'monthly')),
    auto_deposit_day INTEGER, -- Day of week (1-7) or day of month (1-31)
    source_wallet_id UUID REFERENCES wallets(id) ON DELETE SET NULL,
    next_auto_deposit_date TIMESTAMPTZ,
    last_auto_deposit_date TIMESTAMPTZ,

    -- Status fields
    status VARCHAR(30) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'LOCKED', 'UNLOCKED', 'CLOSED', 'FROZEN')),
    lock_status VARCHAR(30) DEFAULT 'LOCKED' CHECK (lock_status IN ('LOCKED', 'UNLOCKING', 'UNLOCKED', 'PARTIALLY_LOCKED')),
    withdrawal_enabled BOOLEAN DEFAULT false,

    -- Unlock tracking
    unlocked_at TIMESTAMPTZ,
    unlock_reason VARCHAR(255),

    -- Admin override
    admin_locked BOOLEAN DEFAULT false,
    admin_locked_by UUID REFERENCES users(id),
    admin_locked_at TIMESTAMPTZ,
    admin_lock_reason TEXT,

    -- Metadata
    icon VARCHAR(50) DEFAULT 'piggy-bank',
    color VARCHAR(20) DEFAULT '#4F46E5',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create pot_transactions table for contribution/withdrawal history
CREATE TABLE IF NOT EXISTS pot_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
    transaction_id UUID, -- Reference to main transactions table if applicable
    transaction_type VARCHAR(30) NOT NULL CHECK (transaction_type IN (
        'contribution', 'withdrawal', 'auto_deposit',
        'penalty', 'interest', 'bonus', 'fee', 'refund'
    )),
    amount DECIMAL(18,2) NOT NULL,
    balance_after DECIMAL(18,2),
    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
    description TEXT,
    source_wallet_id UUID REFERENCES wallets(id),
    destination_wallet_id UUID REFERENCES wallets(id),
    reference VARCHAR(100),
    failure_reason TEXT,
    retry_count INTEGER DEFAULT 0,
    scheduled_at TIMESTAMPTZ,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create pot_rules table for configurable rules
CREATE TABLE IF NOT EXISTS pot_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN (
        'early_withdrawal_penalty', 'min_contribution', 'max_contribution',
        'withdrawal_limit', 'contribution_frequency', 'goal_milestone_bonus',
        'unlock_condition', 'interest_rate'
    )),
    rule_config JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create pot_scheduled_deposits table for tracking auto-deposits
CREATE TABLE IF NOT EXISTS pot_scheduled_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
    source_wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    amount DECIMAL(18,2) NOT NULL,
    frequency VARCHAR(20) NOT NULL,
    scheduled_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED', 'CANCELLED')),
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    last_attempt_at TIMESTAMPTZ,
    failure_reason TEXT,
    pot_transaction_id UUID REFERENCES pot_transactions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

-- 5. Create pot_notifications table
CREATE TABLE IF NOT EXISTS pot_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pot_id UUID NOT NULL REFERENCES pots(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL CHECK (notification_type IN (
        'pot_created', 'contribution_received', 'contribution_failed',
        'auto_deposit_success', 'auto_deposit_failed', 'goal_reached',
        'pot_unlocked', 'pot_matured', 'withdrawal_processed',
        'pot_frozen', 'pot_unfrozen', 'reminder'
    )),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 6. Create pot_settings table for global pot configuration
CREATE TABLE IF NOT EXISTS pot_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pot settings
INSERT INTO pot_settings (setting_key, setting_value, description) VALUES
('max_pots_per_user', '{"value": 10}', 'Maximum number of pots a user can create'),
('min_contribution_amount', '{"value": 1.00, "currency": "SLE"}', 'Minimum contribution amount'),
('max_contribution_amount', '{"value": 1000000.00, "currency": "SLE"}', 'Maximum contribution amount per transaction'),
('min_lock_period_days', '{"value": 7}', 'Minimum lock period in days'),
('max_lock_period_days', '{"value": 3650}', 'Maximum lock period (10 years)'),
('early_withdrawal_penalty_percent', '{"value": 5.0}', 'Default penalty percentage for early withdrawal'),
('auto_deposit_retry_hours', '{"value": 24}', 'Hours between auto-deposit retry attempts')
ON CONFLICT (setting_key) DO NOTHING;

-- 7. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pots_user_id ON pots(user_id);
CREATE INDEX IF NOT EXISTS idx_pots_status ON pots(status);
CREATE INDEX IF NOT EXISTS idx_pots_lock_status ON pots(lock_status);
CREATE INDEX IF NOT EXISTS idx_pots_lock_end_date ON pots(lock_end_date);
CREATE INDEX IF NOT EXISTS idx_pots_maturity_date ON pots(maturity_date);
CREATE INDEX IF NOT EXISTS idx_pots_next_auto_deposit ON pots(next_auto_deposit_date) WHERE auto_deposit_enabled = true;

CREATE INDEX IF NOT EXISTS idx_pot_transactions_pot_id ON pot_transactions(pot_id);
CREATE INDEX IF NOT EXISTS idx_pot_transactions_type ON pot_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_pot_transactions_status ON pot_transactions(status);
CREATE INDEX IF NOT EXISTS idx_pot_transactions_created ON pot_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_pot_scheduled_deposits_pot ON pot_scheduled_deposits(pot_id);
CREATE INDEX IF NOT EXISTS idx_pot_scheduled_deposits_date ON pot_scheduled_deposits(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_pot_scheduled_deposits_status ON pot_scheduled_deposits(status);

CREATE INDEX IF NOT EXISTS idx_pot_notifications_user ON pot_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_pot_notifications_unread ON pot_notifications(user_id, is_read) WHERE is_read = false;

-- 8. Function to create a new pot with associated wallet
CREATE OR REPLACE FUNCTION create_pot(
    p_user_id UUID,
    p_name VARCHAR(255),
    p_description TEXT DEFAULT NULL,
    p_goal_amount DECIMAL DEFAULT NULL,
    p_lock_type VARCHAR DEFAULT 'time_based',
    p_lock_period_days INTEGER DEFAULT 30,
    p_maturity_date TIMESTAMPTZ DEFAULT NULL,
    p_auto_deposit_enabled BOOLEAN DEFAULT false,
    p_auto_deposit_amount DECIMAL DEFAULT NULL,
    p_auto_deposit_frequency VARCHAR DEFAULT NULL,
    p_source_wallet_id UUID DEFAULT NULL,
    p_icon VARCHAR DEFAULT 'piggy-bank',
    p_color VARCHAR DEFAULT '#4F46E5'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pot_id UUID;
    v_wallet_id UUID;
    v_lock_end_date TIMESTAMPTZ;
    v_next_auto_deposit TIMESTAMPTZ;
    v_pot_count INTEGER;
    v_max_pots INTEGER;
BEGIN
    -- Check max pots limit
    SELECT (setting_value->>'value')::INTEGER INTO v_max_pots
    FROM pot_settings WHERE setting_key = 'max_pots_per_user';

    SELECT COUNT(*) INTO v_pot_count
    FROM pots WHERE user_id = p_user_id AND status NOT IN ('CLOSED');

    IF v_pot_count >= COALESCE(v_max_pots, 10) THEN
        RAISE EXCEPTION 'Maximum number of pots reached';
    END IF;

    -- Calculate lock end date
    IF p_maturity_date IS NOT NULL THEN
        v_lock_end_date := p_maturity_date;
    ELSIF p_lock_period_days IS NOT NULL AND p_lock_period_days > 0 THEN
        v_lock_end_date := NOW() + (p_lock_period_days || ' days')::INTERVAL;
    END IF;

    -- Create a dedicated wallet for the pot
    INSERT INTO wallets (external_id, user_id, wallet_type, currency, balance, status)
    VALUES (
        'pot_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8),
        p_user_id,
        'pot',
        'SLE',
        0.00,
        'ACTIVE'
    )
    RETURNING id INTO v_wallet_id;

    -- Calculate next auto-deposit date
    IF p_auto_deposit_enabled AND p_auto_deposit_frequency IS NOT NULL THEN
        v_next_auto_deposit := CASE p_auto_deposit_frequency
            WHEN 'daily' THEN NOW() + INTERVAL '1 day'
            WHEN 'weekly' THEN NOW() + INTERVAL '1 week'
            WHEN 'bi_weekly' THEN NOW() + INTERVAL '2 weeks'
            WHEN 'monthly' THEN NOW() + INTERVAL '1 month'
            ELSE NOW() + INTERVAL '1 day'
        END;
    END IF;

    -- Create the pot
    INSERT INTO pots (
        user_id, wallet_id, name, description, goal_amount, target_amount,
        lock_type, lock_period_days, lock_end_date, maturity_date,
        auto_deposit_enabled, auto_deposit_amount, auto_deposit_frequency,
        source_wallet_id, next_auto_deposit_date, icon, color,
        status, lock_status
    ) VALUES (
        p_user_id, v_wallet_id, p_name, p_description, p_goal_amount, p_goal_amount,
        p_lock_type, p_lock_period_days, v_lock_end_date, COALESCE(p_maturity_date, v_lock_end_date),
        p_auto_deposit_enabled, p_auto_deposit_amount, p_auto_deposit_frequency,
        p_source_wallet_id, v_next_auto_deposit, p_icon, p_color,
        'ACTIVE', 'LOCKED'
    )
    RETURNING id INTO v_pot_id;

    -- Create initial notification
    INSERT INTO pot_notifications (pot_id, user_id, notification_type, title, message)
    VALUES (v_pot_id, p_user_id, 'pot_created', 'Pot Created',
            'Your savings pot "' || p_name || '" has been created successfully!');

    RETURN v_pot_id;
END;
$$;

-- 9. Function to contribute to a pot
CREATE OR REPLACE FUNCTION contribute_to_pot(
    p_pot_id UUID,
    p_source_wallet_id UUID,
    p_amount DECIMAL,
    p_description TEXT DEFAULT 'Contribution'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pot RECORD;
    v_source_balance DECIMAL;
    v_source_status TEXT;
    v_transaction_id UUID;
    v_pot_transaction_id UUID;
    v_new_balance DECIMAL;
BEGIN
    -- Lock and get pot details
    SELECT * INTO v_pot FROM pots WHERE id = p_pot_id FOR UPDATE;

    IF v_pot IS NULL THEN
        RAISE EXCEPTION 'Pot not found';
    END IF;

    IF v_pot.status NOT IN ('ACTIVE', 'LOCKED') THEN
        RAISE EXCEPTION 'Pot is not accepting contributions';
    END IF;

    IF v_pot.admin_locked THEN
        RAISE EXCEPTION 'Pot is locked by administrator';
    END IF;

    -- Lock and validate source wallet
    SELECT balance, status INTO v_source_balance, v_source_status
    FROM wallets WHERE id = p_source_wallet_id FOR UPDATE;

    IF v_source_status IS NULL THEN
        RAISE EXCEPTION 'Source wallet not found';
    END IF;

    IF v_source_status != 'ACTIVE' THEN
        RAISE EXCEPTION 'Source wallet is not active';
    END IF;

    IF v_source_balance < p_amount THEN
        RAISE EXCEPTION 'Insufficient balance in source wallet';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Debit source wallet
    UPDATE wallets
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = p_source_wallet_id;

    -- Credit pot wallet
    UPDATE wallets
    SET balance = balance + p_amount, updated_at = NOW()
    WHERE id = v_pot.wallet_id
    RETURNING balance INTO v_new_balance;

    -- Create transaction in main transactions table
    INSERT INTO transactions (
        wallet_id, type, amount, currency, status, description,
        reference
    ) VALUES (
        v_pot.wallet_id, 'DEPOSIT', p_amount, 'SLE', 'COMPLETED',
        'Pot contribution: ' || p_description,
        'POT-' || v_pot.id || '-' || EXTRACT(EPOCH FROM NOW())::TEXT
    )
    RETURNING id INTO v_transaction_id;

    -- Create pot transaction record
    INSERT INTO pot_transactions (
        pot_id, transaction_id, transaction_type, amount, balance_after,
        status, description, source_wallet_id, reference, processed_at
    ) VALUES (
        p_pot_id, v_transaction_id, 'contribution', p_amount, v_new_balance,
        'COMPLETED', p_description, p_source_wallet_id,
        'CTB-' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW()
    )
    RETURNING id INTO v_pot_transaction_id;

    -- Update pot updated_at
    UPDATE pots SET updated_at = NOW() WHERE id = p_pot_id;

    -- Check if goal is reached
    IF v_pot.goal_amount IS NOT NULL AND v_new_balance >= v_pot.goal_amount THEN
        INSERT INTO pot_notifications (pot_id, user_id, notification_type, title, message)
        VALUES (p_pot_id, v_pot.user_id, 'goal_reached', 'Goal Reached!',
                'Congratulations! Your pot "' || v_pot.name || '" has reached its savings goal!');
    END IF;

    RETURN v_pot_transaction_id;
END;
$$;

-- 10. Function to check withdrawal eligibility
CREATE OR REPLACE FUNCTION check_pot_withdrawal_eligibility(p_pot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pot RECORD;
    v_wallet_balance DECIMAL;
    v_result JSONB;
    v_can_withdraw BOOLEAN := false;
    v_reason TEXT := '';
    v_days_until_unlock INTEGER;
    v_penalty_percent DECIMAL;
BEGIN
    SELECT p.*, w.balance as wallet_balance
    INTO v_pot
    FROM pots p
    LEFT JOIN wallets w ON p.wallet_id = w.id
    WHERE p.id = p_pot_id;

    IF v_pot IS NULL THEN
        RETURN jsonb_build_object('error', 'Pot not found');
    END IF;

    v_wallet_balance := COALESCE(v_pot.wallet_balance, 0);

    -- Check if pot is admin locked
    IF v_pot.admin_locked THEN
        RETURN jsonb_build_object(
            'can_withdraw', false,
            'lock_status', 'admin_locked',
            'reason', 'Pot is locked by administrator',
            'current_balance', v_wallet_balance
        );
    END IF;

    -- Check if pot is closed
    IF v_pot.status = 'CLOSED' THEN
        RETURN jsonb_build_object(
            'can_withdraw', false,
            'lock_status', 'closed',
            'reason', 'Pot has been closed',
            'current_balance', v_wallet_balance
        );
    END IF;

    -- Check lock status based on lock type
    IF v_pot.lock_type = 'time_based' OR v_pot.lock_type = 'hybrid' THEN
        IF v_pot.lock_end_date IS NOT NULL AND v_pot.lock_end_date > NOW() THEN
            v_days_until_unlock := EXTRACT(DAY FROM (v_pot.lock_end_date - NOW()))::INTEGER;

            -- Get penalty percentage
            SELECT (setting_value->>'value')::DECIMAL INTO v_penalty_percent
            FROM pot_settings WHERE setting_key = 'early_withdrawal_penalty_percent';

            RETURN jsonb_build_object(
                'can_withdraw', false,
                'can_withdraw_with_penalty', true,
                'lock_status', 'locked',
                'lock_end_date', v_pot.lock_end_date,
                'days_until_unlock', v_days_until_unlock,
                'penalty_percent', COALESCE(v_penalty_percent, 5.0),
                'current_balance', v_wallet_balance,
                'max_withdrawal_amount', v_wallet_balance,
                'withdrawal_after_penalty', v_wallet_balance * (1 - COALESCE(v_penalty_percent, 5.0) / 100),
                'reason', 'Pot is locked until ' || to_char(v_pot.lock_end_date, 'Mon DD, YYYY')
            );
        ELSE
            v_can_withdraw := true;
            v_reason := 'Pot has matured';
        END IF;
    END IF;

    IF v_pot.lock_type = 'goal_based' OR v_pot.lock_type = 'hybrid' THEN
        IF v_pot.goal_amount IS NOT NULL AND v_wallet_balance < v_pot.goal_amount THEN
            IF NOT v_can_withdraw THEN
                RETURN jsonb_build_object(
                    'can_withdraw', false,
                    'lock_status', 'goal_not_reached',
                    'goal_amount', v_pot.goal_amount,
                    'current_balance', v_wallet_balance,
                    'remaining_to_goal', v_pot.goal_amount - v_wallet_balance,
                    'progress_percent', ROUND((v_wallet_balance / v_pot.goal_amount) * 100, 2),
                    'reason', 'Goal not yet reached'
                );
            END IF;
        ELSE
            v_can_withdraw := true;
            v_reason := COALESCE(v_reason || ' and goal reached', 'Goal reached');
        END IF;
    END IF;

    IF v_pot.lock_type = 'manual' THEN
        v_can_withdraw := v_pot.withdrawal_enabled;
        v_reason := CASE WHEN v_can_withdraw THEN 'Withdrawal enabled' ELSE 'Withdrawal not enabled' END;
    END IF;

    RETURN jsonb_build_object(
        'can_withdraw', v_can_withdraw,
        'lock_status', CASE WHEN v_can_withdraw THEN 'unlocked' ELSE 'locked' END,
        'current_balance', v_wallet_balance,
        'max_withdrawal_amount', v_wallet_balance,
        'reason', v_reason
    );
END;
$$;

-- 11. Function to withdraw from pot
CREATE OR REPLACE FUNCTION withdraw_from_pot(
    p_pot_id UUID,
    p_destination_wallet_id UUID,
    p_amount DECIMAL,
    p_force_with_penalty BOOLEAN DEFAULT false,
    p_description TEXT DEFAULT 'Withdrawal'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pot RECORD;
    v_eligibility JSONB;
    v_actual_amount DECIMAL;
    v_penalty_amount DECIMAL := 0;
    v_penalty_percent DECIMAL;
    v_transaction_id UUID;
    v_pot_transaction_id UUID;
    v_new_balance DECIMAL;
BEGIN
    -- Get pot with lock
    SELECT p.*, w.balance as wallet_balance
    INTO v_pot
    FROM pots p
    JOIN wallets w ON p.wallet_id = w.id
    WHERE p.id = p_pot_id
    FOR UPDATE;

    IF v_pot IS NULL THEN
        RAISE EXCEPTION 'Pot not found';
    END IF;

    -- Check eligibility
    v_eligibility := check_pot_withdrawal_eligibility(p_pot_id);

    IF v_eligibility->>'error' IS NOT NULL THEN
        RAISE EXCEPTION '%', v_eligibility->>'error';
    END IF;

    -- Validate withdrawal
    IF NOT (v_eligibility->>'can_withdraw')::BOOLEAN THEN
        IF p_force_with_penalty AND (v_eligibility->>'can_withdraw_with_penalty')::BOOLEAN THEN
            v_penalty_percent := (v_eligibility->>'penalty_percent')::DECIMAL;
            v_penalty_amount := p_amount * (v_penalty_percent / 100);
            v_actual_amount := p_amount - v_penalty_amount;
        ELSE
            RAISE EXCEPTION 'Withdrawal not allowed: %', v_eligibility->>'reason';
        END IF;
    ELSE
        v_actual_amount := p_amount;
    END IF;

    IF p_amount > v_pot.wallet_balance THEN
        RAISE EXCEPTION 'Insufficient pot balance';
    END IF;

    IF p_amount <= 0 THEN
        RAISE EXCEPTION 'Amount must be positive';
    END IF;

    -- Lock destination wallet
    PERFORM 1 FROM wallets WHERE id = p_destination_wallet_id AND status = 'ACTIVE' FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Destination wallet not found or inactive';
    END IF;

    -- Debit pot wallet
    UPDATE wallets
    SET balance = balance - p_amount, updated_at = NOW()
    WHERE id = v_pot.wallet_id
    RETURNING balance INTO v_new_balance;

    -- Credit destination wallet (minus penalty)
    UPDATE wallets
    SET balance = balance + v_actual_amount, updated_at = NOW()
    WHERE id = p_destination_wallet_id;

    -- Create withdrawal transaction
    INSERT INTO transactions (
        wallet_id, type, amount, currency, status, description, reference
    ) VALUES (
        v_pot.wallet_id, 'WITHDRAWAL', -p_amount, 'SLE', 'COMPLETED',
        'Pot withdrawal: ' || p_description,
        'POTW-' || p_pot_id || '-' || EXTRACT(EPOCH FROM NOW())::TEXT
    )
    RETURNING id INTO v_transaction_id;

    -- Create pot transaction record
    INSERT INTO pot_transactions (
        pot_id, transaction_id, transaction_type, amount, balance_after,
        status, description, destination_wallet_id, reference, processed_at
    ) VALUES (
        p_pot_id, v_transaction_id, 'withdrawal', p_amount, v_new_balance,
        'COMPLETED', p_description, p_destination_wallet_id,
        'WTD-' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW()
    )
    RETURNING id INTO v_pot_transaction_id;

    -- Record penalty if applicable
    IF v_penalty_amount > 0 THEN
        INSERT INTO pot_transactions (
            pot_id, transaction_type, amount, balance_after,
            status, description, reference, processed_at
        ) VALUES (
            p_pot_id, 'penalty', v_penalty_amount, v_new_balance,
            'COMPLETED', 'Early withdrawal penalty (' || v_penalty_percent || '%)',
            'PEN-' || EXTRACT(EPOCH FROM NOW())::TEXT, NOW()
        );
    END IF;

    -- Update pot
    UPDATE pots SET updated_at = NOW() WHERE id = p_pot_id;

    -- Create notification
    INSERT INTO pot_notifications (pot_id, user_id, notification_type, title, message, metadata)
    VALUES (p_pot_id, v_pot.user_id, 'withdrawal_processed', 'Withdrawal Processed',
            'Successfully withdrew ' || v_actual_amount || ' SLE from pot "' || v_pot.name || '"',
            jsonb_build_object('amount', v_actual_amount, 'penalty', v_penalty_amount));

    RETURN v_pot_transaction_id;
END;
$$;

-- 12. Function to process pot unlocks (for scheduled jobs)
CREATE OR REPLACE FUNCTION process_pot_unlocks()
RETURNS TABLE(pot_id UUID, user_id UUID, name VARCHAR, unlocked_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH unlocked_pots AS (
        UPDATE pots p
        SET lock_status = 'UNLOCKED',
            withdrawal_enabled = true,
            unlocked_at = NOW(),
            unlock_reason = 'Maturity date reached',
            updated_at = NOW()
        WHERE p.status = 'ACTIVE'
          AND p.lock_status = 'LOCKED'
          AND p.admin_locked = false
          AND p.lock_end_date IS NOT NULL
          AND p.lock_end_date <= NOW()
        RETURNING p.id, p.user_id, p.name
    )
    SELECT
        u.id as pot_id,
        u.user_id,
        u.name,
        NOW() as unlocked_at
    FROM unlocked_pots u;

    -- Create notifications for unlocked pots
    INSERT INTO pot_notifications (pot_id, user_id, notification_type, title, message)
    SELECT
        p.id, p.user_id, 'pot_unlocked', 'Pot Unlocked!',
        'Your savings pot "' || p.name || '" is now unlocked and ready for withdrawal!'
    FROM pots p
    WHERE p.unlocked_at = NOW()
      AND p.lock_status = 'UNLOCKED';
END;
$$;

-- 13. Function to process scheduled auto-deposits
CREATE OR REPLACE FUNCTION process_scheduled_auto_deposits()
RETURNS TABLE(pot_id UUID, status TEXT, amount DECIMAL, error_message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pot RECORD;
    v_result TEXT;
    v_error TEXT;
BEGIN
    FOR v_pot IN
        SELECT p.*
        FROM pots p
        WHERE p.auto_deposit_enabled = true
          AND p.status = 'ACTIVE'
          AND p.admin_locked = false
          AND p.next_auto_deposit_date <= NOW()
          AND p.source_wallet_id IS NOT NULL
          AND p.auto_deposit_amount > 0
    LOOP
        BEGIN
            -- Try to make contribution
            PERFORM contribute_to_pot(
                v_pot.id,
                v_pot.source_wallet_id,
                v_pot.auto_deposit_amount,
                'Scheduled auto-deposit'
            );

            -- Update next deposit date
            UPDATE pots
            SET next_auto_deposit_date = CASE auto_deposit_frequency
                    WHEN 'daily' THEN NOW() + INTERVAL '1 day'
                    WHEN 'weekly' THEN NOW() + INTERVAL '1 week'
                    WHEN 'bi_weekly' THEN NOW() + INTERVAL '2 weeks'
                    WHEN 'monthly' THEN NOW() + INTERVAL '1 month'
                    ELSE NOW() + INTERVAL '1 day'
                END,
                last_auto_deposit_date = NOW(),
                updated_at = NOW()
            WHERE id = v_pot.id;

            -- Create success notification
            INSERT INTO pot_notifications (pot_id, user_id, notification_type, title, message, metadata)
            VALUES (v_pot.id, v_pot.user_id, 'auto_deposit_success', 'Auto-Deposit Successful',
                    'Successfully deposited ' || v_pot.auto_deposit_amount || ' SLE to pot "' || v_pot.name || '"',
                    jsonb_build_object('amount', v_pot.auto_deposit_amount));

            v_result := 'success';
            v_error := NULL;

        EXCEPTION WHEN OTHERS THEN
            v_result := 'failed';
            v_error := SQLERRM;

            -- Create failure notification
            INSERT INTO pot_notifications (pot_id, user_id, notification_type, title, message, metadata)
            VALUES (v_pot.id, v_pot.user_id, 'auto_deposit_failed', 'Auto-Deposit Failed',
                    'Failed to deposit to pot "' || v_pot.name || '": ' || SQLERRM,
                    jsonb_build_object('amount', v_pot.auto_deposit_amount, 'error', SQLERRM));

            -- Schedule retry (push next date by retry hours)
            UPDATE pots
            SET next_auto_deposit_date = NOW() + INTERVAL '24 hours',
                updated_at = NOW()
            WHERE id = v_pot.id;
        END;

        RETURN QUERY SELECT v_pot.id, v_result, v_pot.auto_deposit_amount, v_error;
    END LOOP;
END;
$$;

-- 14. Function to get pot summary
CREATE OR REPLACE FUNCTION get_pot_summary(p_pot_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pot RECORD;
    v_total_contributions DECIMAL;
    v_total_withdrawals DECIMAL;
    v_contribution_count INTEGER;
BEGIN
    SELECT p.*, w.balance as wallet_balance
    INTO v_pot
    FROM pots p
    LEFT JOIN wallets w ON p.wallet_id = w.id
    WHERE p.id = p_pot_id;

    IF v_pot IS NULL THEN
        RETURN jsonb_build_object('error', 'Pot not found');
    END IF;

    -- Get transaction stats
    SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'contribution' THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN transaction_type = 'withdrawal' THEN amount ELSE 0 END), 0),
        COUNT(CASE WHEN transaction_type = 'contribution' THEN 1 END)
    INTO v_total_contributions, v_total_withdrawals, v_contribution_count
    FROM pot_transactions
    WHERE pot_id = p_pot_id AND status = 'COMPLETED';

    RETURN jsonb_build_object(
        'id', v_pot.id,
        'name', v_pot.name,
        'description', v_pot.description,
        'current_balance', COALESCE(v_pot.wallet_balance, 0),
        'goal_amount', v_pot.goal_amount,
        'progress_percent', CASE
            WHEN v_pot.goal_amount > 0 THEN ROUND((COALESCE(v_pot.wallet_balance, 0) / v_pot.goal_amount) * 100, 2)
            ELSE NULL
        END,
        'lock_type', v_pot.lock_type,
        'lock_status', v_pot.lock_status,
        'lock_end_date', v_pot.lock_end_date,
        'maturity_date', v_pot.maturity_date,
        'days_until_unlock', CASE
            WHEN v_pot.lock_end_date > NOW() THEN EXTRACT(DAY FROM (v_pot.lock_end_date - NOW()))::INTEGER
            ELSE 0
        END,
        'auto_deposit', jsonb_build_object(
            'enabled', v_pot.auto_deposit_enabled,
            'amount', v_pot.auto_deposit_amount,
            'frequency', v_pot.auto_deposit_frequency,
            'next_date', v_pot.next_auto_deposit_date
        ),
        'stats', jsonb_build_object(
            'total_contributions', v_total_contributions,
            'total_withdrawals', v_total_withdrawals,
            'contribution_count', v_contribution_count
        ),
        'status', v_pot.status,
        'admin_locked', v_pot.admin_locked,
        'icon', v_pot.icon,
        'color', v_pot.color,
        'created_at', v_pot.created_at,
        'updated_at', v_pot.updated_at
    );
END;
$$;

-- 15. Function to close a pot
CREATE OR REPLACE FUNCTION close_pot(
    p_pot_id UUID,
    p_destination_wallet_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pot RECORD;
    v_balance DECIMAL;
BEGIN
    SELECT p.*, w.balance as wallet_balance
    INTO v_pot
    FROM pots p
    JOIN wallets w ON p.wallet_id = w.id
    WHERE p.id = p_pot_id
    FOR UPDATE;

    IF v_pot IS NULL THEN
        RAISE EXCEPTION 'Pot not found';
    END IF;

    IF v_pot.status = 'CLOSED' THEN
        RAISE EXCEPTION 'Pot is already closed';
    END IF;

    IF v_pot.admin_locked THEN
        RAISE EXCEPTION 'Pot is locked by administrator';
    END IF;

    v_balance := COALESCE(v_pot.wallet_balance, 0);

    -- Transfer remaining balance if any
    IF v_balance > 0 THEN
        PERFORM withdraw_from_pot(p_pot_id, p_destination_wallet_id, v_balance, true, 'Pot closure withdrawal');
    END IF;

    -- Close the pot
    UPDATE pots
    SET status = 'CLOSED',
        lock_status = 'UNLOCKED',
        auto_deposit_enabled = false,
        updated_at = NOW()
    WHERE id = p_pot_id;

    -- Close the pot wallet
    UPDATE wallets
    SET status = 'CLOSED', updated_at = NOW()
    WHERE id = v_pot.wallet_id;

    -- Create notification
    INSERT INTO pot_notifications (pot_id, user_id, notification_type, title, message)
    VALUES (p_pot_id, v_pot.user_id, 'pot_unlocked', 'Pot Closed',
            'Your savings pot "' || v_pot.name || '" has been closed.');

    RETURN true;
END;
$$;

-- 16. Admin function to freeze/unfreeze pot
CREATE OR REPLACE FUNCTION admin_toggle_pot_lock(
    p_pot_id UUID,
    p_admin_id UUID,
    p_lock BOOLEAN,
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_pot RECORD;
BEGIN
    SELECT * INTO v_pot FROM pots WHERE id = p_pot_id;

    IF v_pot IS NULL THEN
        RAISE EXCEPTION 'Pot not found';
    END IF;

    UPDATE pots
    SET admin_locked = p_lock,
        admin_locked_by = CASE WHEN p_lock THEN p_admin_id ELSE NULL END,
        admin_locked_at = CASE WHEN p_lock THEN NOW() ELSE NULL END,
        admin_lock_reason = p_reason,
        updated_at = NOW()
    WHERE id = p_pot_id;

    -- Create notification
    INSERT INTO pot_notifications (pot_id, user_id, notification_type, title, message, metadata)
    VALUES (p_pot_id, v_pot.user_id,
            CASE WHEN p_lock THEN 'pot_frozen' ELSE 'pot_unfrozen' END,
            CASE WHEN p_lock THEN 'Pot Frozen' ELSE 'Pot Unfrozen' END,
            CASE WHEN p_lock
                 THEN 'Your pot "' || v_pot.name || '" has been frozen by an administrator.'
                 ELSE 'Your pot "' || v_pot.name || '" has been unfrozen.'
            END,
            jsonb_build_object('reason', p_reason));

    RETURN true;
END;
$$;

-- 17. Enable RLS on pot tables
ALTER TABLE pots ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_scheduled_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pot_notifications ENABLE ROW LEVEL SECURITY;

-- 18. Create RLS policies for pots
-- Users can see their own pots
CREATE POLICY "pots_select_own" ON pots
    FOR SELECT USING (user_id = auth.uid() OR user_role_level(auth.uid()) >= 80);

-- Users can insert their own pots
CREATE POLICY "pots_insert_own" ON pots
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own pots (limited fields)
CREATE POLICY "pots_update_own" ON pots
    FOR UPDATE USING (user_id = auth.uid() OR user_role_level(auth.uid()) >= 80);

-- Admins can delete pots
CREATE POLICY "pots_delete_admin" ON pots
    FOR DELETE USING (user_role_level(auth.uid()) >= 80);

-- Pot transactions policies
CREATE POLICY "pot_transactions_select" ON pot_transactions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM pots WHERE pots.id = pot_transactions.pot_id
                AND (pots.user_id = auth.uid() OR user_role_level(auth.uid()) >= 80))
    );

CREATE POLICY "pot_transactions_insert" ON pot_transactions
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM pots WHERE pots.id = pot_transactions.pot_id AND pots.user_id = auth.uid())
    );

-- Pot notifications policies
CREATE POLICY "pot_notifications_select" ON pot_notifications
    FOR SELECT USING (user_id = auth.uid() OR user_role_level(auth.uid()) >= 80);

CREATE POLICY "pot_notifications_update" ON pot_notifications
    FOR UPDATE USING (user_id = auth.uid());

-- Pot rules policies
CREATE POLICY "pot_rules_select" ON pot_rules
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM pots WHERE pots.id = pot_rules.pot_id
                AND (pots.user_id = auth.uid() OR user_role_level(auth.uid()) >= 80))
    );

-- Pot scheduled deposits policies
CREATE POLICY "pot_scheduled_deposits_select" ON pot_scheduled_deposits
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM pots WHERE pots.id = pot_scheduled_deposits.pot_id
                AND (pots.user_id = auth.uid() OR user_role_level(auth.uid()) >= 80))
    );

-- 19. Grant permissions
GRANT SELECT, INSERT, UPDATE ON pots TO authenticated;
GRANT SELECT, INSERT ON pot_transactions TO authenticated;
GRANT SELECT ON pot_rules TO authenticated;
GRANT SELECT ON pot_scheduled_deposits TO authenticated;
GRANT SELECT, UPDATE ON pot_notifications TO authenticated;
GRANT SELECT ON pot_settings TO authenticated;

GRANT EXECUTE ON FUNCTION create_pot TO authenticated;
GRANT EXECUTE ON FUNCTION contribute_to_pot TO authenticated;
GRANT EXECUTE ON FUNCTION withdraw_from_pot TO authenticated;
GRANT EXECUTE ON FUNCTION check_pot_withdrawal_eligibility TO authenticated;
GRANT EXECUTE ON FUNCTION get_pot_summary TO authenticated;
GRANT EXECUTE ON FUNCTION close_pot TO authenticated;
GRANT EXECUTE ON FUNCTION process_pot_unlocks TO authenticated;
GRANT EXECUTE ON FUNCTION process_scheduled_auto_deposits TO authenticated;

-- Done
SELECT 'Pot system migration completed successfully!' as status;
