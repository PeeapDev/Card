-- Migration: 064_kyc_and_preferences.sql
-- Description: Add preferences column to users and create kyc_applications table

-- ================== USERS PREFERENCES ==================
-- Add preferences JSONB column to users table for storing user settings

ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Create index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_users_preferences ON users USING GIN (preferences);

-- ================== KYC_APPLICATIONS TABLE ==================
-- This table stores KYC (Know Your Customer) verification applications

CREATE TABLE IF NOT EXISTS kyc_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  date_of_birth DATE,
  nationality VARCHAR(100),
  address JSONB, -- {street, city, state, country, postalCode}
  documents JSONB, -- Array of {type, mimeType, data, uploadedAt}
  status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, UNDER_REVIEW
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewer_id UUID REFERENCES users(id),
  rejection_reason TEXT,
  verification_result JSONB, -- OCR and verification data
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_kyc_applications_user_id ON kyc_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_applications_status ON kyc_applications(status);
CREATE INDEX IF NOT EXISTS idx_kyc_applications_submitted_at ON kyc_applications(submitted_at DESC);

-- Enable RLS
ALTER TABLE kyc_applications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for kyc_applications
DROP POLICY IF EXISTS "kyc_applications_select_own" ON kyc_applications;
DROP POLICY IF EXISTS "kyc_applications_insert_own" ON kyc_applications;
DROP POLICY IF EXISTS "kyc_applications_update_own" ON kyc_applications;
DROP POLICY IF EXISTS "kyc_applications_admin_all" ON kyc_applications;

-- Users can view their own applications
CREATE POLICY "kyc_applications_select_own" ON kyc_applications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR auth.uid()::text = user_id::text);

-- Users can create their own applications
CREATE POLICY "kyc_applications_insert_own" ON kyc_applications
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR auth.uid()::text = user_id::text);

-- Users can update their own pending applications
CREATE POLICY "kyc_applications_update_own" ON kyc_applications
  FOR UPDATE TO authenticated
  USING (
    (user_id = auth.uid() OR auth.uid()::text = user_id::text)
    AND status = 'PENDING'
  );

-- Admins can view/update all applications (check via users.roles)
CREATE POLICY "kyc_applications_admin_all" ON kyc_applications
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND (users.roles LIKE '%admin%' OR users.roles LIKE '%superadmin%')
    )
  );

-- Grant permissions
GRANT ALL ON kyc_applications TO authenticated;
GRANT ALL ON kyc_applications TO service_role;

-- ================== UPDATED_AT TRIGGER ==================

DROP TRIGGER IF EXISTS update_kyc_applications_updated_at ON kyc_applications;
CREATE TRIGGER update_kyc_applications_updated_at
  BEFORE UPDATE ON kyc_applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================== GRANT PUBLIC SELECT ON PROFILES ==================
-- Fix the 406 error by ensuring profiles can be read

DROP POLICY IF EXISTS "profiles_public_read" ON profiles;
CREATE POLICY "profiles_public_read" ON profiles
  FOR SELECT TO authenticated
  USING (true);

-- Allow service role full access
GRANT ALL ON profiles TO service_role;
