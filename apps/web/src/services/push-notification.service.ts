/**
 * Push Notification Service
 *
 * Handles push notifications using Web Push API
 * Supports both foreground and background notifications
 * Note: Firebase integration disabled - using native browser notifications only
 */

import { supabase } from '@/lib/supabase';

// Notification types
export type NotificationType =
  | 'payment_received'
  | 'payment_sent'
  | 'payment_failed'
  | 'payout_completed'
  | 'payout_failed'
  | 'low_balance'
  | 'login_alert'
  | 'card_transaction'
  | 'refund_processed'
  | 'kyc_approved'
  | 'kyc_rejected'
  | 'session_expired'
  | 'driver_payment'
  | 'merchant_sale'
  | 'promotional';

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  image?: string;
  data?: Record<string, any>;
  actions?: { action: string; title: string; icon?: string }[];
  tag?: string;
  requireInteraction?: boolean;
}

export interface NotificationPreferences {
  payment_received: boolean;
  payment_sent: boolean;
  payment_failed: boolean;
  payout_completed: boolean;
  payout_failed: boolean;
  low_balance: boolean;
  login_alert: boolean;
  card_transaction: boolean;
  refund_processed: boolean;
  kyc_approved: boolean;
  kyc_rejected: boolean;
  driver_payment: boolean;
  merchant_sale: boolean;
  promotional: boolean;
}

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

// Notification icons and deep links configuration
interface NotificationConfig {
  icon: string;
  deepLink: string;
  color: string;
}

const NOTIFICATION_CONFIG: Record<NotificationType, NotificationConfig> = {
  payment_received: {
    icon: '/icons/notif-payment-received.svg',
    deepLink: '/dashboard/transactions',
    color: '#22c55e', // green
  },
  payment_sent: {
    icon: '/icons/notif-payment-sent.svg',
    deepLink: '/dashboard/transactions',
    color: '#3b82f6', // blue
  },
  payment_failed: {
    icon: '/icons/notif-payment-failed.svg',
    deepLink: '/dashboard/transactions',
    color: '#ef4444', // red
  },
  payout_completed: {
    icon: '/icons/notif-payout.svg',
    deepLink: '/merchant/payouts',
    color: '#22c55e', // green
  },
  payout_failed: {
    icon: '/icons/notif-payout-failed.svg',
    deepLink: '/merchant/payouts',
    color: '#ef4444', // red
  },
  low_balance: {
    icon: '/icons/notif-low-balance.svg',
    deepLink: '/dashboard/wallet',
    color: '#f59e0b', // amber
  },
  login_alert: {
    icon: '/icons/notif-security.svg',
    deepLink: '/dashboard/settings',
    color: '#ef4444', // red
  },
  card_transaction: {
    icon: '/icons/notif-card.svg',
    deepLink: '/dashboard/cards',
    color: '#6366f1', // indigo
  },
  refund_processed: {
    icon: '/icons/notif-refund.svg',
    deepLink: '/merchant/refunds',
    color: '#14b8a6', // teal
  },
  kyc_approved: {
    icon: '/icons/notif-kyc-approved.svg',
    deepLink: '/dashboard/settings',
    color: '#22c55e', // green
  },
  kyc_rejected: {
    icon: '/icons/notif-kyc-rejected.svg',
    deepLink: '/dashboard/settings',
    color: '#ef4444', // red
  },
  session_expired: {
    icon: '/icons/notif-session.svg',
    deepLink: '/login',
    color: '#f59e0b', // amber
  },
  driver_payment: {
    icon: '/icons/notif-driver.svg',
    deepLink: '/merchant/driver-wallet',
    color: '#eab308', // yellow
  },
  merchant_sale: {
    icon: '/icons/notif-sale.svg',
    deepLink: '/merchant/transactions',
    color: '#a855f7', // purple
  },
  promotional: {
    icon: '/icons/notif-promo.svg',
    deepLink: '/dashboard',
    color: '#ec4899', // pink
  },
};

class PushNotificationService {
  private fcmToken: string | null = null;
  private isSupported: boolean = false;
  private listeners: Map<string, (payload: NotificationPayload) => void> = new Map();

  constructor() {
    this.checkSupport();
  }

  private checkSupport() {
    this.isSupported =
      typeof window !== 'undefined' &&
      'Notification' in window &&
      'serviceWorker' in navigator &&
      'PushManager' in window;
  }

  /**
   * Initialize and request notification permission
   */
  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.warn('[Push] Push notifications not supported in this browser');
      return false;
    }

    try {
      // Request permission
      const hasPermission = await this.requestPermission();
      if (!hasPermission) return false;

      return true;
    } catch (error) {
      console.error('[Push] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Request notification permission
   */
  async requestPermission(): Promise<boolean> {
    if (!this.isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[Push] Permission request failed:', error);
      return false;
    }
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermission | 'unsupported' {
    if (!this.isSupported) return 'unsupported';
    return Notification.permission;
  }

  /**
   * Get notification config for a type
   */
  getNotificationConfig(type: NotificationType): NotificationConfig {
    return NOTIFICATION_CONFIG[type] || NOTIFICATION_CONFIG.promotional;
  }

  /**
   * Show a local notification (browser notification)
   */
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (Notification.permission !== 'granted') {
      return;
    }

    // Check user preferences (skip for test notifications)
    const prefs = await this.getPreferences();
    const prefKey = payload.type as keyof NotificationPreferences;
    if (prefs[prefKey] === false && !payload.data?.isTest) {
      return;
    }

    try {
      // Get config for this notification type
      const config = this.getNotificationConfig(payload.type);

      // Note: 'image' property is supported by browsers but not in TS NotificationOptions type
      const notificationOptions: NotificationOptions & { image?: string } = {
        body: payload.body,
        icon: payload.icon || config.icon || '/icons/icon-192x192.svg',
        tag: payload.tag || payload.type,
        data: {
          ...payload.data,
          type: payload.type,
          deepLink: config.deepLink,
        },
        requireInteraction: payload.requireInteraction,
        badge: '/icons/badge-72x72.svg',
      };
      if (payload.image) {
        notificationOptions.image = payload.image;
      }
      const notification = new Notification(payload.title, notificationOptions as NotificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();

        // Handle notification click - navigate to deep link
        this.handleNotificationClick(payload);
      };

      // Play notification sound for important events
      if (['payment_received', 'driver_payment', 'merchant_sale'].includes(payload.type)) {
        this.playNotificationSound();
      }

    } catch (error) {
      console.error('[Push] Failed to show notification:', error);
    }
  }

  /**
   * Handle notification click - navigate to deep link
   */
  private handleNotificationClick(payload: NotificationPayload): void {
    const { type, data } = payload;
    const config = NOTIFICATION_CONFIG[type];

    // Use data.url if provided, otherwise use config deepLink
    const deepLink = data?.url || config?.deepLink || '/dashboard';

    // Navigate to deep link
    window.location.href = deepLink;
  }

  /**
   * Play notification sound
   */
  private playNotificationSound(): void {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Autoplay might be blocked
      });
    } catch (error) {
      // Sound playback failed
    }
  }

  /**
   * Add event listener for notifications
   */
  addEventListener(id: string, callback: (payload: NotificationPayload) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * Remove event listener
   */
  removeEventListener(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(payload: NotificationPayload): void {
    this.listeners.forEach((callback) => {
      try {
        callback(payload);
      } catch (error) {
        console.error('[Push] Listener error:', error);
      }
    });
  }

  /**
   * Get notification preferences
   */
  async getPreferences(): Promise<NotificationPreferences> {
    try {
      const stored = localStorage.getItem('notification_preferences');
      if (stored) {
        return { ...DEFAULT_PREFERENCES, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('[Push] Failed to get preferences:', error);
    }
    return DEFAULT_PREFERENCES;
  }

  /**
   * Save notification preferences
   */
  async savePreferences(preferences: Partial<NotificationPreferences>): Promise<void> {
    try {
      const current = await this.getPreferences();
      const updated = { ...current, ...preferences };
      localStorage.setItem('notification_preferences', JSON.stringify(updated));
    } catch (error) {
      console.error('[Push] Failed to save preferences:', error);
    }
  }

  /**
   * Send a test notification
   */
  async sendTestNotification(): Promise<void> {

    // Check if notifications are supported
    if (!this.isSupported) {
      console.error('[Push] Notifications not supported in this browser');
      alert('Push notifications are not supported in this browser.');
      return;
    }

    // Request permission if not already granted
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Please allow notifications to receive test notification.');
        return;
      }
    } else if (Notification.permission === 'denied') {
      alert('Notifications are blocked. Please enable them in your browser settings.');
      return;
    }

    // Now show the notification directly (bypassing showLocalNotification for test)
    try {
      const notification = new Notification('Test Notification', {
        body: 'Push notifications are working correctly! Tap to test deep link.',
        icon: '/icons/icon-192x192.svg',
        tag: 'test-notification',
        badge: '/icons/badge-72x72.svg',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        window.location.href = '/dashboard/transactions';
      };

    } catch (error) {
      console.error('[Push] Failed to show test notification:', error);
      alert('Failed to show notification. Check console for details.');
    }
  }

  /**
   * Check if notifications are enabled
   */
  isEnabled(): boolean {
    return this.isSupported && Notification.permission === 'granted';
  }

  /**
   * Get FCM token
   */
  getToken(): string | null {
    return this.fcmToken;
  }
}

// Export singleton instance
export const pushNotificationService = new PushNotificationService();

// Notification helper functions for different events
export const notifyPaymentReceived = (amount: number, currency: string, from: string) => {
  pushNotificationService.showLocalNotification({
    type: 'payment_received',
    title: 'Payment Received!',
    body: `You received ${currency} ${amount.toLocaleString()} from ${from}`,
    requireInteraction: false,
    data: { amount, currency, from },
  });
};

export const notifyPaymentSent = (amount: number, currency: string, to: string) => {
  pushNotificationService.showLocalNotification({
    type: 'payment_sent',
    title: 'Payment Sent',
    body: `You sent ${currency} ${amount.toLocaleString()} to ${to}`,
    data: { amount, currency, to },
  });
};

export const notifyPaymentFailed = (amount: number, reason: string) => {
  pushNotificationService.showLocalNotification({
    type: 'payment_failed',
    title: 'Payment Failed',
    body: `Payment of ${amount.toLocaleString()} failed: ${reason}`,
    requireInteraction: true,
    data: { amount, reason },
  });
};

export const notifyDriverPayment = (amount: number, currency: string) => {
  pushNotificationService.showLocalNotification({
    type: 'driver_payment',
    title: 'Fare Collected!',
    body: `You received ${currency} ${amount.toLocaleString()} for your trip`,
    requireInteraction: false,
    data: { amount, currency },
  });
};

export const notifyMerchantSale = (amount: number, currency: string, method: string) => {
  pushNotificationService.showLocalNotification({
    type: 'merchant_sale',
    title: 'New Sale!',
    body: `${currency} ${amount.toLocaleString()} received via ${method}`,
    requireInteraction: false,
    data: { amount, currency, method },
  });
};

export const notifyPayoutCompleted = (amount: number, currency: string, destination: string) => {
  pushNotificationService.showLocalNotification({
    type: 'payout_completed',
    title: 'Payout Completed',
    body: `${currency} ${amount.toLocaleString()} sent to ${destination}`,
    data: { amount, currency, destination },
  });
};

export const notifyLowBalance = (balance: number, currency: string) => {
  pushNotificationService.showLocalNotification({
    type: 'low_balance',
    title: 'Low Balance Alert',
    body: `Your wallet balance is low: ${currency} ${balance.toLocaleString()}`,
    requireInteraction: true,
    data: { balance, currency },
  });
};

export const notifyLoginAlert = (device: string, location: string) => {
  pushNotificationService.showLocalNotification({
    type: 'login_alert',
    title: 'New Login Detected',
    body: `Login from ${device} in ${location}`,
    requireInteraction: true,
    data: { device, location },
  });
};

export const notifyKYCStatus = (approved: boolean, reason?: string) => {
  pushNotificationService.showLocalNotification({
    type: approved ? 'kyc_approved' : 'kyc_rejected',
    title: approved ? 'KYC Approved!' : 'KYC Verification Update',
    body: approved
      ? 'Your identity has been verified. You now have full access.'
      : `KYC verification needs attention: ${reason || 'Please check your documents'}`,
    requireInteraction: !approved,
  });
};
