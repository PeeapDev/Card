import { useState, useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { clsx } from 'clsx';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface AdminNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  status: string;
  action_url?: string;
  created_at: string;
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

const notificationColors: Record<string, string> = {
  card_order: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  kyc_request: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  dispute: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  system: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  user_registration: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  transaction_flagged: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  support_ticket: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
};

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-500',
  medium: 'border-l-yellow-500',
  low: 'border-l-blue-500',
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

  return (
    <div
      className={clsx(
        'p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer border-l-4',
        notification.status === 'unread' ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-800',
        priorityClass
      )}
      onClick={() => onClick(notification)}
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
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
            {notification.message}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
            <span className={clsx(
              'px-1.5 py-0.5 text-xs rounded capitalize',
              notification.priority === 'urgent' && 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
              notification.priority === 'high' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
              notification.priority === 'medium' && 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
              notification.priority === 'low' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
            )}>
              {notification.priority}
            </span>
          </div>
        </div>
        {notification.status === 'unread' && (
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}

export function AdminNotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();

    // Subscribe to real-time notifications
    const channel = supabase
      .channel('admin_bell_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_notifications',
        },
        (payload) => {
          const newNotification = payload.new as AdminNotification;
          setNotifications((prev) => [newNotification, ...prev].slice(0, 20));
          setUnreadCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Check auth state first
      const { data: sessionData } = await supabase.auth.getSession();


      // Direct Supabase query
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching notifications:', error);
        setNotifications([]);
        setUnreadCount(0);
      } else {
        setNotifications(data || []);
        setUnreadCount((data || []).filter((n) => n.status === 'unread').length);
      }
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({
          status: 'read',
          read_by: user.id,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, status: 'read' } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
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
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    if (notification.status === 'unread') {
      handleMarkAsRead(notification.id);
    }
    // Navigate to notifications page with the notification ID
    navigate(`/admin/notifications?id=${notification.id}`);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
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

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900 dark:text-white">Admin Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="py-12 text-center">
                <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  You'll be notified when users place card orders
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
