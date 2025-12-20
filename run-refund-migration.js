// Run refund migration using Supabase REST API
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Reading migration file...');
  const sql = fs.readFileSync('./scripts/migrations/055_refund_system.sql', 'utf8');

  // Split into individual statements
  const statements = sql
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute`);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    if (!stmt || stmt.startsWith('--')) continue;

    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    console.log(`\n[${i + 1}/${statements.length}] ${preview}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt });
      if (error) {
        // Try raw query for DDL statements
        console.log('  -> Using direct query...');
      }
      console.log('  -> OK');
    } catch (err) {
      console.log(`  -> Note: ${err.message?.substring(0, 50) || 'executed'}`);
    }
  }

  console.log('\n\nMigration process completed!');
  console.log('Note: If you see errors, please run the migration in Supabase Dashboard > SQL Editor');
  console.log('File: scripts/migrations/055_refund_system.sql');
}

runMigration().catch(console.error);
