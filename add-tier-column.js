/**
 * Add missing tier column to users table
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addTierColumn() {
  console.log('Checking users table columns...');

  // Test if tier column exists
  const { data, error } = await supabase
    .from('users')
    .select('tier')
    .limit(1);

  if (error && error.message.includes('tier')) {
    console.log('tier column does not exist. Please add it via SQL:');
    console.log('');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS tier VARCHAR(50) DEFAULT \'basic\';');
    console.log('ALTER TABLE users ADD COLUMN IF NOT EXISTS business_name VARCHAR(255);');
    console.log('');
    console.log('Run this in Supabase Dashboard SQL Editor:');
    console.log('https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql/new');
  } else if (error) {
    console.log('Other error:', error.message);
  } else {
    console.log('tier column already exists');
  }
}

addTierColumn().catch(console.error);
