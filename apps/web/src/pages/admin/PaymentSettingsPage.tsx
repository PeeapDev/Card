/**
 * Payment Settings Page
 *
 * Admin page to manage:
 * - Monime API configuration
 * - Withdrawal/Payout settings
 * - Deposit methods
 * - Payment gateway settings
 *
 * Updated: Direct Supabase connection (no backend required)
 */

import { useState, useEffect } from 'react';
import {
  Settings,
  CreditCard,
  Building2,
  Smartphone,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Wallet,
  Link as LinkIcon,
  Key,
  TestTube,
  Globe,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { createClient } from '@supabase/supabase-js';

// Direct Supabase connection for settings
const supabaseUrl = 'https://akiecgwcxadcpqlvntmf.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFraWVjZ3djeGFkY3BxbHZudG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyODMzMzIsImV4cCI6MjA3OTg1OTMzMn0.L2ePGMJRjBqHS-M1d9mxys7I9bZv93YYr9dzQzCQINE';
const supabase = createClient(supabaseUrl, supabaseKey);

const SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

interface MonimeConfig {
  accessToken: string;
  spaceId: string;
  webhookSecret: string;
  sourceAccountId: string;
  payoutAccountId: string;
  isEnabled: boolean;
  backendUrl: string;
  frontendUrl: string;
}

interface WithdrawalSettings {
  mobileMoneyEnabled: boolean;
  bankTransferEnabled: boolean;
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  dailyWithdrawalLimit: number;
  withdrawalFeePercent: number;
  withdrawalFeeFlat: number;
  requirePin: boolean;
  autoApproveUnder: number;
}

interface DepositSettings {
  checkoutSessionEnabled: boolean;
  paymentCodeEnabled: boolean;
  mobileMoneyEnabled: boolean;
  minDepositAmount: number;
  maxDepositAmount: number;
}

const DEFAULT_MONIME_CONFIG: MonimeConfig = {
  accessToken: '',
  spaceId: '',
  webhookSecret: '',
  sourceAccountId: '',
  payoutAccountId: '',
  isEnabled: false,
  backendUrl: '',
  frontendUrl: '',
};

// SLE uses whole units (no minor units) - amounts are stored as whole SLE values
const DEFAULT_WITHDRAWAL_SETTINGS: WithdrawalSettings = {
  mobileMoneyEnabled: true,
  bankTransferEnabled: true,
  minWithdrawalAmount: 1000, // Le 1,000
  maxWithdrawalAmount: 50000000, // Le 50,000,000
  dailyWithdrawalLimit: 100000000, // Le 100,000,000
  withdrawalFeePercent: 1.5,
  withdrawalFeeFlat: 100, // Le 100
  requirePin: true,
  autoApproveUnder: 1000000, // Le 1,000,000 - auto approve withdrawals under this amount
};

const DEFAULT_DEPOSIT_SETTINGS: DepositSettings = {
  checkoutSessionEnabled: true,
  paymentCodeEnabled: true,
  mobileMoneyEnabled: true,
  minDepositAmount: 100, // Le 100
  maxDepositAmount: 100000000, // Le 100,000,000
};

export function PaymentSettingsPage() {
  const [monimeConfig, setMonimeConfig] = useState<MonimeConfig>(DEFAULT_MONIME_CONFIG);
  const [withdrawalSettings, setWithdrawalSettings] = useState<WithdrawalSettings>(DEFAULT_WITHDRAWAL_SETTINGS);
  const [depositSettings, setDepositSettings] = useState<DepositSettings>(DEFAULT_DEPOSIT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  const [activeTab, setActiveTab] = useState<'monime' | 'withdrawal' | 'deposit'>('monime');
  const [testAmount, setTestAmount] = useState<number>(1000); // Default Le 1,000

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Fetch directly from Supabase
      const { data: settings, error: fetchError } = await supabase
        .from('payment_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (fetchError) {
        // If no settings exist, try to create default
        if (fetchError.code === 'PGRST116') {
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
            throw new Error('Failed to initialize settings: ' + insertError.message);
          }

          if (newSettings) {
            applySettingsToState(newSettings);
          }
          return;
        }
        throw new Error(fetchError.message);
      }

      if (settings) {
        applySettingsToState(settings);
      }
    } catch (err: any) {
      console.error('Failed to fetch settings:', err);
      setError(err.message || 'Failed to load settings from database.');
    } finally {
      setLoading(false);
    }
  };

  const applySettingsToState = (settings: any) => {
    setMonimeConfig({
      accessToken: settings.monime_access_token || '',
      spaceId: settings.monime_space_id || '',
      webhookSecret: settings.monime_webhook_secret || '',
      sourceAccountId: settings.monime_source_account_id || '',
      payoutAccountId: settings.monime_payout_account_id || '',
      isEnabled: settings.monime_enabled || false,
      backendUrl: settings.backend_url || '',
      frontendUrl: settings.frontend_url || '',
    });

    setWithdrawalSettings({
      mobileMoneyEnabled: settings.withdrawal_mobile_money_enabled ?? true,
      bankTransferEnabled: settings.withdrawal_bank_transfer_enabled ?? true,
      minWithdrawalAmount: Number(settings.min_withdrawal_amount) || 1000,
      maxWithdrawalAmount: Number(settings.max_withdrawal_amount) || 50000000,
      dailyWithdrawalLimit: Number(settings.daily_withdrawal_limit) || 100000000,
      withdrawalFeePercent: Number(settings.withdrawal_fee_percent) || 1.5,
      withdrawalFeeFlat: Number(settings.withdrawal_fee_flat) || 100,
      requirePin: settings.withdrawal_require_pin ?? true,
      autoApproveUnder: Number(settings.withdrawal_auto_approve_under) || 1000000,
    });

    setDepositSettings({
      checkoutSessionEnabled: settings.deposit_checkout_enabled ?? true,
      paymentCodeEnabled: settings.deposit_payment_code_enabled ?? true,
      mobileMoneyEnabled: settings.deposit_mobile_money_enabled ?? true,
      minDepositAmount: Number(settings.min_deposit_amount) || 100,
      maxDepositAmount: Number(settings.max_deposit_amount) || 100000000,
    });
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      // Transform to database format (snake_case)
      const settingsData = {
        // Monime Config
        monime_access_token: monimeConfig.accessToken,
        monime_space_id: monimeConfig.spaceId,
        monime_webhook_secret: monimeConfig.webhookSecret,
        monime_source_account_id: monimeConfig.sourceAccountId,
        monime_payout_account_id: monimeConfig.payoutAccountId,
        monime_enabled: monimeConfig.isEnabled,
        // URL Configuration (required for Monime checkout redirects)
        backend_url: monimeConfig.backendUrl,
        frontend_url: monimeConfig.frontendUrl,
        // Withdrawal Settings
        withdrawal_mobile_money_enabled: withdrawalSettings.mobileMoneyEnabled,
        withdrawal_bank_transfer_enabled: withdrawalSettings.bankTransferEnabled,
        min_withdrawal_amount: withdrawalSettings.minWithdrawalAmount,
        max_withdrawal_amount: withdrawalSettings.maxWithdrawalAmount,
        daily_withdrawal_limit: withdrawalSettings.dailyWithdrawalLimit,
        withdrawal_fee_percent: withdrawalSettings.withdrawalFeePercent,
        withdrawal_fee_flat: withdrawalSettings.withdrawalFeeFlat,
        withdrawal_require_pin: withdrawalSettings.requirePin,
        withdrawal_auto_approve_under: withdrawalSettings.autoApproveUnder,
        // Deposit Settings
        deposit_checkout_enabled: depositSettings.checkoutSessionEnabled,
        deposit_payment_code_enabled: depositSettings.paymentCodeEnabled,
        deposit_mobile_money_enabled: depositSettings.mobileMoneyEnabled,
        min_deposit_amount: depositSettings.minDepositAmount,
        max_deposit_amount: depositSettings.maxDepositAmount,
        // Update timestamp
        updated_at: new Date().toISOString(),
      };

      // Save directly to Supabase
      const { error: updateError } = await supabase
        .from('payment_settings')
        .update(settingsData)
        .eq('id', SETTINGS_ID);

      if (updateError) {
        // If row doesn't exist, try insert
        if (updateError.code === 'PGRST116') {
          const { error: insertError } = await supabase
            .from('payment_settings')
            .insert({ id: SETTINGS_ID, ...settingsData });

          if (insertError) {
            throw new Error(insertError.message);
          }
        } else {
          throw new Error(updateError.message);
        }
      }

      setSuccess('Payment settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setError(null);

    try {
      // Validate required fields first
      if (!monimeConfig.accessToken) {
        throw new Error('Access Token is required. Please enter your Monime API key.');
      }
      if (!monimeConfig.spaceId) {
        throw new Error('Space ID is required. Please enter your Monime Space ID.');
      }
      if (!monimeConfig.frontendUrl) {
        throw new Error('Frontend URL is required. Please enter your app URL (e.g., https://my.peeap.com).');
      }
      if (testAmount <= 0) {
        throw new Error('Test amount must be greater than 0.');
      }

      // Use API endpoints for Monime callbacks (they handle POST/GET and redirect to frontend)
      const baseUrl = monimeConfig.frontendUrl.replace(/\/$/, ''); // Remove trailing slash
      const successUrl = `${baseUrl}/api/deposit/success`;
      const cancelUrl = `${baseUrl}/api/deposit/cancel`;

        spaceId: monimeConfig.spaceId,
        tokenPrefix: monimeConfig.accessToken.substring(0, 10) + '...',
        amount: testAmount,
        successUrl,
        cancelUrl,
      });

      // Call Monime API via serverless function
      const response = await fetch('/api/test-monime', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: monimeConfig.accessToken,
          spaceId: monimeConfig.spaceId,
          amount: testAmount,
          currency: 'SLE',
          successUrl,
          cancelUrl,
        }),
      });


      const data = await response.json() as any;

      if (!response.ok) {
        // Parse detailed error from Monime
        const errorMsg = data?.error?.message
          || data?.message
          || data?.error
          || `HTTP ${response.status}: ${response.statusText}`;
        const errorDetails = data?.error?.details || data?.details || '';
        const fullError = errorDetails ? `${errorMsg} - ${JSON.stringify(errorDetails)}` : errorMsg;
        console.error('[Monime Test] API Error:', fullError);
        throw new Error(fullError);
      }

      if (!data.success) {
        const errorMsg = data?.error?.message || data?.message || 'Unknown error from Monime';
        console.error('[Monime Test] Success=false:', errorMsg);
        throw new Error(errorMsg);
      }

      // Open Monime checkout page in new tab
      if (data?.url) {
        window.open(data.url, '_blank');
        setSuccess(`Checkout session created! Order: ${data.orderNumber || 'N/A'}`);
        setTimeout(() => setSuccess(null), 5000);
      } else {
        console.error('[Monime Test] No redirect URL in response');
        throw new Error('No checkout URL returned from Monime. Response: ' + JSON.stringify(data));
      }
    } catch (err: any) {
      console.error('[Monime Test] Error:', err);
      const errorMessage = err.message || 'Unknown error';
      setError(`Monime Error: ${errorMessage}`);
    } finally {
      setTesting(false);
    }
  };

  // SLE uses whole units (no minor units) - amounts are stored and displayed as-is
  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  };

  const parseAmount = (displayAmount: string): number => {
    const num = parseFloat(displayAmount.replace(/,/g, ''));
    return isNaN(num) ? 0 : Math.round(num);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 dark:text-primary-400 animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">Configure payment gateway, withdrawals, and deposits</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchSettings}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <button
              onClick={saveSettings}
              disabled={saving}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save All Settings
            </button>
          </div>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-400">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-400">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex gap-6">
            {[
              { id: 'monime', label: 'Monime Gateway', icon: CreditCard },
              { id: 'withdrawal', label: 'Withdrawal Settings', icon: ArrowDownToLine },
              { id: 'deposit', label: 'Deposit Settings', icon: ArrowUpFromLine },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Monime Configuration Tab */}
        {activeTab === 'monime' && (
          <div className="space-y-6">
            {/* Enable/Disable Toggle */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${monimeConfig.isEnabled ? 'bg-green-100 dark:bg-green-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <Globe className={`w-5 h-5 ${monimeConfig.isEnabled ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Monime Payment Gateway</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Enable Monime for deposits and withdrawals</p>
                  </div>
                  {monimeConfig.accessToken && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      monimeConfig.accessToken.startsWith('mon_test_')
                        ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    }`}>
                      {monimeConfig.accessToken.startsWith('mon_test_') ? 'Test Mode' : 'Live Mode'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setMonimeConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                  className={`p-2 rounded-lg transition-colors ${
                    monimeConfig.isEnabled ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {monimeConfig.isEnabled ? (
                    <ToggleRight className="w-8 h-8" />
                  ) : (
                    <ToggleLeft className="w-8 h-8" />
                  )}
                </button>
              </div>
            </Card>

            {/* API Credentials */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">API Credentials</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Your Monime API keys from the dashboard</p>
                </div>
                <button
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="ml-auto p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  title={showSecrets ? 'Hide secrets' : 'Show secrets'}
                >
                  {showSecrets ? <EyeOff className="w-4 h-4 text-gray-500 dark:text-gray-400" /> : <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />}
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Access Token</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={monimeConfig.accessToken}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                    placeholder="mon_test_xxxxx (test) or mon_xxxxx (live)"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Token prefix determines environment: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">mon_test_</code> for testing, <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">mon_</code> for live
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Space ID</label>
                  <input
                    type="text"
                    value={monimeConfig.spaceId}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, spaceId: e.target.value }))}
                    placeholder="spc_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Your Monime workspace identifier</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Webhook Secret</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={monimeConfig.webhookSecret}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, webhookSecret: e.target.value }))}
                    placeholder="whsec_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Used to verify webhook signatures</p>
                </div>

                {/* Webhook URL */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Webhook URL</label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Use this URL when configuring webhooks in your Monime dashboard</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                      {window.location.origin}/api/webhooks/monime
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/monime`);
                        setSuccess('Webhook URL copied to clipboard!');
                        setTimeout(() => setSuccess(null), 2000);
                      }}
                      className="px-3 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    For production, replace with your actual domain: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">https://yourdomain.com/api/webhooks/monime</code>
                  </p>
                </div>
              </div>
            </Card>

            {/* Account IDs */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Financial Accounts</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Monime financial account IDs for payouts</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Source Account ID</label>
                  <input
                    type="text"
                    value={monimeConfig.sourceAccountId}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, sourceAccountId: e.target.value }))}
                    placeholder="fa_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Account to debit for payouts</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payout Account ID</label>
                  <input
                    type="text"
                    value={monimeConfig.payoutAccountId}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, payoutAccountId: e.target.value }))}
                    placeholder="fa_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Account for receiving payouts</p>
                </div>
              </div>
            </Card>

            {/* URL Configuration */}
            <Card className="p-6 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-900/20">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <LinkIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">URL Configuration</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Required for Monime checkout redirects</p>
                </div>
                <span className="ml-auto px-2 py-1 text-xs font-medium rounded-full bg-orange-200 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400">
                  Required
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    <strong>Important:</strong> These URLs are required for Monime to redirect users after payment.
                    They must be publicly accessible URLs (not localhost).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Backend API URL</label>
                  <input
                    type="text"
                    value={monimeConfig.backendUrl}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, backendUrl: e.target.value }))}
                    placeholder="https://api.yourdomain.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The URL where your backend API is hosted (e.g., https://api.yourdomain.com)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Frontend App URL</label>
                  <input
                    type="text"
                    value={monimeConfig.frontendUrl}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, frontendUrl: e.target.value }))}
                    placeholder="https://app.yourdomain.com"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    The URL where your frontend app is hosted (e.g., https://app.yourdomain.com)
                  </p>
                </div>

                {(!monimeConfig.backendUrl || !monimeConfig.frontendUrl) && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700 dark:text-red-400">
                      Both URLs must be configured for Monime payments to work. Without these, checkout sessions will fail with "successUrl must be a URL address" error.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Test Payment */}
            <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3 mb-4">
                <TestTube className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-300">Test Payment</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400">Create a test checkout session to verify your Monime integration</p>
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">Test Amount (SLE)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">Le</span>
                    <input
                      type="text"
                      value={formatAmount(testAmount)}
                      onChange={(e) => setTestAmount(parseAmount(e.target.value))}
                      placeholder="10.00"
                      className="w-full pl-10 pr-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Enter any amount for testing</p>
                </div>

                <button
                  onClick={testConnection}
                  disabled={testing || !monimeConfig.accessToken || !monimeConfig.spaceId || testAmount <= 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                  {testing ? 'Creating...' : 'Open Checkout'}
                </button>
              </div>

              {(!monimeConfig.accessToken || !monimeConfig.spaceId) && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-3 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Please enter your Access Token and Space ID above to test payments
                </p>
              )}
            </Card>
          </div>
        )}

        {/* Withdrawal Settings Tab */}
        {activeTab === 'withdrawal' && (
          <div className="space-y-6">
            {/* Withdrawal Methods */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <ArrowDownToLine className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Withdrawal Methods</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable or disable withdrawal options</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 ${
                  withdrawalSettings.mobileMoneyEnabled ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Mobile Money</span>
                    </div>
                    <button
                      onClick={() => setWithdrawalSettings(prev => ({ ...prev, mobileMoneyEnabled: !prev.mobileMoneyEnabled }))}
                      className={`p-1 rounded ${withdrawalSettings.mobileMoneyEnabled ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      {withdrawalSettings.mobileMoneyEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allow withdrawals to mobile money wallets</p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  withdrawalSettings.bankTransferEnabled ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Bank Transfer</span>
                    </div>
                    <button
                      onClick={() => setWithdrawalSettings(prev => ({ ...prev, bankTransferEnabled: !prev.bankTransferEnabled }))}
                      className={`p-1 rounded ${withdrawalSettings.bankTransferEnabled ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      {withdrawalSettings.bankTransferEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allow withdrawals to bank accounts</p>
                </div>
              </div>
            </Card>

            {/* Withdrawal Limits */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Withdrawal Limits</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Set minimum, maximum, and daily limits (in SLE)</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.minWithdrawalAmount)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        minWithdrawalAmount: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maximum Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.maxWithdrawalAmount)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        maxWithdrawalAmount: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Daily Limit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.dailyWithdrawalLimit)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        dailyWithdrawalLimit: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Withdrawal Fees */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Withdrawal Fees</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Configure fees for withdrawals</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fee Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={withdrawalSettings.withdrawalFeePercent}
                    onChange={(e) => setWithdrawalSettings(prev => ({
                      ...prev,
                      withdrawalFeePercent: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Flat Fee (Le)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.withdrawalFeeFlat)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        withdrawalFeeFlat: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  <strong>Fee Formula:</strong> {withdrawalSettings.withdrawalFeePercent}% + Le {formatAmount(withdrawalSettings.withdrawalFeeFlat)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Example: For Le 10,000 withdrawal = Le {formatAmount(10000 * withdrawalSettings.withdrawalFeePercent / 100 + withdrawalSettings.withdrawalFeeFlat)} fee
                </p>
              </div>
            </Card>

            {/* Security Settings */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Security & Approval</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Configure withdrawal security settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Require PIN for withdrawals</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Users must enter their PIN to confirm withdrawals</p>
                  </div>
                  <button
                    onClick={() => setWithdrawalSettings(prev => ({ ...prev, requirePin: !prev.requirePin }))}
                    className={`p-1 rounded ${withdrawalSettings.requirePin ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                  >
                    {withdrawalSettings.requirePin ? (
                      <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Auto-Approve Under (Le)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.autoApproveUnder)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        autoApproveUnder: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Withdrawals under this amount are automatically approved</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Deposit Settings Tab */}
        {activeTab === 'deposit' && (
          <div className="space-y-6">
            {/* Deposit Methods */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <ArrowUpFromLine className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deposit Methods</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable or disable deposit options</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border-2 ${
                  depositSettings.checkoutSessionEnabled ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Checkout</span>
                    </div>
                    <button
                      onClick={() => setDepositSettings(prev => ({ ...prev, checkoutSessionEnabled: !prev.checkoutSessionEnabled }))}
                      className={`p-1 rounded ${depositSettings.checkoutSessionEnabled ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      {depositSettings.checkoutSessionEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Monime checkout page</p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  depositSettings.paymentCodeEnabled ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <span className="font-medium text-gray-900 dark:text-white">USSD Code</span>
                    </div>
                    <button
                      onClick={() => setDepositSettings(prev => ({ ...prev, paymentCodeEnabled: !prev.paymentCodeEnabled }))}
                      className={`p-1 rounded ${depositSettings.paymentCodeEnabled ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      {depositSettings.paymentCodeEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Payment via USSD code</p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  depositSettings.mobileMoneyEnabled ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                      <span className="font-medium text-gray-900 dark:text-white">Mobile Money</span>
                    </div>
                    <button
                      onClick={() => setDepositSettings(prev => ({ ...prev, mobileMoneyEnabled: !prev.mobileMoneyEnabled }))}
                      className={`p-1 rounded ${depositSettings.mobileMoneyEnabled ? 'bg-green-200 dark:bg-green-900/50' : 'bg-gray-200 dark:bg-gray-600'}`}
                    >
                      {depositSettings.mobileMoneyEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400 dark:text-gray-500" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Direct mobile money</p>
                </div>
              </div>
            </Card>

            {/* Deposit Limits */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Deposit Limits</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Set minimum and maximum deposit amounts (in SLE)</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Minimum Deposit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">Le</span>
                    <input
                      type="text"
                      value={formatAmount(depositSettings.minDepositAmount)}
                      onChange={(e) => setDepositSettings(prev => ({
                        ...prev,
                        minDepositAmount: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maximum Deposit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500 dark:text-gray-400">Le</span>
                    <input
                      type="text"
                      value={formatAmount(depositSettings.maxDepositAmount)}
                      onChange={(e) => setDepositSettings(prev => ({
                        ...prev,
                        maxDepositAmount: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
