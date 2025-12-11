// Run migration for payouts table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  // Get migration file from command line arg or use default
  const migrationFile = process.argv[2] || './scripts/migrations/031_payouts_table.sql';
  console.log(`Running migration: ${migrationFile}\n`);

  // Read the SQL file
  const sql = fs.readFileSync(migrationFile, 'utf8');

  // Execute via RPC - we need to run raw SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration via RPC failed:', error.message);
    console.log('\n⚠️  Please run this migration directly in Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql\n');
    console.log('   Copy the contents of:', migrationFile);
    console.log('\n--- SQL Content ---\n');
    console.log(sql);
    return;
  }

  console.log('Migration completed successfully!');

  // Verify the table
  const { data: testData, error: testError } = await supabase.from('payouts').select('id').limit(1);
  if (testError) {
    console.log('Table verification failed:', testError.message);
  } else {
    console.log('✅ Payouts table is accessible!');
  }
}

runMigration();
