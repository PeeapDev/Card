-- ============================================
-- Card Features System Migration
-- Run this in Supabase SQL Editor
-- ============================================
--
-- This migration:
-- 1. Adds feature flags columns to card_types
-- 2. Adds feature columns to cards table
-- 3. Sets up proper RLS policies for card_types
-- ============================================

-- 1. Add feature flag columns to card_types table
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS allow_negative_balance BOOLEAN DEFAULT false;
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS allow_buy_now_pay_later BOOLEAN DEFAULT false;
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS high_transaction_limit BOOLEAN DEFAULT false;
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS no_transaction_fees BOOLEAN DEFAULT false;
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS cashback_enabled BOOLEAN DEFAULT false;
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS cashback_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS overdraft_limit DECIMAL(18,2) DEFAULT 0;
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS bnpl_max_amount DECIMAL(18,2) DEFAULT 0;
ALTER TABLE card_types ADD COLUMN IF NOT EXISTS bnpl_interest_rate DECIMAL(5,2) DEFAULT 0;

-- 2. Add feature columns to cards table (inherited from card_type at creation)
ALTER TABLE cards ADD COLUMN IF NOT EXISTS allow_negative_balance BOOLEAN DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS allow_buy_now_pay_later BOOLEAN DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS high_transaction_limit BOOLEAN DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS no_transaction_fees BOOLEAN DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS cashback_enabled BOOLEAN DEFAULT false;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS cashback_percentage DECIMAL(5,2) DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS overdraft_limit DECIMAL(18,2) DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS bnpl_max_amount DECIMAL(18,2) DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS bnpl_balance DECIMAL(18,2) DEFAULT 0;
ALTER TABLE cards ADD COLUMN IF NOT EXISTS bnpl_due_date TIMESTAMPTZ;

-- 3. Drop existing RLS policies on card_types if they exist
DROP POLICY IF EXISTS "Anyone can view active card types" ON card_types;
DROP POLICY IF EXISTS "Admins can manage card types" ON card_types;
DROP POLICY IF EXISTS "card_types_select_policy" ON card_types;
DROP POLICY IF EXISTS "card_types_insert_policy" ON card_types;
DROP POLICY IF EXISTS "card_types_update_policy" ON card_types;
DROP POLICY IF EXISTS "card_types_delete_policy" ON card_types;

-- 4. Enable RLS on card_types
ALTER TABLE card_types ENABLE ROW LEVEL SECURITY;

-- 5. Create permissive policies for card_types
-- Allow anyone to read card_types (for marketplace)
CREATE POLICY "card_types_select_all" ON card_types
    FOR SELECT USING (true);

-- Allow authenticated users to insert (for admins - will be checked at app level)
CREATE POLICY "card_types_insert_auth" ON card_types
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow authenticated users to update (for admins - will be checked at app level)
CREATE POLICY "card_types_update_auth" ON card_types
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Allow authenticated users to delete (for admins - will be checked at app level)
CREATE POLICY "card_types_delete_auth" ON card_types
    FOR DELETE TO authenticated USING (true);

-- 6. Verify card_types table exists and show structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'card_types'
ORDER BY ordinal_position;
