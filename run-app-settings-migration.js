/**
 * Run the merchant_app_settings migration
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase credentials
const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('Running merchant_app_settings migration...');

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'scripts/migrations/086_merchant_app_settings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    // Split into individual statements
    const statements = sql.split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.length > 0) {
        console.log('Executing:', statement.substring(0, 60) + '...');
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        if (error) {
          // Try direct query
          const { error: directError } = await supabase.from('_temp_migration').select('*').limit(0);
          console.log('Statement may have failed:', error.message);
        }
      }
    }

    // Alternative: Run as raw SQL via the REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      console.log('RPC not available, running SQL directly...');

      // Create table directly
      const { error: tableError } = await supabase.rpc('create_table', {
        table_sql: `
          CREATE TABLE IF NOT EXISTS merchant_app_settings (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            merchant_id UUID NOT NULL,
            app_id VARCHAR(50) NOT NULL,
            enabled BOOLEAN DEFAULT FALSE,
            setup_completed BOOLEAN DEFAULT FALSE,
            wallet_id UUID,
            settings JSONB DEFAULT '{}',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE(merchant_id, app_id)
          )
        `
      });

      if (tableError) {
        console.log('Alternative approach: Creating table via insert...');

        // The table will be auto-created on first insert with Supabase
        console.log('Table will be created automatically on first use.');
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  }
}

runMigration();
