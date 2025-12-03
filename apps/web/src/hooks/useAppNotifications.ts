import { useEffect } from 'react';
import { useNotification, useToast } from '@/context/NotificationContext';

/**
 * Hook to manage app-wide notifications
 * Can be used to trigger notifications based on events like:
 * - Successful transactions
 * - Payment received
 * - Security alerts
 * - System updates
 */
export function useAppNotifications() {
  const { addNotification, showToast } = useNotification();
  const toast = useToast();

  // Notification helpers
  const notifyTransaction = (type: 'sent' | 'received', amount: number, currency: string, recipient?: string) => {
    const title = type === 'sent' ? 'Money Sent' : 'Money Received';
    const message = type === 'sent'
      ? `You sent ${currency} ${amount.toLocaleString()} to ${recipient || 'a recipient'}`
      : `You received ${currency} ${amount.toLocaleString()}`;

    addNotification({
      type: 'transaction',
      title,
      message,
    });

    toast.success(title, message);
  };

  const notifyPayment = (status: 'success' | 'failed', amount: number, currency: string, merchant?: string) => {
    const title = status === 'success' ? 'Payment Successful' : 'Payment Failed';
    const message = status === 'success'
      ? `Your payment of ${currency} ${amount.toLocaleString()} to ${merchant || 'merchant'} was successful`
      : `Your payment of ${currency} ${amount.toLocaleString()} failed. Please try again.`;

    addNotification({
      type: 'payment',
      title,
      message,
    });

    if (status === 'success') {
      toast.success(title, message);
    } else {
      toast.error(title, message);
    }
  };

  const notifySecurity = (title: string, message: string) => {
    addNotification({
      type: 'security',
      title,
      message,
    });

    toast.warning(title, message);
  };

  const notifySystem = (title: string, message: string) => {
    addNotification({
      type: 'system',
      title,
      message,
    });

    toast.info(title, message);
  };

  const notifyPromo = (title: string, message: string) => {
    addNotification({
      type: 'promo',
      title,
      message,
    });
  };

  return {
    notifyTransaction,
    notifyPayment,
    notifySecurity,
    notifySystem,
    notifyPromo,
    toast,
    addNotification,
    showToast,
  };
}

/**
 * Hook to add demo notifications for testing
 * Only runs once when the component mounts
 */
export function useDemoNotifications(enabled = false) {
  const { addNotification } = useNotification();

  useEffect(() => {
    if (!enabled) return;

    // Add some demo notifications after a short delay
    const timer = setTimeout(() => {
      addNotification({
        type: 'transaction',
        title: 'Payment Received',
        message: 'You received SLE 50,000 from John Doe',
      });

      addNotification({
        type: 'security',
        title: 'New Login Detected',
        message: 'A new login was detected from Safari on macOS',
      });

      addNotification({
        type: 'promo',
        title: 'Special Offer',
        message: 'Get 20% cashback on your next deposit!',
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [enabled, addNotification]);
}
