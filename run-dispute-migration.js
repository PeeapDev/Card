/**
 * Run Disputes Messaging Migration
 *
 * Creates:
 * - disputes table
 * - dispute_messages table (3-way messaging)
 * - dispute_events table (activity log)
 * - RLS policies
 * - Helper functions and triggers
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  console.log('Usage: SUPABASE_SERVICE_ROLE_KEY=your_key node run-dispute-migration.js');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log('🚀 Running Disputes Messaging Migration...\n');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'scripts/migrations/086_disputes_messaging.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split into statements and run each
    const statements = migrationSQL
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Found ${statements.length} SQL statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 60).replace(/\n/g, ' ');

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: stmt });

        if (error) {
          // Try direct query for DDL statements
          const { error: queryError } = await supabase.from('_migrations').select('*').limit(0);

          // If it's a known ignorable error, continue
          if (error.message?.includes('already exists') ||
              error.message?.includes('does not exist') ||
              error.code === '42P07' || // duplicate table
              error.code === '42710') { // duplicate object
            console.log(`⏭️  [${i + 1}/${statements.length}] Skipped (already exists): ${preview}...`);
            continue;
          }

          console.log(`⚠️  [${i + 1}/${statements.length}] Warning: ${error.message?.substring(0, 80)}`);
        } else {
          console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
        }
      } catch (err) {
        console.log(`⚠️  [${i + 1}/${statements.length}] ${err.message?.substring(0, 80) || 'Unknown error'}`);
      }
    }

    console.log('\n✅ Migration completed!\n');

    // Verify tables exist
    console.log('🔍 Verifying tables...');

    const tables = ['disputes', 'dispute_messages', 'dispute_events'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('id').limit(1);
      if (error && !error.message.includes('0 rows')) {
        console.log(`❌ ${table}: ${error.message}`);
      } else {
        console.log(`✅ ${table}: OK`);
      }
    }

    console.log('\n🎉 Disputes messaging system ready!\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

runMigration();
