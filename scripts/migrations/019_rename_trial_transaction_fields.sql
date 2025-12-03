-- Migration: Rename sandbox fields to trial_live for clarity
--
-- Business Transaction Rules:
-- 1. Test/Sandbox transactions: ALWAYS unlimited for all businesses
-- 2. Live transactions for PENDING businesses: Limited to trial_live_transaction_limit (default 2)
-- 3. Live transactions for APPROVED businesses: Unlimited
-- 4. Live transactions for REJECTED/SUSPENDED businesses: Blocked

-- Rename columns for clarity
ALTER TABLE merchant_businesses
RENAME COLUMN sandbox_transaction_limit TO trial_live_transaction_limit;

ALTER TABLE merchant_businesses
RENAME COLUMN sandbox_transactions_used TO trial_live_transactions_used;

-- Update default value and add comment
ALTER TABLE merchant_businesses
ALTER COLUMN trial_live_transaction_limit SET DEFAULT 2;

-- Add comments to clarify the purpose
COMMENT ON COLUMN merchant_businesses.trial_live_transaction_limit IS
'Number of live transactions allowed before business approval (trial period). Default: 2. Test transactions are always unlimited.';

COMMENT ON COLUMN merchant_businesses.trial_live_transactions_used IS
'Count of live transactions processed during trial period (before approval). Only incremented for PENDING businesses.';

-- Update any existing records that might have different defaults
UPDATE merchant_businesses
SET trial_live_transaction_limit = 2
WHERE trial_live_transaction_limit IS NULL OR trial_live_transaction_limit = 0;

UPDATE merchant_businesses
SET trial_live_transactions_used = 0
WHERE trial_live_transactions_used IS NULL;
