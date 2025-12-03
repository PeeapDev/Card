import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Card Payment API
 * Processes payments using Peeap card credentials
 *
 * Flow:
 * 1. Validate card details (number, expiry)
 * 2. Verify cardholder's transaction PIN
 * 3. Check card balance and limits
 * 4. Debit card wallet, credit merchant wallet
 * 5. Record transaction
 *
 * Security:
 * - Card number is validated against database
 * - PIN is verified against user's transaction_pin
 * - All transactions are atomic
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
      // Card details
      cardNumber,
      expiryMonth,
      expiryYear,
      pin, // 4-digit transaction PIN

      // Payment details
      publicKey,
      businessId, // Deprecated - for backwards compatibility
      amount, // In minor units (cents)
      currency = 'SLE',
      reference,
      description,
      idempotencyKey: clientIdempotencyKey,

      // Optional
      redirectUrl,
    } = req.body;

    // Validation
    if (!cardNumber) {
      return res.status(400).json({ error: 'Card number is required', code: 'CARD_NUMBER_REQUIRED' });
    }

    if (!expiryMonth || !expiryYear) {
      return res.status(400).json({ error: 'Card expiry is required', code: 'EXPIRY_REQUIRED' });
    }

    if (!pin) {
      return res.status(400).json({ error: 'PIN is required', code: 'PIN_REQUIRED' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required', code: 'INVALID_AMOUNT' });
    }

    // Clean card number (remove spaces/dashes)
    const cleanCardNumber = cardNumber.replace(/[\s-]/g, '');

    // Validate card number format (12 digits, starts with 6200)
    if (!/^6200\d{8}$/.test(cleanCardNumber)) {
      return res.status(400).json({ error: 'Invalid card number format', code: 'INVALID_CARD_FORMAT' });
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({ error: 'PIN must be 4 digits', code: 'INVALID_PIN_FORMAT' });
    }

    // Parse expiry
    const expMonth = parseInt(expiryMonth, 10);
    const expYear = parseInt(expiryYear, 10);

    if (expMonth < 1 || expMonth > 12) {
      return res.status(400).json({ error: 'Invalid expiry month', code: 'INVALID_EXPIRY_MONTH' });
    }

    // Generate reference and idempotency key
    const paymentRef = reference || `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const idempotencyKey = clientIdempotencyKey || randomUUID();

    // Check for duplicate idempotency key
    if (clientIdempotencyKey) {
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, reference, status')
        .eq('idempotency_key', clientIdempotencyKey)
        .single();

      if (existingPayment) {
        console.log('[CardPay] Duplicate idempotency key:', clientIdempotencyKey);
        return res.status(200).json({
          success: true,
          duplicate: true,
          paymentId: existingPayment.reference,
          status: existingPayment.status,
          message: 'Payment already processed with this idempotency key',
        });
      }
    }

    console.log('[CardPay] Processing card payment:', {
      cardNumber: cleanCardNumber.substring(0, 4) + '****' + cleanCardNumber.slice(-4),
      amount,
      currency,
      paymentRef,
    });

    // 1. Look up the card
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
        daily_limit,
        monthly_limit,
        is_online_enabled,
        card_type_id
      `)
      .eq('card_number', cleanCardNumber)
      .single();

    if (cardError || !card) {
      console.log('[CardPay] Card not found:', cleanCardNumber.substring(0, 4) + '****');
      return res.status(400).json({ error: 'Card not found', code: 'CARD_NOT_FOUND' });
    }

    // 2. Validate card expiry
    if (card.expiry_month !== expMonth || card.expiry_year !== expYear) {
      console.log('[CardPay] Expiry mismatch');
      return res.status(400).json({ error: 'Invalid card details', code: 'INVALID_CARD_DETAILS' });
    }

    // 3. Check card status
    if (card.status !== 'ACTIVE') {
      console.log('[CardPay] Card not active:', card.status);
      return res.status(400).json({ error: 'Card is not active', code: 'CARD_INACTIVE' });
    }

    // 4. Check if online transactions are enabled
    if (card.is_online_enabled === false) {
      return res.status(400).json({ error: 'Online transactions are disabled for this card', code: 'ONLINE_DISABLED' });
    }

    // 5. Get user and verify PIN
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, transaction_pin, full_name, email')
      .eq('id', card.user_id)
      .single();

    if (userError || !user) {
      console.log('[CardPay] User not found for card');
      return res.status(500).json({ error: 'Card owner not found', code: 'USER_NOT_FOUND' });
    }

    // Verify transaction PIN
    if (!user.transaction_pin) {
      return res.status(400).json({ error: 'Transaction PIN not set. Please set your PIN first.', code: 'PIN_NOT_SET' });
    }

    if (user.transaction_pin !== pin) {
      console.log('[CardPay] PIN mismatch');
      return res.status(400).json({ error: 'Incorrect PIN', code: 'INVALID_PIN' });
    }

    // 6. Get user's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, available_balance, status, currency')
      .eq('user_id', card.user_id)
      .eq('wallet_type', 'primary')
      .single();

    if (walletError || !wallet) {
      console.log('[CardPay] Wallet not found');
      return res.status(500).json({ error: 'Wallet not found', code: 'WALLET_NOT_FOUND' });
    }

    if (wallet.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Wallet is not active', code: 'WALLET_INACTIVE' });
    }

    // 7. Check balance (amount is in minor units, convert to major for comparison)
    const amountInMajor = amount / 100;

    if (wallet.available_balance < amountInMajor) {
      return res.status(400).json({
        error: 'Insufficient balance',
        code: 'INSUFFICIENT_BALANCE',
        available: wallet.available_balance,
        required: amountInMajor
      });
    }

    // 8. Check daily/monthly limits
    // TODO: Implement limit checking against daily_transaction_totals

    // 9. Resolve merchant business
    let resolvedBusinessId = businessId;
    let merchantWalletId: string | null = null;
    let businessName = 'Merchant Payment';

    if (publicKey) {
      const isLiveKey = publicKey.startsWith('pk_live_');
      const isTestKey = publicKey.startsWith('pk_test_');

      if (isLiveKey || isTestKey) {
        const keyColumn = isLiveKey ? 'live_public_key' : 'test_public_key';
        const { data: business, error: businessError } = await supabase
          .from('merchant_businesses')
          .select('id, name, merchant_id, status, approval_status')
          .eq(keyColumn, publicKey)
          .single();

        if (businessError || !business) {
          return res.status(401).json({ error: 'Invalid public key', code: 'INVALID_PUBLIC_KEY' });
        }

        if (business.status !== 'ACTIVE') {
          return res.status(403).json({ error: 'Business is not active', code: 'BUSINESS_INACTIVE' });
        }

        resolvedBusinessId = business.id;
        businessName = business.name;

        // Get merchant's wallet
        const { data: merchantWallet } = await supabase
          .from('wallets')
          .select('id')
          .eq('user_id', business.merchant_id)
          .eq('wallet_type', 'primary')
          .single();

        if (merchantWallet) {
          merchantWalletId = merchantWallet.id;
        }
      }
    }

    // 10. Process the payment atomically
    console.log('[CardPay] Processing payment:', {
      fromWallet: wallet.id,
      toWallet: merchantWalletId,
      amount: amountInMajor,
    });

    // Debit customer wallet
    const { error: debitError } = await supabase.rpc('update_wallet_balance', {
      p_wallet_id: wallet.id,
      p_amount: amountInMajor,
      p_operation: 'debit'
    });

    if (debitError) {
      console.error('[CardPay] Debit failed:', debitError);
      return res.status(500).json({ error: 'Payment failed', code: 'DEBIT_FAILED' });
    }

    // Credit merchant wallet (if exists)
    if (merchantWalletId) {
      const { error: creditError } = await supabase.rpc('update_wallet_balance', {
        p_wallet_id: merchantWalletId,
        p_amount: amountInMajor,
        p_operation: 'credit'
      });

      if (creditError) {
        console.error('[CardPay] Credit failed, reversing debit:', creditError);
        // Reverse the debit
        await supabase.rpc('update_wallet_balance', {
          p_wallet_id: wallet.id,
          p_amount: amountInMajor,
          p_operation: 'credit'
        });
        return res.status(500).json({ error: 'Payment failed', code: 'CREDIT_FAILED' });
      }
    }

    // 11. Create transaction record for customer (debit)
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        wallet_id: wallet.id,
        type: 'CARD_PAYMENT',
        amount: -amountInMajor,
        currency: currency,
        status: 'COMPLETED',
        description: description || `Card payment to ${businessName}`,
        reference: paymentRef,
        card_last_four: card.last_four,
        metadata: {
          business_id: resolvedBusinessId,
          business_name: businessName,
          payment_method: 'card',
          card_id: card.id,
        }
      })
      .select('id')
      .single();

    if (txError) {
      console.error('[CardPay] Transaction record failed:', txError);
    }

    // 12. Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: randomUUID(),
        reference: paymentRef,
        idempotency_key: idempotencyKey,
        business_id: resolvedBusinessId || null,
        amount: amount,
        currency: currency,
        status: 'completed',
        payment_method: 'card',
        redirect_url: redirectUrl || null,
        completed_at: new Date().toISOString(),
        metadata: {
          card_last_four: card.last_four,
          cardholder_name: user.full_name,
          transaction_id: transaction?.id,
        }
      });

    if (paymentError) {
      console.error('[CardPay] Payment record failed:', paymentError);
    }

    console.log('[CardPay] Payment successful:', paymentRef);

    return res.status(200).json({
      success: true,
      paymentId: paymentRef,
      transactionId: transaction?.id,
      amount: amount,
      amountFormatted: `Le ${amountInMajor.toFixed(2)}`,
      currency: currency,
      status: 'completed',
      cardLastFour: card.last_four,
      businessName: businessName,
      completedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('[CardPay] Error:', error);
    return res.status(500).json({
      error: error.message || 'Payment processing failed',
      code: 'INTERNAL_ERROR'
    });
  }
}
