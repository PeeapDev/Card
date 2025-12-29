/**
 * SuperAdmin Invoice Settings Page
 *
 * Configure invoice types, limits, and merchant selection rules.
 */

import { useState, useEffect } from 'react';
import {
  FileText,
  Settings,
  ToggleLeft,
  ToggleRight,
  Crown,
  Lock,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Hash,
  Loader2,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card } from '@/components/ui/Card';
import {
  invoiceTypeSettingsService,
  type InvoiceTypeDefinition,
  type InvoiceTypeLimits,
  type InvoiceMonthlyLimits,
} from '@/services/invoiceTypeSettings.service';

export default function AdminInvoiceSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceTypeDefinition[]>([]);
  const [typeLimits, setTypeLimits] = useState<InvoiceTypeLimits>({
    single_app_max_types: 2,
    single_app_default_types: ['standard', 'proforma'],
    full_plan_unlimited: true,
    allow_merchant_selection: true,
  });
  const [monthlyLimits, setMonthlyLimits] = useState<InvoiceMonthlyLimits>({
    single_app_limit: 10,
    full_plan_limit: 1000,
    enterprise_unlimited: true,
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [types, limits, monthly] = await Promise.all([
        invoiceTypeSettingsService.getInvoiceTypes(),
        invoiceTypeSettingsService.getInvoiceTypeLimits(),
        invoiceTypeSettingsService.getMonthlyLimits(),
      ]);
      setInvoiceTypes(types);
      setTypeLimits(limits);
      setMonthlyLimits(monthly);
    } catch (error) {
      console.error('Error loading data:', error);
      setErrorMessage('Failed to load settings');
    }
    setLoading(false);
  };

  const handleToggleActive = async (code: string, currentValue: boolean) => {
    const success = await invoiceTypeSettingsService.toggleInvoiceTypeActive(code, !currentValue);
    if (success) {
      setInvoiceTypes((prev) =>
        prev.map((t) => (t.code === code ? { ...t, is_active: !currentValue } : t))
      );
      showSuccess('Invoice type updated');
    } else {
      showError('Failed to update invoice type');
    }
  };

  const handleTogglePremium = async (code: string, currentValue: boolean) => {
    const success = await invoiceTypeSettingsService.toggleInvoiceTypePremium(code, !currentValue);
    if (success) {
      setInvoiceTypes((prev) =>
        prev.map((t) => (t.code === code ? { ...t, is_premium: !currentValue } : t))
      );
      showSuccess('Invoice type updated');
    } else {
      showError('Failed to update invoice type');
    }
  };

  const handleToggleFullPlanRequired = async (code: string, currentValue: boolean) => {
    const success = await invoiceTypeSettingsService.toggleRequiresFullPlan(code, !currentValue);
    if (success) {
      setInvoiceTypes((prev) =>
        prev.map((t) => (t.code === code ? { ...t, requires_full_plan: !currentValue } : t))
      );
      showSuccess('Invoice type updated');
    } else {
      showError('Failed to update invoice type');
    }
  };

  const handleSaveTypeLimits = async () => {
    setSaving(true);
    const success = await invoiceTypeSettingsService.updateInvoiceTypeLimits(typeLimits);
    if (success) {
      showSuccess('Type limits saved');
    } else {
      showError('Failed to save type limits');
    }
    setSaving(false);
  };

  const handleSaveMonthlyLimits = async () => {
    setSaving(true);
    const success = await invoiceTypeSettingsService.updateMonthlyLimits(monthlyLimits);
    if (success) {
      showSuccess('Monthly limits saved');
    } else {
      showError('Failed to save monthly limits');
    }
    setSaving(false);
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage('');
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const getIconColor = (color: string) => {
    const colors: Record<string, string> = {
      blue: 'text-blue-600 bg-blue-100',
      purple: 'text-purple-600 bg-purple-100',
      green: 'text-green-600 bg-green-100',
      emerald: 'text-emerald-600 bg-emerald-100',
      orange: 'text-orange-600 bg-orange-100',
      cyan: 'text-cyan-600 bg-cyan-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      teal: 'text-teal-600 bg-teal-100',
      red: 'text-red-600 bg-red-100',
      amber: 'text-amber-600 bg-amber-100',
      slate: 'text-slate-600 bg-slate-100',
      indigo: 'text-indigo-600 bg-indigo-100',
      gray: 'text-gray-600 bg-gray-100',
    };
    return colors[color] || 'text-gray-600 bg-gray-100';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Invoice Settings
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure invoice types and merchant limits
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Success/Error Messages */}
        {successMessage && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-green-700 dark:text-green-300">{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <span className="text-red-700 dark:text-red-300">{errorMessage}</span>
          </div>
        )}

        {/* Type Selection Limits */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Settings className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Single App Subscription Limits
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Control how many invoice types single-app subscribers can select
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Maximum Invoice Types
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={typeLimits.single_app_max_types}
                onChange={(e) =>
                  setTypeLimits((prev) => ({
                    ...prev,
                    single_app_max_types: parseInt(e.target.value) || 2,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">
                Single-app subscribers can select up to this many invoice types
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Allow Merchant Selection
              </label>
              <button
                onClick={() =>
                  setTypeLimits((prev) => ({
                    ...prev,
                    allow_merchant_selection: !prev.allow_merchant_selection,
                  }))
                }
                className="flex items-center gap-2"
              >
                {typeLimits.allow_merchant_selection ? (
                  <ToggleRight className="w-10 h-10 text-green-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-400" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {typeLimits.allow_merchant_selection
                    ? 'Merchants can choose their types'
                    : 'Use default types only'}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Invoice Types (for new merchants)
            </label>
            <div className="flex flex-wrap gap-2">
              {invoiceTypes
                .filter((t) => t.is_active && !t.requires_full_plan)
                .map((type) => (
                  <button
                    key={type.code}
                    onClick={() => {
                      const isSelected = typeLimits.single_app_default_types.includes(type.code);
                      if (isSelected) {
                        setTypeLimits((prev) => ({
                          ...prev,
                          single_app_default_types: prev.single_app_default_types.filter(
                            (c) => c !== type.code
                          ),
                        }));
                      } else if (
                        typeLimits.single_app_default_types.length < typeLimits.single_app_max_types
                      ) {
                        setTypeLimits((prev) => ({
                          ...prev,
                          single_app_default_types: [...prev.single_app_default_types, type.code],
                        }));
                      }
                    }}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      typeLimits.single_app_default_types.includes(type.code)
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200'
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Selected: {typeLimits.single_app_default_types.length} / {typeLimits.single_app_max_types}
            </p>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveTypeLimits}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Type Limits
            </button>
          </div>
        </Card>

        {/* Monthly Invoice Limits */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Hash className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Monthly Invoice Limits
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Set how many invoices merchants can create per month
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Single App Plan
              </label>
              <input
                type="number"
                min="1"
                value={monthlyLimits.single_app_limit}
                onChange={(e) =>
                  setMonthlyLimits((prev) => ({
                    ...prev,
                    single_app_limit: parseInt(e.target.value) || 10,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">Invoices per month</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Full Plan
              </label>
              <input
                type="number"
                min="1"
                value={monthlyLimits.full_plan_limit}
                onChange={(e) =>
                  setMonthlyLimits((prev) => ({
                    ...prev,
                    full_plan_limit: parseInt(e.target.value) || 1000,
                  }))
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">Invoices per month</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Enterprise Unlimited
              </label>
              <button
                onClick={() =>
                  setMonthlyLimits((prev) => ({
                    ...prev,
                    enterprise_unlimited: !prev.enterprise_unlimited,
                  }))
                }
                className="flex items-center gap-2"
              >
                {monthlyLimits.enterprise_unlimited ? (
                  <ToggleRight className="w-10 h-10 text-green-600" />
                ) : (
                  <ToggleLeft className="w-10 h-10 text-gray-400" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {monthlyLimits.enterprise_unlimited ? 'Unlimited' : 'Use limit'}
                </span>
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSaveMonthlyLimits}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Monthly Limits
            </button>
          </div>
        </Card>

        {/* Invoice Types Management */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Invoice Types
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enable/disable invoice types and set premium requirements
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Type
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Active
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Premium
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-600 dark:text-gray-400">
                    Full Plan Only
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoiceTypes.map((type) => (
                  <tr
                    key={type.code}
                    className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getIconColor(type.color)}`}>
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{type.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {type.description}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => handleToggleActive(type.code, type.is_active)}>
                        {type.is_active ? (
                          <ToggleRight className="w-8 h-8 text-green-600 mx-auto" />
                        ) : (
                          <ToggleLeft className="w-8 h-8 text-gray-400 mx-auto" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button onClick={() => handleTogglePremium(type.code, type.is_premium)}>
                        {type.is_premium ? (
                          <Crown className="w-5 h-5 text-amber-500 mx-auto" />
                        ) : (
                          <Crown className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleFullPlanRequired(type.code, type.requires_full_plan)}
                      >
                        {type.requires_full_plan ? (
                          <Lock className="w-5 h-5 text-red-500 mx-auto" />
                        ) : (
                          <Lock className="w-5 h-5 text-gray-300 mx-auto" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Legend</h4>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <ToggleRight className="w-5 h-5 text-green-600" />
                <span className="text-gray-600 dark:text-gray-400">Active - Available to use</span>
              </div>
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-500" />
                <span className="text-gray-600 dark:text-gray-400">Premium - Highlighted as premium</span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-red-500" />
                <span className="text-gray-600 dark:text-gray-400">Full Plan Only - Not for single-app</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
