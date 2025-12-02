/**
 * Pot Detail Page
 *
 * Detailed view of a single pot with transactions and actions
 */

import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  PiggyBank,
  ArrowUpRight,
  ArrowDownLeft,
  Settings,
  Trash2,
  Loader2,
  Lock,
  Unlock,
  Calendar,
  Target,
  TrendingUp,
  Repeat,
  AlertCircle,
  Edit2,
  MoreVertical,
  Clock,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui';
import { ContributePotModal, WithdrawPotModal } from '@/components/pots';
import {
  usePot,
  usePotSummary,
  usePotTransactions,
  useWithdrawalEligibility,
  useClosePot,
  useUpdatePot,
} from '@/hooks/usePots';
import { useWallets } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import type { PotTransaction, Wallet } from '@/types';

export function PotDetailPage() {
  const { potId } = useParams<{ potId: string }>();
  const navigate = useNavigate();

  const { data: pot, isLoading: loadingPot } = usePot(potId || '');
  const { data: summary, isLoading: loadingSummary } = usePotSummary(potId || '');
  const { data: transactions, isLoading: loadingTransactions } = usePotTransactions(potId || '', 1, 20);
  const { data: eligibility } = useWithdrawalEligibility(potId || '');
  const { data: wallets = [] } = useWallets();
  const closePot = useClosePot();
  const updatePot = useUpdatePot();

  const [showContributeModal, setShowContributeModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const primaryWallets = wallets.filter((w: Wallet) => w.status === 'ACTIVE');

  const isLoading = loadingPot || loadingSummary;
  const canWithdraw = eligibility?.canWithdraw || eligibility?.canWithdrawWithPenalty;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'contribution':
      case 'auto_deposit':
        return <ArrowUpRight className="w-4 h-4 text-green-600" />;
      case 'withdrawal':
        return <ArrowDownLeft className="w-4 h-4 text-red-600" />;
      case 'penalty':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'interest':
      case 'bonus':
        return <TrendingUp className="w-4 h-4 text-blue-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const handleClosePot = async () => {
    if (!pot || primaryWallets.length === 0) return;

    try {
      await closePot.mutateAsync({
        potId: pot.id,
        destinationWalletId: primaryWallets[0].id,
      });
      navigate('/pots');
    } catch (error) {
      console.error('Failed to close pot:', error);
    }
  };

  const handleToggleAutoDeposit = async () => {
    if (!pot) return;

    try {
      await updatePot.mutateAsync({
        potId: pot.id,
        data: {
          autoDepositEnabled: !pot.autoDepositEnabled,
        },
      });
    } catch (error) {
      console.error('Failed to update pot:', error);
    }
  };

  if (!potId) {
    return (
      <MainLayout>
        <div className="text-center py-16">
          <p className="text-gray-500">Pot not found</p>
          <Link to="/pots" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
            Back to Pots
          </Link>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/pots')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            {isLoading ? (
              <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
            ) : (
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${pot?.color || '#4F46E5'}15` }}
                >
                  <PiggyBank
                    className="w-5 h-5"
                    style={{ color: pot?.color || '#4F46E5' }}
                  />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{pot?.name}</h1>
                  {pot?.description && (
                    <p className="text-sm text-gray-500">{pot.description}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Settings Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-600" />
            </button>

            {showSettingsMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSettingsMenu(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                  <button
                    onClick={() => {
                      setShowSettingsMenu(false);
                      // Navigate to edit page or open modal
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Pot
                  </button>
                  {pot?.autoDepositEnabled !== undefined && (
                    <button
                      onClick={() => {
                        setShowSettingsMenu(false);
                        handleToggleAutoDeposit();
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Repeat className="w-4 h-4" />
                      {pot.autoDepositEnabled ? 'Disable' : 'Enable'} Auto-Deposit
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowSettingsMenu(false);
                      setShowCloseConfirm(true);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Close Pot
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        )}

        {/* Content */}
        {!isLoading && pot && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Balance Card */}
              <Card className="overflow-hidden">
                <div
                  className="h-2"
                  style={{ backgroundColor: pot.color || '#4F46E5' }}
                />
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-sm text-gray-500 mb-1">Current Balance</p>
                      <p className="text-4xl font-bold text-gray-900">
                        {formatCurrency(pot.currentBalance)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pot.lockStatus === 'LOCKED' || pot.adminLocked ? (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 rounded-full">
                          <Lock className="w-4 h-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-700">
                            {pot.adminLocked ? 'Admin Locked' : 'Locked'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-full">
                          <Unlock className="w-4 h-4 text-green-600" />
                          <span className="text-sm font-medium text-green-700">Unlocked</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {pot.goalAmount && (
                    <div className="mb-6">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-500">Progress to Goal</span>
                        <span className="font-medium text-gray-700">
                          {summary?.progressPercent?.toFixed(0) || 0}%
                        </span>
                      </div>
                      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, summary?.progressPercent || 0)}%`,
                            backgroundColor: pot.color || '#4F46E5',
                          }}
                        />
                      </div>
                      <div className="flex justify-between mt-2 text-sm text-gray-500">
                        <span>{formatCurrency(pot.currentBalance)}</span>
                        <span>{formatCurrency(pot.goalAmount)}</span>
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowContributeModal(true)}
                      className="flex-1 py-3 px-4 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <ArrowUpRight className="w-5 h-5" />
                      Add Money
                    </button>
                    <button
                      onClick={() => setShowWithdrawModal(true)}
                      disabled={!canWithdraw}
                      className={clsx(
                        'flex-1 py-3 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                        canWithdraw
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      <ArrowDownLeft className="w-5 h-5" />
                      Withdraw
                    </button>
                  </div>
                </div>
              </Card>

              {/* Transaction History */}
              <Card>
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Transaction History</h2>
                </div>

                {loadingTransactions ? (
                  <div className="p-8 flex justify-center">
                    <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
                  </div>
                ) : transactions?.data.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-gray-500">No transactions yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {transactions?.data.map((tx: PotTransaction) => (
                      <div
                        key={tx.id}
                        className="p-4 flex items-center justify-between hover:bg-gray-50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                            {getTransactionIcon(tx.transactionType)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 capitalize">
                              {tx.transactionType.replace('_', ' ')}
                            </p>
                            <p className="text-sm text-gray-500">
                              {tx.description || formatDateTime(tx.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p
                            className={clsx(
                              'font-semibold',
                              tx.transactionType === 'withdrawal' || tx.transactionType === 'penalty'
                                ? 'text-red-600'
                                : 'text-green-600'
                            )}
                          >
                            {tx.transactionType === 'withdrawal' || tx.transactionType === 'penalty'
                              ? '-'
                              : '+'}
                            {formatCurrency(tx.amount)}
                          </p>
                          {tx.balanceAfter !== undefined && (
                            <p className="text-xs text-gray-500">
                              Balance: {formatCurrency(tx.balanceAfter)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Details Card */}
              <Card>
                <div className="p-6 space-y-4">
                  <h3 className="font-semibold text-gray-900">Pot Details</h3>

                  {pot.goalAmount && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Target className="w-4 h-4" />
                        <span className="text-sm">Target Amount</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(pot.goalAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Lock className="w-4 h-4" />
                      <span className="text-sm">Lock Type</span>
                    </div>
                    <span className="font-medium text-gray-900 capitalize">
                      {pot.lockType.replace('_', ' ')}
                    </span>
                  </div>

                  {pot.lockEndDate && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">Maturity Date</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {formatDate(pot.lockEndDate)}
                      </span>
                    </div>
                  )}

                  {summary?.daysUntilUnlock !== undefined && summary.daysUntilUnlock > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">Days Until Unlock</span>
                      </div>
                      <span className="font-medium text-gray-900">
                        {summary.daysUntilUnlock} days
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm">Created</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      {formatDate(pot.createdAt)}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Auto-Deposit Card */}
              {pot.autoDepositEnabled && (
                <Card>
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Auto-Deposit</h3>
                      <div className="px-2 py-1 bg-green-100 rounded-full">
                        <span className="text-xs font-medium text-green-700">Active</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Amount</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(pot.autoDepositAmount || 0)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Frequency</span>
                      <span className="font-medium text-gray-900 capitalize">
                        {pot.autoDepositFrequency}
                      </span>
                    </div>

                    {pot.nextAutoDepositDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Next Deposit</span>
                        <span className="font-medium text-gray-900">
                          {formatDate(pot.nextAutoDepositDate)}
                        </span>
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Stats Card */}
              {summary?.stats && (
                <Card>
                  <div className="p-6 space-y-4">
                    <h3 className="font-semibold text-gray-900">Statistics</h3>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Contributions</span>
                      <span className="font-medium text-green-600">
                        +{formatCurrency(summary.stats.totalContributions)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Withdrawals</span>
                      <span className="font-medium text-red-600">
                        -{formatCurrency(summary.stats.totalWithdrawals)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Contribution Count</span>
                      <span className="font-medium text-gray-900">
                        {summary.stats.contributionCount}
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Withdrawal Info */}
              {eligibility && !eligibility.canWithdraw && (
                <Card className="bg-amber-50 border-amber-200">
                  <div className="p-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-amber-800">Withdrawal Restricted</h3>
                        <p className="text-sm text-amber-700 mt-1">{eligibility.reason}</p>
                        {eligibility.canWithdrawWithPenalty && (
                          <p className="text-sm text-amber-700 mt-2">
                            Early withdrawal available with {eligibility.penaltyPercent}% penalty.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {pot && (
        <>
          <ContributePotModal
            isOpen={showContributeModal}
            onClose={() => setShowContributeModal(false)}
            pot={pot}
            onSuccess={() => setShowContributeModal(false)}
          />

          <WithdrawPotModal
            isOpen={showWithdrawModal}
            onClose={() => setShowWithdrawModal(false)}
            pot={pot}
            onSuccess={() => setShowWithdrawModal(false)}
          />
        </>
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirm && pot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowCloseConfirm(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Close Pot?</h2>
            <p className="text-gray-600 mb-4">
              Are you sure you want to close "{pot.name}"?
              {pot.currentBalance > 0 && (
                <>
                  {' '}
                  Your remaining balance of {formatCurrency(pot.currentBalance)} will be transferred
                  to your primary wallet.
                </>
              )}
            </p>
            {pot.lockStatus === 'LOCKED' && (
              <div className="p-3 bg-amber-50 rounded-lg mb-4">
                <p className="text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Early closure may incur a penalty fee.
                </p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setShowCloseConfirm(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleClosePot}
                disabled={closePot.isPending}
                className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 text-white font-medium hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {closePot.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Closing...
                  </>
                ) : (
                  'Close Pot'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default PotDetailPage;
