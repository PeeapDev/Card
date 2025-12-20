-- Migration: Dual Wallet System (USD + SLE)
-- This creates USD wallets for existing users and updates the wallet creation trigger

-- =====================================================
-- CREATE USD WALLETS FOR EXISTING USERS
-- =====================================================
-- Users who have SLE wallet but no USD wallet
INSERT INTO wallets (external_id, user_id, wallet_type, currency, balance, available_balance, name, status)
SELECT
    'wal_usd_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(u.id::TEXT || RANDOM()::TEXT), 1, 8),
    u.id,
    'secondary',
    'USD',
    0,
    0,
    'USD Wallet',
    'ACTIVE'
FROM users u
WHERE EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.user_id = u.id
    AND w.currency = 'SLE'
    AND w.wallet_type IN ('primary', 'secondary')
)
AND NOT EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.user_id = u.id
    AND w.currency = 'USD'
    AND w.wallet_type IN ('primary', 'secondary')
);

-- Users who have USD wallet but no SLE wallet (edge case)
INSERT INTO wallets (external_id, user_id, wallet_type, currency, balance, available_balance, name, status)
SELECT
    'wal_sle_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(u.id::TEXT || RANDOM()::TEXT), 1, 8),
    u.id,
    'primary',
    'SLE',
    0,
    0,
    'SLE Wallet',
    'ACTIVE'
FROM users u
WHERE EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.user_id = u.id
    AND w.currency = 'USD'
    AND w.wallet_type IN ('primary', 'secondary')
)
AND NOT EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.user_id = u.id
    AND w.currency = 'SLE'
    AND w.wallet_type IN ('primary', 'secondary')
);

-- Users with no wallets at all
INSERT INTO wallets (external_id, user_id, wallet_type, currency, balance, available_balance, name, status)
SELECT
    'wal_sle_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(u.id::TEXT || RANDOM()::TEXT), 1, 8),
    u.id,
    'primary',
    'SLE',
    0,
    0,
    'SLE Wallet',
    'ACTIVE'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.user_id = u.id
    AND w.wallet_type IN ('primary', 'secondary')
);

INSERT INTO wallets (external_id, user_id, wallet_type, currency, balance, available_balance, name, status)
SELECT
    'wal_usd_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(u.id::TEXT || RANDOM()::TEXT), 1, 8),
    u.id,
    'secondary',
    'USD',
    0,
    0,
    'USD Wallet',
    'ACTIVE'
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM wallets w
    WHERE w.user_id = u.id
    AND w.currency = 'USD'
    AND w.wallet_type IN ('primary', 'secondary')
);

-- =====================================================
-- UPDATE WALLET CREATION TRIGGER FOR NEW USERS
-- =====================================================
CREATE OR REPLACE FUNCTION create_dual_wallets_for_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Create SLE wallet (primary)
    INSERT INTO wallets (
        external_id,
        user_id,
        wallet_type,
        currency,
        balance,
        available_balance,
        name,
        status
    ) VALUES (
        'wal_sle_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(NEW.id::TEXT || RANDOM()::TEXT), 1, 8),
        NEW.id,
        'primary',
        'SLE',
        0,
        0,
        'SLE Wallet',
        'ACTIVE'
    ) ON CONFLICT DO NOTHING;

    -- Create USD wallet (secondary)
    INSERT INTO wallets (
        external_id,
        user_id,
        wallet_type,
        currency,
        balance,
        available_balance,
        name,
        status
    ) VALUES (
        'wal_usd_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(NEW.id::TEXT || RANDOM()::TEXT), 1, 8),
        NEW.id,
        'secondary',
        'USD',
        0,
        0,
        'USD Wallet',
        'ACTIVE'
    ) ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS create_wallet_on_user_insert ON users;

-- Create new trigger for dual wallet creation
CREATE TRIGGER create_dual_wallets_on_user_insert
    AFTER INSERT ON users
    FOR EACH ROW
    EXECUTE FUNCTION create_dual_wallets_for_user();

-- =====================================================
-- UPDATE WALLET NAMES FOR EXISTING WALLETS WITHOUT NAMES
-- =====================================================
UPDATE wallets
SET name = 'SLE Wallet'
WHERE currency = 'SLE'
AND wallet_type IN ('primary', 'secondary')
AND (name IS NULL OR name = '');

UPDATE wallets
SET name = 'USD Wallet'
WHERE currency = 'USD'
AND wallet_type IN ('primary', 'secondary')
AND (name IS NULL OR name = '');

-- =====================================================
-- HELPER FUNCTION: Ensure User Has Dual Wallets
-- =====================================================
CREATE OR REPLACE FUNCTION ensure_user_dual_wallets(p_user_id UUID)
RETURNS TABLE (
    sle_wallet_id UUID,
    usd_wallet_id UUID
) AS $$
DECLARE
    v_sle_wallet_id UUID;
    v_usd_wallet_id UUID;
BEGIN
    -- Get or create SLE wallet
    SELECT id INTO v_sle_wallet_id
    FROM wallets
    WHERE user_id = p_user_id
    AND currency = 'SLE'
    AND wallet_type IN ('primary', 'secondary')
    LIMIT 1;

    IF v_sle_wallet_id IS NULL THEN
        INSERT INTO wallets (
            external_id,
            user_id,
            wallet_type,
            currency,
            balance,
            available_balance,
            name,
            status
        ) VALUES (
            'wal_sle_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(p_user_id::TEXT || RANDOM()::TEXT), 1, 8),
            p_user_id,
            'primary',
            'SLE',
            0,
            0,
            'SLE Wallet',
            'ACTIVE'
        )
        RETURNING id INTO v_sle_wallet_id;
    END IF;

    -- Get or create USD wallet
    SELECT id INTO v_usd_wallet_id
    FROM wallets
    WHERE user_id = p_user_id
    AND currency = 'USD'
    AND wallet_type IN ('primary', 'secondary')
    LIMIT 1;

    IF v_usd_wallet_id IS NULL THEN
        INSERT INTO wallets (
            external_id,
            user_id,
            wallet_type,
            currency,
            balance,
            available_balance,
            name,
            status
        ) VALUES (
            'wal_usd_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(p_user_id::TEXT || RANDOM()::TEXT), 1, 8),
            p_user_id,
            'secondary',
            'USD',
            0,
            0,
            'USD Wallet',
            'ACTIVE'
        )
        RETURNING id INTO v_usd_wallet_id;
    END IF;

    RETURN QUERY SELECT v_sle_wallet_id, v_usd_wallet_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON FUNCTION create_dual_wallets_for_user IS 'Trigger function to create both SLE and USD wallets for new users';
COMMENT ON FUNCTION ensure_user_dual_wallets IS 'Ensures a user has both SLE and USD wallets, creating them if missing';

-- Done
SELECT 'Dual wallet system migration completed' as status;

-- Show statistics
SELECT
    currency,
    COUNT(*) as wallet_count
FROM wallets
WHERE wallet_type IN ('primary', 'secondary')
GROUP BY currency
ORDER BY currency;
