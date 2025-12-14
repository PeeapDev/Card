/**
 * Test Mobile Money Account Lookup
 *
 * This tests the Monime KYC API to lookup account holder names
 * Usage: node test-momo-lookup.js <phoneNumber> [providerId]
 *
 * Example:
 *   node test-momo-lookup.js 072799454        # Orange Money (default)
 *   node test-momo-lookup.js 030123456 m18    # Africell Money
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase config
const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

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

  return {
    accessToken: data.monime_access_token,
    spaceId: data.monime_space_id
  };
}

async function lookupMobileMoneyAccount(phoneNumber, providerId = 'm17') {
  const config = await getMonimeCredentials();

  // Normalize phone number
  let normalized = phoneNumber.replace(/\s+/g, '').replace(/^(\+232|232|0)/, '');
  if (!/^[0-9]{8}$/.test(normalized)) {
    throw new Error('Invalid phone number format. Expected 8 digits.');
  }
  const fullPhoneNumber = `+232${normalized}`;

  console.log(`Looking up: ${fullPhoneNumber} on ${providerId === 'm17' ? 'Orange Money' : 'Africell Money'}...\n`);

  const response = await fetch(
    `https://api.monime.io/v1/provider-kyc/${providerId}?accountId=${encodeURIComponent(fullPhoneNumber)}`,
    {
      headers: {
        'Authorization': `Bearer ${config.accessToken}`,
        'Monime-Space-Id': config.spaceId,
        'Content-Type': 'application/json'
      }
    }
  );

  const data = await response.json();

  if (!data.success) {
    return {
      found: false,
      phoneNumber: fullPhoneNumber,
      providerId,
      providerName: providerId === 'm17' ? 'Orange Money' : 'Africell Money',
      error: data.error?.message || 'Account not found'
    };
  }

  const result = data.result;
  return {
    found: true,
    phoneNumber: result.account?.id || fullPhoneNumber,
    accountName: result.account?.name || result.account?.holderName,
    kycGrade: result.account?.metadata?.grade,
    providerId: result.provider?.id || providerId,
    providerName: result.provider?.name || (providerId === 'm17' ? 'Orange Money' : 'Africell Money'),
    providerType: result.provider?.type
  };
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Mobile Money Account Lookup\n');
    console.log('Usage: node test-momo-lookup.js <phoneNumber> [providerId]\n');
    console.log('Provider IDs:');
    console.log('  m17 - Orange Money (default)');
    console.log('  m18 - Africell Money\n');
    console.log('Examples:');
    console.log('  node test-momo-lookup.js 072799454');
    console.log('  node test-momo-lookup.js 030123456 m18');
    process.exit(1);
  }

  const phoneNumber = args[0];
  const providerId = args[1] || 'm17';

  try {
    const result = await lookupMobileMoneyAccount(phoneNumber, providerId);

    console.log('=== LOOKUP RESULT ===\n');

    if (result.found) {
      console.log(`✓ Account Found!`);
      console.log(`  Phone: ${result.phoneNumber}`);
      console.log(`  Name: ${result.accountName}`);
      console.log(`  Provider: ${result.providerName}`);
      console.log(`  KYC Grade: ${result.kycGrade || 'N/A'}`);
      console.log('\n--- For Registration ---');
      console.log(`  Suggested First Name: ${result.accountName?.split(' ')[0] || ''}`);
      console.log(`  Suggested Last Name: ${result.accountName?.split(' ').slice(1).join(' ') || ''}`);
    } else {
      console.log(`✗ Account Not Found`);
      console.log(`  Phone: ${result.phoneNumber}`);
      console.log(`  Provider: ${result.providerName}`);
      console.log(`  Error: ${result.error}`);
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
