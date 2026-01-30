import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Search, Filter, Download, AlertTriangle, X, Loader2, MoreVertical, Flag, Clock, ChevronLeft } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWallets, useWalletTransactions } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Transaction } from '@/types';
import { PendingSubscriptionPayments } from '@/components/subscriptions/PendingSubscriptionPayments';
import { disputeService, DISPUTE_REASONS } from '@/services/dispute.service';

export function TransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: wallets, isLoading: walletsLoading } = useWallets();
  const [selectedWallet, setSelectedWallet] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);

  // Set wallet from URL params or default to first wallet
  useEffect(() => {
    const walletFromUrl = searchParams.get('wallet');
    if (walletFromUrl) {
      setSelectedWallet(walletFromUrl);
    } else if (wallets && wallets.length > 0 && !selectedWallet) {
      // Set first wallet as default when wallets load
      setSelectedWallet(wallets[0].id);
    }
  }, [searchParams, wallets, selectedWallet]);

  // Dispute state
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);

  // Only fetch transactions when we have a selected wallet
  const walletIdToFetch = selectedWallet || (wallets && wallets.length > 0 ? wallets[0].id : '');

  const { data: transactionsData, isLoading } = useWalletTransactions(
    walletIdToFetch,
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

  // Check if transaction can be disputed (outgoing payments only, within 2 weeks)
  const canDispute = (transaction: Transaction) => {
    const disputeableTypes = ['PAYMENT', 'PAYMENT_SENT', 'TRANSFER', 'WITHDRAWAL'];

    // Check if transaction is within 2 weeks (14 days)
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const transactionDate = new Date(transaction.createdAt);
    const isWithinTimeLimit = transactionDate >= twoWeeksAgo;

    // Check by type - outgoing transaction types can be disputed
    return (
      disputeableTypes.includes(transaction.type) &&
      transaction.status === 'COMPLETED' &&
      isWithinTimeLimit
    );
  };

  // Calculate days remaining to dispute
  const getDaysToDispute = (transaction: Transaction) => {
    const transactionDate = new Date(transaction.createdAt);
    const deadline = new Date(transactionDate);
    deadline.setDate(deadline.getDate() + 14);
    const now = new Date();
    const daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  };

  const openDisputeModal = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setDisputeReason('');
    setDisputeDescription('');
    setDisputeSuccess(false);
    setShowDisputeModal(true);
  };

  const handleSubmitDispute = async () => {
    if (!selectedTransaction || !disputeReason || !user) return;

    setDisputeLoading(true);
    try {
      // Create dispute using the dispute service
      const { dispute, error } = await disputeService.createDispute({
        transaction_id: selectedTransaction.id,
        reason: disputeReason as any,
        description: disputeDescription,
        amount: Math.abs(selectedTransaction.amount),
        currency: selectedTransaction.currency || 'SLE',
        customer_name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
        customer_email: user.email,
      });

      if (error) throw new Error(error);

      setDisputeSuccess(true);
    } catch (err: any) {
      console.error('Error creating dispute:', err);
      alert(err.message || 'Failed to submit dispute. Please try again.');
    } finally {
      setDisputeLoading(false);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {searchParams.get('wallet') && (
              <button
                onClick={() => navigate('/wallets')}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedWallet && wallets
                  ? `${wallets.find(w => w.id === selectedWallet)?.currency || ''} Wallet Transactions`
                  : 'Transactions'}
              </h1>
              <p className="text-gray-500 mt-1">
                {selectedWallet && wallets
                  ? `Transaction history for your ${wallets.find(w => w.id === selectedWallet)?.currency || ''} wallet`
                  : 'View your transaction history'}
              </p>
            </div>
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

        {/* Pending Subscription Payments */}
        <PendingSubscriptionPayments />

        {/* Transactions list */}
        <Card padding="none">
          {walletsLoading || isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-green-600 mr-2" />
              <span className="text-gray-500">Loading transactions...</span>
            </div>
          ) : !walletIdToFetch ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No wallets found. Create a wallet to see transactions.</p>
            </div>
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
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p
                          className={clsx('text-sm font-medium', getAmountColor(transaction.type))}
                        >
                          {getAmountPrefix(transaction.type)}
                          {transaction.currency === 'USD' ? '$' : 'Le '}
                          {Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
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
                      {canDispute(transaction) && (
                        <button
                          onClick={() => openDisputeModal(transaction)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors flex items-center gap-1"
                          title={`Dispute - ${getDaysToDispute(transaction)} days left`}
                        >
                          <Flag className="w-4 h-4" />
                          <span className="text-xs font-medium">{getDaysToDispute(transaction)}d</span>
                        </button>
                      )}
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

      {/* Dispute Modal */}
      {showDisputeModal && selectedTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <h2 className="text-lg font-semibold text-gray-900">Dispute Transaction</h2>
              </div>
              <button
                onClick={() => setShowDisputeModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {disputeSuccess ? (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Flag className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Dispute Submitted</h3>
                <p className="text-gray-500 mb-6">
                  Your dispute has been submitted successfully. The merchant has 7 days to respond. You can track progress and communicate directly in your disputes page.
                </p>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setShowDisputeModal(false)} className="flex-1">
                    Close
                  </Button>
                  <Button onClick={() => navigate('/disputes')} className="flex-1">
                    View My Disputes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-4 space-y-4">
                {/* Transaction Summary */}
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Transaction</span>
                    <span className="text-sm font-medium">
                      {selectedTransaction.merchantName || selectedTransaction.description || selectedTransaction.type}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-500">Amount</span>
                    <span className="text-sm font-medium text-red-600">
                      ${Math.abs(selectedTransaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-sm text-gray-500">Date</span>
                    <span className="text-sm font-medium">{formatDate(selectedTransaction.createdAt)}</span>
                  </div>
                </div>

                {/* Dispute Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Dispute *
                  </label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a reason</option>
                    {Object.entries(DISPUTE_REASONS).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                {/* Time remaining notice */}
                {selectedTransaction && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <Clock className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-700">
                      {getDaysToDispute(selectedTransaction)} days remaining to dispute this transaction
                    </span>
                  </div>
                )}

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional Details
                  </label>
                  <textarea
                    value={disputeDescription}
                    onChange={(e) => setDisputeDescription(e.target.value)}
                    placeholder="Please provide any additional information about this dispute..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    rows={3}
                  />
                </div>

                {/* Warning */}
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    Please note: Filing a false dispute may result in account suspension. Only file a dispute if you have a legitimate concern.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowDisputeModal(false)}
                    disabled={disputeLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-red-600 hover:bg-red-700"
                    onClick={handleSubmitDispute}
                    disabled={!disputeReason || disputeLoading}
                  >
                    {disputeLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Dispute'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
