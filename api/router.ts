import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createMonimeService, getMonimeCredentials, MonimeError } from './services/monime';
import { sendEmailWithConfig, SmtpConfig } from './services/email';
import { sendNotification, storeNotification, getNotificationHistory, getUsersWithTokens, getTokenStats, SendNotificationRequest } from './services/push-notification';
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

    // Root path - return API info
    if (path === '' || path === '/') {
      return res.status(200).json({
        name: 'Peeap API',
        version: '1.0.0',
        status: 'operational',
        documentation: 'https://docs.peeap.com',
        endpoints: {
          checkout: '/api/checkout/*',
          payments: '/api/payments/*',
          webhooks: '/api/webhooks/*'
        }
      });
    }

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
    } else if (path.match(/^checkout\/sessions\/[^/]+\/scan-pay$/)) {
      const sessionId = path.split('/')[2];
      return await handleCheckoutScanPay(req, res, sessionId);
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
    } else if (path === 'mobile-money/lookup' || path === 'mobile-money/lookup/') {
      return await handleMobileMoneyLookup(req, res);
    } else if (path === 'mobile-money/status' || path.match(/^mobile-money\/status\/[^/]+$/)) {
      return await handleMobileMoneyStatus(req, res);
    } else if (path === 'monime/analytics' || path === 'monime/analytics/') {
      return await handleMonimeAnalytics(req, res);
    } else if (path === 'monime/transactions' || path === 'monime/transactions/') {
      return await handleMonimeTransactions(req, res);
    } else if (path === 'monime/webhook' || path === 'monime/webhook/') {
      return await handleMonimeWebhook(req, res);
    } else if (path === 'monime/setup-webhook' || path === 'monime/setup-webhook/') {
      return await handleMonimeSetupWebhook(req, res);
    } else if (path === 'monime/balance' || path === 'monime/balance/') {
      return await handleMonimeBalance(req, res);
    } else if (path === 'float/summary' || path === 'float/summary/') {
      return await handleFloatSummary(req, res);
    } else if (path === 'float/today' || path === 'float/today/') {
      return await handleFloatToday(req, res);
    } else if (path === 'float/payouts' || path === 'float/payouts/') {
      return await handleFloatPayouts(req, res);
    } else if (path === 'float/earnings' || path === 'float/earnings/') {
      return await handleFloatEarnings(req, res);
    } else if (path === 'deposit/verify' || path === 'deposit/verify/') {
      return await handleDepositVerify(req, res);
    } else if (path === 'payouts' || path === 'payouts/') {
      return await handlePayouts(req, res);
    } else if (path === 'payouts/user/cashout' || path === 'payouts/user/cashout/') {
      return await handleUserCashout(req, res);
    } else if (path === 'payouts/merchant/withdraw' || path === 'payouts/merchant/withdraw/') {
      return await handleMerchantWithdraw(req, res);
    } else if (path === 'payouts/banks' || path === 'payouts/banks/') {
      return await handlePayoutBanks(req, res);
    } else if (path.match(/^payouts\/[^/]+$/) && !path.includes('/user/') && !path.includes('/merchant/') && !path.includes('/banks')) {
      const payoutId = path.split('/')[1];
      return await handlePayoutById(req, res, payoutId);
    } else if (path === 'auth/verify-pin' || path === 'auth/verify-pin/') {
      return await handleAuthVerifyPin(req, res);
    } else if (path === 'oauth/token' || path === 'oauth/token/') {
      return await handleOAuthToken(req, res);
    } else if (path === 'oauth/userinfo' || path === 'oauth/userinfo/') {
      return await handleOAuthUserinfo(req, res);
    } else if (path === 'oauth/revoke' || path === 'oauth/revoke/') {
      return await handleOAuthRevoke(req, res);
    // ========== SHARED API ENDPOINTS (Cross-Domain SSO) ==========
    } else if (path === 'shared/contacts' || path === 'shared/contacts/') {
      return await handleSharedContacts(req, res);
    } else if (path === 'shared/wallet' || path === 'shared/wallet/') {
      return await handleSharedWallet(req, res);
    } else if (path === 'shared/wallet/transactions' || path === 'shared/wallet/transactions/') {
      return await handleSharedWalletTransactions(req, res);
    } else if (path === 'shared/transfer' || path === 'shared/transfer/') {
      return await handleSharedTransfer(req, res);
    } else if (path === 'shared/user' || path === 'shared/user/') {
      return await handleSharedUser(req, res);
    } else if (path === 'shared/business' || path === 'shared/business/') {
      return await handleSharedBusiness(req, res);
    } else if (path === 'shared/checkout/create' || path === 'shared/checkout/create/') {
      return await handleSharedCheckoutCreate(req, res);
    } else if (path === 'shared/users/search' || path === 'shared/users/search/') {
      return await handleSharedUsersSearch(req, res);
    // ========== CRON ENDPOINTS ==========
    } else if (path === 'cron/keepalive' || path === 'cron/keepalive/') {
      return await handleCronKeepalive(req, res);
    } else if (path === 'cron/subscriptions' || path === 'cron/subscriptions/') {
      return await handleCronSubscriptions(req, res);
    // ========== ANALYTICS ENDPOINTS ==========
    } else if (path === 'analytics/pageview' || path === 'analytics/pageview/') {
      return await handleAnalyticsPageView(req, res);
    } else if (path === 'analytics/pageview/duration' || path === 'analytics/pageview/duration/') {
      return await handleAnalyticsPageViewDuration(req, res);
    } else if (path === 'analytics/summary' || path === 'analytics/summary/') {
      return await handleAnalyticsSummary(req, res);
    } else if (path === 'analytics/pages' || path === 'analytics/pages/') {
      return await handleAnalyticsPages(req, res);
    } else if (path === 'analytics/visitors' || path === 'analytics/visitors/') {
      return await handleAnalyticsVisitors(req, res);
    // ========== REFUND ENDPOINTS ==========
    } else if (path === 'refunds' || path === 'refunds/') {
      return await handleRefunds(req, res);
    } else if (path === 'refunds/pending' || path === 'refunds/pending/') {
      return await handleRefundsPending(req, res);
    } else if (path.match(/^refunds\/[^/]+\/cancel$/)) {
      const refundId = path.split('/')[1];
      return await handleRefundCancel(req, res, refundId);
    } else if (path.match(/^refunds\/[^/]+$/)) {
      const refundId = path.split('/')[1];
      return await handleRefundById(req, res, refundId);
    } else if (path === 'cron/process-refunds' || path === 'cron/process-refunds/') {
      return await handleCronProcessRefunds(req, res);
    // ========== PUSH NOTIFICATION ENDPOINTS ==========
    } else if (path === 'notifications/send' || path === 'notifications/send/') {
      return await handleNotificationSend(req, res);
    } else if (path === 'notifications/history' || path === 'notifications/history/') {
      return await handleNotificationHistory(req, res);
    } else if (path === 'notifications/users' || path === 'notifications/users/') {
      return await handleNotificationUsers(req, res);
    } else if (path === 'notifications/stats' || path === 'notifications/stats/') {
      return await handleNotificationStats(req, res);
    } else if (path === 'debug/transactions' || path.startsWith('debug/transactions')) {
      // Debug endpoint to check transactions
      const ref = req.query.ref as string;
      const userId = req.query.user_id as string;

      let query = supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(20);

      if (ref) {
        query = query.eq('reference', ref);
      }
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        return res.status(500).json({ error: error.message });
      }

      return res.status(200).json({ count: data?.length || 0, transactions: data });
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
          fuel: '/fuel/*',
        },
        docs: 'https://docs.peeap.com',
      });
    // ========== FUEL STATION CRM ENDPOINTS ==========
    } else if (path === 'fuel/stations' || path === 'fuel/stations/') {
      return await handleFuelStations(req, res);
    } else if (path.match(/^fuel\/stations\/[^/]+$/)) {
      const stationId = path.split('/')[2];
      return await handleFuelStationById(req, res, stationId);
    } else if (path.match(/^fuel\/stations\/[^/]+\/pumps$/)) {
      const stationId = path.split('/')[2];
      return await handleFuelPumps(req, res, stationId);
    } else if (path.match(/^fuel\/stations\/[^/]+\/tanks$/)) {
      const stationId = path.split('/')[2];
      return await handleFuelTanks(req, res, stationId);
    } else if (path.match(/^fuel\/stations\/[^/]+\/prices$/)) {
      const stationId = path.split('/')[2];
      return await handleFuelPrices(req, res, stationId);
    } else if (path === 'fuel/sales' || path === 'fuel/sales/') {
      return await handleFuelSales(req, res);
    } else if (path.match(/^fuel\/sales\/[^/]+$/)) {
      const saleId = path.split('/')[2];
      return await handleFuelSaleById(req, res, saleId);
    } else if (path === 'fuel/cards' || path === 'fuel/cards/') {
      return await handleFuelCards(req, res);
    } else if (path.match(/^fuel\/cards\/[^/]+$/)) {
      const cardId = path.split('/')[2];
      return await handleFuelCardById(req, res, cardId);
    } else if (path.match(/^fuel\/cards\/[^/]+\/topup$/)) {
      const cardId = path.split('/')[2];
      return await handleFuelCardTopup(req, res, cardId);
    } else if (path === 'fuel/fleet' || path === 'fuel/fleet/') {
      return await handleFuelFleetCustomers(req, res);
    } else if (path.match(/^fuel\/fleet\/[^/]+$/)) {
      const customerId = path.split('/')[2];
      return await handleFuelFleetCustomerById(req, res, customerId);
    } else if (path === 'fuel/shifts' || path === 'fuel/shifts/') {
      return await handleFuelShifts(req, res);
    } else if (path === 'fuel/shifts/start' || path === 'fuel/shifts/start/') {
      return await handleFuelShiftStart(req, res);
    } else if (path.match(/^fuel\/shifts\/[^/]+\/end$/)) {
      const shiftId = path.split('/')[2];
      return await handleFuelShiftEnd(req, res, shiftId);
    } else if (path === 'fuel/inventory/deliveries' || path === 'fuel/inventory/deliveries/') {
      return await handleFuelDeliveries(req, res);
    } else if (path === 'fuel/inventory/dippings' || path === 'fuel/inventory/dippings/') {
      return await handleFuelDippings(req, res);
    } else if (path === 'fuel/fuel-types' || path === 'fuel/fuel-types/') {
      return await handleFuelTypes(req, res);
    }
    // ============================================================================
    // EXCHANGE ROUTES
    // ============================================================================
    else if (path === 'exchange/rate' || path === 'exchange/rate/') {
      return await handleExchangeRate(req, res);
    } else if (path === 'exchange/calculate' || path === 'exchange/calculate/') {
      return await handleExchangeCalculate(req, res);
    } else if (path === 'exchange/can-exchange' || path === 'exchange/can-exchange/') {
      return await handleCanExchange(req, res);
    } else if (path === 'exchange/execute' || path === 'exchange/execute/') {
      return await handleExchangeExecute(req, res);
    } else if (path === 'exchange/history' || path === 'exchange/history/') {
      return await handleExchangeHistory(req, res);
    } else if (path === 'exchange/admin/rates' || path === 'exchange/admin/rates/') {
      return await handleExchangeAdminRates(req, res);
    } else if (path === 'exchange/admin/rate' || path === 'exchange/admin/rate/') {
      return await handleExchangeAdminSetRate(req, res);
    } else if (path === 'exchange/admin/permissions' || path === 'exchange/admin/permissions/') {
      return await handleExchangeAdminPermissions(req, res);
    } else if (path === 'exchange/admin/permission' || path === 'exchange/admin/permission/') {
      return await handleExchangeAdminSetPermission(req, res);
    } else if (path === 'exchange/admin/transactions' || path === 'exchange/admin/transactions/') {
      return await handleExchangeAdminTransactions(req, res);
    }
    // ============================================================================
    // KYC VERIFICATION ROUTES
    // ============================================================================
    else if (path === 'kyc/verification/status' || path === 'kyc/verification/status/') {
      return await handleKycVerificationStatus(req, res);
    } else if (path === 'kyc/verification/required' || path === 'kyc/verification/required/') {
      return await handleKycVerificationRequired(req, res);
    } else if (path === 'kyc/verification/sierra-leone' || path === 'kyc/verification/sierra-leone/') {
      return await handleKycSierraLeoneVerification(req, res);
    } else if (path === 'kyc/verification/provider-kyc' || path === 'kyc/verification/provider-kyc/') {
      return await handleKycProviderKyc(req, res);
    } else if (path === 'kyc/verification/match-names' || path === 'kyc/verification/match-names/') {
      return await handleKycMatchNames(req, res);
    } else if (path === 'kyc/verification/phone/initiate' || path === 'kyc/verification/phone/initiate/') {
      return await handleKycPhoneInitiate(req, res);
    } else if (path === 'kyc/verification/phone/verify' || path === 'kyc/verification/phone/verify/') {
      return await handleKycPhoneVerify(req, res);
    // ========== PAYMENT INTENTS ENDPOINTS ==========
    } else if (path === 'v1/payment-intents' || path === 'v1/payment-intents/') {
      return await handlePaymentIntents(req, res);
    } else if (path === 'v1/payment-intents/public' || path === 'v1/payment-intents/public/') {
      return await handlePaymentIntentsPublic(req, res);
    } else if (path.match(/^v1\/payment-intents\/[^/]+\/status$/)) {
      const intentId = path.split('/')[2];
      return await handlePaymentIntentStatusPublic(req, res, intentId);
    } else if (path.match(/^v1\/payment-intents\/[^/]+$/)) {
      const intentId = path.split('/')[2];
      return await handlePaymentIntentById(req, res, intentId);
    } else if (path.match(/^v1\/payment-intents\/[^/]+\/confirm$/)) {
      const intentId = path.split('/')[2];
      return await handlePaymentIntentConfirm(req, res, intentId);
    } else if (path.match(/^v1\/payment-intents\/[^/]+\/capture$/)) {
      const intentId = path.split('/')[2];
      return await handlePaymentIntentCapture(req, res, intentId);
    } else if (path.match(/^v1\/payment-intents\/[^/]+\/cancel$/)) {
      const intentId = path.split('/')[2];
      return await handlePaymentIntentCancel(req, res, intentId);
    } else if (path.match(/^v1\/payment-intents\/[^/]+\/qr$/)) {
      const intentId = path.split('/')[2];
      return await handlePaymentIntentQr(req, res, intentId);
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
    // Handle both array (from Postgres) and string formats
    roles = Array.isArray(dbUser.roles)
      ? dbUser.roles
      : dbUser.roles.split(',').map((r: string) => r.trim());
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
      withdrawalFeePercent: Number(settings.withdrawal_fee_percent || 2),
      withdrawalFeeFlat: Number(settings.withdrawal_fee_flat || 0),
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
    // All fee settings for the Fees page
    feeSettings: {
      // Withdrawal fees
      withdrawalFeePercent: Number(settings.withdrawal_fee_percent || 2),
      withdrawalFeeFlat: Number(settings.withdrawal_fee_flat || 0),
      // P2P transfer fees
      p2pFeePercent: Number(settings.p2p_fee_percent || 0),
      p2pFeeFlat: Number(settings.p2p_fee_flat || 0),
      // Card fees
      cardTxnFeePercent: Number(settings.card_txn_fee_percent || 1.5),
      cardTxnFeeFlat: Number(settings.card_txn_fee_flat || 0),
      virtualCardFee: Number(settings.virtual_card_fee || 1),
      physicalCardFee: Number(settings.physical_card_fee || 10),
      // Checkout/merchant fees
      checkoutFeePercent: Number(settings.checkout_fee_percent || 2.9),
      checkoutFeeFlat: Number(settings.checkout_fee_flat || 0.30),
      merchantPayoutFeePercent: Number(settings.merchant_payout_fee_percent || 0.25),
      merchantPayoutFeeFlat: Number(settings.merchant_payout_fee_flat || 0),
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

  // P2P transfer fees
  if (body.p2pFeePercent !== undefined) updateData.p2p_fee_percent = body.p2pFeePercent;
  if (body.p2pFeeFlat !== undefined) updateData.p2p_fee_flat = body.p2pFeeFlat;

  // Card fees
  if (body.cardTxnFeePercent !== undefined) updateData.card_txn_fee_percent = body.cardTxnFeePercent;
  if (body.cardTxnFeeFlat !== undefined) updateData.card_txn_fee_flat = body.cardTxnFeeFlat;
  if (body.virtualCardFee !== undefined) updateData.virtual_card_fee = body.virtualCardFee;
  if (body.physicalCardFee !== undefined) updateData.physical_card_fee = body.physicalCardFee;

  // Checkout/merchant fees
  if (body.checkoutFeePercent !== undefined) updateData.checkout_fee_percent = body.checkoutFeePercent;
  if (body.checkoutFeeFlat !== undefined) updateData.checkout_fee_flat = body.checkoutFeeFlat;
  if (body.merchantPayoutFeePercent !== undefined) updateData.merchant_payout_fee_percent = body.merchantPayoutFeePercent;
  if (body.merchantPayoutFeeFlat !== undefined) updateData.merchant_payout_fee_flat = body.merchantPayoutFeeFlat;

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
        const { data: pendingTx, error: txError } = await supabase
          .from('transactions')
          .select('*')
          .eq('reference', sessionId)
          .eq('status', 'PENDING')
          .single();

        console.log('[Deposit Success] Pending transaction lookup:', {
          reference: sessionId,
          found: !!pendingTx,
          error: txError?.message
        });

        if (pendingTx) {
          amount = parseFloat(pendingTx.amount?.toString() || '0');
          currency = pendingTx.currency || 'SLE';

          // No fees on deposits - we charge fees on withdrawals/payouts only
          console.log('[Deposit Success] Processing deposit:', {
            transactionId: pendingTx.id,
            amount,
            currency,
            walletId
          });

          // Credit the wallet with full amount (no deposit fees)
          const { data: wallet, error: walletError } = await supabase
            .from('wallets')
            .select('balance')
            .eq('id', walletId)
            .single();

          if (walletError) {
            console.error('[Deposit Success] Failed to get wallet:', walletError);
          }

          if (wallet) {
            const currentBalance = parseFloat(wallet.balance?.toString() || '0');
            newBalance = currentBalance + amount; // Credit full amount

            console.log('[Deposit Success] Updating wallet balance:', {
              currentBalance,
              depositAmount: amount,
              newBalance
            });

            // Update wallet balance
            const { error: updateError } = await supabase
              .from('wallets')
              .update({
                balance: newBalance,
                updated_at: new Date().toISOString()
              })
              .eq('id', walletId);

            if (updateError) {
              console.error('[Deposit Success] Failed to update wallet:', updateError);
            } else {
              console.log('[Deposit Success] Wallet balance updated successfully');
            }

            // Update transaction status (no fees on deposits)
            const { error: txUpdateError } = await supabase
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

            if (txUpdateError) {
              console.error('[Deposit Success] Failed to update transaction:', txUpdateError);
            }

            console.log('[Deposit Success] Wallet credited:', { walletId, amount, newBalance });

            // Credit the system float - money came into the platform via mobile money
            try {
              const { error: floatError } = await supabase.rpc('credit_system_float', {
                p_currency: currency,
                p_amount: amount,
                p_transaction_id: pendingTx.id,
                p_description: `Mobile Money Deposit - ${pendingTx.description || 'User deposit'}`,
              });
              if (floatError) {
                console.error('[Deposit Success] Float RPC error:', floatError);
              } else {
                console.log('[Deposit Success] System float credited:', { amount, currency });
              }
            } catch (floatErr) {
              console.error('[Deposit Success] Failed to credit system float:', floatErr);
              // Don't fail the deposit if float update fails
            }

            // Create notification for the user
            try {
              await supabase.from('notifications').insert({
                user_id: pendingTx.user_id,
                type: 'deposit',
                title: 'Deposit Successful',
                message: `Your deposit of Le ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} has been credited to your wallet.`,
                icon: 'wallet',
                action_url: '/wallets',
                action_data: { amount, currency, transactionId: pendingTx.id },
                source_service: 'deposit',
                source_id: pendingTx.id,
                is_read: false,
                priority: 'normal'
              });
              console.log('[Deposit Success] Notification created for user:', pendingTx.user_id);
            } catch (notifErr) {
              console.error('[Deposit Success] Failed to create notification:', notifErr);
            }

            // Create admin notification for the deposit
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('first_name, last_name, phone')
                .eq('id', pendingTx.user_id)
                .single();
              const userName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : userData?.phone || 'Unknown User';

              await supabase.from('admin_notifications').insert({
                type: 'deposit',
                title: 'New Deposit Received',
                message: `${userName} deposited Le ${amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} via Mobile Money`,
                priority: amount >= 1000 ? 'high' : 'medium',
                related_entity_type: 'transaction',
                related_entity_id: pendingTx.id,
                action_url: `/admin/transactions?id=${pendingTx.id}`,
                metadata: {
                  userId: pendingTx.user_id,
                  userName,
                  amount,
                  currency,
                  method: 'Mobile Money',
                },
              });
              console.log('[Deposit Success] Admin notification created');
            } catch (adminNotifErr) {
              console.error('[Deposit Success] Failed to create admin notification:', adminNotifErr);
            }
          }
        } else {
          console.log('[Deposit Success] No pending transaction found for sessionId:', sessionId);
        }
      } else {
        console.log('[Deposit Success] Session not completed. Status:', sessionStatus.status);
      }
    }

    // Redirect directly to wallets page with success message
    const redirectUrl = new URL('/wallets', frontendUrl);
    redirectUrl.searchParams.set('deposit', 'success');
    if (amount > 0) redirectUrl.searchParams.set('amount', String(amount));
    redirectUrl.searchParams.set('currency', currency);

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('[Deposit Success] Error:', error);
    // Redirect to wallets with error message
    const redirectUrl = new URL('/wallets', frontendUrl);
    redirectUrl.searchParams.set('deposit', 'error');
    redirectUrl.searchParams.set('message', error.message || 'Deposit failed');
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

    // Redirect directly to wallets page with cancelled message
    const redirectUrl = new URL('/wallets', frontendUrl);
    redirectUrl.searchParams.set('deposit', 'cancelled');

    return res.redirect(302, redirectUrl.toString());
  } catch (error: any) {
    console.error('[Deposit Cancel] Error:', error);
    // Redirect to wallets with error
    const redirectUrl = new URL('/wallets', frontendUrl);
    redirectUrl.searchParams.set('deposit', 'error');
    redirectUrl.searchParams.set('message', error.message || 'Unknown error');
    return res.redirect(302, redirectUrl.toString());
  }
}

/**
 * Handle Monime webhook notifications
 * This receives payment status updates from Monime for deposits and checkouts
 */
async function handleMonimeWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    console.log('[Monime Webhook] Received:', JSON.stringify(payload));

    // Get webhook secret for verification
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('monime_webhook_secret')
      .eq('id', SETTINGS_ID)
      .single();

    // TODO: Verify webhook signature if Monime provides one
    // const signature = req.headers['x-monime-signature'];

    const eventType = payload.type || payload.event;
    const sessionId = payload.data?.id || payload.data?.sessionId || payload.sessionId;
    const status = payload.data?.status || payload.status;

    console.log('[Monime Webhook] Event:', eventType, 'Session:', sessionId, 'Status:', status);

    if (status === 'completed' || status === 'COMPLETED' || eventType === 'checkout.session.completed') {
      // Find pending transaction with this session ID
      const { data: pendingTx, error: txError } = await supabase
        .from('transactions')
        .select('*, wallets!inner(id, balance, user_id)')
        .eq('reference', sessionId)
        .eq('status', 'PENDING')
        .single();

      if (txError || !pendingTx) {
        console.log('[Monime Webhook] No pending transaction found for session:', sessionId);
        return res.status(200).json({ received: true, message: 'No pending transaction' });
      }

      const walletId = pendingTx.wallet_id;
      const grossAmount = pendingTx.amount; // Amount user intended to deposit
      const currency = pendingTx.currency;

      // Get fee settings (including gateway fees)
      const { data: feeSettings } = await supabase
        .from('payment_settings')
        .select('deposit_fee_percent, deposit_fee_flat, gateway_deposit_fee_percent')
        .eq('id', SETTINGS_ID)
        .single();

      // Calculate fees
      // Gateway (Monime) fee - from settings, defaults to 1.5%
      const gatewayFeePercent = parseFloat(feeSettings?.gateway_deposit_fee_percent?.toString() || '1.5');
      const monimeFee = grossAmount * (gatewayFeePercent / 100);

      // Peeap fee (your profit) - from settings or default 1%
      const peeapFeePercent = feeSettings?.deposit_fee_percent || 1;
      const peeapFeeFlat = feeSettings?.deposit_fee_flat || 0;
      const peeapFee = (grossAmount * (peeapFeePercent / 100)) + peeapFeeFlat;

      // Net amount user receives (after both fees)
      const totalFees = monimeFee + peeapFee;
      const netAmount = grossAmount - totalFees;

      // Amount that actually comes into the float (after Monime's cut)
      const floatAmount = grossAmount - monimeFee;

      console.log('[Monime Webhook] Fee breakdown:', {
        grossAmount,
        monimeFee: monimeFee.toFixed(2),
        peeapFee: peeapFee.toFixed(2),
        totalFees: totalFees.toFixed(2),
        netAmount: netAmount.toFixed(2),
        floatAmount: floatAmount.toFixed(2),
      });

      const currentBalance = parseFloat(pendingTx.wallets?.balance?.toString() || '0');
      const newBalance = currentBalance + netAmount;

      // Credit wallet with NET amount (after fees)
      await supabase
        .from('wallets')
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq('id', walletId);

      // Update transaction with fee details
      await supabase
        .from('transactions')
        .update({
          status: 'COMPLETED',
          fee: peeapFee, // Track platform fee
          metadata: {
            ...pendingTx.metadata,
            completedAt: new Date().toISOString(),
            completedVia: 'webhook',
            grossAmount,
            monimeFee,
            peeapFee,
            netAmount,
            feeBreakdown: {
              gateway: { percent: gatewayFeePercent, amount: monimeFee },
              platform: { percent: peeapFeePercent, flat: peeapFeeFlat, amount: peeapFee },
            },
          }
        })
        .eq('id', pendingTx.id);

      // Credit system float with the amount we actually received (after Monime)
      try {
        await supabase.rpc('credit_system_float', {
          p_currency: currency,
          p_amount: floatAmount, // What we actually received from Monime
          p_transaction_id: pendingTx.id,
          p_description: `Mobile Money Deposit - Net after Monime fee (${peeapFee.toFixed(2)} profit)`,
        });
        console.log('[Monime Webhook] System float credited:', { floatAmount, peeapFee, currency });
      } catch (floatErr) {
        console.error('[Monime Webhook] Failed to credit system float:', floatErr);
      }

      console.log('[Monime Webhook] Deposit completed:', { walletId, grossAmount, netAmount, peeapFee, newBalance });

      // Create admin notification for the deposit
      try {
        // Get user name for admin notification
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, phone')
          .eq('id', pendingTx.user_id)
          .single();
        const userName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : userData?.phone || 'Unknown User';

        await supabase.from('admin_notifications').insert({
          type: 'deposit',
          title: 'New Deposit Received',
          message: `${userName} deposited ${currency} ${grossAmount.toLocaleString()} via Mobile Money (Fee: ${peeapFee.toFixed(2)}, Net: ${netAmount.toFixed(2)})`,
          priority: grossAmount >= 10000 ? 'high' : 'medium',
          related_entity_type: 'transaction',
          related_entity_id: pendingTx.id,
          action_url: `/admin/transactions?id=${pendingTx.id}`,
          metadata: {
            userId: pendingTx.user_id,
            userName,
            grossAmount,
            netAmount,
            peeapFee,
            monimeFee,
            currency,
            method: 'Mobile Money (Webhook)',
          },
        });
        console.log('[Monime Webhook] Admin notification created');
      } catch (adminNotifErr) {
        console.error('[Monime Webhook] Failed to create admin notification:', adminNotifErr);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('[Monime Webhook] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Setup Monime webhook to receive payment notifications
 * POST /api/monime/setup-webhook
 */
async function handleMonimeSetupWebhook(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Create Monime service
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // Get backend URL from settings
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('backend_url')
      .eq('id', SETTINGS_ID)
      .single();

    const backendUrl = settings?.backend_url || 'https://api.peeap.com';
    const webhookUrl = `${backendUrl}/api/monime/webhook`;

    console.log('[Monime Setup Webhook] Setting up webhook:', webhookUrl);

    // Setup the webhook
    const result = await monimeService.setupPeeapWebhook(webhookUrl);

    if (result.success) {
      // Store webhook secret if provided
      if (result.secret) {
        await supabase
          .from('payment_settings')
          .update({ monime_webhook_secret: result.secret })
          .eq('id', SETTINGS_ID);
      }

      return res.status(200).json({
        success: true,
        message: 'Webhook configured successfully',
        webhookId: result.webhookId,
        webhookUrl: webhookUrl,
      });
    } else {
      return res.status(400).json({
        success: false,
        error: result.error || 'Failed to setup webhook',
      });
    }
  } catch (error: any) {
    console.error('[Monime Setup Webhook] Error:', error);
    return res.status(500).json({ error: error.message });
  }
}

/**
 * Get Monime financial account balances
 * GET /api/monime/balance
 * Returns the total balance available in Monime accounts
 */
async function handleMonimeBalance(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get Monime credentials using the shared modular function
    // No auth required - matches other float endpoints (handleFloatSummary, handleFloatToday)
    const credentials = await getMonimeCredentials(supabase, SETTINGS_ID);

    // Fetch financial accounts directly from Monime API
    const response = await fetch('https://api.monime.io/v1/financial-accounts?withBalance=true', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${credentials.accessToken}`,
        'Monime-Space-Id': credentials.spaceId,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[Monime Balance] Monime API error:', response.status, errorData);
      return res.status(response.status).json({
        error: errorData.message || `Monime API error: ${response.status}`,
        code: 'MONIME_API_ERROR'
      });
    }

    const data = await response.json();
    const accounts = data.result || [];

    // Calculate total balance per currency
    const balancesByCurrency: Record<string, {
      totalBalance: number;
      totalBalanceMinorUnits: number;
      currency: string;
      accounts: Array<{
        id: string;
        name: string;
        balance: number;
        balanceMinorUnits: number;
      }>;
    }> = {};

    for (const account of accounts) {
      const currency = account.currency || 'SLE';
      const balanceMinorUnits = account.balance?.available?.value || 0;
      // Convert from minor units (cents) to display units
      const balance = balanceMinorUnits / 100;

      if (!balancesByCurrency[currency]) {
        balancesByCurrency[currency] = {
          totalBalance: 0,
          totalBalanceMinorUnits: 0,
          currency,
          accounts: [],
        };
      }

      balancesByCurrency[currency].totalBalance += balance;
      balancesByCurrency[currency].totalBalanceMinorUnits += balanceMinorUnits;
      balancesByCurrency[currency].accounts.push({
        id: account.id,
        name: account.name,
        balance,
        balanceMinorUnits,
      });
    }

    // Get the primary balance (usually SLE)
    const primaryCurrency = 'SLE';
    const primaryBalance = balancesByCurrency[primaryCurrency]?.totalBalance || 0;

    return res.status(200).json({
      success: true,
      balance: primaryBalance,
      balancesByCurrency,
      accountCount: accounts.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Monime Balance] Error:', error);

    if (error instanceof MonimeError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }

    return res.status(500).json({ error: error.message || 'Failed to fetch balance' });
  }
}

/**
 * Get float summary - uses service role to bypass RLS
 */
async function handleFloatSummary(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get float data with service role (bypasses RLS)
    const { data: floats, error: floatError } = await supabase
      .from('system_float')
      .select('*')
      .order('currency');

    if (floatError) {
      console.error('[Float Summary] Error:', floatError);
      return res.status(500).json({ error: floatError.message });
    }

    return res.status(200).json({
      success: true,
      floats: floats || [],
    });
  } catch (error: any) {
    console.error('[Float Summary] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch float summary' });
  }
}

/**
 * Get today's float movements - uses service role to bypass RLS
 */
async function handleFloatToday(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's movements with service role (bypasses RLS)
    const { data: movements, error: movementsError } = await supabase
      .from('system_float_history')
      .select('type, amount')
      .gte('created_at', today.toISOString());

    if (movementsError) {
      console.error('[Float Today] Error:', movementsError);
      return res.status(500).json({ error: movementsError.message });
    }

    let deposits = 0;
    let payouts = 0;

    (movements || []).forEach((item: any) => {
      const amount = parseFloat(item.amount) || 0;
      const txType = item.type || item.transaction_type;

      if (txType === 'credit' || txType === 'replenish' || txType === 'opening') {
        deposits += amount;
      } else if (txType === 'debit' || txType === 'close') {
        payouts += amount;
      }
    });

    return res.status(200).json({
      success: true,
      deposits,
      payouts,
      fees: 0,
      movementCount: (movements || []).length,
    });
  } catch (error: any) {
    console.error('[Float Today] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch today movements' });
  }
}

/**
 * Get recent payouts for float dashboard
 * GET /api/float/payouts
 * Returns user cashouts and merchant withdrawals for the float system
 */
async function handleFloatPayouts(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status'); // Optional: filter by status
    const type = url.searchParams.get('type'); // Optional: USER_CASHOUT or MERCHANT_WITHDRAW
    const period = url.searchParams.get('period'); // Optional: today, week, month

    // Build query
    let query = supabase
      .from('payouts')
      .select(`
        id,
        external_id,
        user_id,
        merchant_id,
        wallet_id,
        payout_type,
        amount,
        fee,
        total_deduction,
        currency,
        destination_type,
        provider_id,
        provider_name,
        account_number,
        account_name,
        status,
        monime_payout_id,
        monime_status,
        description,
        created_at,
        updated_at,
        completed_at,
        metadata
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (status) {
      query = query.eq('status', status.toUpperCase());
    }
    if (type) {
      query = query.eq('payout_type', type.toUpperCase());
    }

    // Apply period filter
    if (period) {
      const now = new Date();
      let startDate: Date;

      if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (period === 'week') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
      } else {
        startDate = new Date(0); // All time
      }

      query = query.gte('created_at', startDate.toISOString());
    }

    const { data: payouts, error, count } = await query;

    if (error) {
      console.error('[Float Payouts] Error:', error);
      return res.status(500).json({ error: error.message });
    }

    // Fetch user/merchant names for display
    const userIds = [...new Set((payouts || []).filter(p => p.user_id).map(p => p.user_id))];
    const merchantIds = [...new Set((payouts || []).filter(p => p.merchant_id).map(p => p.merchant_id))];

    let users: Record<string, any> = {};
    let merchants: Record<string, any> = {};

    if (userIds.length > 0) {
      const { data: userData } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .in('id', userIds);

      (userData || []).forEach(u => {
        users[u.id] = u;
      });
    }

    if (merchantIds.length > 0) {
      const { data: merchantData } = await supabase
        .from('merchants')
        .select('id, business_name, email, phone')
        .in('id', merchantIds);

      (merchantData || []).forEach(m => {
        merchants[m.id] = m;
      });
    }

    // Enrich payouts with user/merchant info
    const enrichedPayouts = (payouts || []).map(p => ({
      ...p,
      user: p.user_id ? users[p.user_id] : null,
      merchant: p.merchant_id ? merchants[p.merchant_id] : null,
      displayName: p.user_id
        ? (users[p.user_id] ? `${users[p.user_id].first_name || ''} ${users[p.user_id].last_name || ''}`.trim() || users[p.user_id].email : 'Unknown User')
        : (p.merchant_id && merchants[p.merchant_id] ? merchants[p.merchant_id].business_name : 'Unknown Merchant'),
    }));

    // Calculate summary stats
    const totalAmount = (payouts || []).reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const totalFees = (payouts || []).reduce((sum, p) => sum + (parseFloat(p.fee) || 0), 0);
    const completedCount = (payouts || []).filter(p => p.status === 'COMPLETED').length;
    const pendingCount = (payouts || []).filter(p => p.status === 'PROCESSING' || p.status === 'PENDING').length;
    const failedCount = (payouts || []).filter(p => p.status === 'FAILED').length;

    return res.status(200).json({
      success: true,
      payouts: enrichedPayouts,
      total: count || 0,
      limit,
      offset,
      summary: {
        totalAmount,
        totalFees,
        completedCount,
        pendingCount,
        failedCount,
      },
    });
  } catch (error: any) {
    console.error('[Float Payouts] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch payouts' });
  }
}

/**
 * Get platform earnings summary
 * GET /api/float/earnings
 * Returns earnings from deposit fees, withdrawal fees, transaction fees, etc.
 */
async function handleFloatEarnings(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const period = url.searchParams.get('period') || 'today'; // today, week, month, all
    const type = url.searchParams.get('type'); // deposit_fee, withdrawal_fee, etc.

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    if (period === 'today') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    } else {
      startDate = new Date(0); // All time
    }

    // Build query
    let query = supabase
      .from('platform_earnings')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('earning_type', type);
    }

    const { data: earnings, error } = await query;

    if (error) {
      console.error('[Float Earnings] Error:', error);
      // If table doesn't exist yet, return empty data
      if (error.code === '42P01') {
        return res.status(200).json({
          success: true,
          earnings: [],
          summary: {
            totalEarnings: 0,
            depositFees: 0,
            withdrawalFees: 0,
            transactionFees: 0,
            checkoutFees: 0,
            count: 0,
          },
          period,
        });
      }
      return res.status(500).json({ error: error.message });
    }

    // Calculate summary by type (overall)
    const summary = {
      totalEarnings: 0,
      depositFees: 0,
      withdrawalFees: 0,
      transactionFees: 0,
      checkoutFees: 0,
      count: (earnings || []).length,
    };

    // Calculate summary by currency
    const earningsByCurrency: Record<string, {
      totalEarnings: number;
      depositFees: number;
      withdrawalFees: number;
      transactionFees: number;
      checkoutFees: number;
      count: number;
    }> = {};

    (earnings || []).forEach((e: any) => {
      const amount = parseFloat(e.amount) || 0;
      const currency = e.currency || 'SLE';

      // Overall summary
      summary.totalEarnings += amount;

      switch (e.earning_type) {
        case 'deposit_fee':
          summary.depositFees += amount;
          break;
        case 'withdrawal_fee':
          summary.withdrawalFees += amount;
          break;
        case 'transaction_fee':
          summary.transactionFees += amount;
          break;
        case 'checkout_fee':
          summary.checkoutFees += amount;
          break;
      }

      // By currency summary
      if (!earningsByCurrency[currency]) {
        earningsByCurrency[currency] = {
          totalEarnings: 0,
          depositFees: 0,
          withdrawalFees: 0,
          transactionFees: 0,
          checkoutFees: 0,
          count: 0,
        };
      }
      earningsByCurrency[currency].totalEarnings += amount;
      earningsByCurrency[currency].count += 1;

      switch (e.earning_type) {
        case 'deposit_fee':
          earningsByCurrency[currency].depositFees += amount;
          break;
        case 'withdrawal_fee':
          earningsByCurrency[currency].withdrawalFees += amount;
          break;
        case 'transaction_fee':
          earningsByCurrency[currency].transactionFees += amount;
          break;
        case 'checkout_fee':
          earningsByCurrency[currency].checkoutFees += amount;
          break;
      }
    });

    // Get daily breakdown for chart
    const dailyEarnings: Record<string, number> = {};
    (earnings || []).forEach((e: any) => {
      const date = new Date(e.created_at).toISOString().split('T')[0];
      dailyEarnings[date] = (dailyEarnings[date] || 0) + (parseFloat(e.amount) || 0);
    });

    const chartData = Object.entries(dailyEarnings)
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7); // Last 7 days

    return res.status(200).json({
      success: true,
      earnings: (earnings || []).slice(0, 50), // Limit to 50 recent
      summary,
      earningsByCurrency,
      chartData,
      period,
    });
  } catch (error: any) {
    console.error('[Float Earnings] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch earnings' });
  }
}

/**
 * Manually verify and complete a pending deposit
 * Use this to recover deposits where the redirect failed
 */
async function handleDepositVerify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, walletId, transactionId } = req.body;

    if (!sessionId && !transactionId) {
      return res.status(400).json({ error: 'sessionId or transactionId is required' });
    }

    console.log('[Deposit Verify] Request:', { sessionId, walletId, transactionId });

    // Find the pending transaction
    let query = supabase
      .from('transactions')
      .select('*')
      .eq('status', 'PENDING')
      .eq('type', 'DEPOSIT');

    if (transactionId) {
      query = query.eq('id', transactionId);
    } else if (sessionId) {
      query = query.eq('reference', sessionId);
    }

    const { data: pendingTx, error: txError } = await query.single();

    if (txError || !pendingTx) {
      // Check if already completed
      const { data: completedTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', sessionId || '')
        .eq('status', 'COMPLETED')
        .single();

      if (completedTx) {
        return res.status(200).json({
          success: true,
          message: 'Transaction already completed',
          transaction: completedTx
        });
      }

      return res.status(404).json({ error: 'No pending deposit found' });
    }

    // Verify with Monime
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);
    const monimeSessionId = pendingTx.reference || pendingTx.metadata?.monimeSessionId;

    if (!monimeSessionId) {
      return res.status(400).json({ error: 'No Monime session ID found on transaction' });
    }

    const sessionStatus = await monimeService.getCheckoutSession(monimeSessionId);
    console.log('[Deposit Verify] Monime status:', sessionStatus);

    if (sessionStatus.status !== 'completed') {
      return res.status(400).json({
        error: 'Payment not completed on Monime',
        monimeStatus: sessionStatus.status
      });
    }

    // Get wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id, balance, user_id')
      .eq('id', pendingTx.wallet_id)
      .single();

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    const amount = pendingTx.amount;
    const currency = pendingTx.currency;
    const currentBalance = parseFloat(wallet.balance?.toString() || '0');
    const newBalance = currentBalance + amount;

    // Credit wallet
    await supabase
      .from('wallets')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', wallet.id);

    // Update transaction
    await supabase
      .from('transactions')
      .update({
        status: 'COMPLETED',
        metadata: {
          ...pendingTx.metadata,
          completedAt: new Date().toISOString(),
          completedVia: 'manual_verify',
          monimeStatus: sessionStatus.status,
        }
      })
      .eq('id', pendingTx.id);

    // Credit system float
    try {
      await supabase.rpc('credit_system_float', {
        p_currency: currency,
        p_amount: amount,
        p_transaction_id: pendingTx.id,
        p_description: `Mobile Money Deposit (verified) - ${pendingTx.description || 'User deposit'}`,
      });
      console.log('[Deposit Verify] System float credited:', { amount, currency });
    } catch (floatErr) {
      console.error('[Deposit Verify] Failed to credit system float:', floatErr);
    }

    console.log('[Deposit Verify] Deposit completed:', { walletId: wallet.id, amount, newBalance });

    return res.status(200).json({
      success: true,
      message: 'Deposit verified and completed',
      amount,
      currency,
      newBalance,
      transactionId: pendingTx.id,
    });
  } catch (error: any) {
    console.error('[Deposit Verify] Error:', error);
    return res.status(500).json({ error: error.message });
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
    // Always redirect to checkout.peeap.com for the hosted checkout UI
    const checkoutFrontendUrl = process.env.CHECKOUT_URL || 'https://checkout.peeap.com';

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
      const redirectUrl = `${checkoutFrontendUrl}/checkout/pay/${sessionId}?retry=true&message=Payment+cancelled.+Please+try+another+payment+method.`;
      console.log('[Checkout Pay Redirect] Redirecting cancelled payment to:', redirectUrl);
      return res.redirect(302, redirectUrl);
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
      // Get the merchant business to find the owner's user_id
      const { data: merchantBusiness, error: businessError } = await supabase
        .from('merchant_businesses')
        .select('id, merchant_id, name')
        .eq('id', session.merchant_id)
        .single();

      if (businessError || !merchantBusiness) {
        console.error('[CheckoutPay] Merchant business not found:', session.merchant_id);
      }

      const merchantOwnerId = merchantBusiness?.merchant_id;
      console.log('[CheckoutPay] Found merchant business:', merchantBusiness?.name, 'Owner:', merchantOwnerId);

      // Get merchant owner's wallet to credit (using owner's user_id, not business id)
      let merchantWallet = null;
      if (merchantOwnerId) {
        const { data: primaryWallet } = await supabase
          .from('wallets')
          .select('id, balance, user_id')
          .eq('user_id', merchantOwnerId)
          .eq('wallet_type', 'primary')
          .single();

        merchantWallet = primaryWallet;

        // Fallback: try any wallet for this user
        if (!merchantWallet) {
          const { data: anyWallet } = await supabase
            .from('wallets')
            .select('id, balance, user_id')
            .eq('user_id', merchantOwnerId)
            .limit(1)
            .single();
          merchantWallet = anyWallet;
        }
      }

      if (merchantWallet) {
        const paymentAmount = parseFloat(session.amount);
        const newMerchantBalance = Number(merchantWallet.balance) + paymentAmount;

        // Credit merchant's wallet
        const { error: creditError } = await supabase
          .from('wallets')
          .update({ balance: newMerchantBalance, updated_at: new Date().toISOString() })
          .eq('id', merchantWallet.id);

        if (!creditError) {
          // Create merchant's incoming transaction record - MUST include external_id
          transactionRef = `MOBILE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const merchantTxExternalId = `tx_merch_${randomUUID().replace(/-/g, '').substring(0, 24)}`;

          const { error: txError } = await supabase.from('transactions').insert({
            external_id: merchantTxExternalId,
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
              payerName: session.metadata?.payerName || 'Mobile Money Customer',
              payerEmail: session.metadata?.payerEmail,
            },
          });

          if (txError) {
            console.error('[CheckoutPay] Transaction insert error:', txError);
          }
          console.log('[CheckoutPay] Merchant wallet credited:', { merchantOwnerId, amount: paymentAmount, ref: transactionRef });

          // Credit system float - money came into the platform via mobile money checkout
          try {
            await supabase.rpc('credit_system_float', {
              p_currency: session.currency_code || 'SLE',
              p_amount: paymentAmount,
              p_transaction_id: null,
              p_description: `Mobile Money Checkout - ${session.merchant_name} - ${session.description || 'Payment'}`,
            });
            console.log('[CheckoutPay] System float credited:', { amount: paymentAmount });
          } catch (floatErr) {
            console.error('[CheckoutPay] Failed to credit system float:', floatErr);
            // Don't fail the payment if float update fails
          }

          // Send notification to merchant (use owner's user_id)
          await supabase.from('user_notifications').insert({
            user_id: merchantOwnerId,
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
              // Create payer's outgoing transaction record (for their transaction history) - MUST include external_id
              const payerTxExternalId = `tx_payer_${randomUUID().replace(/-/g, '').substring(0, 24)}`;

              const { error: payerTxError } = await supabase.from('transactions').insert({
                external_id: payerTxExternalId,
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

              if (payerTxError) {
                console.error('[CheckoutPay] Payer transaction insert error:', payerTxError);
              }
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
        console.error('[CheckoutPay] Merchant wallet not found for owner:', merchantOwnerId);
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

    // Validate and sanitize redirectUrl - reject localhost in live mode
    let sanitizedRedirectUrl = redirectUrl;
    if (redirectUrl && isLiveKey) {
      try {
        const urlObj = new URL(redirectUrl);
        if (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1') {
          console.warn('[CheckoutCreate] Rejecting localhost redirectUrl in live mode:', redirectUrl);
          sanitizedRedirectUrl = null; // Use default instead
        }
      } catch {
        sanitizedRedirectUrl = null;
      }
    }

    // Determine success/cancel URLs
    const successUrl = sanitizedRedirectUrl || business.callback_url || `${frontendUrl}/payment/success`;
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
        merchant_is_verified: business.is_verified || false,
        brand_color: '#4F46E5',
        success_url: successUrl,
        cancel_url: cancelUrl,
        return_url: sanitizedRedirectUrl || successUrl,
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

    // API is hosted at api.peeap.com, frontend at my.peeap.com
    const backendUrl = settings?.backend_url || 'https://api.peeap.com';
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
    const externalId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const { error: txError } = await supabase.from('transactions').insert({
      user_id: wallet.user_id,
      wallet_id: walletId,
      external_id: externalId,
      type: 'DEPOSIT',
      amount: amount,
      currency: currency,
      status: 'PENDING',
      description: description || `Deposit to ${currency} wallet`,
      reference: result.monimeSessionId,
      metadata: {
        monimeSessionId: result.monimeSessionId,
        paymentMethod: 'mobile_money',
        initiatedAt: new Date().toISOString(),
      },
    });

    if (txError) {
      console.error('[MonimeDeposit] Failed to create transaction record:', txError);
    }

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
    // IMPORTANT: Redirect to API endpoint (api.peeap.com) NOT frontend (checkout.peeap.com)
    // The API handles crediting merchant wallet and redirects to success page
    const result = await monimeService.createHostedCheckout({
      sessionId: session.external_id,
      amount: session.amount, // MonimeService will multiply by 10 for SLE
      currency: session.currency_code || 'SLE',
      description: session.description || `Payment to ${session.merchant_name || 'Peeap'}`,
      merchantName: session.merchant_name || 'Peeap',
      merchantId: session.merchant_id,
      successUrl: `https://api.peeap.com/api/checkout/pay/${sessionId}?status=success`,
      cancelUrl: `https://api.peeap.com/api/checkout/pay/${sessionId}?status=cancel`,
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

    // Support both merchant_id (legacy) and pk (public key - v0 SDK)
    let merchantId = params.get('merchant_id');
    const publicKey = params.get('pk');
    const amount = params.get('amount');
    let currency = params.get('currency') || 'SLE';
    const description = params.get('description') || 'Payment';
    const successUrl = params.get('success_url');
    const cancelUrl = params.get('cancel_url');
    let merchantName = params.get('merchant_name');
    let merchantLogo = params.get('merchant_logo');
    let brandColor = params.get('brand_color') || '#4F46E5';
    const reference = params.get('reference');
    const redirectUrl = params.get('redirect_url');
    const customerEmail = params.get('email');
    const customerPhone = params.get('phone');

    // If public key provided, look up the business
    let business: any = null;
    let isTestMode = false;

    if (publicKey) {
      const isLiveKey = publicKey.startsWith('pk_live_');
      const isTestKey = publicKey.startsWith('pk_test_');

      if (!isLiveKey && !isTestKey) {
        return res.status(400).send(errorPage('Invalid public key format'));
      }

      isTestMode = isTestKey;
      const keyColumn = isLiveKey ? 'live_public_key' : 'test_public_key';

      const { data: biz, error: bizError } = await supabase
        .from('merchant_businesses')
        .select('*')
        .eq(keyColumn, publicKey)
        .eq('status', 'ACTIVE')
        .single();

      if (bizError || !biz) {
        console.error('[Quick Checkout] Business lookup failed:', bizError);
        return res.status(400).send(errorPage('Invalid public key or business not active'));
      }

      business = biz;
      merchantId = biz.id;
      merchantName = merchantName || biz.business_name;
      merchantLogo = merchantLogo || biz.logo_url;
      brandColor = brandColor || biz.brand_color || '#4F46E5';
    }

    // Validate required params
    if (!merchantId && !publicKey) {
      return res.status(400).send(errorPage('merchant_id or pk (public key) is required'));
    }

    // Normalize currency
    currency = (currency || 'SLE').toUpperCase().trim();
    if (currency === 'NLE' || currency === 'LE' || currency === 'LEONE') {
      currency = 'SLE';
    }

    const amountNum = parseFloat(amount || '0');
    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).send(errorPage('Valid amount is required'));
    }

    // Create checkout session
    const sessionId = `cs_${randomUUID().replace(/-/g, '')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const frontendUrl = process.env.FRONTEND_URL || 'https://checkout.peeap.com';

    // Use redirect_url if provided, otherwise success_url
    const finalSuccessUrl = redirectUrl || successUrl || `${frontendUrl}/payment/success`;
    const finalCancelUrl = cancelUrl || (redirectUrl ? redirectUrl + (redirectUrl.includes('?') ? '&' : '?') + 'status=cancelled' : `${frontendUrl}/payment/cancel`);

    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .insert({
        external_id: sessionId,
        merchant_id: merchantId,
        status: 'OPEN',
        amount: amountNum,
        currency_code: currency,
        description,
        merchant_name: merchantName,
        merchant_logo_url: merchantLogo,
        brand_color: brandColor,
        success_url: finalSuccessUrl,
        cancel_url: finalCancelUrl,
        payment_methods: { qr: true, card: true, mobile: true },
        metadata: { reference, customer_email: customerEmail, customer_phone: customerPhone },
        expires_at: expiresAt.toISOString(),
        is_test_mode: isTestMode,
        reference: reference,
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
      // Payment guards - for tracking and verification
      reference,
      note,
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
          // Store payment guards for verification
          reference,
          note,
          expectedAmount: amount,
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
      reference,
      note,
      amount,
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

    // Extract reference and note from metadata for verification
    const metadata = session.metadata || {};
    return res.status(200).json({
      ...session,
      id: session.external_id,
      reference: metadata.reference || null,
      note: metadata.note || null,
      expectedAmount: metadata.expectedAmount || session.amount,
    });
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
    const { paymentMethod, payerName, payerEmail, payerPhone } = req.body;

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

    const paymentAmount = parseFloat(session.amount);
    let transactionRef = `MOMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Get the merchant business to find the owner's user_id
    const { data: merchantBusiness, error: businessError } = await supabase
      .from('merchant_businesses')
      .select('id, merchant_id, name')
      .eq('id', session.merchant_id)
      .single();

    if (businessError || !merchantBusiness) {
      console.error('[CheckoutComplete] Merchant business not found:', session.merchant_id);
      return res.status(500).json({ error: 'Merchant business not found' });
    }

    const merchantOwnerId = merchantBusiness.merchant_id;
    console.log('[CheckoutComplete] Found merchant business:', merchantBusiness.name, 'Owner:', merchantOwnerId);

    // Get the business's dedicated wallet to credit
    // Business wallets have external_id = 'biz_{businessId}' and wallet_type = 'business'
    const businessWalletExternalId = 'biz_' + session.merchant_id.replace(/-/g, '');
    let targetWallet: { id: string; balance: number; user_id: string } | null = null;

    // First try to find the business-specific wallet
    const { data: bizWallet } = await supabase
      .from('wallets')
      .select('id, balance, user_id')
      .eq('external_id', businessWalletExternalId)
      .single();

    if (bizWallet) {
      targetWallet = bizWallet;
      console.log('[CheckoutComplete] Found business wallet:', targetWallet.id);
    } else {
      // Fallback: Try user's merchant wallet
      const { data: userMerchWallet } = await supabase
        .from('wallets')
        .select('id, balance, user_id')
        .eq('user_id', merchantOwnerId)
        .eq('wallet_type', 'merchant')
        .single();

      if (userMerchWallet) {
        targetWallet = userMerchWallet;
      } else {
        // Last fallback: Try primary wallet
        const { data: primaryWallet } = await supabase
          .from('wallets')
          .select('id, balance, user_id')
          .eq('user_id', merchantOwnerId)
          .eq('wallet_type', 'primary')
          .single();

        targetWallet = primaryWallet;
      }
    }

    if (!targetWallet) {
      console.error('[CheckoutComplete] Business wallet not found for business:', session.merchant_id);
      return res.status(500).json({ error: 'Business wallet not found' });
    }

    console.log('[CheckoutComplete] Using wallet:', targetWallet.id, 'for business:', merchantBusiness.name);
    if (targetWallet) {
      const newMerchantBalance = Number(targetWallet.balance) + paymentAmount;

      const { error: creditError } = await supabase
        .from('wallets')
        .update({ balance: newMerchantBalance, updated_at: new Date().toISOString() })
        .eq('id', targetWallet.id);

      if (!creditError) {
        // Create merchant's incoming transaction record - MUST include external_id
        const merchantTxExternalId = `tx_merch_${randomUUID().replace(/-/g, '').substring(0, 24)}`;

        // Determine payer name from various sources
        const resolvedPayerName = payerName ||
          session.metadata?.payerName ||
          payerEmail ||
          payerPhone ||
          'Mobile Money Customer';

        const { error: txError } = await supabase.from('transactions').insert({
          external_id: merchantTxExternalId,
          wallet_id: targetWallet.id,
          type: 'PAYMENT_RECEIVED',
          amount: paymentAmount,
          currency: session.currency_code || 'SLE',
          status: 'COMPLETED',
          description: `Payment from ${resolvedPayerName} (${paymentMethod || 'Mobile Money'})`,
          reference: transactionRef,
          metadata: {
            checkoutSessionId: session.external_id,
            merchantId: session.merchant_id,
            merchantName: session.merchant_name,
            paymentMethod: paymentMethod || 'mobile_money',
            payerName: resolvedPayerName,
            payerEmail: payerEmail || session.metadata?.payerEmail,
            payerPhone: payerPhone,
          },
        });

        if (txError) {
          console.error('[CheckoutComplete] Failed to create transaction:', txError);
        } else {
          console.log('[CheckoutComplete] Merchant wallet credited:', { merchantId: merchantOwnerId, amount: paymentAmount, ref: transactionRef });
        }
      } else {
        console.error('[CheckoutComplete] Failed to credit merchant wallet:', creditError);
      }
    }

    // Mark session as complete
    const { data: updatedSession, error: updateError } = await supabase
      .from('checkout_sessions')
      .update({
        status: 'COMPLETE',
        completed_at: new Date().toISOString(),
        metadata: {
          ...(session.metadata || {}),
          paymentMethod: paymentMethod || 'mobile_money',
          transactionRef: transactionRef,
          payerName: payerName || session.metadata?.payerName,
          payerEmail: payerEmail || session.metadata?.payerEmail,
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
    const { cardId, walletId, pin, cvvVerified } = req.body;

    // Validate required fields
    if (!cardId || !walletId) {
      return res.status(400).json({ error: 'cardId and walletId are required' });
    }

    // Either PIN or cvvVerified flag must be provided
    if (!pin && !cvvVerified) {
      return res.status(400).json({ error: 'pin or cvvVerified is required' });
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
    // First try the legacy 'cards' table
    let card: { id: string; wallet_id: string; cardholder_name: string; cvv?: string; status: string; card_name?: string } | null = null;
    let isIssuedCard = false;

    const { data: legacyCard, error: cardError } = await supabase
      .from('cards')
      .select('id, wallet_id, cardholder_name, cvv, status')
      .eq('id', cardId)
      .single();

    if (legacyCard) {
      card = legacyCard;
    } else {
      // Try the issued_cards table (closed-loop virtual cards)
      const { data: issuedCard, error: issuedCardError } = await supabase
        .from('issued_cards')
        .select('id, wallet_id, card_name, card_status, is_frozen')
        .eq('id', cardId)
        .single();

      if (issuedCard) {
        isIssuedCard = true;
        card = {
          id: issuedCard.id,
          wallet_id: issuedCard.wallet_id,
          cardholder_name: issuedCard.card_name,
          status: issuedCard.card_status === 'active' ? 'ACTIVE' : issuedCard.card_status.toUpperCase(),
        };

        // Check if frozen
        if (issuedCard.is_frozen) {
          return res.status(400).json({ error: 'Card is frozen. Please unfreeze your card in the app.' });
        }
      }
    }

    if (!card) {
      console.error('[CardPay] Card not found in either table:', cardId, cardError);
      return res.status(404).json({ error: 'Card not found' });
    }

    if (card.wallet_id !== walletId) {
      return res.status(400).json({ error: 'Card does not belong to this wallet' });
    }

    if (card.status !== 'ACTIVE') {
      return res.status(400).json({ error: `Card is ${card.status.toLowerCase()}. Please use an active card.` });
    }

    // 3. Verify the PIN (skip if CVV was already verified in step 1)
    // For issued_cards, CVV was already verified via RPC in the frontend
    if (!cvvVerified && !isIssuedCard) {
      // Only for legacy cards, verify PIN against CVV
      if (!card.cvv) {
        return res.status(400).json({ error: 'Card CVV not set. Please contact support.' });
      }

      if (card.cvv !== pin) {
        console.log('[CardPay] Invalid PIN/CVV for card:', cardId);
        return res.status(401).json({ error: 'Invalid PIN. Please check and try again.' });
      }
    }
    // If cvvVerified is true OR isIssuedCard, we trust that CVV was already validated

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

    // 5. Get the merchant business to find the owner's user_id
    const { data: merchantBusiness, error: businessError } = await supabase
      .from('merchant_businesses')
      .select('id, merchant_id, name')
      .eq('id', session.merchant_id)
      .single();

    if (businessError || !merchantBusiness) {
      console.error('[CardPay] Merchant business not found:', session.merchant_id);
      return res.status(500).json({ error: 'Merchant business not found' });
    }

    const merchantOwnerId = merchantBusiness.merchant_id;
    console.log('[CardPay] Found merchant business:', merchantBusiness.name, 'Owner:', merchantOwnerId);

    // Get merchant owner's primary wallet
    let merchantWallet: { id: string; balance: number; user_id: string } | null = null;

    const { data: primaryWallet } = await supabase
      .from('wallets')
      .select('id, balance, user_id')
      .eq('user_id', merchantOwnerId)
      .eq('wallet_type', 'primary')
      .single();

    if (primaryWallet) {
      merchantWallet = primaryWallet;
    } else {
      // Fallback: Try any wallet for this user
      const { data: anyWallet } = await supabase
        .from('wallets')
        .select('id, balance, user_id')
        .eq('user_id', merchantOwnerId)
        .limit(1)
        .single();

      merchantWallet = anyWallet;
    }

    if (!merchantWallet) {
      console.error('[CardPay] Merchant wallet not found for user:', merchantOwnerId);
      return res.status(500).json({ error: 'Merchant wallet not found' });
    }

    console.log('[CardPay] Found merchant wallet:', merchantWallet.id);

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
    const newMerchantBalance = Number(merchantWallet.balance) + paymentAmount;
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

    // 7. Create transaction records with external_id (required NOT NULL field)
    const transactionRef = `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const payerTxExternalId = `tx_payer_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
    const merchantTxExternalId = `tx_merch_${randomUUID().replace(/-/g, '').substring(0, 24)}`;

    const payerName = card.cardholder_name || 'Card Holder';

    // User's outgoing transaction
    const { error: userTxError } = await supabase.from('transactions').insert({
      external_id: payerTxExternalId,
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
        payerName: payerName,
      },
    });

    if (userTxError) {
      console.error('[CardPay] Failed to create user transaction:', userTxError);
    }

    // Merchant's incoming transaction
    const { error: merchantTxError } = await supabase.from('transactions').insert({
      external_id: merchantTxExternalId,
      wallet_id: merchantWallet.id,
      type: 'PAYMENT_RECEIVED',
      amount: paymentAmount,
      currency: session.currency_code || 'SLE',
      status: 'COMPLETED',
      description: `Card payment from ${payerName}`,
      reference: transactionRef,
      metadata: {
        checkoutSessionId: session.external_id,
        customerId: wallet.user_id,
        cardId: cardId,
        paymentMethod: 'peeap_card',
        payerName: payerName,
      },
    });

    if (merchantTxError) {
      console.error('[CardPay] Failed to create merchant transaction:', merchantTxError);
    }

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
// SCAN-TO-PAY HANDLER
// ============================================================================
/**
 * Handle QR code scan payment from another Peeap user
 * Flow:
 * 1. Customer scans QR code displayed on checkout page
 * 2. Customer is redirected to /scan-pay/:sessionId page
 * 3. Customer logs in and confirms payment
 * 4. This endpoint processes wallet-to-wallet transfer
 * 5. Merchant receives payment, session marked complete
 */
async function handleCheckoutScanPay(req: VercelRequest, res: VercelResponse, sessionId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payerUserId, payerWalletId, payerName, pin } = req.body;

    // Validate required fields
    if (!payerUserId || !payerWalletId) {
      return res.status(400).json({ error: 'payerUserId and payerWalletId are required' });
    }

    console.log('[ScanPay] Processing scan payment for session:', sessionId, 'from user:', payerUserId);

    // Verify PIN if provided (server-side verification)
    if (pin) {
      const { data: primaryCard } = await supabase
        .from('cards')
        .select('id, transaction_pin')
        .eq('user_id', payerUserId)
        .eq('status', 'ACTIVE')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (primaryCard?.transaction_pin && primaryCard.transaction_pin !== pin) {
        console.log('[ScanPay] Invalid PIN for user:', payerUserId);
        return res.status(401).json({ error: 'Invalid transaction PIN' });
      }
    }

    // 1. Get the checkout session
    const { data: session, error: sessionError } = await supabase
      .from('checkout_sessions')
      .select('*')
      .eq('external_id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('[ScanPay] Session not found:', sessionId);
      return res.status(404).json({ error: 'Checkout session not found' });
    }

    if (session.status !== 'OPEN') {
      return res.status(400).json({ error: `Session is ${session.status.toLowerCase()}, cannot process payment` });
    }

    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('checkout_sessions').update({ status: 'EXPIRED' }).eq('id', session.id);
      return res.status(400).json({ error: 'Session has expired' });
    }

    // 2. Get payer's wallet and check balance
    const { data: payerWallet, error: payerWalletError } = await supabase
      .from('wallets')
      .select('id, user_id, balance, currency')
      .eq('id', payerWalletId)
      .eq('user_id', payerUserId)
      .single();

    if (payerWalletError || !payerWallet) {
      console.error('[ScanPay] Payer wallet not found:', payerWalletId);
      return res.status(404).json({ error: 'Payer wallet not found' });
    }

    const paymentAmount = parseFloat(session.amount);
    const payerBalance = parseFloat(payerWallet.balance);

    if (payerBalance < paymentAmount) {
      return res.status(400).json({
        error: 'Insufficient funds',
        message: `Your balance is ${payerWallet.currency} ${payerBalance.toFixed(2)} but the payment requires ${session.currency_code} ${paymentAmount.toFixed(2)}`
      });
    }

    // 3. Get the merchant business to find the owner
    // Note: merchant_businesses.merchant_id is the user_id of the business owner
    const { data: merchantBusiness, error: businessError } = await supabase
      .from('merchant_businesses')
      .select('id, merchant_id, name')
      .eq('id', session.merchant_id)
      .single();

    if (businessError || !merchantBusiness) {
      console.error('[ScanPay] Merchant business not found:', session.merchant_id);
      return res.status(500).json({ error: 'Merchant business not found' });
    }

    // merchant_id in merchant_businesses is the user_id of the owner
    const merchantOwnerId = merchantBusiness.merchant_id;
    console.log('[ScanPay] Found merchant business:', merchantBusiness.name, 'Owner:', merchantOwnerId);

    // 4. Get the business's dedicated wallet to credit
    // Business wallets have external_id = 'biz_{businessId}' and wallet_type = 'business'
    const businessWalletExternalId = 'biz_' + session.merchant_id.replace(/-/g, '');
    let merchantWallet: { id: string; balance: number; user_id: string } | null = null;

    // First try to find the business-specific wallet
    const { data: bizWallet } = await supabase
      .from('wallets')
      .select('id, balance, user_id')
      .eq('external_id', businessWalletExternalId)
      .single();

    if (bizWallet) {
      merchantWallet = bizWallet;
      console.log('[ScanPay] Found business wallet:', merchantWallet.id);
    } else {
      // Fallback: Try user's merchant wallet
      const { data: userMerchWallet } = await supabase
        .from('wallets')
        .select('id, balance, user_id')
        .eq('user_id', merchantOwnerId)
        .eq('wallet_type', 'merchant')
        .single();

      if (userMerchWallet) {
        merchantWallet = userMerchWallet;
      } else {
        // Last fallback: Try primary wallet
        const { data: primaryWallet } = await supabase
          .from('wallets')
          .select('id, balance, user_id')
          .eq('user_id', merchantOwnerId)
          .eq('wallet_type', 'primary')
          .single();

        merchantWallet = primaryWallet;
      }
    }

    if (!merchantWallet) {
      console.error('[ScanPay] Business wallet not found for business:', session.merchant_id);
      return res.status(500).json({ error: 'Business wallet not found' });
    }

    console.log('[ScanPay] Using wallet:', merchantWallet.id, 'for business:', merchantBusiness.name);

    // Prevent self-payment
    if (payerUserId === merchantWallet.user_id) {
      return res.status(400).json({ error: 'Cannot pay to yourself' });
    }

    // 4. Process the payment atomically
    // Deduct from payer's wallet
    const newPayerBalance = payerBalance - paymentAmount;
    const { error: deductError } = await supabase
      .from('wallets')
      .update({ balance: newPayerBalance, updated_at: new Date().toISOString() })
      .eq('id', payerWalletId);

    if (deductError) {
      console.error('[ScanPay] Failed to deduct from wallet:', deductError);
      return res.status(500).json({ error: 'Failed to process payment' });
    }

    // Credit merchant's wallet
    const currentMerchantBalance = Number(merchantWallet.balance);
    const newMerchantBalance = currentMerchantBalance + paymentAmount;
    console.log('[ScanPay] Crediting merchant wallet:', merchantWallet.id, 'Current balance:', currentMerchantBalance, 'New balance:', newMerchantBalance);

    const { data: creditData, error: creditError } = await supabase
      .from('wallets')
      .update({ balance: newMerchantBalance, updated_at: new Date().toISOString() })
      .eq('id', merchantWallet.id)
      .select();

    if (creditError) {
      // Rollback payer deduction
      await supabase.from('wallets').update({ balance: payerBalance }).eq('id', payerWalletId);
      console.error('[ScanPay] Failed to credit merchant, rolled back:', creditError);
      return res.status(500).json({ error: 'Failed to process payment' });
    }

    console.log('[ScanPay] Merchant wallet credited:', creditData);

    // 5. Create transaction records
    const transactionRef = `SCAN-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const payerTxExternalId = `tx_payer_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
    const merchantTxExternalId = `tx_merch_${randomUUID().replace(/-/g, '').substring(0, 24)}`;

    // Payer's outgoing transaction - MUST include external_id (NOT NULL constraint)
    const { data: payerTx, error: payerTxError } = await supabase.from('transactions').insert({
      external_id: payerTxExternalId,
      wallet_id: payerWalletId,
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
        paymentMethod: 'scan_to_pay',
        payerId: payerUserId,
        payerName: payerName,
      },
    }).select();

    if (payerTxError) {
      console.error('[ScanPay] Failed to create payer transaction:', JSON.stringify(payerTxError));
    } else {
      console.log('[ScanPay] Payer transaction created:', JSON.stringify(payerTx));
    }

    // Merchant's incoming transaction - MUST include external_id (NOT NULL constraint)
    const { data: merchantTx, error: merchantTxError } = await supabase.from('transactions').insert({
      external_id: merchantTxExternalId,
      wallet_id: merchantWallet.id,
      type: 'PAYMENT_RECEIVED',
      amount: paymentAmount,
      currency: session.currency_code || 'SLE',
      status: 'COMPLETED',
      description: `Payment from ${payerName || 'customer'} (QR Scan)`,
      reference: transactionRef,
      metadata: {
        checkoutSessionId: session.external_id,
        payerId: payerUserId,
        payerName: payerName,
        paymentMethod: 'scan_to_pay',
      },
    }).select();

    if (merchantTxError) {
      console.error('[ScanPay] Failed to create merchant transaction:', JSON.stringify(merchantTxError));
    } else {
      console.log('[ScanPay] Merchant transaction created:', JSON.stringify(merchantTx));
    }

    // 6. Mark session as complete
    const { error: updateError } = await supabase
      .from('checkout_sessions')
      .update({
        status: 'COMPLETE',
        completed_at: new Date().toISOString(),
        metadata: {
          ...(session.metadata || {}),
          paymentMethod: 'scan_to_pay',
          payerId: payerUserId,
          payerName: payerName,
          transactionRef: transactionRef,
        },
      })
      .eq('id', session.id);

    if (updateError) {
      console.error('[ScanPay] Failed to update session:', updateError);
      // Payment already processed, just log the error
    }

    console.log('[ScanPay] Payment successful:', { sessionId, transactionRef, amount: paymentAmount, payer: payerUserId });

    return res.status(200).json({
      success: true,
      status: 'COMPLETE',
      transactionRef,
      amount: paymentAmount,
      currency: session.currency_code || 'SLE',
      merchantName: session.merchant_name,
    });

  } catch (error: any) {
    console.error('[ScanPay] Error:', error);
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
// PUSH NOTIFICATION HANDLERS
// ============================================================================

/**
 * Send push notification to users
 * POST /api/notifications/send
 */
async function handleNotificationSend(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin authorization
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.slice(7);

    // Verify the token and get user info
    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

    if (authError || !user) {
      // Try custom session token (stored in sso_tokens table)
      const { data: ssoSession } = await supabase
        .from('sso_tokens')
        .select('user_id')
        .eq('token', token)
        .in('target_app', ['peeap-pay', 'my'])
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (!ssoSession) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }

      // Get user role
      const { data: userData } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', ssoSession.user_id)
        .single();

      if (!userData || !['admin', 'superadmin'].includes(userData.role)) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      // Process notification
      const { title, body, icon, data: notifData, targetType, targetIds } = req.body;

      if (!title || !body) {
        return res.status(400).json({ error: 'title and body are required' });
      }

      const request: SendNotificationRequest = {
        notification: {
          title,
          body,
          icon: icon || '/icons/icon-192x192.png',
          data: notifData || { type: 'admin_broadcast' },
        },
        role: targetType === 'all' ? 'all' : targetType,
        userIds: targetType === 'specific' ? targetIds : undefined,
      };

      const result = await sendNotification(request);

      // Store notification history
      await storeNotification(userData.id, request, result);

      return res.status(200).json({
        success: true,
        ...result,
      });
    }

    // Check if user is admin (via Supabase auth)
    const { data: userData } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', user.id)
      .single();

    if (!userData || !['admin', 'superadmin'].includes(userData.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    // Process notification
    const { title, body, icon, data: notifData, targetType, targetIds } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'title and body are required' });
    }

    const request: SendNotificationRequest = {
      notification: {
        title,
        body,
        icon: icon || '/icons/icon-192x192.png',
        data: notifData || { type: 'admin_broadcast' },
      },
      role: targetType === 'all' ? 'all' : targetType,
      userIds: targetType === 'specific' ? targetIds : undefined,
    };

    const result = await sendNotification(request);

    // Store notification history
    await storeNotification(userData.id, request, result);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('[NotificationSend] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to send notification' });
  }
}

/**
 * Get notification history
 * GET /api/notifications/history
 */
async function handleNotificationHistory(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = await getNotificationHistory(limit);

    return res.status(200).json({
      success: true,
      notifications: history,
    });
  } catch (error: any) {
    console.error('[NotificationHistory] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch history' });
  }
}

/**
 * Get users with active FCM tokens
 * GET /api/notifications/users
 */
async function handleNotificationUsers(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const users = await getUsersWithTokens();

    return res.status(200).json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error: any) {
    console.error('[NotificationUsers] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch users' });
  }
}

/**
 * Get token statistics
 * GET /api/notifications/stats
 */
async function handleNotificationStats(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const stats = await getTokenStats();

    return res.status(200).json({
      success: true,
      ...stats,
    });
  } catch (error: any) {
    console.error('[NotificationStats] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch stats' });
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
 * Lookup mobile money account holder name (KYC verification)
 * GET /mobile-money/lookup?phoneNumber=XXX&providerId=m17
 */
async function handleMobileMoneyLookup(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const phoneNumber = req.query.phoneNumber as string;
    const providerId = req.query.providerId as string;

    if (!phoneNumber || !providerId) {
      return res.status(400).json({
        error: 'Missing required parameters: phoneNumber and providerId'
      });
    }

    // Normalize phone number (Sierra Leone format)
    const normalizedPhone = phoneNumber.replace(/\s+/g, '').replace(/^(\+232|232|0)/, '');
    if (!/^[0-9]{8}$/.test(normalizedPhone)) {
      return res.status(400).json({
        error: 'Invalid phone number format. Expected 8 digits after country code.'
      });
    }
    const fullPhoneNumber = `+232${normalizedPhone}`;

    // Create Monime service
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // Lookup account holder
    const result = await monimeService.lookupAccountHolder(providerId, fullPhoneNumber);

    return res.status(200).json({
      success: true,
      verified: result.verified,
      accountName: result.accountName || null,
      accountNumber: fullPhoneNumber,
      providerId: result.providerId,
    });
  } catch (error: any) {
    console.error('[MobileMoneyLookup] Error:', error);
    if (error instanceof MonimeError) {
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: error.message || 'Failed to lookup account' });
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
    // Authenticate user from Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify session token from database (or fallback to legacy JWT)
    let authenticatedUserId: string;
    try {
      // First try to verify as a session token from sso_tokens table
      const { data: session, error: sessionError } = await supabase
        .from('sso_tokens')
        .select('user_id, expires_at')
        .eq('token', token)
        .single();

      if (session && !sessionError) {
        // Session token found - check if expired
        if (new Date(session.expires_at) < new Date()) {
          return res.status(401).json({ error: 'Session expired' });
        }
        authenticatedUserId = session.user_id;
      } else {
        // Fallback: try to verify as legacy base64 JWT token (for backwards compatibility)
        try {
          const payload = JSON.parse(atob(token));
          if (!payload.userId || !payload.exp) {
            return res.status(401).json({ error: 'Invalid token format' });
          }
          if (payload.exp < Date.now()) {
            return res.status(401).json({ error: 'Token expired' });
          }
          authenticatedUserId = payload.userId;
        } catch {
          return res.status(401).json({ error: 'Invalid token' });
        }
      }

      // Verify user exists in database
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authenticatedUserId)
        .single();

      if (userError || !user) {
        return res.status(401).json({ error: 'User not found' });
      }
    } catch (tokenError) {
      console.error('[MobileMoneySend] Token verification failed:', tokenError);
      return res.status(401).json({ error: 'Invalid token' });
    }

    const {
      amount,
      currency = 'SLE',
      phoneNumber,
      providerId,
      walletId,
      description,
      pin
    } = req.body;

    // Validate required fields (userId comes from authenticated token, not request body)
    if (!amount || !phoneNumber || !providerId || !walletId) {
      return res.status(400).json({
        error: 'Missing required fields: amount, phoneNumber, providerId, walletId'
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

    // Get user's wallet and verify balance (using authenticated user ID, not client-provided)
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, currency, user_id, status')
      .eq('id', walletId)
      .eq('user_id', authenticatedUserId)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ error: 'Wallet not found or access denied' });
    }

    if (wallet.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }

    // Get fee settings from payment_settings
    const { data: feeSettings } = await supabase
      .from('payment_settings')
      .select('withdrawal_fee_percent, withdrawal_fee_flat')
      .eq('id', SETTINGS_ID)
      .single();

    // Calculate fee from settings (default to 2% if not set)
    const feePercent = parseFloat(feeSettings?.withdrawal_fee_percent?.toString() || '2');
    const feeFlat = parseFloat(feeSettings?.withdrawal_fee_flat?.toString() || '0');
    const percentFee = amount * (feePercent / 100);
    let platformFee = Math.round((percentFee + feeFlat) * 100) / 100;
    const totalDeduction = amount + platformFee;

    // Check user has enough balance for amount + fee
    if (wallet.balance < totalDeduction) {
      return res.status(400).json({
        error: 'Insufficient balance',
        message: `You need NLe ${totalDeduction.toFixed(2)} (amount + ${feePercent}% fee) but have NLe ${wallet.balance.toFixed(2)}`,
        required: totalDeduction,
        available: wallet.balance,
        fee: platformFee,
      });
    }

    console.log('[MobileMoneySend] Processing:', {
      walletBalance: wallet.balance,
      amountToSend: amount,
      platformFee,
      totalDeduction,
    });

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
        user_id: authenticatedUserId,
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

    // Deduct from user's wallet (amount + fee)
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
        userId: authenticatedUserId,
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

      // Debit system float - money going out via mobile money
      try {
        await supabase.rpc('debit_system_float', {
          p_currency: currency,
          p_amount: amount,
          p_transaction_id: transaction.id,
          p_description: `Mobile Money Payout to ${fullPhoneNumber}`,
        });
        console.log('[MobileMoneySend] System float debited:', { amount, currency });
      } catch (floatErr) {
        console.error('[MobileMoneySend] Failed to debit system float:', floatErr);
      }

      // Record platform earning from withdrawal fee
      if (platformFee > 0) {
        try {
          await supabase.from('platform_earnings').insert({
            earning_type: 'withdrawal_fee',
            source_type: 'user',
            source_id: authenticatedUserId,
            transaction_id: transaction.id,
            amount: platformFee,
            currency: currency,
            description: `Mobile money send fee (${feePercent}%${feeFlat > 0 ? ` + NLe ${feeFlat}` : ''})`,
            metadata: {
              payout_id: payoutResult.payoutId,
              principal_amount: amount,
              recipient_phone: fullPhoneNumber,
            }
          });
          console.log('[MobileMoneySend] Platform earning recorded:', { platformFee, currency });
        } catch (earningErr) {
          console.error('[MobileMoneySend] Failed to record platform earning:', earningErr);
        }
      }

      // Insert into payouts table for Float dashboard tracking
      try {
        await supabase.from('payouts').insert({
          external_id: externalId,
          user_id: authenticatedUserId,
          wallet_id: walletId,
          payout_type: 'USER_CASHOUT',
          amount: amount,
          fee: platformFee,
          total_deduction: totalDeduction,
          currency: currency,
          destination_type: 'momo',
          provider_id: providerId,
          provider_name: providerId === 'm17' ? 'Orange Money' : providerId === 'm18' ? 'Africell Money' : 'Mobile Money',
          account_number: fullPhoneNumber,
          status: payoutResult.status === 'completed' ? 'COMPLETED' : 'PROCESSING',
          monime_payout_id: payoutResult.payoutId,
          monime_status: payoutResult.status,
          description: description || `Send to mobile money`,
        });
        console.log('[MobileMoneySend] Payout record created');
      } catch (payoutErr) {
        console.error('[MobileMoneySend] Failed to create payout record:', payoutErr);
      }

      // Get user info for notifications
      const { data: userData } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', authenticatedUserId)
        .single();

      const userName = userData ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || userData.email : 'A user';

      // Create user notification
      await supabase.from('user_notifications').insert({
        user_id: authenticatedUserId,
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

      // Create admin notification
      try {
        await supabase.from('admin_notifications').insert({
          type: 'payout',
          title: 'Mobile Money Send',
          message: `${userName} sent ${currency} ${amount.toLocaleString()} to ${providerId === 'm17' ? 'Orange Money' : 'Mobile Money'} ${phoneNumber}`,
          priority: 'medium',
          related_entity_type: 'transaction',
          related_entity_id: transaction.id,
          action_url: `/admin/transactions?id=${transaction.id}`,
          metadata: {
            transaction_id: transaction.id,
            user_id: authenticatedUserId,
            amount,
            fee: platformFee,
            phone_number: fullPhoneNumber,
            provider: providerId,
          },
        });
        console.log('[MobileMoneySend] Admin notification created');
      } catch (adminNotifErr) {
        console.error('[MobileMoneySend] Failed to create admin notification:', adminNotifErr);
      }

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

// ============================================================================
// MONIME ANALYTICS HANDLERS
// ============================================================================

/**
 * Get Monime analytics - fetches real transaction data from Monime API
 * This pulls data directly from Monime's financial transactions endpoint
 */
async function handleMonimeAnalytics(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Calculate date ranges
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    // =========================================================================
    // PART 1: Fetch Monime gateway transactions (Mobile Money)
    // =========================================================================
    let monimeCredits: any[] = [];
    let monimeDebits: any[] = [];

    const { data: settings } = await supabase
      .from('payment_settings')
      .select('monime_access_token, monime_space_id, monime_source_account_id')
      .eq('id', SETTINGS_ID)
      .single();

    if (settings?.monime_access_token && settings?.monime_space_id) {
      const { monime_access_token, monime_space_id, monime_source_account_id } = settings;

      try {
        const [creditsResponse, debitsResponse] = await Promise.all([
          fetch(`https://api.monime.io/v1/financial-transactions?type=credit&limit=50${monime_source_account_id ? `&financialAccountId=${monime_source_account_id}` : ''}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${monime_access_token}`,
              'Monime-Space-Id': monime_space_id,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`https://api.monime.io/v1/financial-transactions?type=debit&limit=50${monime_source_account_id ? `&financialAccountId=${monime_source_account_id}` : ''}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${monime_access_token}`,
              'Monime-Space-Id': monime_space_id,
              'Content-Type': 'application/json',
            },
          }),
        ]);

        if (creditsResponse.ok) {
          const creditsData = await creditsResponse.json() as any;
          monimeCredits = creditsData.result || [];
        }
        if (debitsResponse.ok) {
          const debitsData = await debitsResponse.json() as any;
          monimeDebits = debitsData.result || [];
        }
      } catch (monimeError) {
        console.error('[Analytics] Monime fetch error (continuing with local data):', monimeError);
      }
    }

    // =========================================================================
    // PART 2: Fetch local transactions (QR, Card, all Peeap transactions)
    // =========================================================================
    const { data: localTransactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (txError) {
      console.error('[Analytics] Local transactions fetch error:', txError);
    }

    const localTxns = localTransactions || [];

    // Categorize local transactions
    // Inflows: PAYMENT_RECEIVED, DEPOSIT, TRANSFER_IN, TOP_UP
    // Outflows: PAYMENT_SENT, WITHDRAWAL, TRANSFER_OUT, PAYOUT
    const inflowTypes = ['PAYMENT_RECEIVED', 'DEPOSIT', 'TRANSFER_IN', 'TOP_UP', 'CREDIT'];
    const outflowTypes = ['PAYMENT_SENT', 'WITHDRAWAL', 'TRANSFER_OUT', 'PAYOUT', 'DEBIT'];

    const localInflows = localTxns.filter(t =>
      inflowTypes.includes(t.type) || (t.amount > 0 && t.type === 'PAYMENT')
    );
    const localOutflows = localTxns.filter(t =>
      outflowTypes.includes(t.type) || (t.amount < 0)
    );

    // =========================================================================
    // PART 3: Helper functions
    // =========================================================================
    const filterByDate = (txns: any[], startDate: string, isLocal: boolean = false) => {
      return txns.filter(t => {
        const timestamp = isLocal ? t.created_at : (t.createTime || t.timestamp);
        return timestamp && timestamp >= startDate;
      });
    };

    const sumMonimeAmount = (txns: any[]) => {
      return txns.reduce((sum, t) => sum + (t.amount?.value || 0), 0);
    };

    const sumLocalAmount = (txns: any[]) => {
      return txns.reduce((sum, t) => sum + Math.abs(Number(t.amount) || 0), 0);
    };

    // =========================================================================
    // PART 4: Calculate combined totals
    // =========================================================================

    // Monime totals
    const monimeTotalInflows = sumMonimeAmount(monimeCredits);
    const monimeTotalOutflows = sumMonimeAmount(monimeDebits);
    const monimeTodayInflows = sumMonimeAmount(filterByDate(monimeCredits, todayStart));
    const monimeTodayOutflows = sumMonimeAmount(filterByDate(monimeDebits, todayStart));
    const monimeWeekInflows = sumMonimeAmount(filterByDate(monimeCredits, weekStart));
    const monimeWeekOutflows = sumMonimeAmount(filterByDate(monimeDebits, weekStart));
    const monimeMonthInflows = sumMonimeAmount(filterByDate(monimeCredits, monthStart));
    const monimeMonthOutflows = sumMonimeAmount(filterByDate(monimeDebits, monthStart));

    // Local totals
    const localTotalInflows = sumLocalAmount(localInflows);
    const localTotalOutflows = sumLocalAmount(localOutflows);
    const localTodayInflows = sumLocalAmount(filterByDate(localInflows, todayStart, true));
    const localTodayOutflows = sumLocalAmount(filterByDate(localOutflows, todayStart, true));
    const localWeekInflows = sumLocalAmount(filterByDate(localInflows, weekStart, true));
    const localWeekOutflows = sumLocalAmount(filterByDate(localOutflows, weekStart, true));
    const localMonthInflows = sumLocalAmount(filterByDate(localInflows, monthStart, true));
    const localMonthOutflows = sumLocalAmount(filterByDate(localOutflows, monthStart, true));

    // Combined totals
    const totalInflows = monimeTotalInflows + localTotalInflows;
    const totalOutflows = monimeTotalOutflows + localTotalOutflows;
    const todayInflows = monimeTodayInflows + localTodayInflows;
    const todayOutflows = monimeTodayOutflows + localTodayOutflows;
    const weekInflows = monimeWeekInflows + localWeekInflows;
    const weekOutflows = monimeWeekOutflows + localWeekOutflows;
    const monthInflows = monimeMonthInflows + localMonthInflows;
    const monthOutflows = monimeMonthOutflows + localMonthOutflows;

    // Combined counts
    const todayInflowCount = filterByDate(monimeCredits, todayStart).length + filterByDate(localInflows, todayStart, true).length;
    const todayOutflowCount = filterByDate(monimeDebits, todayStart).length + filterByDate(localOutflows, todayStart, true).length;
    const weekInflowCount = filterByDate(monimeCredits, weekStart).length + filterByDate(localInflows, weekStart, true).length;
    const weekOutflowCount = filterByDate(monimeDebits, weekStart).length + filterByDate(localOutflows, weekStart, true).length;
    const monthInflowCount = filterByDate(monimeCredits, monthStart).length + filterByDate(localInflows, monthStart, true).length;
    const monthOutflowCount = filterByDate(monimeDebits, monthStart).length + filterByDate(localOutflows, monthStart, true).length;
    const totalInflowCount = monimeCredits.length + localInflows.length;
    const totalOutflowCount = monimeDebits.length + localOutflows.length;

    // =========================================================================
    // PART 5: Build combined recent transactions list
    // =========================================================================
    const normalizedMonimeTxns = [...monimeCredits, ...monimeDebits].map(t => ({
      id: t.id,
      type: t.type === 'credit' ? 'credit' : 'debit',
      amount: t.amount,
      reference: t.reference,
      timestamp: t.createTime || t.timestamp,
      source: 'monime',
      paymentMethod: 'mobile_money',
      description: t.description || 'Mobile Money Transaction',
    }));

    const normalizedLocalTxns = localTxns.slice(0, 50).map(t => ({
      id: t.id || t.external_id,
      type: inflowTypes.includes(t.type) || t.amount > 0 ? 'credit' : 'debit',
      amount: {
        currency: t.currency || 'SLE',
        value: Math.abs(Number(t.amount) || 0),
      },
      reference: t.reference || t.external_id,
      timestamp: t.created_at,
      source: 'peeap',
      paymentMethod: t.metadata?.paymentMethod || (t.description?.includes('QR') || t.description?.includes('Scan') ? 'qr_scan' : (t.description?.includes('Card') ? 'card' : 'internal')),
      description: t.description || t.type,
    }));

    const allRecentTransactions = [...normalizedMonimeTxns, ...normalizedLocalTxns]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    // =========================================================================
    // PART 6: Return combined response
    // =========================================================================
    return res.status(200).json({
      success: true,
      currency: 'SLE',
      summary: {
        today: {
          totalDeposits: todayInflows,
          totalWithdrawals: todayOutflows,
          depositCount: todayInflowCount,
          withdrawalCount: todayOutflowCount,
          netFlow: todayInflows - todayOutflows,
        },
        thisWeek: {
          totalDeposits: weekInflows,
          totalWithdrawals: weekOutflows,
          depositCount: weekInflowCount,
          withdrawalCount: weekOutflowCount,
          netFlow: weekInflows - weekOutflows,
        },
        thisMonth: {
          totalDeposits: monthInflows,
          totalWithdrawals: monthOutflows,
          depositCount: monthInflowCount,
          withdrawalCount: monthOutflowCount,
          netFlow: monthInflows - monthOutflows,
        },
        allTime: {
          totalDeposits: totalInflows,
          totalWithdrawals: totalOutflows,
          depositCount: totalInflowCount,
          withdrawalCount: totalOutflowCount,
          netFlow: totalInflows - totalOutflows,
        },
      },
      // Breakdown by source
      breakdown: {
        monime: {
          inflows: monimeTotalInflows,
          outflows: monimeTotalOutflows,
          count: monimeCredits.length + monimeDebits.length,
        },
        peeap: {
          inflows: localTotalInflows,
          outflows: localTotalOutflows,
          count: localTxns.length,
        },
      },
      recentTransactions: allRecentTransactions,
    });
  } catch (error: any) {
    console.error('[Analytics] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch analytics' });
  }
}

/**
 * Get Monime transactions - fetches raw transaction list from Monime API
 */
async function handleMonimeTransactions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const type = url.searchParams.get('type') || ''; // credit or debit
    const limit = url.searchParams.get('limit') || '50';
    const after = url.searchParams.get('after') || '';

    // Get Monime credentials from settings
    const { data: settings, error: settingsError } = await supabase
      .from('payment_settings')
      .select('monime_access_token, monime_space_id, monime_source_account_id')
      .eq('id', SETTINGS_ID)
      .single();

    if (settingsError || !settings?.monime_access_token || !settings?.monime_space_id) {
      return res.status(400).json({ error: 'Monime credentials not configured' });
    }

    const { monime_access_token, monime_space_id, monime_source_account_id } = settings;

    // Build query params
    let queryParams = `limit=${limit}`;
    if (type) queryParams += `&type=${type}`;
    if (after) queryParams += `&after=${after}`;
    if (monime_source_account_id) queryParams += `&financialAccountId=${monime_source_account_id}`;

    // Fetch financial transactions from Monime API
    const response = await fetch(`https://api.monime.io/v1/financial-transactions?${queryParams}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${monime_access_token}`,
        'Monime-Space-Id': monime_space_id,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json() as any;

    if (!response.ok) {
      console.error('[MonimeTransactions] Fetch error:', data);
      return res.status(response.status).json({ error: data.error?.message || 'Failed to fetch transactions' });
    }

    return res.status(200).json({
      success: true,
      transactions: data.result || [],
      pagination: data.pagination || { count: 0, next: null },
    });
  } catch (error: any) {
    console.error('[MonimeTransactions] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch Monime transactions' });
  }
}

// ============================================================================
// PAYOUT HANDLERS
// ============================================================================

/**
 * Get list of payouts (for user or merchant)
 */
async function handlePayouts(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const userId = url.searchParams.get('userId');
    const merchantId = url.searchParams.get('merchantId');
    const status = url.searchParams.get('status');
    const payoutType = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    if (!userId && !merchantId) {
      return res.status(400).json({ error: 'userId or merchantId is required' });
    }

    let query = supabase
      .from('payouts')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (userId) query = query.eq('user_id', userId);
    if (merchantId) query = query.eq('merchant_id', merchantId);
    if (status) query = query.eq('status', status.toUpperCase());
    if (payoutType) query = query.eq('payout_type', payoutType.toUpperCase());

    const { data: payouts, error, count } = await query;

    if (error) {
      console.error('[Payouts] List error:', error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      payouts: payouts || [],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[Payouts] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get payouts' });
  }
}

/**
 * Get payout by ID
 */
async function handlePayoutById(req: VercelRequest, res: VercelResponse, payoutId: string) {
  try {
    if (req.method === 'GET') {
      // Get payout details
      const { data: payout, error } = await supabase
        .from('payouts')
        .select('*')
        .or(`external_id.eq.${payoutId},id.eq.${payoutId}`)
        .single();

      if (error || !payout) {
        return res.status(404).json({ error: 'Payout not found' });
      }

      // If payout is still processing, check Monime status
      if (payout.monime_payout_id && (payout.status === 'PROCESSING' || payout.status === 'PENDING')) {
        try {
          const monimeService = await createMonimeService(supabase, SETTINGS_ID);
          const monimeStatus = await monimeService.getPayoutStatus(payout.monime_payout_id);

          if (monimeStatus.status !== payout.monime_status) {
            const newStatus = monimeStatus.status === 'completed' ? 'COMPLETED' :
                             monimeStatus.status === 'failed' ? 'FAILED' : 'PROCESSING';

            const updateData: any = {
              status: newStatus,
              monime_status: monimeStatus.status,
            };

            if (newStatus === 'COMPLETED') {
              updateData.completed_at = new Date().toISOString();
            } else if (newStatus === 'FAILED') {
              updateData.failed_at = new Date().toISOString();
              updateData.failure_message = monimeStatus.failureReason;
            }

            await supabase.from('payouts').update(updateData).eq('id', payout.id);
            Object.assign(payout, updateData);
          }
        } catch (e) {
          console.error('[Payout] Status check error:', e);
        }
      }

      return res.status(200).json(payout);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('[PayoutById] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to get payout' });
  }
}

/**
 * User cashout - withdraw from wallet to mobile money or bank
 */
async function handleUserCashout(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      userId,
      walletId,
      amount,
      currency = 'SLE',
      destinationType, // 'momo' or 'bank'
      providerId,
      accountNumber,
      accountName,
      description,
      pin,
    } = req.body;

    // Validate required fields
    if (!userId || !walletId || !amount || !destinationType || !providerId || !accountNumber) {
      return res.status(400).json({
        error: 'Missing required fields: userId, walletId, amount, destinationType, providerId, accountNumber',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    if (!['momo', 'bank'].includes(destinationType)) {
      return res.status(400).json({ error: 'destinationType must be "momo" or "bank"' });
    }

    // Normalize phone number for momo
    let normalizedAccountNumber = accountNumber;
    if (destinationType === 'momo') {
      normalizedAccountNumber = accountNumber.replace(/\s+/g, '').replace(/^(\+232|232)/, '');
      if (!/^[0-9]{8}$/.test(normalizedAccountNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format. Expected 8 digits.' });
      }
      normalizedAccountNumber = `+232${normalizedAccountNumber}`;
    }

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

    // Get payout settings
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single();

    // Calculate fee - New Leone (Le) after redenomination
    // 2% fee only (no flat fee) - amounts are in new Leone
    const feePercent = settings?.withdrawal_fee_percent || 2;
    const minAmount = settings?.min_withdrawal_amount || 1; // 1 Le minimum
    const maxAmount = settings?.max_withdrawal_amount || 50000; // 50,000 Le maximum

    if (amount < minAmount) {
      return res.status(400).json({ error: `Minimum withdrawal amount is Le ${minAmount}` });
    }

    if (amount > maxAmount) {
      return res.status(400).json({ error: `Maximum withdrawal amount is Le ${maxAmount}` });
    }

    let fee = Math.round(amount * (feePercent / 100) * 100) / 100; // 2% fee, rounded to 2 decimal places
    const totalDeduction = amount + fee;

    if (wallet.balance < totalDeduction) {
      return res.status(400).json({
        error: 'Insufficient balance',
        required: totalDeduction,
        available: wallet.balance,
        fee,
      });
    }

    // Create Monime service
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // Get financial accounts
    const financialAccounts = await monimeService.getFinancialAccounts();
    const sourceAccount = financialAccounts.find(a => a.currency === currency) || financialAccounts[0];

    if (!sourceAccount) {
      return res.status(500).json({ error: 'No financial account configured for payouts' });
    }

    // Get provider name
    let providerName = providerId;
    if (destinationType === 'momo') {
      const providers = await monimeService.getMobileMoneyProviders();
      const provider = providers.find(p => p.providerId === providerId);
      if (provider) providerName = provider.name;
    } else {
      const banks = await monimeService.getBanks();
      const bank = banks.find((b: any) => b.providerId === providerId);
      if (bank) providerName = bank.name;
    }

    // Generate payout ID
    const externalId = `payout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        external_id: externalId,
        user_id: userId,
        wallet_id: walletId,
        payout_type: 'USER_CASHOUT',
        amount,
        fee,
        total_deduction: totalDeduction,
        currency,
        destination_type: destinationType,
        provider_id: providerId,
        provider_name: providerName,
        account_number: normalizedAccountNumber,
        account_name: accountName,
        status: 'PROCESSING',
        description: description || `Cashout to ${providerName}`,
        metadata: { initiated_by: 'user' },
      })
      .select()
      .single();

    if (payoutError) {
      console.error('[UserCashout] Payout create error:', payoutError);
      return res.status(500).json({ error: 'Failed to create payout record' });
    }

    // Deduct from wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        balance: wallet.balance - totalDeduction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', walletId);

    if (deductError) {
      await supabase.from('payouts').update({ status: 'FAILED', failure_message: 'Wallet deduction failed' }).eq('id', payout.id);
      return res.status(500).json({ error: 'Failed to deduct from wallet' });
    }

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: userId,
      wallet_id: walletId,
      type: 'CASHOUT',
      amount: -totalDeduction,
      currency,
      status: 'PROCESSING',
      description: description || `Cashout to ${providerName} ${accountNumber}`,
      reference: externalId,
      metadata: {
        payout_id: payout.id,
        destination_type: destinationType,
        provider_id: providerId,
        account_number: normalizedAccountNumber,
        principal_amount: amount,
        fee,
      },
    });

    try {
      // Create payout via Monime
      // For momo: use phoneNumber, for bank: use accountNumber
      const destination: any = {
        type: destinationType,
        providerId,
      };
      if (destinationType === 'momo') {
        destination.phoneNumber = normalizedAccountNumber;
      } else {
        destination.accountNumber = normalizedAccountNumber;
      }

      const monimeResult = await monimeService.createPayout({
        amount: {
          currency,
          value: Math.round(amount * 100), // Monime uses minor units
        },
        destination,
        source: {
          financialAccountId: sourceAccount.id,
        },
        metadata: {
          peeap_payout_id: externalId,
          user_id: userId,
          payout_type: 'USER_CASHOUT',
        },
      });

      // Update payout with Monime response
      const updateData: any = {
        monime_payout_id: monimeResult.result?.id,
        monime_status: monimeResult.result?.status,
        monime_fees: monimeResult.result?.fees,
      };

      if (monimeResult.result?.status === 'completed') {
        updateData.status = 'COMPLETED';
        updateData.completed_at = new Date().toISOString();
      } else if (monimeResult.result?.status === 'failed') {
        updateData.status = 'FAILED';
        updateData.failed_at = new Date().toISOString();
        updateData.failure_code = monimeResult.result?.failureDetail?.code;
        updateData.failure_message = monimeResult.result?.failureDetail?.message;

        // Refund wallet
        await supabase.from('wallets').update({ balance: wallet.balance }).eq('id', walletId);
      }

      await supabase.from('payouts').update(updateData).eq('id', payout.id);

      // Update transaction status
      await supabase
        .from('transactions')
        .update({
          status: updateData.status === 'COMPLETED' ? 'COMPLETED' : updateData.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
          metadata: {
            payout_id: payout.id,
            monime_payout_id: monimeResult.result?.id,
            monime_status: monimeResult.result?.status,
          },
        })
        .eq('reference', externalId);

      // Debit system float when payout is completed (money going out via mobile money)
      if (updateData.status === 'COMPLETED') {
        try {
          await supabase.rpc('debit_system_float', {
            p_currency: currency,
            p_amount: amount,
            p_transaction_id: payout.id,
            p_description: `Mobile Money Payout - ${providerName} - ${normalizedAccountNumber}`,
          });
          console.log('[UserCashout] System float debited:', { amount, currency });
        } catch (floatErr) {
          console.error('[UserCashout] Failed to debit system float:', floatErr);
          // Don't fail the payout if float update fails
        }

        // Record platform earning from withdrawal fee
        if (fee > 0) {
          try {
            await supabase.from('platform_earnings').insert({
              earning_type: 'withdrawal_fee',
              source_type: 'user',
              source_id: userId,
              transaction_id: payout.id,
              amount: fee,
              currency: currency,
              description: `User cashout fee (${feePercent}%)`,
              metadata: {
                payout_id: payout.id,
                principal_amount: amount,
              }
            });
            console.log('[UserCashout] Platform earning recorded:', { fee, currency });
          } catch (earningErr) {
            console.error('[UserCashout] Failed to record platform earning:', earningErr);
          }
        }
      }

      // Create notification
      await supabase.from('user_notifications').insert({
        user_id: userId,
        type: 'cashout',
        title: 'Cashout Initiated',
        message: `Your cashout of ${currency} ${amount.toLocaleString()} to ${providerName} is being processed.`,
        read: false,
        metadata: {
          payout_id: payout.id,
          amount,
          fee,
          destination: normalizedAccountNumber,
        },
      });

      // Create admin notification for the cashout
      try {
        const { data: userData } = await supabase
          .from('users')
          .select('first_name, last_name, phone')
          .eq('id', userId)
          .single();
        const userName = userData?.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : userData?.phone || 'Unknown User';

        await supabase.from('admin_notifications').insert({
          type: 'payout',
          title: 'User Cashout Request',
          message: `${userName} requested cashout of ${currency} ${amount.toLocaleString()} to ${providerName}`,
          priority: amount >= 10000 ? 'high' : 'medium',
          related_entity_type: 'payout',
          related_entity_id: payout.id,
          action_url: `/admin/payouts?id=${payout.id}`,
          metadata: {
            userId,
            userName,
            amount,
            fee,
            currency,
            destination: normalizedAccountNumber,
            provider: providerName,
          },
        });
        console.log('[UserCashout] Admin notification created');
      } catch (adminNotifErr) {
        console.error('[UserCashout] Failed to create admin notification:', adminNotifErr);
      }

      return res.status(200).json({
        success: true,
        payoutId: externalId,
        monimePayoutId: monimeResult.result?.id,
        status: updateData.status || 'PROCESSING',
        amount,
        fee,
        totalDeducted: totalDeduction,
        destination: {
          type: destinationType,
          provider: providerName,
          accountNumber: normalizedAccountNumber,
        },
      });
    } catch (monimeError: any) {
      console.error('[UserCashout] Monime error:', monimeError);

      // Refund wallet
      await supabase.from('wallets').update({ balance: wallet.balance }).eq('id', walletId);

      // Update payout and transaction as failed
      await supabase
        .from('payouts')
        .update({
          status: 'FAILED',
          failed_at: new Date().toISOString(),
          failure_message: monimeError.message,
        })
        .eq('id', payout.id);

      await supabase
        .from('transactions')
        .update({ status: 'FAILED' })
        .eq('reference', externalId);

      if (monimeError instanceof MonimeError) {
        return res.status(monimeError.statusCode).json({ error: monimeError.message, code: monimeError.code });
      }
      return res.status(500).json({ error: monimeError.message || 'Payout failed' });
    }
  } catch (error: any) {
    console.error('[UserCashout] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process cashout' });
  }
}

/**
 * Merchant withdraw - withdraw funds from merchant wallet to bank or mobile money
 */
async function handleMerchantWithdraw(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      merchantId,
      userId, // Merchant owner user ID
      amount,
      currency = 'SLE',
      destinationType, // 'momo' or 'bank'
      providerId,
      accountNumber,
      accountName,
      description,
    } = req.body;

    // Validate required fields
    if (!merchantId || !userId || !amount || !destinationType || !providerId || !accountNumber) {
      return res.status(400).json({
        error: 'Missing required fields: merchantId, userId, amount, destinationType, providerId, accountNumber',
      });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be greater than 0' });
    }

    // Verify merchant ownership
    const { data: merchant, error: merchantError } = await supabase
      .from('merchant_businesses')
      .select('id, business_name, merchant_id')
      .eq('id', merchantId)
      .eq('merchant_id', userId)
      .single();

    if (merchantError || !merchant) {
      return res.status(403).json({ error: 'Unauthorized: You do not own this merchant' });
    }

    // Normalize account number for momo
    let normalizedAccountNumber = accountNumber;
    if (destinationType === 'momo') {
      normalizedAccountNumber = accountNumber.replace(/\s+/g, '').replace(/^(\+232|232)/, '');
      if (!/^[0-9]{8}$/.test(normalizedAccountNumber)) {
        return res.status(400).json({ error: 'Invalid phone number format. Expected 8 digits.' });
      }
      normalizedAccountNumber = `+232${normalizedAccountNumber}`;
    }

    // Get merchant's wallet
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, currency, user_id, status')
      .eq('user_id', userId)
      .eq('currency', currency)
      .single();

    if (walletError || !wallet) {
      return res.status(404).json({ error: 'Merchant wallet not found' });
    }

    if (wallet.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Wallet is not active' });
    }

    // Get payout settings
    const { data: settings } = await supabase
      .from('payment_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single();

    // Calculate fee (merchant withdrawal may have different rates)
    const feePercent = settings?.withdrawal_fee_percent || 1.0;
    const feeFlat = settings?.withdrawal_fee_flat || 0;
    const minAmount = settings?.min_withdrawal_amount || 5000;
    const maxAmount = settings?.max_withdrawal_amount || 100000000;

    if (amount < minAmount) {
      return res.status(400).json({ error: `Minimum withdrawal amount is ${currency} ${minAmount}` });
    }

    if (amount > maxAmount) {
      return res.status(400).json({ error: `Maximum withdrawal amount is ${currency} ${maxAmount}` });
    }

    let fee = Math.round(amount * (feePercent / 100)) + feeFlat;
    const totalDeduction = amount + fee;

    if (wallet.balance < totalDeduction) {
      return res.status(400).json({
        error: 'Insufficient balance',
        required: totalDeduction,
        available: wallet.balance,
        fee,
      });
    }

    // Create Monime service
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);

    // Get financial accounts
    const financialAccounts = await monimeService.getFinancialAccounts();
    const sourceAccount = financialAccounts.find(a => a.currency === currency) || financialAccounts[0];

    if (!sourceAccount) {
      return res.status(500).json({ error: 'No financial account configured for payouts' });
    }

    // Get provider name
    let providerName = providerId;
    if (destinationType === 'momo') {
      const providers = await monimeService.getMobileMoneyProviders();
      const provider = providers.find(p => p.providerId === providerId);
      if (provider) providerName = provider.name;
    } else {
      const banks = await monimeService.getBanks();
      const bank = banks.find((b: any) => b.providerId === providerId);
      if (bank) providerName = bank.name;
    }

    // Generate payout ID
    const externalId = `payout_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create payout record
    const { data: payout, error: payoutError } = await supabase
      .from('payouts')
      .insert({
        external_id: externalId,
        user_id: userId,
        wallet_id: wallet.id,
        merchant_id: merchantId,
        payout_type: 'MERCHANT_WITHDRAWAL',
        amount,
        fee,
        total_deduction: totalDeduction,
        currency,
        destination_type: destinationType,
        provider_id: providerId,
        provider_name: providerName,
        account_number: normalizedAccountNumber,
        account_name: accountName || merchant.business_name,
        status: 'PROCESSING',
        description: description || `${merchant.business_name} withdrawal to ${providerName}`,
        metadata: { merchant_name: merchant.business_name },
      })
      .select()
      .single();

    if (payoutError) {
      console.error('[MerchantWithdraw] Payout create error:', payoutError);
      return res.status(500).json({ error: 'Failed to create payout record' });
    }

    // Deduct from wallet
    const { error: deductError } = await supabase
      .from('wallets')
      .update({
        balance: wallet.balance - totalDeduction,
        updated_at: new Date().toISOString(),
      })
      .eq('id', wallet.id);

    if (deductError) {
      await supabase.from('payouts').update({ status: 'FAILED', failure_message: 'Wallet deduction failed' }).eq('id', payout.id);
      return res.status(500).json({ error: 'Failed to deduct from wallet' });
    }

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: userId,
      wallet_id: wallet.id,
      type: 'MERCHANT_WITHDRAWAL',
      amount: -totalDeduction,
      currency,
      status: 'PROCESSING',
      description: description || `${merchant.business_name} withdrawal to ${providerName}`,
      reference: externalId,
      metadata: {
        payout_id: payout.id,
        merchant_id: merchantId,
        destination_type: destinationType,
        provider_id: providerId,
        account_number: normalizedAccountNumber,
        principal_amount: amount,
        fee,
      },
    });

    try {
      // Create payout via Monime
      // For momo: use phoneNumber, for bank: use accountNumber
      const merchantDestination: any = {
        type: destinationType,
        providerId,
      };
      if (destinationType === 'momo') {
        merchantDestination.phoneNumber = normalizedAccountNumber;
      } else {
        merchantDestination.accountNumber = normalizedAccountNumber;
      }

      const monimeResult = await monimeService.createPayout({
        amount: {
          currency,
          value: Math.round(amount * 100), // Monime uses minor units
        },
        destination: merchantDestination,
        source: {
          financialAccountId: sourceAccount.id,
        },
        metadata: {
          peeap_payout_id: externalId,
          merchant_id: merchantId,
          merchant_name: merchant.business_name,
          payout_type: 'MERCHANT_WITHDRAWAL',
        },
      });

      // Update payout with Monime response
      const updateData: any = {
        monime_payout_id: monimeResult.result?.id,
        monime_status: monimeResult.result?.status,
        monime_fees: monimeResult.result?.fees,
      };

      if (monimeResult.result?.status === 'completed') {
        updateData.status = 'COMPLETED';
        updateData.completed_at = new Date().toISOString();
      } else if (monimeResult.result?.status === 'failed') {
        updateData.status = 'FAILED';
        updateData.failed_at = new Date().toISOString();
        updateData.failure_code = monimeResult.result?.failureDetail?.code;
        updateData.failure_message = monimeResult.result?.failureDetail?.message;

        // Refund wallet
        await supabase.from('wallets').update({ balance: wallet.balance }).eq('id', wallet.id);
      }

      await supabase.from('payouts').update(updateData).eq('id', payout.id);

      // Update transaction status
      await supabase
        .from('transactions')
        .update({
          status: updateData.status === 'COMPLETED' ? 'COMPLETED' : updateData.status === 'FAILED' ? 'FAILED' : 'PROCESSING',
        })
        .eq('reference', externalId);

      // Debit system float when payout is completed (money going out via mobile money)
      if (updateData.status === 'COMPLETED') {
        try {
          await supabase.rpc('debit_system_float', {
            p_currency: currency,
            p_amount: amount,
            p_transaction_id: payout.id,
            p_description: `Merchant Withdrawal - ${merchant.business_name} - ${providerName}`,
          });
          console.log('[MerchantWithdraw] System float debited:', { amount, currency });
        } catch (floatErr) {
          console.error('[MerchantWithdraw] Failed to debit system float:', floatErr);
        }

        // Record platform earning from withdrawal fee
        if (fee > 0) {
          try {
            await supabase.from('platform_earnings').insert({
              earning_type: 'withdrawal_fee',
              source_type: 'merchant',
              source_id: merchantId,
              transaction_id: payout.id,
              amount: fee,
              currency: currency,
              description: `Merchant withdrawal fee (${feePercent}%)`,
              metadata: {
                payout_id: payout.id,
                principal_amount: amount,
                merchant_name: merchant.business_name,
              }
            });
            console.log('[MerchantWithdraw] Platform earning recorded:', { fee, currency });
          } catch (earningErr) {
            console.error('[MerchantWithdraw] Failed to record platform earning:', earningErr);
          }
        }
      }

      // Create notification
      await supabase.from('user_notifications').insert({
        user_id: userId,
        type: 'merchant_withdrawal',
        title: 'Withdrawal Initiated',
        message: `Your ${merchant.business_name} withdrawal of ${currency} ${amount.toLocaleString()} to ${providerName} is being processed.`,
        read: false,
        metadata: {
          payout_id: payout.id,
          merchant_id: merchantId,
          amount,
          fee,
          destination: normalizedAccountNumber,
        },
      });

      return res.status(200).json({
        success: true,
        payoutId: externalId,
        monimePayoutId: monimeResult.result?.id,
        status: updateData.status || 'PROCESSING',
        amount,
        fee,
        totalDeducted: totalDeduction,
        destination: {
          type: destinationType,
          provider: providerName,
          accountNumber: normalizedAccountNumber,
        },
      });
    } catch (monimeError: any) {
      console.error('[MerchantWithdraw] Monime error:', monimeError);

      // Refund wallet
      await supabase.from('wallets').update({ balance: wallet.balance }).eq('id', wallet.id);

      // Update payout and transaction as failed
      await supabase
        .from('payouts')
        .update({
          status: 'FAILED',
          failed_at: new Date().toISOString(),
          failure_message: monimeError.message,
        })
        .eq('id', payout.id);

      await supabase
        .from('transactions')
        .update({ status: 'FAILED' })
        .eq('reference', externalId);

      if (monimeError instanceof MonimeError) {
        return res.status(monimeError.statusCode).json({ error: monimeError.message, code: monimeError.code });
      }
      return res.status(500).json({ error: monimeError.message || 'Withdrawal failed' });
    }
  } catch (error: any) {
    console.error('[MerchantWithdraw] Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to process withdrawal' });
  }
}

/**
 * Get available banks for payout
 */
async function handlePayoutBanks(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const country = url.searchParams.get('country') || 'SL';

    let monimeService;
    try {
      monimeService = await createMonimeService(supabase, SETTINGS_ID);
    } catch (err: any) {
      // If Monime is not configured, return empty banks list
      console.log('[PayoutBanks] Monime not configured, returning empty banks list');
      return res.status(200).json({ banks: [] });
    }

    const banks = await monimeService.getBanks(country);

    return res.status(200).json({
      banks: banks.map((b: any) => ({
        providerId: b.providerId || b.id,
        name: b.name,
        country: b.country,
        status: b.status || { active: true },
        featureSet: b.featureSet || {
          payout: { canPayTo: true },
          payment: { canPayFrom: true },
          kycVerification: { canVerifyAccount: false },
        },
      })),
    });
  } catch (error: any) {
    console.error('[PayoutBanks] Error:', error);
    if (error instanceof MonimeError) {
      // If module is disabled, return empty list instead of error
      if (error.code === 'MODULE_DISABLED') {
        return res.status(200).json({ banks: [] });
      }
      return res.status(error.statusCode).json({ error: error.message, code: error.code });
    }
    return res.status(500).json({ error: error.message || 'Failed to get banks' });
  }
}

// ============================================================================
// OAuth 2.0 HANDLERS - For Third-Party SSO Integration
// ============================================================================

/**
 * Generate a secure random token
 */
function generateSecureToken(length: number = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * PIN Verification Endpoint
 * Verify user's wallet PIN for quick access from school dashboard
 *
 * POST /api/auth/verify-pin
 * Body: { user_id, pin }
 */
async function handleAuthVerifyPin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { user_id, pin } = req.body;

    if (!user_id || !pin) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'user_id and pin are required',
      });
    }

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        error: 'invalid_pin',
        error_description: 'PIN must be 4 digits',
      });
    }

    // Get user and verify PIN
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, roles, transaction_pin')
      .eq('id', user_id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return res.status(404).json({
        error: 'user_not_found',
        error_description: 'User not found',
      });
    }

    const user = users[0];

    // Verify PIN (stored as hashed or plain depending on setup)
    // For now, we'll do a simple comparison - in production, use bcrypt
    if (user.transaction_pin !== pin) {
      return res.status(401).json({
        error: 'invalid_pin',
        error_description: 'Invalid PIN',
      });
    }

    // Generate tokens for the user
    const accessToken = generateSecureToken(64);
    const refreshToken = generateSecureToken(64);
    const expiresIn = 3600; // 1 hour

    // Store the access token in oauth_access_tokens for consistency
    await supabase.from('oauth_access_tokens').insert({
      access_token: accessToken,
      refresh_token: refreshToken,
      client_id: 'school_saas',
      user_id: user.id,
      scope: 'profile email wallet:read school:manage',
      expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
    });

    return res.status(200).json({
      success: true,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
      expires_in: expiresIn,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        phone: user.phone,
        roles: user.roles,
      },
    });
  } catch (error: any) {
    console.error('[Auth Verify PIN] Error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message || 'Internal server error',
    });
  }
}

/**
 * OAuth Token Endpoint
 * Exchange authorization code for access token, or refresh tokens
 *
 * POST /api/oauth/token
 * Body: { grant_type, code, client_id, client_secret, redirect_uri, refresh_token }
 */
async function handleOAuthToken(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const {
      grant_type,
      code,
      client_id,
      client_secret,
      redirect_uri,
      refresh_token,
    } = req.body;

    if (!client_id || !client_secret) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'client_id and client_secret are required',
      });
    }

    // Validate client credentials
    const { data: clients, error: clientError } = await supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', client_id)
      .eq('client_secret', client_secret)
      .eq('is_active', true)
      .limit(1);

    if (clientError || !clients || clients.length === 0) {
      return res.status(401).json({
        error: 'invalid_client',
        error_description: 'Invalid client credentials',
      });
    }

    // Handle different grant types
    if (grant_type === 'authorization_code') {
      if (!code || !redirect_uri) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'code and redirect_uri are required for authorization_code grant',
        });
      }

      // Find and validate the authorization code
      const { data: codes, error: codeError } = await supabase
        .from('oauth_authorization_codes')
        .select('*')
        .eq('code', code)
        .eq('client_id', client_id)
        .eq('redirect_uri', redirect_uri)
        .is('used_at', null)
        .limit(1);

      if (codeError || !codes || codes.length === 0) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid or expired authorization code',
        });
      }

      const authCode = codes[0];

      // Check expiration
      if (new Date(authCode.expires_at) < new Date()) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Authorization code expired',
        });
      }

      // Mark code as used
      await supabase
        .from('oauth_authorization_codes')
        .update({ used_at: new Date().toISOString() })
        .eq('id', authCode.id);

      // Generate access and refresh tokens
      const accessToken = generateSecureToken(64);
      const newRefreshToken = generateSecureToken(64);
      const expiresIn = 3600; // 1 hour

      // Store the access token
      const { error: tokenError } = await supabase.from('oauth_access_tokens').insert({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        client_id: client_id,
        user_id: authCode.user_id,
        scope: authCode.scope,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      if (tokenError) {
        console.error('[OAuth] Token creation error:', tokenError);
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Failed to create access token',
        });
      }

      // Fetch user data for enhanced response (for school integration)
      const { data: userData } = await supabase
        .from('users')
        .select('id, email, phone, first_name, last_name, roles')
        .eq('id', authCode.user_id)
        .limit(1);

      const user = userData?.[0];

      // Fetch wallet data if wallet scopes are requested
      let walletData = null;
      const scopes = authCode.scope.split(' ');
      if (scopes.includes('wallet:read') || scopes.includes('wallet:write')) {
        const { data: wallets } = await supabase
          .from('wallets')
          .select('id, balance, currency, status, daily_limit, daily_spent')
          .eq('user_id', authCode.user_id)
          .eq('type', 'personal')
          .limit(1);

        if (wallets && wallets.length > 0) {
          walletData = {
            wallet_id: wallets[0].id,
            balance: wallets[0].balance || 0,
            currency: wallets[0].currency || 'NLE',
            status: wallets[0].status || 'active',
            daily_limit: wallets[0].daily_limit || 100,
            daily_spent: wallets[0].daily_spent || 0,
          };
        }
      }

      // Build response with user and wallet data
      const response: Record<string, any> = {
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: newRefreshToken,
        scope: authCode.scope,
      };

      // Add user data
      if (user) {
        response.user = {
          peeap_id: user.id,
          email: user.email,
          phone: user.phone,
          name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
          is_new_account: false,
        };
      }

      // Add wallet data if available
      if (walletData) {
        response.wallet = walletData;
      }

      // Add link info from authorization code metadata if present
      if (authCode.metadata) {
        try {
          const metadata = typeof authCode.metadata === 'string'
            ? JSON.parse(authCode.metadata)
            : authCode.metadata;
          if (metadata.index_number || metadata.school_id) {
            response.link = {
              index_number: metadata.index_number,
              school_id: metadata.school_id,
              linked_at: new Date().toISOString(),
            };
          }
          // For school admin connection
          if (metadata.user_type === 'admin') {
            response.school_connection = {
              peeap_school_id: `sch_${authCode.user_id.substring(0, 8)}`,
              connected_by: response.user,
              connected_at: new Date().toISOString(),
              status: 'active',
            };
          }
        } catch (e) {
          // Ignore metadata parsing errors
        }
      }

      return res.status(200).json(response);

    } else if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'refresh_token is required',
        });
      }

      // Find the refresh token
      const { data: tokens, error: tokenError } = await supabase
        .from('oauth_access_tokens')
        .select('*')
        .eq('refresh_token', refresh_token)
        .eq('client_id', client_id)
        .is('revoked_at', null)
        .limit(1);

      if (tokenError || !tokens || tokens.length === 0) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'Invalid refresh token',
        });
      }

      const oldToken = tokens[0];

      // Revoke old token
      await supabase
        .from('oauth_access_tokens')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', oldToken.id);

      // Generate new tokens
      const accessToken = generateSecureToken(64);
      const newRefreshToken = generateSecureToken(64);
      const expiresIn = 3600;

      // Store new token
      const { error: newTokenError } = await supabase.from('oauth_access_tokens').insert({
        access_token: accessToken,
        refresh_token: newRefreshToken,
        client_id: client_id,
        user_id: oldToken.user_id,
        scope: oldToken.scope,
        expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      });

      if (newTokenError) {
        return res.status(500).json({
          error: 'server_error',
          error_description: 'Failed to refresh token',
        });
      }

      return res.status(200).json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: expiresIn,
        refresh_token: newRefreshToken,
        scope: oldToken.scope,
      });

    } else {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Only authorization_code and refresh_token grants are supported',
      });
    }
  } catch (error: any) {
    console.error('[OAuth Token] Error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message || 'Internal server error',
    });
  }
}

/**
 * OAuth UserInfo Endpoint
 * Returns user profile information for the authenticated token
 *
 * GET /api/oauth/userinfo
 * Headers: Authorization: Bearer <access_token>
 */
async function handleOAuthUserinfo(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    // Extract access token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Missing or invalid authorization header',
      });
    }

    const accessToken = authHeader.substring(7);

    // Validate access token
    const { data: tokens, error: tokenError } = await supabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('access_token', accessToken)
      .is('revoked_at', null)
      .limit(1);

    if (tokenError || !tokens || tokens.length === 0) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Invalid access token',
      });
    }

    const token = tokens[0];

    // Check expiration
    if (new Date(token.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'invalid_token',
        error_description: 'Access token expired',
      });
    }

    // Fetch user info
    const { data: users, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, roles')
      .eq('id', token.user_id)
      .limit(1);

    if (userError || !users || users.length === 0) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'User not found',
      });
    }

    const user = users[0];
    const scopes = token.scope.split(' ');

    // Build response based on granted scopes
    const userInfo: Record<string, any> = {
      sub: user.id, // Subject (user ID) - always included
    };

    if (scopes.includes('profile')) {
      userInfo.name = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      userInfo.given_name = user.first_name;
      userInfo.family_name = user.last_name;
    }

    if (scopes.includes('email')) {
      userInfo.email = user.email;
    }

    if (scopes.includes('phone')) {
      userInfo.phone = user.phone;
    }

    return res.status(200).json(userInfo);
  } catch (error: any) {
    console.error('[OAuth UserInfo] Error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message || 'Internal server error',
    });
  }
}

/**
 * OAuth Token Revocation Endpoint
 * Revoke an access token or refresh token
 *
 * POST /api/oauth/revoke
 * Body: { token, token_type_hint }
 */
async function handleOAuthRevoke(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  try {
    const { token, token_type_hint } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'invalid_request',
        error_description: 'token is required',
      });
    }

    // Try to find and revoke the token
    // First try as access token
    let revoked = false;

    if (!token_type_hint || token_type_hint === 'access_token') {
      const { data: accessTokens } = await supabase
        .from('oauth_access_tokens')
        .select('id')
        .eq('access_token', token)
        .is('revoked_at', null)
        .limit(1);

      if (accessTokens && accessTokens.length > 0) {
        await supabase
          .from('oauth_access_tokens')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', accessTokens[0].id);
        revoked = true;
      }
    }

    // Try as refresh token if not found
    if (!revoked && (!token_type_hint || token_type_hint === 'refresh_token')) {
      const { data: refreshTokens } = await supabase
        .from('oauth_access_tokens')
        .select('id')
        .eq('refresh_token', token)
        .is('revoked_at', null)
        .limit(1);

      if (refreshTokens && refreshTokens.length > 0) {
        await supabase
          .from('oauth_access_tokens')
          .update({ revoked_at: new Date().toISOString() })
          .eq('id', refreshTokens[0].id);
        revoked = true;
      }
    }

    // Per RFC 7009, always return 200 even if token was not found
    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[OAuth Revoke] Error:', error);
    return res.status(500).json({
      error: 'server_error',
      error_description: error.message || 'Internal server error',
    });
  }
}

// ============================================================================
// SHARED API HANDLERS - Cross-Domain SSO Access
// These endpoints can be called from any Peeap domain with valid SSO session
// ============================================================================

/**
 * Validate SSO session from Authorization header
 * Supports both SSO session tokens and OAuth access tokens
 */
async function validateSharedApiAuth(req: VercelRequest): Promise<{
  valid: boolean;
  userId?: string;
  error?: string;
}> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return { valid: false, error: 'Missing authorization header' };
  }

  // Support both "Bearer <token>" and "SSO <session_token>" formats
  const [authType, token] = authHeader.split(' ');

  if (!token) {
    return { valid: false, error: 'Invalid authorization format' };
  }

  // Try SSO token first (from sso_tokens table - one-time use for cross-domain auth)
  if (authType === 'SSO' || authType === 'Session') {
    // First try sso_tokens table (one-time SSO tokens)
    const { data: ssoTokens, error: ssoError } = await supabase
      .from('sso_tokens')
      .select('id, user_id, expires_at, used_at')
      .eq('token', token)
      .limit(1);

    if (!ssoError && ssoTokens && ssoTokens.length > 0) {
      const ssoToken = ssoTokens[0];
      // Check if token is not used and not expired
      if (!ssoToken.used_at && new Date(ssoToken.expires_at) > new Date()) {
        // DON'T mark as used here - the SsoPage will do that after successful login
        // This allows the shared API to be called during the SSO flow
        return { valid: true, userId: ssoToken.user_id };
      }
      if (ssoToken.used_at) {
        return { valid: false, error: 'SSO token already used' };
      }
      return { valid: false, error: 'SSO token expired' };
    }

    // Fallback to user_sessions table
    const { data: sessions, error } = await supabase
      .from('user_sessions')
      .select('user_id, expires_at')
      .eq('session_token', token)
      .limit(1);

    if (!error && sessions && sessions.length > 0) {
      const session = sessions[0];
      if (new Date(session.expires_at) > new Date()) {
        // Update last activity
        await supabase
          .from('user_sessions')
          .update({ last_activity_at: new Date().toISOString() })
          .eq('session_token', token);
        return { valid: true, userId: session.user_id };
      }
      return { valid: false, error: 'Session expired' };
    }
  }

  // Try OAuth access token
  if (authType === 'Bearer') {
    const { data: tokens, error } = await supabase
      .from('oauth_access_tokens')
      .select('user_id, expires_at')
      .eq('access_token', token)
      .is('revoked_at', null)
      .limit(1);

    if (!error && tokens && tokens.length > 0) {
      const accessToken = tokens[0];
      if (new Date(accessToken.expires_at) > new Date()) {
        return { valid: true, userId: accessToken.user_id };
      }
      return { valid: false, error: 'Token expired' };
    }

    // Also try decoding JWT-style token (base64 encoded payload)
    try {
      const payload = JSON.parse(Buffer.from(token, 'base64').toString());
      if (payload.userId && payload.exp && payload.exp > Date.now()) {
        return { valid: true, userId: payload.userId };
      }
    } catch {
      // Not a valid JWT-style token
    }
  }

  return { valid: false, error: 'Invalid or expired token' };
}

/**
 * Get user's contacts
 * GET /api/shared/contacts
 */
async function handleSharedContacts(req: VercelRequest, res: VercelResponse) {
  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  if (req.method === 'GET') {
    try {
      // Get user's contacts (people they've sent money to)
      const { data: contacts, error } = await supabase
        .from('user_contacts')
        .select(`
          id,
          contact_user_id,
          nickname,
          is_favorite,
          last_transaction_at,
          created_at,
          contact:users!contact_user_id (
            id,
            first_name,
            last_name,
            phone,
            email
          )
        `)
        .eq('user_id', auth.userId)
        .order('last_transaction_at', { ascending: false, nullsFirst: false });

      if (error) {
        // Fallback: Get contacts from transaction history
        const { data: txContacts } = await supabase
          .from('transactions')
          .select('recipient_id, recipient_name, recipient_phone')
          .eq('user_id', auth.userId)
          .eq('type', 'TRANSFER')
          .not('recipient_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(50);

        // Deduplicate by recipient_id
        const uniqueContacts = txContacts?.reduce((acc: any[], tx: any) => {
          if (!acc.find(c => c.id === tx.recipient_id)) {
            acc.push({
              id: tx.recipient_id,
              name: tx.recipient_name,
              phone: tx.recipient_phone,
            });
          }
          return acc;
        }, []) || [];

        return res.status(200).json({ contacts: uniqueContacts });
      }

      return res.status(200).json({ contacts: contacts || [] });
    } catch (error: any) {
      console.error('[SharedContacts] Error:', error);
      return res.status(500).json({ error: 'Failed to fetch contacts' });
    }
  }

  if (req.method === 'POST') {
    // Add a new contact
    const { contactUserId, nickname } = req.body;

    if (!contactUserId) {
      return res.status(400).json({ error: 'contactUserId is required' });
    }

    try {
      const { data, error } = await supabase
        .from('user_contacts')
        .upsert({
          user_id: auth.userId,
          contact_user_id: contactUserId,
          nickname: nickname || null,
        }, {
          onConflict: 'user_id,contact_user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return res.status(200).json({ contact: data });
    } catch (error: any) {
      console.error('[SharedContacts] Add error:', error);
      return res.status(500).json({ error: 'Failed to add contact' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Get user's wallet balance
 * GET /api/shared/wallet
 */
async function handleSharedWallet(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('id, balance, currency, status, daily_limit, monthly_limit, created_at')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Return primary wallet (first one) and all wallets
    const primaryWallet = wallets?.[0] || null;

    return res.status(200).json({
      wallet: primaryWallet ? {
        id: primaryWallet.id,
        balance: parseFloat(primaryWallet.balance) || 0,
        currency: primaryWallet.currency || 'SLE',
        status: primaryWallet.status,
        dailyLimit: parseFloat(primaryWallet.daily_limit) || 5000,
        monthlyLimit: parseFloat(primaryWallet.monthly_limit) || 50000,
      } : null,
      wallets: (wallets || []).map((w: any) => ({
        id: w.id,
        balance: parseFloat(w.balance) || 0,
        currency: w.currency || 'SLE',
        status: w.status,
      })),
    });
  } catch (error: any) {
    console.error('[SharedWallet] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch wallet' });
  }
}

/**
 * Get user's wallet transactions
 * GET /api/shared/wallet/transactions
 */
async function handleSharedWalletTransactions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Get user's primary wallet
    const { data: wallet } = await supabase
      .from('wallets')
      .select('id')
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (!wallet) {
      return res.status(200).json({ transactions: [], total: 0 });
    }

    // Get transactions
    const { data: transactions, error, count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact' })
      .eq('wallet_id', wallet.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return res.status(200).json({
      transactions: (transactions || []).map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        amount: parseFloat(tx.amount) || 0,
        currency: tx.currency || 'SLE',
        status: tx.status,
        description: tx.description,
        merchantName: tx.merchant_name,
        reference: tx.reference,
        createdAt: tx.created_at,
      })),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (error: any) {
    console.error('[SharedWalletTransactions] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch transactions' });
  }
}

/**
 * Transfer money
 * POST /api/shared/transfer
 */
async function handleSharedTransfer(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    const { recipientId, recipientPhone, recipientEmail, amount, description, pin } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    if (!recipientId && !recipientPhone && !recipientEmail) {
      return res.status(400).json({ error: 'Recipient is required (id, phone, or email)' });
    }

    // Get sender's wallet
    const { data: senderWallet, error: walletError } = await supabase
      .from('wallets')
      .select('id, balance, status')
      .eq('user_id', auth.userId)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (walletError || !senderWallet) {
      return res.status(400).json({ error: 'No active wallet found' });
    }

    if (parseFloat(senderWallet.balance) < amount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Find recipient
    let recipientUserId = recipientId;
    if (!recipientUserId) {
      let query = supabase.from('users').select('id');

      if (recipientPhone) {
        query = query.eq('phone', recipientPhone);
      } else if (recipientEmail) {
        query = query.eq('email', recipientEmail);
      }

      const { data: recipients } = await query.limit(1);
      if (!recipients || recipients.length === 0) {
        return res.status(404).json({ error: 'Recipient not found' });
      }
      recipientUserId = recipients[0].id;
    }

    // Get recipient's wallet
    const { data: recipientWallet, error: recipientWalletError } = await supabase
      .from('wallets')
      .select('id, balance')
      .eq('user_id', recipientUserId)
      .eq('status', 'ACTIVE')
      .limit(1)
      .single();

    if (recipientWalletError || !recipientWallet) {
      return res.status(400).json({ error: 'Recipient has no active wallet' });
    }

    // Perform transfer
    const reference = `TRF-${Date.now()}-${Math.random().toString(36).substr(2, 8)}`;

    // Debit sender
    await supabase
      .from('wallets')
      .update({
        balance: parseFloat(senderWallet.balance) - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', senderWallet.id);

    // Credit recipient
    await supabase
      .from('wallets')
      .update({
        balance: parseFloat(recipientWallet.balance) + amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', recipientWallet.id);

    // Create transactions
    await supabase.from('transactions').insert([
      {
        wallet_id: senderWallet.id,
        user_id: auth.userId,
        type: 'TRANSFER',
        amount: -amount,
        currency: 'SLE',
        status: 'COMPLETED',
        description: description || 'Transfer sent',
        reference,
        recipient_id: recipientUserId,
      },
      {
        wallet_id: recipientWallet.id,
        user_id: recipientUserId,
        type: 'TRANSFER',
        amount: amount,
        currency: 'SLE',
        status: 'COMPLETED',
        description: description || 'Transfer received',
        reference,
        sender_id: auth.userId,
      },
    ]);

    // Create admin notification for the transfer
    try {
      const { data: senderData } = await supabase
        .from('users')
        .select('first_name, last_name, phone')
        .eq('id', auth.userId)
        .single();
      const { data: recipientData } = await supabase
        .from('users')
        .select('first_name, last_name, phone')
        .eq('id', recipientUserId)
        .single();

      const senderName = senderData?.first_name ? `${senderData.first_name} ${senderData.last_name || ''}`.trim() : senderData?.phone || 'Unknown';
      const recipientName = recipientData?.first_name ? `${recipientData.first_name} ${recipientData.last_name || ''}`.trim() : recipientData?.phone || 'Unknown';

      await supabase.from('admin_notifications').insert({
        type: 'transfer',
        title: 'New Transfer',
        message: `${senderName} sent SLE ${amount.toLocaleString()} to ${recipientName}`,
        priority: amount >= 10000 ? 'high' : 'low',
        related_entity_type: 'transaction',
        related_entity_id: reference,
        action_url: `/admin/transactions?reference=${reference}`,
        metadata: {
          senderId: auth.userId,
          senderName,
          recipientId: recipientUserId,
          recipientName,
          amount,
          currency: 'SLE',
        },
      });
      console.log('[SharedTransfer] Admin notification created');
    } catch (adminNotifErr) {
      console.error('[SharedTransfer] Failed to create admin notification:', adminNotifErr);
    }

    return res.status(200).json({
      success: true,
      transactionId: reference,
      amount,
      recipientId: recipientUserId,
    });
  } catch (error: any) {
    console.error('[SharedTransfer] Error:', error);
    return res.status(500).json({ error: 'Transfer failed' });
  }
}

/**
 * Get current user profile
 * GET /api/shared/user
 */
async function handleSharedUser(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    // Select only columns that exist in the users table
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, roles, role, kyc_status, kyc_tier, email_verified, created_at')
      .eq('id', auth.userId)
      .single();

    if (error) {
      console.error('[SharedUser] Database error:', error);
      throw error;
    }

    // Parse roles from array, string, or single role
    let userRoles = ['user'];
    if (user.roles) {
      // Handle both array (from Postgres) and string formats
      userRoles = Array.isArray(user.roles)
        ? user.roles
        : user.roles.split(',').map((r: string) => r.trim());
    } else if (user.role) {
      userRoles = [user.role];
    }

    return res.status(200).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phone: user.phone,
        roles: userRoles,
        tier: 'basic', // Default tier since column doesn't exist yet
        kycStatus: user.kyc_status,
        kycTier: user.kyc_tier,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
    console.error('[SharedUser] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch user' });
  }
}

/**
 * Get user's business/merchant data
 * GET /api/shared/business
 * Returns merchant data that can be used for Plus setup
 */
async function handleSharedBusiness(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    // First, try to get merchant data
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('user_id', auth.userId)
      .single();

    if (!merchantError && merchant) {
      return res.status(200).json({
        business: {
          id: merchant.id,
          userId: merchant.user_id,
          businessName: merchant.business_name || merchant.name,
          tradingName: merchant.trading_name,
          email: merchant.email,
          phone: merchant.phone,
          address: merchant.address,
          city: merchant.city,
          country: merchant.country || 'SL',
          industry: merchant.industry || merchant.business_type,
          registrationNumber: merchant.registration_number,
          taxId: merchant.tax_id,
          kycStatus: merchant.kyc_status || 'verified',
          kycTier: merchant.kyc_tier,
          isVerified: merchant.is_verified || merchant.kyc_status === 'verified',
          createdAt: merchant.created_at,
          // Include business logo if available
          logoUrl: merchant.logo_url,
          website: merchant.website,
        },
        source: 'merchant',
      });
    }

    // Fallback: Try to get business info from users table
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', auth.userId)
      .single();

    if (!userError && user && user.business_name) {
      return res.status(200).json({
        business: {
          id: user.id,
          userId: user.id,
          businessName: user.business_name,
          email: user.email,
          phone: user.phone,
          address: user.address,
          city: user.city,
          country: user.country || 'SL',
          industry: user.business_type,
          kycStatus: user.kyc_status || 'pending',
          isVerified: user.kyc_status === 'verified',
          createdAt: user.created_at,
        },
        source: 'user',
      });
    }

    // No business found
    return res.status(200).json({
      business: null,
      source: null,
      message: 'No business found for this user',
    });
  } catch (error: any) {
    console.error('[SharedBusiness] Error:', error);
    return res.status(500).json({ error: 'Failed to fetch business' });
  }
}

/**
 * Search users for team member invitations
 * GET /api/shared/users/search?q=searchterm
 * Returns users matching email, phone, or name
 */
async function handleSharedUsersSearch(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    const searchQuery = (req.query.q as string || '').trim().toLowerCase();

    if (!searchQuery || searchQuery.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    // Search users by email, phone, or name
    // Using ilike for case-insensitive search
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, phone, profile_picture, created_at')
      .or(`email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%`)
      .neq('id', auth.userId) // Exclude the current user
      .limit(20);

    if (error) {
      console.error('[SharedUsersSearch] Error:', error);
      return res.status(500).json({ error: 'Search failed' });
    }

    // Format the results
    const results = (users || []).map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email,
      phone: user.phone,
      avatarUrl: user.profile_picture,
      createdAt: user.created_at,
    }));

    return res.status(200).json({ users: results });
  } catch (error: any) {
    console.error('[SharedUsersSearch] Error:', error);
    return res.status(500).json({ error: 'Search failed' });
  }
}

/**
 * Create a hosted checkout session
 * POST /api/shared/checkout/create
 */
async function handleSharedCheckoutCreate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    const {
      amount,
      currency = 'SLE',
      description,
      successUrl,
      cancelUrl,
      metadata,
    } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    // Create checkout session
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 12)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const { data: session, error } = await supabase
      .from('checkout_sessions')
      .insert({
        session_id: sessionId,
        user_id: auth.userId,
        amount,
        currency,
        description,
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: metadata || {},
        status: 'pending',
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Build checkout URL (use the checkout domain)
    const checkoutUrl = process.env.NODE_ENV === 'production'
      ? `https://checkout.peeap.com/checkout/pay/${sessionId}`
      : `http://localhost:5174/checkout/pay/${sessionId}`;

    return res.status(200).json({
      sessionId,
      checkoutUrl,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[SharedCheckoutCreate] Error:', error);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
}

// ============================================================================
// ANALYTICS HANDLERS
// ============================================================================

async function ensurePageViewsTable() {
  // Check if table exists by trying a simple query
  const { error } = await supabase.from('page_views').select('id').limit(1);

  if (error && error.message.includes('does not exist')) {
    console.log('[Analytics] page_views table does not exist, creating...');
    // Table doesn't exist - we can't create it via API, needs to be created in Supabase dashboard
    return false;
  }
  return true;
}

// ========== CRON HANDLERS ==========

/**
 * Cron job handler to keep Supabase project active
 * Supabase pauses free-tier projects after 7 days of inactivity
 * This endpoint is called by Vercel Cron to prevent pausing
 */
async function handleCronKeepalive(req: VercelRequest, res: VercelResponse) {
  // Verify this is a cron request (optional security check)
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  // If CRON_SECRET is set, verify the request
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    console.log('[Cron] Unauthorized keepalive attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron] Running Supabase keepalive ping...');

    // Perform a simple query to keep the database active
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      console.error('[Cron] Keepalive query failed:', error.message);
      return res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    console.log('[Cron] Keepalive successful');
    return res.status(200).json({
      success: true,
      message: 'Supabase keepalive ping successful',
      timestamp: new Date().toISOString(),
      nextRun: 'in 6 hours'
    });
  } catch (error: any) {
    console.error('[Cron] Keepalive error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * Monthly subscription billing and reminder cron job
 * Runs on the 1st of each month
 */
async function handleCronSubscriptions(req: VercelRequest, res: VercelResponse) {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('[Cron Subscriptions] Starting monthly subscription processing...');
    const now = new Date();
    const results = { expiredTrials: 0, expiredSubscriptions: 0, remindersSent: 0, errors: [] as string[] };

    // 1. Expire trials that have ended
    const { data: expiredTrials } = await supabase
      .from('merchant_subscriptions')
      .update({ status: 'expired', updated_at: now.toISOString() })
      .eq('status', 'trialing')
      .lt('trial_ends_at', now.toISOString())
      .select('id, user_id');

    results.expiredTrials = expiredTrials?.length || 0;
    for (const trial of expiredTrials || []) {
      await supabase.from('notifications').insert({
        user_id: trial.user_id, type: 'subscription', title: 'Trial Expired',
        message: 'Your free trial has ended. Upgrade now to continue using premium features.',
        data: { subscriptionId: trial.id, action: 'trial_expired' }
      });
    }

    // 2. Expire subscriptions that have ended
    const { data: expiredSubs } = await supabase
      .from('merchant_subscriptions')
      .update({ status: 'expired', updated_at: now.toISOString() })
      .eq('status', 'active')
      .lt('current_period_end', now.toISOString())
      .select('id, user_id');

    results.expiredSubscriptions = expiredSubs?.length || 0;
    for (const sub of expiredSubs || []) {
      await supabase.from('notifications').insert({
        user_id: sub.user_id, type: 'subscription', title: 'Subscription Expired',
        message: 'Your subscription has expired. Renew now to restore access.',
        data: { subscriptionId: sub.id, action: 'subscription_expired' }
      });
    }

    // 3. Send reminders for subscriptions expiring in 7 days
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const { data: expiringSoon } = await supabase
      .from('merchant_subscriptions')
      .select('id, user_id, tier, current_period_end, price_monthly')
      .eq('status', 'active')
      .gt('current_period_end', now.toISOString())
      .lte('current_period_end', sevenDaysFromNow.toISOString());

    for (const sub of expiringSoon || []) {
      const daysLeft = Math.ceil((new Date(sub.current_period_end).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      await supabase.from('notifications').insert({
        user_id: sub.user_id, type: 'subscription', title: 'Subscription Expiring Soon',
        message: `Your ${sub.tier} subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
        data: { subscriptionId: sub.id, action: 'expiring_soon', daysLeft }
      });
      results.remindersSent++;
    }

    // 4. Send reminders for trials ending in 3 days
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const { data: trialsEndingSoon } = await supabase
      .from('merchant_subscriptions')
      .select('id, user_id, tier, trial_ends_at, price_monthly')
      .eq('status', 'trialing')
      .gt('trial_ends_at', now.toISOString())
      .lte('trial_ends_at', threeDaysFromNow.toISOString());

    for (const trial of trialsEndingSoon || []) {
      const daysLeft = Math.ceil((new Date(trial.trial_ends_at).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      await supabase.from('notifications').insert({
        user_id: trial.user_id, type: 'subscription', title: 'Trial Ending Soon',
        message: `Your free trial ends in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}.`,
        data: { subscriptionId: trial.id, action: 'trial_ending_soon', daysLeft }
      });
      results.remindersSent++;
    }

    return res.status(200).json({ success: true, message: 'Subscription cron completed', results });
  } catch (error: any) {
    console.error('[Cron Subscriptions] Error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

async function handleAnalyticsPageView(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      sessionId,
      userId,
      pagePath,
      pageTitle,
      referrer,
      userAgent,
      deviceType,
      browser,
      os,
      screenWidth,
      screenHeight,
      durationSeconds,
      isBounce
    } = req.body;

    if (!sessionId || !pagePath) {
      return res.status(400).json({ error: 'sessionId and pagePath are required' });
    }

    // Get IP and geolocation from headers
    const ipAddress = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
                      req.headers['x-real-ip']?.toString() ||
                      'unknown';

    const { data, error } = await supabase
      .from('page_views')
      .insert({
        session_id: sessionId,
        user_id: userId || null,
        page_path: pagePath,
        page_title: pageTitle || null,
        referrer: referrer || null,
        user_agent: userAgent || req.headers['user-agent'] || null,
        ip_address: ipAddress,
        device_type: deviceType || null,
        browser: browser || null,
        os: os || null,
        screen_width: screenWidth || null,
        screen_height: screenHeight || null,
        duration_seconds: durationSeconds || 0,
        is_bounce: isBounce !== false,
      })
      .select()
      .single();

    if (error) {
      console.error('[Analytics] PageView insert error:', error);
      return res.status(500).json({ error: 'Failed to record page view' });
    }

    return res.status(200).json({ success: true, id: data.id });
  } catch (error: any) {
    console.error('[Analytics] PageView error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleAnalyticsPageViewDuration(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId, pagePath, durationSeconds } = req.body;

    if (!sessionId || !pagePath) {
      return res.status(400).json({ error: 'sessionId and pagePath are required' });
    }

    const { error } = await supabase
      .from('page_views')
      .update({
        duration_seconds: durationSeconds || 0,
        is_bounce: false
      })
      .eq('session_id', sessionId)
      .eq('page_path', pagePath);

    if (error) {
      console.error('[Analytics] Duration update error:', error);
      return res.status(500).json({ error: 'Failed to update duration' });
    }

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('[Analytics] Duration error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleAnalyticsSummary(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access using session token (app uses custom auth, not Supabase auth)
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    let authenticatedUserId: string | null = null;

    // Try to verify as session token from sso_tokens table
    const { data: session } = await supabase
      .from('sso_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (session) {
      if (new Date(session.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Session expired' });
      }
      authenticatedUserId = session.user_id;
    } else {
      // Fallback: try legacy base64 JWT token
      try {
        const payload = JSON.parse(atob(token));
        if (payload.userId && payload.exp && payload.exp > Date.now()) {
          authenticatedUserId = payload.userId;
        }
      } catch {
        // Not a valid token format
      }
    }

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check if user is admin
    const { data: userData } = await supabase
      .from('users')
      .select('roles')
      .eq('id', authenticatedUserId)
      .single();

    if (!userData || !(userData.roles?.includes('admin') || userData.roles?.includes('superadmin'))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const period = (req.query.period as string) || '7d';
    let startDate: Date;

    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get total page views
    const { count: totalViews } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString());

    // Get unique sessions (visitors)
    const { data: sessions } = await supabase
      .from('page_views')
      .select('session_id')
      .gte('created_at', startDate.toISOString());

    const uniqueVisitors = new Set(sessions?.map(s => s.session_id)).size;

    // Get bounce rate
    const { data: bounceData } = await supabase
      .from('page_views')
      .select('is_bounce')
      .gte('created_at', startDate.toISOString());

    const bounceCount = bounceData?.filter(d => d.is_bounce).length || 0;
    const bounceRate = bounceData?.length ? Math.round((bounceCount / bounceData.length) * 100) : 0;

    // Get average session duration
    const { data: durationData } = await supabase
      .from('page_views')
      .select('duration_seconds')
      .gte('created_at', startDate.toISOString())
      .gt('duration_seconds', 0);

    const avgDuration = durationData?.length
      ? Math.round(durationData.reduce((sum, d) => sum + d.duration_seconds, 0) / durationData.length)
      : 0;

    // Get views by day for chart
    const { data: dailyViews } = await supabase
      .from('page_views')
      .select('created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const viewsByDay: Record<string, number> = {};
    dailyViews?.forEach(view => {
      const day = new Date(view.created_at).toISOString().split('T')[0];
      viewsByDay[day] = (viewsByDay[day] || 0) + 1;
    });

    return res.status(200).json({
      totalViews: totalViews || 0,
      uniqueVisitors,
      bounceRate,
      avgDuration,
      viewsByDay,
      period
    });
  } catch (error: any) {
    console.error('[Analytics] Summary error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleAnalyticsPages(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access using session token (app uses custom auth)
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    let authenticatedUserId: string | null = null;

    const { data: session } = await supabase
      .from('sso_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (session) {
      if (new Date(session.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Session expired' });
      }
      authenticatedUserId = session.user_id;
    } else {
      try {
        const payload = JSON.parse(atob(token));
        if (payload.userId && payload.exp && payload.exp > Date.now()) {
          authenticatedUserId = payload.userId;
        }
      } catch {
        // Not a valid token format
      }
    }

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('roles')
      .eq('id', authenticatedUserId)
      .single();

    if (!userData || !(userData.roles?.includes('admin') || userData.roles?.includes('superadmin'))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const period = (req.query.period as string) || '7d';
    let startDate: Date;

    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get page views grouped by path
    const { data: pageViews } = await supabase
      .from('page_views')
      .select('page_path, page_title')
      .gte('created_at', startDate.toISOString());

    const pageStats: Record<string, { views: number; title: string }> = {};
    pageViews?.forEach(view => {
      if (!pageStats[view.page_path]) {
        pageStats[view.page_path] = { views: 0, title: view.page_title || view.page_path };
      }
      pageStats[view.page_path].views++;
    });

    const topPages = Object.entries(pageStats)
      .map(([path, stats]) => ({ path, ...stats }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 20);

    return res.status(200).json({ topPages, period });
  } catch (error: any) {
    console.error('[Analytics] Pages error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleAnalyticsVisitors(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify admin access using session token (app uses custom auth)
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    let authenticatedUserId: string | null = null;

    const { data: session } = await supabase
      .from('sso_tokens')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (session) {
      if (new Date(session.expires_at) < new Date()) {
        return res.status(401).json({ error: 'Session expired' });
      }
      authenticatedUserId = session.user_id;
    } else {
      try {
        const payload = JSON.parse(atob(token));
        if (payload.userId && payload.exp && payload.exp > Date.now()) {
          authenticatedUserId = payload.userId;
        }
      } catch {
        // Not a valid token format
      }
    }

    if (!authenticatedUserId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { data: userData } = await supabase
      .from('users')
      .select('roles')
      .eq('id', authenticatedUserId)
      .single();

    if (!userData || !(userData.roles?.includes('admin') || userData.roles?.includes('superadmin'))) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const period = (req.query.period as string) || '7d';
    let startDate: Date;

    switch (period) {
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    }

    // Get visitor data grouped by device, browser, OS
    const { data: visitors } = await supabase
      .from('page_views')
      .select('device_type, browser, os, referrer')
      .gte('created_at', startDate.toISOString());

    // Aggregate device types
    const deviceStats: Record<string, number> = {};
    const browserStats: Record<string, number> = {};
    const osStats: Record<string, number> = {};
    const referrerStats: Record<string, number> = {};

    visitors?.forEach(v => {
      const device = v.device_type || 'Unknown';
      const browser = v.browser || 'Unknown';
      const os = v.os || 'Unknown';
      const referrer = v.referrer ? new URL(v.referrer).hostname : 'Direct';

      deviceStats[device] = (deviceStats[device] || 0) + 1;
      browserStats[browser] = (browserStats[browser] || 0) + 1;
      osStats[os] = (osStats[os] || 0) + 1;
      referrerStats[referrer] = (referrerStats[referrer] || 0) + 1;
    });

    const sortAndLimit = (obj: Record<string, number>, limit = 10) =>
      Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([name, count]) => ({ name, count }));

    return res.status(200).json({
      devices: sortAndLimit(deviceStats),
      browsers: sortAndLimit(browserStats),
      operatingSystems: sortAndLimit(osStats),
      referrers: sortAndLimit(referrerStats),
      period
    });
  } catch (error: any) {
    console.error('[Analytics] Visitors error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

// ============================================================================
// FUEL STATION CRM HANDLERS
// ============================================================================

/**
 * Get business ID from authorization header
 */
async function getFuelBusinessId(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    // Token is base64 encoded JSON with userId
    const payload = JSON.parse(Buffer.from(token, 'base64').toString());
    const userId = payload.userId;
    if (!userId) return null;

    // Get user's business
    const { data } = await supabase
      .from('plus_businesses')
      .select('id')
      .eq('owner_id', userId)
      .single();

    return data?.id || null;
  } catch {
    return null;
  }
}

/**
 * Fuel Stations - GET list, POST create
 */
async function handleFuelStations(req: VercelRequest, res: VercelResponse) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fuel_stations')
      .select('*, manager:plus_staff(id, first_name, last_name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fuel_stations')
      .insert({
        business_id: businessId,
        name: body.name,
        code: body.code,
        address: body.address,
        city: body.city,
        region: body.region,
        contact_phone: body.contactPhone,
        status: body.status || 'active',
        operating_hours: body.operatingHours,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Station by ID - GET, PUT, DELETE
 */
async function handleFuelStationById(req: VercelRequest, res: VercelResponse, stationId: string) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fuel_stations')
      .select('*, manager:plus_staff(id, first_name, last_name)')
      .eq('id', stationId)
      .eq('business_id', businessId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Station not found' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fuel_stations')
      .update({
        name: body.name,
        code: body.code,
        address: body.address,
        city: body.city,
        region: body.region,
        contact_phone: body.contactPhone,
        status: body.status,
        operating_hours: body.operatingHours,
        manager_staff_id: body.managerStaffId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', stationId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase
      .from('fuel_stations')
      .delete()
      .eq('id', stationId)
      .eq('business_id', businessId);

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Pumps for a station
 */
async function handleFuelPumps(req: VercelRequest, res: VercelResponse, stationId: string) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fuel_pumps')
      .select('*, fuel_type:fuel_types(id, name, code)')
      .eq('station_id', stationId)
      .order('pump_number');

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fuel_pumps')
      .insert({
        station_id: stationId,
        pump_number: body.pumpNumber,
        name: body.name,
        fuel_type_id: body.fuelTypeId,
        status: body.status || 'active',
        current_meter_reading: body.currentMeterReading || 0,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Tanks for a station
 */
async function handleFuelTanks(req: VercelRequest, res: VercelResponse, stationId: string) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fuel_tanks')
      .select('*, fuel_type:fuel_types(id, name, code), station:fuel_stations(id, name)')
      .eq('station_id', stationId)
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fuel_tanks')
      .insert({
        station_id: stationId,
        fuel_type_id: body.fuelTypeId,
        name: body.name,
        capacity_liters: body.capacityLiters,
        current_level_liters: body.currentLevelLiters || 0,
        minimum_level_liters: body.minimumLevelLiters || 0,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Prices for a station
 */
async function handleFuelPrices(req: VercelRequest, res: VercelResponse, stationId: string) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    // Get current prices (effective_to is null or in the future)
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('*, fuel_type:fuel_types(id, name, code)')
      .eq('station_id', stationId)
      .or('effective_to.is.null,effective_to.gt.' + new Date().toISOString())
      .order('effective_from', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    // Deduplicate by fuel type (keep most recent)
    const priceMap = new Map();
    for (const price of data || []) {
      if (!priceMap.has(price.fuel_type_id)) {
        priceMap.set(price.fuel_type_id, price);
      }
    }

    return res.status(200).json(Array.from(priceMap.values()));
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fuel_prices')
      .insert({
        station_id: stationId,
        fuel_type_id: body.fuelTypeId,
        price_per_unit: body.pricePerUnit,
        effective_from: body.effectiveFrom || new Date().toISOString(),
        set_by: body.setBy,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Sales - GET list, POST create
 */
async function handleFuelSales(req: VercelRequest, res: VercelResponse) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const stationId = req.query.station_id as string;
    let query = supabase
      .from('fuel_sales')
      .select(`
        *,
        station:fuel_stations(id, name, code),
        pump:fuel_pumps(id, name, pump_number),
        fuel_type:fuel_types(id, name, code),
        attendant:plus_staff(id, first_name, last_name)
      `)
      .order('created_at', { ascending: false })
      .limit(100);

    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const subtotal = body.quantityLiters * body.pricePerLiter;
    const total = subtotal - (body.discount || 0);

    const { data, error } = await supabase
      .from('fuel_sales')
      .insert({
        station_id: body.stationId,
        pump_id: body.pumpId,
        fuel_type_id: body.fuelTypeId,
        quantity_liters: body.quantityLiters,
        price_per_liter: body.pricePerLiter,
        subtotal: subtotal,
        discount: body.discount || 0,
        total_amount: total,
        payment_method: body.paymentMethod,
        payment_reference: body.paymentReference,
        customer_type: body.customerType || 'walkin',
        fleet_customer_id: body.fleetCustomerId,
        fleet_vehicle_id: body.fleetVehicleId,
        fleet_driver_id: body.fleetDriverId,
        fuel_card_id: body.fuelCardId,
        customer_user_id: body.customerUserId,
        attendant_id: body.attendantId,
        shift_id: body.shiftId,
        vehicle_registration: body.vehicleRegistration,
        odometer_reading: body.odometerReading,
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Sale by ID
 */
async function handleFuelSaleById(req: VercelRequest, res: VercelResponse, saleId: string) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fuel_sales')
      .select(`
        *,
        station:fuel_stations(id, name, code),
        pump:fuel_pumps(id, name, pump_number),
        fuel_type:fuel_types(id, name, code),
        attendant:plus_staff(id, first_name, last_name)
      `)
      .eq('id', saleId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Cards - GET list, POST create
 */
async function handleFuelCards(req: VercelRequest, res: VercelResponse) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fuel_cards')
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    // Generate card number
    const cardNumber = 'FC' + Date.now().toString().slice(-8) + Math.random().toString(36).slice(-4).toUpperCase();

    const { data, error } = await supabase
      .from('fuel_cards')
      .insert({
        business_id: businessId,
        card_number: cardNumber,
        card_type: body.cardType,
        holder_name: body.holderName,
        holder_type: body.holderType,
        holder_id: body.holderId,
        balance: body.initialBalance || 0,
        credit_limit: body.creditLimit || 0,
        daily_limit: body.dailyLimit,
        monthly_limit: body.monthlyLimit,
        status: 'active',
        expires_at: body.expiresAt,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Card by ID
 */
async function handleFuelCardById(req: VercelRequest, res: VercelResponse, cardId: string) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fuel_cards')
      .select('*')
      .eq('id', cardId)
      .eq('business_id', businessId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Card not found' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fuel_cards')
      .update({
        holder_name: body.holderName,
        daily_limit: body.dailyLimit,
        monthly_limit: body.monthlyLimit,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cardId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Top up a fuel card
 */
async function handleFuelCardTopup(req: VercelRequest, res: VercelResponse, cardId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body;
  const amount = parseFloat(body.amount);

  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  // Get current card balance
  const { data: card, error: cardError } = await supabase
    .from('fuel_cards')
    .select('balance')
    .eq('id', cardId)
    .eq('business_id', businessId)
    .single();

  if (cardError || !card) {
    return res.status(404).json({ error: 'Card not found' });
  }

  const newBalance = (card.balance || 0) + amount;

  // Update balance
  const { error: updateError } = await supabase
    .from('fuel_cards')
    .update({
      balance: newBalance,
      updated_at: new Date().toISOString(),
    })
    .eq('id', cardId);

  if (updateError) {
    return res.status(500).json({ error: updateError.message });
  }

  // Record transaction
  await supabase.from('fuel_card_transactions').insert({
    card_id: cardId,
    type: 'topup',
    amount: amount,
    balance_before: card.balance,
    balance_after: newBalance,
    reference: body.reference,
    description: body.description || 'Card top-up',
    created_by: body.createdBy,
  });

  return res.status(200).json({ success: true, newBalance });
}

/**
 * Fleet Customers - GET list, POST create
 */
async function handleFuelFleetCustomers(req: VercelRequest, res: VercelResponse) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fleet_customers')
      .select('*')
      .eq('business_id', businessId)
      .order('company_name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fleet_customers')
      .insert({
        business_id: businessId,
        company_name: body.companyName,
        contact_name: body.contactName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        tax_id: body.taxId,
        credit_limit: body.creditLimit || 0,
        payment_terms: body.paymentTerms || 30,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fleet Customer by ID
 */
async function handleFuelFleetCustomerById(req: VercelRequest, res: VercelResponse, customerId: string) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fleet_customers')
      .select('*')
      .eq('id', customerId)
      .eq('business_id', businessId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'PUT') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fleet_customers')
      .update({
        company_name: body.companyName,
        contact_name: body.contactName,
        email: body.email,
        phone: body.phone,
        address: body.address,
        tax_id: body.taxId,
        credit_limit: body.creditLimit,
        payment_terms: body.paymentTerms,
        status: body.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', customerId)
      .eq('business_id', businessId)
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Shifts - GET list
 */
async function handleFuelShifts(req: VercelRequest, res: VercelResponse) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const stationId = req.query.station_id as string;
    let query = supabase
      .from('staff_shifts')
      .select(`
        *,
        station:fuel_stations(id, name),
        staff:plus_staff(id, first_name, last_name)
      `)
      .order('start_time', { ascending: false })
      .limit(50);

    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Start a new shift
 */
async function handleFuelShiftStart(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body;
  const { data, error } = await supabase
    .from('staff_shifts')
    .insert({
      station_id: body.stationId,
      staff_id: body.staffId,
      shift_type: body.shiftType || 'day',
      start_time: new Date().toISOString(),
      opening_cash: body.openingCash || 0,
      status: 'active',
    })
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(201).json(data);
}

/**
 * End a shift
 */
async function handleFuelShiftEnd(req: VercelRequest, res: VercelResponse, shiftId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = req.body;

  // Get shift sales totals
  const { data: salesData } = await supabase
    .from('fuel_sales')
    .select('total_amount, quantity_liters, payment_method')
    .eq('shift_id', shiftId);

  const totalSales = salesData?.reduce((sum, s) => sum + s.total_amount, 0) || 0;
  const totalLiters = salesData?.reduce((sum, s) => sum + s.quantity_liters, 0) || 0;
  const cashSales = salesData?.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + s.total_amount, 0) || 0;

  const { data: shift } = await supabase
    .from('staff_shifts')
    .select('opening_cash')
    .eq('id', shiftId)
    .single();

  const expectedCash = (shift?.opening_cash || 0) + cashSales;
  const closingCash = body.closingCash || 0;
  const cashDifference = closingCash - expectedCash;

  const { data, error } = await supabase
    .from('staff_shifts')
    .update({
      end_time: new Date().toISOString(),
      closing_cash: closingCash,
      cash_sales: cashSales,
      cash_difference: cashDifference,
      total_sales: totalSales,
      total_liters: totalLiters,
      transaction_count: salesData?.length || 0,
      status: 'closed',
      notes: body.notes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', shiftId)
    .select()
    .single();

  if (error) {
    return res.status(400).json({ error: error.message });
  }
  return res.status(200).json(data);
}

/**
 * Fuel Deliveries - GET list, POST create
 */
async function handleFuelDeliveries(req: VercelRequest, res: VercelResponse) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stationId = req.query.station_id as string;

  if (req.method === 'GET') {
    let query = supabase
      .from('fuel_deliveries')
      .select(`
        *,
        station:fuel_stations(id, name),
        tank:fuel_tanks(id, name),
        fuel_type:fuel_types(id, name, code)
      `)
      .order('delivered_at', { ascending: false })
      .limit(50);

    if (stationId) {
      query = query.eq('station_id', stationId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fuel_deliveries')
      .insert({
        station_id: body.stationId,
        tank_id: body.tankId,
        fuel_type_id: body.fuelTypeId,
        quantity_liters: body.quantityLiters,
        supplier_name: body.supplierName,
        delivery_note_number: body.deliveryNoteNumber,
        unit_cost: body.unitCost,
        total_cost: body.quantityLiters * body.unitCost,
        received_by: body.receivedBy,
        delivered_at: body.deliveredAt || new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update tank level
    if (body.tankId) {
      await supabase.rpc('update_tank_level', {
        p_tank_id: body.tankId,
        p_quantity: body.quantityLiters,
      });
    }

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Tank Dippings - GET list, POST create
 */
async function handleFuelDippings(req: VercelRequest, res: VercelResponse) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const stationId = req.query.station_id as string;

  if (req.method === 'GET') {
    let query = supabase
      .from('tank_dippings')
      .select(`
        *,
        tank:fuel_tanks(id, name, station_id),
        recorded_by_staff:plus_staff(id, first_name, last_name)
      `)
      .order('dipped_at', { ascending: false })
      .limit(50);

    if (stationId) {
      query = query.eq('tank.station_id', stationId);
    }

    const { data, error } = await query;

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;

    // Get current tank level for variance calculation
    const { data: tank } = await supabase
      .from('fuel_tanks')
      .select('current_level_liters')
      .eq('id', body.tankId)
      .single();

    const { data, error } = await supabase
      .from('tank_dippings')
      .insert({
        tank_id: body.tankId,
        dip_reading_liters: body.dipReadingLiters,
        expected_level_liters: tank?.current_level_liters || 0,
        variance_liters: body.dipReadingLiters - (tank?.current_level_liters || 0),
        recorded_by: body.recordedBy,
        dipped_at: body.dippedAt || new Date().toISOString(),
        notes: body.notes,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Update tank level
    await supabase
      .from('fuel_tanks')
      .update({
        current_level_liters: body.dipReadingLiters,
        last_dip_reading: body.dipReadingLiters,
        last_dip_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', body.tankId);

    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Fuel Types - GET list, POST create
 */
async function handleFuelTypes(req: VercelRequest, res: VercelResponse) {
  const businessId = await getFuelBusinessId(req);
  if (!businessId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('fuel_types')
      .select('*')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .order('name');

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const body = req.body;
    const { data, error } = await supabase
      .from('fuel_types')
      .insert({
        business_id: businessId,
        name: body.name,
        code: body.code,
        unit: body.unit || 'liters',
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(201).json(data);
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ============================================================================
// REFUND HANDLERS
// ============================================================================

/**
 * Map database row to refund response
 */
function mapRefundRequest(row: any) {
  return {
    id: row.id,
    reference: row.reference,
    originalTransactionId: row.original_transaction_id,
    senderId: row.sender_id,
    senderWalletId: row.sender_wallet_id,
    recipientId: row.recipient_id,
    recipientWalletId: row.recipient_wallet_id,
    amount: parseFloat(row.amount) || 0,
    currency: row.currency || 'SLE',
    reason: row.reason,
    status: row.status,
    senderStatus: row.sender_status,
    recipientStatus: row.recipient_status,
    createdAt: row.created_at,
    releaseAt: row.release_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    cancelledBy: row.cancelled_by,
    cancellationReason: row.cancellation_reason,
    sender: row.sender ? {
      id: row.sender.id,
      firstName: row.sender.first_name,
      lastName: row.sender.last_name,
      email: row.sender.email,
      phone: row.sender.phone,
      profilePicture: row.sender.profile_picture,
    } : undefined,
    recipient: row.recipient ? {
      id: row.recipient.id,
      firstName: row.recipient.first_name,
      lastName: row.recipient.last_name,
      email: row.recipient.email,
      phone: row.recipient.phone,
      profilePicture: row.recipient.profile_picture,
    } : undefined,
  };
}

/**
 * GET /api/refunds - List user's refunds (sent and received)
 * POST /api/refunds - Create a new refund request
 */
async function handleRefunds(req: VercelRequest, res: VercelResponse) {
  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  const userId = auth.userId!;

  if (req.method === 'GET') {
    try {
      // Get refunds where user is sender or recipient
      const { data, error } = await supabase
        .from('refund_requests')
        .select(`
          *,
          sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture),
          recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
        `)
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Refunds] Error fetching refunds:', error);
        return res.status(500).json({ error: error.message });
      }

      const refunds = (data || []).map(mapRefundRequest);
      return res.status(200).json({ refunds });
    } catch (err: any) {
      console.error('[Refunds] Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to fetch refunds' });
    }
  }

  if (req.method === 'POST') {
    try {
      const { recipientId, amount, reason, originalTransactionId } = req.body;

      if (!recipientId) {
        return res.status(400).json({ error: 'Recipient is required' });
      }

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: 'Valid amount is required' });
      }

      // Call the database function to create refund
      const { data: result, error } = await supabase.rpc('create_refund_request', {
        p_sender_id: userId,
        p_recipient_id: recipientId,
        p_amount: amount,
        p_reason: reason || null,
        p_original_transaction_id: originalTransactionId || null,
      });

      if (error) {
        console.error('[Refunds] Error creating refund:', error);
        return res.status(500).json({ error: error.message });
      }

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      // Fetch the created refund with full details
      const { data: refundData, error: fetchError } = await supabase
        .from('refund_requests')
        .select(`
          *,
          sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture),
          recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
        `)
        .eq('id', result.refund_id)
        .single();

      if (fetchError) {
        console.error('[Refunds] Error fetching created refund:', fetchError);
        return res.status(201).json({
          success: true,
          refundId: result.refund_id,
          reference: result.reference,
          amount: result.amount,
          releaseAt: result.release_at,
        });
      }

      return res.status(201).json({
        success: true,
        refund: mapRefundRequest(refundData),
      });
    } catch (err: any) {
      console.error('[Refunds] Error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create refund' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * GET /api/refunds/pending - Get pending refunds for user
 */
async function handleRefundsPending(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  const userId = auth.userId!;

  try {
    // Get pending refunds sent by user
    const { data: sent, error: sentError } = await supabase
      .from('refund_requests')
      .select(`
        *,
        recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
      `)
      .eq('sender_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    // Get pending refunds received by user
    const { data: received, error: receivedError } = await supabase
      .from('refund_requests')
      .select(`
        *,
        sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture)
      `)
      .eq('recipient_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (sentError || receivedError) {
      console.error('[Refunds] Error fetching pending:', sentError || receivedError);
      return res.status(500).json({ error: (sentError || receivedError)!.message });
    }

    return res.status(200).json({
      sent: (sent || []).map(mapRefundRequest),
      received: (received || []).map(mapRefundRequest),
    });
  } catch (err: any) {
    console.error('[Refunds] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch pending refunds' });
  }
}

/**
 * GET /api/refunds/:id - Get refund by ID
 */
async function handleRefundById(req: VercelRequest, res: VercelResponse, refundId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  try {
    const { data, error } = await supabase
      .from('refund_requests')
      .select(`
        *,
        sender:users!refund_requests_sender_id_fkey(id, first_name, last_name, email, phone, profile_picture),
        recipient:users!refund_requests_recipient_id_fkey(id, first_name, last_name, email, phone, profile_picture)
      `)
      .eq('id', refundId)
      .single();

    if (error) {
      console.error('[Refunds] Error fetching refund:', error);
      return res.status(404).json({ error: 'Refund not found' });
    }

    // Check if user is sender or recipient
    if (data.sender_id !== auth.userId && data.recipient_id !== auth.userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    return res.status(200).json({ refund: mapRefundRequest(data) });
  } catch (err: any) {
    console.error('[Refunds] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to fetch refund' });
  }
}

/**
 * POST /api/refunds/:id/cancel - Cancel a refund request (by recipient)
 */
async function handleRefundCancel(req: VercelRequest, res: VercelResponse, refundId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await validateSharedApiAuth(req);
  if (!auth.valid) {
    return res.status(401).json({ error: auth.error });
  }

  const userId = auth.userId!;

  try {
    const { reason } = req.body || {};

    // Call the database function to cancel refund
    const { data: result, error } = await supabase.rpc('cancel_refund_request', {
      p_refund_id: refundId,
      p_cancelled_by: userId,
      p_reason: reason || null,
    });

    if (error) {
      console.error('[Refunds] Error cancelling refund:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.status(200).json({
      success: true,
      message: result.message || 'Refund cancelled successfully',
    });
  } catch (err: any) {
    console.error('[Refunds] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to cancel refund' });
  }
}

/**
 * POST /api/cron/process-refunds - Process pending refunds (cron job)
 * This should be called by a cron job to release funds after 5 days
 */
async function handleCronProcessRefunds(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret or admin access
  const cronSecret = req.headers['x-cron-secret'];
  const expectedSecret = process.env.CRON_SECRET || 'peeap-cron-secret';

  if (cronSecret !== expectedSecret) {
    // Also allow admin users
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if user is admin
    const { data: user } = await supabase
      .from('users')
      .select('roles')
      .eq('id', auth.userId)
      .single();

    if (!user || !(user.roles?.includes('admin') || user.roles?.includes('superadmin'))) {
      return res.status(403).json({ error: 'Admin access required' });
    }
  }

  try {
    // Call the database function to process pending refunds
    const { data: result, error } = await supabase.rpc('process_pending_refunds');

    if (error) {
      console.error('[Cron] Error processing refunds:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log('[Cron] Processed refunds:', result);

    return res.status(200).json({
      success: true,
      processed: result.processed,
      errors: result.errors,
    });
  } catch (err: any) {
    console.error('[Cron] Error:', err);
    return res.status(500).json({ error: err.message || 'Failed to process refunds' });
  }
}

// ============================================================================
// EXCHANGE HANDLERS
// ============================================================================

/**
 * Get exchange rate between two currencies
 */
async function handleExchangeRate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const fromCurrency = url.searchParams.get('fromCurrency')?.toUpperCase() || 'USD';
    const toCurrency = url.searchParams.get('toCurrency')?.toUpperCase() || 'SLE';

    const { data: rate, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromCurrency)
      .eq('to_currency', toCurrency)
      .eq('is_active', true)
      .single();

    if (error || !rate) {
      return res.status(404).json({ error: `Exchange rate not found for ${fromCurrency} to ${toCurrency}` });
    }

    const effectiveRate = Number(rate.rate) * (1 - Number(rate.margin_percentage || 0) / 100);

    return res.status(200).json({
      id: rate.id,
      fromCurrency: rate.from_currency,
      toCurrency: rate.to_currency,
      rate: Number(rate.rate),
      marginPercentage: Number(rate.margin_percentage || 0),
      effectiveRate,
      isActive: rate.is_active,
      updatedAt: rate.updated_at,
    });
  } catch (err: any) {
    console.error('[Exchange] Error getting rate:', err);
    return res.status(500).json({ error: err.message || 'Failed to get exchange rate' });
  }
}

/**
 * Calculate exchange preview with fees
 */
async function handleExchangeCalculate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, fromCurrency, toCurrency } = req.body;

    if (!amount || !fromCurrency || !toCurrency) {
      return res.status(400).json({ error: 'amount, fromCurrency, and toCurrency are required' });
    }

    const { data: rate, error: rateError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromCurrency.toUpperCase())
      .eq('to_currency', toCurrency.toUpperCase())
      .eq('is_active', true)
      .single();

    if (rateError || !rate) {
      return res.status(404).json({ error: `Exchange rate not found for ${fromCurrency} to ${toCurrency}` });
    }

    const effectiveRate = Number(rate.rate) * (1 - Number(rate.margin_percentage || 0) / 100);

    let feePercentage = 0;
    const auth = await validateSharedApiAuth(req);
    if (auth.valid && auth.userId) {
      const { data: user } = await supabase
        .from('users')
        .select('roles')
        .eq('id', auth.userId)
        .single();

      if (user?.roles) {
        const { data: permission } = await supabase
          .from('exchange_permissions')
          .select('fee_percentage')
          .eq('user_type', user.roles)
          .single();

        if (permission) {
          feePercentage = Number(permission.fee_percentage || 0);
        }
      }
    }

    const grossAmount = amount * effectiveRate;
    const feeAmount = grossAmount * (feePercentage / 100);
    const netAmount = grossAmount - feeAmount;

    return res.status(200).json({
      fromCurrency: fromCurrency.toUpperCase(),
      toCurrency: toCurrency.toUpperCase(),
      fromAmount: amount,
      toAmount: grossAmount,
      exchangeRate: effectiveRate,
      feeAmount,
      feePercentage,
      netAmount,
    });
  } catch (err: any) {
    console.error('[Exchange] Error calculating:', err);
    return res.status(500).json({ error: err.message || 'Failed to calculate exchange' });
  }
}

/**
 * Check if user can exchange
 */
async function handleCanExchange(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const amount = parseFloat(url.searchParams.get('amount') || '0');

    const { data: user, error: userError } = await supabase
      .from('users')
      .select('roles')
      .eq('id', auth.userId)
      .single();

    if (userError || !user) {
      return res.status(200).json({ allowed: false, reason: 'User not found' });
    }

    const { data: permission, error: permError } = await supabase
      .from('exchange_permissions')
      .select('*')
      .eq('user_type', user.roles)
      .single();

    if (permError || !permission) {
      return res.status(200).json({ allowed: false, reason: 'No exchange permission configured for your account type' });
    }

    if (!permission.can_exchange) {
      return res.status(200).json({ allowed: false, reason: 'Exchange is not enabled for your account type' });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: dailyTxs } = await supabase
      .from('exchange_transactions')
      .select('from_amount, from_currency')
      .eq('user_id', auth.userId)
      .eq('status', 'COMPLETED')
      .gte('created_at', today.toISOString());

    const dailyUsed = (dailyTxs || []).reduce((sum: number, tx: any) => {
      const usdAmount = tx.from_currency === 'USD' ? Number(tx.from_amount) : Number(tx.from_amount) * 0.044444;
      return sum + usdAmount;
    }, 0);

    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data: monthlyTxs } = await supabase
      .from('exchange_transactions')
      .select('from_amount, from_currency')
      .eq('user_id', auth.userId)
      .eq('status', 'COMPLETED')
      .gte('created_at', startOfMonth.toISOString());

    const monthlyUsed = (monthlyTxs || []).reduce((sum: number, tx: any) => {
      const usdAmount = tx.from_currency === 'USD' ? Number(tx.from_amount) : Number(tx.from_amount) * 0.044444;
      return sum + usdAmount;
    }, 0);

    const dailyRemaining = permission.daily_limit ? Number(permission.daily_limit) - dailyUsed : undefined;
    const monthlyRemaining = permission.monthly_limit ? Number(permission.monthly_limit) - monthlyUsed : undefined;

    if (amount > 0) {
      if (permission.daily_limit && dailyUsed + amount > Number(permission.daily_limit)) {
        return res.status(200).json({
          allowed: false,
          reason: 'Daily exchange limit exceeded',
          dailyRemaining,
          monthlyRemaining,
          feePercentage: Number(permission.fee_percentage || 0),
        });
      }

      if (permission.monthly_limit && monthlyUsed + amount > Number(permission.monthly_limit)) {
        return res.status(200).json({
          allowed: false,
          reason: 'Monthly exchange limit exceeded',
          dailyRemaining,
          monthlyRemaining,
          feePercentage: Number(permission.fee_percentage || 0),
        });
      }
    }

    return res.status(200).json({
      allowed: true,
      dailyRemaining,
      monthlyRemaining,
      feePercentage: Number(permission.fee_percentage || 0),
    });
  } catch (err: any) {
    console.error('[Exchange] Error checking permission:', err);
    return res.status(500).json({ error: err.message || 'Failed to check exchange permission' });
  }
}

/**
 * Execute currency exchange
 */
async function handleExchangeExecute(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { fromWalletId, toWalletId, amount } = req.body;

    if (!fromWalletId || !toWalletId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'fromWalletId, toWalletId, and positive amount are required' });
    }

    const { data: fromWallet, error: fromError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', fromWalletId)
      .eq('user_id', auth.userId)
      .single();

    if (fromError || !fromWallet) {
      return res.status(200).json({ success: false, error: 'Source wallet not found or not owned by user' });
    }

    if (fromWallet.status !== 'ACTIVE') {
      return res.status(200).json({ success: false, error: 'Source wallet is not active' });
    }

    if (Number(fromWallet.balance) < amount) {
      return res.status(200).json({ success: false, error: 'Insufficient balance in source wallet' });
    }

    const { data: toWallet, error: toError } = await supabase
      .from('wallets')
      .select('*')
      .eq('id', toWalletId)
      .eq('user_id', auth.userId)
      .single();

    if (toError || !toWallet) {
      return res.status(200).json({ success: false, error: 'Destination wallet not found or not owned by user' });
    }

    if (toWallet.status !== 'ACTIVE') {
      return res.status(200).json({ success: false, error: 'Destination wallet is not active' });
    }

    if (fromWallet.currency === toWallet.currency) {
      return res.status(200).json({ success: false, error: 'Cannot exchange between wallets with same currency. Use transfer instead.' });
    }

    const { data: rate, error: rateError } = await supabase
      .from('exchange_rates')
      .select('*')
      .eq('from_currency', fromWallet.currency)
      .eq('to_currency', toWallet.currency)
      .eq('is_active', true)
      .single();

    if (rateError || !rate) {
      return res.status(200).json({ success: false, error: `Exchange rate not available for ${fromWallet.currency} to ${toWallet.currency}` });
    }

    const { data: user } = await supabase
      .from('users')
      .select('roles')
      .eq('id', auth.userId)
      .single();

    let feePercentage = 0;
    if (user?.roles) {
      const { data: permission } = await supabase
        .from('exchange_permissions')
        .select('fee_percentage')
        .eq('user_type', user.roles)
        .single();

      if (permission) {
        feePercentage = Number(permission.fee_percentage || 0);
      }
    }

    const effectiveRate = Number(rate.rate) * (1 - Number(rate.margin_percentage || 0) / 100);
    const grossAmount = amount * effectiveRate;
    const feeAmount = grossAmount * (feePercentage / 100);
    const netAmount = grossAmount - feeAmount;

    const reference = `EXC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const { error: debitError } = await supabase
      .from('wallets')
      .update({
        balance: Number(fromWallet.balance) - amount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', fromWalletId);

    if (debitError) {
      return res.status(200).json({ success: false, error: 'Failed to debit source wallet' });
    }

    const { error: creditError } = await supabase
      .from('wallets')
      .update({
        balance: Number(toWallet.balance) + netAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('id', toWalletId);

    if (creditError) {
      await supabase
        .from('wallets')
        .update({
          balance: Number(fromWallet.balance),
          updated_at: new Date().toISOString(),
        })
        .eq('id', fromWalletId);

      return res.status(200).json({ success: false, error: 'Failed to credit destination wallet' });
    }

    const { data: transaction, error: txError } = await supabase
      .from('exchange_transactions')
      .insert({
        user_id: auth.userId,
        from_wallet_id: fromWalletId,
        to_wallet_id: toWalletId,
        from_currency: fromWallet.currency,
        to_currency: toWallet.currency,
        from_amount: amount,
        to_amount: netAmount,
        exchange_rate: effectiveRate,
        fee_amount: feeAmount,
        fee_currency: toWallet.currency,
        status: 'COMPLETED',
        reference,
        rate_id: rate.id,
      })
      .select()
      .single();

    if (txError) {
      console.error('[Exchange] Failed to record transaction:', txError);
    }

    const { data: updatedFromWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', fromWalletId)
      .single();

    const { data: updatedToWallet } = await supabase
      .from('wallets')
      .select('balance')
      .eq('id', toWalletId)
      .single();

    return res.status(200).json({
      success: true,
      transaction: transaction ? {
        id: transaction.id,
        fromWalletId: transaction.from_wallet_id,
        toWalletId: transaction.to_wallet_id,
        fromCurrency: transaction.from_currency,
        toCurrency: transaction.to_currency,
        fromAmount: Number(transaction.from_amount),
        toAmount: Number(transaction.to_amount),
        exchangeRate: Number(transaction.exchange_rate),
        feeAmount: Number(transaction.fee_amount),
        status: transaction.status,
        reference: transaction.reference,
        createdAt: transaction.created_at,
      } : undefined,
      fromWalletNewBalance: updatedFromWallet?.balance,
      toWalletNewBalance: updatedToWallet?.balance,
    });
  } catch (err: any) {
    console.error('[Exchange] Error executing:', err);
    return res.status(500).json({ error: err.message || 'Exchange failed' });
  }
}

/**
 * Get user's exchange history
 */
async function handleExchangeHistory(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data: transactions, error, count } = await supabase
      .from('exchange_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', auth.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      data: (transactions || []).map((tx: any) => ({
        id: tx.id,
        fromWalletId: tx.from_wallet_id,
        toWalletId: tx.to_wallet_id,
        fromCurrency: tx.from_currency,
        toCurrency: tx.to_currency,
        fromAmount: Number(tx.from_amount),
        toAmount: Number(tx.to_amount),
        exchangeRate: Number(tx.exchange_rate),
        feeAmount: Number(tx.fee_amount),
        status: tx.status,
        reference: tx.reference,
        createdAt: tx.created_at,
      })),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error('[Exchange] Error getting history:', err);
    return res.status(500).json({ error: err.message || 'Failed to get exchange history' });
  }
}

/**
 * Admin: Get all exchange rates
 */
async function handleExchangeAdminRates(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('roles')
      .eq('id', auth.userId)
      .single();

    if (!user || !['admin', 'superadmin'].includes(user.roles)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: rates, error } = await supabase
      .from('exchange_rates')
      .select('*')
      .order('from_currency', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json((rates || []).map((rate: any) => ({
      id: rate.id,
      fromCurrency: rate.from_currency,
      toCurrency: rate.to_currency,
      rate: Number(rate.rate),
      marginPercentage: Number(rate.margin_percentage || 0),
      effectiveRate: Number(rate.rate) * (1 - Number(rate.margin_percentage || 0) / 100),
      isActive: rate.is_active,
      updatedAt: rate.updated_at,
    })));
  } catch (err: any) {
    console.error('[Exchange Admin] Error getting rates:', err);
    return res.status(500).json({ error: err.message || 'Failed to get exchange rates' });
  }
}

/**
 * Admin: Set exchange rate
 */
async function handleExchangeAdminSetRate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('roles')
      .eq('id', auth.userId)
      .single();

    if (!user || !['admin', 'superadmin'].includes(user.roles)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { fromCurrency, toCurrency, rate, marginPercentage } = req.body;

    if (!fromCurrency || !toCurrency || !rate) {
      return res.status(400).json({ error: 'fromCurrency, toCurrency, and rate are required' });
    }

    const { data: existing } = await supabase
      .from('exchange_rates')
      .select('id')
      .eq('from_currency', fromCurrency.toUpperCase())
      .eq('to_currency', toCurrency.toUpperCase())
      .single();

    let result;
    if (existing) {
      const { data, error } = await supabase
        .from('exchange_rates')
        .update({
          rate,
          margin_percentage: marginPercentage ?? 0,
          set_by: auth.userId,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('exchange_rates')
        .insert({
          from_currency: fromCurrency.toUpperCase(),
          to_currency: toCurrency.toUpperCase(),
          rate,
          margin_percentage: marginPercentage ?? 0,
          set_by: auth.userId,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.status(200).json({
      id: result.id,
      fromCurrency: result.from_currency,
      toCurrency: result.to_currency,
      rate: Number(result.rate),
      marginPercentage: Number(result.margin_percentage || 0),
      effectiveRate: Number(result.rate) * (1 - Number(result.margin_percentage || 0) / 100),
      isActive: result.is_active,
      updatedAt: result.updated_at,
    });
  } catch (err: any) {
    console.error('[Exchange Admin] Error setting rate:', err);
    return res.status(500).json({ error: err.message || 'Failed to set exchange rate' });
  }
}

/**
 * Admin: Get all exchange permissions
 */
async function handleExchangeAdminPermissions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('roles')
      .eq('id', auth.userId)
      .single();

    if (!user || !['admin', 'superadmin'].includes(user.roles)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { data: permissions, error } = await supabase
      .from('exchange_permissions')
      .select('*')
      .order('user_type', { ascending: true });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json((permissions || []).map((p: any) => ({
      id: p.id,
      userType: p.user_type,
      canExchange: p.can_exchange,
      dailyLimit: p.daily_limit ? Number(p.daily_limit) : undefined,
      monthlyLimit: p.monthly_limit ? Number(p.monthly_limit) : undefined,
      minAmount: p.min_amount ? Number(p.min_amount) : undefined,
      maxAmount: p.max_amount ? Number(p.max_amount) : undefined,
      feePercentage: Number(p.fee_percentage || 0),
      updatedAt: p.updated_at,
    })));
  } catch (err: any) {
    console.error('[Exchange Admin] Error getting permissions:', err);
    return res.status(500).json({ error: err.message || 'Failed to get exchange permissions' });
  }
}

/**
 * Admin: Set exchange permission for user type
 */
async function handleExchangeAdminSetPermission(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('roles')
      .eq('id', auth.userId)
      .single();

    if (!user || user.roles !== 'superadmin') {
      return res.status(403).json({ error: 'Superadmin access required' });
    }

    const { userType, canExchange, dailyLimit, monthlyLimit, minAmount, maxAmount, feePercentage } = req.body;

    if (!userType || canExchange === undefined) {
      return res.status(400).json({ error: 'userType and canExchange are required' });
    }

    const { data: existing } = await supabase
      .from('exchange_permissions')
      .select('id')
      .eq('user_type', userType)
      .single();

    let result;
    if (existing) {
      const updateData: any = {
        can_exchange: canExchange,
        updated_at: new Date().toISOString(),
      };
      if (dailyLimit !== undefined) updateData.daily_limit = dailyLimit;
      if (monthlyLimit !== undefined) updateData.monthly_limit = monthlyLimit;
      if (minAmount !== undefined) updateData.min_amount = minAmount;
      if (maxAmount !== undefined) updateData.max_amount = maxAmount;
      if (feePercentage !== undefined) updateData.fee_percentage = feePercentage;

      const { data, error } = await supabase
        .from('exchange_permissions')
        .update(updateData)
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      const { data, error } = await supabase
        .from('exchange_permissions')
        .insert({
          user_type: userType,
          can_exchange: canExchange,
          daily_limit: dailyLimit,
          monthly_limit: monthlyLimit,
          min_amount: minAmount ?? 1,
          max_amount: maxAmount,
          fee_percentage: feePercentage ?? 0,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    return res.status(200).json({
      id: result.id,
      userType: result.user_type,
      canExchange: result.can_exchange,
      dailyLimit: result.daily_limit ? Number(result.daily_limit) : undefined,
      monthlyLimit: result.monthly_limit ? Number(result.monthly_limit) : undefined,
      minAmount: result.min_amount ? Number(result.min_amount) : undefined,
      maxAmount: result.max_amount ? Number(result.max_amount) : undefined,
      feePercentage: Number(result.fee_percentage || 0),
      updatedAt: result.updated_at,
    });
  } catch (err: any) {
    console.error('[Exchange Admin] Error setting permission:', err);
    return res.status(500).json({ error: err.message || 'Failed to set exchange permission' });
  }
}

/**
 * Admin: Get all exchange transactions
 */
async function handleExchangeAdminTransactions(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateSharedApiAuth(req);
    if (!auth.valid || !auth.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data: user } = await supabase
      .from('users')
      .select('roles')
      .eq('id', auth.userId)
      .single();

    if (!user || !['admin', 'superadmin'].includes(user.roles)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    const { data: transactions, error, count } = await supabase
      .from('exchange_transactions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      data: (transactions || []).map((tx: any) => ({
        id: tx.id,
        userId: tx.user_id,
        fromWalletId: tx.from_wallet_id,
        toWalletId: tx.to_wallet_id,
        fromCurrency: tx.from_currency,
        toCurrency: tx.to_currency,
        fromAmount: Number(tx.from_amount),
        toAmount: Number(tx.to_amount),
        exchangeRate: Number(tx.exchange_rate),
        feeAmount: Number(tx.fee_amount),
        status: tx.status,
        reference: tx.reference,
        createdAt: tx.created_at,
      })),
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (err: any) {
    console.error('[Exchange Admin] Error getting transactions:', err);
    return res.status(500).json({ error: err.message || 'Failed to get exchange transactions' });
  }
}

// ============================================================================
// KYC VERIFICATION HANDLERS
// ============================================================================

/**
 * Helper function to authenticate user for KYC routes
 */
async function authenticateKycUser(req: VercelRequest): Promise<{ userId: string; user: any } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return null;
  }

  // Support both "Bearer" and "Session" prefixes
  let token = '';
  if (authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  } else if (authHeader.startsWith('Session ')) {
    token = authHeader.slice(8);
  } else {
    return null;
  }

  // Try Supabase auth first
  const { data: { user }, error: authError } = await supabaseAnon.auth.getUser(token);

  if (!authError && user) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userData) {
      return { userId: user.id, user: userData };
    }
  }

  // Fall back to custom session token (stored in sso_tokens table)
  const { data: ssoSession } = await supabase
    .from('sso_tokens')
    .select('user_id')
    .eq('token', token)
    .in('target_app', ['peeap-pay', 'my'])
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (ssoSession) {
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', ssoSession.user_id)
      .single();

    if (userData) {
      return { userId: ssoSession.user_id, user: userData };
    }
  }

  return null;
}

/**
 * GET /api/kyc/verification/status
 * Get verification status for the authenticated user
 */
async function handleKycVerificationStatus(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateKycUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId, user } = auth;

    // Get the latest KYC application
    const { data: kycApplication } = await supabase
      .from('kyc_applications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const metadata = user.metadata || {};
    const slVerification = kycApplication?.verification_result?.slVerification;

    const hasIdVerification = !!(
      slVerification?.nin ||
      kycApplication?.verification_result?.extractedData?.documentNumber ||
      metadata.nin
    );

    const hasPhoneVerification = !!(
      slVerification?.phoneVerified ||
      metadata.phoneVerifiedAt
    );

    const hasNameMatch = (slVerification?.nameMatchScore || 0) >= 70;
    const overallVerified = hasIdVerification && hasPhoneVerification && hasNameMatch;

    // Calculate verification percentage
    let percentage = 0;
    if (hasIdVerification) percentage += 40;
    if (hasPhoneVerification) percentage += 30;
    if (hasNameMatch) percentage += 30;

    // Determine pending steps
    const pendingSteps: string[] = [];
    if (!hasIdVerification) pendingSteps.push('Upload Sierra Leone National ID');
    if (!hasPhoneVerification) pendingSteps.push('Verify phone number');
    if (hasIdVerification && hasPhoneVerification && !hasNameMatch) {
      pendingSteps.push('Name verification pending');
    }

    return res.status(200).json({
      userId,
      hasIdVerification,
      hasPhoneVerification,
      hasNameMatch,
      overallVerified,
      verificationPercentage: percentage,
      pendingSteps,
      idCardName: slVerification?.idCardName || kycApplication?.verification_result?.extractedData?.fullName,
      simRegisteredName: slVerification?.simRegisteredName,
      nin: slVerification?.nin || kycApplication?.verification_result?.extractedData?.documentNumber || metadata.nin,
      phoneNumber: slVerification?.phoneNumber || metadata.phoneVerifiedNumber,
    });
  } catch (error: any) {
    console.error('[KYC] Error getting verification status:', error);
    return res.status(500).json({ error: error.message || 'Failed to get verification status' });
  }
}

/**
 * GET /api/kyc/verification/required
 * Check if verification is required for the user
 */
async function handleKycVerificationRequired(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateKycUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { userId, user } = auth;

    // Check if user is already verified
    if (user.kyc_status === 'approved' || user.kyc_tier >= 2) {
      return res.status(200).json({ required: false });
    }

    // Get the latest KYC application
    const { data: kycApplication } = await supabase
      .from('kyc_applications')
      .select('status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (kycApplication?.status === 'APPROVED') {
      return res.status(200).json({ required: false });
    }

    return res.status(200).json({
      required: true,
      reason: 'Complete your identity verification to unlock all features',
      verificationUrl: '/verify',
    });
  } catch (error: any) {
    console.error('[KYC] Error checking verification required:', error);
    return res.status(500).json({ error: error.message || 'Failed to check verification status' });
  }
}

/**
 * POST /api/kyc/verification/provider-kyc
 * Get SIM registered name from Monime provider KYC
 */
async function handleKycProviderKyc(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateKycUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { phoneNumber, provider } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Normalize phone number for storage (with +232 prefix)
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    if (normalized.startsWith('+232')) {
      // Already has country code
    } else if (normalized.startsWith('232')) {
      normalized = `+${normalized}`;
    } else if (normalized.startsWith('0')) {
      normalized = `+232${normalized.substring(1)}`;
    } else if (normalized.length === 8) {
      normalized = `+232${normalized}`;
    }

    // Get local number (without country code) for provider detection
    const localNumber = normalized.replace('+232', '').replace('232', '');

    // Detect provider from phone number if not provided
    let detectedProvider = provider;
    if (!detectedProvider) {
      if (/^(76|77|78)/.test(localNumber) || /^(0?76|0?77|0?78)/.test(localNumber)) {
        detectedProvider = 'orange';
      } else if (/^(30|33|34|88|99)/.test(localNumber) || /^(0?30|0?33|0?34|0?88|0?99)/.test(localNumber)) {
        detectedProvider = 'africell';
      } else if (/^(25|31|32)/.test(localNumber) || /^(0?25|0?31|0?32)/.test(localNumber)) {
        detectedProvider = 'qcell';
      }
    }

    // Map provider names to Monime provider IDs
    const providerIdMap: Record<string, string> = {
      'orange': 'orange-money-sl',
      'africell': 'afrimoney-sl',
      'qcell': 'qmoney-sl',
    };

    const providerId = providerIdMap[detectedProvider?.toLowerCase()] || 'orange-money-sl';

    // Format account number for Monime API: must be local format with leading 0
    // Monime expects: 072334047 (not +23272334047 or 23272334047)
    let accountNumber = localNumber;
    // If number doesn't start with 0, add it
    if (!accountNumber.startsWith('0')) {
      accountNumber = '0' + accountNumber;
    }

    console.log(`[KYC] Provider KYC lookup - Original: ${phoneNumber}, Normalized: ${normalized}, Monime format: ${accountNumber}, Provider: ${providerId}`);

    // Create Monime service and lookup account
    const monimeService = await createMonimeService(supabase, SETTINGS_ID);
    const result = await monimeService.lookupAccountName(providerId, accountNumber);

    if (result.verified && result.accountName) {
      return res.status(200).json({
        success: true,
        data: {
          accountHolderName: result.accountName,
          accountNumber: result.accountNumber,
          provider: detectedProvider || 'unknown',
          kycStatus: 'verified',
        },
      });
    } else {
      return res.status(200).json({
        success: false,
        error: 'Could not verify phone number with provider',
      });
    }
  } catch (error: any) {
    console.error('[KYC] Error getting provider KYC:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get provider KYC'
    });
  }
}

/**
 * POST /api/kyc/verification/match-names
 * Check if ID name matches SIM registered name
 */
async function handleKycMatchNames(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateKycUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { idFirstName, idLastName, simRegisteredName } = req.body;

    if (!simRegisteredName) {
      return res.status(400).json({ error: 'SIM registered name is required' });
    }

    // Simple name matching algorithm
    const normalizeStr = (s: string) => s?.toLowerCase().trim().replace(/[^a-z\s]/g, '') || '';

    const firstName = normalizeStr(idFirstName);
    const lastName = normalizeStr(idLastName);
    const fullName = `${firstName} ${lastName}`.trim();
    const simName = normalizeStr(simRegisteredName);
    const simParts = simName.split(/\s+/);

    // Check for matches
    const firstNameMatch = simParts.some(part =>
      part === firstName ||
      firstName.includes(part) ||
      part.includes(firstName)
    );

    const lastNameMatch = simParts.some(part =>
      part === lastName ||
      lastName.includes(part) ||
      part.includes(lastName)
    );

    // Calculate similarity score
    let score = 0;
    if (firstNameMatch) score += 40;
    if (lastNameMatch) score += 40;

    // Bonus for full match
    if (simName === fullName || simName.includes(fullName) || fullName.includes(simName)) {
      score += 20;
    } else if (firstNameMatch && lastNameMatch) {
      score += 20;
    }

    // Cap at 100
    score = Math.min(score, 100);

    return res.status(200).json({
      match: score >= 70,
      score,
      details: {
        firstNameMatch,
        lastNameMatch,
        fullNameSimilarity: score / 100,
      },
    });
  } catch (error: any) {
    console.error('[KYC] Error matching names:', error);
    return res.status(500).json({ error: error.message || 'Failed to match names' });
  }
}

/**
 * POST /api/kyc/verification/phone/initiate
 * Initiate phone OTP verification
 * Note: OTP via SMS is a fallback - primary method is provider KYC lookup
 */
async function handleKycPhoneInitiate(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateKycUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const requestId = randomUUID();

    // For now, log it for development (OTP SMS sending not yet implemented)
    console.log(`[KYC] OTP for ${phoneNumber}: ${otp} (requestId: ${requestId})`);

    // Note: In production, we would:
    // 1. Store the OTP in a verification_otps table
    // 2. Send the OTP via SMS using Monime or another provider

    return res.status(200).json({
      success: true,
      message: 'OTP verification is not yet implemented. Please use the Verify Phone button which uses provider KYC lookup.',
      requestId,
    });
  } catch (error: any) {
    console.error('[KYC] Error initiating phone verification:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to send verification code'
    });
  }
}

/**
 * POST /api/kyc/verification/phone/verify
 * Verify phone with OTP
 * Note: OTP verification is a fallback - primary method is provider KYC lookup
 */
async function handleKycPhoneVerify(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateKycUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { phoneNumber, otp, requestId } = req.body;

    if (!phoneNumber || !otp || !requestId) {
      return res.status(400).json({ error: 'Phone number, OTP, and request ID are required' });
    }

    // Note: OTP verification table not yet implemented
    // For now, return an error guiding user to use provider KYC
    return res.status(200).json({
      success: false,
      verified: false,
      message: 'OTP verification is not yet implemented. Phone verification happens automatically via provider KYC lookup.',
    });
  } catch (error: any) {
    console.error('[KYC] Error verifying phone OTP:', error);
    return res.status(500).json({
      success: false,
      verified: false,
      message: error.message || 'Failed to verify phone'
    });
  }
}

/**
 * POST /api/kyc/verification/sierra-leone
 * Submit Sierra Leone ID verification (simplified for Vercel API)
 */
async function handleKycSierraLeoneVerification(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await authenticateKycUser(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { idCardFrontBase64, selfieBase64, mimeType, phoneNumber } = req.body;

    console.log('[KYC] SL Verification request:', {
      hasIdCard: !!idCardFrontBase64,
      idCardLength: idCardFrontBase64?.length || 0,
      hasSelfie: !!selfieBase64,
      selfieLength: selfieBase64?.length || 0,
      mimeType,
      phoneNumber,
    });

    if (!idCardFrontBase64 || !phoneNumber) {
      return res.status(400).json({ error: 'ID card image and phone number are required' });
    }

    const { userId, user } = auth;
    console.log('[KYC] Authenticated user:', userId, 'email:', user?.email);
    const issues: string[] = [];

    // Normalize phone number for storage (with +232 prefix)
    let normalized = phoneNumber.replace(/[^\d+]/g, '');
    if (normalized.startsWith('+232')) {
      // Already correct
    } else if (normalized.startsWith('232')) {
      normalized = `+${normalized}`;
    } else if (normalized.startsWith('0')) {
      normalized = `+232${normalized.substring(1)}`;
    } else if (normalized.length === 8) {
      normalized = `+232${normalized}`;
    }

    // Get local number (without country code)
    const localNumber = normalized.replace('+232', '').replace('232', '');

    // Detect provider
    let provider = 'unknown';
    if (/^(76|77|78)/.test(localNumber) || /^(0?76|0?77|0?78)/.test(localNumber)) {
      provider = 'orange';
    } else if (/^(30|33|34|88|99)/.test(localNumber) || /^(0?30|0?33|0?34|0?88|0?99)/.test(localNumber)) {
      provider = 'africell';
    } else if (/^(25|31|32)/.test(localNumber) || /^(0?25|0?31|0?32)/.test(localNumber)) {
      provider = 'qcell';
    }

    // Get SIM registered name from provider
    let simRegisteredName = '';
    let phoneVerified = false;

    try {
      const providerIdMap: Record<string, string> = {
        'orange': 'orange-money-sl',
        'africell': 'afrimoney-sl',
        'qcell': 'qmoney-sl',
      };
      const providerId = providerIdMap[provider] || 'orange-money-sl';

      // Format account number for Monime API: must be local format with leading 0
      let accountNumber = localNumber;
      if (!accountNumber.startsWith('0')) {
        accountNumber = '0' + accountNumber;
      }

      console.log(`[KYC] SL Verification - Phone: ${phoneNumber}, Normalized: ${normalized}, Monime format: ${accountNumber}, Provider: ${providerId}`);

      const monimeService = await createMonimeService(supabase, SETTINGS_ID);
      const result = await monimeService.lookupAccountName(providerId, accountNumber);

      if (result.verified && result.accountName) {
        simRegisteredName = result.accountName;
        phoneVerified = true;
      } else {
        issues.push('Could not verify phone number with provider');
      }
    } catch (error: any) {
      console.error('[KYC] Error getting provider KYC:', error);
      issues.push('Phone verification service unavailable');
    }

    // Create or update KYC application
    const verificationResultData = {
      documentCheck: true,
      faceMatch: !!selfieBase64,
      addressVerified: false,
      watchlistClear: true,
      riskScore: 0,
      notes: `Sierra Leone ID verification. Phone: ${normalized}`,
      documentType: 'SIERRA_LEONE_NID',
      idCardImage: idCardFrontBase64,
      idCardImageMimeType: mimeType || 'image/jpeg',
      idCardCapturedAt: new Date().toISOString(),
      // Selfie image for admin verification
      selfieImage: selfieBase64 || null,
      selfieImageMimeType: selfieBase64 ? 'image/jpeg' : null,
      selfieCapturedAt: selfieBase64 ? new Date().toISOString() : null,
      slVerification: {
        phoneNumber: normalized,
        simRegisteredName,
        phoneVerified,
        nameMatchScore: 0,
        verificationMethod: 'provider_kyc',
        verified: false,
        completedAt: undefined as string | undefined,
      },
      issues,
      ocrProcessedAt: new Date().toISOString(),
    };

    // Check for existing application
    const { data: existingApp } = await supabase
      .from('kyc_applications')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let kycApplicationId: string;

    if (existingApp) {
      // Update existing
      const { error: updateError } = await supabase
        .from('kyc_applications')
        .update({
          verification_result: verificationResultData,
          status: 'PENDING',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingApp.id);

      if (updateError) {
        console.error('[KYC] Error updating kyc_applications:', updateError);
        throw new Error(`Database update failed: ${updateError.message}`);
      }
      kycApplicationId = existingApp.id;
    } else {
      // Create new
      const { data: newApp, error: insertError } = await supabase
        .from('kyc_applications')
        .insert({
          user_id: userId,
          status: 'PENDING',
          type: 'INDIVIDUAL',
          verification_result: verificationResultData,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('[KYC] Error inserting kyc_applications:', insertError);
        throw new Error(`Database insert failed: ${insertError.message}`);
      }
      kycApplicationId = newApp?.id || '';
    }

    // If phone verified, update user metadata
    if (phoneVerified) {
      await supabase
        .from('users')
        .update({
          metadata: {
            ...user.metadata,
            phoneVerifiedAt: new Date().toISOString(),
            phoneVerifiedNumber: normalized,
          },
        })
        .eq('id', userId);
    }

    return res.status(200).json({
      success: true,
      verified: false, // Always requires manual review for ID verification
      stage: phoneVerified ? 'name_matching' : 'phone_verification',
      phoneVerification: {
        verified: phoneVerified,
        simRegisteredName,
        phoneNumber: normalized,
        provider,
        issues: phoneVerified ? [] : issues,
        verificationMethod: 'provider_kyc',
      },
      issues,
      requiresManualReview: true,
      kycApplicationId,
    });
  } catch (error: any) {
    console.error('[KYC] Error processing Sierra Leone verification:', error);
    return res.status(500).json({ error: error.message || 'Failed to process verification' });
  }
}

// ============================================================================
// PAYMENT INTENTS HANDLERS
// ============================================================================

/**
 * Validate API key and get merchant
 */
async function validateApiKey(req: VercelRequest): Promise<{ merchantId: string; mode: 'live' | 'test' } | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const apiKey = authHeader.substring(7);
  const isLiveKey = apiKey.startsWith('pk_live_') || apiKey.startsWith('sk_live_');
  const isTestKey = apiKey.startsWith('pk_test_') || apiKey.startsWith('sk_test_');

  if (!isLiveKey && !isTestKey) {
    return null;
  }

  const mode = isLiveKey ? 'live' : 'test';

  // Determine which column to search based on key type
  let keyColumn: string;
  if (apiKey.startsWith('sk_live_')) {
    keyColumn = 'live_secret_key';
  } else if (apiKey.startsWith('pk_live_')) {
    keyColumn = 'live_public_key';
  } else if (apiKey.startsWith('sk_test_')) {
    keyColumn = 'test_secret_key';
  } else {
    keyColumn = 'test_public_key';
  }

  // Look up the API key in the merchant_businesses table
  const { data: merchant, error } = await supabase
    .from('merchant_businesses')
    .select('id, status')
    .eq(keyColumn, apiKey)
    .single();

  if (error || !merchant || merchant.status !== 'ACTIVE') {
    return null;
  }

  return { merchantId: merchant.id, mode };
}

/**
 * Create Payment Intent - POST /v1/payment-intents
 */
async function handlePaymentIntents(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateApiKey(req);
    if (!auth) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { amount, currency, description, metadata, capture_method, payment_method_types } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount is required and must be a positive number' });
    }

    if (!currency || typeof currency !== 'string') {
      return res.status(400).json({ error: 'currency is required' });
    }

    const externalId = `pi_${randomUUID().replace(/-/g, '')}`;
    const clientSecret = `${externalId}_secret_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const { data: intent, error } = await supabase
      .from('payment_intents')
      .insert({
        external_id: externalId,
        merchant_id: auth.merchantId,
        amount,
        currency: currency.toUpperCase(),
        status: 'requires_payment_method',
        client_secret: clientSecret,
        description: description || null,
        metadata: metadata || {},
        capture_method: capture_method || 'automatic',
        payment_methods_allowed: payment_method_types || ['wallet', 'card', 'qr', 'nfc'],
        expires_at: expiresAt.toISOString(),
        qr_code_url: `https://my.peeap.com/i/${externalId}`,
      })
      .select()
      .single();

    if (error) {
      console.error('[PaymentIntents] Create error:', error);
      return res.status(500).json({ error: 'Failed to create payment intent' });
    }

    return res.status(201).json({
      id: intent.external_id,
      object: 'payment_intent',
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      client_secret: intent.client_secret,
      description: intent.description,
      metadata: intent.metadata,
      capture_method: intent.capture_method,
      payment_method_types: intent.payment_methods_allowed,
      qr_code_url: intent.qr_code_url,
      expires_at: Math.floor(new Date(intent.expires_at).getTime() / 1000),
      created: Math.floor(new Date(intent.created_at).getTime() / 1000),
      livemode: auth.mode === 'live',
    });
  } catch (error: any) {
    console.error('[PaymentIntents] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Create Payment Intent with Public Key - POST /v1/payment-intents/public
 *
 * This endpoint allows frontend/browser-based payment intent creation using public keys.
 * Perfect for: localhost development, v0.dev, Vercel previews, any frontend-only environment.
 *
 * Usage:
 *   POST https://api.peeap.com/api/v1/payment-intents/public
 *   Body: { publicKey, amount, currency, description }
 */
async function handlePaymentIntentsPublic(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { publicKey, amount, currency, description, reference, metadata } = req.body;

    // Validate public key
    if (!publicKey || typeof publicKey !== 'string') {
      return res.status(400).json({ error: 'publicKey is required' });
    }

    if (!publicKey.startsWith('pk_live_') && !publicKey.startsWith('pk_test_')) {
      return res.status(400).json({ error: 'Invalid public key format. Must start with pk_live_ or pk_test_' });
    }

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: 'amount is required and must be a positive number' });
    }

    // Determine mode and key column
    const isLiveKey = publicKey.startsWith('pk_live_');
    const mode = isLiveKey ? 'live' : 'test';
    const keyColumn = isLiveKey ? 'live_public_key' : 'test_public_key';

    // Look up the merchant by public key
    const { data: merchant, error: merchantError } = await supabase
      .from('merchant_businesses')
      .select('id, name, status')
      .eq(keyColumn, publicKey)
      .single();

    if (merchantError || !merchant) {
      console.error('[PaymentIntentsPublic] Merchant lookup error:', merchantError);
      return res.status(401).json({ error: 'Invalid public key' });
    }

    if (merchant.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Merchant account is not active' });
    }

    // Create payment intent
    const externalId = `pi_${randomUUID().replace(/-/g, '')}`;
    const clientSecret = `${externalId}_secret_${randomUUID().replace(/-/g, '').substring(0, 24)}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    const qrCodeUrl = `https://my.peeap.com/i/${externalId}`;

    const { data: intent, error: insertError } = await supabase
      .from('payment_intents')
      .insert({
        external_id: externalId,
        merchant_id: merchant.id,
        amount,
        currency: (currency || 'SLE').toUpperCase(),
        status: 'requires_payment_method',
        client_secret: clientSecret,
        description: description || null,
        metadata: { ...(metadata || {}), reference: reference || null },
        capture_method: 'automatic',
        payment_methods_allowed: ['wallet', 'card', 'qr', 'nfc', 'mobile_money'],
        expires_at: expiresAt.toISOString(),
        qr_code_url: qrCodeUrl,
      })
      .select()
      .single();

    if (insertError) {
      console.error('[PaymentIntentsPublic] Create error:', insertError);
      return res.status(500).json({ error: 'Failed to create payment intent' });
    }

    // Return response optimized for frontend use
    return res.status(201).json({
      id: intent.external_id,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      description: intent.description,
      qr_code_url: intent.qr_code_url,
      qr_code_image: `https://api.peeap.com/api/v1/payment-intents/${intent.external_id}/qr`,
      pay_url: qrCodeUrl,
      expires_at: Math.floor(new Date(intent.expires_at).getTime() / 1000),
      created: Math.floor(new Date(intent.created_at).getTime() / 1000),
      livemode: mode === 'live',
      merchant_name: merchant.name,
    });
  } catch (error: any) {
    console.error('[PaymentIntentsPublic] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Check Payment Intent Status (Public) - GET /v1/payment-intents/:id/status
 *
 * Public endpoint for checking payment status without authentication.
 * Used by frontend polling to detect when payment is complete.
 */
async function handlePaymentIntentStatusPublic(req: VercelRequest, res: VercelResponse, intentId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data: intent, error } = await supabase
      .from('payment_intents')
      .select('external_id, status, amount, currency, transaction_id, succeeded_at')
      .eq('external_id', intentId)
      .single();

    if (error || !intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    return res.status(200).json({
      id: intent.external_id,
      status: intent.status,
      paid: intent.status === 'succeeded',
      amount: intent.amount,
      currency: intent.currency,
      transaction_id: intent.transaction_id,
      completed_at: intent.succeeded_at ? Math.floor(new Date(intent.succeeded_at).getTime() / 1000) : null,
    });
  } catch (error: any) {
    console.error('[PaymentIntentStatusPublic] Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get Payment Intent - GET /v1/payment-intents/:id
 */
async function handlePaymentIntentById(req: VercelRequest, res: VercelResponse, intentId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateApiKey(req);
    if (!auth) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { data: intent, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('external_id', intentId)
      .eq('merchant_id', auth.merchantId)
      .single();

    if (error || !intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    return res.status(200).json({
      id: intent.external_id,
      object: 'payment_intent',
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
      client_secret: intent.client_secret,
      description: intent.description,
      metadata: intent.metadata,
      capture_method: intent.capture_method,
      payment_method_types: intent.payment_methods_allowed,
      payment_method: intent.payment_method_type,
      qr_code_url: intent.qr_code_url,
      expires_at: Math.floor(new Date(intent.expires_at).getTime() / 1000),
      created: Math.floor(new Date(intent.created_at).getTime() / 1000),
      livemode: true,
    });
  } catch (error: any) {
    console.error('[PaymentIntents] Get error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Confirm Payment Intent - POST /v1/payment-intents/:id/confirm
 */
async function handlePaymentIntentConfirm(req: VercelRequest, res: VercelResponse, intentId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { payment_method, payer_wallet_id } = req.body;

    // Get the intent
    const { data: intent, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('external_id', intentId)
      .single();

    if (fetchError || !intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    if (intent.status !== 'requires_payment_method' && intent.status !== 'requires_confirmation') {
      return res.status(400).json({ error: `Cannot confirm payment intent in status: ${intent.status}` });
    }

    // For wallet payments, we need the payer's wallet
    if (payment_method === 'wallet' && payer_wallet_id) {
      // Get payer wallet
      const { data: payerWallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, user_id, balance, currency')
        .eq('id', payer_wallet_id)
        .single();

      if (walletError || !payerWallet) {
        return res.status(404).json({ error: 'Payer wallet not found' });
      }

      if (payerWallet.balance < intent.amount) {
        return res.status(400).json({ error: 'Insufficient funds' });
      }

      // Get merchant's primary wallet
      const { data: merchantWallet, error: merchantWalletError } = await supabase
        .from('wallets')
        .select('id, user_id, balance')
        .eq('business_id', intent.merchant_id)
        .eq('wallet_type', 'primary')
        .single();

      if (merchantWalletError || !merchantWallet) {
        return res.status(404).json({ error: 'Merchant wallet not found' });
      }

      // Perform the transfer
      const { error: debitError } = await supabase
        .from('wallets')
        .update({ balance: payerWallet.balance - intent.amount })
        .eq('id', payerWallet.id);

      if (debitError) {
        return res.status(500).json({ error: 'Failed to debit payer wallet' });
      }

      const { error: creditError } = await supabase
        .from('wallets')
        .update({ balance: merchantWallet.balance + intent.amount })
        .eq('id', merchantWallet.id);

      if (creditError) {
        // Rollback debit
        await supabase
          .from('wallets')
          .update({ balance: payerWallet.balance })
          .eq('id', payerWallet.id);
        return res.status(500).json({ error: 'Failed to credit merchant wallet' });
      }

      // Create transaction records
      const transactionId = randomUUID();
      await supabase.from('transactions').insert([
        {
          id: transactionId,
          wallet_id: payerWallet.id,
          user_id: payerWallet.user_id,
          type: 'payment',
          amount: -intent.amount,
          currency: intent.currency,
          status: 'completed',
          description: intent.description || 'Payment Intent',
          reference: intentId,
        },
        {
          id: randomUUID(),
          wallet_id: merchantWallet.id,
          user_id: merchantWallet.user_id,
          type: 'payment',
          amount: intent.amount,
          currency: intent.currency,
          status: 'completed',
          description: intent.description || 'Payment Intent',
          reference: intentId,
        },
      ]);

      // Update intent status
      const { data: updatedIntent, error: updateError } = await supabase
        .from('payment_intents')
        .update({
          status: 'succeeded',
          payment_method_type: 'wallet',
          confirmed_at: new Date().toISOString(),
          succeeded_at: new Date().toISOString(),
          transaction_id: transactionId,
        })
        .eq('external_id', intentId)
        .select()
        .single();

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update payment intent' });
      }

      return res.status(200).json({
        id: updatedIntent.external_id,
        object: 'payment_intent',
        amount: updatedIntent.amount,
        currency: updatedIntent.currency,
        status: updatedIntent.status,
        payment_method: updatedIntent.payment_method_type,
        created: Math.floor(new Date(updatedIntent.created_at).getTime() / 1000),
        livemode: true,
      });
    }

    // Update intent to requires_confirmation or processing
    const { data: updatedIntent, error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: 'requires_confirmation',
        payment_method_type: payment_method || null,
      })
      .eq('external_id', intentId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update payment intent' });
    }

    return res.status(200).json({
      id: updatedIntent.external_id,
      object: 'payment_intent',
      amount: updatedIntent.amount,
      currency: updatedIntent.currency,
      status: updatedIntent.status,
      payment_method: updatedIntent.payment_method_type,
      created: Math.floor(new Date(updatedIntent.created_at).getTime() / 1000),
      livemode: true,
    });
  } catch (error: any) {
    console.error('[PaymentIntents] Confirm error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Capture Payment Intent - POST /v1/payment-intents/:id/capture
 */
async function handlePaymentIntentCapture(req: VercelRequest, res: VercelResponse, intentId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateApiKey(req);
    if (!auth) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { data: intent, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('external_id', intentId)
      .eq('merchant_id', auth.merchantId)
      .single();

    if (fetchError || !intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    if (intent.status !== 'requires_capture') {
      return res.status(400).json({ error: `Cannot capture payment intent in status: ${intent.status}` });
    }

    const { data: updatedIntent, error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: 'succeeded',
        captured_at: new Date().toISOString(),
      })
      .eq('external_id', intentId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to capture payment intent' });
    }

    return res.status(200).json({
      id: updatedIntent.external_id,
      object: 'payment_intent',
      amount: updatedIntent.amount,
      currency: updatedIntent.currency,
      status: updatedIntent.status,
      created: Math.floor(new Date(updatedIntent.created_at).getTime() / 1000),
      livemode: true,
    });
  } catch (error: any) {
    console.error('[PaymentIntents] Capture error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Cancel Payment Intent - POST /v1/payment-intents/:id/cancel
 */
async function handlePaymentIntentCancel(req: VercelRequest, res: VercelResponse, intentId: string) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateApiKey(req);
    if (!auth) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { data: intent, error: fetchError } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('external_id', intentId)
      .eq('merchant_id', auth.merchantId)
      .single();

    if (fetchError || !intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    if (intent.status === 'succeeded' || intent.status === 'canceled') {
      return res.status(400).json({ error: `Cannot cancel payment intent in status: ${intent.status}` });
    }

    const { data: updatedIntent, error: updateError } = await supabase
      .from('payment_intents')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
      })
      .eq('external_id', intentId)
      .select()
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to cancel payment intent' });
    }

    return res.status(200).json({
      id: updatedIntent.external_id,
      object: 'payment_intent',
      amount: updatedIntent.amount,
      currency: updatedIntent.currency,
      status: updatedIntent.status,
      created: Math.floor(new Date(updatedIntent.created_at).getTime() / 1000),
      livemode: true,
    });
  } catch (error: any) {
    console.error('[PaymentIntents] Cancel error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Get QR Code for Payment Intent - GET /v1/payment-intents/:id/qr
 */
async function handlePaymentIntentQr(req: VercelRequest, res: VercelResponse, intentId: string) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await validateApiKey(req);
    if (!auth) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    const { data: intent, error } = await supabase
      .from('payment_intents')
      .select('*')
      .eq('external_id', intentId)
      .eq('merchant_id', auth.merchantId)
      .single();

    if (error || !intent) {
      return res.status(404).json({ error: 'Payment intent not found' });
    }

    // Generate payment URL
    const baseUrl = process.env.APP_URL || 'https://peeap.com';
    const paymentUrl = `${baseUrl}/i/${intentId}`;

    return res.status(200).json({
      id: intent.external_id,
      object: 'payment_intent_qr',
      payment_url: paymentUrl,
      qr_code_url: intent.qr_code_url,
      amount: intent.amount,
      currency: intent.currency,
      status: intent.status,
    });
  } catch (error: any) {
    console.error('[PaymentIntents] QR error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
