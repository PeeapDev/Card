/**
 * Create driver_profiles table for transport/driver payment collection
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  // Table doesn't exist if we get PGRST205 (not found in schema cache) or 42P01 (relation does not exist)
  if (error && (error.code === 'PGRST205' || error.code === '42P01')) {
    return false;
  }
  return true;
}

async function createDriverProfilesTable() {
  console.log('🚗 Driver Profiles Table Migration');
  console.log('═'.repeat(50));

  // Check if table already exists
  console.log('\n📊 Checking if driver_profiles table exists...');
  const exists = await checkTableExists('driver_profiles');

  if (exists) {
    console.log('✅ driver_profiles table already exists!\n');

    // Test by fetching profiles
    const { data, error } = await supabase
      .from('driver_profiles')
      .select('*')
      .limit(5);

    if (error) {
      console.log(`⚠️  Could not query table: ${error.message}`);
    } else {
      console.log(`📊 Current profiles in table: ${data.length}`);
      if (data.length > 0) {
        console.log('Sample profile:', JSON.stringify(data[0], null, 2));
      }
    }
    return;
  }

  console.log('❌ driver_profiles table does not exist\n');
  console.log('═'.repeat(50));
  console.log('📋 ACTION REQUIRED: Run the following SQL in Supabase Dashboard');
  console.log('   https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql/new');
  console.log('═'.repeat(50));
  console.log(`
-- Create driver_profiles table for transport/driver payment collection
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

-- Policy: Users can view their own driver profile
CREATE POLICY "Users can view own driver profile" ON driver_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own driver profile
CREATE POLICY "Users can insert own driver profile" ON driver_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own driver profile
CREATE POLICY "Users can update own driver profile" ON driver_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own driver profile
CREATE POLICY "Users can delete own driver profile" ON driver_profiles
  FOR DELETE USING (auth.uid() = user_id);

-- Service role policy for backend operations
CREATE POLICY "Service role full access" ON driver_profiles
  FOR ALL USING (auth.role() = 'service_role');
`);
  console.log('═'.repeat(50));
}

createDriverProfilesTable().catch(console.error);
