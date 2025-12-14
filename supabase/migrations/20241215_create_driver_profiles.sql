-- Create driver_profiles table for transport/driver payment collection
-- This table stores driver profiles for commercial drivers (taxi, keke, okada, bus, truck)
-- who want to collect payments from passengers using the Peeap platform

CREATE TABLE IF NOT EXISTS driver_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vehicle_type VARCHAR(50) NOT NULL,
  vehicle_name VARCHAR(100) NOT NULL,
  operating_area VARCHAR(100) NOT NULL,
  phone_number VARCHAR(20),
  payment_methods JSONB NOT NULL DEFAULT '{"qr": true, "card": false, "mobile": true}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_driver_profiles_user_id ON driver_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_vehicle_type ON driver_profiles(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_operating_area ON driver_profiles(operating_area);

-- Enable RLS
ALTER TABLE driver_profiles ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (using service role from backend)
-- Since this app uses custom auth, we allow service role full access
CREATE POLICY "Service role full access" ON driver_profiles
  FOR ALL USING (true);

-- Add comment to table
COMMENT ON TABLE driver_profiles IS 'Stores driver profiles for commercial transport payment collection';
COMMENT ON COLUMN driver_profiles.vehicle_type IS 'Type of vehicle: taxi, keke, okada, bus, truck, other';
COMMENT ON COLUMN driver_profiles.vehicle_name IS 'Display name for the vehicle type';
COMMENT ON COLUMN driver_profiles.operating_area IS 'Primary operating city/area';
COMMENT ON COLUMN driver_profiles.payment_methods IS 'JSON object with enabled payment methods: qr, card, mobile';
