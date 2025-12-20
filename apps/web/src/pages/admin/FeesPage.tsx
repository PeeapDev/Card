import { useState, useEffect } from 'react';
import {
  DollarSign,
  Percent,
  CreditCard,
  ArrowLeftRight,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Edit,
  Plus,
  Users,
  Building2,
  Zap,
  User,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { currencyService, Currency } from '@/services/currency.service';

interface PaymentSettings {
  withdrawal_fee_percent: number;
  withdrawal_fee_flat: number;
  min_withdrawal_amount: number;
  max_withdrawal_amount: number;
  daily_withdrawal_limit: number;
  min_deposit_amount: number;
  max_deposit_amount: number;
  withdrawal_auto_approve_under: number;
}

interface FeeConfig {
  id: string;
  name: string;
  description: string;
  type: 'percentage' | 'fixed' | 'tiered';
  value: number;
  minFee?: number;
  maxFee?: number;
  category: 'transfer' | 'card' | 'merchant' | 'withdrawal' | 'p2p';
  userType: 'standard' | 'agent' | 'agent_plus' | 'merchant' | 'all_users';
  isActive: boolean;
  dbField?: string;
}

interface TransferLimit {
  id: string;
  userType: string;
  dailyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  minAmount: number;
}

// API base URL
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

export function FeesPage() {
  const [activeTab, setActiveTab] = useState<'withdrawal' | 'deposit' | 'p2p' | 'card' | 'limits'>('withdrawal');
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // Payment settings from database
  const [settings, setSettings] = useState<PaymentSettings>({
    withdrawal_fee_percent: 2,
    withdrawal_fee_flat: 0,
    min_withdrawal_amount: 1,
    max_withdrawal_amount: 50000,
    daily_withdrawal_limit: 100000,
    min_deposit_amount: 1,
    max_deposit_amount: 100000,
    withdrawal_auto_approve_under: 1000,
  });

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    fetchSettings();
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/settings`);
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();

      setSettings({
        withdrawal_fee_percent: data.withdrawalSettings?.withdrawalFeePercent || 2,
        withdrawal_fee_flat: data.withdrawalSettings?.withdrawalFeeFlat || 0,
        min_withdrawal_amount: data.withdrawalSettings?.minWithdrawalAmount || 1,
        max_withdrawal_amount: data.withdrawalSettings?.maxWithdrawalAmount || 50000,
        daily_withdrawal_limit: data.withdrawalSettings?.dailyWithdrawalLimit || 100000,
        min_deposit_amount: data.depositSettings?.minDepositAmount || 1,
        max_deposit_amount: data.depositSettings?.maxDepositAmount || 100000,
        withdrawal_auto_approve_under: data.withdrawalSettings?.autoApproveUnder || 1000,
      });
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          withdrawalFeePercent: settings.withdrawal_fee_percent,
          withdrawalFeeFlat: settings.withdrawal_fee_flat,
          minWithdrawalAmount: settings.min_withdrawal_amount,
          maxWithdrawalAmount: settings.max_withdrawal_amount,
          dailyWithdrawalLimit: settings.daily_withdrawal_limit,
          minDepositAmount: settings.min_deposit_amount,
          maxDepositAmount: settings.max_deposit_amount,
          withdrawalAutoApproveUnder: settings.withdrawal_auto_approve_under,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save fee settings');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (field: keyof PaymentSettings, value: number) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  // P2P fees (these would need a separate table in future)
  const [p2pFees] = useState([
    { id: 'p2p-standard', name: 'Standard User', description: 'Fee for regular user transfers', value: 1.0, userType: 'standard' },
    { id: 'p2p-agent', name: 'Agent', description: 'Fee for agent transfers', value: 0.5, userType: 'agent' },
    { id: 'p2p-agent-plus', name: 'Agent+', description: 'Fee for Agent+ transfers', value: 0.2, userType: 'agent_plus' },
    { id: 'p2p-merchant', name: 'Merchant', description: 'Fee for merchant transfers', value: 0.5, userType: 'merchant' },
  ]);

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'standard': return <User className="w-4 h-4" />;
      case 'agent': return <Users className="w-4 h-4" />;
      case 'agent_plus': return <Zap className="w-4 h-4" />;
      case 'merchant': return <Building2 className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'standard': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
      case 'agent': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400';
      case 'agent_plus': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400';
      case 'merchant': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fees & Pricing</h1>
            <p className="text-gray-500 dark:text-gray-400">Configure transaction fees and limits</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Changes saved
              </span>
            )}
            {error && (
              <span className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </span>
            )}
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isEditing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Edit className="w-4 h-4" />
              {isEditing ? 'Cancel' : 'Edit Fees'}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            )}
          </div>
        </div>

        {/* Main Fee Card - Withdrawal Fee (Most Important) */}
        <MotionCard className="p-6 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white" delay={0.1}>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Withdrawal Fee</h2>
                <p className="text-emerald-100">Your main source of platform profit</p>
              </div>
            </div>
            <div className="text-right">
              {!isEditing ? (
                <>
                  <p className="text-4xl font-bold">{settings.withdrawal_fee_percent}%</p>
                  {settings.withdrawal_fee_flat > 0 && (
                    <p className="text-emerald-100">+ {formatCurrency(settings.withdrawal_fee_flat)} flat</p>
                  )}
                </>
              ) : (
                <div className="flex items-center gap-3">
                  <div>
                    <label className="text-xs text-emerald-100 block mb-1">Percent (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.withdrawal_fee_percent}
                      onChange={(e) => updateSetting('withdrawal_fee_percent', parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-right text-xl font-bold focus:ring-2 focus:ring-white/50"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-emerald-100 block mb-1">Flat Fee</label>
                    <input
                      type="number"
                      step="0.01"
                      value={settings.withdrawal_fee_flat}
                      onChange={(e) => updateSetting('withdrawal_fee_flat', parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-2 bg-white/20 border border-white/30 rounded-lg text-white text-right text-xl font-bold focus:ring-2 focus:ring-white/50"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-white/20">
            <div className="text-center">
              <p className="text-sm text-emerald-100 mb-1">Min Withdrawal</p>
              {isEditing ? (
                <input
                  type="number"
                  value={settings.min_withdrawal_amount}
                  onChange={(e) => updateSetting('min_withdrawal_amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded text-white text-center font-bold focus:ring-2 focus:ring-white/50"
                />
              ) : (
                <p className="text-xl font-bold">{formatCurrency(settings.min_withdrawal_amount)}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-emerald-100 mb-1">Max Withdrawal</p>
              {isEditing ? (
                <input
                  type="number"
                  value={settings.max_withdrawal_amount}
                  onChange={(e) => updateSetting('max_withdrawal_amount', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded text-white text-center font-bold focus:ring-2 focus:ring-white/50"
                />
              ) : (
                <p className="text-xl font-bold">{formatCurrency(settings.max_withdrawal_amount)}</p>
              )}
            </div>
            <div className="text-center">
              <p className="text-sm text-emerald-100 mb-1">Daily Limit</p>
              {isEditing ? (
                <input
                  type="number"
                  value={settings.daily_withdrawal_limit}
                  onChange={(e) => updateSetting('daily_withdrawal_limit', parseFloat(e.target.value) || 0)}
                  className="w-full px-2 py-1 bg-white/20 border border-white/30 rounded text-white text-center font-bold focus:ring-2 focus:ring-white/50"
                />
              ) : (
                <p className="text-xl font-bold">{formatCurrency(settings.daily_withdrawal_limit)}</p>
              )}
            </div>
          </div>
        </MotionCard>

        {/* Category Tabs */}
        <Card className="p-1">
          <div className="flex gap-1">
            {[
              { id: 'withdrawal', label: 'Withdrawal', icon: ArrowUpRight },
              { id: 'deposit', label: 'Deposit', icon: ArrowDownRight },
              { id: 'p2p', label: 'P2P Fees', icon: ArrowLeftRight },
              { id: 'card', label: 'Card Fees', icon: CreditCard },
              { id: 'limits', label: 'Limits', icon: Users },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 px-4 py-3 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </Card>

        {/* Withdrawal Tab */}
        {activeTab === 'withdrawal' && (
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Withdrawal Settings</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Fee Percentage (%)
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Applied to all user withdrawals
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.1"
                      value={settings.withdrawal_fee_percent}
                      onChange={(e) => updateSetting('withdrawal_fee_percent', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl font-bold"
                    />
                  ) : (
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                      {settings.withdrawal_fee_percent}%
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Flat Fee ({currencySymbol})
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Additional fixed amount per withdrawal
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={settings.withdrawal_fee_flat}
                      onChange={(e) => updateSetting('withdrawal_fee_flat', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl font-bold"
                    />
                  ) : (
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(settings.withdrawal_fee_flat)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Auto-Approve Under
                  </label>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                    Withdrawals below this amount are auto-approved
                  </p>
                  {isEditing ? (
                    <input
                      type="number"
                      value={settings.withdrawal_auto_approve_under}
                      onChange={(e) => updateSetting('withdrawal_auto_approve_under', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl font-bold"
                    />
                  ) : (
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(settings.withdrawal_auto_approve_under)}
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Fee Calculator */}
            <Card className="p-6 bg-gray-50 dark:bg-gray-800/50">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-4">Fee Calculator</h4>
              <div className="grid grid-cols-3 gap-4">
                {[100, 500, 1000, 5000, 10000, 50000].map((amount) => {
                  const percentFee = amount * (settings.withdrawal_fee_percent / 100);
                  const totalFee = percentFee + settings.withdrawal_fee_flat;
                  return (
                    <div key={amount} className="p-4 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Withdraw {formatCurrency(amount)}</p>
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        Fee: {formatCurrency(totalFee)}
                      </p>
                      <p className="text-xs text-gray-400">User gets: {formatCurrency(amount - totalFee)}</p>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        )}

        {/* Deposit Tab */}
        {activeTab === 'deposit' && (
          <div className="space-y-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ArrowDownRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Deposit Settings</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">No fees on deposits - money coming in</p>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 mb-6">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">Deposits are FREE for users</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-500 mt-1">
                  We encourage users to deposit by not charging any fees on incoming money.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Minimum Deposit
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={settings.min_deposit_amount}
                      onChange={(e) => updateSetting('min_deposit_amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl font-bold"
                    />
                  ) : (
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(settings.min_deposit_amount)}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Maximum Deposit
                  </label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={settings.max_deposit_amount}
                      onChange={(e) => updateSetting('max_deposit_amount', parseFloat(e.target.value) || 0)}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xl font-bold"
                    />
                  ) : (
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(settings.max_deposit_amount)}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* P2P Tab */}
        {activeTab === 'p2p' && (
          <div className="space-y-4">
            <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Coming Soon</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    P2P fee configuration will be available in a future update. Currently using default values.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {p2pFees.map((fee) => (
                <Card key={fee.id} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${getUserTypeColor(fee.userType)}`}>
                        {getUserTypeIcon(fee.userType)}
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{fee.name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{fee.description}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900 dark:text-white">{fee.value}%</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">per transfer</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Card Tab */}
        {activeTab === 'card' && (
          <div className="space-y-4">
            <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Coming Soon</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    Card fee configuration will be available in a future update.
                  </p>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Virtual Card Creation', value: 1.00, type: 'fixed' },
                { name: 'Physical Card Creation', value: 10.00, type: 'fixed' },
                { name: 'Card Transaction Fee', value: 1.5, type: 'percentage' },
                { name: 'Monthly Maintenance', value: 1.00, type: 'fixed' },
              ].map((fee, index) => (
                <Card key={index} className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                        <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{fee.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{fee.type}</p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {fee.type === 'percentage' ? `${fee.value}%` : formatCurrency(fee.value)}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Limits Tab */}
        {activeTab === 'limits' && (
          <div className="space-y-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Transaction Limits</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Withdrawal Limits</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Minimum</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(settings.min_withdrawal_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Maximum</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(settings.max_withdrawal_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Daily Limit</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(settings.daily_withdrawal_limit)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-4">
                    <ArrowDownRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <h4 className="font-semibold text-gray-900 dark:text-white">Deposit Limits</h4>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Minimum</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(settings.min_deposit_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Maximum</span>
                      <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(settings.max_deposit_amount)}</span>
                    </div>
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
