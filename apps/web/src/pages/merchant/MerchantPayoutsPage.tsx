import { useState, useEffect } from 'react';
import {
  DollarSign,
  Download,
  CheckCircle,
  Clock,
  Wallet,
  XCircle,
  Loader2,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { currencyService, Currency } from '@/services/currency.service';
import { merchantService, MerchantPayout } from '@/services/merchant.service';
import { useAuth } from '@/context/AuthContext';

export function MerchantPayoutsPage() {
  const { user } = useAuth();
  const [payouts, setPayouts] = useState<MerchantPayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  const [stats, setStats] = useState({
    availableBalance: 0,
    pendingBalance: 0,
    totalPayouts: 0,
  });

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    if (user?.id) {
      fetchPayouts();
      fetchStats();
    }
  }, [user?.id]);

  const fetchPayouts = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError(null);
    try {
      const { payouts: data } = await merchantService.getPayouts(user.id, { limit: 50 });
      setPayouts(data);
    } catch (err) {
      setError('Failed to fetch payouts');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      const data = await merchantService.getStats(user.id);
      setStats({
        availableBalance: data.availableBalance,
        pendingBalance: data.pendingBalance,
        totalPayouts: data.totalPayouts,
      });
    } catch {
      // Stats are optional, don't show error
    }
  };

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="w-3 h-3" /> Paid</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"><Clock className="w-3 h-3" /> Pending</span>;
      case 'in_transit':
      case 'processing':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"><Loader2 className="w-3 h-3 animate-spin" /> Processing</span>;
      case 'failed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"><XCircle className="w-3 h-3" /> Failed</span>;
      default:
        return <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">{status}</span>;
    }
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payouts</h1>
            <p className="text-gray-500 dark:text-gray-400">Track your payouts and balances</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchPayouts}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Balance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Available Balance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.availableBalance)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending Balance</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.pendingBalance)}</p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Payouts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalPayouts}</p>
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
              <button onClick={fetchPayouts} className="ml-auto text-red-600 hover:text-red-700 text-sm font-medium">
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Payouts Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payout History</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-8 h-8 text-green-600 animate-spin mx-auto" />
              <p className="mt-2 text-gray-500 dark:text-gray-400">Loading payouts...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No payouts yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">When you request a payout, it will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Payout ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Bank Account</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Created</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Arrival Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {payouts.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white font-mono">
                        {payout.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                        {formatCurrency(payout.amount)}
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(payout.status)}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {payout.bank_account_last4 ? `****${payout.bank_account_last4}` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {new Date(payout.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {payout.arrival_date ? new Date(payout.arrival_date).toLocaleDateString() : '-'}
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
