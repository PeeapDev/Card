import { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  Snowflake,
  Ban,
  Unlock,
  RefreshCw,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  ChevronDown,
  MoreVertical,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';

interface IssuedCardData {
  id: string;
  userId: string;
  walletId: string;
  cardLastFour: string;
  expiryMonth: number;
  expiryYear: number;
  cardType: string;
  cardStatus: string;
  cardName: string;
  cardLabel: string | null;
  cardColor: string;
  dailyLimit: number;
  weeklyLimit: number;
  monthlyLimit: number;
  perTransactionLimit: number;
  dailySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  onlinePaymentsEnabled: boolean;
  contactlessEnabled: boolean;
  atmWithdrawalsEnabled: boolean;
  internationalEnabled: boolean;
  activatedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  wallet?: {
    id: string;
    balance: number;
    currency: string;
  };
}

interface CardStats {
  totalCards: number;
  activeCards: number;
  pendingCards: number;
  frozenCards: number;
  blockedCards: number;
  totalTransactions: number;
  totalTransactionVolume: number;
}

export function AdminVirtualCardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<IssuedCardData[]>([]);
  const [stats, setStats] = useState<CardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<IssuedCardData | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [blockReason, setBlockReason] = useState('');

  useEffect(() => {
    fetchCards();
    fetchStats();
  }, [statusFilter]);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '100' };
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      const data = await api.get<{ success: boolean; cards: IssuedCardData[] }>('/virtual-cards/admin/all', { params });
      if (data.success) {
        setCards(data.cards || []);
      }
    } catch (error) {
      console.error('Failed to fetch cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    setStatsLoading(true);
    try {
      const data = await api.get<{ success: boolean; stats: CardStats }>('/virtual-cards/admin/stats');
      if (data.success) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleApprove = async (cardId: string) => {
    setActionLoading(cardId);
    try {
      const data = await api.post<{ success: boolean }>(`/virtual-cards/admin/${cardId}/approve`);
      if (data.success) {
        fetchCards();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to approve card:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBlock = async (cardId: string, reason: string) => {
    if (!reason) {
      alert('Please provide a reason for blocking');
      return;
    }

    setActionLoading(cardId);
    try {
      const data = await api.post<{ success: boolean }>(`/virtual-cards/admin/${cardId}/block`, { reason });
      if (data.success) {
        fetchCards();
        fetchStats();
        setShowCardModal(false);
        setBlockReason('');
      }
    } catch (error) {
      console.error('Failed to block card:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnblock = async (cardId: string) => {
    setActionLoading(cardId);
    try {
      const data = await api.post<{ success: boolean }>(`/virtual-cards/admin/${cardId}/unblock`);
      if (data.success) {
        fetchCards();
        fetchStats();
      }
    } catch (error) {
      console.error('Failed to unblock card:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Le ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      frozen: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
      expired: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400',
    };
    return styles[status] || styles.expired;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'frozen': return <Snowflake className="w-4 h-4" />;
      case 'blocked': return <Ban className="w-4 h-4" />;
      default: return <XCircle className="w-4 h-4" />;
    }
  };

  const filteredCards = cards.filter(card => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const userName = card.user ? `${card.user.firstName} ${card.user.lastName}`.toLowerCase() : '';
      const email = card.user?.email?.toLowerCase() || '';
      const phone = card.user?.phone?.toLowerCase() || '';
      const cardName = card.cardName.toLowerCase();
      const last4 = card.cardLastFour.toLowerCase();

      if (!userName.includes(query) && !email.includes(query) && !phone.includes(query) &&
          !cardName.includes(query) && !last4.includes(query)) {
        return false;
      }
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Virtual Cards</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage closed-loop virtual cards issued to users
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => { fetchCards(); fetchStats(); }}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Cards</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '-' : stats?.totalCards || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '-' : stats?.activeCards || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Pending</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '-' : stats?.pendingCards || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Snowflake className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Frozen</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '-' : stats?.frozenCards || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '-' : stats?.totalTransactions || 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Volume</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {statsLoading ? '-' : formatCurrency(stats?.totalTransactionVolume || 0)}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Search */}
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, phone, or card..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="frozen">Frozen</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Cards Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : filteredCards.length === 0 ? (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No cards found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Card
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Balance
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Daily Limit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCards.map((card) => (
                    <tr key={card.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-8 rounded-lg flex items-center justify-center text-white text-xs font-mono"
                            style={{ backgroundColor: card.cardColor }}
                          >
                            {card.cardLastFour}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{card.cardName}</p>
                            <p className="text-xs text-gray-500">{card.cardLabel || 'Virtual Card'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {card.user ? (
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {card.user.firstName} {card.user.lastName}
                            </p>
                            <p className="text-xs text-gray-500">{card.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <span className={clsx('inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full', getStatusBadge(card.cardStatus))}>
                          {getStatusIcon(card.cardStatus)}
                          {card.cardStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {card.wallet ? formatCurrency(card.wallet.balance * 100) : '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-gray-700 dark:text-gray-300">{formatCurrency(card.dailyLimit)}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(card.dailySpent)} spent
                        </p>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500">
                        {formatDistanceToNow(new Date(card.createdAt), { addSuffix: true })}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          {card.cardStatus === 'pending' && (
                            <Button
                              size="sm"
                              onClick={() => handleApprove(card.id)}
                              disabled={actionLoading === card.id}
                            >
                              {actionLoading === card.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}
                          {card.cardStatus === 'blocked' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnblock(card.id)}
                              disabled={actionLoading === card.id}
                            >
                              {actionLoading === card.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4 mr-1" />
                                  Unblock
                                </>
                              )}
                            </Button>
                          )}
                          {['active', 'frozen'].includes(card.cardStatus) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:bg-red-50"
                              onClick={() => {
                                setSelectedCard(card);
                                setShowCardModal(true);
                              }}
                            >
                              <Ban className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedCard(card);
                              setShowCardModal(true);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* Card Details Modal */}
      {showCardModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Card Details</h2>
                <button onClick={() => setShowCardModal(false)}>
                  <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                </button>
              </div>

              {/* Card Visual */}
              <div
                className="h-48 rounded-xl p-6 text-white shadow-lg"
                style={{ backgroundColor: selectedCard.cardColor }}
              >
                <div className="h-full flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs uppercase tracking-wider opacity-70">Virtual Card</p>
                      <p className="text-sm font-medium mt-1">{selectedCard.cardLabel || selectedCard.cardName}</p>
                    </div>
                    <CreditCard className="w-8 h-8 opacity-70" />
                  </div>
                  <div>
                    <p className="font-mono text-xl tracking-widest mb-4">
                      **** **** **** {selectedCard.cardLastFour}
                    </p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] uppercase opacity-60">Valid Thru</p>
                        <p className="text-sm">
                          {String(selectedCard.expiryMonth).padStart(2, '0')}/{String(selectedCard.expiryYear).slice(-2)}
                        </p>
                      </div>
                      <span className={clsx('px-2 py-1 text-xs rounded-full', getStatusBadge(selectedCard.cardStatus))}>
                        {selectedCard.cardStatus}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Info */}
              {selectedCard.user && (
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Card Owner
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {selectedCard.user.firstName} {selectedCard.user.lastName}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Email</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedCard.user.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-medium text-gray-900 dark:text-white">{selectedCard.user.phone || '-'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Limits & Spending */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Limits & Spending
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Daily Limit</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedCard.dailyLimit)}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(selectedCard.dailySpent)} spent</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Weekly Limit</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedCard.weeklyLimit)}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(selectedCard.weeklySpent)} spent</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Monthly Limit</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedCard.monthlyLimit)}</p>
                    <p className="text-xs text-gray-400">{formatCurrency(selectedCard.monthlySpent)} spent</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Per Transaction</p>
                    <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedCard.perTransactionLimit)}</p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Card Controls</h3>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className={clsx('px-3 py-2 rounded-lg', selectedCard.onlinePaymentsEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600')}>
                    Online Payments: {selectedCard.onlinePaymentsEnabled ? 'ON' : 'OFF'}
                  </div>
                  <div className={clsx('px-3 py-2 rounded-lg', selectedCard.contactlessEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600')}>
                    Contactless: {selectedCard.contactlessEnabled ? 'ON' : 'OFF'}
                  </div>
                  <div className={clsx('px-3 py-2 rounded-lg', selectedCard.internationalEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600')}>
                    International: {selectedCard.internationalEnabled ? 'ON' : 'OFF'}
                  </div>
                  <div className={clsx('px-3 py-2 rounded-lg', selectedCard.atmWithdrawalsEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600')}>
                    ATM: {selectedCard.atmWithdrawalsEnabled ? 'ON' : 'OFF'}
                  </div>
                </div>
              </div>

              {/* Block Card Section */}
              {['active', 'frozen'].includes(selectedCard.cardStatus) && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                    <Ban className="w-4 h-4" />
                    Block Card
                  </h3>
                  <div className="space-y-3">
                    <textarea
                      placeholder="Enter reason for blocking..."
                      value={blockReason}
                      onChange={(e) => setBlockReason(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                      rows={2}
                    />
                    <Button
                      variant="outline"
                      className="w-full text-red-600 border-red-300 hover:bg-red-50"
                      onClick={() => handleBlock(selectedCard.id, blockReason)}
                      disabled={!blockReason || actionLoading === selectedCard.id}
                    >
                      {actionLoading === selectedCard.id ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Ban className="w-4 h-4 mr-2" />
                      )}
                      Block This Card
                    </Button>
                  </div>
                </div>
              )}

              <Button variant="outline" className="w-full" onClick={() => setShowCardModal(false)}>
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AdminLayout>
  );
}

export default AdminVirtualCardsPage;
