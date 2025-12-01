/**
 * Add second user for P2P testing
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

const supabase = createClient(supabaseUrl, supabaseKey);

async function addSecondUser() {
  console.log('Adding second test user...\n');

  const email = 'user2@example.com';
  const externalId = `usr_${Date.now()}_user2`;

  // Check if user exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existing) {
    console.log('User already exists, skipping creation');

    // Just make sure wallet exists
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', existing.id)
      .single();

    if (!wallet) {
      const walletExternalId = `wal_${Date.now()}_user2`;
      await supabase.from('wallets').insert({
        external_id: walletExternalId,
        user_id: existing.id,
        wallet_type: 'primary',
        currency: 'USD',
        balance: 500,
        status: 'ACTIVE',
        daily_limit: 5000,
        monthly_limit: 50000,
      });
      console.log('Created wallet with $500');
    } else {
      console.log(`Wallet exists with $${wallet.balance}`);
    }
    return;
  }

  // Create user
  const { data: newUser, error: userError } = await supabase
    .from('users')
    .insert({
      external_id: externalId,
      email: email,
      password_hash: 'User123!@#', // Plain text for demo
      first_name: 'Jane',
      last_name: 'Smith',
      phone: '+1234567896',
      roles: 'user',
      kyc_tier: 1,
      kyc_status: 'APPROVED',
      status: 'ACTIVE',
      email_verified: true,
    })
    .select()
    .single();

  if (userError) {
    console.log('Error creating user:', userError.message);
    return;
  }

  console.log(`Created user: ${email}`);

  // Create wallet
  const walletExternalId = `wal_${Date.now()}_user2`;
  const { error: walletError } = await supabase
    .from('wallets')
    .insert({
      external_id: walletExternalId,
      user_id: newUser.id,
      wallet_type: 'primary',
      currency: 'USD',
      balance: 500,
      status: 'ACTIVE',
      daily_limit: 5000,
      monthly_limit: 50000,
    });

  if (walletError) {
    console.log('Wallet error:', walletError.message);
  } else {
    console.log('Created wallet with $500');
  }

  console.log('\n✓ Second user created successfully!\n');
  console.log('Credentials:');
  console.log('  Email:    user2@example.com');
  console.log('  Password: User123!@#');
  console.log('  Balance:  $500');
}

addSecondUser().catch(console.error);
