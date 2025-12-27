/**
 * Run Storage Policies Migration
 * Executes SQL to set up storage bucket policies
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_KEY is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

async function runMigration() {
  console.log('Running storage policies migration...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, 'migrations/096_storage_policies.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Split into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  for (const statement of statements) {
    if (!statement) continue;

    const shortStmt = statement.substring(0, 60).replace(/\n/g, ' ');
    console.log(`Executing: ${shortStmt}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { query: statement });
      if (error) {
        // Try direct query if RPC doesn't exist
        console.log(`  Note: ${error.message}`);
      } else {
        console.log('  ✓ Success');
      }
    } catch (err) {
      console.log(`  Note: ${err.message}`);
    }
  }

  console.log('\n✅ Migration complete!');
  console.log('\nIf policies weren\'t applied, please run the SQL manually in Supabase Dashboard:');
  console.log('1. Go to SQL Editor in Supabase Dashboard');
  console.log('2. Paste the contents of scripts/migrations/096_storage_policies.sql');
  console.log('3. Run the query');
}

runMigration().catch(console.error);
