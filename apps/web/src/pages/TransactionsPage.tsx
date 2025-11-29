import { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Search, Filter, Download } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWallets, useWalletTransactions } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import type { Transaction } from '@/types';

export function TransactionsPage() {
  const { data: wallets } = useWallets();
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  const { data: transactionsData, isLoading } = useWalletTransactions(
    selectedWallet || wallets?.[0]?.id || '',
    page,
    10
  );

  const transactions = transactionsData?.data || [];
  const totalPages = transactionsData?.totalPages || 1;

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'DEPOSIT':
        return <ArrowDownRight className="w-5 h-5 text-green-600" />;
      case 'WITHDRAWAL':
      case 'PAYMENT':
        return <ArrowUpRight className="w-5 h-5 text-red-600" />;
      case 'TRANSFER':
        return <ArrowUpRight className="w-5 h-5 text-blue-600" />;
      case 'REFUND':
        return <ArrowDownRight className="w-5 h-5 text-purple-600" />;
      default:
        return <ArrowUpRight className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTransactionIconBg = (type: Transaction['type']) => {
    switch (type) {
      case 'DEPOSIT':
        return 'bg-green-100';
      case 'WITHDRAWAL':
      case 'PAYMENT':
        return 'bg-red-100';
      case 'TRANSFER':
        return 'bg-blue-100';
      case 'REFUND':
        return 'bg-purple-100';
      default:
        return 'bg-gray-100';
    }
  };

  const getAmountColor = (type: Transaction['type']) => {
    switch (type) {
      case 'DEPOSIT':
      case 'REFUND':
        return 'text-green-600';
      case 'WITHDRAWAL':
      case 'PAYMENT':
        return 'text-red-600';
      case 'TRANSFER':
        return 'text-blue-600';
      default:
        return 'text-gray-900';
    }
  };

  const getAmountPrefix = (type: Transaction['type']) => {
    switch (type) {
      case 'DEPOSIT':
      case 'REFUND':
        return '+';
      default:
        return '-';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTransactions = transactions.filter(
    (t) =>
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.merchantName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
            <p className="text-gray-500 mt-1">View your transaction history</p>
          </div>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Filters */}
        <Card padding="sm">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search transactions..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="w-full md:w-64">
              <select
                value={selectedWallet}
                onChange={(e) => {
                  setSelectedWallet(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">All Wallets</option>
                {wallets?.map((wallet) => (
                  <option key={wallet.id} value={wallet.id}>
                    {wallet.currency} Wallet
                  </option>
                ))}
              </select>
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>
        </Card>

        {/* Transactions list */}
        <Card padding="none">
          {isLoading ? (
            <div className="text-center py-12">Loading transactions...</div>
          ) : filteredTransactions.length > 0 ? (
            <>
              <div className="divide-y divide-gray-100">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <div
                        className={clsx(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          getTransactionIconBg(transaction.type)
                        )}
                      >
                        {getTransactionIcon(transaction.type)}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.merchantName || transaction.description || transaction.type}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>{formatDate(transaction.createdAt)}</span>
                          <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                          <span>{transaction.type}</span>
                          {transaction.merchantCategory && (
                            <>
                              <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                              <span>{transaction.merchantCategory}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={clsx('text-sm font-medium', getAmountColor(transaction.type))}
                      >
                        {getAmountPrefix(transaction.type)}$
                        {transaction.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                      <p
                        className={clsx(
                          'text-xs',
                          transaction.status === 'COMPLETED' && 'text-green-600',
                          transaction.status === 'PENDING' && 'text-yellow-600',
                          transaction.status === 'FAILED' && 'text-red-600',
                          transaction.status === 'REVERSED' && 'text-purple-600'
                        )}
                      >
                        {transaction.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === totalPages}
                    onClick={() => setPage(page + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500">No transactions found</p>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
}
