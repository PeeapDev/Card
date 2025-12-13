/**
 * Fix SSO Tokens - Add missing columns
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkColumn(tableName, columnName) {
  const { data, error } = await supabase
    .from(tableName)
    .select(columnName)
    .limit(1);

  // If we get an error about the column not existing, it doesn't exist
  if (error && error.message && error.message.includes(columnName)) {
    return false;
  }
  return true;
}

async function runFix() {
  console.log('🔧 Fixing SSO Tokens Table');
  console.log('═'.repeat(50));

  // Check which columns exist
  const columnsToCheck = ['source_app', 'client_id', 'scope'];

  console.log('\n📊 Checking sso_tokens columns...\n');

  for (const col of columnsToCheck) {
    const exists = await checkColumn('sso_tokens', col);
    if (exists) {
      console.log(`  ✅ ${col} column exists`);
    } else {
      console.log(`  ❌ ${col} column missing`);
    }
  }

  console.log('\n📋 To add missing columns, run this SQL in Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql/new\n');
  console.log(`
-- Fix SSO Tokens Table
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS source_app VARCHAR(50);
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS client_id VARCHAR(64);
ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS scope TEXT;
CREATE INDEX IF NOT EXISTS idx_sso_tokens_source_app ON sso_tokens(source_app);
CREATE INDEX IF NOT EXISTS idx_sso_tokens_client_id ON sso_tokens(client_id) WHERE client_id IS NOT NULL;
  `);

  // Try to verify sso_settings table
  console.log('\n📊 Checking sso_settings table...\n');

  const { data: settings, error: settingsError } = await supabase
    .from('sso_settings')
    .select('setting_key')
    .limit(5);

  if (settingsError) {
    console.log(`  ⚠️  sso_settings: ${settingsError.message}`);

    if (settingsError.message.includes('schema cache')) {
      console.log('\n💡 To fix schema cache issue:');
      console.log('   1. Go to Supabase Dashboard > Settings > API');
      console.log('   2. Click "Reload schema cache" button');
      console.log('   OR run this SQL:');
      console.log('   SELECT pg_notify(\'pgrst\', \'reload schema\');\n');
    }
  } else {
    console.log(`  ✅ sso_settings table accessible (${settings?.length || 0} rows)`);
    if (settings) {
      settings.forEach(s => console.log(`     - ${s.setting_key}`));
    }
  }

  console.log('\n═'.repeat(50));
  console.log('✨ Check complete!\n');
}

runFix().catch(console.error);
