import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Checkout Session Creation API
 * For merchant/developer SDK checkout with Monime
 *
 * Security:
 * - Accepts publicKey (pk_xxx) instead of businessId for secure frontend usage
 * - Public keys are safe to expose in frontend code
 * - Secret keys (sk_xxx) should NEVER be sent to this endpoint
 *
 * Idempotency:
 * - Client can provide idempotencyKey to prevent duplicate payments
 * - If not provided, server generates one
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
    const {
      publicKey,
      businessId, // Deprecated - for backwards compatibility
      amount,
      currency = 'SLE',
      reference,
      idempotencyKey: clientIdempotencyKey, // Client-provided idempotency key
      description,
      customerEmail,
      customerPhone,
      paymentMethod,
      redirectUrl,
    } = req.body;

    if (!amount) {
      return res.status(400).json({ error: 'Amount is required' });
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

    // Resolve business from publicKey or businessId
    let businessName = 'Peeap Payment';
    let resolvedBusinessId = businessId;

    // If publicKey is provided, look up business by public key
    if (publicKey) {
      // Determine if it's a live or test key
      const isLiveKey = publicKey.startsWith('pk_live_');
      const isTestKey = publicKey.startsWith('pk_test_');

      if (!isLiveKey && !isTestKey) {
        // It might be a businessId passed as publicKey (backwards compatibility)
        resolvedBusinessId = publicKey;
      } else {
        // Look up business by public key
        const keyColumn = isLiveKey ? 'live_public_key' : 'test_public_key';
        const { data: business, error: businessError } = await supabase
          .from('merchant_businesses')
          .select('id, name, is_live_mode, approval_status, status')
          .eq(keyColumn, publicKey)
          .single();

        if (businessError || !business) {
          return res.status(401).json({ error: 'Invalid public key' });
        }

        // Check if business is active
        if (business.status !== 'ACTIVE') {
          return res.status(403).json({ error: 'Business is not active' });
        }

        // For live keys, business must be approved (or have trial transactions remaining)
        if (isLiveKey && business.approval_status !== 'APPROVED') {
          // Check trial transactions (basic check - full check would be more complex)
          if (business.approval_status === 'REJECTED' || business.approval_status === 'SUSPENDED') {
            return res.status(403).json({ error: 'Business is not approved for live payments' });
          }
        }

        resolvedBusinessId = business.id;
        businessName = business.name;
      }
    } else if (businessId) {
      // Legacy: businessId provided directly
      const { data: business } = await supabase
        .from('merchant_businesses')
        .select('name')
        .eq('id', businessId)
        .single();

      if (business) {
        businessName = business.name;
      }
    }

    // Generate unique payment reference
    const paymentRef = reference || `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Use client-provided idempotency key or generate one
    const idempotencyKey = clientIdempotencyKey || randomUUID();

    // Check for duplicate idempotency key (prevent duplicate payments)
    if (clientIdempotencyKey) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, reference, status')
        .eq('idempotency_key', clientIdempotencyKey)
        .single();

      if (existingPayment) {
        // Return the existing payment info instead of creating a new one
        console.log('[Checkout] Duplicate idempotency key detected:', clientIdempotencyKey);
        return res.status(200).json({
          success: true,
          duplicate: true,
          paymentId: existingPayment.reference,
          message: 'Payment already exists with this idempotency key',
        });
      }
    }

    // Build URLs
    const baseUrl = settings.frontend_url || 'https://my.peeap.com';
    const successUrl = `${baseUrl}/api/checkout/success?reference=${paymentRef}&businessId=${resolvedBusinessId || ''}&redirect=${encodeURIComponent(redirectUrl || '')}`;
    const cancelUrl = `${baseUrl}/api/checkout/cancel?reference=${paymentRef}&businessId=${resolvedBusinessId || ''}&redirect=${encodeURIComponent(redirectUrl || '')}`;

    console.log('[Checkout] Creating Monime session:', {
      publicKey: publicKey ? publicKey.substring(0, 15) + '...' : undefined,
      businessId: resolvedBusinessId,
      businessName,
      amount,
      currency,
      paymentRef,
      idempotencyKey,
      paymentMethod,
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
        name: description || `Payment to ${businessName}`,
        successUrl,
        cancelUrl,
        lineItems: [
          {
            type: 'custom',
            name: description || `Payment to ${businessName}`,
            price: {
              currency,
              value: amount, // Amount comes from frontend already in minor units
            },
            quantity: 1,
            description: `Payment ref: ${paymentRef}`,
            reference: paymentRef,
          },
        ],
        metadata: {
          type: 'merchant_payment',
          businessId: resolvedBusinessId || '',
          reference: paymentRef,
          idempotencyKey,
          customerEmail: customerEmail || '',
          customerPhone: customerPhone || '',
          paymentMethod: paymentMethod || 'mobile_money',
        },
      }),
    });

    const monimeData = await monimeResponse.json() as any;

    console.log('[Checkout] Monime response:', monimeResponse.status, JSON.stringify(monimeData, null, 2));

    if (!monimeResponse.ok || !monimeData.success) {
      return res.status(monimeResponse.status || 400).json({
        error: monimeData?.error?.message || 'Failed to create checkout session',
        details: monimeData,
      });
    }

    // Store payment record
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        id: randomUUID(),
        reference: paymentRef,
        idempotency_key: idempotencyKey,
        monime_session_id: monimeData.result?.id,
        business_id: resolvedBusinessId || null,
        amount,
        currency,
        status: 'pending',
        customer_email: customerEmail || null,
        customer_phone: customerPhone || null,
        payment_method: paymentMethod || 'mobile_money',
        redirect_url: redirectUrl || null,
        expires_at: monimeData.result?.expiresAt,
      });

    if (insertError) {
      console.error('[Checkout] Failed to store payment:', insertError);
      // Continue anyway - the checkout session is created
    }

    return res.status(200).json({
      success: true,
      paymentId: paymentRef,
      sessionId: monimeData.result?.id,
      paymentUrl: monimeData.result?.redirectUrl,
      amount,
      currency,
      expiresAt: monimeData.result?.expiresAt,
    });
  } catch (error: any) {
    console.error('[Checkout] Error:', error);
    return res.status(500).json({
      error: error.message || 'Failed to create checkout session',
    });
  }
}
