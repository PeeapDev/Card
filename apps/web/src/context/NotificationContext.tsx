import { createContext, useContext, useState, useCallback, useEffect, ReactNode, useRef } from 'react';
import {
  pushNotificationService,
  NotificationPayload,
  NotificationPreferences,
  notifyPaymentReceived,
  notifyDriverPayment,
  notifyMerchantSale,
  notifyPayoutCompleted,
  notifyPaymentFailed,
} from '@/services/push-notification.service';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  read?: boolean;
  createdAt: Date;
  deepLink?: string; // Path to navigate to when clicked
  action?: {
    label: string;
    onClick?: () => void;
  };
}

export interface InAppNotification {
  id: string;
  type: 'transaction' | 'payment' | 'system' | 'promo' | 'security' | 'driver_payment' | 'merchant_sale';
  title: string;
  message: string;
  read: boolean;
  createdAt: Date;
  data?: Record<string, unknown>;
}

interface NotificationContextType {
  // Toast notifications
  toasts: Notification[];
  showToast: (notification: Omit<Notification, 'id' | 'createdAt'>) => void;
  dismissToast: (id: string) => void;

  // In-app notifications (bell icon)
  notifications: InAppNotification[];
  unreadCount: number;
  addNotification: (notification: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Push notification permissions
  pushPermission: NotificationPermission | 'unsupported';
  isPushEnabled: boolean;
  requestPushPermission: () => Promise<boolean>;
  sendTestPush: () => Promise<void>;
  pushPreferences: NotificationPreferences;
  updatePushPreferences: (prefs: Partial<NotificationPreferences>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const DEFAULT_PREFERENCES: NotificationPreferences = {
  payment_received: true,
  payment_sent: true,
  payment_failed: true,
  payout_completed: true,
  payout_failed: true,
  low_balance: true,
  login_alert: true,
  card_transaction: true,
  refund_processed: true,
  kyc_approved: true,
  kyc_rejected: true,
  driver_payment: true,
  merchant_sale: true,
  promotional: false,
};

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [toasts, setToasts] = useState<Notification[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [pushPreferences, setPushPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);
  const subscriptionsRef = useRef<{ unsubscribe: () => void }[]>([]);
  const processedTransactionsRef = useRef<Set<string>>(new Set());

  // Generate unique ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // Toast notifications
  const showToast = useCallback((notification: Omit<Notification, 'id' | 'createdAt'>) => {
    const id = generateId();
    const newToast: Notification = {
      ...notification,
      id,
      createdAt: new Date(),
      duration: notification.duration ?? 5000,
    };

    console.log('[NotificationContext] showToast called:', newToast);
    setToasts((prev) => {
      console.log('[NotificationContext] Previous toasts:', prev.length, 'Adding new toast');
      return [...prev, newToast];
    });

    // Auto dismiss after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        dismissToast(id);
      }, newToast.duration);
    }
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // In-app notifications
  const addNotification = useCallback((notification: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: InAppNotification = {
      ...notification,
      id: generateId(),
      createdAt: new Date(),
      read: false,
    };

    setNotifications((prev) => [newNotification, ...prev]);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Initialize push notifications
  const initializePush = useCallback(async () => {
    const permission = pushNotificationService.getPermissionStatus();
    setPushPermission(permission);
    setIsPushEnabled(permission === 'granted');

    // Load preferences
    const prefs = await pushNotificationService.getPreferences();
    setPushPreferences(prefs);
  }, []);

  // Request push permission
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    const granted = await pushNotificationService.initialize();
    setPushPermission(pushNotificationService.getPermissionStatus());
    setIsPushEnabled(granted);
    return granted;
  }, []);

  // Send test push notification
  const sendTestPush = useCallback(async () => {
    try {
      console.log('[NotificationContext] Calling sendTestNotification...');

      // Show in-app toast notification with deep link
      showToast({
        type: 'success',
        title: 'Payment Received!',
        message: 'You received Le 50,000 from John Doe',
        duration: 8000,
        deepLink: '/dashboard/transactions',
        action: {
          label: 'View Transaction',
        },
      });

      // Also add to bell notifications
      addNotification({
        type: 'transaction',
        title: 'Payment Received',
        message: 'You received Le 50,000 from John Doe',
        data: { url: '/dashboard/transactions' },
      });

      // Try browser notification too (might not show depending on OS settings)
      await pushNotificationService.sendTestNotification();
      console.log('[NotificationContext] sendTestNotification completed');
    } catch (error) {
      console.error('[NotificationContext] sendTestNotification failed:', error);
    }
  }, [addNotification, showToast]);

  // Update push preferences
  const updatePushPreferences = useCallback(async (prefs: Partial<NotificationPreferences>) => {
    await pushNotificationService.savePreferences(prefs);
    setPushPreferences((prev) => ({ ...prev, ...prefs }));
  }, []);

  // Set up real-time subscriptions for payment events
  useEffect(() => {
    if (!user?.id) return;

    initializePush();

    // Subscribe to transactions where user is recipient (payments received)
    const transactionSubscription = supabase
      .channel('user-transactions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const tx = payload.new as any;

          // Skip if already processed
          if (processedTransactionsRef.current.has(tx.id)) return;
          processedTransactionsRef.current.add(tx.id);

          // Determine notification type based on transaction
          const isDriverPayment = tx.metadata?.collectionType === 'driver';
          const isMerchantSale = tx.metadata?.type === 'merchant_sale' || tx.type === 'merchant_payment';

          if (isDriverPayment) {
            notifyDriverPayment(tx.amount, tx.currency || 'SLE');
            addNotification({
              type: 'driver_payment',
              title: 'Fare Collected!',
              message: `You received ${tx.currency || 'SLE'} ${tx.amount?.toLocaleString()} for your trip`,
              data: { ...tx, url: '/merchant/driver-wallet' },
            });
            // Show toast with deep link
            showToast({
              type: 'success',
              title: 'Fare Collected!',
              message: `You received ${tx.currency || 'SLE'} ${tx.amount?.toLocaleString()}`,
              duration: 8000,
              deepLink: '/merchant/driver-wallet',
              action: { label: 'View Driver Wallet' },
            });
          } else if (isMerchantSale) {
            notifyMerchantSale(tx.amount, tx.currency || 'SLE', tx.payment_method || 'QR');
            addNotification({
              type: 'merchant_sale',
              title: 'New Sale!',
              message: `${tx.currency || 'SLE'} ${tx.amount?.toLocaleString()} received via ${tx.payment_method || 'payment'}`,
              data: { ...tx, url: '/merchant/transactions' },
            });
            // Show toast with deep link
            showToast({
              type: 'success',
              title: 'New Sale!',
              message: `${tx.currency || 'SLE'} ${tx.amount?.toLocaleString()} received`,
              duration: 8000,
              deepLink: '/merchant/transactions',
              action: { label: 'View Transaction' },
            });
          } else {
            notifyPaymentReceived(tx.amount, tx.currency || 'SLE', tx.sender_name || 'Someone');
            addNotification({
              type: 'payment',
              title: 'Payment Received',
              message: `You received ${tx.currency || 'SLE'} ${tx.amount?.toLocaleString()}`,
              data: { ...tx, url: '/dashboard/transactions' },
            });
            // Show toast with deep link
            showToast({
              type: 'success',
              title: 'Payment Received!',
              message: `You received ${tx.currency || 'SLE'} ${tx.amount?.toLocaleString()}`,
              duration: 8000,
              deepLink: '/dashboard/transactions',
              action: { label: 'View Transaction' },
            });
          }
        }
      )
      .subscribe();

    subscriptionsRef.current.push(transactionSubscription);

    // Subscribe to checkout sessions (for merchants)
    const checkoutSubscription = supabase
      .channel('checkout-sessions')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'checkout_sessions',
          filter: `merchant_id=eq.${user.id}`,
        },
        (payload) => {
          const session = payload.new as any;

          // Only notify on completed payments
          if (session.status === 'completed' && payload.old?.status !== 'completed') {
            const amount = session.amount;
            const currency = session.currency || 'SLE';

            notifyMerchantSale(amount, currency, session.payment_method || 'QR');
            addNotification({
              type: 'merchant_sale',
              title: 'Payment Received!',
              message: `${currency} ${amount?.toLocaleString()} checkout completed`,
              data: session,
            });

            showToast({
              type: 'success',
              title: 'Payment Received!',
              message: `${currency} ${amount?.toLocaleString()}`,
            });
          }
        }
      )
      .subscribe();

    subscriptionsRef.current.push(checkoutSubscription);

    // Subscribe to payouts (for merchants)
    const payoutSubscription = supabase
      .channel('user-payouts')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payouts',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const payout = payload.new as any;
          const amount = payout.amount;
          const currency = payout.currency || 'SLE';

          if (payout.status === 'completed' && payload.old?.status !== 'completed') {
            notifyPayoutCompleted(amount, currency, payout.destination || 'bank');
            addNotification({
              type: 'payment',
              title: 'Payout Completed',
              message: `${currency} ${amount?.toLocaleString()} sent to ${payout.destination || 'your account'}`,
              data: payout,
            });
            showToast({
              type: 'success',
              title: 'Payout Completed',
              message: `${currency} ${amount?.toLocaleString()} sent`,
            });
          } else if (payout.status === 'failed' && payload.old?.status !== 'failed') {
            notifyPaymentFailed(amount, payout.failure_reason || 'Unknown error');
            addNotification({
              type: 'payment',
              title: 'Payout Failed',
              message: `${currency} ${amount?.toLocaleString()} payout failed: ${payout.failure_reason || 'Unknown error'}`,
              data: payout,
            });
            showToast({
              type: 'error',
              title: 'Payout Failed',
              message: payout.failure_reason || 'Please try again',
            });
          }
        }
      )
      .subscribe();

    subscriptionsRef.current.push(payoutSubscription);

    // Cleanup
    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
    };
  }, [user?.id, initializePush, addNotification, showToast]);

  return (
    <NotificationContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAllNotifications,
        pushPermission,
        isPushEnabled,
        requestPushPermission,
        sendTestPush,
        pushPreferences,
        updatePushPreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

// Convenience hooks for common toast types
export function useToast() {
  const { showToast, dismissToast } = useNotification();

  return {
    success: (title: string, message?: string) =>
      showToast({ type: 'success', title, message }),
    error: (title: string, message?: string) =>
      showToast({ type: 'error', title, message }),
    warning: (title: string, message?: string) =>
      showToast({ type: 'warning', title, message }),
    info: (title: string, message?: string) =>
      showToast({ type: 'info', title, message }),
    custom: showToast,
    dismiss: dismissToast,
  };
}
