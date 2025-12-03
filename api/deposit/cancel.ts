import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Monime Checkout Cancel Callback Handler
 *
 * This endpoint receives the callback from Monime when user cancels payment
 * and redirects the user to the frontend cancel page.
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
    const reason = req.query.reason || req.body?.reason || 'cancelled';

    console.log('[Deposit Cancel] Received callback:', {
      method: req.method,
      query: req.query,
      body: req.body,
    });

    // Build redirect URL with query params (frontend route is /deposit/cancel)
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    const redirectUrl = new URL('/deposit/cancel', frontendUrl);

    if (sessionId) redirectUrl.searchParams.set('sessionId', String(sessionId));
    redirectUrl.searchParams.set('status', 'cancelled');
    redirectUrl.searchParams.set('reason', String(reason));

    console.log('[Deposit Cancel] Redirecting to:', redirectUrl.toString());

    // Redirect to frontend cancel page
    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('[Deposit Cancel] Error:', error);

    // Redirect to frontend with error
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    const redirectUrl = new URL('/deposit/cancel', frontendUrl);
    redirectUrl.searchParams.set('error', error.message || 'Unknown error');

    return res.redirect(302, redirectUrl.toString());
  }
}
