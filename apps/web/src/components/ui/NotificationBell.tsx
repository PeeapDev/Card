import { useState, useRef, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, CreditCard, Banknote, Shield, Megaphone, Settings, Car, Store, ExternalLink } from 'lucide-react';
import { clsx } from 'clsx';
import { useNotification, InAppNotification } from '@/context/NotificationContext';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate, Link } from 'react-router-dom';

const notificationIcons: Record<InAppNotification['type'], typeof Bell> = {
  transaction: Banknote,
  payment: CreditCard,
  system: Settings,
  promo: Megaphone,
  security: Shield,
  driver_payment: Car,
  merchant_sale: Store,
};

const notificationColors: Record<InAppNotification['type'], string> = {
  transaction: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  payment: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  system: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
  promo: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  security: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  driver_payment: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  merchant_sale: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400',
};

// Deep links for each notification type
const notificationDeepLinks: Record<InAppNotification['type'], string> = {
  transaction: '/dashboard/transactions',
  payment: '/dashboard/transactions',
  system: '/dashboard/notifications',
  promo: '/dashboard',
  security: '/dashboard/settings',
  driver_payment: '/merchant/driver-wallet',
  merchant_sale: '/merchant/transactions',
};

function NotificationItem({
  notification,
  onMarkAsRead,
  onClear,
  onNavigate,
}: {
  notification: InAppNotification;
  onMarkAsRead: (id: string) => void;
  onClear: (id: string) => void;
  onNavigate: (path: string) => void;
}) {
  const Icon = notificationIcons[notification.type];
  const colorClass = notificationColors[notification.type];
  const deepLink = (notification.data?.url as string) || notificationDeepLinks[notification.type] || '/dashboard/notifications';

  const handleClick = () => {
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }
    onNavigate(deepLink);
  };

  return (
    <div
      className={clsx(
        'p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer',
        !notification.read && 'bg-blue-50/50 dark:bg-blue-900/20'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={clsx('p-2 rounded-full flex-shrink-0', colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={clsx('text-sm', notification.read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium')}>
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear(notification.id);
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </p>
            <ExternalLink className="w-3 h-3 text-gray-400" />
          </div>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
  } = useNotification();

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAllNotifications}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto bg-white dark:bg-gray-800">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={markAsRead}
                  onClear={clearNotification}
                  onNavigate={handleNavigate}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center">
            <Link
              to="/dashboard/notifications"
              onClick={() => setIsOpen(false)}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
