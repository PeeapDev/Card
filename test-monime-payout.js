/**
 * Test Monime Payout Directly
 *
 * This script tests the Monime mobile money payout functionality
 * Usage: node test-monime-payout.js <phoneNumber> <amount> <providerId>
 * Example: node test-monime-payout.js 077601707 100 m17
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase config
const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

// Monime amount conversion (SLE uses 100 multiplier for cents)
function toMonimeAmount(amount, currency) {
  return Math.round(amount * 100);
}

async function getMonimeCredentials() {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('monime_access_token, monime_space_id, monime_enabled')
    .eq('id', SETTINGS_ID)
    .single();

  if (error || !data) {
    throw new Error('Payment settings not found');
  }

  if (!data.monime_enabled) {
    throw new Error('Monime is not enabled');
  }

  if (!data.monime_access_token || !data.monime_space_id) {
    throw new Error('Monime credentials not configured');
  }

  return {
    accessToken: data.monime_access_token,
    spaceId: data.monime_space_id
  };
}

async function getFinancialAccountId(config) {
  const response = await fetch('https://api.monime.io/v1/financial-accounts', {
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Monime-Space-Id': config.spaceId,
      'Content-Type': 'application/json'
    }
  });

  const data = await response.json();
  console.log('Financial accounts:', JSON.stringify(data, null, 2));

  if (data.result && data.result.length > 0) {
    return data.result[0].id;
  }
  throw new Error('No financial accounts found');
}

async function lookupAccount(config, providerId, phoneNumber) {
  console.log(`\nLooking up account: ${phoneNumber} with provider ${providerId}...`);

  const response = await fetch(
    `https://api.monime.io/v1/provider-kyc/${providerId}?accountId=${encodeURIComponent(phoneNumber)}`,
    {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Monime-Space-Id': config.spaceId,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();
  console.log('Lookup result:', JSON.stringify(data, null, 2));
  return data.result;
}

async function createPayout(config, params) {
  console.log(`\nCreating payout: ${params.amount} SLE to ${params.phoneNumber}...`);

  const body = {
    amount: {
      currency: 'SLE',
      value: toMonimeAmount(params.amount, 'SLE')
    },
    destination: {
      type: 'momo',
      providerId: params.providerId,
      phoneNumber: params.phoneNumber  // Changed from accountNumber to phoneNumber
    },
    source: {
      financialAccountId: params.financialAccountId
    },
    metadata: {
      type: 'test_payout',
      description: 'Test payout from CLI'
    }
  };

  console.log('Payout request:', JSON.stringify(body, null, 2));

  const response = await fetch('https://api.monime.io/v1/payouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${config.accessToken}`,
      'Monime-Space-Id': config.spaceId,
      'Content-Type': 'application/json',
      'Idempotency-Key': `test_${Date.now()}`
    },
    body: JSON.stringify(body)
  });

  const data = await response.json();
  console.log('Payout result:', JSON.stringify(data, null, 2));
  return data;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: node test-monime-payout.js <phoneNumber> [amount] [providerId]');
    console.log('Example: node test-monime-payout.js 077601707 100 m17');
    console.log('\nProvider IDs:');
    console.log('  m17 - Orange Money');
    console.log('  m18 - Africell Money');
    process.exit(1);
  }

  let phoneNumber = args[0];
  const amount = parseFloat(args[1]) || 10; // Default 10 SLE
  const providerId = args[2] || 'm17'; // Default Orange Money

  // Normalize phone number
  phoneNumber = phoneNumber.replace(/\s+/g, '').replace(/^(\+232|232|0)/, '');
  if (!/^[0-9]{8}$/.test(phoneNumber)) {
    console.error('Invalid phone number. Expected 8 digits.');
    process.exit(1);
  }
  const fullPhoneNumber = `+232${phoneNumber}`;

  console.log('=== Monime Payout Test ===');
  console.log(`Phone: ${fullPhoneNumber}`);
  console.log(`Amount: ${amount} SLE`);
  console.log(`Provider: ${providerId}`);

  try {
    // Get Monime credentials
    console.log('\n1. Getting Monime credentials...');
    const config = await getMonimeCredentials();
    console.log('   Credentials loaded');

    // Get financial account
    console.log('\n2. Getting financial account...');
    const financialAccountId = await getFinancialAccountId(config);
    console.log(`   Account ID: ${financialAccountId}`);

    // Lookup account holder
    console.log('\n3. Looking up account holder...');
    const accountInfo = await lookupAccount(config, providerId, fullPhoneNumber);
    if (accountInfo) {
      console.log(`   Name: ${accountInfo.accountName || accountInfo.name || 'Unknown'}`);
      console.log(`   Verified: ${accountInfo.verified}`);
    }

    // Ask for confirmation before payout
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`\nProceed with payout of ${amount} SLE to ${fullPhoneNumber}? (y/n): `, async (answer) => {
      if (answer.toLowerCase() === 'y') {
        console.log('\n4. Creating payout...');
        const result = await createPayout(config, {
          amount,
          phoneNumber: fullPhoneNumber,
          providerId,
          financialAccountId
        });

        if (result.result) {
          console.log('\n=== PAYOUT SUCCESS ===');
          console.log(`Payout ID: ${result.result.id}`);
          console.log(`Status: ${result.result.status}`);
        } else {
          console.log('\n=== PAYOUT FAILED ===');
          console.log(result.error || result);
        }
      } else {
        console.log('Cancelled.');
      }
      rl.close();
    });

  } catch (error) {
    console.error('\nError:', error.message);
    process.exit(1);
  }
}

main();
