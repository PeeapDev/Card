import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  Package,
  ShieldCheck,
  AlertTriangle,
  Settings,
  UserPlus,
  Flag,
  Headphones,
  RefreshCw,
  Eye,
  Archive,
  Search,
  X,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow, format } from 'date-fns';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { MotionCard } from '@/components/ui/Card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  related_entity_type?: string;
  related_entity_id?: string;
  metadata?: Record<string, any>;
  action_url?: string;
  read_by?: string;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

const notificationIcons: Record<string, typeof Bell> = {
  card_order: Package,
  kyc_request: ShieldCheck,
  dispute: AlertTriangle,
  system: Settings,
  user_registration: UserPlus,
  transaction_flagged: Flag,
  support_ticket: Headphones,
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400',
  low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
};

const statusColors: Record<string, string> = {
  unread: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  read: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-400',
  archived: 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-500',
};

export function AdminNotificationsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const highlightedId = searchParams.get('id');
  const highlightedRef = useRef<HTMLTableRowElement>(null);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    type: '',
    status: '',
    priority: '',
    search: '',
  });
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    cardOrders: 0,
    highPriority: 0,
  });
  const [selectedNotification, setSelectedNotification] = useState<AdminNotification | null>(null);

  // Scroll to highlighted notification
  useEffect(() => {
    if (highlightedId && highlightedRef.current && !loading) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightedId, loading]);

  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin_notifications_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'admin_notifications',
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [filters.type, filters.status, filters.priority]);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.type) {
        query = query.eq('type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.priority) {
        query = query.eq('priority', filters.priority);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
      } else {
        let filtered = data || [];

        // Apply search filter client-side
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filtered = filtered.filter(
            (n) =>
              n.title.toLowerCase().includes(searchLower) ||
              n.message.toLowerCase().includes(searchLower)
          );
        }

        setNotifications(filtered);

        // Calculate stats
        const allData = data || [];
        setStats({
          total: allData.length,
          unread: allData.filter((n) => n.status === 'unread').length,
          cardOrders: allData.filter((n) => n.type === 'card_order').length,
          highPriority: allData.filter((n) => n.priority === 'high' || n.priority === 'urgent').length,
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('admin_notifications')
      .update({
        status: 'read',
        read_by: user.id,
        read_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, status: 'read' } : n))
      );
      setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    }
  };

  // Open notification from URL param (after handleMarkAsRead is defined)
  useEffect(() => {
    if (highlightedId && notifications.length > 0 && !loading) {
      const notification = notifications.find(n => n.id === highlightedId);
      if (notification) {
        setSelectedNotification(notification);
      }
    }
  }, [highlightedId, notifications, loading]);

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;

    const { error } = await supabase
      .from('admin_notifications')
      .update({
        status: 'read',
        read_by: user.id,
        read_at: new Date().toISOString(),
      })
      .eq('status', 'unread');

    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, status: 'read' })));
      setStats((prev) => ({ ...prev, unread: 0 }));
    }
  };

  const handleArchive = async (id: string) => {
    const { error } = await supabase
      .from('admin_notifications')
      .update({ status: 'archived' })
      .eq('id', id);

    if (!error) {
      fetchNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setStats((prev) => ({ ...prev, total: prev.total - 1 }));
    }
  };

  const handleBulkMarkAsRead = async () => {
    if (!user?.id || selectedIds.length === 0) return;

    const { error } = await supabase
      .from('admin_notifications')
      .update({
        status: 'read',
        read_by: user.id,
        read_at: new Date().toISOString(),
      })
      .in('id', selectedIds);

    if (!error) {
      fetchNotifications();
      setSelectedIds([]);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    const { error } = await supabase
      .from('admin_notifications')
      .delete()
      .in('id', selectedIds);

    if (!error) {
      fetchNotifications();
      setSelectedIds([]);
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    if (notification.status === 'unread') {
      handleMarkAsRead(notification.id);
    }
    setSelectedNotification(notification);
  };

  const handleCloseDetail = () => {
    setSelectedNotification(null);
    // Clear the URL param
    if (highlightedId) {
      setSearchParams({});
    }
  };

  const handleGoToAction = (notification: AdminNotification) => {
    if (notification.action_url) {
      navigate(notification.action_url);
    }
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
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Notifications</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Manage admin notifications and alerts
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
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.cardOrders}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Card Orders</p>
              </div>
            </div>
          </MotionCard>
          <MotionCard className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.highPriority}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">High Priority</p>
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
                <option value="card_order">Card Orders</option>
                <option value="kyc_request">KYC Requests</option>
                <option value="dispute">Disputes</option>
                <option value="system">System</option>
                <option value="user_registration">User Registration</option>
                <option value="transaction_flagged">Flagged Transactions</option>
                <option value="support_ticket">Support Tickets</option>
              </select>
              <select
                value={filters.status}
                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Status</option>
                <option value="unread">Unread</option>
                <option value="read">Read</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={filters.priority}
                onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
              >
                <option value="">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
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

        {/* Notifications Table */}
        <MotionCard className="overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No notifications found</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Notifications will appear here when users place card orders
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === notifications.length}
                        onChange={toggleSelectAll}
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Notification
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Priority
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {notifications.map((notification) => (
                    <tr
                      key={notification.id}
                      ref={notification.id === highlightedId ? highlightedRef : null}
                      className={clsx(
                        'hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
                        notification.status === 'unread' && 'bg-blue-50/50 dark:bg-blue-900/10',
                        notification.id === highlightedId && 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(notification.id)}
                          onChange={() => toggleSelect(notification.id)}
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex items-start gap-3 cursor-pointer"
                          onClick={() => handleNotificationClick(notification)}
                        >
                          <div className={clsx(
                            'p-2 rounded-lg',
                            notification.type === 'card_order' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                            notification.type === 'kyc_request' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                            notification.type === 'dispute' && 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                            !['card_order', 'kyc_request', 'dispute'].includes(notification.type) && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                          )}>
                            {getIcon(notification.type)}
                          </div>
                          <div className="min-w-0">
                            <p className={clsx(
                              'text-sm',
                              notification.status === 'unread'
                                ? 'font-medium text-gray-900 dark:text-white'
                                : 'text-gray-700 dark:text-gray-300'
                            )}>
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 capitalize">
                          {notification.type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'px-2 py-1 text-xs rounded-full capitalize',
                          priorityColors[notification.priority]
                        )}>
                          {notification.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={clsx(
                          'px-2 py-1 text-xs rounded-full capitalize',
                          statusColors[notification.status]
                        )}>
                          {notification.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div>
                          {format(new Date(notification.created_at), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                              onClick={() => handleNotificationClick(notification)}
                              className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="View details"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          {notification.status !== 'archived' && (
                            <button
                              onClick={() => handleArchive(notification.id)}
                              className="p-1.5 text-gray-400 hover:text-yellow-600 dark:hover:text-yellow-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              title="Archive"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(notification.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </MotionCard>
      </div>

      {/* Notification Detail Modal */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 transition-opacity"
              onClick={handleCloseDetail}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'p-2 rounded-lg',
                    selectedNotification.type === 'card_order' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
                    selectedNotification.type === 'kyc_request' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                    selectedNotification.type === 'dispute' && 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                    !['card_order', 'kyc_request', 'dispute'].includes(selectedNotification.type) && 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  )}>
                    {getIcon(selectedNotification.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedNotification.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      {selectedNotification.type.replace('_', ' ')}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCloseDetail}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                {/* Status badges */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={clsx(
                    'px-2 py-1 text-xs rounded-full capitalize',
                    priorityColors[selectedNotification.priority]
                  )}>
                    {selectedNotification.priority} priority
                  </span>
                  <span className={clsx(
                    'px-2 py-1 text-xs rounded-full capitalize',
                    statusColors[selectedNotification.status]
                  )}>
                    {selectedNotification.status}
                  </span>
                </div>

                {/* Message */}
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</h4>
                  <p className="text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    {selectedNotification.message}
                  </p>
                </div>

                {/* Metadata */}
                {selectedNotification.metadata && Object.keys(selectedNotification.metadata).length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Details</h4>
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-2">
                      {Object.entries(selectedNotification.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between text-sm">
                          <span className="text-gray-500 dark:text-gray-400 capitalize">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-gray-900 dark:text-white font-medium">
                            {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Timestamps */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Created: {format(new Date(selectedNotification.created_at), 'MMM d, yyyy h:mm a')}</span>
                  </div>
                  {selectedNotification.read_at && (
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
                      <Eye className="w-4 h-4" />
                      <span>Read: {format(new Date(selectedNotification.read_at), 'MMM d, yyyy h:mm a')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <div className="flex items-center gap-2">
                  {selectedNotification.status === 'unread' && (
                    <button
                      onClick={() => {
                        handleMarkAsRead(selectedNotification.id);
                        setSelectedNotification({ ...selectedNotification, status: 'read' });
                      }}
                      className="px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={() => {
                      handleDelete(selectedNotification.id);
                      handleCloseDetail();
                    }}
                    className="px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
                {selectedNotification.action_url && (
                  <button
                    onClick={() => handleGoToAction(selectedNotification)}
                    className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Go to {selectedNotification.related_entity_type?.replace('_', ' ') || 'Details'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
