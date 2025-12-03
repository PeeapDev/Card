import type { VercelRequest, VercelResponse } from '@vercel/node';

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
    const { accessToken, spaceId, amount, currency, successUrl, cancelUrl } = req.body;

    if (!accessToken || !spaceId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accessToken, spaceId, amount'
      });
    }

    // Generate idempotency key
    const idempotencyKey = `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    console.log('[Monime API] Creating checkout session...');
    console.log('[Monime API] Space ID:', spaceId);
    console.log('[Monime API] Amount:', amount, currency || 'SLE');

    // Call Monime API
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
        successUrl: successUrl || 'https://my.peeap.com/deposit/success?sessionId={CHECKOUT_SESSION_ID}',
        cancelUrl: cancelUrl || 'https://my.peeap.com/deposit/cancel?sessionId={CHECKOUT_SESSION_ID}',
        metadata: {
          type: 'test_payment',
          initiated_by: 'admin_dashboard',
          idempotencyKey,
        },
      }),
    });

    console.log('[Monime API] Response status:', response.status);

    const data = await response.json() as any;
    console.log('[Monime API] Response:', JSON.stringify(data, null, 2));

    if (!response.ok || !data.success) {
      return res.status(response.status || 400).json({
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
    });
  } catch (error: any) {
    console.error('[Monime API] Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to Monime API',
    });
  }
}
