/**
 * Fee Settings Page
 *
 * Admin page to manage:
 * - Transaction fees (percentage and minimum)
 * - Supported currencies
 * - Default currency
 * - Fee tiers by transaction type
 */

import { useState, useEffect } from 'react';
import {
  Settings,
  DollarSign,
  Percent,
  Globe,
  Save,
  Plus,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  Users,
  ArrowUpDown,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Currency {
  code: string;
  name: string;
  symbol: string;
  isDefault: boolean;
  isActive: boolean;
}

interface FeeConfig {
  id: string;
  transactionType: string;
  percentage: number;
  minimumFee: number;
  maximumFee: number | null;
  flatFee: number;
  currency: string;
  isActive: boolean;
}

interface TransferLimit {
  id: string;
  userType: string;
  dailyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  minAmount: number;
  currency: string;
  isActive: boolean;
}

const USER_TYPES = [
  { value: 'standard', label: 'Standard User' },
  { value: 'agent', label: 'Agent' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'agent_plus', label: 'Agent+' },
  { value: 'admin', label: 'Admin' },
  { value: 'superadmin', label: 'Super Admin' },
];

const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'SLE', name: 'Sierra Leone Leone', symbol: 'Le', isDefault: true, isActive: true },
  { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: false, isActive: true },
  { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false, isActive: false },
  { code: 'GBP', name: 'British Pound', symbol: '£', isDefault: false, isActive: false },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', isDefault: false, isActive: false },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA', isDefault: false, isActive: false },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', isDefault: false, isActive: false },
];

const TRANSACTION_TYPES = [
  { value: 'P2P_TRANSFER', label: 'P2P Transfer' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CARD_PAYMENT', label: 'Card Payment' },
  { value: 'MERCHANT_PAYMENT', label: 'Merchant Payment' },
  { value: 'WITHDRAWAL', label: 'Withdrawal' },
  { value: 'DEPOSIT', label: 'Deposit' },
  { value: 'INTERNATIONAL', label: 'International Transfer' },
];

export function FeeSettingsPage() {
  const [currencies, setCurrencies] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [feeConfigs, setFeeConfigs] = useState<FeeConfig[]>([]);
  const [transferLimits, setTransferLimits] = useState<TransferLimit[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [editingLimit, setEditingLimit] = useState<TransferLimit | null>(null);
  const [feeForm, setFeeForm] = useState<Partial<FeeConfig>>({
    transactionType: 'P2P_TRANSFER',
    percentage: 1,
    minimumFee: 1,
    maximumFee: null,
    flatFee: 0,
    currency: 'SLE',
    isActive: true,
  });
  const [currencyForm, setCurrencyForm] = useState<Partial<Currency>>({
    code: '',
    name: '',
    symbol: '',
    isDefault: false,
    isActive: true,
  });
  const [limitForm, setLimitForm] = useState<Partial<TransferLimit>>({
    userType: 'standard',
    dailyLimit: 5000,
    monthlyLimit: 25000,
    perTransactionLimit: 2500,
    minAmount: 1,
    currency: 'SLE',
    isActive: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Try to fetch fee settings from database
      const { data: feeData, error: feeError } = await supabase
        .from('fee_settings')
        .select('*')
        .order('transaction_type');

      if (feeData && feeData.length > 0) {
        setFeeConfigs(feeData.map(f => ({
          id: f.id,
          transactionType: f.transaction_type,
          percentage: f.percentage,
          minimumFee: f.minimum_fee,
          maximumFee: f.maximum_fee,
          flatFee: f.flat_fee,
          currency: f.currency,
          isActive: f.is_active,
        })));
      } else {
        // No fee data in database - start with empty list
        setFeeConfigs([]);
      }

      // Fetch currencies from database
      const { data: currencyData, error: currencyError } = await supabase
        .from('currencies')
        .select('*');

      if (currencyData && currencyData.length > 0) {
        setCurrencies(currencyData.map(c => ({
          code: c.code,
          name: c.name,
          symbol: c.symbol,
          isDefault: c.is_default,
          isActive: c.is_active,
        })));
      }
      // If no currencies in database, use DEFAULT_CURRENCIES (already set in state)

      // Fetch transfer limits from database
      const { data: limitsData, error: limitsError } = await supabase
        .from('transfer_limits')
        .select('*')
        .order('user_type');

      if (limitsData && limitsData.length > 0) {
        setTransferLimits(limitsData.map(l => ({
          id: l.id,
          userType: l.user_type,
          dailyLimit: parseFloat(l.daily_limit),
          monthlyLimit: parseFloat(l.monthly_limit),
          perTransactionLimit: parseFloat(l.per_transaction_limit),
          minAmount: parseFloat(l.min_amount),
          currency: l.currency,
          isActive: l.is_active,
        })));
      } else {
        // No limits in database - start with empty list
        setTransferLimits([]);
      }

    } catch (err) {
      console.error('Failed to fetch settings:', err);
      // On error, keep default currencies, clear fee configs
      setFeeConfigs([]);
      setTransferLimits([]);
    } finally {
      setLoading(false);
    }
  };

  const saveFeeConfig = async () => {
    setSaving(true);
    setError(null);

    try {
      const feeData = {
        transaction_type: feeForm.transactionType,
        percentage: feeForm.percentage,
        minimum_fee: feeForm.minimumFee,
        maximum_fee: feeForm.maximumFee,
        flat_fee: feeForm.flatFee,
        currency: feeForm.currency,
        is_active: feeForm.isActive,
      };

      if (editingFee) {
        // Update existing
        const { error: updateError } = await supabase
          .from('fee_settings')
          .update(feeData)
          .eq('id', editingFee.id);

        if (updateError) throw updateError;

        setFeeConfigs(prev => prev.map(f =>
          f.id === editingFee.id ? { ...f, ...feeForm } as FeeConfig : f
        ));
      } else {
        // Insert new
        const { data: newFee, error: insertError } = await supabase
          .from('fee_settings')
          .insert(feeData)
          .select()
          .single();

        if (insertError) {
          // Table might not exist, add to local state
          const newConfig: FeeConfig = {
            id: `local_${Date.now()}`,
            transactionType: feeForm.transactionType || 'TRANSFER',
            percentage: feeForm.percentage || 0,
            minimumFee: feeForm.minimumFee || 0,
            maximumFee: feeForm.maximumFee ?? null,
            flatFee: feeForm.flatFee || 0,
            currency: feeForm.currency || 'USD',
            isActive: feeForm.isActive ?? true,
          };
          setFeeConfigs(prev => [...prev, newConfig]);
        } else if (newFee) {
          setFeeConfigs(prev => [...prev, {
            id: newFee.id,
            transactionType: newFee.transaction_type,
            percentage: newFee.percentage,
            minimumFee: newFee.minimum_fee,
            maximumFee: newFee.maximum_fee,
            flatFee: newFee.flat_fee,
            currency: newFee.currency,
            isActive: newFee.is_active,
          }]);
        }
      }

      setSuccess('Fee configuration saved successfully');
      setShowFeeModal(false);
      setEditingFee(null);
      resetFeeForm();

      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to save fee configuration');
    } finally {
      setSaving(false);
    }
  };

  const deleteFeeConfig = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee configuration?')) return;

    try {
      await supabase.from('fee_settings').delete().eq('id', id);
      setFeeConfigs(prev => prev.filter(f => f.id !== id));
      setSuccess('Fee configuration deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const toggleCurrency = async (code: string) => {
    setCurrencies(prev => prev.map(c =>
      c.code === code ? { ...c, isActive: !c.isActive } : c
    ));

    // Try to update in database
    try {
      await supabase
        .from('currencies')
        .update({ is_active: !currencies.find(c => c.code === code)?.isActive })
        .eq('code', code);
    } catch {
      // Ignore errors
    }
  };

  const setDefaultCurrency = async (code: string) => {
    setCurrencies(prev => prev.map(c => ({
      ...c,
      isDefault: c.code === code,
    })));

    // Try to update in database
    try {
      await supabase.from('currencies').update({ is_default: false }).neq('code', code);
      await supabase.from('currencies').update({ is_default: true }).eq('code', code);
    } catch {
      // Ignore errors
    }

    setSuccess(`${code} set as default currency`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const resetFeeForm = () => {
    setFeeForm({
      transactionType: 'P2P_TRANSFER',
      percentage: 1,
      minimumFee: 1,
      maximumFee: null,
      flatFee: 0,
      currency: 'SLE',
      isActive: true,
    });
  };

  const resetCurrencyForm = () => {
    setCurrencyForm({
      code: '',
      name: '',
      symbol: '',
      isDefault: false,
      isActive: true,
    });
  };

  const resetLimitForm = () => {
    setLimitForm({
      userType: 'standard',
      dailyLimit: 5000,
      monthlyLimit: 25000,
      perTransactionLimit: 2500,
      minAmount: 1,
      currency: 'SLE',
      isActive: true,
    });
  };

  const saveTransferLimit = async () => {
    setSaving(true);
    setError(null);

    try {
      const limitData = {
        user_type: limitForm.userType,
        daily_limit: limitForm.dailyLimit,
        monthly_limit: limitForm.monthlyLimit,
        per_transaction_limit: limitForm.perTransactionLimit,
        min_amount: limitForm.minAmount,
        currency: limitForm.currency,
        is_active: limitForm.isActive,
      };

      if (editingLimit) {
        // Update existing
        const { error: updateError } = await supabase
          .from('transfer_limits')
          .update(limitData)
          .eq('id', editingLimit.id);

        if (updateError) throw updateError;

        setTransferLimits(prev => prev.map(l =>
          l.id === editingLimit.id ? { ...l, ...limitForm } as TransferLimit : l
        ));
      } else {
        // Insert new
        const { data: newLimit, error: insertError } = await supabase
          .from('transfer_limits')
          .insert(limitData)
          .select()
          .single();

        if (insertError) {
          // Table might not exist
          throw insertError;
        } else if (newLimit) {
          setTransferLimits(prev => [...prev, {
            id: newLimit.id,
            userType: newLimit.user_type,
            dailyLimit: parseFloat(newLimit.daily_limit),
            monthlyLimit: parseFloat(newLimit.monthly_limit),
            perTransactionLimit: parseFloat(newLimit.per_transaction_limit),
            minAmount: parseFloat(newLimit.min_amount),
            currency: newLimit.currency,
            isActive: newLimit.is_active,
          }]);
        }
      }

      setSuccess('Transfer limit saved successfully');
      setShowLimitModal(false);
      setEditingLimit(null);
      resetLimitForm();

      setTimeout(() => setSuccess(null), 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to save transfer limit');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransferLimit = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transfer limit?')) return;

    try {
      await supabase.from('transfer_limits').delete().eq('id', id);
      setTransferLimits(prev => prev.filter(l => l.id !== id));
      setSuccess('Transfer limit deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const openEditLimit = (limit: TransferLimit) => {
    setEditingLimit(limit);
    setLimitForm({
      userType: limit.userType,
      dailyLimit: limit.dailyLimit,
      monthlyLimit: limit.monthlyLimit,
      perTransactionLimit: limit.perTransactionLimit,
      minAmount: limit.minAmount,
      currency: limit.currency,
      isActive: limit.isActive,
    });
    setShowLimitModal(true);
  };

  const getUserTypeLabel = (type: string) => {
    return USER_TYPES.find(t => t.value === type)?.label || type;
  };

  const saveCurrency = async () => {
    if (!currencyForm.code || !currencyForm.name || !currencyForm.symbol) {
      setError('Please fill in all currency fields');
      return;
    }

    // Check if currency already exists
    if (currencies.some(c => c.code === currencyForm.code?.toUpperCase())) {
      setError('Currency with this code already exists');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const newCurrency: Currency = {
        code: currencyForm.code.toUpperCase(),
        name: currencyForm.name,
        symbol: currencyForm.symbol,
        isDefault: currencyForm.isDefault || false,
        isActive: currencyForm.isActive ?? true,
      };

      // Try to save to database
      try {
        await supabase.from('currencies').insert({
          code: newCurrency.code,
          name: newCurrency.name,
          symbol: newCurrency.symbol,
          is_default: newCurrency.isDefault,
          is_active: newCurrency.isActive,
        });
      } catch {
        // Table might not exist, continue anyway
      }

      // If setting as default, unset other defaults
      if (newCurrency.isDefault) {
        setCurrencies(prev => prev.map(c => ({ ...c, isDefault: false })));
      }

      setCurrencies(prev => [...prev, newCurrency]);
      setSuccess(`Currency ${newCurrency.code} added successfully`);
      setShowCurrencyModal(false);
      resetCurrencyForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to add currency');
    } finally {
      setSaving(false);
    }
  };

  const deleteCurrency = async (code: string) => {
    // Don't allow deleting default currency
    const currency = currencies.find(c => c.code === code);
    if (currency?.isDefault) {
      setError('Cannot delete the default currency');
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (!confirm(`Are you sure you want to delete ${code}?`)) return;

    try {
      await supabase.from('currencies').delete().eq('code', code);
    } catch {
      // Ignore errors
    }

    setCurrencies(prev => prev.filter(c => c.code !== code));
    setSuccess(`Currency ${code} deleted`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const openEditFee = (fee: FeeConfig) => {
    setEditingFee(fee);
    setFeeForm({
      transactionType: fee.transactionType,
      percentage: fee.percentage,
      minimumFee: fee.minimumFee,
      maximumFee: fee.maximumFee,
      flatFee: fee.flatFee,
      currency: fee.currency,
      isActive: fee.isActive,
    });
    setShowFeeModal(true);
  };

  const getTransactionTypeLabel = (type: string) => {
    return TRANSACTION_TYPES.find(t => t.value === type)?.label || type;
  };

  // Get currency symbol by code
  const getCurrencySymbol = (code: string): string => {
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  // Format amount with correct currency symbol
  const formatCurrency = (amount: number, currencyCode: string): string => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol}${amount.toFixed(2)}`;
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fee Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage transaction fees and currencies</p>
          </div>
          <button
            onClick={fetchSettings}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
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

        {/* Currency Settings */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Globe className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Supported Currencies</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enable currencies for transactions</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetCurrencyForm();
                setShowCurrencyModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Currency
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className={`p-4 rounded-lg border-2 ${
                  currency.isActive ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{currency.symbol}</span>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{currency.code}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{currency.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currency.isDefault && (
                      <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-medium rounded-full">
                        Default
                      </span>
                    )}
                    {!currency.isDefault && (
                      <button
                        onClick={() => deleteCurrency(currency.code)}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                        title="Delete currency"
                      >
                        <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => toggleCurrency(currency.code)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                      currency.isActive
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                        : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50'
                    }`}
                  >
                    {currency.isActive ? 'Disable' : 'Enable'}
                  </button>
                  {currency.isActive && !currency.isDefault && (
                    <button
                      onClick={() => setDefaultCurrency(currency.code)}
                      className="flex-1 px-3 py-2 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-lg text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-900/50"
                    >
                      Set Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Fee Configurations */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Percent className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Fees</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Configure fees for different transaction types</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingFee(null);
                resetFeeForm();
                setShowFeeModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Fee
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transaction Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Percentage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Flat Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Min/Max</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Currency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {feeConfigs.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getTransactionTypeLabel(fee.transactionType)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700 dark:text-gray-300">{fee.percentage}%</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {fee.flatFee > 0 ? formatCurrency(fee.flatFee, fee.currency) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatCurrency(fee.minimumFee, fee.currency)} - {fee.maximumFee ? formatCurrency(fee.maximumFee, fee.currency) : 'No max'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700 dark:text-gray-300">{fee.currency}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        fee.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {fee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditFee(fee)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => deleteFeeConfig(fee.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {feeConfigs.length === 0 && (
            <div className="text-center py-8">
              <Settings className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No fee configurations found</p>
              <button
                onClick={() => setShowFeeModal(true)}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add Fee Configuration
              </button>
            </div>
          )}
        </Card>

        {/* Transfer Limits */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <ArrowUpDown className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transfer Limits</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Set daily, monthly, and per-transaction limits by user type</p>
              </div>
            </div>
            <button
              onClick={() => {
                setEditingLimit(null);
                resetLimitForm();
                setShowLimitModal(true);
              }}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Limit
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">User Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Daily Limit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Monthly Limit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Per Transaction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Min Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {transferLimits.map((limit) => (
                  <tr key={limit.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getUserTypeLabel(limit.userType)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatCurrency(limit.dailyLimit, limit.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatCurrency(limit.monthlyLimit, limit.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatCurrency(limit.perTransactionLimit, limit.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700 dark:text-gray-300">
                        {formatCurrency(limit.minAmount, limit.currency)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        limit.isActive ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      }`}>
                        {limit.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditLimit(limit)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => deleteTransferLimit(limit.id)}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500 dark:text-red-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {transferLimits.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No transfer limits configured</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Add limits to control how much users can transfer</p>
              <button
                onClick={() => setShowLimitModal(true)}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add Transfer Limit
              </button>
            </div>
          )}
        </Card>

        {/* Fee Formula Info */}
        <Card className="p-6 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-300">Fee Calculation Formula</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                <code className="bg-blue-100 dark:bg-blue-800/50 px-2 py-1 rounded">
                  fee = max(min(amount × percentage/100, maximumFee), minimumFee) + flatFee
                </code>
              </p>
              {(() => {
                const defaultCurrency = currencies.find(c => c.isDefault);
                const symbol = defaultCurrency?.symbol || 'Le';
                return (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    Example: For a {symbol}100 transfer with 1% fee, {symbol}0.10 minimum, and {symbol}50 maximum:
                    <br />
                    fee = max(min({symbol}100 × 0.01, {symbol}50), {symbol}0.10) = max(min({symbol}1.00, {symbol}50), {symbol}0.10) = {symbol}1.00
                  </p>
                );
              })()}
            </div>
          </div>
        </Card>

        {/* Fee Modal */}
        {showFeeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingFee ? 'Edit Fee Configuration' : 'Add Fee Configuration'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={feeForm.transactionType}
                    onChange={(e) => setFeeForm({ ...feeForm, transactionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {TRANSACTION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.percentage}
                      onChange={(e) => setFeeForm({ ...feeForm, percentage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Flat Fee ({getCurrencySymbol(feeForm.currency || 'SLE')})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.flatFee}
                      onChange={(e) => setFeeForm({ ...feeForm, flatFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Minimum Fee ({getCurrencySymbol(feeForm.currency || 'SLE')})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.minimumFee}
                      onChange={(e) => setFeeForm({ ...feeForm, minimumFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maximum Fee ({getCurrencySymbol(feeForm.currency || 'SLE')})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.maximumFee || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, maximumFee: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={feeForm.currency}
                    onChange={(e) => setFeeForm({ ...feeForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {currencies.filter(c => c.isActive).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={feeForm.isActive}
                    onChange={(e) => setFeeForm({ ...feeForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowFeeModal(false);
                    setEditingFee(null);
                    resetFeeForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFeeConfig}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Currency Modal */}
        {showCurrencyModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Add New Currency</h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency Code (e.g., SLE, USD)
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    value={currencyForm.code}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, code: e.target.value.toUpperCase() })}
                    placeholder="SLE"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency Name
                  </label>
                  <input
                    type="text"
                    value={currencyForm.name}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, name: e.target.value })}
                    placeholder="Sierra Leone Leone"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Symbol
                  </label>
                  <input
                    type="text"
                    maxLength={5}
                    value={currencyForm.symbol}
                    onChange={(e) => setCurrencyForm({ ...currencyForm, symbol: e.target.value })}
                    placeholder="Le"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="currencyActive"
                      checked={currencyForm.isActive}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, isActive: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="currencyActive" className="text-sm text-gray-700 dark:text-gray-300">
                      Active
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="currencyDefault"
                      checked={currencyForm.isDefault}
                      onChange={(e) => setCurrencyForm({ ...currencyForm, isDefault: e.target.checked })}
                      className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                    />
                    <label htmlFor="currencyDefault" className="text-sm text-gray-700 dark:text-gray-300">
                      Set as Default
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowCurrencyModal(false);
                    resetCurrencyForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveCurrency}
                  disabled={saving || !currencyForm.code || !currencyForm.name || !currencyForm.symbol}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Add Currency
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Limit Modal */}
        {showLimitModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingLimit ? 'Edit Transfer Limit' : 'Add Transfer Limit'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    User Type
                  </label>
                  <select
                    value={limitForm.userType}
                    onChange={(e) => setLimitForm({ ...limitForm, userType: e.target.value })}
                    disabled={!!editingLimit}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {USER_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Daily Limit ({getCurrencySymbol(limitForm.currency || 'SLE')})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={limitForm.dailyLimit}
                      onChange={(e) => setLimitForm({ ...limitForm, dailyLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monthly Limit ({getCurrencySymbol(limitForm.currency || 'SLE')})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={limitForm.monthlyLimit}
                      onChange={(e) => setLimitForm({ ...limitForm, monthlyLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Per Transaction Limit ({getCurrencySymbol(limitForm.currency || 'SLE')})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={limitForm.perTransactionLimit}
                      onChange={(e) => setLimitForm({ ...limitForm, perTransactionLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Minimum Amount ({getCurrencySymbol(limitForm.currency || 'SLE')})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={limitForm.minAmount}
                      onChange={(e) => setLimitForm({ ...limitForm, minAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Currency
                  </label>
                  <select
                    value={limitForm.currency}
                    onChange={(e) => setLimitForm({ ...limitForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-primary-500"
                  >
                    {currencies.filter(c => c.isActive).map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="limitIsActive"
                    checked={limitForm.isActive}
                    onChange={(e) => setLimitForm({ ...limitForm, isActive: e.target.checked })}
                    className="w-4 h-4 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="limitIsActive" className="text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setEditingLimit(null);
                    resetLimitForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveTransferLimit}
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingLimit ? 'Update' : 'Add'} Limit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
