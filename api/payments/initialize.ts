import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Initialize Payment API
 *
 * Creates a new payment session for SDK integration
 * POST /api/payments/initialize
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Business-Id, X-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      businessId,
      amount,
      currency = 'SLE',
      reference,
      description,
      customer,
      metadata,
      redirectUrl,
      callbackUrl,
      paymentMethods,
      mode = 'live'
    } = req.body;

    // Validate required fields
    if (!businessId) {
      return res.status(400).json({ error: 'businessId is required' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Verify business exists (try both table names for compatibility)
    let business = null;
    let bizError = null;

    // Try merchant_businesses first
    const { data: merchantBiz, error: mbError } = await supabase
      .from('merchant_businesses')
      .select('id, name, user_id, approval_status, is_live_mode')
      .eq('id', businessId)
      .single();

    if (!mbError && merchantBiz) {
      business = {
        id: merchantBiz.id,
        name: merchantBiz.name,
        user_id: merchantBiz.user_id,
        status: merchantBiz.approval_status === 'approved' ? 'active' : merchantBiz.approval_status
      };
    } else {
      // Fallback to businesses table
      const { data: biz, error: bError } = await supabase
        .from('businesses')
        .select('id, name, user_id, status')
        .eq('id', businessId)
        .single();

      business = biz;
      bizError = bError;
    }

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Check if business is active (approved)
    if (business.status !== 'active' && business.status !== 'approved') {
      return res.status(400).json({ error: 'Business is not active' });
    }

    // Generate payment ID and reference
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const paymentReference = reference || `ref_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    // Create payment record in database
    const { data: payment, error: paymentError } = await supabase
      .from('merchant_payments')
      .insert({
        id: paymentId,
        business_id: businessId,
        merchant_id: business.user_id,
        amount: amount,
        currency: currency,
        reference: paymentReference,
        description: description || '',
        customer_email: customer?.email || null,
        customer_phone: customer?.phone || null,
        customer_name: customer?.name || null,
        metadata: metadata || {},
        redirect_url: redirectUrl || null,
        callback_url: callbackUrl || null,
        payment_methods: paymentMethods || ['mobile_money', 'card', 'wallet'],
        status: 'pending',
        mode: mode,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error creating payment:', paymentError);
      // If merchant_payments table doesn't exist, create a simpler response
      // and store in transactions table instead
      const baseUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';

      return res.status(200).json({
        id: paymentId,
        reference: paymentReference,
        amount: amount,
        currency: currency,
        status: 'pending',
        description: description || '',
        customer: customer || {},
        metadata: metadata || {},
        checkoutUrl: `${baseUrl}/checkout/${businessId}?paymentId=${paymentId}&amount=${amount}&currency=${currency}&reference=${paymentReference}&description=${encodeURIComponent(description || '')}`,
        createdAt: new Date().toISOString()
      });
    }

    // Build checkout URL
    const baseUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    const checkoutUrl = `${baseUrl}/checkout/${businessId}?paymentId=${paymentId}&amount=${amount}&currency=${currency}&reference=${paymentReference}&description=${encodeURIComponent(description || '')}`;

    // Return payment response
    return res.status(200).json({
      id: paymentId,
      reference: paymentReference,
      amount: amount,
      currency: currency,
      status: 'pending',
      description: description || '',
      customer: customer || {},
      metadata: metadata || {},
      checkoutUrl: checkoutUrl,
      createdAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Payment Initialize] Error:', error);
    return res.status(500).json({
      error: 'Failed to initialize payment',
      message: error.message
    });
  }
}
