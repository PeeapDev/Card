import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Monime Deposit API
 * Creates a checkout session for user wallet deposits
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const { walletId, amount, currency = 'SLE', description, userId } = req.body;

    if (!walletId || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: walletId, amount'
      });
    }

    // Get Monime settings
    const { data: settings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('monime_access_token, monime_space_id, monime_enabled, frontend_url')
      .eq('id', SETTINGS_ID)
      .single();

    if (settingsError || !settings) {
      return res.status(500).json({ error: 'Payment settings not configured' });
    }

    if (!settings.monime_enabled) {
      return res.status(400).json({ error: 'Monime payments are not enabled' });
    }

    if (!settings.monime_access_token || !settings.monime_space_id) {
      return res.status(500).json({ error: 'Monime credentials not configured' });
    }

    // Generate unique reference
    const reference = `dep_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const idempotencyKey = randomUUID();

    // Build URLs
    const baseUrl = settings.frontend_url || 'https://my.peeap.com';
    const successUrl = `${baseUrl}/api/deposit/success?walletId=${walletId}&reference=${reference}`;
    const cancelUrl = `${baseUrl}/api/deposit/cancel?walletId=${walletId}&reference=${reference}`;

    console.log('[Monime Deposit] Creating checkout session:', {
      walletId,
      amount,
      currency,
      reference,
    });

    // Create Monime checkout session
    const monimeResponse = await fetch('https://api.monime.io/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.monime_access_token}`,
        'Content-Type': 'application/json',
        'Monime-Space-Id': settings.monime_space_id,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        name: description || 'Wallet Deposit',
        successUrl,
        cancelUrl,
        lineItems: [
          {
            type: 'custom',
            name: 'Wallet Deposit',
            price: {
              currency,
              value: amount, // Already in minor units
            },
            quantity: 1,
            description: description || `Deposit to wallet ${walletId}`,
            reference: walletId,
          },
        ],
        metadata: {
          type: 'wallet_deposit',
          walletId,
          userId: userId || '',
          reference,
        },
      }),
    });

    const monimeData = await monimeResponse.json() as any;

    console.log('[Monime Deposit] Response:', monimeResponse.status, JSON.stringify(monimeData, null, 2));

    if (!monimeResponse.ok || !monimeData.success) {
      return res.status(monimeResponse.status || 400).json({
        error: monimeData?.error?.message || 'Failed to create checkout session',
        details: monimeData,
      });
    }

    // Store pending deposit in database
    const { error: insertError } = await supabase
      .from('monime_transactions')
      .insert({
        id: randomUUID(),
        type: 'DEPOSIT',
        status: 'pending',
        monime_reference: monimeData.result?.id || reference,
        wallet_id: walletId,
        user_id: userId || null,
        amount,
        currency,
        deposit_method: 'CHECKOUT_SESSION',
        payment_url: monimeData.result?.redirectUrl,
        description,
        expires_at: monimeData.result?.expiresAt,
      });

    if (insertError) {
      console.error('[Monime Deposit] Failed to store transaction:', insertError);
      // Continue anyway - the checkout session is created
    }

    return res.status(200).json({
      id: reference,
      monimeReference: monimeData.result?.id,
      status: 'pending',
      paymentUrl: monimeData.result?.redirectUrl,
      amount,
      currency,
      expiresAt: monimeData.result?.expiresAt,
    });
  } catch (error: any) {
    console.error('[Monime Deposit] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to initiate deposit',
    });
  }
}
