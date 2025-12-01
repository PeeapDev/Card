/**
 * Seed Real Users to Supabase
 * Run: npx tsx scripts/seed-supabase.ts
 *
 * Creates real users in Supabase:
 *
 * User 1:    john@demo.com     / Demo123!
 * User 2:    jane@demo.com     / Demo123!
 * Admin:     admin@demo.com    / Demo123!
 * Merchant:  merchant@demo.com / Demo123!
 * Agent:     agent@demo.com    / Demo123!
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

const supabase = createClient(supabaseUrl, supabaseKey);

interface UserSeed {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone: string;
  roles: string;
  kycTier: number;
}

const users: UserSeed[] = [
  {
    email: 'john@demo.com',
    password: 'Demo123!',
    firstName: 'John',
    lastName: 'Doe',
    phone: '+1234567001',
    roles: 'user',
    kycTier: 2,
  },
  {
    email: 'jane@demo.com',
    password: 'Demo123!',
    firstName: 'Jane',
    lastName: 'Smith',
    phone: '+1234567002',
    roles: 'user',
    kycTier: 2,
  },
  {
    email: 'admin@demo.com',
    password: 'Demo123!',
    firstName: 'Admin',
    lastName: 'User',
    phone: '+1234567003',
    roles: 'admin',
    kycTier: 3,
  },
  {
    email: 'merchant@demo.com',
    password: 'Demo123!',
    firstName: 'Acme',
    lastName: 'Store',
    phone: '+1234567004',
    roles: 'merchant',
    kycTier: 2,
  },
  {
    email: 'agent@demo.com',
    password: 'Demo123!',
    firstName: 'Support',
    lastName: 'Agent',
    phone: '+1234567005',
    roles: 'agent',
    kycTier: 2,
  },
];

async function seed() {
  console.log('Seeding users to Supabase...\n');
  console.log('='.repeat(70));

  // First, delete existing demo users
  console.log('\nCleaning up existing demo users...');
  for (const user of users) {
    await supabase.from('users').delete().eq('email', user.email);
  }

  console.log('\nCreating new users...\n');

  for (const user of users) {
    const externalId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const { data, error } = await supabase
      .from('users')
      .insert({
        external_id: externalId,
        email: user.email,
        password_hash: user.password, // Plain text for demo
        first_name: user.firstName,
        last_name: user.lastName,
        phone: user.phone,
        roles: user.roles,
        kyc_tier: user.kycTier,
        kyc_status: 'APPROVED',
        status: 'ACTIVE',
        email_verified: true,
      })
      .select()
      .single();

    if (error) {
      console.log(`[ERROR]   ${user.email.padEnd(25)} ${error.message}`);
    } else {
      console.log(`[CREATED] ${user.email.padEnd(25)} | ${user.firstName} ${user.lastName} (${user.roles})`);

      // Now create wallet for this user
      const walletExternalId = `wal_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const initialBalance = user.roles === 'admin' ? 10000 : user.roles === 'merchant' ? 5000 : 1000;

      const { error: walletError } = await supabase
        .from('wallets')
        .insert({
          external_id: walletExternalId,
          user_id: data.id,
          wallet_type: 'primary',
          currency: 'USD',
          balance: initialBalance,
          status: 'ACTIVE',
          daily_limit: 5000,
          monthly_limit: 50000,
        });

      if (walletError) {
        console.log(`          Wallet error: ${walletError.message}`);
      } else {
        console.log(`          Wallet: $${initialBalance.toFixed(2)}`);
      }
    }

    // Small delay to ensure unique external IDs
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log('\n' + '='.repeat(70));
  console.log('\nSeeding complete!\n');

  // Verify users
  console.log('Verifying created users:\n');
  const { data: createdUsers } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, roles')
    .in('email', users.map(u => u.email));

  if (createdUsers) {
    for (const u of createdUsers) {
      const { data: wallet } = await supabase
        .from('wallets')
        .select('balance')
        .eq('user_id', u.id)
        .single();

      console.log(`  ${u.email.padEnd(25)} ${u.first_name} ${u.last_name} (${u.roles}) - $${wallet?.balance || 0}`);
    }
  }

  console.log('\n\nLogin credentials (all use password: Demo123!):');
  console.log('-'.repeat(50));
  for (const user of users) {
    console.log(`  ${user.email}`);
  }
  console.log('\n');
}

seed().catch(console.error);
