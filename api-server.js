/**
 * Simple API Server for Local Development
 * Runs the mobile money lookup endpoint for testing registration
 */

const http = require('http');
const url = require('url');
const { createClient } = require('@supabase/supabase-js');

// Supabase config
const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';
const PORT = 3001;

async function getMonimeCredentials() {
  const { data, error } = await supabase
    .from('payment_settings')
    .select('monime_access_token, monime_space_id, monime_enabled')
    .eq('id', SETTINGS_ID)
    .single();

  if (error || !data || !data.monime_enabled) {
    throw new Error('Monime not configured');
  }
  return { accessToken: data.monime_access_token, spaceId: data.monime_space_id };
}

async function lookupMobileMoney(phoneNumber, providerId) {
  const config = await getMonimeCredentials();

  // Normalize phone number
  let digits = phoneNumber.replace(/\D/g, '').replace(/^232/, '');
  if (!digits.startsWith('0') && digits.length === 8) {
    digits = '0' + digits;
  }
  const fullPhoneNumber = `+232${digits.replace(/^0/, '')}`;

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
      success: false,
      error: data.error?.message || 'Account not found'
    };
  }

  return {
    success: true,
    verified: true,
    accountName: data.result?.account?.name || data.result?.account?.holderName,
    accountNumber: fullPhoneNumber,
    providerId: data.result?.provider?.id || providerId,
    providerName: data.result?.provider?.name
  };
}

const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const path = parsedUrl.pathname;

  // Mobile Money Lookup endpoint
  if (path === '/api/router/mobile-money/lookup' && req.method === 'GET') {
    const phoneNumber = parsedUrl.query.phoneNumber;
    const providerId = parsedUrl.query.providerId || 'm17';

    if (!phoneNumber) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Missing phoneNumber' }));
      return;
    }

    try {
      const result = await lookupMobileMoney(phoneNumber, providerId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
    } catch (err) {
      console.error('Lookup error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // Default response for other routes
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ name: 'Local API Server', status: 'running' }));
});

server.listen(PORT, () => {
  console.log(`API Server running at http://localhost:${PORT}`);
  console.log(`\nTest: curl "http://localhost:${PORT}/api/router/mobile-money/lookup?phoneNumber=072799454&providerId=m17"`);
});
