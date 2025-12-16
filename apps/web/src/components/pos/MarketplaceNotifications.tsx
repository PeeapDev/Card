/**
 * Marketplace Notifications Component
 *
 * Real-time notification popup for POS merchants
 * Shows new orders from the marketplace with sound alerts
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import marketplaceService, { MarketplaceNotification, MarketplaceOrder } from '@/services/marketplace.service';
import {
  Bell,
  BellRing,
  X,
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  Volume2,
  VolumeX,
  Package,
  User,
  Phone,
  MapPin,
} from 'lucide-react';

// Format currency
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Format time ago
const formatTimeAgo = (date: string) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return then.toLocaleDateString();
};

interface Props {
  className?: string;
  showInline?: boolean; // Show inline in the page vs as a floating button
}

export function MarketplaceNotifications({ className = '', showInline = false }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  const [notifications, setNotifications] = useState<MarketplaceNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hasNewOrder, setHasNewOrder] = useState(false);

  // Audio ref for notification sound
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load notifications
  useEffect(() => {
    if (!merchantId) return;

    const loadNotifications = async () => {
      try {
        const data = await marketplaceService.getNotifications(merchantId);
        setNotifications(data);
        setUnreadCount(data.filter(n => !n.is_read).length);
      } catch (error) {
        console.error('Error loading notifications:', error);
      }
    };

    loadNotifications();
  }, [merchantId]);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!merchantId) return;

    const subscription = marketplaceService.subscribeToNotifications(merchantId, (notification) => {
      console.log('[Marketplace] New notification:', notification);

      // Add to list
      setNotifications(prev => [notification, ...prev]);
      setUnreadCount(prev => prev + 1);

      // Trigger new order alert
      if (notification.type === 'new_order') {
        setHasNewOrder(true);

        // Play sound if enabled
        if (soundEnabled && notification.sound_alert) {
          playNotificationSound();
        }

        // Auto-dismiss after 30 seconds
        setTimeout(() => setHasNewOrder(false), 30000);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [merchantId, soundEnabled]);

  // Initialize audio
  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('/sounds/notification.mp3');
    audioRef.current.volume = 0.7;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.warn('Could not play notification sound:', err);
      });
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await marketplaceService.markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!merchantId) return;
    try {
      await marketplaceService.markAllNotificationsRead(merchantId);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: MarketplaceNotification) => {
    markAsRead(notification.id);

    if (notification.order_id) {
      // Navigate to order management
      navigate(`/merchant/pos/marketplace?tab=orders&order=${notification.order_id}`);
    }

    setIsOpen(false);
  };

  const dismissNewOrderAlert = () => {
    setHasNewOrder(false);
  };

  // Get notification icon
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_order':
        return <ShoppingBag className="w-5 h-5 text-green-600" />;
      case 'order_cancelled':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'low_stock':
        return <Package className="w-5 h-5 text-orange-600" />;
      case 'review':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Bell className="w-5 h-5 text-gray-600" />;
    }
  };

  return (
    <>
      {/* New Order Alert Banner - Shows at top when new order comes in */}
      {hasNewOrder && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-3 shadow-lg animate-pulse">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <BellRing className="w-6 h-6 animate-bounce" />
              <div>
                <p className="font-bold">New Online Order!</p>
                <p className="text-sm text-green-100">You have a new order from the marketplace</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  dismissNewOrderAlert();
                  navigate('/merchant/pos/marketplace?tab=orders');
                }}
                className="px-4 py-2 bg-white text-green-600 font-medium rounded-lg hover:bg-green-50 transition-colors"
              >
                View Orders
              </button>
              <button
                onClick={dismissNewOrderAlert}
                className="p-2 hover:bg-green-400 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Bell */}
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-2.5 rounded-full transition-colors ${
            isOpen
              ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600'
              : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
          } ${hasNewOrder ? 'animate-bounce' : ''}`}
        >
          {hasNewOrder ? (
            <BellRing className="w-6 h-6 text-green-600" />
          ) : (
            <Bell className="w-6 h-6" />
          )}

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown content */}
            <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 max-h-[70vh] overflow-hidden">
              {/* Header */}
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 text-xs font-medium rounded-full">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                    title={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
                  >
                    {soundEnabled ? (
                      <Volume2 className="w-4 h-4 text-gray-500" />
                    ) : (
                      <VolumeX className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
              </div>

              {/* Notifications list */}
              <div className="overflow-y-auto max-h-96">
                {notifications.length === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <Bell className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                    <p className="text-gray-500 dark:text-gray-400">No notifications yet</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      You'll see orders from the marketplace here
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {notifications.slice(0, 20).map(notification => (
                      <button
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                          !notification.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                        }`}
                      >
                        <div className="flex gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                            notification.type === 'new_order'
                              ? 'bg-green-100 dark:bg-green-900/30'
                              : notification.type === 'order_cancelled'
                              ? 'bg-red-100 dark:bg-red-900/30'
                              : 'bg-gray-100 dark:bg-gray-800'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <p className={`font-medium text-sm ${
                                !notification.is_read
                                  ? 'text-gray-900 dark:text-white'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {notification.title}
                              </p>
                              {!notification.is_read && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                              )}
                            </div>
                            {notification.message && (
                              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                {notification.message}
                              </p>
                            )}
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {formatTimeAgo(notification.created_at)}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {notifications.length > 0 && (
                <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      navigate('/merchant/pos/marketplace?tab=orders');
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    View all orders
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default MarketplaceNotifications;
