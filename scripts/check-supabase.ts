/**
 * Check Supabase data
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Checking Supabase data...\n');

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, roles, kyc_status')
    .limit(20);

  console.log('Users:');
  console.log('-'.repeat(70));
  if (usersError) {
    console.log('Error:', usersError.message);
  } else if (users && users.length > 0) {
    for (const u of users) {
      console.log(`  ${u.email?.padEnd(30) || 'N/A'} ${u.first_name} ${u.last_name} (${u.roles})`);
    }
  } else {
    console.log('  No users found');
  }

  console.log('\n\nWallets:');
  console.log('-'.repeat(70));

  // Get all wallets
  const { data: wallets, error: walletsError } = await supabase
    .from('wallets')
    .select('id, user_id, wallet_type, balance, currency, status')
    .limit(20);

  if (walletsError) {
    console.log('Error:', walletsError.message);
  } else if (wallets && wallets.length > 0) {
    for (const w of wallets) {
      console.log(`  ${w.id?.substring(0, 20).padEnd(22) || 'N/A'} user:${w.user_id?.substring(0, 8)} ${w.wallet_type?.padEnd(10)} $${w.balance} ${w.currency}`);
    }
  } else {
    console.log('  No wallets found');
  }

  // Check table schemas
  console.log('\n\nTable info:');
  console.log('-'.repeat(70));

  // Try to get column info
  const { data: userColumns } = await supabase.rpc('get_table_columns', { table_name: 'users' }).single();
  console.log('Users columns:', userColumns || 'Unable to fetch');
}

check().catch(console.error);
