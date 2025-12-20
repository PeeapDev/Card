/**
 * AdminNotificationBell Component
 *
 * A notification bell for admin dashboard that shows unread notifications.
 * Uses IndexedDB for offline-first approach with background sync to Supabase.
 * Supports native browser notifications.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Package,
  ShieldCheck,
  AlertTriangle,
  Settings,
  UserPlus,
  Flag,
  Headphones,
  Building2,
  Loader2,
  X,
  ExternalLink,
  RefreshCw,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ArrowLeftRight,
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';
import {
  adminNotificationService,
  AdminNotification,
  AdminNotificationType,
} from '@/services/adminNotification.service';

// Icon mapping for notification types
const notificationIcons: Record<AdminNotificationType, typeof Bell> = {
  card_order: Package,
  kyc_request: ShieldCheck,
  dispute: AlertTriangle,
  system: Settings,
  user_registration: UserPlus,
  transaction_flagged: Flag,
  support_ticket: Headphones,
  business_verification: Building2,
  deposit: ArrowDownLeft,
  payout: ArrowUpRight,
  withdrawal: Banknote,
  transfer: ArrowLeftRight,
  cashout: ArrowUpRight,
};

// Color mapping for notification types
const notificationColors: Record<AdminNotificationType, string> = {
  card_order: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  kyc_request: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  dispute: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  system: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  user_registration: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  transaction_flagged: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  support_ticket: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  business_verification: 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400',
  deposit: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  payout: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  withdrawal: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  transfer: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
  cashout: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
};

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
};

const priorityBadgeColors: Record<string, string> = {
  urgent: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  high: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  medium: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  low: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
};

// Request native notification permission
const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) return false;

  if (Notification.permission === 'granted') return true;

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

// Show native browser notification
const showNativeNotification = (notification: AdminNotification) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Create unique notification tag to allow multiple notifications
  const tag = `admin-notif-${notification.id}`;

  const nativeNotif = new Notification(notification.title, {
    body: notification.message,
    icon: '/peeap-logo.png',
    tag,
    requireInteraction: notification.priority === 'urgent' || notification.priority === 'high',
    silent: false,
  });

  nativeNotif.onclick = () => {
    window.focus();
    if (notification.actionUrl) {
      window.location.href = notification.actionUrl;
    }
    nativeNotif.close();
  };

  // Auto-close after 10 seconds for non-urgent notifications
  if (notification.priority !== 'urgent') {
    setTimeout(() => nativeNotif.close(), 10000);
  }
};

function AdminNotificationItem({
  notification,
  onMarkAsRead,
  onClick,
}: {
  notification: AdminNotification;
  onMarkAsRead: (id: string) => void;
  onClick: (notification: AdminNotification) => void;
}) {
  const Icon = notificationIcons[notification.type] || Bell;
  const colorClass = notificationColors[notification.type] || notificationColors.system;
  const priorityClass = priorityColors[notification.priority] || priorityColors.medium;
  const badgeClass = priorityBadgeColors[notification.priority] || priorityBadgeColors.medium;

  const handleClick = () => {
    if (notification.status === 'unread') {
      onMarkAsRead(notification.id);
    }
    onClick(notification);
  };

  return (
    <div
      className={clsx(
        'p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border-l-4',
        notification.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800',
        priorityClass
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={clsx('p-2 rounded-full flex-shrink-0', colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={clsx(
              'text-sm',
              notification.status === 'unread'
                ? 'text-gray-900 dark:text-white font-medium'
                : 'text-gray-700 dark:text-gray-300'
            )}>
              {notification.title}
            </p>
            {notification.actionUrl && (
              <ExternalLink className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
            <span className={clsx('px-1.5 py-0.5 text-[10px] font-medium rounded capitalize', badgeClass)}>
              {notification.priority}
            </span>
            {notification.type === 'business_verification' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400 rounded">
                Business
              </span>
            )}
            {notification.type === 'deposit' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                Deposit
              </span>
            )}
            {(notification.type === 'payout' || notification.type === 'withdrawal' || notification.type === 'cashout') && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded">
                Payout
              </span>
            )}
            {notification.type === 'transfer' && (
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded">
                Transfer
              </span>
            )}
          </div>
        </div>
        {notification.status === 'unread' && (
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2 animate-pulse" />
        )}
      </div>
    </div>
  );
}

export function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [pendingBusinessCount, setPendingBusinessCount] = useState(0);
  const [recentDepositsCount, setRecentDepositsCount] = useState(0);
  const [recentPayoutsCount, setRecentPayoutsCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setHasPermission(Notification.permission === 'granted');
    }
  }, []);

  // Fetch notifications (offline-first)
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const notifs = await adminNotificationService.getNotifications({ limit: 20 });
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => n.status === 'unread').length);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch special counts (pending businesses, deposits, payouts)
  const fetchSpecialCounts = useCallback(async () => {
    try {
      // Get pending business count
      const businessCount = await adminNotificationService.getPendingBusinessCount();
      setPendingBusinessCount(businessCount);

      // Get recent deposits (last 24h)
      const deposits = await adminNotificationService.getRecentDeposits(50);
      setRecentDepositsCount(deposits.length);

      // Get recent payouts (last 24h)
      const payouts = await adminNotificationService.getRecentPayouts(50);
      setRecentPayoutsCount(payouts.length);
    } catch (error) {
      console.error('Error fetching special counts:', error);
    }
  }, []);

  // Fetch unread count periodically
  const fetchUnreadCount = useCallback(async () => {
    try {
      const count = await adminNotificationService.getUnreadCount();
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, []);

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await adminNotificationService.syncFromServer();
      await fetchNotifications();
    } finally {
      setRefreshing(false);
    }
  };

  // Initial fetch and polling
  useEffect(() => {
    fetchNotifications();
    fetchSpecialCounts();

    // Poll for updates every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
      fetchSpecialCounts();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadCount, fetchSpecialCounts]);

  // Subscribe to real-time notifications
  useEffect(() => {
    const unsubscribeNotifications = adminNotificationService.subscribeToNotifications((notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);

      // Show native notification if permission granted
      if (hasPermission) {
        showNativeNotification(notification);
      }
    });

    // Subscribe to transaction notifications (deposits/payouts)
    const unsubscribeTransactions = adminNotificationService.subscribeToTransactions((notification) => {
      setNotifications(prev => [notification, ...prev].slice(0, 20));
      setUnreadCount(prev => prev + 1);

      // Update counts
      if (notification.type === 'deposit') {
        setRecentDepositsCount(prev => prev + 1);
      } else if (notification.type === 'payout' || notification.type === 'withdrawal' || notification.type === 'cashout') {
        setRecentPayoutsCount(prev => prev + 1);
      }

      // Show native notification if permission granted
      if (hasPermission) {
        showNativeNotification(notification);
      }
    });

    // Subscribe to new business registrations
    const unsubscribeBusinesses = adminNotificationService.subscribeToBusinesses((business) => {
      setPendingBusinessCount(prev => prev + 1);

      // Show native notification for new business
      if (hasPermission && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('New Business Registration', {
          body: `${business.name} by ${business.ownerName} needs verification`,
          icon: '/peeap-logo.png',
          tag: `business-${business.id}`,
        });
      }
    });

    return () => {
      unsubscribeNotifications();
      unsubscribeTransactions();
      unsubscribeBusinesses();
    };
  }, [hasPermission]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Request permission for native notifications
  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setHasPermission(granted);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    try {
      await adminNotificationService.markAsRead(notificationId, user.id);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, status: 'read' as const } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await adminNotificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, status: 'read' as const })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    setIsOpen(false);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    } else {
      navigate(`/admin/notifications?id=${notification.id}`);
    }
  };

  // Bell badge only shows notification count (pending businesses have their own bubble)

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Special Bubbles Row */}
      <div className="flex items-center gap-2">
        {/* Pending Business Verification Bubble - GREEN (most important) */}
        {pendingBusinessCount > 0 && (
          <button
            onClick={() => navigate('/admin/businesses')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/60 transition-colors animate-pulse"
            title="Unverified Business Verifications"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{pendingBusinessCount} unverified</span>
          </button>
        )}

        {/* Recent Deposits Bubble - BLUE */}
        {recentDepositsCount > 0 && (
          <button
            onClick={() => navigate('/admin/transactions?type=deposit')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/60 transition-colors"
            title="Recent Deposits"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>{recentDepositsCount}</span>
          </button>
        )}

        {/* Recent Payouts Bubble - ORANGE */}
        {recentPayoutsCount > 0 && (
          <button
            onClick={() => navigate('/admin/transactions?type=payout')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 rounded-full text-xs font-medium hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors"
            title="Recent Payouts"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>{recentPayoutsCount}</span>
          </button>
        )}

        {/* Main Notification Bell */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Admin Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium text-white bg-red-500 rounded-full animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                title="Refresh"
              >
                <RefreshCw className={clsx('w-4 h-4 text-gray-500', refreshing && 'animate-spin')} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Native notification permission banner */}
          {!hasPermission && 'Notification' in window && (
            <div className="px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
              <button
                onClick={handleRequestPermission}
                className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
              >
                <Bell className="w-3.5 h-3.5" />
                Enable desktop notifications
              </button>
            </div>
          )}

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  You'll be notified when actions are needed
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <AdminNotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onClick={handleNotificationClick}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 text-center">
              <button
                onClick={() => {
                  navigate('/admin/notifications');
                  setIsOpen(false);
                }}
                className="text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
