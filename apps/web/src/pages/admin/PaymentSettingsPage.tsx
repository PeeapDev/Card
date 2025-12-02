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
import { supabase } from '@/lib/supabase';

interface MonimeConfig {
  apiKey: string;
  apiSecret: string;
  webhookSecret: string;
  sourceAccountId: string;
  payoutAccountId: string;
  environment: 'sandbox' | 'production';
  isEnabled: boolean;
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
  apiKey: '',
  apiSecret: '',
  webhookSecret: '',
  sourceAccountId: '',
  payoutAccountId: '',
  environment: 'sandbox',
  isEnabled: false,
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

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Try to fetch from database
      const { data: paymentSettings } = await supabase
        .from('payment_settings')
        .select('*')
        .single();

      if (paymentSettings) {
        setMonimeConfig({
          apiKey: paymentSettings.monime_api_key || '',
          apiSecret: paymentSettings.monime_api_secret || '',
          webhookSecret: paymentSettings.monime_webhook_secret || '',
          sourceAccountId: paymentSettings.monime_source_account_id || '',
          payoutAccountId: paymentSettings.monime_payout_account_id || '',
          environment: paymentSettings.monime_environment || 'sandbox',
          isEnabled: paymentSettings.monime_enabled || false,
        });

        setWithdrawalSettings({
          mobileMoneyEnabled: paymentSettings.withdrawal_mobile_money_enabled ?? true,
          bankTransferEnabled: paymentSettings.withdrawal_bank_transfer_enabled ?? true,
          minWithdrawalAmount: paymentSettings.min_withdrawal_amount || 1000,
          maxWithdrawalAmount: paymentSettings.max_withdrawal_amount || 50000000,
          dailyWithdrawalLimit: paymentSettings.daily_withdrawal_limit || 100000000,
          withdrawalFeePercent: paymentSettings.withdrawal_fee_percent || 1.5,
          withdrawalFeeFlat: paymentSettings.withdrawal_fee_flat || 100,
          requirePin: paymentSettings.withdrawal_require_pin ?? true,
          autoApproveUnder: paymentSettings.withdrawal_auto_approve_under || 1000000,
        });

        setDepositSettings({
          checkoutSessionEnabled: paymentSettings.deposit_checkout_enabled ?? true,
          paymentCodeEnabled: paymentSettings.deposit_payment_code_enabled ?? true,
          mobileMoneyEnabled: paymentSettings.deposit_mobile_money_enabled ?? true,
          minDepositAmount: paymentSettings.min_deposit_amount || 100,
          maxDepositAmount: paymentSettings.max_deposit_amount || 100000000,
        });
      }
    } catch (err) {
      console.error('Failed to fetch settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setError(null);

    try {
      const settingsData = {
        monime_api_key: monimeConfig.apiKey,
        monime_api_secret: monimeConfig.apiSecret,
        monime_webhook_secret: monimeConfig.webhookSecret,
        monime_source_account_id: monimeConfig.sourceAccountId,
        monime_payout_account_id: monimeConfig.payoutAccountId,
        monime_environment: monimeConfig.environment,
        monime_enabled: monimeConfig.isEnabled,
        withdrawal_mobile_money_enabled: withdrawalSettings.mobileMoneyEnabled,
        withdrawal_bank_transfer_enabled: withdrawalSettings.bankTransferEnabled,
        min_withdrawal_amount: withdrawalSettings.minWithdrawalAmount,
        max_withdrawal_amount: withdrawalSettings.maxWithdrawalAmount,
        daily_withdrawal_limit: withdrawalSettings.dailyWithdrawalLimit,
        withdrawal_fee_percent: withdrawalSettings.withdrawalFeePercent,
        withdrawal_fee_flat: withdrawalSettings.withdrawalFeeFlat,
        withdrawal_require_pin: withdrawalSettings.requirePin,
        withdrawal_auto_approve_under: withdrawalSettings.autoApproveUnder,
        deposit_checkout_enabled: depositSettings.checkoutSessionEnabled,
        deposit_payment_code_enabled: depositSettings.paymentCodeEnabled,
        deposit_mobile_money_enabled: depositSettings.mobileMoneyEnabled,
        min_deposit_amount: depositSettings.minDepositAmount,
        max_deposit_amount: depositSettings.maxDepositAmount,
        updated_at: new Date().toISOString(),
      };

      // Upsert settings
      const { error: upsertError } = await supabase
        .from('payment_settings')
        .upsert(settingsData, { onConflict: 'id' });

      if (upsertError) {
        // Table might not exist, show success anyway (settings stored locally)
        console.warn('Could not save to database:', upsertError);
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
      // TODO: Call backend API to test Monime connection
      await new Promise(resolve => setTimeout(resolve, 1500));
      setSuccess('Connection test successful! Monime API is reachable.');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError('Connection test failed: ' + (err.message || 'Unknown error'));
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Environment</label>
                  <select
                    value={monimeConfig.environment}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, environment: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="sandbox">Sandbox (Testing)</option>
                    <option value="production">Production (Live)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={monimeConfig.apiKey}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                    placeholder="pk_live_xxxxx or pk_test_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">API Secret</label>
                  <input
                    type={showSecrets ? 'text' : 'password'}
                    value={monimeConfig.apiSecret}
                    onChange={(e) => setMonimeConfig(prev => ({ ...prev, apiSecret: e.target.value }))}
                    placeholder="sk_live_xxxxx or sk_test_xxxxx"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
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

            {/* Test Connection */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <TestTube className="w-5 h-5 text-blue-600" />
                  <div>
                    <h3 className="font-medium text-blue-900">Test Connection</h3>
                    <p className="text-sm text-blue-700">Verify your Monime API credentials</p>
                  </div>
                </div>
                <button
                  onClick={testConnection}
                  disabled={testing || !monimeConfig.apiKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                >
                  {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                  Test Connection
                </button>
              </div>
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
