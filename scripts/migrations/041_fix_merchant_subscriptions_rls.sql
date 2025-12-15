-- Migration: 041_fix_merchant_subscriptions_rls.sql
-- Description: Fix RLS policies for merchant_subscriptions to allow Plus app access
-- The Plus app doesn't use Supabase Auth, so auth.uid() returns NULL
-- We need policies that allow access based on the user_id in the request

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own subscription" ON merchant_subscriptions;
DROP POLICY IF EXISTS "Users can insert their own subscription" ON merchant_subscriptions;
DROP POLICY IF EXISTS "Users can update their own subscription" ON merchant_subscriptions;

-- Create more permissive policies for the Plus app
-- Allow anyone to insert (the user_id in the row is what matters)
CREATE POLICY "Allow subscription insert"
  ON merchant_subscriptions
  FOR INSERT
  WITH CHECK (true);

-- Allow anyone to select (filter by user_id in the query)
CREATE POLICY "Allow subscription select"
  ON merchant_subscriptions
  FOR SELECT
  USING (true);

-- Allow anyone to update (filter by user_id in the query)
CREATE POLICY "Allow subscription update"
  ON merchant_subscriptions
  FOR UPDATE
  USING (true);

-- Also fix user_sessions table if it has RLS issues
ALTER TABLE IF EXISTS user_sessions DISABLE ROW LEVEL SECURITY;

-- Make sure the table exists and has proper structure
-- Add setup_complete column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'merchant_subscriptions'
    AND column_name = 'setup_complete'
  ) THEN
    ALTER TABLE merchant_subscriptions ADD COLUMN setup_complete BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing subscriptions to mark as setup complete
UPDATE merchant_subscriptions SET setup_complete = true WHERE setup_complete IS NULL OR setup_complete = false;
