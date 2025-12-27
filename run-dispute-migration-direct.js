/**
 * Run Disputes Messaging Migration - Direct SQL
 */

const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

async function executeSql(sql) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ sql }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SQL execution failed: ${text}`);
  }

  return response.json();
}

async function runMigration() {
  console.log('🚀 Running Disputes Messaging Migration (Direct)...\n');

  // First, create the exec_sql function if it doesn't exist
  const createExecSqlFunction = `
    CREATE OR REPLACE FUNCTION exec_sql(sql text)
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      EXECUTE sql;
    END;
    $$;
  `;

  // Use the pg pool approach instead - call the SQL directly via the management API
  const migrationPath = path.join(__dirname, 'scripts/migrations/086_disputes_messaging.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📋 Migration SQL loaded. Running via Supabase SQL Editor...\n');
  console.log('Please run the following SQL in your Supabase SQL Editor:');
  console.log('Dashboard -> SQL Editor -> New Query\n');
  console.log('=' .repeat(60));
  console.log('\n-- Copy and paste this SQL:\n');
  console.log(migrationSQL);
  console.log('\n' + '='.repeat(60));
  console.log('\nAfter running, the disputes system will be ready.');
}

runMigration().catch(console.error);
