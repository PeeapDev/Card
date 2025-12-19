-- Migration: 052_missing_tables.sql
-- Description: Create missing tables (profiles, businesses) and fix events_settings

-- ================== PROFILES TABLE ==================
-- This table stores additional user profile information

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name VARCHAR(255),
  avatar_url TEXT,
  bio TEXT,
  phone VARCHAR(20),
  date_of_birth DATE,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT TO authenticated
  USING (true); -- Anyone can view profiles

CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid() OR auth.uid()::text = id::text);

CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid() OR auth.uid()::text = id::text);

-- Grant permissions
GRANT ALL ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

-- ================== BUSINESSES TABLE ==================
-- This table stores business information for merchants

CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100),
  description TEXT,
  logo_url TEXT,
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  website VARCHAR(255),
  status VARCHAR(20) DEFAULT 'pending', -- pending, active, suspended
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_status ON businesses(status);

-- Enable RLS
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses
DROP POLICY IF EXISTS "businesses_select_own" ON businesses;
DROP POLICY IF EXISTS "businesses_insert_own" ON businesses;
DROP POLICY IF EXISTS "businesses_update_own" ON businesses;
DROP POLICY IF EXISTS "businesses_select_all" ON businesses;

-- Anyone can view active businesses
CREATE POLICY "businesses_select_all" ON businesses
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "businesses_insert_own" ON businesses
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR auth.uid()::text = user_id::text);

CREATE POLICY "businesses_update_own" ON businesses
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR auth.uid()::text = user_id::text);

-- Grant permissions
GRANT ALL ON businesses TO authenticated;
GRANT ALL ON businesses TO service_role;

-- ================== EVENTS_SETTINGS TABLE ==================
-- This table stores events app settings for merchants

CREATE TABLE IF NOT EXISTS events_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  default_currency VARCHAR(3) DEFAULT 'SLE',
  default_timezone VARCHAR(50) DEFAULT 'Africa/Freetown',
  ticket_prefix VARCHAR(10) DEFAULT 'TKT',
  max_tickets_per_order INTEGER DEFAULT 10,
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(merchant_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_events_settings_merchant_id ON events_settings(merchant_id);

-- Enable RLS
ALTER TABLE events_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for events_settings
DROP POLICY IF EXISTS "events_settings_select_own" ON events_settings;
DROP POLICY IF EXISTS "events_settings_insert_own" ON events_settings;
DROP POLICY IF EXISTS "events_settings_update_own" ON events_settings;

CREATE POLICY "events_settings_select_own" ON events_settings
  FOR SELECT TO authenticated
  USING (merchant_id = auth.uid() OR auth.uid()::text = merchant_id::text);

CREATE POLICY "events_settings_insert_own" ON events_settings
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id = auth.uid() OR auth.uid()::text = merchant_id::text);

CREATE POLICY "events_settings_update_own" ON events_settings
  FOR UPDATE TO authenticated
  USING (merchant_id = auth.uid() OR auth.uid()::text = merchant_id::text);

-- Grant permissions
GRANT ALL ON events_settings TO authenticated;
GRANT ALL ON events_settings TO service_role;

-- ================== POS_SETTINGS TABLE ==================
-- Ensure pos_settings exists (might already exist)

CREATE TABLE IF NOT EXISTS pos_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255),
  business_address TEXT,
  business_phone VARCHAR(20),
  business_email VARCHAR(255),
  business_logo TEXT,
  currency VARCHAR(3) DEFAULT 'SLE',
  tax_rate DECIMAL(5,2) DEFAULT 0,
  receipt_footer TEXT,
  low_stock_threshold INTEGER DEFAULT 10,
  setup_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(merchant_id)
);

-- Create index
CREATE INDEX IF NOT EXISTS idx_pos_settings_merchant_id ON pos_settings(merchant_id);

-- Enable RLS
ALTER TABLE pos_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for pos_settings
DROP POLICY IF EXISTS "pos_settings_select_own" ON pos_settings;
DROP POLICY IF EXISTS "pos_settings_insert_own" ON pos_settings;
DROP POLICY IF EXISTS "pos_settings_update_own" ON pos_settings;

CREATE POLICY "pos_settings_select_own" ON pos_settings
  FOR SELECT TO authenticated
  USING (merchant_id = auth.uid() OR auth.uid()::text = merchant_id::text);

CREATE POLICY "pos_settings_insert_own" ON pos_settings
  FOR INSERT TO authenticated
  WITH CHECK (merchant_id = auth.uid() OR auth.uid()::text = merchant_id::text);

CREATE POLICY "pos_settings_update_own" ON pos_settings
  FOR UPDATE TO authenticated
  USING (merchant_id = auth.uid() OR auth.uid()::text = merchant_id::text);

-- Grant permissions
GRANT ALL ON pos_settings TO authenticated;
GRANT ALL ON pos_settings TO service_role;

-- ================== UPDATED_AT TRIGGERS ==================

-- Function for updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_businesses_updated_at ON businesses;
CREATE TRIGGER update_businesses_updated_at
  BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_settings_updated_at ON events_settings;
CREATE TRIGGER update_events_settings_updated_at
  BEFORE UPDATE ON events_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pos_settings_updated_at ON pos_settings;
CREATE TRIGGER update_pos_settings_updated_at
  BEFORE UPDATE ON pos_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
