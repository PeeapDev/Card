/**
 * User Disputes Page
 *
 * Allows users to:
 * - View their disputes
 * - File new disputes
 * - Communicate with merchants and admins
 */

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Plus,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  MessageSquare,
  Eye,
  ChevronRight,
  Loader2,
  X,
  FileText,
  Upload,
  DollarSign,
  Calendar,
  Store,
  HelpCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { DisputeThread } from '@/components/disputes/DisputeThread';
import {
  disputeService,
  Dispute,
  DisputeReason,
  DISPUTE_REASONS,
  DISPUTE_STATUSES,
} from '@/services/dispute.service';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { formatDistanceToNow } from 'date-fns';

interface Transaction {
  id: string;
  amount: number;
  currency: string;
  merchant_name?: string;
  business_id?: string;
  created_at: string;
  type: string;
}

export function UserDisputesPage() {
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // New dispute modal
  const [showNewDispute, setShowNewDispute] = useState(false);
  const [newDisputeStep, setNewDisputeStep] = useState<'select' | 'details'>('select');
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [disputeForm, setDisputeForm] = useState({
    reason: '' as DisputeReason | '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Dispute detail view
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadDisputes();
    }
  }, [user?.id]);

  const loadDisputes = async () => {
    if (!user?.id) return;
    setLoading(true);
    const userDisputes = await disputeService.getCustomerDisputes(user.id);
    setDisputes(userDisputes);
    setLoading(false);
  };

  const loadRecentTransactions = async () => {
    if (!user?.id) return;
    setLoadingTransactions(true);

    try {
      // Get recent transactions that could be disputed
      const { data, error } = await supabase
        .from('checkout_sessions')
        .select(`
          id,
          amount,
          currency,
          status,
          created_at,
          merchant_businesses(id, name)
        `)
        .eq('customer_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        setRecentTransactions(
          data.map((t: any) => ({
            id: t.id,
            amount: t.amount,
            currency: t.currency || 'SLE',
            merchant_name: t.merchant_businesses?.name,
            business_id: t.merchant_businesses?.id,
            created_at: t.created_at,
            type: 'payment',
          }))
        );
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleOpenNewDispute = () => {
    setShowNewDispute(true);
    setNewDisputeStep('select');
    setSelectedTransaction(null);
    setDisputeForm({ reason: '', description: '' });
    loadRecentTransactions();
  };

  const handleSelectTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setNewDisputeStep('details');
  };

  const handleSubmitDispute = async () => {
    if (!selectedTransaction || !disputeForm.reason || !disputeForm.description.trim()) return;

    setSubmitting(true);
    const { dispute, error } = await disputeService.createDispute({
      transaction_id: selectedTransaction.id,
      business_id: selectedTransaction.business_id,
      reason: disputeForm.reason as DisputeReason,
      description: disputeForm.description,
      amount: selectedTransaction.amount,
      currency: selectedTransaction.currency,
      customer_name: user?.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : undefined,
      customer_email: user?.email,
    });

    setSubmitting(false);

    if (dispute) {
      setShowNewDispute(false);
      loadDisputes();
      setSelectedDispute(dispute);
    } else {
      alert(error || 'Failed to file dispute');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
      case 'pending_merchant':
      case 'pending_customer':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'under_review':
        return <Eye className="w-4 h-4 text-blue-500" />;
      case 'resolved':
      case 'won':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'lost':
      case 'closed':
        return <XCircle className="w-4 h-4 text-gray-500" />;
      case 'escalated':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const filteredDisputes = disputes.filter((dispute) => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'active' && ['resolved', 'won', 'lost', 'closed'].includes(dispute.status)) return false;
      if (statusFilter === 'resolved' && !['resolved', 'won', 'lost', 'closed'].includes(dispute.status)) return false;
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        dispute.id.toLowerCase().includes(query) ||
        dispute.reason.toLowerCase().includes(query) ||
        dispute.business_name?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const stats = {
    total: disputes.length,
    active: disputes.filter(d => !['resolved', 'won', 'lost', 'closed'].includes(d.status)).length,
    won: disputes.filter(d => d.status === 'won').length,
    lost: disputes.filter(d => d.status === 'lost').length,
  };

  if (selectedDispute) {
    return (
      <MainLayout>
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedDispute(null);
              loadDisputes();
            }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to Disputes
          </button>

          {/* Dispute Thread */}
          <Card className="h-[calc(100vh-200px)] overflow-hidden">
            <DisputeThread
              dispute={selectedDispute}
              userRole="customer"
              onStatusChange={loadDisputes}
            />
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Disputes</h1>
            <p className="text-gray-500 dark:text-gray-400">File and track transaction disputes</p>
          </div>
          <button
            onClick={handleOpenNewDispute}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            File a Dispute
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Disputes</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.active}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Won</p>
            <p className="text-2xl font-bold text-green-600">{stats.won}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">Lost</p>
            <p className="text-2xl font-bold text-red-600">{stats.lost}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search disputes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Disputes</option>
              <option value="active">Active</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </Card>

        {/* Disputes List */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : filteredDisputes.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                {disputes.length === 0 ? 'No disputes yet' : 'No disputes match your filters'}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {disputes.length === 0 ? 'File a dispute if you have an issue with a transaction' : 'Try adjusting your search'}
              </p>
              {disputes.length === 0 && (
                <button
                  onClick={handleOpenNewDispute}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  File a Dispute
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredDisputes.map((dispute) => (
                <div
                  key={dispute.id}
                  onClick={() => setSelectedDispute(dispute)}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        ['resolved', 'won'].includes(dispute.status) ? 'bg-green-100 dark:bg-green-900/30' :
                        ['lost', 'closed'].includes(dispute.status) ? 'bg-gray-100 dark:bg-gray-700' :
                        'bg-yellow-100 dark:bg-yellow-900/30'
                      }`}>
                        {getStatusIcon(dispute.status)}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {DISPUTE_REASONS[dispute.reason as keyof typeof DISPUTE_REASONS] || dispute.reason}
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            DISPUTE_STATUSES[dispute.status]?.color === 'green' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            DISPUTE_STATUSES[dispute.status]?.color === 'yellow' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            DISPUTE_STATUSES[dispute.status]?.color === 'red' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {DISPUTE_STATUSES[dispute.status]?.label || dispute.status}
                          </span>
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {dispute.business_name || 'Unknown Merchant'}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDistanceToNow(new Date(dispute.created_at))} ago
                          </span>
                          {dispute.message_count && dispute.message_count > 0 && (
                            <span className="flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" />
                              {dispute.message_count} messages
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {dispute.currency} {dispute.amount.toLocaleString()}
                      </p>
                      <ChevronRight className="w-5 h-5 text-gray-400 ml-auto mt-2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* New Dispute Modal */}
        {showNewDispute && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {newDisputeStep === 'select' ? 'Select Transaction' : 'Dispute Details'}
                </h2>
                <button
                  onClick={() => setShowNewDispute(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto max-h-[calc(90vh-120px)]">
                {newDisputeStep === 'select' ? (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Select the transaction you want to dispute:
                    </p>

                    {loadingTransactions ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
                      </div>
                    ) : recentTransactions.length === 0 ? (
                      <div className="text-center py-8">
                        <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No recent transactions found</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentTransactions.map((tx) => (
                          <button
                            key={tx.id}
                            onClick={() => handleSelectTransaction(tx)}
                            className="w-full p-4 text-left border border-gray-200 dark:border-gray-600 rounded-lg hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {tx.merchant_name || 'Unknown Merchant'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {new Date(tx.created_at).toLocaleDateString()} &bull; {tx.type}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {tx.currency} {tx.amount.toLocaleString()}
                                </p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Selected Transaction */}
                    {selectedTransaction && (
                      <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {selectedTransaction.merchant_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {new Date(selectedTransaction.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {selectedTransaction.currency} {selectedTransaction.amount.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Dispute Reason */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Reason for Dispute *
                      </label>
                      <select
                        value={disputeForm.reason}
                        onChange={(e) => setDisputeForm({ ...disputeForm, reason: e.target.value as DisputeReason })}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select a reason</option>
                        {Object.entries(DISPUTE_REASONS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Description */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description *
                      </label>
                      <textarea
                        value={disputeForm.description}
                        onChange={(e) => setDisputeForm({ ...disputeForm, description: e.target.value })}
                        placeholder="Describe your issue in detail..."
                        rows={4}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Be specific about what happened and what resolution you're seeking
                      </p>
                    </div>

                    {/* Info Box */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex gap-2">
                        <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          <p className="font-medium mb-1">What happens next?</p>
                          <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                            <li>The merchant will be notified and has 7 days to respond</li>
                            <li>You can upload evidence and communicate directly</li>
                            <li>Our team will review and make a fair decision</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => setNewDisputeStep('select')}
                        className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleSubmitDispute}
                        disabled={!disputeForm.reason || !disputeForm.description.trim() || submitting}
                        className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <FileText className="w-4 h-4" />
                            File Dispute
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
