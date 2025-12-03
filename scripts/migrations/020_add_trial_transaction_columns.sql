-- Migration: Add trial live transaction columns to merchant_businesses
-- These columns track how many live transactions a PENDING business can make before requiring approval
--
-- Business Transaction Rules:
-- 1. Test/Sandbox transactions: ALWAYS unlimited for all businesses
-- 2. Live transactions for PENDING businesses: Limited to trial_live_transaction_limit (default 2)
-- 3. Live transactions for APPROVED businesses: Unlimited
-- 4. Live transactions for REJECTED/SUSPENDED businesses: Blocked

-- Add columns if they don't exist
DO $$
BEGIN
    -- Check if the old column names exist and rename them
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'merchant_businesses'
               AND column_name = 'sandbox_transaction_limit') THEN
        ALTER TABLE merchant_businesses
        RENAME COLUMN sandbox_transaction_limit TO trial_live_transaction_limit;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_name = 'merchant_businesses'
               AND column_name = 'sandbox_transactions_used') THEN
        ALTER TABLE merchant_businesses
        RENAME COLUMN sandbox_transactions_used TO trial_live_transactions_used;
    END IF;

    -- Add the columns if they don't exist (with new names)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'merchant_businesses'
                   AND column_name = 'trial_live_transaction_limit') THEN
        ALTER TABLE merchant_businesses
        ADD COLUMN trial_live_transaction_limit INTEGER DEFAULT 2;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'merchant_businesses'
                   AND column_name = 'trial_live_transactions_used') THEN
        ALTER TABLE merchant_businesses
        ADD COLUMN trial_live_transactions_used INTEGER DEFAULT 0;
    END IF;
END $$;

-- Ensure default values are set
ALTER TABLE merchant_businesses
ALTER COLUMN trial_live_transaction_limit SET DEFAULT 2;

ALTER TABLE merchant_businesses
ALTER COLUMN trial_live_transactions_used SET DEFAULT 0;

-- Update any NULL values
UPDATE merchant_businesses
SET trial_live_transaction_limit = 2
WHERE trial_live_transaction_limit IS NULL;

UPDATE merchant_businesses
SET trial_live_transactions_used = 0
WHERE trial_live_transactions_used IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN merchant_businesses.trial_live_transaction_limit IS
'Number of live transactions allowed before business approval (trial period). Default: 2. Test transactions are always unlimited.';

COMMENT ON COLUMN merchant_businesses.trial_live_transactions_used IS
'Count of live transactions processed during trial period (before approval). Only incremented for PENDING businesses.';
