import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Send,
  Search,
  Filter,
  Download,
  RefreshCw,
  Calendar,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { AgentLayout } from '@/components/layout/AgentLayout';
import { useAuth } from '@/context/AuthContext';
import { agentService, AgentTransaction } from '@/services/agent.service';
import { currencyService, Currency } from '@/services/currency.service';

export function AgentTransactionsPage() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<AgentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 20;

  // Summary stats
  const [summary, setSummary] = useState({
    totalCashIn: 0,
    totalCashOut: 0,
    totalCommissions: 0,
    transactionCount: 0,
  });

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchTransactions();
    }
  }, [user?.id, filter, dateRange, page]);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getDateRange = (): { startDate?: Date; endDate?: Date } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (dateRange) {
      case 'today':
        return { startDate: today, endDate: now };
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        return { startDate: weekAgo, endDate: now };
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return { startDate: monthAgo, endDate: now };
      default:
        return {};
    }
  };

  const fetchTransactions = async () => {
    if (!user?.id) return;
    setLoading(true);

    try {
      const { startDate, endDate } = getDateRange();
      const type = filter === 'all' ? undefined : filter;

      const data = await agentService.getTransactions(user.id, {
        type,
        startDate,
        endDate,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });

      setTransactions(data);
      setHasMore(data.length === pageSize);

      // Calculate summary
      let totalCashIn = 0;
      let totalCashOut = 0;
      let totalCommissions = 0;

      for (const txn of data) {
        if (txn.type === 'CASH_IN' || txn.type === 'DEPOSIT') {
          totalCashIn += txn.amount;
        } else if (txn.type === 'CASH_OUT') {
          totalCashOut += txn.amount;
        }
        totalCommissions += txn.commission || 0;
      }

      setSummary({
        totalCashIn,
        totalCashOut,
        totalCommissions,
        transactionCount: data.length,
      });
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      txn.reference?.toLowerCase().includes(query) ||
      txn.description?.toLowerCase().includes(query) ||
      txn.customerName?.toLowerCase().includes(query)
    );
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'CASH_IN':
      case 'DEPOSIT':
        return <ArrowDownLeft className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'CASH_OUT':
        return <ArrowUpRight className="w-4 h-4 text-red-600 dark:text-red-400" />;
      default:
        return <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'CASH_IN':
      case 'DEPOSIT':
        return 'bg-green-100 dark:bg-green-900/30';
      case 'CASH_OUT':
        return 'bg-red-100 dark:bg-red-900/30';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30';
    }
  };

  const getAmountColor = (type: string) => {
    switch (type) {
      case 'CASH_IN':
      case 'DEPOSIT':
        return 'text-green-600 dark:text-green-400';
      case 'CASH_OUT':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-gray-900 dark:text-white';
    }
  };

  return (
    <AgentLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-gray-500 dark:text-gray-400">View your transaction history</p>
          </div>
          <div className="flex gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={fetchTransactions}
              className="px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </motion.button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MotionCard className="p-4" delay={0.1}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Cash In</p>
                <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(summary.totalCashIn)}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.15}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Cash Out</p>
                <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCurrency(summary.totalCashOut)}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.2}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Send className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Commissions</p>
                <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{formatCurrency(summary.totalCommissions)}</p>
              </div>
            </div>
          </MotionCard>

          <MotionCard className="p-4" delay={0.25}>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{summary.transactionCount}</p>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Filters */}
        <MotionCard className="p-4" delay={0.3}>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by reference, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => { setFilter(e.target.value); setPage(1); }}
                className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All Types</option>
                <option value="CASH_IN">Cash In</option>
                <option value="CASH_OUT">Cash Out</option>
                <option value="TRANSFER">Transfers</option>
                <option value="COMMISSION">Commissions</option>
              </select>
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-400" />
              <select
                value={dateRange}
                onChange={(e) => { setDateRange(e.target.value as any); setPage(1); }}
                className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="today">Today</option>
                <option value="week">Last 7 Days</option>
                <option value="month">Last 30 Days</option>
                <option value="all">All Time</option>
              </select>
            </div>
          </div>
        </MotionCard>

        {/* Transactions List */}
        <MotionCard className="overflow-hidden" delay={0.4}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Send className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Try adjusting your filters</p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <th className="px-6 py-3 font-medium">Type</th>
                      <th className="px-6 py-3 font-medium">Reference</th>
                      <th className="px-6 py-3 font-medium">Description</th>
                      <th className="px-6 py-3 font-medium">Amount</th>
                      <th className="px-6 py-3 font-medium">Commission</th>
                      <th className="px-6 py-3 font-medium">Status</th>
                      <th className="px-6 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredTransactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className={`p-2 rounded-lg ${getTypeColor(txn.type)}`}>
                              {getTypeIcon(txn.type)}
                            </div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {txn.type.replace('_', ' ')}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                            {txn.reference}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {txn.description || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-semibold ${getAmountColor(txn.type)}`}>
                            {txn.type === 'CASH_OUT' ? '-' : '+'}{formatCurrency(txn.amount)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-purple-600 dark:text-purple-400">
                            {txn.commission > 0 ? `+${formatCurrency(txn.commission)}` : '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            txn.status === 'COMPLETED'
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : txn.status === 'PENDING'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                          }`}>
                            {txn.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(txn.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile List */}
              <div className="md:hidden divide-y divide-gray-100 dark:divide-gray-700">
                {filteredTransactions.map((txn) => (
                  <div key={txn.id} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${getTypeColor(txn.type)}`}>
                          {getTypeIcon(txn.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {txn.type.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {txn.reference}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${getAmountColor(txn.type)}`}>
                          {txn.type === 'CASH_OUT' ? '-' : '+'}{formatCurrency(txn.amount)}
                        </p>
                        {txn.commission > 0 && (
                          <p className="text-xs text-purple-600 dark:text-purple-400">
                            +{formatCurrency(txn.commission)} comm.
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{txn.description || '-'}</span>
                      <span>{formatDate(txn.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Page {page} &bull; Showing {filteredTransactions.length} transactions
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Previous
                  </button>
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={!hasMore}
                    className="px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-1"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </MotionCard>
      </motion.div>
    </AgentLayout>
  );
}
