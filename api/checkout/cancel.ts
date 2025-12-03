import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Checkout Cancel Callback
 * Handles cancelled merchant/developer checkout payments
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { reference, businessId, redirect } = req.query;

    console.log('[Checkout Cancel] Callback received:', {
      method: req.method,
      reference,
      businessId,
    });

    // Update payment status if we have a reference
    if (reference) {
      await supabase
        .from('payments')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('reference', reference);
    }

    // Build redirect URL
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    let redirectUrl: URL;

    if (redirect && typeof redirect === 'string' && redirect.startsWith('http')) {
      // Redirect to merchant's custom URL
      redirectUrl = new URL(redirect);
      redirectUrl.searchParams.set('payment_id', String(reference || ''));
      redirectUrl.searchParams.set('status', 'cancelled');
    } else {
      // Redirect to default cancel page
      redirectUrl = new URL('/payment/cancel', frontendUrl);
      redirectUrl.searchParams.set('reference', String(reference || ''));
      if (businessId) redirectUrl.searchParams.set('businessId', String(businessId));
      redirectUrl.searchParams.set('status', 'cancelled');
    }

    console.log('[Checkout Cancel] Redirecting to:', redirectUrl.toString());
    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('[Checkout Cancel] Error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    return res.redirect(302, `${frontendUrl}/payment/error?error=${encodeURIComponent(error.message)}`);
  }
}
