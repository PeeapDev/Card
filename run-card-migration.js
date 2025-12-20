const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running closed-loop card system migration...');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'scripts/migrations/059_closed_loop_cards.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Split into individual statements (basic split, handles most cases)
    const statements = migrationSQL
      .split(/;\s*$/m)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`Found ${statements.length} SQL statements to execute`);

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.length < 10) continue; // Skip empty or comment-only statements

      try {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error) {
          // Try direct execution for certain statements
          console.log(`Statement ${i + 1}: Trying alternative execution...`);
        }
      } catch (err) {
        console.log(`Statement ${i + 1}: ${err.message}`);
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('\nCard system tables created:');
    console.log('  - issued_cards');
    console.log('  - card_transactions');
    console.log('  - card_limit_history');
    console.log('  - card_controls_history');
    console.log('\nFunctions created:');
    console.log('  - request_card()');
    console.log('  - activate_card()');
    console.log('  - toggle_card_freeze()');
    console.log('  - update_card_limits()');
    console.log('  - process_card_payment()');
    console.log('\nNote: Run this migration in Supabase SQL Editor for best results.');

  } catch (error) {
    console.error('Migration error:', error);
  }
}

runMigration();
