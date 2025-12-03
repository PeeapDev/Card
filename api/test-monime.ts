import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

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

    // Validate amount is a positive number
    const amountValue = Number(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }

    // Generate unique idempotency key using UUID
    const idempotencyKey = randomUUID();

    console.log('[Monime API] Creating checkout session...');
    console.log('[Monime API] Space ID:', spaceId);
    console.log('[Monime API] Amount (minor units):', amountValue, currency || 'SLE');
    console.log('[Monime API] Success URL:', successUrl);
    console.log('[Monime API] Cancel URL:', cancelUrl);

    // Build request body matching Monime API spec exactly
    const requestBody = {
      name: 'Test Payment',
      successUrl: successUrl || 'https://my.peeap.com/deposit/success',
      cancelUrl: cancelUrl || 'https://my.peeap.com/deposit/cancel',
      lineItems: [
        {
          type: 'custom',
          name: 'Test Payment',
          price: {
            currency: currency || 'SLE',
            value: amountValue,
          },
          quantity: 1,
          description: 'Test payment from admin dashboard',
        },
      ],
      metadata: {
        source: 'admin_dashboard',
        type: 'test_payment',
      },
    };

    console.log('[Monime API] Request body:', JSON.stringify(requestBody, null, 2));

    // Call Monime API with all required headers
    const response = await fetch('https://api.monime.io/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Monime-Space-Id': spaceId,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Monime API] Response status:', response.status, response.statusText);

    // Get response text first for better error handling
    const responseText = await response.text();
    console.log('[Monime API] Raw response:', responseText);

    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[Monime API] Failed to parse response:', parseError);
      return res.status(500).json({
        success: false,
        error: 'Invalid JSON response from Monime API',
        rawResponse: responseText.substring(0, 500),
      });
    }

    console.log('[Monime API] Parsed response:', JSON.stringify(data, null, 2));

    // Check for API errors
    if (!response.ok) {
      const errorMessage = data?.error?.message
        || data?.message
        || data?.error
        || `HTTP ${response.status}: ${response.statusText}`;

      console.error('[Monime API] Error response:', errorMessage);

      return res.status(response.status).json({
        success: false,
        error: errorMessage,
        details: data,
      });
    }

    // Validate success response
    if (!data.success) {
      return res.status(400).json({
        success: false,
        error: data?.error?.message || 'Checkout session creation failed',
        details: data,
      });
    }

    // Extract redirect URL from response
    const redirectUrl = data?.result?.redirectUrl;
    if (!redirectUrl) {
      console.error('[Monime API] No redirectUrl in response:', data);
      return res.status(500).json({
        success: false,
        error: 'No redirect URL returned from Monime',
        details: data,
      });
    }

    console.log('[Monime API] Success! Redirect URL:', redirectUrl);

    return res.status(200).json({
      success: true,
      url: redirectUrl,
      sessionId: data?.result?.id,
      orderNumber: data?.result?.orderNumber,
      status: data?.result?.status,
    });
  } catch (error: any) {
    console.error('[Monime API] Exception:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to Monime API',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
