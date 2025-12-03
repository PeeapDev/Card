import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { type, sessionId, redirect } = req.query;
    const defaultRedirect = 'https://my.peeap.com';

    if (type === 'cancel') {
      // Handle cancellation
      const redirectUrl = new URL(redirect as string || `${defaultRedirect}/deposit/cancel`);
      redirectUrl.searchParams.set('sessionId', sessionId as string || '');
      redirectUrl.searchParams.set('status', 'cancelled');
      return res.redirect(302, redirectUrl.toString());
    }

    // Handle success - verify the session with Monime
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('monime_access_token, monime_space_id')
      .eq('id', SETTINGS_ID)
      .single();

    if (!settings?.monime_access_token || !settings?.monime_space_id) {
      const redirectUrl = new URL(redirect as string || `${defaultRedirect}/deposit/success`);
      redirectUrl.searchParams.set('sessionId', sessionId as string || '');
      redirectUrl.searchParams.set('error', 'Settings not configured');
      return res.redirect(302, redirectUrl.toString());
    }

    // Verify session with Monime API
    const response = await fetch(`https://api.monime.io/v1/checkout-sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${settings.monime_access_token}`,
        'Monime-Space-Id': settings.monime_space_id,
      },
    });

    const data = await response.json() as any;

    // Build redirect URL with session data
    const redirectUrl = new URL(redirect as string || `${defaultRedirect}/deposit/success`);
    redirectUrl.searchParams.set('sessionId', sessionId as string || '');
    redirectUrl.searchParams.set('status', data?.result?.status || 'unknown');

    if (data?.result?.lineItems?.data?.[0]) {
      const lineItem = data.result.lineItems.data[0];
      redirectUrl.searchParams.set('amount', lineItem.price?.value || '0');
      redirectUrl.searchParams.set('currency', lineItem.price?.currency || 'SLE');
    }

    if (data?.result?.orderNumber) {
      redirectUrl.searchParams.set('orderNumber', data.result.orderNumber);
    }

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('Checkout callback error:', error);
    const defaultRedirect = 'https://my.peeap.com';
    const redirectUrl = new URL(req.query.redirect as string || `${defaultRedirect}/deposit/error`);
    redirectUrl.searchParams.set('error', error.message || 'Failed to process callback');
    return res.redirect(302, redirectUrl.toString());
  }
}
