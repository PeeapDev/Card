/**
 * Run Invoices & Mentions Migration
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running Invoices & Mentions Migration...\n');

  const migrationPath = path.join(__dirname, 'scripts/migrations/088_invoices_mentions.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolons and filter empty statements
  const statements = migrationSQL
    .split(/;(?=\s*(?:--|CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|GRANT|$))/i)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`Found ${statements.length} SQL statements to execute\n`);

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    const preview = statement.substring(0, 60).replace(/\n/g, ' ') + '...';

    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        console.log(`[${i + 1}] ERROR: ${preview}`);
        console.log(`    ${error.message}\n`);
        errorCount++;
      } else {
        console.log(`[${i + 1}] OK: ${preview}`);
        successCount++;
      }
    } catch (err) {
      console.log(`[${i + 1}] EXCEPTION: ${preview}`);
      console.log(`    ${err.message}\n`);
      errorCount++;
    }
  }

  console.log('\n========================================');
  console.log(`Migration complete: ${successCount} success, ${errorCount} errors`);

  if (errorCount > 0) {
    console.log('\nTo run manually, copy the SQL from:');
    console.log('scripts/migrations/088_invoices_mentions.sql');
    console.log('And paste it into your Supabase SQL Editor.');
  }
}

runMigration().catch(console.error);
