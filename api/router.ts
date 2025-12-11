import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createMonimeService, MonimeError } from './services/monime';
import { sendEmailWithConfig, SmtpConfig } from './services/email';
import { readFileSync } from 'fs';
import { join } from 'path';

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
  // CORS Configuration - Allow ALL origins for checkout API
  // This is required for merchants to integrate from their own domains
  const origin = req.headers.origin;

  // Always allow the requesting origin (or * if no origin header)
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Business-Id, X-Mode, X-User-Id, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

  // Only set credentials header if there's a specific origin (not wildcard)
  if (origin) {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
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
    } else if (path === 'modules/packages' || path === 'modules/packages/') {
      return await handleModulePackages(req, res);
    } else if (path === 'modules/upload' || path === 'modules/upload/') {
      return await handleModuleUpload(req, res);
    } else if (path.match(/^modules\/packages\/[^/]+$/)) {
      const packageId = path.split('/')[2];
      return await handleModulePackageById(req, res, packageId);
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
    } else if (path.match(/^checkout\/sessions\/[^/]+\/card-pay$/)) {
      const sessionId = path.split('/')[2];
      return await handleCheckoutSessionCardPay(req, res, sessionId);
    } else if (path.match(/^checkout\/sessions\/[^/]+\/mobile-pay$/)) {
      const sessionId = path.split('/')[2];
      return await handleCheckoutMobilePay(req, res, sessionId);
    } else if (path === 'checkout/tokenize' || path === 'checkout/tokenize/') {
      return await handleCheckoutTokenize(req, res);
    } else if (path.startsWith('checkout/create')) {
      return await handleCheckoutCreate(req, res);
    } else if (path.startsWith('checkout/card-pay')) {
      return await handleCheckoutCardPay(req, res);
    } else if (path.startsWith('checkout/card-validate')) {
      return await handleCheckoutCardValidate(req, res);
    } else if (path.match(/^checkout\/pay\/[^/]+$/)) {
      // Handle redirect from Monime payment - render success/cancel HTML page
      const sessionId = path.split('/')[2];
      return await handleCheckoutPayRedirect(req, res, sessionId);
    } else if (path.startsWith('checkout/success')) {
      return await handleCheckoutSuccess(req, res);
    } else if (path.startsWith('checkout/cancel')) {
      return await handleCheckoutCancel(req, res);
    } else if (path.startsWith('deposit/success')) {
      return await handleDepositSuccess(req, res);
    } else if (path.startsWith('deposit/cancel')) {
      return await handleDepositCancel(req, res);
    } else if (path === 'test-email' || path === 'test-email/') {
      return await handleTestEmail(req, res);
    } else if (path === 'mobile-money/providers' || path === 'mobile-money/providers/') {
      return await handleMobileMoneyProviders(req, res);
    } else if (path === 'mobile-money/send' || path === 'mobile-money/send/') {
      return await handleMobileMoneySend(req, res);
    } else if (path === 'mobile-money/status' || path.match(/^mobile-money\/status\/[^/]+$/)) {
      return await handleMobileMoneyStatus(req, res);
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
  const walletId = req.query.walletId || req.body?.walletId || '';
  const orderNumber = req.query.orderNumber || req.body?.orderNumber || '';

  // Get frontend URL from settings
  const { data: settings } = await supabase
    .from('payment_settings')
    .select('frontend_url')
    .eq('id', SETTINGS_ID)
    .single();
  const frontendUrl = settings?.frontend_url || process.env.FRONTEND_URL || 'https://my.peeap.com';

  try {
    console.log('[Deposit Success] Received callback:', { method: req.method, query: req.query, sessionId, walletId });

    let amount = 0;
    let currency = 'SLE';
    let newBalance = 0;

    // If we have a sessionId, verify with Monime and credit wallet
    if (sessionId && walletId) {
      // Get Monime credentials
      const monimeService = await createMonimeService(supabase, SETTINGS_ID);

      // Check checkout session status
      const sessionStatus = await monimeService.getCheckoutSession(String(sessionId));
      console.log('[Deposit Success] Monime session status:', sessionStatus);

      if (sessionStatus.status === 'completed') {
        // Get the pending transaction
        const { data: pendingTx } = await supabase
          .from('transactions')
          .select('*')
          .eq('reference', sessionId)
          .eq('status', 'PENDING')
          .single();

        if (pendingTx) {
          amount = pendingTx.amount;
          currency = pendingTx.currency;

          // Credit the wallet
          const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', walletId)
            .single();

          if (wallet) {
            const currentBalance = parseFloat(wallet.balance?.toString() || '0');
            newBalance = currentBalance + amount;

            // Update wallet balance
            await supabase
              .from('wallets')
              .update({
                balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', walletId);

            // Update transaction status
            await supabase
              .from('transactions')
              .update({
                status: 'COMPLETED',
                metadata: {
                  ...pendingTx.metadata,
                  completedAt: new Date().toISOString(),
                  monimeStatus: sessionStatus.status,
                }
              })
              .eq('id', pendingTx.id);

            console.log('[Deposit Success] Wallet credited:', { walletId, amount, newBalance });
          }
        }
      }
    }

    // Redirect to frontend success page
    const redirectUrl = new URL('/deposit/success', frontendUrl);
    if (sessionId) redirectUrl.searchParams.set('sessionId', String(sessionId));
    if (walletId) redirectUrl.searchParams.set('walletId', String(walletId));
    if (orderNumber) redirectUrl.searchParams.set('orderNumber', String(orderNumber));
    redirectUrl.searchParams.set('status', 'success');
    if (amount > 0) redirectUrl.searchParams.set('amount', String(amount));
    if (newBalance > 0) redirectUrl.searchParams.set('newBalance', String(newBalance));
    redirectUrl.searchParams.set('currency', currency);

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('[Deposit Success] Error:', error);
    const redirectUrl = new URL('/deposit/success', frontendUrl);
    if (sessionId) redirectUrl.searchParams.set('sessionId', String(sessionId));
    if (walletId) redirectUrl.searchParams.set('walletId', String(walletId));
    redirectUrl.searchParams.set('error', error.message || 'Unknown error');
    return res.redirect(302, redirectUrl.toString());
  }
}

async function handleDepositCancel(req: VercelRequest, res: VercelResponse) {
  const sessionId = req.query.sessionId || req.body?.sessionId || '';
  const walletId = req.query.walletId || req.body?.walletId || '';
  const reason = req.query.reason || req.body?.reason || 'cancelled';

  // Get frontend URL from settings
  const { data: settings } = await supabase
    .from('payment_settings')
    .select('frontend_url')
    .eq('id', SETTINGS_ID)
    .single();
  const frontendUrl = settings?.frontend_url || process.env.FRONTEND_URL || 'https://my.peeap.com';

  try {
    console.log('[Deposit Cancel] Received callback:', { method: req.method, query: req.query, sessionId, walletId });

    // Update the pending transaction to cancelled
    if (sessionId) {
      await supabase
        .from('transactions')
        .update({
          status: 'CANCELLED',
          metadata: {
            cancelledAt: new Date().toISOString(),
            reason: reason,
          }
        })
        .eq('reference', sessionId)
        .eq('status', 'PENDING');
    }

    const redirectUrl = new URL('/deposit/cancel', frontendUrl);
    if (sessionId) redirectUrl.searchParams.set('sessionId', String(sessionId));
    if (walletId) redirectUrl.searchParams.set('walletId', String(walletId));
    redirectUrl.searchParams.set('status', 'cancelled');
    redirectUrl.searchParams.set('reason', String(reason));

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('[Deposit Cancel] Error:', error);
    const redirectUrl = new URL('/deposit/cancel', frontendUrl);
    if (sessionId) redirectUrl.searchParams.set('sessionId', String(sessionId));
    redirectUrl.searchParams.set('error', error.message || 'Unknown error');
    return res.redirect(302, redirectUrl.toString());
  }
}

// ============================================================================
// CHECKOUT HANDLERS
// ============================================================================

/**
 * Handle redirect from Monime payment - render HTML success/cancel page
 * This is the page users land on after completing payment on Monime
 */
async function handleCheckoutPayRedirect(req: VercelRequest, res: VercelResponse, sessionId: string) {
  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const status = url.searchParams.get('status');
    const retry = url.searchParams.get('retry');
    const message = url.searchParams.get('message');
    const host = req.headers.host || 'checkout.peeap.com';
    const baseUrl = `https://${host}`;

    console.log('[Checkout Pay Redirect] Session:', sessionId, 'Status:', status, 'Retry:', retry);

    // If no status param (initial load or retry), serve the checkout frontend
    if (!status) {
      // Serve the React SPA HTML
      const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Checkout - Peeap</title>
    <script type="module" crossorigin src="/assets/index-DjeNvT3_.js"></script>
    <link rel="stylesheet" crossorigin href="/assets/index-DAbP98Wm.css">
    ${retry && message ? `<script>window.__CHECKOUT_MESSAGE__ = decodeURIComponent("${encodeURIComponent(message)}");</script>` : ''}
  </head>
  <body>
    <div id="root"></div>
  </body>
</html>`;
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(html);
    }

    // If cancelled, redirect back to checkout page to try again (without status param)
    // Do this BEFORE session lookup so redirect works even if session doesn't exist
    if (status === 'cancel') {
      const checkoutUrl = `${baseUrl}/checkout/pay/${sessionId}?retry=true&message=Payment+cancelled.+Please+try+another+payment+method.`;
      return res.redirect(302, checkoutUrl);
    }

    // Look up the checkout session to get return URL and details (only needed for success)
    const { data: session } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('external_id', sessionId)
      .single();

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    let merchantName = session.merchant_name || 'Merchant';
    let amount = session.amount || 0;
    let currency = session.currency_code || 'SLE';
    let transactionRef = '';

    // If success, update status, credit merchant wallet, and show success page
    if (status === 'success') {
      // Get merchant's wallet to credit
      const { data: merchantWallet, error: merchantWalletError } = await supabase
        .from('wallets')
        .select('id, balance')
        .eq('user_id', session.merchant_id)
        .eq('currency', session.currency_code || 'SLE')
        .single();

      if (merchantWallet) {
        const paymentAmount = parseFloat(session.amount);
        const newMerchantBalance = parseFloat(merchantWallet.balance) + paymentAmount;

        // Credit merchant's wallet
        const { error: creditError } = await supabase
          .from('wallets')
          .update({ balance: newMerchantBalance, updated_at: new Date().toISOString() })
          .eq('id', merchantWallet.id);

        if (!creditError) {
          // Create merchant's incoming transaction record
          transactionRef = `MOBILE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          await supabase.from('transactions').insert({
            wallet_id: merchantWallet.id,
            type: 'PAYMENT_RECEIVED',
            amount: paymentAmount,
            currency: session.currency_code || 'SLE',
            status: 'COMPLETED',
            description: session.description || `Mobile payment received`,
            reference: transactionRef,
            metadata: {
              checkoutSessionId: session.external_id,
              merchantId: session.merchant_id,
              merchantName: session.merchant_name,
              paymentMethod: 'monime_mobile',
            },
          });
          console.log('[CheckoutPay] Merchant wallet credited:', { merchantId: session.merchant_id, amount: paymentAmount, ref: transactionRef });

          // Send notification to merchant
          await supabase.from('user_notifications').insert({
            user_id: session.merchant_id,
            type: 'payment_received',
            title: 'Payment Received',
            message: `You received a payment of ${currency} ${paymentAmount.toLocaleString()} via mobile money for "${session.description || 'Purchase'}"`,
            read: false,
            metadata: {
              amount: paymentAmount,
              currency: currency,
              reference: transactionRef,
              session_id: session.external_id,
              payment_method: 'mobile_money',
            },
          });

          // Create transaction record for the PAYER (if logged in)
          const payerId = session.payer_id || (session.metadata as any)?.payerId;
          if (payerId) {
            console.log('[CheckoutPay] Creating payer transaction for:', payerId);

            // Get or create payer's wallet
            let { data: payerWallet } = await supabase
              .from('wallets')
              .select('id, balance')
              .eq('user_id', payerId)
              .eq('currency', session.currency_code || 'SLE')
              .single();

            // If no wallet, create one
            if (!payerWallet) {
              const { data: newWallet } = await supabase
                .from('wallets')
                .insert({
                  user_id: payerId,
                  currency: session.currency_code || 'SLE',
                  balance: 0,
                  status: 'ACTIVE',
                })
                .select()
                .single();
              payerWallet = newWallet;
            }

            if (payerWallet) {
              // Create payer's outgoing transaction record (for their transaction history)
              await supabase.from('transactions').insert({
                wallet_id: payerWallet.id,
                type: 'PAYMENT_SENT',
                amount: -paymentAmount, // Negative to show as outgoing
                currency: session.currency_code || 'SLE',
                status: 'COMPLETED',
                description: `Payment to ${session.merchant_name || 'Merchant'} - ${session.description || 'Purchase'}`,
                reference: transactionRef,
                metadata: {
                  checkoutSessionId: session.external_id,
                  merchantId: session.merchant_id,
                  merchantName: session.merchant_name,
                  paymentMethod: 'monime_mobile',
                },
              });
              console.log('[CheckoutPay] Payer transaction created:', { payerId, amount: paymentAmount, ref: transactionRef });

              // Send notification to payer
              await supabase.from('user_notifications').insert({
                user_id: payerId,
                type: 'payment_sent',
                title: 'Payment Successful',
                message: `You paid ${currency} ${paymentAmount.toLocaleString()} to ${session.merchant_name || 'Merchant'} for "${session.description || 'Purchase'}"`,
                read: false,
                metadata: {
                  amount: paymentAmount,
                  currency: currency,
                  reference: transactionRef,
                  session_id: session.external_id,
                  merchant_name: session.merchant_name,
                  payment_method: 'mobile_money',
                },
              });
            }
          }
        } else {
          console.error('[CheckoutPay] Failed to credit merchant wallet:', creditError);
        }
      } else {
        console.error('[CheckoutPay] Merchant wallet not found:', session.merchant_id, merchantWalletError);
      }

      // Update session status
      await supabase
        .from('checkout_sessions')
        .update({
          status: 'COMPLETE',
          completed_at: new Date().toISOString()
        })
        .eq('id', session.id);
    }

    const isSuccess = status === 'success';
    const currencySymbol = currency === 'SLE' ? 'Le' : currency;
    const formattedAmount = `${currencySymbol} ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

    // Build proper return URL with payment verification params
    // Use success_url for success, cancel_url for cancel
    let returnUrl = '';
    let hasReturnUrl = false;

    if (isSuccess && session.success_url) {
      try {
        const successUrlObj = new URL(session.success_url);
        successUrlObj.searchParams.set('status', 'success');
        successUrlObj.searchParams.set('session_id', session.external_id);
        successUrlObj.searchParams.set('reference', transactionRef || session.external_id);
        successUrlObj.searchParams.set('amount', String(amount));
        successUrlObj.searchParams.set('currency', currency);
        successUrlObj.searchParams.set('payment_method', 'mobile_money');
        returnUrl = successUrlObj.toString();
        hasReturnUrl = true;
      } catch (e) {
        console.error('[CheckoutPay] Invalid success_url:', session.success_url, e);
        returnUrl = session.success_url; // Use as-is if URL parsing fails
        hasReturnUrl = true;
      }
    } else if (!isSuccess && session.cancel_url) {
      returnUrl = session.cancel_url;
      hasReturnUrl = true;
    }

    console.log('[CheckoutPay] Return URL:', returnUrl, 'Has Return URL:', hasReturnUrl);

    // IMPORTANT: If merchant provided a success_url, redirect IMMEDIATELY
    // This is critical for third-party integrations - they need the redirect, not our success page
    if (hasReturnUrl && returnUrl) {
      console.log('[CheckoutPay] Immediate redirect to merchant:', returnUrl);
      return res.redirect(302, returnUrl);
    }

    // Only show our success page if NO return URL was provided (internal Peeap payments)
    console.log('[CheckoutPay] No return URL, showing Peeap success page');

    // Render HTML page with animation
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isSuccess ? 'Payment Successful' : 'Payment Cancelled'} - Peeap</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      padding: 40px;
      max-width: 400px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      animation: slideUp 0.5s ease-out;
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(30px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 24px;
      animation: pop 0.6s ease-out 0.2s both;
    }
    @keyframes pop {
      0% { transform: scale(0); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
    }
    .icon.success { background: #10b981; }
    .icon.cancel { background: #ef4444; }
    .icon svg { width: 40px; height: 40px; color: white; }
    h1 { font-size: 24px; color: #1f2937; margin-bottom: 8px; }
    .amount { font-size: 32px; font-weight: 700; color: ${isSuccess ? '#10b981' : '#6b7280'}; margin: 16px 0; }
    .merchant { color: #6b7280; margin-bottom: 24px; }
    .message { color: #4b5563; margin-bottom: 32px; line-height: 1.6; }
    .button {
      display: inline-block;
      background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
      color: white;
      padding: 14px 32px;
      border-radius: 10px;
      text-decoration: none;
      font-weight: 600;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); }
    .countdown { color: #9ca3af; font-size: 14px; margin-top: 16px; }
    .peeap-logo { margin-top: 32px; opacity: 0.5; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon ${isSuccess ? 'success' : 'cancel'}">
      ${isSuccess
        ? '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>'
        : '<svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6l12 12"/></svg>'
      }
    </div>
    <h1>${isSuccess ? 'Payment Successful!' : 'Payment Cancelled'}</h1>
    <div class="amount">${formattedAmount}</div>
    <div class="merchant">to ${merchantName}</div>
    <p class="message">
      ${isSuccess
        ? 'Your payment has been processed successfully. Thank you for your purchase!'
        : 'Your payment was cancelled. No charges have been made to your account.'
      }
    </p>
    <a href="https://my.peeap.com/dashboard" class="button">Go to Dashboard</a>
    <div class="peeap-logo">Powered by Peeap</div>
  </div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(html);

  } catch (error: any) {
    console.error('[Checkout Pay Redirect] Error:', error);
    // On error, show a basic error page
    const html = `
<!DOCTYPE html>
<html><head><title>Error - Peeap</title></head>
<body style="font-family:sans-serif;text-align:center;padding:50px;">
  <h1>Something went wrong</h1>
  <p>${error.message || 'Unable to process your request'}</p>
  <a href="https://my.peeap.com">Return to Peeap</a>
</body></html>`;
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(html);
  }
}

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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      publicKey,
      amount,
      currency: rawCurrency = 'SLE',
      reference,
      idempotencyKey,
      description,
      customerEmail,
      customerPhone,
      paymentMethod = 'mobile_money',
      redirectUrl,
      metadata
    } = req.body;

    // =========================================================================
    // SIERRA LEONE CURRENCY NORMALIZATION
    // =========================================================================
    // Sierra Leone redenominated its currency in 2022:
    // - OLD: Leone (SLL) - 1000 old leones
    // - NEW: New Leone (SLE/NLE) - 1 new leone (removed 3 zeros)
    //
    // AI platforms may use outdated currency codes (NLE, SLL, Le, Leone)
    // We normalize all Sierra Leone currency codes to 'SLE'
    // =========================================================================
    let currency = (rawCurrency || 'SLE').toString().toUpperCase().trim();
    let normalizedAmount = amount;

    // Normalize currency codes
    if (currency === 'NLE' || currency === 'LE' || currency === 'LEONE' || currency === 'LEONES') {
      currency = 'SLE'; // New Leone ISO code
    }

    // Handle old Leone (SLL) - convert to new Leone by dividing by 1000
    if (currency === 'SLL' || currency === 'OLD_LEONE') {
      currency = 'SLE';
      normalizedAmount = Math.round(amount / 1000); // Convert old to new
      console.log(`[CheckoutCreate] Converted old Leone amount: ${amount} SLL -> ${normalizedAmount} SLE`);
    }

    // Warn if amount seems too high (likely using old Leone values)
    // New Leone transactions are typically under 100,000 SLE
    if (currency === 'SLE' && normalizedAmount > 100000) {
      console.warn(`[CheckoutCreate] Warning: Large amount ${normalizedAmount} SLE - may be using old Leone values`);
    }

    // Validate required fields
    if (!publicKey) {
      return res.status(400).json({ error: 'publicKey is required' });
    }

    if (!normalizedAmount || typeof normalizedAmount !== 'number' || normalizedAmount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Use normalized amount
    const finalAmount = normalizedAmount;

    // Determine if this is a live or test key
    const isLiveKey = publicKey.startsWith('pk_live_');
    const isTestKey = publicKey.startsWith('pk_test_');

    if (!isLiveKey && !isTestKey) {
      return res.status(400).json({ error: 'Invalid public key format. Must start with pk_live_ or pk_test_' });
    }

    // Look up business by public key
    const keyColumn = isLiveKey ? 'live_public_key' : 'test_public_key';
    const { data: business, error: businessError } = await supabase
      .from('merchant_businesses')
      .select('*')
      .eq(keyColumn, publicKey)
      .eq('status', 'ACTIVE')
      .single();

    if (businessError || !business) {
      console.error('[CheckoutCreate] Business lookup failed:', businessError);
      return res.status(401).json({ error: 'Invalid public key or business not active' });
    }

    // For live keys, check if business can process live transactions
    if (isLiveKey) {
      // Check approval status
      if (business.approval_status === 'REJECTED') {
        return res.status(403).json({ error: 'Business has been rejected. Please contact support.' });
      }
      if (business.approval_status === 'SUSPENDED') {
        return res.status(403).json({ error: 'Business has been suspended. Please contact support.' });
      }

      // For pending businesses, check trial limit
      if (business.approval_status === 'PENDING') {
        const limit = business.trial_live_transaction_limit || 2;
        const used = business.trial_live_transactions_used || 0;
        if (used >= limit) {
          return res.status(403).json({
            error: `Trial limit reached. You have used ${limit} trial live transactions. Please wait for admin approval.`
          });
        }
      }
    }

    // Check idempotency - prevent duplicate payments
    if (idempotencyKey) {
      const { data: existingPayment } = await supabase
        .from('checkout_sessions')
        .select('external_id, status')
        .eq('idempotency_key', idempotencyKey)
        .single();

      if (existingPayment) {
        // Return existing session - use checkout.peeap.com for hosted checkout
        const checkoutUrl = process.env.CHECKOUT_URL || 'https://checkout.peeap.com';
        return res.status(200).json({
          paymentId: existingPayment.external_id,
          sessionId: existingPayment.external_id,
          paymentUrl: `${checkoutUrl}/checkout/pay/${existingPayment.external_id}`,
          status: existingPayment.status,
          message: 'Existing session returned (idempotency)'
        });
      }
    }

    // Create checkout session
    const sessionId = `cs_${randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const checkoutUrl = process.env.CHECKOUT_URL || 'https://checkout.peeap.com';
    const frontendUrl = process.env.FRONTEND_URL || 'https://my.peeap.com';

    // Determine success/cancel URLs
    const successUrl = redirectUrl || business.callback_url || `${frontendUrl}/payment/success`;
    const cancelUrl = business.callback_url || `${frontendUrl}/payment/cancel`;

    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .insert({
        external_id: sessionId,
        merchant_id: business.id,
        status: 'OPEN',
        amount: finalAmount, // Normalized amount in New Leone (SLE)
        currency_code: currency.toUpperCase(),
        description: description || `Payment to ${business.name}`,
        merchant_name: business.name,
        merchant_logo_url: business.logo_url,
        brand_color: '#4F46E5',
        success_url: successUrl,
        cancel_url: cancelUrl,
        return_url: redirectUrl || successUrl,
        payment_methods: { qr: true, card: true, mobile: true },
        metadata: metadata ? { ...metadata, reference, isTestMode: isTestKey, customerEmail, customerPhone, paymentMethod } : { reference, isTestMode: isTestKey, customerEmail, customerPhone, paymentMethod },
        idempotency_key: idempotencyKey,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (sessionError) {
      console.error('[CheckoutCreate] Session creation error:', sessionError);
      return res.status(500).json({ error: 'Failed to create checkout session' });
    }

    // For live transactions on pending businesses, increment trial count
    if (isLiveKey && business.approval_status === 'PENDING') {
      await supabase
        .from('merchant_businesses')
        .update({
          trial_live_transactions_used: (business.trial_live_transactions_used || 0) + 1
        })
        .eq('id', business.id);
    }

    console.log('[CheckoutCreate] Session created:', sessionId, 'for business:', business.name);

    // Return the payment URL - use checkout.peeap.com for hosted checkout
    const paymentUrl = `${checkoutUrl}/checkout/pay/${sessionId}`;

    return res.status(200).json({
      paymentId: sessionId,
      sessionId: sessionId,
      paymentUrl: paymentUrl,
      expiresAt: session.expires_at,
      amount: finalAmount,
      currency: currency,
      businessName: business.name,
      currencyNote: 'SLE = New Leone (Sierra Leone redenominated in 2022, removing 3 zeros)',
      isTestMode: isTestKey
    });

  } catch (error: any) {
    console.error('[CheckoutCreate] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { walletId, amount, currency = 'SLE', userId, description } = req.body;

    // Validate required fields
    if (!walletId) {
      return res.status(400).json({ error: 'walletId is required' });
    }
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Verify wallet exists
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, user_id, currency, balance')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      console.error('[MonimeDeposit] Wallet not found:', walletId);
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Create Monime service (validates credentials and module enabled)
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // Get frontend URL from settings or use default
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('backend_url, frontend_url')
      .eq('id', SETTINGS_ID)
      .single();

    const backendUrl = settings?.backend_url || 'https://my.peeap.com';
    const frontendUrl = settings?.frontend_url || 'https://my.peeap.com';

    // Build success/cancel URLs
    // These go through our API first to credit the wallet, then redirect to frontend
    const successUrl = `${backendUrl}/api/deposit/success?walletId=${walletId}&sessionId={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${backendUrl}/api/deposit/cancel?walletId=${walletId}&sessionId={CHECKOUT_SESSION_ID}`;

    console.log('[MonimeDeposit] Creating checkout session:', {
      walletId,
      amount,
      currency,
      successUrl,
      cancelUrl,
    });

    // Create deposit checkout session
    const result = await monimeService.createDepositCheckout({
      walletId,
      userId: userId || wallet.user_id,
      amount,
      currency,
      successUrl,
      cancelUrl,
    });

    console.log('[MonimeDeposit] Checkout created:', result.monimeSessionId);

    // Store deposit record for tracking
    await supabase.from('transactions').insert({
      wallet_id: walletId,
      type: 'DEPOSIT',
      amount: amount,
      currency: currency,
      status: 'PENDING',
      description: description || 'Mobile Money Deposit',
      reference: result.monimeSessionId,
      metadata: {
        monimeSessionId: result.monimeSessionId,
        paymentMethod: 'mobile_money',
        initiatedAt: new Date().toISOString(),
      },
    });

    return res.status(200).json({
      paymentUrl: result.paymentUrl,
      monimeSessionId: result.monimeSessionId,
      expiresAt: result.expiresAt,
      amount,
      currency,
    });

  } catch (error: any) {
    console.error('[MonimeDeposit] Error:', error);

    // Handle MonimeError specifically
    if (error instanceof MonimeError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }

    return res.status(500).json({ error: error.message || 'Failed to initiate deposit' });
  }
}

// Mobile Money payment for hosted checkout - creates Monime checkout session
// Uses centralized MonimeService for all Monime operations
async function handleCheckoutMobilePay(req: VercelRequest, res: VercelResponse, sessionId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get payer info from request body (sent by frontend after user login)
    const { userId, userEmail } = req.body || {};

    // 1. Get checkout session
    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('external_id', sessionId)
      .single();

    if (sessionError || !session) {
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    if (session.status !== 'OPEN') {
      return res.status(400).json({ error: `Session is ${session.status}` });
    }

    // Check if expired
    if (new Date(session.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Session expired' });
    }

    // 2. Create Monime service (validates credentials automatically)
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // 3. Create Monime checkout session using centralized service
    // MonimeService handles currency conversion (SLE * 10 for Monime's format)
    const result = await monimeService.createHostedCheckout({
      sessionId: session.external_id,
      amount: session.amount, // MonimeService will multiply by 10 for SLE
      currency: session.currency_code || 'SLE',
      description: session.description || `Payment to ${session.merchant_name || 'Peeap'}`,
      merchantName: session.merchant_name || 'Peeap',
      merchantId: session.merchant_id,
      successUrl: `https://checkout.peeap.com/checkout/pay/${sessionId}?status=success`,
      cancelUrl: `https://checkout.peeap.com/checkout/pay/${sessionId}?status=cancel`,
    });

    // 4. Store Monime reference and payer info in checkout session
    const updateData: any = {
      payment_reference: result.monimeSessionId,
      payment_method: 'mobile_money',
      updated_at: new Date().toISOString(),
    };

    // Store payer_id if user is logged in
    if (userId) {
      updateData.payer_id = userId;
      updateData.metadata = {
        ...(session.metadata || {}),
        payerEmail: userEmail,
        payerId: userId,
      };
    }

    await supabase
      .from('checkout_sessions')
      .update(updateData)
      .eq('external_id', sessionId);

    // 5. Return payment URL from Monime response
    return res.status(200).json({
      paymentUrl: result.paymentUrl,
      monimeSessionId: result.monimeSessionId,
      expiresAt: result.expiresAt,
    });

  } catch (error: any) {
    console.error('[MobilePay] Error:', error);

    // Handle MonimeError specifically
    if (error instanceof MonimeError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }

    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
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
// MODULE PACKAGE HANDLERS
// ============================================================================

async function handleModulePackages(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const { data: packages, error } = await supabase
      .from('module_packages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ packages: packages || [], total: packages?.length || 0 });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

async function handleModuleUpload(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const manifest = req.body;

    // Validate manifest
    if (!manifest.code || !manifest.name || !manifest.version || !manifest.category) {
      return res.status(400).json({
        error: 'Invalid manifest. Required fields: code, name, version, category',
      });
    }

    // Validate code format
    if (!/^[a-z][a-z0-9_]*$/.test(manifest.code)) {
      return res.status(400).json({
        error: 'Module code must start with a letter and contain only lowercase letters, numbers, and underscores',
      });
    }

    // Check for existing system module
    const { data: existingModule } = await supabase
      .from('modules')
      .select('is_system')
      .eq('code', manifest.code)
      .single();

    if (existingModule?.is_system) {
      return res.status(403).json({ error: `Cannot override system module "${manifest.code}"` });
    }

    // Check version conflict
    const { data: existingPackage } = await supabase
      .from('module_packages')
      .select('*')
      .eq('module_code', manifest.code)
      .eq('version', manifest.version)
      .single();

    if (existingPackage) {
      return res.status(409).json({
        error: `Module "${manifest.code}" version ${manifest.version} already exists`,
      });
    }

    // Create package record
    const { data: packageData, error: packageError } = await supabase
      .from('module_packages')
      .insert({
        module_code: manifest.code,
        version: manifest.version,
        file_path: `manifests/${manifest.code}/${manifest.version}/manifest.json`,
        file_size: JSON.stringify(manifest).length,
        checksum: '',
        manifest,
        status: 'pending',
      })
      .select()
      .single();

    if (packageError) throw packageError;

    // Create/update module in database
    const moduleData = {
      code: manifest.code,
      name: manifest.name,
      description: manifest.description || '',
      category: manifest.category,
      version: manifest.version,
      icon: manifest.icon || '📦',
      is_enabled: false,
      is_system: false,
      is_custom: true,
      package_id: packageData.id,
      config: {},
      config_schema: manifest.configSchema,
      dependencies: manifest.dependencies || [],
      provides: manifest.provides || [],
      events: [...(manifest.events?.emits || []), ...(manifest.events?.listens || [])],
      settings_path: manifest.settingsPath,
    };

    const { error: moduleError } = await supabase
      .from('modules')
      .upsert(moduleData, { onConflict: 'code' });

    if (moduleError) {
      await supabase.from('module_packages').delete().eq('id', packageData.id);
      throw moduleError;
    }

    // Update package status
    await supabase
      .from('module_packages')
      .update({ status: 'installed', installed_at: new Date().toISOString() })
      .eq('id', packageData.id);

    const { data: updatedPackage } = await supabase
      .from('module_packages')
      .select('*')
      .eq('id', packageData.id)
      .single();

    return res.status(200).json({
      success: true,
      package: updatedPackage,
      message: `Module "${manifest.name}" installed successfully`,
    });
  } catch (error: any) {
    console.error('[ModuleUpload] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleModulePackageById(req: VercelRequest, res: VercelResponse, packageId: string) {
  if (req.method === 'DELETE') {
    const { data: pkg } = await supabase
      .from('module_packages')
      .select('*')
      .eq('id', packageId)
      .single();

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    const { data: module } = await supabase
      .from('modules')
      .select('is_enabled, is_custom')
      .eq('code', pkg.module_code)
      .single();

    if (module?.is_enabled) {
      return res.status(400).json({
        error: 'Cannot delete package for enabled module. Disable the module first.',
      });
    }

    if (module?.is_custom) {
      await supabase.from('modules').delete().eq('code', pkg.module_code);
    }

    const { error } = await supabase.from('module_packages').delete().eq('id', packageId);
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
      return res.status(500).send(errorPage(`DB Error: ${error.message || error.code || JSON.stringify(error)}`));
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
      metadata,
      // P2P payment fields
      recipientId,
      recipientWalletId,
      recipientName,
    } = req.body;

    // Either merchantId OR recipientId is required (for P2P payments)
    if (!amount || !currency) {
      return res.status(400).json({ error: 'amount and currency are required' });
    }

    if (!merchantId && !recipientId) {
      return res.status(400).json({ error: 'Either merchantId or recipientId is required' });
    }

    const sessionId = `cs_${randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    // For P2P payments, use recipient info
    const isP2P = !!recipientId && !merchantId;

    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .insert({
        external_id: sessionId,
        merchant_id: merchantId || null,
        status: 'OPEN',
        amount,
        currency_code: currency,
        description: description || (isP2P ? `Payment to ${recipientName || 'User'}` : description),
        merchant_name: merchantName || (isP2P ? recipientName : null),
        merchant_logo_url: merchantLogoUrl,
        brand_color: brandColor || '#4F46E5',
        success_url: successUrl,
        cancel_url: cancelUrl,
        payment_methods: paymentMethods || { qr: true, card: true, mobile: true },
        metadata: {
          ...metadata,
          // Store P2P recipient info in metadata
          ...(isP2P && {
            type: 'p2p',
            recipientId,
            recipientWalletId,
            recipientName,
          }),
        },
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
      .eq('external_id', sessionId)
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
      .eq('external_id', sessionId)
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

    const { paymentMethod } = req.body;
    const paymentAmount = parseFloat(session.amount);
    let transactionRef = '';

    // Credit merchant's wallet
    const { data: merchantWallet, error: merchantWalletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', session.merchant_id)
      .eq('currency', session.currency_code || 'SLE')
      .single();

    if (merchantWallet) {
      const newMerchantBalance = parseFloat(merchantWallet.balance) + paymentAmount;

      const { error: creditError } = await supabase
        .from('wallets')
        .update({ balance: newMerchantBalance, updated_at: new Date().toISOString() })
        .eq('id', merchantWallet.id);

      if (!creditError) {
        // Create merchant's incoming transaction record
        transactionRef = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        await supabase.from('transactions').insert({
          wallet_id: merchantWallet.id,
          type: 'PAYMENT_RECEIVED',
          amount: paymentAmount,
          currency: session.currency_code || 'SLE',
          status: 'COMPLETED',
          description: session.description || `QR/App payment received`,
          reference: transactionRef,
          metadata: {
            checkoutSessionId: session.external_id,
            merchantId: session.merchant_id,
            merchantName: session.merchant_name,
            paymentMethod: paymentMethod || 'qr_code',
          },
        });
        console.log('[CheckoutComplete] Merchant wallet credited:', { merchantId: session.merchant_id, amount: paymentAmount, ref: transactionRef });
      } else {
        console.error('[CheckoutComplete] Failed to credit merchant wallet:', creditError);
      }
    } else {
      console.error('[CheckoutComplete] Merchant wallet not found:', session.merchant_id, merchantWalletError);
    }

    // Mark session as complete
    const { data: updatedSession, error: updateError } = await supabase
      .from('checkout_sessions')
      .update({
        status: 'COMPLETE',
        completed_at: new Date().toISOString(),
        metadata: {
          ...(session.metadata || {}),
          paymentMethod: paymentMethod || 'qr_code',
          transactionRef: transactionRef,
        },
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
      transactionRef: transactionRef,
    });
  } catch (error: any) {
    console.error('[Checkout] Complete session error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Handle card payment for checkout session
 * Flow:
 * 1. Verify the session is valid
 * 2. Verify the card and PIN
 * 3. Check wallet balance
 * 4. Deduct from user's wallet
 * 5. Credit merchant's wallet
 * 6. Create transaction records
 * 7. Mark session as complete
 */
async function handleCheckoutSessionCardPay(req: VercelRequest, res: VercelResponse, sessionId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cardId, walletId, pin } = req.body;

    // Validate required fields
    if (!cardId || !walletId || !pin) {
      return res.status(400).json({ error: 'cardId, walletId, and pin are required' });
    }

    console.log('[CardPay] Processing card payment for session:', sessionId);

    // 1. Get the checkout session
    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('external_id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[CardPay] Session not found:', sessionId);
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    if (session.status !== 'OPEN') {
      return res.status(400).json({ error: `Session is ${session.status.toLowerCase()}, cannot process payment` });
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('checkout_sessions').update({ status: 'EXPIRED' }).eq('id', session.id);
      return res.status(400).json({ error: 'Session has expired' });
    }

    // 2. Verify the card exists and belongs to the wallet
    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, wallet_id, cardholder_name, transaction_pin, status')
      .eq('id', cardId)
      .single();

    if (cardError || !card) {
      console.error('[CardPay] Card not found:', cardId);
      return res.status(404).json({ error: 'Card not found' });
    }

    if (card.wallet_id !== walletId) {
      return res.status(400).json({ error: 'Card does not belong to this wallet' });
    }

    if (card.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Card is ${card.status.toLowerCase()}. Please use an active card.` });
    }

    // 3. Verify the PIN
    if (!card.transaction_pin) {
      return res.status(400).json({ error: 'Transaction PIN not set for this card. Please set a PIN in your Peeap app.' });
    }

    if (card.transaction_pin !== pin) {
      console.log('[CardPay] Invalid PIN for card:', cardId);
      return res.status(401).json({ error: 'Invalid transaction PIN' });
    }

    // 4. Get wallet and check balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, user_id, balance, currency')
      .eq('id', walletId)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const paymentAmount = parseFloat(session.amount);
    const walletBalance = parseFloat(wallet.balance);

    if (walletBalance < paymentAmount) {
      return res.status(400).json({
        error: 'Insufficient funds',
        message: `Your balance is ${wallet.currency} ${walletBalance.toFixed(2)} but the payment requires ${session.currency_code} ${paymentAmount.toFixed(2)}`
      });
    }

    // 5. Get merchant's wallet to credit
    const { data: merchantWallet, error: merchantWalletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', session.merchant_id)
      .eq('currency', session.currency_code || 'SLE')
      .single();

    if (merchantWalletError || !merchantWallet) {
      console.error('[CardPay] Merchant wallet not found:', session.merchant_id);
      return res.status(500).json({ error: 'Merchant wallet not found' });
    }

    // 6. Process the payment atomically
    // Deduct from user's wallet
    const newUserBalance = walletBalance - paymentAmount;
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: newUserBalance, updated_at: new Date().toISOString() })
      .eq('id', walletId);

    if (deductError) {
      console.error('[CardPay] Failed to deduct from wallet:', deductError);
      return res.status(500).json({ error: 'Failed to process payment' });
    }

    // Credit merchant's wallet
    const newMerchantBalance = parseFloat(merchantWallet.balance) + paymentAmount;
    const { error: creditError } = await supabase
      .from('wallets')
      .update({ balance: newMerchantBalance, updated_at: new Date().toISOString() })
      .eq('id', merchantWallet.id);

    if (creditError) {
      // Rollback user deduction
      await supabase.from('wallets').update({ balance: walletBalance }).eq('id', walletId);
      console.error('[CardPay] Failed to credit merchant, rolled back:', creditError);
      return res.status(500).json({ error: 'Failed to process payment' });
    }

    // 7. Create transaction records
    const transactionRef = `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // User's outgoing transaction
    await supabase.from('transactions').insert({
      wallet_id: walletId,
      type: 'PAYMENT',
      amount: -paymentAmount,
      currency: session.currency_code || 'SLE',
      status: 'COMPLETED',
      description: session.description || `Payment to ${session.merchant_name || 'merchant'}`,
      reference: transactionRef,
      metadata: {
        checkoutSessionId: session.external_id,
        merchantId: session.merchant_id,
        merchantName: session.merchant_name,
        cardId: cardId,
        paymentMethod: 'peeap_card',
      },
    });

    // Merchant's incoming transaction
    await supabase.from('transactions').insert({
      wallet_id: merchantWallet.id,
      type: 'PAYMENT_RECEIVED',
      amount: paymentAmount,
      currency: session.currency_code || 'SLE',
      status: 'COMPLETED',
      description: `Payment from ${card.cardholder_name || 'customer'}`,
      reference: transactionRef,
      metadata: {
        checkoutSessionId: session.external_id,
        customerId: wallet.user_id,
        cardId: cardId,
        paymentMethod: 'peeap_card',
      },
    });

    // 8. Mark session as complete
    const { data: updatedSession, error: updateError } = await supabase
      .from('checkout_sessions')
      .update({
        status: 'COMPLETE',
        completed_at: new Date().toISOString(),
        metadata: {
          ...(session.metadata || {}),
          paymentMethod: 'peeap_card',
          cardId: cardId,
          transactionRef: transactionRef,
        },
      })
      .eq('id', session.id)
      .select()
      .single();

    if (updateError) {
      console.error('[CardPay] Failed to update session:', updateError);
      // Payment already processed, just log the error
    }

    console.log('[CardPay] Payment successful:', { sessionId, transactionRef, amount: paymentAmount });

    return res.status(200).json({
      success: true,
      status: 'COMPLETE',
      transactionRef,
      amount: paymentAmount,
      currency: session.currency_code || 'SLE',
    });

  } catch (error: any) {
    console.error('[CardPay] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// ============================================================================
// TEST EMAIL HANDLER
// ============================================================================

async function handleTestEmail(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, smtpConfig } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' });
    }

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.username || !smtpConfig.password) {
      return res.status(400).json({ error: 'Missing SMTP configuration' });
    }

    const config: SmtpConfig = {
      host: smtpConfig.host,
      port: smtpConfig.port || 587,
      secure: smtpConfig.secure || false,
      username: smtpConfig.username,
      password: smtpConfig.password,
      fromEmail: smtpConfig.fromEmail || smtpConfig.username,
      fromName: smtpConfig.fromName || 'Peeap',
      isEnabled: true,
    };

    const result = await sendEmailWithConfig(config, { to, subject, html });

    if (result.success) {
      return res.status(200).json({ success: true, message: 'Test email sent successfully' });
    } else {
      return res.status(500).json({ error: result.error || 'Failed to send email' });
    }
  } catch (error: any) {
    console.error('[TestEmail] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send email' });
  }
}

// ============================================================================
// MOBILE MONEY HANDLERS
// ============================================================================

/**
 * Get available mobile money providers (Orange Money, Africell, etc.)
 */
async function handleMobileMoneyProviders(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const country = (req.query.country as string) || 'SL';

    // Create Monime service
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // Get mobile money providers
    const providers = await monimeService.getMobileMoneyProviders(country);

    // Filter to only active payout providers
    const activeProviders = providers.filter(
      p => p.status?.active && p.featureSet?.payout?.canPayTo
    );

    return res.status(200).json({
      success: true,
      providers: activeProviders.map(p => ({
        providerId: p.providerId,
        name: p.name,
        country: p.country,
        canPayout: p.featureSet?.payout?.canPayTo || false,
        canPayment: p.featureSet?.payment?.canPayFrom || false,
      })),
    });
  } catch (error: any) {
    console.error('[MobileMoneyProviders] Error:', error);
    if (error instanceof MonimeError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: error.message || 'Failed to get providers' });
  }
}

/**
 * Send money to mobile money number (Orange Money, Africell)
 */
async function handleMobileMoneySend(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      amount,
      currency = 'SLE',
      phoneNumber,
      providerId,
      userId,
      walletId,
      description,
      pin
    } = req.body;

    // Validate required fields
    if (!amount || !phoneNumber || !providerId || !userId || !walletId) {
      return res.status(400).json({
        error: 'Missing required fields: amount, phoneNumber, providerId, userId, walletId'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Validate phone number format (Sierra Leone)
    const normalizedPhone = phoneNumber.replace(/\s+/g, '').replace(/^(\+232|232)/, '');
    if (!/^[0-9]{8}$/.test(normalizedPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format. Expected 8 digits after country code.' });
    }
    const fullPhoneNumber = `+232${normalizedPhone}`;

    // Get user's wallet and verify balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, currency, user_id, status')
      .eq('id', walletId)
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    if (wallet.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }

    // Platform fee calculation (e.g., 2% fee, min 500 SLE, max 5000 SLE)
    const feePercentage = 0.02;
    const minFee = 500;
    const maxFee = 5000;
    let platformFee = Math.round(amount * feePercentage);
    platformFee = Math.max(minFee, Math.min(maxFee, platformFee));

    const totalDeduction = amount + platformFee;

    if (wallet.balance < totalDeduction) {
      return res.status(400).json({
        error: 'Insufficient balance',
        required: totalDeduction,
        available: wallet.balance,
        fee: platformFee,
      });
    }

    // Create Monime service
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // Get financial accounts to find the source account
    const financialAccounts = await monimeService.getFinancialAccounts();
    const sleAccount = financialAccounts.find(a => a.currency === 'SLE') || financialAccounts[0];

    if (!sleAccount) {
      return res.status(500).json({ error: 'No financial account configured for payouts' });
    }

    // Generate unique external_id for transaction
    const externalId = `momo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create payout transaction record first
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        wallet_id: walletId,
        type: 'MOBILE_MONEY_SEND',
        amount: -totalDeduction,
        currency: currency,
        status: 'PROCESSING',
        external_id: externalId,
        description: description || `Send to ${providerId === 'm17' ? 'Orange Money' : 'Mobile Money'} ${phoneNumber}`,
        metadata: {
          recipient_phone: fullPhoneNumber,
          provider_id: providerId,
          principal_amount: amount,
          platform_fee: platformFee,
          payout_status: 'pending',
        },
      })
      .select()
      .single();

    if (txError) {
      console.error('[MobileMoneySend] Transaction create error:', txError);
      throw new Error('Failed to create transaction record');
    }

    // Deduct from wallet (including fee)
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        balance: wallet.balance - totalDeduction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    if (deductError) {
      // Rollback transaction status
      await supabase
        .from('transactions')
        .update({ status: 'FAILED', metadata: { ...transaction.metadata, error: 'Wallet deduction failed' } })
        .eq('id', transaction.id);
      throw new Error('Failed to deduct from wallet');
    }

    try {
      // Send to mobile money via Monime
      const payoutResult = await monimeService.sendToMobileMoney({
        amount,
        currency,
        phoneNumber: fullPhoneNumber,
        providerId,
        financialAccountId: sleAccount.id,
        userId,
        walletId,
        description,
      });

      // Update transaction with Monime payout ID
      await supabase
        .from('transactions')
        .update({
          status: payoutResult.status === 'completed' ? 'COMPLETED' : 'PROCESSING',
          reference: payoutResult.payoutId,
          metadata: {
            ...transaction.metadata,
            monime_payout_id: payoutResult.payoutId,
            payout_status: payoutResult.status,
            monime_fees: payoutResult.fees,
            total_fee: payoutResult.totalFee,
          },
        })
        .eq('id', transaction.id);

      // Create notification
      await supabase.from('user_notifications').insert({
        user_id: userId,
        type: 'mobile_money_send',
        title: 'Mobile Money Transfer',
        message: `Your transfer of ${currency} ${amount.toLocaleString()} to ${phoneNumber} is being processed.`,
        read: false,
        metadata: {
          transaction_id: transaction.id,
          amount,
          phone_number: phoneNumber,
          provider: providerId,
        },
      });

      return res.status(200).json({
        success: true,
        transactionId: transaction.id,
        payoutId: payoutResult.payoutId,
        status: payoutResult.status,
        amount,
        fee: platformFee,
        totalDeducted: totalDeduction,
        recipient: {
          phoneNumber: fullPhoneNumber,
          provider: providerId,
        },
      });
    } catch (payoutError: any) {
      // Payout failed - refund the wallet
      console.error('[MobileMoneySend] Payout error:', payoutError);

      await supabase
        .from('wallets')
        .update({
          balance: wallet.balance, // Restore original balance
          updated_at: new Date().toISOString(),
        })
        .eq('id', walletId);

      await supabase
        .from('transactions')
        .update({
          status: 'FAILED',
          metadata: {
            ...transaction.metadata,
            error: payoutError.message || 'Payout failed',
            refunded: true,
          },
        })
        .eq('id', transaction.id);

      throw payoutError;
    }
  } catch (error: any) {
    console.error('[MobileMoneySend] Error:', error);
    if (error instanceof MonimeError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: error.message || 'Failed to send money' });
  }
}

/**
 * Get mobile money payout status
 */
async function handleMobileMoneyStatus(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const pathParts = url.pathname.split('/');
    const payoutId = pathParts[pathParts.length - 1];

    if (!payoutId || payoutId === 'status') {
      return res.status(400).json({ error: 'Payout ID required' });
    }

    // Create Monime service
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // Get payout status from Monime
    const status = await monimeService.getPayoutStatus(payoutId);

    // Update transaction if we have it
    const { data: transaction } = await supabase
      .from('transactions')
      .select('id, status, metadata')
      .eq('reference', payoutId)
      .single();

    if (transaction && transaction.status !== 'COMPLETED' && transaction.status !== 'FAILED') {
      const newStatus = status.status === 'completed' ? 'COMPLETED' :
                       status.status === 'failed' ? 'FAILED' : 'PROCESSING';

      await supabase
        .from('transactions')
        .update({
          status: newStatus,
          metadata: {
            ...transaction.metadata,
            payout_status: status.status,
            failure_reason: status.failureReason,
          },
        })
        .eq('id', transaction.id);
    }

    return res.status(200).json({
      success: true,
      payoutId,
      status: status.status,
      amount: status.amount,
      currency: status.currency,
      failureReason: status.failureReason,
    });
  } catch (error: any) {
    console.error('[MobileMoneyStatus] Error:', error);
    if (error instanceof MonimeError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: error.message || 'Failed to get status' });
  }
}
