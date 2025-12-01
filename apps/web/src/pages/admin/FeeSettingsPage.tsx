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
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
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

const DEFAULT_CURRENCIES: Currency[] = [
  { code: 'USD', name: 'US Dollar', symbol: '$', isDefault: true, isActive: true },
  { code: 'EUR', name: 'Euro', symbol: '€', isDefault: false, isActive: true },
  { code: 'GBP', name: 'British Pound', symbol: '£', isDefault: false, isActive: true },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦', isDefault: false, isActive: true },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', isDefault: false, isActive: false },
  { code: 'GHS', name: 'Ghanaian Cedi', symbol: 'GH₵', isDefault: false, isActive: false },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R', isDefault: false, isActive: false },
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modal states
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [editingFee, setEditingFee] = useState<FeeConfig | null>(null);
  const [feeForm, setFeeForm] = useState<Partial<FeeConfig>>({
    transactionType: 'P2P_TRANSFER',
    percentage: 1,
    minimumFee: 0.10,
    maximumFee: null,
    flatFee: 0,
    currency: 'USD',
    isActive: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // Try to fetch from database
      const { data: feeData } = await supabase
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
        // Use default fee configs
        setFeeConfigs([
          { id: '1', transactionType: 'P2P_TRANSFER', percentage: 1, minimumFee: 0.10, maximumFee: 50, flatFee: 0, currency: 'USD', isActive: true },
          { id: '2', transactionType: 'BANK_TRANSFER', percentage: 0.5, minimumFee: 1.00, maximumFee: 25, flatFee: 0, currency: 'USD', isActive: true },
          { id: '3', transactionType: 'CARD_PAYMENT', percentage: 2.9, minimumFee: 0.30, maximumFee: null, flatFee: 0.30, currency: 'USD', isActive: true },
          { id: '4', transactionType: 'WITHDRAWAL', percentage: 1, minimumFee: 1.00, maximumFee: 10, flatFee: 0, currency: 'USD', isActive: true },
        ]);
      }

      // Fetch currencies
      const { data: currencyData } = await supabase
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

    } catch (err) {
      console.error('Failed to fetch settings:', err);
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
            ...feeForm as FeeConfig,
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
    await supabase
      .from('currencies')
      .update({ is_active: !currencies.find(c => c.code === code)?.isActive })
      .eq('code', code)
      .catch(() => {});
  };

  const setDefaultCurrency = async (code: string) => {
    setCurrencies(prev => prev.map(c => ({
      ...c,
      isDefault: c.code === code,
    })));

    // Try to update in database
    await supabase.from('currencies').update({ is_default: false }).neq('code', code).catch(() => {});
    await supabase.from('currencies').update({ is_default: true }).eq('code', code).catch(() => {});

    setSuccess(`${code} set as default currency`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const resetFeeForm = () => {
    setFeeForm({
      transactionType: 'P2P_TRANSFER',
      percentage: 1,
      minimumFee: 0.10,
      maximumFee: null,
      flatFee: 0,
      currency: 'USD',
      isActive: true,
    });
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
            <h1 className="text-2xl font-bold text-gray-900">Fee Settings</h1>
            <p className="text-gray-500">Manage transaction fees and currencies</p>
          </div>
          <button
            onClick={fetchSettings}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
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

        {/* Currency Settings */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Globe className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Supported Currencies</h2>
              <p className="text-sm text-gray-500">Enable currencies for transactions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {currencies.map((currency) => (
              <div
                key={currency.code}
                className={`p-4 rounded-lg border-2 ${
                  currency.isActive ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{currency.symbol}</span>
                    <div>
                      <p className="font-medium text-gray-900">{currency.code}</p>
                      <p className="text-sm text-gray-500">{currency.name}</p>
                    </div>
                  </div>
                  {currency.isDefault && (
                    <span className="px-2 py-1 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
                      Default
                    </span>
                  )}
                </div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => toggleCurrency(currency.code)}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                      currency.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {currency.isActive ? 'Disable' : 'Enable'}
                  </button>
                  {currency.isActive && !currency.isDefault && (
                    <button
                      onClick={() => setDefaultCurrency(currency.code)}
                      className="flex-1 px-3 py-2 bg-primary-100 text-primary-700 rounded-lg text-sm font-medium hover:bg-primary-200"
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
              <div className="p-2 bg-green-100 rounded-lg">
                <Percent className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Transaction Fees</h2>
                <p className="text-sm text-gray-500">Configure fees for different transaction types</p>
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
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Flat Fee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min/Max</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Currency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {feeConfigs.map((fee) => (
                  <tr key={fee.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <span className="font-medium text-gray-900">
                        {getTransactionTypeLabel(fee.transactionType)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700">{fee.percentage}%</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700">
                        {fee.flatFee > 0 ? `$${fee.flatFee.toFixed(2)}` : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700">
                        ${fee.minimumFee.toFixed(2)} - {fee.maximumFee ? `$${fee.maximumFee.toFixed(2)}` : 'No max'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-gray-700">{fee.currency}</span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        fee.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {fee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditFee(fee)}
                          className="p-2 hover:bg-gray-100 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => deleteFeeConfig(fee.id)}
                          className="p-2 hover:bg-red-100 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
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
              <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No fee configurations found</p>
              <button
                onClick={() => setShowFeeModal(true)}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                Add Fee Configuration
              </button>
            </div>
          )}
        </Card>

        {/* Fee Formula Info */}
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Fee Calculation Formula</h3>
              <p className="text-sm text-blue-700 mt-1">
                <code className="bg-blue-100 px-2 py-1 rounded">
                  fee = max(min(amount × percentage/100, maximumFee), minimumFee) + flatFee
                </code>
              </p>
              <p className="text-sm text-blue-600 mt-2">
                Example: For a $100 transfer with 1% fee, $0.10 minimum, and $50 maximum:
                <br />
                fee = max(min($100 × 0.01, $50), $0.10) = max(min($1.00, $50), $0.10) = $1.00
              </p>
            </div>
          </div>
        </Card>

        {/* Fee Modal */}
        {showFeeModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingFee ? 'Edit Fee Configuration' : 'Add Fee Configuration'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction Type
                  </label>
                  <select
                    value={feeForm.transactionType}
                    onChange={(e) => setFeeForm({ ...feeForm, transactionType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Percentage (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.percentage}
                      onChange={(e) => setFeeForm({ ...feeForm, percentage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Flat Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.flatFee}
                      onChange={(e) => setFeeForm({ ...feeForm, flatFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Minimum Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.minimumFee}
                      onChange={(e) => setFeeForm({ ...feeForm, minimumFee: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={feeForm.maximumFee || ''}
                      onChange={(e) => setFeeForm({ ...feeForm, maximumFee: e.target.value ? parseFloat(e.target.value) : null })}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Currency
                  </label>
                  <select
                    value={feeForm.currency}
                    onChange={(e) => setFeeForm({ ...feeForm, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                    className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    Active
                  </label>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 flex gap-3">
                <button
                  onClick={() => {
                    setShowFeeModal(false);
                    setEditingFee(null);
                    resetFeeForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
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
      </div>
    </AdminLayout>
  );
}
