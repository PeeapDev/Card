/**
 * Create wallets for existing users in Supabase
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createWallets() {
  console.log('Creating wallets for existing users...\n');

  // Get all users
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, roles');

  if (usersError || !users) {
    console.log('Error fetching users:', usersError?.message);
    return;
  }

  console.log(`Found ${users.length} users\n`);

  for (const user of users) {
    // Check if wallet already exists
    const { data: existingWallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (existingWallet) {
      console.log(`[SKIP]    ${user.email.padEnd(30)} - wallet exists`);
      continue;
    }

    // Determine initial balance based on role
    const role = user.roles?.split(',')[0] || 'user';
    let initialBalance = 1000;
    if (role === 'admin') initialBalance = 10000;
    else if (role === 'merchant') initialBalance = 5000;
    else if (role === 'agent') initialBalance = 2500;

    const walletExternalId = `wal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const { error: walletError } = await supabase
      .from('wallets')
      .insert({
        external_id: walletExternalId,
        user_id: user.id,
        wallet_type: 'primary',
        currency: 'USD',
        balance: initialBalance,
        status: 'ACTIVE',
        daily_limit: 5000,
        monthly_limit: 50000,
      });

    if (walletError) {
      console.log(`[ERROR]   ${user.email.padEnd(30)} - ${walletError.message}`);
    } else {
      console.log(`[CREATED] ${user.email.padEnd(30)} - $${initialBalance.toFixed(2)}`);
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n\nDone! Verifying wallets:\n');

  // Verify
  const { data: wallets } = await supabase
    .from('wallets')
    .select('user_id, balance, currency');

  if (wallets) {
    for (const w of wallets) {
      const user = users.find(u => u.id === w.user_id);
      console.log(`  ${user?.email?.padEnd(30) || 'Unknown'} $${w.balance} ${w.currency}`);
    }
  }
}

createWallets().catch(console.error);
