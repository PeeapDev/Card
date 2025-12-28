#!/usr/bin/env node
/**
 * Smoke Tests for Critical API Endpoints
 *
 * Run before deploying to catch breaking changes early.
 * Usage: node tests/smoke/test-api.js [environment]
 *
 * Environments:
 *   - local: http://localhost:3000
 *   - prod:  https://api.peeap.com
 */

const API_URLS = {
  local: 'http://localhost:3000',
  prod: 'https://api.peeap.com'
};

const env = process.argv[2] || 'prod';
const API_BASE = API_URLS[env] || API_URLS.prod;

console.log(`\n🧪 Running Smoke Tests against: ${API_BASE}\n`);

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (error) {
    console.log(`  ❌ ${name}`);
    console.log(`     Error: ${error.message}`);
    failed++;
  }
}

async function fetchJson(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });

  const contentType = response.headers.get('content-type');
  if (!contentType?.includes('application/json')) {
    throw new Error(`Expected JSON, got: ${contentType}`);
  }

  return { status: response.status, data: await response.json() };
}

// =============================================
// CRITICAL PATH TESTS
// =============================================

async function runTests() {
  console.log('📍 API Health & Basic Endpoints');
  console.log('─'.repeat(40));

  await test('API root returns JSON info', async () => {
    const { status, data } = await fetchJson('/');
    if (status !== 200) throw new Error(`Status: ${status}`);
    if (!data.name || !data.version) throw new Error('Missing name/version');
  });

  await test('Settings endpoint works', async () => {
    const { status, data } = await fetchJson('/settings');
    if (status !== 200) throw new Error(`Status: ${status}`);
    // Settings should return something (could be empty object)
  });

  console.log('\n📍 Payout & Banks');
  console.log('─'.repeat(40));

  await test('Bank list endpoint returns array', async () => {
    const { status, data } = await fetchJson('/payouts/banks?country=SL');
    if (status !== 200) throw new Error(`Status: ${status}`);
    if (!data.banks) throw new Error('Missing banks array');
    if (!Array.isArray(data.banks)) throw new Error('banks is not an array');
    console.log(`     Found ${data.banks.length} banks`);
  });

  await test('Mobile money providers endpoint works', async () => {
    const { status, data } = await fetchJson('/mobile-money/providers?country=SL');
    if (status !== 200) throw new Error(`Status: ${status}`);
    if (!data.providers && !data.success === false) {
      // Could be empty or have providers
    }
  });

  console.log('\n📍 Admin Transactions');
  console.log('─'.repeat(40));

  await test('Deposits endpoint returns data', async () => {
    const { status, data } = await fetchJson('/monime/deposits?limit=10');
    if (status !== 200) throw new Error(`Status: ${status}`);
    if (!data.data) throw new Error('Missing data array');
    if (!Array.isArray(data.data)) throw new Error('data is not an array');
    console.log(`     Found ${data.total || 0} deposits`);
  });

  await test('Payouts endpoint returns data', async () => {
    const { status, data } = await fetchJson('/payouts?limit=10');
    if (status !== 200) throw new Error(`Status: ${status}`);
    if (!data.payouts) throw new Error('Missing payouts array');
    console.log(`     Found ${data.total || 0} payouts`);
  });

  console.log('\n📍 Checkout Flow');
  console.log('─'.repeat(40));

  await test('Checkout sessions endpoint accessible', async () => {
    // GET without params should return error or empty, but not crash
    const { status, data } = await fetchJson('/checkout/sessions');
    // 400 is acceptable (missing params), 500 is not
    if (status === 500) throw new Error('Server error');
  });

  console.log('\n📍 Float & Balance (Admin)');
  console.log('─'.repeat(40));

  await test('Float summary endpoint accessible', async () => {
    const { status, data } = await fetchJson('/float/summary');
    // Might need auth, but shouldn't crash
    if (status === 500) throw new Error('Server error');
  });

  await test('Monime balance endpoint accessible', async () => {
    const { status, data } = await fetchJson('/monime/balance');
    // Might need auth or return error if not configured
    if (status === 500 && !data.error) throw new Error('Server error without message');
  });

  console.log('\n📍 OAuth Endpoints');
  console.log('─'.repeat(40));

  await test('OAuth token endpoint exists', async () => {
    const { status } = await fetchJson('/oauth/token', { method: 'POST', body: '{}' });
    // 400 is expected (missing params), 404/500 is bad
    if (status === 404) throw new Error('Endpoint not found');
    if (status === 500) throw new Error('Server error');
  });

  // =============================================
  // SUMMARY
  // =============================================

  console.log('\n' + '='.repeat(40));
  console.log(`📊 Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(40) + '\n');

  if (failed > 0) {
    console.log('❌ SMOKE TESTS FAILED - DO NOT DEPLOY\n');
    process.exit(1);
  } else {
    console.log('✅ All smoke tests passed - Safe to deploy\n');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
