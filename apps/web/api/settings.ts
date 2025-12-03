import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NDI4MzMzMiwiZXhwIjoyMDc5ODU5MzMyfQ.q8R8t_aHiMReEIpeJIV-m0RCEA-n0_RDOtTX8bLJgYs';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';

// Use service key for admin operations (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Default settings ID (single row for global settings)
const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    switch (req.method) {
      case 'GET':
        return await handleGetSettings(res);
      case 'PUT':
        return await handleUpdateSettings(req, res);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('Settings API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

async function handleGetSettings(res: VercelResponse) {
  // Try to get existing settings
  let { data: settings, error } = await supabase
    .from('payment_settings')
    .select('*')
    .eq('id', SETTINGS_ID)
    .single();

  // If no settings exist, create default
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
      // Try to fetch again in case of race condition
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

  // Transform to frontend format (snake_case to camelCase)
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

  // Build update object (camelCase to snake_case)
  const updateData: Record<string, any> = {};

  // Monime Config
  if (body.monimeAccessToken !== undefined) updateData.monime_access_token = body.monimeAccessToken;
  if (body.monimeSpaceId !== undefined) updateData.monime_space_id = body.monimeSpaceId;
  if (body.monimeWebhookSecret !== undefined) updateData.monime_webhook_secret = body.monimeWebhookSecret;
  if (body.monimeSourceAccountId !== undefined) updateData.monime_source_account_id = body.monimeSourceAccountId;
  if (body.monimePayoutAccountId !== undefined) updateData.monime_payout_account_id = body.monimePayoutAccountId;
  if (body.monimeEnabled !== undefined) updateData.monime_enabled = body.monimeEnabled;

  // URL Configuration
  if (body.backendUrl !== undefined) updateData.backend_url = body.backendUrl;
  if (body.frontendUrl !== undefined) updateData.frontend_url = body.frontendUrl;

  // Withdrawal Settings
  if (body.withdrawalMobileMoneyEnabled !== undefined) updateData.withdrawal_mobile_money_enabled = body.withdrawalMobileMoneyEnabled;
  if (body.withdrawalBankTransferEnabled !== undefined) updateData.withdrawal_bank_transfer_enabled = body.withdrawalBankTransferEnabled;
  if (body.minWithdrawalAmount !== undefined) updateData.min_withdrawal_amount = body.minWithdrawalAmount;
  if (body.maxWithdrawalAmount !== undefined) updateData.max_withdrawal_amount = body.maxWithdrawalAmount;
  if (body.dailyWithdrawalLimit !== undefined) updateData.daily_withdrawal_limit = body.dailyWithdrawalLimit;
  if (body.withdrawalFeePercent !== undefined) updateData.withdrawal_fee_percent = body.withdrawalFeePercent;
  if (body.withdrawalFeeFlat !== undefined) updateData.withdrawal_fee_flat = body.withdrawalFeeFlat;
  if (body.withdrawalRequirePin !== undefined) updateData.withdrawal_require_pin = body.withdrawalRequirePin;
  if (body.withdrawalAutoApproveUnder !== undefined) updateData.withdrawal_auto_approve_under = body.withdrawalAutoApproveUnder;

  // Deposit Settings
  if (body.depositCheckoutEnabled !== undefined) updateData.deposit_checkout_enabled = body.depositCheckoutEnabled;
  if (body.depositPaymentCodeEnabled !== undefined) updateData.deposit_payment_code_enabled = body.depositPaymentCodeEnabled;
  if (body.depositMobileMoneyEnabled !== undefined) updateData.deposit_mobile_money_enabled = body.depositMobileMoneyEnabled;
  if (body.minDepositAmount !== undefined) updateData.min_deposit_amount = body.minDepositAmount;
  if (body.maxDepositAmount !== undefined) updateData.max_deposit_amount = body.maxDepositAmount;

  // Update timestamp
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('payment_settings')
    .update(updateData)
    .eq('id', SETTINGS_ID)
    .select()
    .single();

  if (error) {
    // If no row exists, try to insert
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
