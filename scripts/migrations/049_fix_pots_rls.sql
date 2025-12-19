-- Fix Pots RLS Policies
-- The insert policy needs to allow users to insert pots for themselves

-- Drop existing policies
DROP POLICY IF EXISTS "pots_select_own" ON pots;
DROP POLICY IF EXISTS "pots_insert_own" ON pots;
DROP POLICY IF EXISTS "pots_update_own" ON pots;
DROP POLICY IF EXISTS "pots_delete_admin" ON pots;

-- Recreate with more permissive policies for authenticated users
-- Users can see their own pots
CREATE POLICY "pots_select_own" ON pots
    FOR SELECT USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id::text = auth.uid()::text));

-- Users can insert pots - the user_id must match auth.uid()
CREATE POLICY "pots_insert_own" ON pots
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id::text = auth.uid()::text));

-- Users can update their own pots
CREATE POLICY "pots_update_own" ON pots
    FOR UPDATE USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id::text = auth.uid()::text));

-- Users can delete their own pots
CREATE POLICY "pots_delete_own" ON pots
    FOR DELETE USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id::text = auth.uid()::text));

-- Also fix pot_transactions insert policy
DROP POLICY IF EXISTS "pot_transactions_insert" ON pot_transactions;
CREATE POLICY "pot_transactions_insert" ON pot_transactions
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Fix pot_notifications insert policy (allow system to insert)
DROP POLICY IF EXISTS "pot_notifications_insert" ON pot_notifications;
CREATE POLICY "pot_notifications_insert" ON pot_notifications
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

SELECT 'Pots RLS policies fixed!' as status;
