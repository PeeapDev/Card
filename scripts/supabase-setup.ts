/**
 * Supabase Setup via REST API
 * Run: npx tsx scripts/supabase-setup.ts
 *
 * This script creates tables using Supabase's SQL execution API
 */

import { createClient } from '@supabase/supabase-js';
import * as argon2 from 'argon2';

const SUPABASE_URL = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

// Use service key if available, otherwise anon key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY);

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

interface UserSeed {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roles: string;
  kycTier: number;
}

const users: UserSeed[] = [
  {
    email: 'admin@example.com',
    password: 'Admin123!@#',
    firstName: 'System',
    lastName: 'Administrator',
    roles: 'admin,user',
    kycTier: 3,
  },
  {
    email: 'user@example.com',
    password: 'User123!@#',
    firstName: 'Regular',
    lastName: 'User',
    roles: 'user',
    kycTier: 1,
  },
  {
    email: 'merchant@example.com',
    password: 'Merchant123!@#',
    firstName: 'Acme',
    lastName: 'Store',
    roles: 'merchant,user',
    kycTier: 2,
  },
  {
    email: 'developer@example.com',
    password: 'Developer123!@#',
    firstName: 'API',
    lastName: 'Developer',
    roles: 'developer,user',
    kycTier: 2,
  },
  {
    email: 'agent@example.com',
    password: 'Agent123!@#',
    firstName: 'Support',
    lastName: 'Agent',
    roles: 'agent,user',
    kycTier: 2,
  },
];

async function setup() {
  console.log('Setting up Supabase database...\n');

  // Create users table using Supabase client
  console.log('Creating users in Supabase...\n');
  console.log('=' .repeat(60));

  for (const user of users) {
    const passwordHash = await hashPassword(user.password);
    const externalId = `usr_${Date.now()}_${user.roles.split(',')[0]}`;

    // First, try to delete existing user
    await supabase
      .from('users')
      .delete()
      .eq('email', user.email);

    // Insert new user
    const { data, error } = await supabase
      .from('users')
      .insert({
        external_id: externalId,
        email: user.email,
        password_hash: passwordHash,
        first_name: user.firstName,
        last_name: user.lastName,
        status: 'ACTIVE',
        kyc_status: 'APPROVED',
        email_verified: true,
        roles: user.roles,
        kyc_tier: user.kycTier,
      })
      .select();

    if (error) {
      console.log(`[ERROR] ${user.email}: ${error.message}`);
      if (error.message.includes('relation "users" does not exist')) {
        console.log('\n⚠️  The "users" table does not exist!');
        console.log('Please run the SQL schema in Supabase SQL Editor first.\n');
        console.log('Go to: https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql');
        console.log('Then paste and run the schema SQL.\n');
        break;
      }
    } else {
      const primaryRole = user.roles.split(',')[0].toUpperCase();
      console.log(`[${primaryRole.padEnd(10)}] ${user.email.padEnd(25)} | ${user.password}`);
    }
  }

  console.log('=' .repeat(60));
  console.log('\nSetup complete!\n');
}

setup().catch(console.error);
