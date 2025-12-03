import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, spaceId, amount, currency } = req.body;

    if (!accessToken || !spaceId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accessToken, spaceId, amount'
      });
    }

    // Get settings for URLs
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('backend_url, frontend_url')
      .eq('id', SETTINGS_ID)
      .single();

    // Use configured URLs or fallback to current origin
    const baseUrl = settings?.backend_url || settings?.frontend_url || 'https://my.peeap.com';
    const frontendUrl = settings?.frontend_url || 'https://my.peeap.com';

    // Generate idempotency key
    const idempotencyKey = `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    // Build success and cancel URLs
    const successUrl = `${baseUrl}/api/settings/checkout-callback?type=success&sessionId={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(frontendUrl + '/deposit/success')}`;
    const cancelUrl = `${baseUrl}/api/settings/checkout-callback?type=cancel&sessionId={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(frontendUrl + '/deposit/cancel')}`;

    // Create checkout session with Monime
    const response = await fetch('https://api.monime.io/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Monime-Space-Id': spaceId,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        name: 'Test Payment - Admin Dashboard',
        lineItems: [
          {
            type: 'custom',
            name: 'Test Payment',
            price: {
              currency: currency || 'SLE',
              value: amount,
            },
            quantity: 1,
            description: 'Test payment from admin dashboard',
          },
        ],
        successUrl,
        cancelUrl,
        metadata: {
          type: 'test_payment',
          initiated_by: 'admin_dashboard',
          idempotencyKey,
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok || !data.success) {
      return res.status(400).json({
        success: false,
        error: data?.error?.message || data?.message || 'Failed to create checkout session',
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      url: data?.result?.redirectUrl,
      sessionId: data?.result?.id,
      orderNumber: data?.result?.orderNumber,
      data,
    });
  } catch (error: any) {
    console.error('Test checkout error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to Monime API',
    });
  }
}
