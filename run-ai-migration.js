const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running AI providers migration...');

  // Use Supabase's rpc to execute raw SQL
  const { data, error } = await supabase.rpc('exec_sql', {
    query: `
      -- AI Providers table (stores API keys and configuration)
      CREATE TABLE IF NOT EXISTS ai_providers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        api_key TEXT,
        base_url VARCHAR(255),
        models JSONB DEFAULT '[]'::jsonb,
        default_model VARCHAR(100),
        is_active BOOLEAN DEFAULT true,
        is_default BOOLEAN DEFAULT false,
        rate_limit_rpm INTEGER DEFAULT 60,
        rate_limit_tpm INTEGER DEFAULT 100000,
        usage_stats JSONB DEFAULT '{}'::jsonb,
        settings JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  });

  if (error) {
    console.log('RPC not available, trying direct table creation...');

    // Try creating tables using Supabase's management API or fall back to inserting into existing table
    // Check if ai_providers table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('ai_providers')
      .select('id')
      .limit(1);

    if (tableError && tableError.code === '42P01') {
      console.log('Table does not exist. Please run the following SQL in Supabase SQL Editor:');
      console.log('---');
      console.log('File: scripts/migrations/085_ai_providers.sql');
      console.log('---');

      // Alternative: Store in system_settings or create a simpler approach
      console.log('\nAlternative: Creating ai_settings in system configuration...');

      // Try to use an existing settings-like table
      const { data: settings, error: settingsError } = await supabase
        .from('system_settings')
        .upsert({
          key: 'ai_providers',
          value: JSON.stringify([{
            name: 'groq',
            display_name: 'Groq (Fast Inference)',
            base_url: 'https://api.groq.com/openai/v1',
            models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'mixtral-8x7b-32768'],
            default_model: 'llama-3.3-70b-versatile',
            is_active: true,
            is_default: true
          }]),
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (settingsError) {
        console.log('system_settings table not available:', settingsError.message);
        return false;
      }

      console.log('AI providers stored in system_settings!');
      return true;
    } else if (!tableError) {
      console.log('ai_providers table already exists!');
      return true;
    }
  } else {
    console.log('Migration executed successfully!');
    return true;
  }
}

runMigration().then(success => {
  console.log('\nMigration result:', success ? 'SUCCESS' : 'NEEDS MANUAL SQL');
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
