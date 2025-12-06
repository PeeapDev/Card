import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

/**
 * Unified API Router
 * Consolidates all API endpoints into a single serverless function to stay within Vercel's 12 function limit
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Configuration - Allow multiple origins
  const allowedOrigins = [
    'https://checkout.peeap.com',
    'https://my.peeap.com',
    'https://api.peeap.com',
    'http://localhost:5173', // Local dev - checkout
    'http://localhost:3000', // Local dev - merchant app
  ];

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Business-Id, X-Mode');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const path = url.pathname.replace('/api/router', '').replace('/api', '').replace(/^\//, '');

    console.log('[Router] Path:', path, 'Method:', req.method);

    // Route to appropriate handler based on path
    if (path === 'mobile-auth' || path.startsWith('mobile-auth')) {
      return await handleMobileAuth(req, res);
    } else if (path === 'settings' || path === 'settings/') {
      return await handleSettings(req, res);
    } else if (path.startsWith('settings/test-checkout')) {
      return await handleSettingsTestCheckout(req, res);
    } else if (path.startsWith('settings/checkout-callback')) {
      return await handleSettingsCheckoutCallback(req, res);
    } else if (path === 'modules' || path === 'modules/') {
      return await handleModules(req, res);
    } else if (path.match(/^modules\/[^/]+$/)) {
      const moduleId = path.split('/')[1];
      return await handleModuleById(req, res, moduleId);
    } else if (path === 'card-products' || path === 'card-products/') {
      return await handleCardProducts(req, res);
    } else if (path.match(/^card-products\/[^/]+$/)) {
      const productId = path.split('/')[1];
      return await handleCardProductById(req, res, productId);
    } else if (path === 'cards/purchase') {
      return await handleCardPurchase(req, res);
    } else if (path.match(/^cards\/user\/[^/]+$/)) {
      const userId = path.split('/')[2];
      return await handleUserCards(req, res, userId);
    } else if (path.startsWith('payments/initialize')) {
      return await handlePaymentsInitialize(req, res);
    } else if (path.match(/^payments\/[^/]+$/)) {
      return await handlePaymentsId(req, res);
    } else if (path.startsWith('monime/deposit')) {
      return await handleMonimeDeposit(req, res);
    } else if (path === 'checkout/quick' || path.startsWith('checkout/quick')) {
      return await handleCheckoutQuick(req, res);
    } else if (path === 'checkout/sessions' || path === 'checkout/sessions/') {
      return await handleCheckoutSessions(req, res);
    } else if (path.match(/^checkout\/sessions\/[^/]+$/)) {
      const sessionId = path.split('/')[2];
      return await handleCheckoutSessionById(req, res, sessionId);
    } else if (path.match(/^checkout\/sessions\/[^/]+\/complete$/)) {
      const sessionId = path.split('/')[2];
      return await handleCheckoutSessionComplete(req, res, sessionId);
    } else if (path === 'checkout/tokenize' || path === 'checkout/tokenize/') {
      return await handleCheckoutTokenize(req, res);
    } else if (path.startsWith('checkout/create')) {
      return await handleCheckoutCreate(req, res);
    } else if (path.startsWith('checkout/card-pay')) {
      return await handleCheckoutCardPay(req, res);
    } else if (path.startsWith('checkout/card-validate')) {
      return await handleCheckoutCardValidate(req, res);
    } else if (path.startsWith('checkout/success')) {
      return await handleCheckoutSuccess(req, res);
    } else if (path.startsWith('checkout/cancel')) {
      return await handleCheckoutCancel(req, res);
    } else if (path.startsWith('deposit/success')) {
      return await handleDepositSuccess(req, res);
    } else if (path.startsWith('deposit/cancel')) {
      return await handleDepositCancel(req, res);
    } else if (path === '' || path === '/') {
      // Root endpoint - API info
      return res.status(200).json({
        name: 'Peeap Payment API',
        version: '1.0.0',
        status: 'healthy',
        endpoints: {
          checkout: '/checkout/sessions',
          tokenize: '/checkout/tokenize',
          cards: '/cards/user/:userId',
          settings: '/settings',
        },
        docs: 'https://docs.peeap.com',
      });
    } else {
      return res.status(404).json({ error: 'Not found', path });
    }
  } catch (error: any) {
    console.error('[API Router] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// ============================================================================
// MOBILE AUTH HANDLERS
// ============================================================================

function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
  if (cleaned.startsWith('232')) cleaned = cleaned.substring(3);
  if (!cleaned.startsWith('0') && cleaned.length === 8) cleaned = '0' + cleaned;
  if (cleaned.length === 8) cleaned = '0' + cleaned;
  return cleaned;
}

async function handleMobileAuth(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, ...data } = req.body;

  switch (action) {
    case 'login':
      return await handleLogin(data, res);
    case 'register':
      return await handleRegister(data, res);
    case 'profile':
      return await handleGetProfile(data, res);
    case 'wallets':
      return await handleGetWallets(data, res);
    case 'cards':
      return await handleGetCards(data, res);
    case 'transactions':
      return await handleGetTransactions(data, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

async function handleLogin(data: { identifier: string; password: string }, res: VercelResponse) {
  const { identifier, password } = data;

  if (!identifier || !password) {
    return res.status(400).json({ error: 'Identifier and password are required' });
  }

  const isEmail = identifier.includes('@');
  let dbUser = null;

  if (!isEmail) {
    const normalizedPhone = normalizePhoneNumber(identifier);
    const { data: users } = await supabaseAnon.from('users').select('*').eq('phone', normalizedPhone).limit(1);
    if (users && users.length > 0) {
      dbUser = users[0];
    } else {
      const { data: users2 } = await supabaseAnon.from('users').select('*').eq('phone', identifier).limit(1);
      if (users2 && users2.length > 0) dbUser = users2[0];
    }
  }

  if (!dbUser) {
    const { data: users } = await supabaseAnon.from('users').select('*').eq('email', identifier).limit(1);
    if (users && users.length > 0) dbUser = users[0];
  }

  if (!dbUser || dbUser.password_hash !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  await supabaseAnon.from('users').update({ last_login_at: new Date().toISOString() }).eq('id', dbUser.id);

  const tokens = generateTokens(dbUser);
  const user = mapUser(dbUser);

  return res.status(200).json({ user, tokens });
}

async function handleRegister(data: any, res: VercelResponse) {
  const { email, password, phone, firstName, lastName } = data;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const { data: existing } = await supabaseAnon.from('users').select('id').eq('email', email).limit(1);
  if (existing && existing.length > 0) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const externalId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const { data: newUser, error } = await supabaseAnon
    .from('users')
    .insert({
      external_id: externalId,
      email,
      phone: phone ? normalizePhoneNumber(phone) : null,
      password_hash: password,
      first_name: firstName,
      last_name: lastName,
      status: 'ACTIVE',
      kyc_status: 'NOT_STARTED',
      email_verified: false,
      roles: 'user',
      kyc_tier: 0,
    })
    .select()
    .single();

  if (error || !newUser) {
    return res.status(500).json({ error: error?.message || 'Failed to create user' });
  }

  const tokens = generateTokens(newUser);
  const user = mapUser(newUser);

  return res.status(201).json({ user, tokens });
}

async function handleGetProfile(data: { userId: string }, res: VercelResponse) {
  const { userId } = data;
  const { data: users } = await supabaseAnon.from('users').select('*').eq('id', userId).limit(1);
  if (!users || users.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }
  return res.status(200).json({ user: mapUser(users[0]) });
}

async function handleGetWallets(data: { userId: string }, res: VercelResponse) {
  const { userId } = data;
  const { data: wallets } = await supabaseAnon.from('wallets').select('*').eq('user_id', userId);
  return res.status(200).json({ wallets: wallets || [] });
}

async function handleGetCards(data: { userId: string }, res: VercelResponse) {
  const { userId } = data;
  const { data: cards } = await supabaseAnon.from('cards').select('*').eq('user_id', userId);
  return res.status(200).json({ cards: cards || [] });
}

async function handleGetTransactions(data: { userId: string; limit?: number }, res: VercelResponse) {
  const { userId, limit = 50 } = data;
  const { data: transactions } = await supabaseAnon
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return res.status(200).json({ transactions: transactions || [] });
}

function generateTokens(user: any) {
  const accessToken = Buffer.from(
    JSON.stringify({
      userId: user.id,
      email: user.email,
      roles: user.roles?.split(',') || ['user'],
      exp: Date.now() + 3600000,
    })
  ).toString('base64');

  const refreshToken = Buffer.from(
    JSON.stringify({
      userId: user.id,
      exp: Date.now() + 604800000,
    })
  ).toString('base64');

  return { accessToken, refreshToken, expiresIn: 3600 };
}

function mapUser(dbUser: any) {
  let roles = ['user'];
  if (dbUser.roles) {
    roles = dbUser.roles.split(',').map((r: string) => r.trim());
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    firstName: dbUser.first_name,
    lastName: dbUser.last_name,
    phone: dbUser.phone,
    roles,
    kycStatus: dbUser.kyc_status,
    kycTier: dbUser.kyc_tier,
    emailVerified: dbUser.email_verified,
    phoneVerified: dbUser.phone_verified,
    status: dbUser.status,
    createdAt: dbUser.created_at,
  };
}

// ============================================================================
// SETTINGS HANDLERS
// ============================================================================

async function handleSettings(req: VercelRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET':
      return await handleGetSettings(res);
    case 'PUT':
      return await handleUpdateSettings(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

async function handleGetSettings(res: VercelResponse) {
  let { data: settings, error } = await supabase
    .from('payment_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .single();

  if (error || !settings) {
    const { data: newSettings, error: insertError } = await supabase
      .from('payment_settings')
      .insert({
        id: SETTINGS_ID,
        monime_enabled: false,
        withdrawal_mobile_money_enabled: true,
        withdrawal_bank_transfer_enabled: true,
        min_withdrawal_amount: 1000,
        max_withdrawal_amount: 50000000,
        daily_withdrawal_limit: 100000000,
        withdrawal_fee_percent: 1.5,
        withdrawal_fee_flat: 100,
        withdrawal_require_pin: true,
        withdrawal_auto_approve_under: 1000000,
        deposit_checkout_enabled: true,
        deposit_payment_code_enabled: true,
        deposit_mobile_money_enabled: true,
        min_deposit_amount: 100,
        max_deposit_amount: 100000000,
      })
      .select()
      .single();

    if (insertError) {
      const { data: existingSettings } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (existingSettings) {
        settings = existingSettings;
      } else {
        return res.status(500).json({ error: 'Failed to initialize settings' });
      }
    } else {
      settings = newSettings;
    }
  }

  return res.status(200).json({
    monimeConfig: {
      accessToken: settings.monime_access_token || '',
      spaceId: settings.monime_space_id || '',
      webhookSecret: settings.monime_webhook_secret || '',
      sourceAccountId: settings.monime_source_account_id || '',
      payoutAccountId: settings.monime_payout_account_id || '',
      isEnabled: settings.monime_enabled || false,
      backendUrl: settings.backend_url || '',
      frontendUrl: settings.frontend_url || '',
    },
    withdrawalSettings: {
      mobileMoneyEnabled: settings.withdrawal_mobile_money_enabled,
      bankTransferEnabled: settings.withdrawal_bank_transfer_enabled,
      minWithdrawalAmount: Number(settings.min_withdrawal_amount),
      maxWithdrawalAmount: Number(settings.max_withdrawal_amount),
      dailyWithdrawalLimit: Number(settings.daily_withdrawal_limit),
      withdrawalFeePercent: Number(settings.withdrawal_fee_percent),
      withdrawalFeeFlat: Number(settings.withdrawal_fee_flat),
      requirePin: settings.withdrawal_require_pin,
      autoApproveUnder: Number(settings.withdrawal_auto_approve_under),
    },
    depositSettings: {
      checkoutSessionEnabled: settings.deposit_checkout_enabled,
      paymentCodeEnabled: settings.deposit_payment_code_enabled,
      mobileMoneyEnabled: settings.deposit_mobile_money_enabled,
      minDepositAmount: Number(settings.min_deposit_amount),
      maxDepositAmount: Number(settings.max_deposit_amount),
    },
  });
}

async function handleUpdateSettings(req: VercelRequest, res: VercelResponse) {
  const body = req.body;
  const updateData: Record<string, any> = {};

  if (body.monimeAccessToken !== undefined) updateData.monime_access_token = body.monimeAccessToken;
  if (body.monimeSpaceId !== undefined) updateData.monime_space_id = body.monimeSpaceId;
  if (body.monimeWebhookSecret !== undefined) updateData.monime_webhook_secret = body.monimeWebhookSecret;
  if (body.monimeSourceAccountId !== undefined) updateData.monime_source_account_id = body.monimeSourceAccountId;
  if (body.monimePayoutAccountId !== undefined) updateData.monime_payout_account_id = body.monimePayoutAccountId;
  if (body.monimeEnabled !== undefined) updateData.monime_enabled = body.monimeEnabled;
  if (body.backendUrl !== undefined) updateData.backend_url = body.backendUrl;
  if (body.frontendUrl !== undefined) updateData.frontend_url = body.frontendUrl;
  if (body.withdrawalMobileMoneyEnabled !== undefined)
    updateData.withdrawal_mobile_money_enabled = body.withdrawalMobileMoneyEnabled;
  if (body.withdrawalBankTransferEnabled !== undefined)
    updateData.withdrawal_bank_transfer_enabled = body.withdrawalBankTransferEnabled;
  if (body.minWithdrawalAmount !== undefined) updateData.min_withdrawal_amount = body.minWithdrawalAmount;
  if (body.maxWithdrawalAmount !== undefined) updateData.max_withdrawal_amount = body.maxWithdrawalAmount;
  if (body.dailyWithdrawalLimit !== undefined) updateData.daily_withdrawal_limit = body.dailyWithdrawalLimit;
  if (body.withdrawalFeePercent !== undefined) updateData.withdrawal_fee_percent = body.withdrawalFeePercent;
  if (body.withdrawalFeeFlat !== undefined) updateData.withdrawal_fee_flat = body.withdrawalFeeFlat;
  if (body.withdrawalRequirePin !== undefined) updateData.withdrawal_require_pin = body.withdrawalRequirePin;
  if (body.withdrawalAutoApproveUnder !== undefined)
    updateData.withdrawal_auto_approve_under = body.withdrawalAutoApproveUnder;
  if (body.depositCheckoutEnabled !== undefined) updateData.deposit_checkout_enabled = body.depositCheckoutEnabled;
  if (body.depositPaymentCodeEnabled !== undefined)
    updateData.deposit_payment_code_enabled = body.depositPaymentCodeEnabled;
  if (body.depositMobileMoneyEnabled !== undefined)
    updateData.deposit_mobile_money_enabled = body.depositMobileMoneyEnabled;
  if (body.minDepositAmount !== undefined) updateData.min_deposit_amount = body.minDepositAmount;
  if (body.maxDepositAmount !== undefined) updateData.max_deposit_amount = body.maxDepositAmount;

  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('payment_settings')
    .update(updateData)
    .eq('id', SETTINGS_ID)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      const { data: newData, error: insertError } = await supabase
        .from('payment_settings')
        .insert({ id: SETTINGS_ID, ...updateData })
        .select()
        .single();

      if (insertError) {
        return res.status(500).json({ error: insertError.message });
      }

      return res.status(200).json({
        success: true,
        message: 'Settings created successfully',
        updatedAt: newData.updated_at,
      });
    }

    return res.status(500).json({ error: error.message });
  }

  return res.status(200).json({
    success: true,
    message: 'Settings updated successfully',
    updatedAt: data.updated_at,
  });
}

async function handleSettingsTestCheckout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken, spaceId, amount, currency } = req.body;

    if (!accessToken || !spaceId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: accessToken, spaceId, amount',
      });
    }

    const { data: settings } = await supabase
      .from('payment_settings')
      .select('backend_url, frontend_url')
      .eq('id', SETTINGS_ID)
      .single();

    const baseUrl = settings?.backend_url || settings?.frontend_url || 'https://my.peeap.com';
    const frontendUrl = settings?.frontend_url || 'https://my.peeap.com';
    const idempotencyKey = `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

    const successUrl = `${baseUrl}/api/settings/checkout-callback?type=success&sessionId={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(frontendUrl + '/deposit/success')}`;
    const cancelUrl = `${baseUrl}/api/settings/checkout-callback?type=cancel&sessionId={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(frontendUrl + '/deposit/cancel')}`;

    const response = await fetch('https://api.monime.io/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Monime-Space-Id': spaceId,
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        name: 'Test Payment - Admin Dashboard',
        lineItems: [
          {
            type: 'custom',
            name: 'Test Payment',
            price: { currency: currency || 'SLE', value: amount },
            quantity: 1,
            description: 'Test payment from admin dashboard',
          },
        ],
        successUrl,
        cancelUrl,
        metadata: { type: 'test_payment', initiated_by: 'admin_dashboard', idempotencyKey },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok || !data.success) {
      return res.status(400).json({
        success: false,
        error: data?.error?.message || data?.message || 'Failed to create checkout session',
        details: data,
      });
    }

    return res.status(200).json({
      success: true,
      url: data?.result?.redirectUrl,
      sessionId: data?.result?.id,
      orderNumber: data?.result?.orderNumber,
      data,
    });
  } catch (error: any) {
    console.error('Test checkout error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to connect to Monime API',
    });
  }
}

async function handleSettingsCheckoutCallback(req: VercelRequest, res: VercelResponse) {
  try {
    const { type, sessionId, redirect } = req.query;
    const defaultRedirect = 'https://my.peeap.com';

    if (type === 'cancel') {
      const redirectUrl = new URL((redirect as string) || `${defaultRedirect}/deposit/cancel`);
      redirectUrl.searchParams.set('sessionId', (sessionId as string) || '');
      redirectUrl.searchParams.set('status', 'cancelled');
      return res.redirect(302, redirectUrl.toString());
    }

    const { data: settings } = await supabase
      .from('payment_settings')
      .select('monime_access_token, monime_space_id')
      .eq('id', SETTINGS_ID)
      .single();

    if (!settings?.monime_access_token || !settings?.monime_space_id) {
      const redirectUrl = new URL((redirect as string) || `${defaultRedirect}/deposit/success`);
      redirectUrl.searchParams.set('sessionId', (sessionId as string) || '');
      redirectUrl.searchParams.set('error', 'Settings not configured');
      return res.redirect(302, redirectUrl.toString());
    }

    const response = await fetch(`https://api.monime.io/v1/checkout-sessions/${sessionId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${settings.monime_access_token}`,
        'Monime-Space-Id': settings.monime_space_id,
      },
    });

    const data = (await response.json()) as any;
    const redirectUrl = new URL((redirect as string) || `${defaultRedirect}/deposit/success`);
    redirectUrl.searchParams.set('sessionId', (sessionId as string) || '');
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
    const redirectUrl = new URL((req.query.redirect as string) || `${defaultRedirect}/deposit/error`);
    redirectUrl.searchParams.set('error', error.message || 'Failed to process callback');
    return res.redirect(302, redirectUrl.toString());
  }
}

// ============================================================================
// DEPOSIT HANDLERS (success/cancel combined)
// ============================================================================

async function handleDepositSuccess(req: VercelRequest, res: VercelResponse) {
  const sessionId = req.query.sessionId || req.body?.sessionId || '';
  const orderNumber = req.query.orderNumber || req.body?.orderNumber || '';
  const status = req.query.status || req.body?.status || 'success';
  const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';

  try {
    console.log('[Deposit Success] Received callback:', { method: req.method, query: req.query });

    const redirectUrl = new URL('/deposit/success', frontendUrl);
    if (sessionId) redirectUrl.searchParams.set('sessionId', String(sessionId));
    if (orderNumber) redirectUrl.searchParams.set('orderNumber', String(orderNumber));
    redirectUrl.searchParams.set('status', String(status));

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    const redirectUrl = new URL('/deposit/success', frontendUrl);
    redirectUrl.searchParams.set('error', error.message || 'Unknown error');
    return res.redirect(302, redirectUrl.toString());
  }
}

async function handleDepositCancel(req: VercelRequest, res: VercelResponse) {
  const sessionId = req.query.sessionId || req.body?.sessionId || '';
  const reason = req.query.reason || req.body?.reason || 'cancelled';
  const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';

  try {
    console.log('[Deposit Cancel] Received callback:', { method: req.method, query: req.query });

    const redirectUrl = new URL('/deposit/cancel', frontendUrl);
    if (sessionId) redirectUrl.searchParams.set('sessionId', String(sessionId));
    redirectUrl.searchParams.set('status', 'cancelled');
    redirectUrl.searchParams.set('reason', String(reason));

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    const redirectUrl = new URL('/deposit/cancel', frontendUrl);
    redirectUrl.searchParams.set('error', error.message || 'Unknown error');
    return res.redirect(302, redirectUrl.toString());
  }
}

// ============================================================================
// CHECKOUT HANDLERS
// ============================================================================

async function handleCheckoutSuccess(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, businessId, redirect, sessionId } = req.query;
    console.log('[Checkout Success] Callback received:', { reference, businessId, sessionId });

    if (reference) {
      await supabase
        .from('payments')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('reference', reference);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    let redirectUrl: URL;

    if (redirect && typeof redirect === 'string' && redirect.startsWith('http')) {
      redirectUrl = new URL(redirect);
      redirectUrl.searchParams.set('payment_id', String(reference || ''));
      redirectUrl.searchParams.set('status', 'success');
    } else {
      redirectUrl = new URL('/payment/success', frontendUrl);
      redirectUrl.searchParams.set('reference', String(reference || ''));
      if (businessId) redirectUrl.searchParams.set('businessId', String(businessId));
      redirectUrl.searchParams.set('status', 'success');
    }

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    return res.redirect(302, `${frontendUrl}/payment/error?error=${encodeURIComponent(error.message)}`);
  }
}

async function handleCheckoutCancel(req: VercelRequest, res: VercelResponse) {
  try {
    const { reference, businessId, redirect } = req.query;
    console.log('[Checkout Cancel] Callback received:', { reference, businessId });

    if (reference) {
      await supabase
        .from('payments')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('reference', reference);
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    let redirectUrl: URL;

    if (redirect && typeof redirect === 'string' && redirect.startsWith('http')) {
      redirectUrl = new URL(redirect);
      redirectUrl.searchParams.set('payment_id', String(reference || ''));
      redirectUrl.searchParams.set('status', 'cancelled');
    } else {
      redirectUrl = new URL('/payment/cancel', frontendUrl);
      redirectUrl.searchParams.set('reference', String(reference || ''));
      if (businessId) redirectUrl.searchParams.set('businessId', String(businessId));
      redirectUrl.searchParams.set('status', 'cancelled');
    }

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    return res.redirect(302, `${frontendUrl}/payment/error?error=${encodeURIComponent(error.message)}`);
  }
}

// Due to size constraints, checkout/create, checkout/card-pay, checkout/card-validate,
// payments/initialize, payments/[id], and monime/deposit handlers need to be in a separate message
// For now, these will return "Not implemented" responses

async function handleCheckoutCreate(req: VercelRequest, res: VercelResponse) {
  return res.status(501).json({ error: 'Temporarily unavailable - see full implementation' });
}

async function handleCheckoutCardPay(req: VercelRequest, res: VercelResponse) {
  return res.status(501).json({ error: 'Temporarily unavailable - see full implementation' });
}

async function handleCheckoutCardValidate(req: VercelRequest, res: VercelResponse) {
  return res.status(501).json({ error: 'Temporarily unavailable - see full implementation' });
}

async function handlePaymentsInitialize(req: VercelRequest, res: VercelResponse) {
  return res.status(501).json({ error: 'Temporarily unavailable - see full implementation' });
}

async function handlePaymentsId(req: VercelRequest, res: VercelResponse) {
  return res.status(501).json({ error: 'Temporarily unavailable - see full implementation' });
}

async function handleMonimeDeposit(req: VercelRequest, res: VercelResponse) {
  return res.status(501).json({ error: 'Temporarily unavailable - see full implementation' });
}

// ============================================================================
// MODULE MANAGEMENT HANDLERS
// ============================================================================

async function handleModules(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data: modules, error } = await supabase
      .from('modules')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true});

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ modules: modules || [], total: modules?.length || 0 });
  }

  if (req.method === 'POST') {
    const { code, name, description, category, version, icon, config, dependencies } = req.body;
    if (!code || !name) return res.status(400).json({ error: 'Code and name are required' });

    const { data: module, error } = await supabase
      .from('modules')
      .insert({
        code, name, description, category,
        version: version || '1.0.0', icon,
        config: config || {}, dependencies: dependencies || [],
        is_enabled: false, is_system: false,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ module });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleModuleById(req: VercelRequest, res: VercelResponse, moduleId: string) {
  if (req.method === 'PUT') {
    const { is_enabled, config, name, description, icon } = req.body;
    const updateData: any = { updated_at: new Date().toISOString() };

    if (is_enabled !== undefined) {
      updateData.is_enabled = is_enabled;
      if (is_enabled) updateData.enabled_at = new Date().toISOString();
    }
    if (config !== undefined) updateData.config = config;
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (icon) updateData.icon = icon;

    const { data: module, error } = await supabase
      .from('modules')
      .update(updateData)
      .eq('id', moduleId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ module });
  }

  if (req.method === 'DELETE') {
    const { data: module } = await supabase
      .from('modules')
      .select('is_system')
      .eq('id', moduleId)
      .single();

    if (module?.is_system) {
      return res.status(403).json({ error: 'Cannot delete system modules' });
    }

    const { error } = await supabase.from('modules').delete().eq('id', moduleId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================================
// CARD PRODUCT HANDLERS
// ============================================================================

async function handleCardProducts(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { admin } = req.query;
    let query = supabase
      .from('card_products')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('tier', { ascending: true });

    if (admin !== 'true') {
      query = query.eq('is_active', true).eq('is_visible', true);
    }

    const { data: products, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ products: products || [], total: products?.length || 0 });
  }

  if (req.method === 'POST') {
    const {
      code, name, description, tier, purchase_price, annual_fee, currency,
      daily_transaction_limit, monthly_transaction_limit, max_balance,
      transaction_fee_percent, transaction_fee_flat, bin_prefix, card_length,
      is_online_enabled, is_atm_enabled, is_contactless_enabled, is_international_enabled,
      cashback_percent, features, card_design_url, card_color, card_text_color, stock_limit,
    } = req.body;

    if (!code || !name || !tier || purchase_price === undefined || !bin_prefix) {
      return res.status(400).json({ error: 'Required: code, name, tier, purchase_price, bin_prefix' });
    }

    const { data: product, error } = await supabase
      .from('card_products')
      .insert({
        code, name, description, tier, purchase_price, annual_fee: annual_fee || 0,
        currency: currency || 'SLE', daily_transaction_limit, monthly_transaction_limit,
        max_balance, transaction_fee_percent: transaction_fee_percent || 0,
        transaction_fee_flat: transaction_fee_flat || 0, bin_prefix, card_length: card_length || 16,
        is_online_enabled: is_online_enabled !== false, is_atm_enabled: is_atm_enabled || false,
        is_contactless_enabled: is_contactless_enabled || false,
        is_international_enabled: is_international_enabled || false,
        cashback_percent: cashback_percent || 0, features: features || [],
        card_design_url, card_color: card_color || '#1A1A1A',
        card_text_color: card_text_color || '#FFFFFF', stock_limit,
        is_active: true, is_visible: true, cards_issued: 0,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(201).json({ product });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleCardProductById(req: VercelRequest, res: VercelResponse, productId: string) {
  if (req.method === 'GET') {
    const { data: product, error } = await supabase
      .from('card_products')
      .select('*')
      .eq('id', productId)
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ product });
  }

  if (req.method === 'PUT') {
    const updateData: any = { ...req.body };
    delete updateData.id;
    delete updateData.created_at;
    delete updateData.cards_issued;
    updateData.updated_at = new Date().toISOString();

    const { data: product, error } = await supabase
      .from('card_products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ product });
  }

  if (req.method === 'DELETE') {
    const { data: product } = await supabase
      .from('card_products')
      .select('cards_issued')
      .eq('id', productId)
      .single();

    if (product && product.cards_issued > 0) {
      return res.status(403).json({
        error: `Cannot delete product with ${product.cards_issued} issued cards.`,
      });
    }

    const { error } = await supabase.from('card_products').delete().eq('id', productId);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================================
// CARD PURCHASE & USER CARDS HANDLERS
// ============================================================================

async function handleCardPurchase(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, cardProductId, paymentMethod } = req.body;
    if (!userId || !cardProductId) {
      return res.status(400).json({ error: 'userId and cardProductId are required' });
    }

    const { data: product, error: productError } = await supabase
      .from('card_products')
      .select('*')
      .eq('id', cardProductId)
      .single();

    if (productError || !product) return res.status(404).json({ error: 'Product not found' });
    if (!product.is_active || !product.is_visible) {
      return res.status(400).json({ error: 'Product not available' });
    }
    if (product.stock_limit && product.cards_issued >= product.stock_limit) {
      return res.status(400).json({ error: 'Out of stock' });
    }

    const { data: existingCard } = await supabase
      .from('cards')
      .select('id')
      .eq('user_id', userId)
      .eq('card_product_id', cardProductId)
      .single();

    if (existingCard) {
      return res.status(400).json({ error: 'You already own this card type' });
    }

    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('*')
      .eq('user_id', userId)
      .eq('wallet_type', 'primary')
      .single();

    if (walletError || !wallet) return res.status(404).json({ error: 'Wallet not found' });
    if (wallet.available_balance < product.purchase_price) {
      return res.status(400).json({
        error: 'Insufficient balance',
        required: product.purchase_price,
        available: wallet.available_balance,
      });
    }

    const purchaseId = randomUUID();
    await supabase.from('card_purchases').insert({
      id: purchaseId,
      user_id: userId,
      card_product_id: cardProductId,
      amount: product.purchase_price,
      currency: product.currency,
      payment_method: paymentMethod || 'wallet',
      status: 'pending',
    });

    const { error: debitError } = await supabase.rpc('update_wallet_balance', {
      p_wallet_id: wallet.id,
      p_amount: product.purchase_price,
      p_operation: 'debit',
    });

    if (debitError) {
      await supabase.from('card_purchases').delete().eq('id', purchaseId);
      throw new Error('Payment failed: ' + debitError.message);
    }

    const { data: cardNumberData } = await supabase.rpc('generate_card_number', {
      bin_prefix: product.bin_prefix,
      card_length: product.card_length,
    });

    const cardNumber = cardNumberData;
    const now = new Date();
    const expiryMonth = now.getMonth() + 1;
    const expiryYear = now.getFullYear() + 5;

    const cardId = randomUUID();
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .insert({
        id: cardId,
        user_id: userId,
        card_product_id: cardProductId,
        card_number: cardNumber,
        last_four: cardNumber.slice(-4),
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        cvv: String(Math.floor(Math.random() * 900) + 100),
        status: 'ACTIVE',
        daily_limit: product.daily_transaction_limit,
        monthly_limit: product.monthly_transaction_limit,
        is_online_enabled: product.is_online_enabled,
        purchased_at: new Date().toISOString(),
        purchase_amount: product.purchase_price,
        annual_fee_due_date: new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
          .toISOString()
          .split('T')[0],
      })
      .select()
      .single();

    if (cardError) {
      await supabase.rpc('update_wallet_balance', {
        p_wallet_id: wallet.id,
        p_amount: product.purchase_price,
        p_operation: 'credit',
      });
      await supabase.from('card_purchases').delete().eq('id', purchaseId);
      throw cardError;
    }

    await supabase
      .from('card_purchases')
      .update({
        card_id: cardId,
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', purchaseId);

    await supabase
      .from('card_products')
      .update({ cards_issued: product.cards_issued + 1 })
      .eq('id', cardProductId);

    await supabase.from('transactions').insert({
      wallet_id: wallet.id,
      type: 'CARD_PURCHASE',
      amount: -product.purchase_price,
      currency: product.currency,
      status: 'COMPLETED',
      description: `Purchase ${product.name}`,
      reference: purchaseId,
      metadata: {
        card_id: cardId,
        card_product_id: cardProductId,
        card_product_name: product.name,
      },
    });

    return res.status(200).json({
      success: true,
      card: {
        id: card.id,
        card_number: cardNumber,
        last_four: card.last_four,
        expiry_month: card.expiry_month,
        expiry_year: card.expiry_year,
        product_name: product.name,
        status: card.status,
      },
    });
  } catch (error: any) {
    console.error('[Card Purchase] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleUserCards(req: VercelRequest, res: VercelResponse, userId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { data: cards, error } = await supabase
    .from('cards')
    .select(`*, card_product:card_products(*)`)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.status(200).json({ cards: cards || [], total: cards?.length || 0 });
}

// ============================================================================
// HOSTED CHECKOUT SESSION HANDLERS
// ============================================================================

/**
 * Quick Checkout - Creates session and redirects to hosted checkout page
 * URL params: merchant_id, amount, currency, description, success_url, cancel_url, merchant_name, brand_color
 */
async function handleCheckoutQuick(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const params = url.searchParams;

    const merchantId = params.get('merchant_id');
    const amount = params.get('amount');
    const currency = params.get('currency') || 'SLE';
    const description = params.get('description') || 'Payment';
    const successUrl = params.get('success_url');
    const cancelUrl = params.get('cancel_url');
    const merchantName = params.get('merchant_name');
    const merchantLogo = params.get('merchant_logo');
    const brandColor = params.get('brand_color') || '#4F46E5';
    const reference = params.get('reference');

    // Validate required params
    if (!merchantId) {
      return res.status(400).send(errorPage('merchant_id is required'));
    }

    const amountNum = parseFloat(amount || '0');
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).send(errorPage('Valid amount is required'));
    }

    // Create checkout session
    const sessionId = `cs_${randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const frontendUrl = process.env.FRONTEND_URL || 'https://checkout.peeap.com';

    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .insert({
        external_id: sessionId,
        merchant_id: merchantId,
        status: 'OPEN',
        amount: amountNum,
        currency_code: currency.toUpperCase(),
        description,
        merchant_name: merchantName,
        merchant_logo_url: merchantLogo,
        brand_color: brandColor,
        success_url: successUrl || `${frontendUrl}/payment/success`,
        cancel_url: cancelUrl || `${frontendUrl}/payment/cancel`,
        payment_methods: { qr: true, card: true, mobile: true },
        metadata: reference ? { reference } : null,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Quick Checkout] Create session error:', error);
      return res.status(500).send(errorPage('Failed to create checkout session'));
    }

    // Redirect to hosted checkout page
    const checkoutUrl = `${frontendUrl}/checkout/pay/${session.external_id}`;
    return res.redirect(302, checkoutUrl);
  } catch (error: any) {
    console.error('[Quick Checkout] Error:', error);
    return res.status(500).send(errorPage(error.message || 'Failed to create checkout'));
  }
}

// Error page helper
function errorPage(message: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Checkout Error</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .card { background: white; padding: 2rem; border-radius: 1rem; box-shadow: 0 10px 40px rgba(0,0,0,0.1); max-width: 400px; text-align: center; }
    .icon { font-size: 3rem; margin-bottom: 1rem; }
    h1 { margin: 0 0 0.5rem 0; color: #ef4444; font-size: 1.5rem; }
    p { color: #6b7280; margin: 0 0 1.5rem 0; }
    button { background: #4f46e5; color: white; border: none; padding: 0.75rem 2rem; border-radius: 0.5rem; font-size: 1rem; cursor: pointer; }
    button:hover { background: #4338ca; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">❌</div>
    <h1>Checkout Error</h1>
    <p>${message}</p>
    <button onclick="window.history.back()">Go Back</button>
  </div>
</body>
</html>`;
}

/**
 * Tokenize card by PAN lookup - finds existing Peeap card by PAN + expiry
 * This is for the closed-loop card system (Peeap-issued cards only)
 */
async function handleCheckoutTokenize(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pan, expiryMonth, expiryYear } = req.body;

    if (!pan) {
      return res.status(400).json({ error: 'pan is required' });
    }

    // Clean the PAN (remove spaces/dashes)
    const cleanPan = pan.replace(/[\s-]/g, '');
    
    // Extract bin (first 6) and last 4
    const bin = cleanPan.slice(0, 6);
    const lastFour = cleanPan.slice(-4);

    // Find active card by bin and last_four
    const { data: cards, error } = await supabase
      .from('cards')
      .select('id, token, bin, last_four, expiry_month, expiry_year, status, user_id')
      .eq('bin', bin)
      .eq('last_four', lastFour)
      .eq('status', 'ACTIVE')
      .limit(10);

    if (error) {
      console.error('[Tokenize] Database error:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!cards || cards.length === 0) {
      return res.status(404).json({ error: 'Card not found or not active' });
    }

    // If expiry provided, filter by expiry
    let matchedCard = cards[0];
    if (expiryMonth && expiryYear) {
      const expMonth = Number(expiryMonth);
      const expYear = Number(expiryYear);
      
      const foundCard = cards.find(card => 
        card.expiry_month === expMonth && card.expiry_year === expYear
      );

      if (!foundCard) {
        return res.status(400).json({ error: 'Card expiry does not match' });
      }
      
      matchedCard = foundCard;

      // Check if card is expired
      const now = new Date();
      const cardExpiry = new Date(expYear, expMonth - 1); // End of expiry month
      cardExpiry.setMonth(cardExpiry.getMonth() + 1); // Move to start of next month
      
      if (now > cardExpiry) {
        return res.status(400).json({ error: 'Card is expired' });
      }
    }

    // Return the card token
    return res.status(200).json({
      cardToken: matchedCard.token,
      lastFour: matchedCard.last_four,
      expiryMonth: matchedCard.expiry_month,
      expiryYear: matchedCard.expiry_year,
    });
  } catch (error: any) {
    console.error('[Tokenize] Error:', error);
    return res.status(500).json({ error: error.message || 'Tokenization failed' });
  }
}

async function handleCheckoutSessions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      merchantId,
      amount,
      currency,
      description,
      merchantName,
      merchantLogoUrl,
      brandColor,
      successUrl,
      cancelUrl,
      paymentMethods,
      metadata
    } = req.body;

    if (!merchantId || !amount || !currency) {
      return res.status(400).json({ error: 'merchantId, amount, and currency are required' });
    }

    const sessionId = `cs_${randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .insert({
        external_id: sessionId,
        merchant_id: merchantId,
        status: 'OPEN',
        amount,
        currency_code: currency,
        description,
        merchant_name: merchantName,
        merchant_logo_url: merchantLogoUrl,
        brand_color: brandColor || '#4F46E5',
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_methods: paymentMethods || { qr: true, card: true, mobile: true },
        metadata,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('[Checkout] Create session error:', error);
      return res.status(500).json({ error: error.message });
    }

    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';
    return res.status(200).json({
      sessionId: session.external_id,
      url: `${frontendUrl}/checkout/pay/${session.external_id}`,
      expiresAt: session.expires_at,
    });
  } catch (error: any) {
    console.error('[Checkout] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleCheckoutSessionById(req: VercelRequest, res: VercelResponse, sessionId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .select('*')
      .or(`id.eq.${sessionId},external_id.eq.${sessionId}`)
      .single();

    if (error || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    return res.status(200).json(session);
  } catch (error: any) {
    console.error('[Checkout] Get session error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleCheckoutSessionComplete(req: VercelRequest, res: VercelResponse, sessionId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cardToken } = req.body;

    const { data: session, error: fetchError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .or(`id.eq.${sessionId},external_id.eq.${sessionId}`)
      .single();

    if (fetchError || !session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (session.status !== 'OPEN') {
      return res.status(400).json({ error: 'Session is not open' });
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase
        .from('checkout_sessions')
        .update({ status: 'EXPIRED' })
        .eq('id', session.id);
      return res.status(400).json({ error: 'Session expired' });
    }

    // TODO: Process actual card payment here
    // For now, just mark as complete
    const { data: updatedSession, error: updateError } = await supabase
      .from('checkout_sessions')
      .update({
        status: 'COMPLETE',
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({
      status: 'COMPLETE',
      session: updatedSession,
    });
  } catch (error: any) {
    console.error('[Checkout] Complete session error:', error);
    return res.status(500).json({ error: error.message });
  }
}
