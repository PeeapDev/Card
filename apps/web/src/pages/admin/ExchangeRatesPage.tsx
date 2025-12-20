/**
 * Exchange Rates Page
 *
 * Admin page to manage:
 * - Currency exchange rates (USD <-> SLE)
 * - Exchange permissions per user type
 * - Exchange transaction history
 */

import { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  DollarSign,
  Users,
  Save,
  Edit,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  RefreshCw,
  History,
  Shield,
  TrendingUp,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { exchangeService, ExchangeRate, ExchangePermission, ExchangeTransaction } from '@/services/exchange.service';

const USER_TYPES = [
  { value: 'superadmin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'merchant', label: 'Merchant' },
  { value: 'agent', label: 'Agent' },
  { value: 'user', label: 'User' },
];

export function ExchangeRatesPage() {
  // Data state
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [permissions, setPermissions] = useState<ExchangePermission[]>([]);
  const [transactions, setTransactions] = useState<ExchangeTransaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'rates' | 'permissions' | 'transactions'>('rates');

  // Modal states
  const [showRateModal, setShowRateModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [editingRate, setEditingRate] = useState<ExchangeRate | null>(null);
  const [editingPermission, setEditingPermission] = useState<ExchangePermission | null>(null);

  // Form states
  const [rateForm, setRateForm] = useState({
    fromCurrency: 'USD',
    toCurrency: 'SLE',
    rate: 22.5,
    marginPercentage: 0,
  });

  const [permissionForm, setPermissionForm] = useState({
    userType: 'user',
    canExchange: false,
    dailyLimit: 5000,
    monthlyLimit: 50000,
    minAmount: 1,
    maxAmount: undefined as number | undefined,
    feePercentage: 1,
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === 'transactions') {
      fetchTransactions();
    }
  }, [activeTab, currentPage]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ratesData, permissionsData] = await Promise.all([
        exchangeService.getAllExchangeRates(),
        exchangeService.getAllPermissions(),
      ]);
      setExchangeRates(ratesData);
      setPermissions(permissionsData);
    } catch (err: any) {
      console.error('Failed to fetch exchange data:', err);
      setError(err.message || 'Failed to load exchange settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const result = await exchangeService.getAllExchangeTransactions(currentPage, itemsPerPage);
      setTransactions(result.data);
      setTotalTransactions(result.total);
    } catch (err: any) {
      console.error('Failed to fetch transactions:', err);
    }
  };

  const saveExchangeRate = async () => {
    setSaving(true);
    setError(null);

    try {
      const savedRate = await exchangeService.setExchangeRate({
        fromCurrency: rateForm.fromCurrency,
        toCurrency: rateForm.toCurrency,
        rate: rateForm.rate,
        marginPercentage: rateForm.marginPercentage,
      });

      // Update local state
      setExchangeRates(prev => {
        const existing = prev.find(
          r => r.fromCurrency === savedRate.fromCurrency && r.toCurrency === savedRate.toCurrency
        );
        if (existing) {
          return prev.map(r =>
            r.fromCurrency === savedRate.fromCurrency && r.toCurrency === savedRate.toCurrency
              ? savedRate
              : r
          );
        }
        return [...prev, savedRate];
      });

      setSuccess('Exchange rate saved successfully');
      setShowRateModal(false);
      setEditingRate(null);
      resetRateForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save exchange rate');
    } finally {
      setSaving(false);
    }
  };

  const savePermission = async () => {
    setSaving(true);
    setError(null);

    try {
      const savedPermission = await exchangeService.setExchangePermission({
        userType: permissionForm.userType,
        canExchange: permissionForm.canExchange,
        dailyLimit: permissionForm.dailyLimit,
        monthlyLimit: permissionForm.monthlyLimit,
        minAmount: permissionForm.minAmount,
        maxAmount: permissionForm.maxAmount,
        feePercentage: permissionForm.feePercentage,
      });

      // Update local state
      setPermissions(prev => {
        const existing = prev.find(p => p.userType === savedPermission.userType);
        if (existing) {
          return prev.map(p => (p.userType === savedPermission.userType ? savedPermission : p));
        }
        return [...prev, savedPermission];
      });

      setSuccess('Permission saved successfully');
      setShowPermissionModal(false);
      setEditingPermission(null);
      resetPermissionForm();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save permission');
    } finally {
      setSaving(false);
    }
  };

  const resetRateForm = () => {
    setRateForm({
      fromCurrency: 'USD',
      toCurrency: 'SLE',
      rate: 22.5,
      marginPercentage: 0,
    });
  };

  const resetPermissionForm = () => {
    setPermissionForm({
      userType: 'user',
      canExchange: false,
      dailyLimit: 5000,
      monthlyLimit: 50000,
      minAmount: 1,
      maxAmount: undefined,
      feePercentage: 1,
    });
  };

  const openEditRate = (rate: ExchangeRate) => {
    setEditingRate(rate);
    setRateForm({
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: rate.rate,
      marginPercentage: rate.marginPercentage,
    });
    setShowRateModal(true);
  };

  const openEditPermission = (permission: ExchangePermission) => {
    setEditingPermission(permission);
    setPermissionForm({
      userType: permission.userType,
      canExchange: permission.canExchange,
      dailyLimit: permission.dailyLimit || 5000,
      monthlyLimit: permission.monthlyLimit || 50000,
      minAmount: permission.minAmount || 1,
      maxAmount: permission.maxAmount,
      feePercentage: permission.feePercentage,
    });
    setShowPermissionModal(true);
  };

  const getUserTypeLabel = (type: string) => {
    return USER_TYPES.find(t => t.value === type)?.label || type;
  };

  const formatCurrency = (amount: number, currency: string): string => {
    const symbol = currency === 'USD' ? '$' : 'Le';
    return `${symbol}${amount.toLocaleString(undefined, {
      minimumFractionDigits: currency === 'USD' ? 2 : 0,
      maximumFractionDigits: currency === 'USD' ? 2 : 0,
    })}`;
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString();
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
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Exchange Settings</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage currency exchange rates and permissions</p>
          </div>
          <button
            onClick={fetchData}
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

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4">
            {[
              { id: 'rates', label: 'Exchange Rates', icon: TrendingUp },
              { id: 'permissions', label: 'Permissions', icon: Shield },
              { id: 'transactions', label: 'Transaction History', icon: History },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Exchange Rates Tab */}
        {activeTab === 'rates' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Currency Exchange Rates</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Set exchange rates between currencies</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingRate(null);
                  resetRateForm();
                  setShowRateModal(true);
                }}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <DollarSign className="w-4 h-4" />
                Set Rate
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Margin</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Effective Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Updated</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {exchangeRates.map(rate => (
                    <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">{rate.fromCurrency}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700 dark:text-gray-300">{rate.toCurrency}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-gray-700 dark:text-gray-300">{rate.rate.toFixed(4)}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700 dark:text-gray-300">{rate.marginPercentage}%</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono font-semibold text-primary-600 dark:text-primary-400">
                          {rate.effectiveRate.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          rate.isActive
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}>
                          {rate.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(rate.updatedAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => openEditRate(rate)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {exchangeRates.length === 0 && (
              <div className="text-center py-8">
                <ArrowLeftRight className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No exchange rates configured</p>
                <button
                  onClick={() => setShowRateModal(true)}
                  className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Add Exchange Rate
                </button>
              </div>
            )}

            {/* Rate Info */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-blue-900 dark:text-blue-300">Rate Calculation</h3>
                  <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                    <code className="bg-blue-100 dark:bg-blue-800/50 px-2 py-1 rounded">
                      effective_rate = rate × (1 - margin_percentage / 100)
                    </code>
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                    Example: If rate = 22.50 and margin = 2%, effective rate = 22.50 × 0.98 = 22.05
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Permissions Tab */}
        {activeTab === 'permissions' && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Exchange Permissions</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Control who can exchange currencies</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.map(permission => (
                <div
                  key={permission.id}
                  className={`p-4 rounded-lg border-2 ${
                    permission.canExchange
                      ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Users className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {getUserTypeLabel(permission.userType)}
                      </span>
                    </div>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      permission.canExchange
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {permission.canExchange ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Daily Limit:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {permission.dailyLimit ? formatCurrency(permission.dailyLimit, 'USD') : 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Monthly Limit:</span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {permission.monthlyLimit ? formatCurrency(permission.monthlyLimit, 'USD') : 'Unlimited'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Fee:</span>
                      <span className="text-gray-700 dark:text-gray-300">{permission.feePercentage}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => openEditPermission(permission)}
                    className="w-full mt-4 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-500 flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <History className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Exchange Transactions</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">View all currency exchange history</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">From</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">To</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fee</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {transactions.map(tx => (
                    <tr key={tx.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm text-gray-900 dark:text-white">{tx.reference}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(tx.fromAmount, tx.fromCurrency)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">{tx.fromCurrency}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-medium text-green-600 dark:text-green-400">
                          {formatCurrency(tx.toAmount, tx.toCurrency)}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 ml-1">{tx.toCurrency}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="font-mono text-sm text-gray-700 dark:text-gray-300">
                          {tx.exchangeRate.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-gray-700 dark:text-gray-300">
                          {formatCurrency(tx.feeAmount, tx.toCurrency)}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          tx.status === 'COMPLETED'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : tx.status === 'FAILED'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(tx.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {transactions.length === 0 && (
              <div className="text-center py-8">
                <History className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No exchange transactions yet</p>
              </div>
            )}

            {/* Pagination */}
            {totalTransactions > itemsPerPage && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalTransactions)} of {totalTransactions}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => p + 1)}
                    disabled={currentPage * itemsPerPage >= totalTransactions}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Rate Modal */}
        {showRateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {editingRate ? 'Edit Exchange Rate' : 'Set Exchange Rate'}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      From Currency
                    </label>
                    <select
                      value={rateForm.fromCurrency}
                      onChange={e => setRateForm({ ...rateForm, fromCurrency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                    >
                      <option value="USD">USD</option>
                      <option value="SLE">SLE</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      To Currency
                    </label>
                    <select
                      value={rateForm.toCurrency}
                      onChange={e => setRateForm({ ...rateForm, toCurrency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                    >
                      <option value="SLE">SLE</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Exchange Rate
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={rateForm.rate}
                    onChange={e => setRateForm({ ...rateForm, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                    placeholder="22.5000"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    1 {rateForm.fromCurrency} = {rateForm.rate} {rateForm.toCurrency}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Margin Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={rateForm.marginPercentage}
                    onChange={e => setRateForm({ ...rateForm, marginPercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Effective rate: {(rateForm.rate * (1 - rateForm.marginPercentage / 100)).toFixed(4)}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowRateModal(false);
                    setEditingRate(null);
                    resetRateForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={saveExchangeRate}
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

        {/* Permission Modal */}
        {showPermissionModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Edit Exchange Permission - {getUserTypeLabel(permissionForm.userType)}
                </h2>
              </div>

              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <input
                    type="checkbox"
                    id="canExchange"
                    checked={permissionForm.canExchange}
                    onChange={e => setPermissionForm({ ...permissionForm, canExchange: e.target.checked })}
                    className="w-5 h-5 text-primary-600 border-gray-300 dark:border-gray-600 rounded focus:ring-primary-500"
                  />
                  <label htmlFor="canExchange" className="font-medium text-gray-900 dark:text-white">
                    Enable currency exchange for this user type
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Daily Limit (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={permissionForm.dailyLimit}
                      onChange={e => setPermissionForm({ ...permissionForm, dailyLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monthly Limit (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={permissionForm.monthlyLimit}
                      onChange={e => setPermissionForm({ ...permissionForm, monthlyLimit: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Min Amount (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={permissionForm.minAmount}
                      onChange={e => setPermissionForm({ ...permissionForm, minAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Amount (USD)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={permissionForm.maxAmount || ''}
                      onChange={e => setPermissionForm({ ...permissionForm, maxAmount: e.target.value ? parseFloat(e.target.value) : undefined })}
                      placeholder="No limit"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Fee Percentage (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={permissionForm.feePercentage}
                    onChange={e => setPermissionForm({ ...permissionForm, feePercentage: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Fee charged on each exchange transaction
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => {
                    setShowPermissionModal(false);
                    setEditingPermission(null);
                    resetPermissionForm();
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={savePermission}
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
