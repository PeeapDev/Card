/**
 * Payment Settings Page
 *
 * Admin page to manage:
 * - Monime API configuration
 * - Withdrawal/Payout settings
 * - Deposit methods
 * - Payment gateway settings
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

// API endpoint for payment settings
const SETTINGS_API = '/api/settings';

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

const DEFAULT_WITHDRAWAL_SETTINGS: WithdrawalSettings = {
  mobileMoneyEnabled: true,
  bankTransferEnabled: true,
  minWithdrawalAmount: 1000, // 10.00 in minor units (SLE)
  maxWithdrawalAmount: 50000000, // 500,000.00 in minor units
  dailyWithdrawalLimit: 100000000, // 1,000,000.00 in minor units
  withdrawalFeePercent: 1.5,
  withdrawalFeeFlat: 100, // 1.00 in minor units
  requirePin: true,
  autoApproveUnder: 1000000, // 10,000.00 - auto approve withdrawals under this amount
};

const DEFAULT_DEPOSIT_SETTINGS: DepositSettings = {
  checkoutSessionEnabled: true,
  paymentCodeEnabled: true,
  mobileMoneyEnabled: true,
  minDepositAmount: 100, // 1.00 in minor units
  maxDepositAmount: 100000000, // 1,000,000.00 in minor units
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
  const [testAmount, setTestAmount] = useState<number>(1000); // Default 10.00 SLE in minor units

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(SETTINGS_API);

      if (!response.ok) {
        throw new Error('Failed to fetch settings from server');
      }

      const data = await response.json();

      if (data.monimeConfig) {
        setMonimeConfig({
          ...DEFAULT_MONIME_CONFIG,
          ...data.monimeConfig,
        });
      }

      if (data.withdrawalSettings) {
        setWithdrawalSettings({
          ...DEFAULT_WITHDRAWAL_SETTINGS,
          ...data.withdrawalSettings,
        });
      }

      if (data.depositSettings) {
        setDepositSettings({
          ...DEFAULT_DEPOSIT_SETTINGS,
          ...data.depositSettings,
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
      setError('Failed to load settings from server. Make sure account-service is running.');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      // Transform to database format
      const settingsData = {
        // Monime Config
        monimeAccessToken: monimeConfig.accessToken,
        monimeSpaceId: monimeConfig.spaceId,
        monimeWebhookSecret: monimeConfig.webhookSecret,
        monimeSourceAccountId: monimeConfig.sourceAccountId,
        monimePayoutAccountId: monimeConfig.payoutAccountId,
        monimeEnabled: monimeConfig.isEnabled,
        // URL Configuration (required for Monime checkout redirects)
        backendUrl: monimeConfig.backendUrl,
        frontendUrl: monimeConfig.frontendUrl,
        // Withdrawal Settings
        withdrawalMobileMoneyEnabled: withdrawalSettings.mobileMoneyEnabled,
        withdrawalBankTransferEnabled: withdrawalSettings.bankTransferEnabled,
        minWithdrawalAmount: withdrawalSettings.minWithdrawalAmount,
        maxWithdrawalAmount: withdrawalSettings.maxWithdrawalAmount,
        dailyWithdrawalLimit: withdrawalSettings.dailyWithdrawalLimit,
        withdrawalFeePercent: withdrawalSettings.withdrawalFeePercent,
        withdrawalFeeFlat: withdrawalSettings.withdrawalFeeFlat,
        withdrawalRequirePin: withdrawalSettings.requirePin,
        withdrawalAutoApproveUnder: withdrawalSettings.autoApproveUnder,
        // Deposit Settings
        depositCheckoutEnabled: depositSettings.checkoutSessionEnabled,
        depositPaymentCodeEnabled: depositSettings.paymentCodeEnabled,
        depositMobileMoneyEnabled: depositSettings.mobileMoneyEnabled,
        minDepositAmount: depositSettings.minDepositAmount,
        maxDepositAmount: depositSettings.maxDepositAmount,
      };

      const response = await fetch(SETTINGS_API, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settingsData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
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
      // Call backend endpoint to create checkout session
      // Note: successUrl and cancelUrl are handled by the backend to ensure proper payment verification
      const response = await fetch(`${SETTINGS_API}/test-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accessToken: monimeConfig.accessToken,
          spaceId: monimeConfig.spaceId,
          amount: testAmount,
          currency: 'SLE',
          // Don't pass successUrl/cancelUrl - let backend handle them for proper verification flow
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Open Monime checkout page in new tab
      if (data.url) {
        window.open(data.url, '_blank');
        setSuccess('Checkout session created! Opening Monime payment page...');
        setTimeout(() => setSuccess(null), 5000);
      } else {
        throw new Error('No checkout URL returned from Monime');
      }
    } catch (err: any) {
      setError('Test payment failed: ' + (err.message || 'Unknown error'));
    } finally {
      setTesting(false);
    }
  };

  const formatAmount = (amountInMinor: number): string => {
    return (amountInMinor / 100).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const parseAmount = (displayAmount: string): number => {
    const num = parseFloat(displayAmount.replace(/,/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
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
            <h1 className="text-2xl font-bold text-gray-900">Payment Settings</h1>
            <p className="text-gray-500">Configure payment gateway, withdrawals, and deposits</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchSettings}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
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
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <XCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
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
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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
                  <div className={`p-2 rounded-lg ${monimeConfig.isEnabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                    <Globe className={`w-5 h-5 ${monimeConfig.isEnabled ? 'text-green-600' : 'text-gray-500'}`} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Monime Payment Gateway</h2>
                    <p className="text-sm text-gray-500">Enable Monime for deposits and withdrawals</p>
                  </div>
                  {monimeConfig.accessToken && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      monimeConfig.accessToken.startsWith('mon_test_')
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {monimeConfig.accessToken.startsWith('mon_test_') ? 'Test Mode' : 'Live Mode'}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setMonimeConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                  className={`p-2 rounded-lg transition-colors ${
                    monimeConfig.isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
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
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">API Credentials</h2>
                  <p className="text-sm text-gray-500">Your Monime API keys from the dashboard</p>
                </div>
                <button
                  onClick={() => setShowSecrets(!showSecrets)}
                  className="ml-auto p-2 hover:bg-gray-100 rounded-lg"
                  title={showSecrets ? 'Hide secrets' : 'Show secrets'}
                >
                  {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Access Token</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={monimeConfig.accessToken}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, accessToken: e.target.value }))}
                    placeholder="mon_test_xxxxx (test) or mon_xxxxx (live)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Token prefix determines environment: <code className="bg-gray-100 px-1 rounded">mon_test_</code> for testing, <code className="bg-gray-100 px-1 rounded">mon_</code> for live
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Space ID</label>
                  <input
                    type="text"
                    value={monimeConfig.spaceId}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, spaceId: e.target.value }))}
                    placeholder="spc_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Your Monime workspace identifier</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={monimeConfig.webhookSecret}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, webhookSecret: e.target.value }))}
                    placeholder="whsec_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used to verify webhook signatures</p>
                </div>

                {/* Webhook URL */}
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                  <p className="text-xs text-gray-500 mb-2">Use this URL when configuring webhooks in your Monime dashboard</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-mono text-gray-800 overflow-x-auto">
                      {window.location.origin}/api/webhooks/monime
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/monime`);
                        setSuccess('Webhook URL copied to clipboard!');
                        setTimeout(() => setSuccess(null), 2000);
                      }}
                      className="px-3 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    For production, replace with your actual domain: <code className="bg-gray-100 px-1 rounded">https://yourdomain.com/api/webhooks/monime</code>
                  </p>
                </div>
              </div>
            </Card>

            {/* Account IDs */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Financial Accounts</h2>
                  <p className="text-sm text-gray-500">Monime financial account IDs for payouts</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Account ID</label>
                  <input
                    type="text"
                    value={monimeConfig.sourceAccountId}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, sourceAccountId: e.target.value }))}
                    placeholder="fa_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Account to debit for payouts</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payout Account ID</label>
                  <input
                    type="text"
                    value={monimeConfig.payoutAccountId}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, payoutAccountId: e.target.value }))}
                    placeholder="fa_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Account for receiving payouts</p>
                </div>
              </div>
            </Card>

            {/* URL Configuration */}
            <Card className="p-6 border-orange-200 bg-orange-50">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <LinkIcon className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">URL Configuration</h2>
                  <p className="text-sm text-gray-500">Required for Monime checkout redirects</p>
                </div>
                <span className="ml-auto px-2 py-1 text-xs font-medium rounded-full bg-orange-200 text-orange-700">
                  Required
                </span>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-white rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800">
                    <strong>Important:</strong> These URLs are required for Monime to redirect users after payment.
                    They must be publicly accessible URLs (not localhost).
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Backend API URL</label>
                  <input
                    type="text"
                    value={monimeConfig.backendUrl}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, backendUrl: e.target.value }))}
                    placeholder="https://api.yourdomain.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The URL where your backend API is hosted (e.g., https://api.yourdomain.com)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frontend App URL</label>
                  <input
                    type="text"
                    value={monimeConfig.frontendUrl}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, frontendUrl: e.target.value }))}
                    placeholder="https://app.yourdomain.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The URL where your frontend app is hosted (e.g., https://app.yourdomain.com)
                  </p>
                </div>

                {(!monimeConfig.backendUrl || !monimeConfig.frontendUrl) && (
                  <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-red-700">
                      Both URLs must be configured for Monime payments to work. Without these, checkout sessions will fail with "successUrl must be a URL address" error.
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Test Payment */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3 mb-4">
                <TestTube className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-medium text-blue-900">Test Payment</h3>
                  <p className="text-sm text-blue-700">Create a test checkout session to verify your Monime integration</p>
                </div>
              </div>

              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-blue-900 mb-1">Test Amount (SLE)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Le</span>
                    <input
                      type="text"
                      value={formatAmount(testAmount)}
                      onChange={(e) => setTestAmount(parseAmount(e.target.value))}
                      placeholder="10.00"
                      className="w-full pl-10 pr-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    />
                  </div>
                  <p className="text-xs text-blue-600 mt-1">Enter any amount for testing</p>
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
                <p className="text-xs text-red-600 mt-3 flex items-center gap-1">
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
                <div className="p-2 bg-orange-100 rounded-lg">
                  <ArrowDownToLine className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Withdrawal Methods</h2>
                  <p className="text-sm text-gray-500">Enable or disable withdrawal options</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 ${
                  withdrawalSettings.mobileMoneyEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">Mobile Money</span>
                    </div>
                    <button
                      onClick={() => setWithdrawalSettings(prev => ({ ...prev, mobileMoneyEnabled: !prev.mobileMoneyEnabled }))}
                      className={`p-1 rounded ${withdrawalSettings.mobileMoneyEnabled ? 'bg-green-200' : 'bg-gray-200'}`}
                    >
                      {withdrawalSettings.mobileMoneyEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">Allow withdrawals to mobile money wallets</p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  withdrawalSettings.bankTransferEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Bank Transfer</span>
                    </div>
                    <button
                      onClick={() => setWithdrawalSettings(prev => ({ ...prev, bankTransferEnabled: !prev.bankTransferEnabled }))}
                      className={`p-1 rounded ${withdrawalSettings.bankTransferEnabled ? 'bg-green-200' : 'bg-gray-200'}`}
                    >
                      {withdrawalSettings.bankTransferEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">Allow withdrawals to bank accounts</p>
                </div>
              </div>
            </Card>

            {/* Withdrawal Limits */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Withdrawal Limits</h2>
                  <p className="text-sm text-gray-500">Set minimum, maximum, and daily limits (in SLE)</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.minWithdrawalAmount)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        minWithdrawalAmount: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.maxWithdrawalAmount)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        maxWithdrawalAmount: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.dailyWithdrawalLimit)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        dailyWithdrawalLimit: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </Card>

            {/* Withdrawal Fees */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Withdrawal Fees</h2>
                  <p className="text-sm text-gray-500">Configure fees for withdrawals</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fee Percentage (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={withdrawalSettings.withdrawalFeePercent}
                    onChange={(e) => setWithdrawalSettings(prev => ({
                      ...prev,
                      withdrawalFeePercent: parseFloat(e.target.value) || 0
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Flat Fee (Le)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.withdrawalFeeFlat)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        withdrawalFeeFlat: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Fee Formula:</strong> {withdrawalSettings.withdrawalFeePercent}% + Le {formatAmount(withdrawalSettings.withdrawalFeeFlat)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Example: For Le 10,000 withdrawal = Le {formatAmount(10000 * withdrawalSettings.withdrawalFeePercent / 100 * 100 + withdrawalSettings.withdrawalFeeFlat)} fee
                </p>
              </div>
            </Card>

            {/* Security Settings */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Security & Approval</h2>
                  <p className="text-sm text-gray-500">Configure withdrawal security settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Require PIN for withdrawals</p>
                    <p className="text-sm text-gray-500">Users must enter their PIN to confirm withdrawals</p>
                  </div>
                  <button
                    onClick={() => setWithdrawalSettings(prev => ({ ...prev, requirePin: !prev.requirePin }))}
                    className={`p-1 rounded ${withdrawalSettings.requirePin ? 'bg-green-200' : 'bg-gray-200'}`}
                  >
                    {withdrawalSettings.requirePin ? (
                      <ToggleRight className="w-6 h-6 text-green-600" />
                    ) : (
                      <ToggleLeft className="w-6 h-6 text-gray-400" />
                    )}
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Auto-Approve Under (Le)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Le</span>
                    <input
                      type="text"
                      value={formatAmount(withdrawalSettings.autoApproveUnder)}
                      onChange={(e) => setWithdrawalSettings(prev => ({
                        ...prev,
                        autoApproveUnder: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Withdrawals under this amount are automatically approved</p>
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
                <div className="p-2 bg-green-100 rounded-lg">
                  <ArrowUpFromLine className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Deposit Methods</h2>
                  <p className="text-sm text-gray-500">Enable or disable deposit options</p>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className={`p-4 rounded-lg border-2 ${
                  depositSettings.checkoutSessionEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span className="font-medium">Checkout</span>
                    </div>
                    <button
                      onClick={() => setDepositSettings(prev => ({ ...prev, checkoutSessionEnabled: !prev.checkoutSessionEnabled }))}
                      className={`p-1 rounded ${depositSettings.checkoutSessionEnabled ? 'bg-green-200' : 'bg-gray-200'}`}
                    >
                      {depositSettings.checkoutSessionEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">Monime checkout page</p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  depositSettings.paymentCodeEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-600" />
                      <span className="font-medium">USSD Code</span>
                    </div>
                    <button
                      onClick={() => setDepositSettings(prev => ({ ...prev, paymentCodeEnabled: !prev.paymentCodeEnabled }))}
                      className={`p-1 rounded ${depositSettings.paymentCodeEnabled ? 'bg-green-200' : 'bg-gray-200'}`}
                    >
                      {depositSettings.paymentCodeEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">Payment via USSD code</p>
                </div>

                <div className={`p-4 rounded-lg border-2 ${
                  depositSettings.mobileMoneyEnabled ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Smartphone className="w-5 h-5 text-orange-600" />
                      <span className="font-medium">Mobile Money</span>
                    </div>
                    <button
                      onClick={() => setDepositSettings(prev => ({ ...prev, mobileMoneyEnabled: !prev.mobileMoneyEnabled }))}
                      className={`p-1 rounded ${depositSettings.mobileMoneyEnabled ? 'bg-green-200' : 'bg-gray-200'}`}
                    >
                      {depositSettings.mobileMoneyEnabled ? (
                        <ToggleRight className="w-6 h-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-400" />
                      )}
                    </button>
                  </div>
                  <p className="text-sm text-gray-600">Direct mobile money</p>
                </div>
              </div>
            </Card>

            {/* Deposit Limits */}
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Deposit Limits</h2>
                  <p className="text-sm text-gray-500">Set minimum and maximum deposit amounts (in SLE)</p>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Deposit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Le</span>
                    <input
                      type="text"
                      value={formatAmount(depositSettings.minDepositAmount)}
                      onChange={(e) => setDepositSettings(prev => ({
                        ...prev,
                        minDepositAmount: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Maximum Deposit</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">Le</span>
                    <input
                      type="text"
                      value={formatAmount(depositSettings.maxDepositAmount)}
                      onChange={(e) => setDepositSettings(prev => ({
                        ...prev,
                        maxDepositAmount: parseAmount(e.target.value)
                      }))}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
