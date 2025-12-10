import { useState, useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  DollarSign,
  CreditCard,
  AlertTriangle,
  Settings,
  RefreshCw,
  Eye,
  Search,
  X,
  Clock,
  ShoppingCart,
  ArrowDownRight,
  ArrowUpRight,
  Filter,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { MotionCard } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface UserNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

const notificationIcons: Record<string, typeof Bell> = {
  transaction_received: ArrowDownRight,
  transaction_sent: ArrowUpRight,
  payment_received: DollarSign,
  payment_failed: AlertTriangle,
  order_received: ShoppingCart,
  payout_completed: CreditCard,
  system: Settings,
  login: Bell,
};

const typeColors: Record<string, string> = {
  transaction_received: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  transaction_sent: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  payment_received: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
  payment_failed: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  order_received: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  payout_completed: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-600 dark:text-cyan-400',
  system: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  login: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
};

export function MerchantNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: '',
    read: '',
    search: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    transactions: 0,
    payments: 0,
  });
  const [selectedNotification, setSelectedNotification] = useState<UserNotification | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();

      // Subscribe to real-time updates
      const channel = supabase
        .channel('merchant_notifications_realtime')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_notifications',
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            fetchNotifications();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, filters.type, filters.read]);

  const fetchNotifications = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      let query = supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.read === 'read') {
        query = query.eq('read', true);
      } else if (filters.read === 'unread') {
        query = query.eq('read', false);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
      } else {
        let filtered = data || [];

        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(
            (n) =>
              n.title.toLowerCase().includes(searchLower) ||
              n.message.toLowerCase().includes(searchLower)
          );
        }

        setNotifications(filtered);

        const allData = data || [];
        setStats({
          total: allData.length,
          unread: allData.filter((n) => !n.read).length,
          transactions: allData.filter((n) => n.type.includes('transaction')).length,
          payments: allData.filter((n) => n.type.includes('payment')).length,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('id', id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setStats((prev) => ({ ...prev, unread: 0 }));
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setStats((prev) => ({ ...prev, total: prev.total - 1 }));
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (selectedIds.length === 0) return;

    const { error } = await supabase
      .from('user_notifications')
      .update({ read: true })
      .in('id', selectedIds);

    if (!error) {
      fetchNotifications();
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const { error } = await supabase
      .from('user_notifications')
      .delete()
      .in('id', selectedIds);

    if (!error) {
      fetchNotifications();
      setSelectedIds([]);
    }
  };

  const handleNotificationClick = (notification: UserNotification) => {
    if (!notification.read) {
      handleMarkAsRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const getIcon = (type: string) => {
    const Icon = notificationIcons[type] || Bell;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Stay updated on your business activity
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchNotifications}
              className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            {stats.unread > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
              >
                <CheckCheck className="w-4 h-4" />
                Mark All Read
              </button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MotionCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Eye className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.unread}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Unread</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.payments}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Payments</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.transactions}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Transactions</p>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Filters */}
        <MotionCard className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={filters.search}
                  onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={filters.type}
                onChange={(e) => setFilters((prev) => ({ ...prev, type: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Types</option>
                <option value="transaction_received">Received</option>
                <option value="transaction_sent">Sent</option>
                <option value="payment_received">Payment</option>
                <option value="payment_failed">Failed</option>
                <option value="payout_completed">Payout</option>
                <option value="system">System</option>
              </select>
              <select
                value={filters.read}
                onChange={(e) => setFilters((prev) => ({ ...prev, read: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
              </select>
            </div>
          </div>
        </MotionCard>

        {/* Bulk Actions */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-4 p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <span className="text-sm text-primary-700 dark:text-primary-300">
              {selectedIds.length} selected
            </span>
            <button
              onClick={handleBulkMarkAsRead}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Mark as Read
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700"
            >
              Delete
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Notifications List */}
        <MotionCard className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                You'll be notified when there's activity on your account
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={clsx(
                    'p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer',
                    !notification.read && 'bg-blue-50/50 dark:bg-blue-900/10'
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(notification.id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleSelect(notification.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="mt-1 rounded border-gray-300 dark:border-gray-600"
                    />
                    <div className={clsx('p-2 rounded-lg', typeColors[notification.type] || typeColors.system)}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={clsx(
                            'text-sm',
                            !notification.read
                              ? 'font-medium text-gray-900 dark:text-white'
                              : 'text-gray-700 dark:text-gray-300'
                          )}>
                            {notification.title}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            {notification.message}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MotionCard>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={() => setSelectedNotification(null)}
            />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={clsx('p-2 rounded-lg', typeColors[selectedNotification.type] || typeColors.system)}>
                    {getIcon(selectedNotification.type)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {selectedNotification.title}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4">
                <p className="text-gray-700 dark:text-gray-300">{selectedNotification.message}</p>
                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm py-1">
                        <span className="text-gray-500 dark:text-gray-400 capitalize">{key.replace(/_/g, ' ')}</span>
                        <span className="text-gray-900 dark:text-white font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  {format(new Date(selectedNotification.created_at), 'MMM d, yyyy h:mm a')}
                </div>
              </div>
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    handleDelete(selectedNotification.id);
                    setSelectedNotification(null);
                  }}
                  className="px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                >
                  Delete
                </button>
                <button
                  onClick={() => setSelectedNotification(null)}
                  className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}
