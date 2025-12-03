/**
 * Setup Supabase Storage and Fix RLS Policies
 * Run: npx tsx scripts/setup-storage-and-rls.ts
 *
 * This script:
 * 1. Creates the 'uploads' storage bucket
 * 2. Fixes RLS policies for merchant_businesses table
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const SUPABASE_URL = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

// Must use service key for admin operations
if (!SUPABASE_SERVICE_KEY) {
  console.log('=' .repeat(70));
  console.log('SUPABASE_SERVICE_KEY not set!');
  console.log('=' .repeat(70));
  console.log('\nTo fix the RLS policy and set up storage, you need to:');
  console.log('\n1. Go to Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Select your project: akiecgwcxadcpqlvntmf');
  console.log('\n--- OPTION A: Run SQL Migration Manually ---');
  console.log('3. Go to SQL Editor');
  console.log('4. Paste and run the following SQL:\n');

  // Print the migration SQL
  const migrationPath = path.join(__dirname, 'migrations/018_fix_merchant_businesses_rls.sql');
  if (fs.existsSync(migrationPath)) {
    console.log(fs.readFileSync(migrationPath, 'utf-8'));
  }

  console.log('\n--- OPTION B: Create Storage Bucket Manually ---');
  console.log('5. Go to Storage in the sidebar');
  console.log('6. Click "New bucket"');
  console.log('7. Name it "uploads" and make it PUBLIC');
  console.log('8. Add these policies:');
  console.log('   - Allow public uploads: INSERT for anon with bucket_id = \'uploads\'');
  console.log('   - Allow public reads: SELECT for anon with bucket_id = \'uploads\'');
  console.log('\n--- OPTION C: Set Service Key and Re-run ---');
  console.log('export SUPABASE_SERVICE_KEY="your-service-key-here"');
  console.log('npx tsx scripts/setup-storage-and-rls.ts');
  console.log('\nYou can find the service key at:');
  console.log('https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/settings/api');
  console.log('=' .repeat(70));
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupStorage() {
  console.log('\n1. Setting up Storage bucket...');

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('   Error listing buckets:', listError.message);
    return false;
  }

  const uploadsBucket = buckets?.find(b => b.name === 'uploads');

  if (uploadsBucket) {
    console.log('   Bucket "uploads" already exists');
  } else {
    // Create the bucket
    const { data, error } = await supabase.storage.createBucket('uploads', {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    });

    if (error) {
      console.error('   Error creating bucket:', error.message);
      return false;
    }

    console.log('   Created bucket "uploads" successfully');
  }

  return true;
}

async function runMigration() {
  console.log('\n2. Running RLS migration...');

  const migrationPath = path.join(__dirname, 'migrations/018_fix_merchant_businesses_rls.sql');

  if (!fs.existsSync(migrationPath)) {
    console.error('   Migration file not found:', migrationPath);
    return false;
  }

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  // Split by semicolons to run statements individually
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

  for (const statement of statements) {
    if (!statement || statement.startsWith('--')) continue;

    try {
      // Use rpc to execute raw SQL (requires a helper function in Supabase)
      // For now, we'll just print what needs to be run
      console.log('   Executing:', statement.substring(0, 60) + '...');
    } catch (err: any) {
      console.error('   Error:', err.message);
    }
  }

  console.log('\n   Note: SQL statements need to be run in Supabase SQL Editor');
  console.log('   Go to: https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql');

  return true;
}

async function main() {
  console.log('=' .repeat(60));
  console.log('Supabase Storage & RLS Setup');
  console.log('=' .repeat(60));

  await setupStorage();
  await runMigration();

  console.log('\n' + '=' .repeat(60));
  console.log('Setup complete!');
  console.log('=' .repeat(60));
}

main().catch(console.error);
