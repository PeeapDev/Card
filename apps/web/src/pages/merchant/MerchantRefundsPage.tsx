import { useState, useEffect } from 'react';
import {
  RefreshCw,
  Search,
  Download,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  Loader2,
  AlertTriangle,
  RotateCcw,
  DollarSign,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { currencyService, Currency } from '@/services/currency.service';
import { merchantService, MerchantRefund } from '@/services/merchant.service';
import { useAuth } from '@/context/AuthContext';

export function MerchantRefundsPage() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState<MerchantRefund[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  const [stats, setStats] = useState({
    totalRefunds: 0,
    pendingRefunds: 0,
    completedRefunds: 0,
    totalAmount: 0,
  });

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    if (user?.id) {
      fetchRefunds();
      fetchStats();
    }
  }, [user?.id]);

  const fetchRefunds = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    try {
      const { refunds: data } = await merchantService.getRefunds(user.id, {
        limit: 50,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setRefunds(data);
    } catch (err) {
      setError('Failed to fetch refunds');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      const data = await merchantService.getStats(user.id);
      // Calculate refund stats from the refunds list
      const { refunds: allRefunds } = await merchantService.getRefunds(user.id, { limit: 100 });

      const pendingRefunds = allRefunds.filter(r => r.status === 'pending').length;
      const completedRefunds = allRefunds.filter(r => r.status === 'completed').length;
      const totalAmount = allRefunds.reduce((sum, r) => sum + r.amount, 0);

      setStats({
        totalRefunds: data.totalRefunds,
        pendingRefunds,
        completedRefunds,
        totalAmount,
      });
    } catch {
      // Stats are optional, don't show error
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchRefunds();
    }
  }, [statusFilter]);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'succeeded':
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Completed</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3" /> Pending</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{status}</span>;
    }
  };

  const filteredRefunds = refunds.filter(refund =>
    refund.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    refund.transaction_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (refund.reason && refund.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (refund.customer_email && refund.customer_email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Refunds</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage customer refunds</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRefunds}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Refund
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <RotateCcw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Refunds</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalRefunds}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendingRefunds}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completedRefunds}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalAmount)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <p className="text-red-700 dark:text-red-300">{error}</p>
              <button onClick={fetchRefunds} className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search refunds by ID, transaction, reason, or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </Card>

        {/* Refunds Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Refund History</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading refunds...</p>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="p-8 text-center">
              <RotateCcw className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No refunds found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                {searchTerm ? 'Try adjusting your search' : 'Refunds will appear here when processed'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Refund ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transaction</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRefunds.map((refund) => (
                    <tr key={refund.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {refund.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-mono">
                        {refund.transaction_id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                        {refund.customer_email || refund.customer_name || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(refund.amount)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(refund.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {refund.reason || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(refund.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </MerchantLayout>
  );
}
