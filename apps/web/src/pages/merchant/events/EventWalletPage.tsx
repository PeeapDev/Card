/**
 * Event Wallet Page
 *
 * Manages event wallet, transfers to staff and main wallet.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useAuth } from '@/context/AuthContext';
import eventService, {
  Event,
  EventWallet,
  EventWalletTransaction,
  EventStaff,
  EventStaffPayment,
} from '@/services/event.service';
import { currencyService } from '@/services/currency.service';
import {
  ArrowLeft,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Users,
  Building2,
  Loader2,
  Search,
  Check,
  X,
  Clock,
  Ticket,
  RefreshCcw,
  Send,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

type TabType = 'transactions' | 'payments';

export function EventWalletPage() {
  const navigate = useNavigate();
  const { eventId } = useParams<{ eventId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<Event | null>(null);
  const [wallet, setWallet] = useState<EventWallet | null>(null);
  const [transactions, setTransactions] = useState<EventWalletTransaction[]>([]);
  const [staffPayments, setStaffPayments] = useState<EventStaffPayment[]>([]);
  const [eventStaff, setEventStaff] = useState<EventStaff[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('transactions');

  // Transfer modals
  const [showStaffTransferModal, setShowStaffTransferModal] = useState(false);
  const [showMainTransferModal, setShowMainTransferModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<EventStaff | null>(null);
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDescription, setTransferDescription] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Staff payment actions
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;

    setLoading(true);
    try {
      const [eventData, walletData, staffData, paymentsData] = await Promise.all([
        eventService.getEventById(eventId),
        eventService.getEventWallet(eventId),
        eventService.getEventStaff(eventId),
        eventService.getStaffPayments(eventId),
      ]);

      setEvent(eventData);
      setWallet(walletData);
      setEventStaff(staffData.filter((s) => s.invitation_status === 'accepted'));
      setStaffPayments(paymentsData);

      if (walletData) {
        const txData = await eventService.getEventWalletTransactions(walletData.id!);
        setTransactions(txData);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return currencyService.formatAmount(amount, wallet?.currency || 'SLE');
  };

  const handleStaffTransfer = async () => {
    if (!wallet || !selectedStaff || !transferAmount || !user?.id) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > wallet.balance) {
      alert('Insufficient balance');
      return;
    }

    setTransferring(true);
    try {
      const result = await eventService.transferToStaff(
        wallet.id!,
        eventId!,
        selectedStaff.user_id,
        amount,
        transferDescription || undefined
      );

      if (result.success) {
        alert(result.message);
        setShowStaffTransferModal(false);
        setSelectedStaff(null);
        setTransferAmount('');
        setTransferDescription('');
        loadData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert('Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleMainTransfer = async () => {
    if (!wallet || !transferAmount || !user?.id || !eventId) return;

    const amount = parseFloat(transferAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (amount > wallet.balance) {
      alert('Insufficient balance');
      return;
    }

    setTransferring(true);
    try {
      const result = await eventService.transferToMainWallet(
        wallet.id!,
        eventId,
        user.id,
        amount,
        transferDescription || undefined
      );

      if (result.success) {
        alert(result.message);
        setShowMainTransferModal(false);
        setTransferAmount('');
        setTransferDescription('');
        loadData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Transfer error:', error);
      alert('Transfer failed');
    } finally {
      setTransferring(false);
    }
  };

  const handleApprovePayment = async (paymentId: string) => {
    if (!user?.id) return;

    setProcessingPaymentId(paymentId);
    try {
      const result = await eventService.approveStaffPayment(paymentId, user.id);
      if (result.success) {
        alert(result.message);
        loadData();
      } else {
        alert(result.message);
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve payment');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    if (!user?.id) return;
    if (!confirm('Are you sure you want to reject this payment request?')) return;

    setProcessingPaymentId(paymentId);
    try {
      await eventService.rejectStaffPayment(paymentId, user.id);
      loadData();
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment');
    } finally {
      setProcessingPaymentId(null);
    }
  };

  const getTransactionIcon = (type: string, direction: string) => {
    switch (type) {
      case 'ticket_sale':
        return <Ticket className="w-4 h-4 text-green-500" />;
      case 'transfer_to_staff':
        return <Users className="w-4 h-4 text-blue-500" />;
      case 'transfer_to_main':
        return <Building2 className="w-4 h-4 text-purple-500" />;
      case 'refund':
        return <RefreshCcw className="w-4 h-4 text-red-500" />;
      default:
        return direction === 'credit' ? (
          <ArrowDownLeft className="w-4 h-4 text-green-500" />
        ) : (
          <ArrowUpRight className="w-4 h-4 text-red-500" />
        );
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
      pending: {
        bg: 'bg-yellow-100 dark:bg-yellow-900/30',
        text: 'text-yellow-700 dark:text-yellow-400',
        icon: <Clock className="w-3 h-3" />,
      },
      approved: {
        bg: 'bg-blue-100 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-400',
        icon: <Check className="w-3 h-3" />,
      },
      completed: {
        bg: 'bg-green-100 dark:bg-green-900/30',
        text: 'text-green-700 dark:text-green-400',
        icon: <Check className="w-3 h-3" />,
      },
      rejected: {
        bg: 'bg-red-100 dark:bg-red-900/30',
        text: 'text-red-700 dark:text-red-400',
        icon: <X className="w-3 h-3" />,
      },
    };
    return styles[status] || styles.pending;
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!wallet) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Wallet Not Found
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            The wallet for this event could not be found.
          </p>
          <Button onClick={() => navigate(`/merchant/events/${eventId}`)}>Back to Event</Button>
        </div>
      </MerchantLayout>
    );
  }

  const pendingPayments = staffPayments.filter((p) => p.status === 'pending');

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(`/merchant/events/${eventId}`)}
            className="p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Event Wallet</h1>
            <p className="text-gray-600 dark:text-gray-400">{event?.title}</p>
          </div>
        </div>

        {/* Wallet Balance Card */}
        <Card className="p-6 bg-gradient-to-r from-purple-600 to-purple-800 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-200 text-sm mb-1">Available Balance</p>
              <p className="text-4xl font-bold">{formatCurrency(wallet.balance)}</p>
              <p className="text-purple-200 text-sm mt-2">
                Last updated: {new Date(wallet.updated_at || '').toLocaleString()}
              </p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Wallet className="w-8 h-8" />
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => setShowStaffTransferModal(true)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
              disabled={wallet.balance <= 0 || eventStaff.length === 0}
            >
              <Users className="w-4 h-4 mr-2" />
              Pay Staff
            </Button>
            <Button
              onClick={() => setShowMainTransferModal(true)}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white border-0"
              disabled={wallet.balance <= 0}
            >
              <Building2 className="w-4 h-4 mr-2" />
              To Main Wallet
            </Button>
          </div>
        </Card>

        {/* Pending Payments Alert */}
        {pendingPayments.length > 0 && (
          <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              <div className="flex-1">
                <p className="font-medium text-yellow-800 dark:text-yellow-200">
                  {pendingPayments.length} Pending Payment Request
                  {pendingPayments.length > 1 ? 's' : ''}
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  Review and approve staff payment requests
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('payments')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white"
              >
                Review
              </Button>
            </div>
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors ${
              activeTab === 'transactions'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 font-medium text-sm border-b-2 -mb-px transition-colors flex items-center gap-2 ${
              activeTab === 'payments'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Staff Payments
            {pendingPayments.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-500 text-white rounded-full">
                {pendingPayments.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'transactions' ? (
          <Card className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.length === 0 ? (
              <div className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No transactions yet</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Transactions will appear here when tickets are sold
                </p>
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    {getTransactionIcon(tx.type, tx.direction)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {tx.description || tx.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {new Date(tx.created_at!).toLocaleString()}
                      {tx.recipient && ` • ${tx.recipient.first_name} ${tx.recipient.last_name}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-semibold ${
                        tx.direction === 'credit'
                          ? 'text-green-600 dark:text-green-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {tx.direction === 'credit' ? '+' : '-'}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-400">{tx.reference}</p>
                  </div>
                </div>
              ))
            )}
          </Card>
        ) : (
          <Card className="divide-y divide-gray-200 dark:divide-gray-700">
            {staffPayments.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No payment requests</p>
                <p className="text-sm text-gray-400 dark:text-gray-500">
                  Staff payment requests will appear here
                </p>
              </div>
            ) : (
              staffPayments.map((payment) => {
                const statusStyle = getPaymentStatusBadge(payment.status);
                const staffUser = payment.staff;

                return (
                  <div key={payment.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                          <Users className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {staffUser?.first_name} {staffUser?.last_name}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {payment.payment_type} • {payment.description || 'No description'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount)}
                        </p>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusStyle.bg} ${statusStyle.text}`}
                        >
                          {statusStyle.icon}
                          {payment.status}
                        </span>
                      </div>
                    </div>

                    {payment.status === 'pending' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                        <Button
                          size="sm"
                          onClick={() => handleApprovePayment(payment.id!)}
                          disabled={processingPaymentId === payment.id}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {processingPaymentId === payment.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="w-4 h-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRejectPayment(payment.id!)}
                          disabled={processingPaymentId === payment.id}
                          className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </Card>
        )}

        {/* Staff Transfer Modal */}
        <Modal
          isOpen={showStaffTransferModal}
          onClose={() => {
            setShowStaffTransferModal(false);
            setSelectedStaff(null);
            setTransferAmount('');
            setTransferDescription('');
          }}
          title="Pay Staff Member"
        >
          <Modal.Body>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Select Staff Member
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {eventStaff.map((staff) => {
                    const userData = (staff as any).users;
                    return (
                      <button
                        key={staff.id}
                        onClick={() => setSelectedStaff(staff)}
                        className={`w-full p-3 rounded-lg border text-left transition-colors ${
                          selectedStaff?.id === staff.id
                            ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <p className="font-medium text-gray-900 dark:text-white">
                          {userData?.first_name} {userData?.last_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {userData?.email}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount ({wallet?.currency})
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter amount"
                  min="0"
                  max={wallet?.balance}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {formatCurrency(wallet?.balance || 0)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="e.g., Bonus for great work"
                />
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              onClick={() => {
                setShowStaffTransferModal(false);
                setSelectedStaff(null);
                setTransferAmount('');
                setTransferDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleStaffTransfer}
              disabled={!selectedStaff || !transferAmount || transferring}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {transferring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Payment
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Main Wallet Transfer Modal */}
        <Modal
          isOpen={showMainTransferModal}
          onClose={() => {
            setShowMainTransferModal(false);
            setTransferAmount('');
            setTransferDescription('');
          }}
          title="Transfer to Main Wallet"
        >
          <Modal.Body>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  Transfer funds from your event wallet to your main wallet for spending or
                  withdrawal.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount ({wallet?.currency})
                </label>
                <input
                  type="number"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="Enter amount"
                  min="0"
                  max={wallet?.balance}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: {formatCurrency(wallet?.balance || 0)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={transferDescription}
                  onChange={(e) => setTransferDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="e.g., Event revenue withdrawal"
                />
              </div>

              <button
                onClick={() => setTransferAmount(wallet?.balance.toString() || '0')}
                className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400"
              >
                Transfer entire balance
              </button>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="outline"
              onClick={() => {
                setShowMainTransferModal(false);
                setTransferAmount('');
                setTransferDescription('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleMainTransfer}
              disabled={!transferAmount || transferring}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {transferring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Building2 className="w-4 h-4 mr-2" />
                  Transfer
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </MerchantLayout>
  );
}
