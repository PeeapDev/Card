import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Get Payment Status API
 *
 * GET /api/payments/:id - Get payment details
 * POST /api/payments/:id - Update payment (for webhooks)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Business-Id, X-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Payment ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get payment from merchant_payments table first
      let { data: payment, error } = await supabase
        .from('merchant_payments')
        .select('*')
        .eq('id', id)
        .single();

      // If not found in merchant_payments, try transactions table
      if (error || !payment) {
        const { data: txn, error: txnError } = await supabase
          .from('transactions')
          .select('*')
          .eq('external_id', id)
          .single();

        if (txnError || !txn) {
          return res.status(404).json({ error: 'Payment not found' });
        }

        // Return transaction as payment format
        return res.status(200).json({
          id: txn.external_id || txn.id,
          reference: txn.reference || txn.external_id,
          amount: Math.abs(txn.amount),
          currency: txn.currency || 'SLE',
          status: (txn.status || 'pending').toLowerCase(),
          description: txn.description || '',
          customer: txn.metadata?.customer || {},
          metadata: txn.metadata || {},
          createdAt: txn.created_at,
          completedAt: txn.status === 'COMPLETED' ? txn.updated_at : null
        });
      }

      return res.status(200).json({
        id: payment.id,
        reference: payment.reference,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        description: payment.description,
        customer: {
          email: payment.customer_email,
          phone: payment.customer_phone,
          name: payment.customer_name
        },
        metadata: payment.metadata || {},
        paymentMethod: payment.payment_method,
        createdAt: payment.created_at,
        completedAt: payment.completed_at
      });

    } else if (req.method === 'POST') {
      // Update payment status (usually from webhook)
      const { status, paymentMethod, transactionId } = req.body;

      const updateData: any = {};
      if (status) updateData.status = status;
      if (paymentMethod) updateData.payment_method = paymentMethod;
      if (transactionId) updateData.transaction_id = transactionId;
      if (status === 'completed') updateData.completed_at = new Date().toISOString();

      const { data: payment, error } = await supabase
        .from('merchant_payments')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        return res.status(500).json({ error: 'Failed to update payment' });
      }

      return res.status(200).json({
        id: payment.id,
        reference: payment.reference,
        status: payment.status,
        updatedAt: new Date().toISOString()
      });

    } else {
      return res.status(405).json({ error: 'Method not allowed' });
    }

  } catch (error: any) {
    console.error('[Payment Status] Error:', error);
    return res.status(500).json({
      error: 'Failed to get payment',
      message: error.message
    });
  }
}
