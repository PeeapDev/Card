-- Create plus_businesses table for PeeAP Plus business data
-- This stores additional business configuration specific to Plus features

CREATE TABLE IF NOT EXISTS plus_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  merchant_id UUID, -- Reference to original merchant if using existing business
  tier VARCHAR(50) NOT NULL DEFAULT 'business', -- 'business' or 'business_plus'
  source VARCHAR(20) NOT NULL DEFAULT 'new', -- 'existing' or 'new'

  -- Verification status
  requires_verification BOOLEAN DEFAULT false,
  verification_status VARCHAR(20) DEFAULT 'verified', -- 'pending', 'verified', 'rejected'
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID,

  -- Business info (JSON for flexibility)
  business_info JSONB DEFAULT '{}',

  -- Team info
  team_info JSONB DEFAULT '{}',

  -- Preferences
  preferences JSONB DEFAULT '{}',

  -- Billing
  monthly_fee DECIMAL(10, 2) DEFAULT 0,
  billing_status VARCHAR(20) DEFAULT 'active', -- 'active', 'past_due', 'cancelled'
  last_billed_at TIMESTAMP WITH TIME ZONE,
  next_billing_at TIMESTAMP WITH TIME ZONE,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_plus_businesses_user_id ON plus_businesses(user_id);

-- Index for merchant lookup
CREATE INDEX IF NOT EXISTS idx_plus_businesses_merchant_id ON plus_businesses(merchant_id);

-- Enable RLS
ALTER TABLE plus_businesses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own business
CREATE POLICY "Users can read own plus_business" ON plus_businesses
  FOR SELECT USING (auth.uid()::text = user_id::text OR true);

-- Policy: Users can insert their own business
CREATE POLICY "Users can insert own plus_business" ON plus_businesses
  FOR INSERT WITH CHECK (true);

-- Policy: Users can update their own business
CREATE POLICY "Users can update own plus_business" ON plus_businesses
  FOR UPDATE USING (true);

-- Reload schema cache
SELECT pg_notify('pgrst', 'reload schema');
