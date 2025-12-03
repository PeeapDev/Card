/**
 * Cashback Rewards Page
 *
 * Displays user's cashback balance, rewards history, and redemption options
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { cashbackService, CashbackReward, CashbackBalance } from '@/services/cashback.service';
import { supabase } from '@/lib/supabase';

type TabType = 'overview' | 'history' | 'redeem';
type FilterStatus = 'all' | 'CREDITED' | 'REDEEMED' | 'EXPIRED';

export function CashbackRewardsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);

  // Data states
  const [balance, setBalance] = useState<CashbackBalance | null>(null);
  const [rewards, setRewards] = useState<CashbackReward[]>([]);
  const [stats, setStats] = useState<{
    thisMonth: number;
    lastMonth: number;
    averagePercentage: number;
    topCategory: string;
  } | null>(null);

  // Filter/pagination
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [wallet, setWallet] = useState<{ id: string; balance: number; currency: string } | null>(null);

  // Redemption
  const [redeemAmount, setRedeemAmount] = useState<string>('');
  const [redeemAll, setRedeemAll] = useState(true);
  const [redeemSuccess, setRedeemSuccess] = useState<{ amount: number } | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user?.id]);

  // Filter rewards when status changes
  useEffect(() => {
    if (user?.id) {
      loadRewards();
    }
  }, [statusFilter, user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      // Load balance, stats, rewards, and wallet in parallel
      const [balanceData, statsData, rewardsData, walletData] = await Promise.all([
        cashbackService.getBalance(user.id),
        cashbackService.getStats(user.id),
        cashbackService.getRewards(user.id, { limit: 50 }),
        loadWallet(),
      ]);

      setBalance(balanceData);
      setStats(statsData);
      setRewards(rewardsData);
      setWallet(walletData);
    } catch (error) {
      console.error('Error loading cashback data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRewards = async () => {
    if (!user?.id) return;

    try {
      const rewardsData = await cashbackService.getRewards(user.id, {
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 50,
      });
      setRewards(rewardsData);
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  };

  const loadWallet = async () => {
    if (!user?.id) return null;

    const { data } = await supabase
      .from('wallets')
      .select('id, balance, currency')
      .eq('user_id', user.id)
      .eq('is_primary', true)
      .single();

    return data ? {
      id: data.id,
      balance: parseFloat(data.balance) || 0,
      currency: data.currency || 'SLE',
    } : null;
  };

  const handleRedeem = async () => {
    if (!user?.id || !wallet?.id) return;

    setRedeeming(true);
    setRedeemError(null);
    setRedeemSuccess(null);

    try {
      const amount = redeemAll ? undefined : parseFloat(redeemAmount);

      if (!redeemAll && (!amount || amount <= 0)) {
        setRedeemError('Please enter a valid amount');
        setRedeeming(false);
        return;
      }

      if (!redeemAll && balance && amount && amount > balance.availableBalance) {
        setRedeemError('Amount exceeds available balance');
        setRedeeming(false);
        return;
      }

      const result = await cashbackService.redeem(user.id, wallet.id, amount);

      if (result.success) {
        setRedeemSuccess({ amount: result.amount });
        setRedeemAmount('');
        setRedeemAll(true);
        // Reload data
        await loadData();
      } else {
        setRedeemError(result.message);
      }
    } catch (error: any) {
      setRedeemError(error.message || 'Failed to redeem cashback');
    } finally {
      setRedeeming(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getStatusBadge = (status: CashbackReward['status']) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-800',
      CREDITED: 'bg-green-100 text-green-800',
      REDEEMED: 'bg-blue-100 text-blue-800',
      EXPIRED: 'bg-gray-100 text-gray-600',
    };

    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
        {status}
      </span>
    );
  };

  const getTransactionTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      PAYMENT: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      BILL_PAYMENT: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      AIRTIME: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
      TRANSFER: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4',
    };

    return icons[type] || icons.PAYMENT;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cashback Rewards</h1>
            <p className="text-gray-600 mt-1">Earn rewards on every eligible transaction</p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <svg className="w-10 h-10 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white mb-6 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-indigo-200 text-sm font-medium">Available Cashback</p>
            <p className="text-4xl font-bold mt-1">{formatCurrency(balance?.availableBalance || 0)}</p>
            {(balance?.pendingBalance || 0) > 0 && (
              <p className="text-indigo-200 text-sm mt-2">
                + {formatCurrency(balance?.pendingBalance || 0)} pending
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="text-indigo-200 text-xs">Lifetime Earned</p>
            <p className="text-lg font-semibold">{formatCurrency(balance?.lifetimeEarned || 0)}</p>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-indigo-500/30">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{balance?.totalRewards || 0}</p>
              <p className="text-indigo-200 text-xs">Total Rewards</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{formatCurrency(balance?.totalRedeemed || 0)}</p>
              <p className="text-indigo-200 text-xs">Redeemed</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.averagePercentage?.toFixed(1) || 0}%</p>
              <p className="text-indigo-200 text-xs">Avg. Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-xs">This Month</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats?.thisMonth || 0)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Last Month</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(stats?.lastMonth || 0)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
        {(['overview', 'history', 'redeem'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-white text-indigo-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {tab === 'overview' && 'Overview'}
            {tab === 'history' && 'History'}
            {tab === 'redeem' && 'Redeem'}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* How it works */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">How Cashback Works</h3>
            <div className="grid gap-4">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Make Eligible Transactions</p>
                  <p className="text-sm text-gray-500">Use your Peeap card for payments, bills, and airtime</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Earn Cashback Automatically</p>
                  <p className="text-sm text-gray-500">Get up to 5% cashback based on your card type</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                  <span className="text-indigo-600 font-semibold text-sm">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Redeem to Your Wallet</p>
                  <p className="text-sm text-gray-500">Transfer cashback to your wallet anytime</p>
                </div>
              </div>
            </div>
          </div>

          {/* Recent rewards */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Recent Rewards</h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
              >
                View All
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              {rewards.slice(0, 5).map((reward) => (
                <div key={reward.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTransactionTypeIcon(reward.transactionType)} />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {reward.merchantName || reward.transactionType}
                      </p>
                      <p className="text-sm text-gray-500">{formatDate(reward.createdAt)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+{formatCurrency(reward.amount)}</p>
                    <p className="text-xs text-gray-500">{reward.percentageApplied}% on {formatCurrency(reward.originalAmount)}</p>
                  </div>
                </div>
              ))}
              {rewards.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No cashback rewards yet</p>
                  <p className="text-sm mt-1">Make eligible transactions to start earning</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {(['all', 'CREDITED', 'REDEEMED', 'EXPIRED'] as FilterStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'all' ? 'All' : status}
              </button>
            ))}
          </div>

          {/* Rewards list */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="divide-y divide-gray-100">
              {rewards.map((reward) => (
                <div key={reward.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getTransactionTypeIcon(reward.transactionType)} />
                        </svg>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900">
                            {reward.merchantName || reward.transactionType}
                          </p>
                          {getStatusBadge(reward.status)}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {reward.percentageApplied}% cashback on {formatCurrency(reward.originalAmount)}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">{formatDate(reward.createdAt)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${reward.status === 'CREDITED' ? 'text-green-600' : 'text-gray-600'}`}>
                        +{formatCurrency(reward.amount)}
                      </p>
                      {reward.expiresAt && reward.status === 'CREDITED' && (
                        <p className="text-xs text-gray-400 mt-1">
                          Expires {formatDate(reward.expiresAt)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {rewards.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  <p>No rewards found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'redeem' && (
        <div className="space-y-6">
          {/* Redemption card */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-4">Redeem Cashback</h3>

            {redeemSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">Successfully redeemed {formatCurrency(redeemSuccess.amount)}</span>
                </div>
              </div>
            )}

            {redeemError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{redeemError}</span>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Available to redeem</span>
                  <span className="text-xl font-bold text-gray-900">{formatCurrency(balance?.availableBalance || 0)}</span>
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={redeemAll}
                    onChange={() => setRedeemAll(true)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">Redeem all available cashback</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={!redeemAll}
                    onChange={() => setRedeemAll(false)}
                    className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-gray-700">Redeem custom amount</span>
                </label>
              </div>

              {!redeemAll && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to redeem
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">Le</span>
                    <input
                      type="number"
                      value={redeemAmount}
                      onChange={(e) => setRedeemAmount(e.target.value)}
                      placeholder="0.00"
                      min="0.01"
                      max={balance?.availableBalance || 0}
                      step="0.01"
                      className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="p-4 bg-indigo-50 rounded-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-indigo-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-indigo-800">
                    <p className="font-medium">Cashback will be added to your wallet</p>
                    <p className="mt-1 text-indigo-600">
                      Wallet balance: {wallet ? formatCurrency(wallet.balance) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleRedeem}
                disabled={redeeming || !balance?.availableBalance || balance.availableBalance < 0.01}
                className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
                  redeeming || !balance?.availableBalance || balance.availableBalance < 0.01
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {redeeming ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </span>
                ) : (
                  `Redeem ${redeemAll ? formatCurrency(balance?.availableBalance || 0) : redeemAmount ? formatCurrency(parseFloat(redeemAmount)) : 'Cashback'}`
                )}
              </button>
            </div>
          </div>

          {/* Terms */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-900 mb-2">Redemption Terms</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Minimum redemption: Le 0.01</li>
              <li>• Cashback expires 90 days after being credited</li>
              <li>• Redeemed cashback is added to your primary wallet instantly</li>
              <li>• Expired cashback cannot be recovered</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
