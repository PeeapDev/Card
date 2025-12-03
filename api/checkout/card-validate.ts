import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Card Validation API
 * Validates card details before PIN entry
 *
 * This endpoint is used to check if a card is valid before
 * prompting the user for their PIN.
 *
 * Returns:
 * - Card validity
 * - Masked card info (last 4 digits)
 * - Cardholder first name (for UI confirmation)
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
      cardNumber,
      expiryMonth,
      expiryYear,
    } = req.body;

    // Validation
    if (!cardNumber) {
      return res.status(400).json({ error: 'Card number is required', code: 'CARD_NUMBER_REQUIRED' });
    }

    if (!expiryMonth || !expiryYear) {
      return res.status(400).json({ error: 'Card expiry is required', code: 'EXPIRY_REQUIRED' });
    }

    // Clean card number
    const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');

    // Validate format
    if (!/^6200\d{8}$/.test(cleanCardNumber)) {
      return res.status(400).json({ error: 'Invalid card number', code: 'INVALID_CARD_FORMAT' });
    }

    // Parse expiry
    const expMonth = parseInt(expiryMonth, 10);
    const expYear = parseInt(expiryYear, 10);

    if (expMonth < 1 || expMonth > 12) {
      return res.status(400).json({ error: 'Invalid expiry month', code: 'INVALID_EXPIRY_MONTH' });
    }

    console.log('[CardValidate] Validating card:', cleanCardNumber.substring(0, 4) + '****' + cleanCardNumber.slice(-4));

    // Look up card
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select(`
        id,
        card_number,
        last_four,
        expiry_month,
        expiry_year,
        status,
        user_id,
        is_online_enabled
      `)
      .eq('card_number', cleanCardNumber)
      .single();

    if (cardError || !card) {
      return res.status(400).json({
        valid: false,
        error: 'Card not found',
        code: 'CARD_NOT_FOUND'
      });
    }

    // Validate expiry
    if (card.expiry_month !== expMonth || card.expiry_year !== expYear) {
      return res.status(400).json({
        valid: false,
        error: 'Invalid card details',
        code: 'INVALID_CARD_DETAILS'
      });
    }

    // Check status
    if (card.status !== 'ACTIVE') {
      return res.status(400).json({
        valid: false,
        error: 'Card is not active',
        code: 'CARD_INACTIVE'
      });
    }

    // Check online transactions
    if (card.is_online_enabled === false) {
      return res.status(400).json({
        valid: false,
        error: 'Online transactions disabled',
        code: 'ONLINE_DISABLED'
      });
    }

    // Get cardholder info (just first name for UI)
    const { data: user } = await supabase
      .from('users')
      .select('full_name, transaction_pin')
      .eq('id', card.user_id)
      .single();

    // Extract first name
    const firstName = user?.full_name?.split(' ')[0] || 'Cardholder';

    // Check if PIN is set
    const hasPinSet = !!user?.transaction_pin;

    console.log('[CardValidate] Card valid:', card.last_four);

    return res.status(200).json({
      valid: true,
      cardLastFour: card.last_four,
      cardholderFirstName: firstName,
      hasPinSet: hasPinSet,
      message: hasPinSet
        ? 'Card validated. Please enter your PIN to complete payment.'
        : 'Card validated but no PIN set. Please set your transaction PIN in the app first.'
    });

  } catch (error: any) {
    console.error('[CardValidate] Error:', error);
    return res.status(500).json({
      valid: false,
      error: error.message || 'Validation failed',
      code: 'INTERNAL_ERROR'
    });
  }
}
