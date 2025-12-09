// Run migration for checkout_sessions table
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running checkout_sessions migration...');

  // Read the SQL file
  const sql = fs.readFileSync('./scripts/migrations/030_checkout_sessions.sql', 'utf8');

  // Execute via RPC - we need to run raw SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Migration error:', error);

    // Try alternative - direct query if available
    console.log('Trying alternative method...');

    // Split SQL into statements and run separately via insert/select
    // Actually, we'll need to use the REST API directly
    const statements = sql.split(';').filter(s => s.trim());

    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log('Executing:', stmt.substring(0, 50) + '...');
        // This won't work for DDL, but let's see
      }
    }

    console.log('\\nMigration requires direct database access.');
    console.log('Please run this SQL in Supabase Dashboard > SQL Editor:');
    console.log('\\n' + sql);
    return;
  }

  console.log('Migration completed:', data);
}

runMigration();
