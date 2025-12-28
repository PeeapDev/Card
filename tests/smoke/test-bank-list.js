#!/usr/bin/env node
/**
 * Test Bank List Endpoint
 *
 * Specifically tests the Monime banks endpoint to debug issues.
 * Usage: node tests/smoke/test-bank-list.js [environment]
 */

const { createClient } = require('@supabase/supabase-js');

const API_URLS = {
  local: 'http://localhost:3000',
  prod: 'https://api.peeap.com'
};

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseKey);

const env = process.argv[2] || 'prod';
const API_BASE = API_URLS[env] || API_URLS.prod;

async function main() {
  console.log('\n🏦 Bank List Endpoint Test\n');
  console.log('='.repeat(50));

  // Step 1: Check Monime configuration in database
  console.log('\n📋 Step 1: Checking Monime configuration...\n');

  // Check modules table
  const { data: module, error: moduleError } = await supabase
    .from('modules')
    .select('*')
    .eq('code', 'monime')
    .single();

  if (moduleError) {
    console.log('  ⚠️  Modules table error:', moduleError.message);
  } else if (!module) {
    console.log('  ⚠️  Monime module not found in modules table');
  } else {
    console.log('  Module found:', {
      code: module.code,
      is_enabled: module.is_enabled,
      name: module.name
    });
    if (!module.is_enabled) {
      console.log('  ❌ Monime module is DISABLED!');
    }
  }

  // Check payment_gateway_config
  const { data: gatewayConfig, error: gatewayError } = await supabase
    .from('payment_gateway_config')
    .select('*')
    .eq('module_code', 'monime')
    .single();

  if (gatewayError && gatewayError.code !== 'PGRST116') {
    console.log('  ⚠️  Gateway config error:', gatewayError.message);
  } else if (gatewayConfig) {
    console.log('  Gateway config found:', {
      is_active: gatewayConfig.is_active,
      environment: gatewayConfig.environment,
      hasApiKey: !!gatewayConfig.api_key_encrypted,
      config: gatewayConfig.config ? Object.keys(gatewayConfig.config) : []
    });
  }

  // Check payment_settings (fallback)
  const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';
  const { data: settings, error: settingsError } = await supabase
    .from('payment_settings')
    .select('monime_access_token, monime_space_id, monime_enabled')
    .eq('id', SETTINGS_ID)
    .single();

  if (settingsError) {
    console.log('  ⚠️  Payment settings error:', settingsError.message);
  } else if (settings) {
    console.log('  Payment settings:', {
      monime_enabled: settings.monime_enabled,
      hasAccessToken: !!settings.monime_access_token,
      hasSpaceId: !!settings.monime_space_id,
      tokenPreview: settings.monime_access_token ? settings.monime_access_token.slice(0, 20) + '...' : null
    });

    if (!settings.monime_enabled) {
      console.log('  ❌ Monime is DISABLED in payment_settings!');
    }
    if (!settings.monime_access_token) {
      console.log('  ❌ Missing monime_access_token!');
    }
    if (!settings.monime_space_id) {
      console.log('  ❌ Missing monime_space_id!');
    }
  }

  // Step 2: Test the API endpoint
  console.log('\n📋 Step 2: Testing API endpoint...\n');
  console.log(`  URL: ${API_BASE}/payouts/banks?country=SL`);

  try {
    const response = await fetch(`${API_BASE}/payouts/banks?country=SL`);
    const contentType = response.headers.get('content-type');

    console.log('  Status:', response.status);
    console.log('  Content-Type:', contentType);

    if (contentType?.includes('text/html')) {
      console.log('  ❌ ERROR: Received HTML instead of JSON!');
      console.log('  This usually means the API is serving a frontend build.');
      console.log('  Check api.peeap.com deployment configuration.');
      return;
    }

    const data = await response.json();
    console.log('  Response:', JSON.stringify(data, null, 2).slice(0, 500));

    if (data.banks) {
      console.log(`\n  ✅ Found ${data.banks.length} banks`);
      if (data.banks.length > 0) {
        console.log('\n  Sample bank:', data.banks[0]);
      }
    } else if (data.error) {
      console.log('\n  ❌ API Error:', data.error);
      if (data.code) {
        console.log('  Error code:', data.code);
      }
    }
  } catch (error) {
    console.log('  ❌ Fetch error:', error.message);
  }

  // Step 3: Test Monime API directly
  console.log('\n📋 Step 3: Testing Monime API directly...\n');

  if (settings?.monime_access_token && settings?.monime_space_id) {
    try {
      const monimeResponse = await fetch('https://api.monime.io/v1/banks?country=SL&limit=50', {
        headers: {
          'Authorization': `Bearer ${settings.monime_access_token}`,
          'Monime-Space-Id': settings.monime_space_id,
          'Content-Type': 'application/json'
        }
      });

      const monimeData = await monimeResponse.json();
      console.log('  Monime Status:', monimeResponse.status);

      if (monimeData.result) {
        console.log(`  ✅ Monime returned ${monimeData.result.length} banks`);
        if (monimeData.result.length > 0) {
          console.log('  Sample:', monimeData.result[0]);
        }
      } else {
        console.log('  Monime response:', JSON.stringify(monimeData, null, 2).slice(0, 500));
      }
    } catch (error) {
      console.log('  ❌ Monime API error:', error.message);
    }
  } else {
    console.log('  ⚠️  Cannot test Monime directly - missing credentials');
  }

  console.log('\n' + '='.repeat(50));
  console.log('Done.\n');
}

main().catch(console.error);
