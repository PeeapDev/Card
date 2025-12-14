-- SQL to fix RLS policies for pos_staff table
-- Run this in Supabase SQL Editor

-- Option 1: Disable RLS completely (if you want public access with merchant_id filtering done in code)
-- ALTER TABLE pos_staff DISABLE ROW LEVEL SECURITY;

-- Option 2: Enable RLS with permissive policies for anon role
-- First ensure RLS is enabled
ALTER TABLE pos_staff ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own staff" ON pos_staff;
DROP POLICY IF EXISTS "Users can insert own staff" ON pos_staff;
DROP POLICY IF EXISTS "Users can update own staff" ON pos_staff;
DROP POLICY IF EXISTS "Users can delete own staff" ON pos_staff;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON pos_staff;
DROP POLICY IF EXISTS "anon_select_pos_staff" ON pos_staff;
DROP POLICY IF EXISTS "anon_insert_pos_staff" ON pos_staff;
DROP POLICY IF EXISTS "anon_update_pos_staff" ON pos_staff;
DROP POLICY IF EXISTS "anon_delete_pos_staff" ON pos_staff;

-- Create permissive policies for anon role (since your app uses custom auth, not Supabase Auth)
-- The merchant_id filtering is done in the application code

CREATE POLICY "anon_select_pos_staff" ON pos_staff
  FOR SELECT TO anon USING (true);

CREATE POLICY "anon_insert_pos_staff" ON pos_staff
  FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "anon_update_pos_staff" ON pos_staff
  FOR UPDATE TO anon USING (true);

CREATE POLICY "anon_delete_pos_staff" ON pos_staff
  FOR DELETE TO anon USING (true);
