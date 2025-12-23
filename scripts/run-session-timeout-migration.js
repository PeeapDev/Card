/**
 * Run the session timeout migration
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://kseipxazjncotamthmvr.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtzZWlweGF6am5jb3RhbXRobXZyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MjI0MDU2MywiZXhwIjoyMDU3ODE2NTYzfQ.Q7w9ANZDC_xk-9l5G2H_qKfYcKFUJFCVMDJJKg8W6ss';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running session timeout migration...');

  try {
    // First, check if column already exists by trying to query it
    const { data: existingData, error: checkError } = await supabase
      .from('site_settings')
      .select('id')
      .limit(1);

    if (checkError) {
      console.log('Error checking site_settings:', checkError.message);
      return;
    }

    // Try to update with the new field to check if it exists
    const { error: testError } = await supabase
      .from('site_settings')
      .update({ session_timeout_minutes: 0 })
      .eq('id', '00000000-0000-0000-0000-000000000002');

    if (testError && testError.message.includes('column')) {
      console.log('Column does not exist yet. Please run this SQL in Supabase SQL Editor:');
      console.log(`
ALTER TABLE site_settings
ADD COLUMN IF NOT EXISTS session_timeout_minutes INTEGER DEFAULT 0;
      `);
    } else if (testError) {
      console.log('Update error:', testError.message);
    } else {
      console.log('Column session_timeout_minutes exists and is working correctly.');
      console.log('Migration completed successfully!');
    }
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}

runMigration();
