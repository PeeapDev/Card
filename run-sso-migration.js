/**
 * Run SSO & OAuth migrations on Supabase
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);

  return !error || error.code !== '42P01';
}

async function runMigration() {
  console.log('🔧 Running SSO & OAuth Migrations');
  console.log('═'.repeat(50));

  // Check which tables exist
  const tables = [
    'sso_tokens',
    'oauth_clients',
    'oauth_authorization_codes',
    'oauth_access_tokens',
    'oauth_user_consents',
    'user_sessions',
    'user_contacts',
    'sso_settings',
    'sso_event_logs',
    'oauth_client_analytics'
  ];

  console.log('\n📊 Checking existing tables...\n');

  const missingTables = [];
  for (const table of tables) {
    const exists = await checkTableExists(table);
    if (exists) {
      console.log(`  ✅ ${table}`);
    } else {
      console.log(`  ❌ ${table} (missing)`);
      missingTables.push(table);
    }
  }

  if (missingTables.length > 0) {
    console.log('\n⚠️  Some tables are missing. Please create them in Supabase Dashboard:');
    console.log('   https://supabase.com/dashboard/project/akiecgwcxadcpqlvntmf/sql/new\n');
    console.log('   Run the SQL files:');
    console.log('   - supabase/migrations/20241211_create_sso_tokens.sql');
    console.log('   - supabase/migrations/20241212_create_oauth_tables.sql');
    console.log('   - supabase/migrations/20241213_create_sso_module.sql\n');
  }

  // Insert SSO settings
  console.log('\n📝 Inserting/Updating SSO settings...\n');

  const settings = [
    {
      setting_key: 'internal_sso',
      setting_value: {
        enabled: true,
        apps: {
          my: { enabled: true, domain: 'my.peeap.com', dev_port: 5173 },
          plus: { enabled: true, domain: 'plus.peeap.com', dev_port: 3000 },
          checkout: { enabled: true, domain: 'checkout.peeap.com', dev_port: 5174 },
          developer: { enabled: false, domain: 'developer.peeap.com', dev_port: 5175 }
        },
        token_expiry_minutes: 5,
        session_expiry_days: 7
      },
      description: 'Internal SSO configuration between Peeap domains'
    },
    {
      setting_key: 'external_sso',
      setting_value: {
        enabled: false,
        require_approval: true,
        allowed_scopes: ['profile', 'email', 'wallet:read', 'transactions:read'],
        dangerous_scopes: ['wallet:write', 'transfers:write'],
        token_expiry: {
          authorization_code_minutes: 10,
          access_token_hours: 1,
          refresh_token_days: 30
        }
      },
      description: 'External OAuth SSO for third-party integrations'
    },
    {
      setting_key: 'shared_api',
      setting_value: {
        enabled: true,
        endpoints: {
          user: true,
          contacts: true,
          wallet: true,
          transactions: true,
          transfer: true,
          checkout: true
        },
        rate_limits: { per_minute: 60, per_hour: 1000 },
        transfer_settings: {
          require_pin: false,
          max_amount: 1000000,
          daily_limit: 5000000
        }
      },
      description: 'Shared API configuration for cross-domain access'
    }
  ];

  for (const setting of settings) {
    try {
      const { error } = await supabase
        .from('sso_settings')
        .upsert(setting, { onConflict: 'setting_key' });

      if (error) {
        if (error.code === '42P01') {
          console.log(`  ⚠️  ${setting.setting_key}: sso_settings table doesn't exist`);
        } else {
          console.log(`  ⚠️  ${setting.setting_key}: ${error.message}`);
        }
      } else {
        console.log(`  ✅ Setting: ${setting.setting_key}`);
      }
    } catch (err) {
      console.log(`  ⚠️  ${setting.setting_key}: ${err.message}`);
    }
  }

  // Insert SSO modules
  console.log('\n📦 Inserting/Updating SSO modules...\n');

  const modules = [
    {
      code: 'sso_internal',
      name: 'Internal SSO',
      description: 'Single Sign-On between Peeap domains (my.peeap.com, plus.peeap.com, etc.)',
      category: 'security',
      version: '1.0.0',
      icon: '🔐',
      is_enabled: true,
      is_system: true,
      config: {
        enabled_apps: ['my', 'plus', 'checkout', 'developer'],
        token_expiry_minutes: 5,
        session_expiry_days: 7
      },
      dependencies: []
    },
    {
      code: 'sso_external',
      name: 'External SSO (OAuth)',
      description: 'Allow third-party websites to use "Login with Peeap" authentication',
      category: 'security',
      version: '1.0.0',
      icon: '🌐',
      is_enabled: false,
      is_system: true,
      config: {
        enabled: false,
        require_approval: true
      },
      dependencies: ['sso_internal']
    },
    {
      code: 'shared_api',
      name: 'Shared API',
      description: 'Cross-domain API access for contacts, wallet, transfers, and checkout',
      category: 'feature',
      version: '1.0.0',
      icon: '🔗',
      is_enabled: true,
      is_system: true,
      config: {
        enabled_endpoints: ['/shared/user', '/shared/contacts', '/shared/wallet', '/shared/transfer', '/shared/checkout/create']
      },
      dependencies: ['sso_internal']
    }
  ];

  for (const module of modules) {
    try {
      const { error } = await supabase
        .from('modules')
        .upsert(module, { onConflict: 'code' });

      if (error) {
        console.log(`  ⚠️  Module ${module.code}: ${error.message}`);
      } else {
        console.log(`  ✅ Module: ${module.name}`);
      }
    } catch (err) {
      console.log(`  ⚠️  Module ${module.code}: ${err.message}`);
    }
  }

  // Add source_app column to sso_tokens if it doesn't exist
  console.log('\n🔄 Updating sso_tokens table schema...\n');

  try {
    // Try to select with source_app to check if column exists
    const { error: checkError } = await supabase
      .from('sso_tokens')
      .select('source_app')
      .limit(1);

    if (checkError && checkError.message.includes('source_app')) {
      console.log('  ⚠️  source_app column missing - add via SQL:');
      console.log('     ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS source_app VARCHAR(50);');
      console.log('     ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS client_id VARCHAR(64);');
      console.log('     ALTER TABLE sso_tokens ADD COLUMN IF NOT EXISTS scope TEXT;');
    } else {
      console.log('  ✅ sso_tokens schema is up to date');
    }
  } catch (err) {
    console.log(`  ⚠️  Could not check sso_tokens schema: ${err.message}`);
  }

  console.log('\n═'.repeat(50));
  console.log('✨ Migration script complete!\n');

  if (missingTables.length > 0) {
    console.log('📋 ACTION REQUIRED:');
    console.log('   Run the full SQL migrations in Supabase Dashboard SQL Editor');
    console.log('   to create the missing tables listed above.\n');
  } else {
    console.log('🎉 All tables exist! SSO is ready to use.\n');
    console.log('📋 Next steps:');
    console.log('   1. Go to Admin > Modules to see SSO modules');
    console.log('   2. Click the settings icon to configure SSO');
    console.log('   3. Test SSO between my.peeap.com and plus.peeap.com\n');
  }
}

runMigration().catch(console.error);
