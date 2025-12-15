/**
 * Run wallet_type and name migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to load from .env.local
const envPath = path.join(__dirname, 'apps/web/.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length) {
      process.env[key.trim()] = valueParts.join('=').trim();
    }
  });
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running wallet_type and name migration...');

  try {
    // Add wallet_type column
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE wallets ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'primary'`
    });

    if (error1) {
      // Try direct approach if RPC doesn't exist
      console.log('RPC not available, trying direct query approach...');

      // Check if columns exist by trying to select them
      const { data, error: selectError } = await supabase
        .from('wallets')
        .select('wallet_type, name')
        .limit(1);

      if (selectError && selectError.message.includes('wallet_type')) {
        console.log('Columns do not exist. Please run the following SQL in Supabase SQL Editor:');
        console.log(`
-- Add wallet_type column
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS wallet_type VARCHAR(20) DEFAULT 'primary';

-- Add name column for wallet display names
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS name VARCHAR(100);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_wallets_wallet_type ON wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_wallets_user_type ON wallets(user_id, wallet_type);
        `);
      } else if (!selectError) {
        console.log('Columns already exist!');
      } else {
        console.log('Error checking columns:', selectError.message);
      }
    } else {
      console.log('Migration completed successfully!');
    }
  } catch (err) {
    console.error('Migration error:', err);
  }
}

runMigration();
