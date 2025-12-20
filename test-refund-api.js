/**
 * Test Refund API Endpoints
 *
 * Usage: node test-refund-api.js
 *
 * Prerequisites:
 * 1. Run the migration in Supabase SQL Editor first
 * 2. Start local dev server: npx vercel dev --listen 3001
 */

const API_BASE = process.env.API_URL || 'http://localhost:3001/api';

// Get a valid SSO token from sso_tokens table for testing
// Or use an existing user's session token
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'YOUR_SSO_TOKEN_HERE';

async function testRefundAPI() {
  console.log('=== Refund API Test Suite ===\n');
  console.log('API Base:', API_BASE);
  console.log('');

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `SSO ${AUTH_TOKEN}`,
  };

  // Test 1: Get all refunds
  console.log('1. Testing GET /api/refunds...');
  try {
    const res = await fetch(`${API_BASE}/refunds`, { headers });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200));
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test 2: Get pending refunds
  console.log('\n2. Testing GET /api/refunds/pending...');
  try {
    const res = await fetch(`${API_BASE}/refunds/pending`, { headers });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2).substring(0, 200));
  } catch (err) {
    console.log('   Error:', err.message);
  }

  // Test 3: Create refund (uncomment to test - needs valid recipient ID)
  /*
  console.log('\n3. Testing POST /api/refunds...');
  try {
    const res = await fetch(`${API_BASE}/refunds`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        recipientId: 'RECIPIENT_USER_ID',
        amount: 10,
        reason: 'Test refund'
      })
    });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('   Error:', err.message);
  }
  */

  // Test 4: Process pending refunds (cron endpoint)
  console.log('\n3. Testing POST /api/cron/process-refunds...');
  try {
    const res = await fetch(`${API_BASE}/cron/process-refunds`, {
      method: 'POST',
      headers: {
        ...headers,
        'x-cron-secret': 'peeap-cron-secret'
      }
    });
    const data = await res.json();
    console.log('   Status:', res.status);
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('   Error:', err.message);
  }

  console.log('\n=== Tests Complete ===');
}

testRefundAPI().catch(console.error);
