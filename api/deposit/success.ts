import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Monime Checkout Success Callback Handler
 *
 * This endpoint receives the callback from Monime after successful payment
 * and redirects the user to the frontend success page.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get session data from query params or body
    const sessionId = req.query.sessionId || req.body?.sessionId || '';
    const orderNumber = req.query.orderNumber || req.body?.orderNumber || '';
    const status = req.query.status || req.body?.status || 'success';

    console.log('[Deposit Success] Received callback:', {
      method: req.method,
      query: req.query,
      body: req.body,
    });

    // Build redirect URL with query params (frontend route is /deposit/success)
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    const redirectUrl = new URL('/deposit/success', frontendUrl);

    if (sessionId) redirectUrl.searchParams.set('sessionId', String(sessionId));
    if (orderNumber) redirectUrl.searchParams.set('orderNumber', String(orderNumber));
    redirectUrl.searchParams.set('status', String(status));

    console.log('[Deposit Success] Redirecting to:', redirectUrl.toString());

    // Redirect to frontend success page
    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('[Deposit Success] Error:', error);

    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    const redirectUrl = new URL('/deposit/success', frontendUrl);
    redirectUrl.searchParams.set('error', error.message || 'Unknown error');

    return res.redirect(302, redirectUrl.toString());
  }
}
