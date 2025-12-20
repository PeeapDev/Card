// Run the lookup_issued_card_for_payment migration
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from multiple locations
require('dotenv').config({ path: './apps/web/.env.local' });
require('dotenv').config({ path: './.env.local' });
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

async function runMigration() {
  console.log('Running lookup_issued_card_for_payment migration...\n');

  // Read the migration SQL
  const sql = fs.readFileSync(
    path.join(__dirname, 'scripts/migrations/060_lookup_issued_card_for_payment.sql'),
    'utf8'
  );

  // Use REST API to execute SQL
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
    console.log('RPC method not available, please run migration manually in Supabase SQL Editor:');
    console.log('------');
    console.log(sql);
    console.log('------');
    console.log('\nSteps:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Click on SQL Editor');
    console.log('3. Paste the SQL above and run it');
    return;
  }

  console.log('Migration completed successfully!');
}

runMigration().catch(console.error);
