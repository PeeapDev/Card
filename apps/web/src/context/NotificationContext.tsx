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
import { notificationService } from '@/services/notification.service';
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
  type: 'transaction' | 'payment' | 'system' | 'promo' | 'security' | 'driver_payment' | 'merchant_sale' | 'deposit' | 'withdrawal' | 'transfer';
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

    setToasts((prev) => {
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
  const initializePush = useCallback(async (userId?: string) => {
    const permission = pushNotificationService.getPermissionStatus();
    setPushPermission(permission);
    setIsPushEnabled(permission === 'granted');

    // Load preferences
    const prefs = await pushNotificationService.getPreferences();
    setPushPreferences(prefs);

    // Get and save FCM token if permission granted and userId provided
    if (permission === 'granted' && userId) {
      try {
        await pushNotificationService.getFcmToken(userId);
      } catch (error) {
        console.error('[NotificationContext] Failed to get FCM token:', error);
      }
    }
  }, []);

  // Request push permission and get FCM token
  const requestPushPermission = useCallback(async (): Promise<boolean> => {
    const granted = await pushNotificationService.initialize();
    setPushPermission(pushNotificationService.getPermissionStatus());
    setIsPushEnabled(granted);

    // Get and save FCM token if permission granted
    if (granted && user?.id) {
      try {
        await pushNotificationService.getFcmToken(user.id);
      } catch (error) {
        console.error('[NotificationContext] Failed to get FCM token:', error);
      }
    }

    return granted;
  }, [user?.id]);

  // Send test push notification
  const sendTestPush = useCallback(async () => {
    try {

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

    // Auto-request notification permission on login
    const setupNotifications = async () => {
      const permission = pushNotificationService.getPermissionStatus();
      console.log('[NotificationContext] Current permission status:', permission);

      // If permission not yet requested, ask user
      if (permission === 'default') {
        console.log('[NotificationContext] Will request permission in 2 seconds...');
        // Small delay to not interrupt initial page load
        setTimeout(async () => {
          console.log('[NotificationContext] Requesting notification permission...');
          const granted = await pushNotificationService.initialize();
          console.log('[NotificationContext] Permission granted:', granted);
          if (granted) {
            const token = await pushNotificationService.getFcmToken(user.id);
            console.log('[NotificationContext] FCM token:', token ? 'obtained' : 'failed');
          }
        }, 2000);
      } else if (permission === 'granted') {
        console.log('[NotificationContext] Permission already granted, getting FCM token...');
        const token = await pushNotificationService.getFcmToken(user.id);
        console.log('[NotificationContext] FCM token:', token ? 'obtained' : 'failed');
      } else {
        console.log('[NotificationContext] Notifications blocked or unsupported');
      }
    };

    setupNotifications();
    initializePush(user.id);

    // Setup subscriptions with wallet ID
    const setupSubscriptions = async () => {
      // Get user's primary wallet
      const { data: wallets } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .eq('wallet_type', 'primary');

      const userWalletIds = wallets?.map(w => w.id) || [];

      if (userWalletIds.length === 0) {
        console.warn('[NotificationContext] No wallets found for user, skipping transaction subscription');
        return;
      }

      const primaryWalletId = userWalletIds[0];

      // Subscribe to transactions for user's wallet
      // Transaction types: PAYMENT_RECEIVED, TRANSFER, PAYMENT, MOBILE_MONEY_SEND, REFUND
      const walletTransactionSubscription = supabase
        .channel('user-wallet-transactions')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'transactions',
            filter: `wallet_id=eq.${primaryWalletId}`,
          },
          (payload) => {
            const tx = payload.new as any;
            const rawAmount = tx.amount;
            const amount = Math.abs(rawAmount);
            const currency = tx.currency || 'SLE';
            const type = tx.type;
            const description = tx.description || '';
            const merchantName = tx.merchant_name || tx.metadata?.sender_name || tx.metadata?.recipient_name || '';

            // Skip if already processed
            if (processedTransactionsRef.current.has(tx.id)) return;
            processedTransactionsRef.current.add(tx.id);

            // Determine notification type based on transaction metadata
            const isDriverPayment = tx.metadata?.collectionType === 'driver';
            const isMerchantSale = tx.metadata?.type === 'merchant_sale' || type === 'merchant_payment';

            // Handle based on transaction type
            if (isDriverPayment) {
              notifyDriverPayment(amount, currency);
              addNotification({
                type: 'driver_payment',
                title: 'Fare Collected!',
                message: `You received ${currency} ${amount?.toLocaleString()} for your trip`,
                data: { ...tx, url: '/merchant/driver-wallet' },
              });
              showToast({
                type: 'success',
                title: 'Fare Collected!',
                message: `You received ${currency} ${amount?.toLocaleString()}`,
                duration: 8000,
                deepLink: '/merchant/driver-wallet',
                action: { label: 'View Driver Wallet' },
              });
            } else if (isMerchantSale) {
              notifyMerchantSale(amount, currency, tx.payment_method || 'QR');
              addNotification({
                type: 'merchant_sale',
                title: 'New Sale!',
                message: `${currency} ${amount?.toLocaleString()} received via ${tx.payment_method || 'payment'}`,
                data: { ...tx, url: '/merchant/transactions' },
              });
              showToast({
                type: 'success',
                title: 'New Sale!',
                message: `${currency} ${amount?.toLocaleString()} received`,
                duration: 8000,
                deepLink: '/merchant/transactions',
                action: { label: 'View Transaction' },
              });
            } else if (type === 'PAYMENT_RECEIVED') {
              notifyPaymentReceived(amount, currency, merchantName || 'Someone');
              addNotification({
                type: 'payment',
                title: 'Payment Received',
                message: `${currency} ${amount?.toLocaleString()} received${merchantName ? ` from ${merchantName}` : ''}`,
                data: { ...tx, url: '/dashboard/transactions' },
              });
              showToast({
                type: 'success',
                title: 'Payment Received!',
                message: `${currency} ${amount?.toLocaleString()} received`,
                duration: 8000,
                deepLink: '/dashboard/transactions',
                action: { label: 'View Transaction' },
              });
              notificationService.sendPaymentReceived({
                userId: user.id,
                amount: amount || 0,
                currency,
                senderName: merchantName || 'Someone',
                transactionId: tx.id,
              }).catch(console.error);
            } else if (type === 'TRANSFER') {
              // Positive = received, negative = sent
              const isReceived = rawAmount > 0;
              const counterparty = isReceived ? tx.metadata?.sender_name : tx.metadata?.recipient_name;

              if (isReceived) {
                notifyPaymentReceived(amount, currency, counterparty || 'Someone');
              }

              addNotification({
                type: 'transfer',
                title: isReceived ? 'Transfer Received' : 'Transfer Sent',
                message: `${currency} ${amount?.toLocaleString()} ${isReceived ? 'received from' : 'sent to'} ${counterparty || 'user'}`,
                data: { ...tx, url: '/dashboard/transactions' },
              });
              showToast({
                type: isReceived ? 'success' : 'info',
                title: isReceived ? 'Transfer Received!' : 'Transfer Sent',
                message: `${currency} ${amount?.toLocaleString()} ${isReceived ? 'received' : 'sent'}`,
                duration: 8000,
                deepLink: '/dashboard/transactions',
                action: { label: 'View Transaction' },
              });
              notificationService.sendTransferNotification({
                userId: user.id,
                amount: amount || 0,
                currency,
                direction: isReceived ? 'received' : 'sent',
                counterpartyName: counterparty || description,
                transactionId: tx.id,
              }).catch(console.error);
            } else if (type === 'PAYMENT') {
              addNotification({
                type: 'payment',
                title: 'Payment Sent',
                message: `${currency} ${amount?.toLocaleString()} sent${merchantName ? ` to ${merchantName}` : ''}`,
                data: { ...tx, url: '/dashboard/transactions' },
              });
              showToast({
                type: 'info',
                title: 'Payment Sent',
                message: `${currency} ${amount?.toLocaleString()} sent`,
                duration: 5000,
                deepLink: '/dashboard/transactions',
                action: { label: 'View Transaction' },
              });
              notificationService.sendPaymentSent({
                userId: user.id,
                amount: amount || 0,
                currency,
                recipientName: merchantName || 'Recipient',
                transactionId: tx.id,
              }).catch(console.error);
            } else if (type === 'MOBILE_MONEY_SEND') {
              addNotification({
                type: 'withdrawal',
                title: 'Mobile Money Sent',
                message: `${currency} ${amount?.toLocaleString()} sent to mobile money`,
                data: { ...tx, url: '/dashboard/transactions' },
              });
              showToast({
                type: 'success',
                title: 'Mobile Money Sent',
                message: `${currency} ${amount?.toLocaleString()} sent`,
                duration: 8000,
                deepLink: '/dashboard/transactions',
                action: { label: 'View Transaction' },
              });
              notificationService.sendWithdrawalNotification({
                userId: user.id,
                amount: amount || 0,
                currency,
                status: 'completed',
                transactionId: tx.id,
                destination: 'Mobile Money',
              }).catch(console.error);
            } else if (type === 'REFUND') {
              addNotification({
                type: 'payment',
                title: 'Refund Received',
                message: `${currency} ${amount?.toLocaleString()} refunded${merchantName ? ` from ${merchantName}` : ''}`,
                data: { ...tx, url: '/dashboard/transactions' },
              });
              showToast({
                type: 'success',
                title: 'Refund Received!',
                message: `${currency} ${amount?.toLocaleString()} refunded`,
                duration: 8000,
                deepLink: '/dashboard/transactions',
                action: { label: 'View Transaction' },
              });
            } else if (type === 'DEPOSIT') {
              // Handle deposit notifications
              addNotification({
                type: 'deposit',
                title: 'Deposit Received',
                message: `${currency} ${amount?.toLocaleString()} deposited to your wallet`,
                data: { ...tx, url: '/dashboard/transactions' },
              });
              showToast({
                type: 'success',
                title: 'Deposit Successful!',
                message: `${currency} ${amount?.toLocaleString()} added to your wallet`,
                duration: 8000,
                deepLink: '/dashboard/transactions',
                action: { label: 'View Transaction' },
              });
              notificationService.sendDepositNotification({
                userId: user.id,
                amount: amount || 0,
                currency,
                status: 'completed',
                transactionId: tx.id,
              }).catch(console.error);
            } else if (type === 'CASHOUT') {
              // User withdrawal/cashout
              addNotification({
                type: 'withdrawal',
                title: 'Cashout Initiated',
                message: `${currency} ${amount?.toLocaleString()} cashout to mobile money`,
                data: { ...tx, url: '/dashboard/transactions' },
              });
              showToast({
                type: 'info',
                title: 'Cashout Initiated',
                message: `${currency} ${amount?.toLocaleString()} being sent to your mobile money`,
                duration: 8000,
                deepLink: '/dashboard/transactions',
                action: { label: 'View Transaction' },
              });
            } else if (type === 'MERCHANT_WITHDRAWAL') {
              // Merchant withdrawal
              addNotification({
                type: 'withdrawal',
                title: 'Withdrawal Initiated',
                message: `${currency} ${amount?.toLocaleString()} withdrawal requested`,
                data: { ...tx, url: '/merchant/payouts' },
              });
              showToast({
                type: 'info',
                title: 'Withdrawal Initiated',
                message: `${currency} ${amount?.toLocaleString()} withdrawal processing`,
                duration: 8000,
                deepLink: '/merchant/payouts',
                action: { label: 'View Payouts' },
              });
            } else if (type === 'CARD_PURCHASE') {
              // Card purchase
              addNotification({
                type: 'payment',
                title: 'Card Purchased',
                message: `Virtual card purchased for ${currency} ${amount?.toLocaleString()}`,
                data: { ...tx, url: '/dashboard/cards' },
              });
              showToast({
                type: 'success',
                title: 'Card Purchased!',
                message: `Your new card is ready`,
                duration: 8000,
                deepLink: '/dashboard/cards',
                action: { label: 'View Cards' },
              });
            } else if (type === 'PAYMENT_SENT') {
              // Outgoing payment
              addNotification({
                type: 'payment',
                title: 'Payment Sent',
                message: `${currency} ${amount?.toLocaleString()} sent${merchantName ? ` to ${merchantName}` : ''}`,
                data: { ...tx, url: '/dashboard/transactions' },
              });
              showToast({
                type: 'info',
                title: 'Payment Sent',
                message: `${currency} ${amount?.toLocaleString()} sent successfully`,
                duration: 5000,
                deepLink: '/dashboard/transactions',
                action: { label: 'View Transaction' },
              });
            }
          }
        )
        .subscribe();

      subscriptionsRef.current.push(walletTransactionSubscription);

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
    };

    setupSubscriptions();

    // Cleanup
    return () => {
      subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
      subscriptionsRef.current = [];
      pushNotificationService.cleanup();
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
