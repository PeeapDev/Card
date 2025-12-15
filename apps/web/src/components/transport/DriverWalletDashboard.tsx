/**
 * Driver Wallet Dashboard
 *
 * Shows wallet balance and recent transactions with refund capability
 * Displayed inside the Collect Payment flow before starting collection
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCcw,
  Loader2,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RotateCcw,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { walletService, ExtendedWallet } from '@/services/wallet.service';
import { clsx } from 'clsx';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  type: string;
  status: string;
  description?: string;
  merchant_name?: string;
  created_at: string;
  metadata?: any;
  wallet_id?: string;
  source_wallet_id?: string;
  destination_wallet_id?: string;
}

interface DriverWalletDashboardProps {
  userId: string;
  wallet: ExtendedWallet;
  onStart: () => void;
  onRefresh: () => void;
}

export function DriverWalletDashboard({
  userId,
  wallet,
  onStart,
  onRefresh,
}: DriverWalletDashboardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [refundError, setRefundError] = useState('');

  // Fetch transactions for this driver wallet
  const fetchTransactions = async (showRefreshIndicator = false) => {
    if (showRefreshIndicator) setRefreshing(true);

    try {
      // Get transactions for this wallet (both incoming and outgoing)
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('wallet_id', wallet.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setTransactions(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [userId, wallet.id]);

  // Check if transaction can be refunded (less than 1 hour old and completed)
  const canRefund = (transaction: Transaction) => {
    const createdAt = new Date(transaction.created_at).getTime();
    const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1 hour in milliseconds

    return (
      createdAt > oneHourAgo &&
      transaction.status === 'COMPLETED' &&
      transaction.amount > 0 &&
      (transaction.type === 'PAYMENT' || transaction.type === 'PAYMENT_RECEIVED' || transaction.type === 'TRANSFER')
    );
  };

  // Calculate time remaining for refund eligibility
  const getRefundTimeRemaining = (transaction: Transaction) => {
    const createdAt = new Date(transaction.created_at).getTime();
    const expiresAt = createdAt + 60 * 60 * 1000; // 1 hour after creation
    const remaining = expiresAt - Date.now();

    if (remaining <= 0) return null;

    const minutes = Math.floor(remaining / 60000);
    if (minutes < 60) return `${minutes}m left`;
    return null;
  };

  // Handle refund
  const handleRefund = async () => {
    if (!selectedTransaction || !refundReason) return;

    setRefundLoading(true);
    setRefundError('');

    try {
      // Get payer's wallet to refund to (from source_wallet_id or metadata)
      const payerWalletId = selectedTransaction.source_wallet_id || selectedTransaction.metadata?.sourceWalletId;

      if (!payerWalletId) {
        throw new Error('Cannot find payer information for refund');
      }

      // Check if driver wallet has sufficient balance
      if (wallet.balance < Math.abs(selectedTransaction.amount)) {
        throw new Error('Insufficient wallet balance for refund');
      }

      // Get payer's wallet
      const { data: payerWallet, error: walletError } = await supabase
        .from('wallets')
        .select('id, balance, user_id')
        .eq('id', payerWalletId)
        .eq('status', 'ACTIVE')
        .single();

      if (walletError || !payerWallet) {
        throw new Error('Payer wallet not found');
      }

      const refundAmount = Math.abs(selectedTransaction.amount);
      const refundReference = `REF-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

      // Debit driver wallet
      const { error: debitError } = await supabase
        .from('wallets')
        .update({
          balance: wallet.balance - refundAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', wallet.id);

      if (debitError) throw new Error('Failed to debit driver wallet');

      // Credit payer wallet
      const { error: creditError } = await supabase
        .from('wallets')
        .update({
          balance: parseFloat(payerWallet.balance) + refundAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', payerWallet.id);

      if (creditError) {
        // Rollback driver wallet
        await supabase
          .from('wallets')
          .update({ balance: wallet.balance })
          .eq('id', wallet.id);
        throw new Error('Failed to credit payer wallet');
      }

      // Create refund transaction record for driver (outgoing)
      await supabase.from('transactions').insert({
        wallet_id: wallet.id,
        type: 'REFUND',
        amount: -refundAmount,
        currency: selectedTransaction.currency || 'SLE',
        status: 'COMPLETED',
        description: `Refund: ${refundReason}`,
        reference: refundReference,
        source_wallet_id: wallet.id,
        destination_wallet_id: payerWalletId,
        metadata: {
          originalTransactionId: selectedTransaction.id,
          refundReason,
          refundedAt: new Date().toISOString(),
        },
      });

      // Create refund transaction record for payer (incoming)
      await supabase.from('transactions').insert({
        wallet_id: payerWallet.id,
        type: 'REFUND',
        amount: refundAmount,
        currency: selectedTransaction.currency || 'SLE',
        status: 'COMPLETED',
        description: `Refund received: ${refundReason}`,
        reference: refundReference,
        source_wallet_id: wallet.id,
        destination_wallet_id: payerWalletId,
        metadata: {
          originalTransactionId: selectedTransaction.id,
          refundReason,
          refundedAt: new Date().toISOString(),
        },
      });

      // Update original transaction to mark as refunded
      await supabase
        .from('transactions')
        .update({
          status: 'REFUNDED',
          metadata: {
            ...selectedTransaction.metadata,
            refundedAt: new Date().toISOString(),
            refundReference,
            refundReason,
          },
        })
        .eq('id', selectedTransaction.id);

      // Send notification to payer if we have their user_id
      if (payerWallet.user_id) {
        await supabase.from('user_notifications').insert({
          user_id: payerWallet.user_id,
          type: 'refund_received',
          title: 'Refund Received',
          message: `You received a refund of Le ${refundAmount.toLocaleString()}. Reason: ${refundReason}`,
          read: false,
          metadata: {
            amount: refundAmount,
            refundReference,
          },
        });
      }

      setRefundSuccess(true);

      // Refresh transactions and wallet
      setTimeout(() => {
        fetchTransactions();
        onRefresh();
        setShowRefundModal(false);
        setRefundSuccess(false);
        setSelectedTransaction(null);
        setRefundReason('');
      }, 2000);
    } catch (err: any) {
      console.error('Refund error:', err);
      setRefundError(err.message || 'Failed to process refund');
    } finally {
      setRefundLoading(false);
    }
  };

  // Format time ago
  const timeAgo = (date: string) => {
    const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(date).toLocaleDateString();
  };

  // Get transaction icon
  const getTransactionIcon = (type: string, amount: number) => {
    if (type === 'REFUND') {
      return amount > 0 ? (
        <ArrowDownRight className="w-4 h-4 text-purple-500" />
      ) : (
        <ArrowUpRight className="w-4 h-4 text-purple-500" />
      );
    }
    return amount > 0 ? (
      <ArrowDownRight className="w-4 h-4 text-green-500" />
    ) : (
      <ArrowUpRight className="w-4 h-4 text-red-500" />
    );
  };

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Driver Wallet</h2>
          <button
            onClick={() => fetchTransactions(true)}
            disabled={refreshing}
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
          >
            <RefreshCcw className={clsx('w-5 h-5 text-gray-400', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Wallet Balance Card */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/80 text-xs">Available Balance</p>
              <p className="text-white text-2xl font-bold">
                Le {wallet.balance.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs text-white/70">
            <span>{wallet.currency} Wallet</span>
            <span>ID: {wallet.id.slice(0, 8)}...</span>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="flex-1 overflow-auto px-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-gray-400 text-xs uppercase tracking-wide">Recent Transactions</p>
          <span className="text-gray-500 text-xs">{transactions.length} transactions</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-gray-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-10">
            <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <Wallet className="w-6 h-6 text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm">No transactions yet</p>
            <p className="text-gray-600 text-xs mt-1">Start collecting payments to see them here</p>
          </div>
        ) : (
          <div className="space-y-2 pb-4">
            {transactions.map((tx) => {
              const canRefundTx = canRefund(tx);
              const refundTimeRemaining = getRefundTimeRemaining(tx);

              return (
                <div
                  key={tx.id}
                  className="bg-gray-800 rounded-xl p-3 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        'w-9 h-9 rounded-full flex items-center justify-center',
                        tx.type === 'REFUND'
                          ? 'bg-purple-500/20'
                          : tx.amount > 0
                          ? 'bg-green-500/20'
                          : 'bg-red-500/20'
                      )}
                    >
                      {getTransactionIcon(tx.type, tx.amount)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {tx.description || tx.merchant_name || tx.type}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <span>{timeAgo(tx.created_at)}</span>
                        {tx.status === 'REFUNDED' && (
                          <span className="text-purple-400">Refunded</span>
                        )}
                        {canRefundTx && refundTimeRemaining && (
                          <span className="text-yellow-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {refundTimeRemaining}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <p
                        className={clsx(
                          'text-sm font-semibold',
                          tx.type === 'REFUND'
                            ? 'text-purple-400'
                            : tx.amount > 0
                            ? 'text-green-400'
                            : 'text-red-400'
                        )}
                      >
                        {tx.amount > 0 ? '+' : ''}Le {Math.abs(tx.amount).toLocaleString()}
                      </p>
                    </div>

                    {/* Refund Button */}
                    {canRefundTx && tx.status !== 'REFUNDED' && (
                      <button
                        onClick={() => {
                          setSelectedTransaction(tx);
                          setShowRefundModal(true);
                          setRefundReason('');
                          setRefundError('');
                          setRefundSuccess(false);
                        }}
                        className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg text-yellow-400 transition-colors"
                        title="Refund this payment"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Start Collection Button */}
      <div className="p-4 border-t border-gray-800">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={onStart}
          className="w-full py-4 bg-cyan-500 text-black rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors"
          style={{
            boxShadow: '0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(34, 211, 238, 0.2)',
          }}
        >
          Start Collecting
          <ChevronRight className="w-5 h-5" />
        </motion.button>
      </div>

      {/* Refund Modal */}
      <AnimatePresence>
        {showRefundModal && selectedTransaction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-900 rounded-2xl w-full max-w-sm border border-gray-700"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-yellow-400" />
                  <h3 className="font-semibold text-white">Refund Payment</h3>
                </div>
                <button
                  onClick={() => setShowRefundModal(false)}
                  className="p-1 hover:bg-gray-800 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {refundSuccess ? (
                <div className="p-6 text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h4 className="text-lg font-semibold text-white mb-2">Refund Successful</h4>
                  <p className="text-gray-400 text-sm">
                    Le {selectedTransaction.amount.toLocaleString()} has been refunded to the customer.
                  </p>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {/* Transaction Info */}
                  <div className="bg-gray-800 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-400 text-sm">Amount</span>
                      <span className="text-white font-semibold">
                        Le {selectedTransaction.amount.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 text-sm">Date</span>
                      <span className="text-white text-sm">
                        {new Date(selectedTransaction.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Refund Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Reason for Refund *
                    </label>
                    <select
                      value={refundReason}
                      onChange={(e) => setRefundReason(e.target.value)}
                      className="w-full px-3 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="">Select a reason</option>
                      <option value="Customer request">Customer request</option>
                      <option value="Wrong amount charged">Wrong amount charged</option>
                      <option value="Trip cancelled">Trip cancelled</option>
                      <option value="Duplicate payment">Duplicate payment</option>
                      <option value="Service not provided">Service not provided</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Time Warning */}
                  <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-yellow-400 text-xs">
                      Refunds are only available within 1 hour of the transaction. This refund will deduct Le {selectedTransaction.amount.toLocaleString()} from your wallet balance.
                    </p>
                  </div>

                  {/* Error Message */}
                  {refundError && (
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <p className="text-red-400 text-xs">{refundError}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setShowRefundModal(false)}
                      disabled={refundLoading}
                      className="flex-1 py-3 bg-gray-800 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRefund}
                      disabled={!refundReason || refundLoading}
                      className={clsx(
                        'flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors',
                        refundReason && !refundLoading
                          ? 'bg-yellow-500 text-black hover:bg-yellow-400'
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      )}
                    >
                      {refundLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        'Confirm Refund'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
