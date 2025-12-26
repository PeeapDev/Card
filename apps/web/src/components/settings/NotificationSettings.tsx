/**
 * Notification Settings Component
 *
 * Allows users to manage push notification preferences
 */

import { useState } from 'react';
import {
  Bell,
  BellOff,
  Smartphone,
  CreditCard,
  Wallet,
  ShieldCheck,
  AlertTriangle,
  DollarSign,
  Car,
  Store,
  Gift,
  CheckCircle,
  XCircle,
  Loader2,
  Volume2,
} from 'lucide-react';
import { useNotification } from '@/context/NotificationContext';
import { NotificationPreferences } from '@/services/push-notification.service';

interface NotificationCategory {
  id: keyof NotificationPreferences;
  label: string;
  description: string;
  icon: React.ReactNode;
  important?: boolean;
}

const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  {
    id: 'payment_received',
    label: 'Payment Received',
    description: 'When you receive money from someone',
    icon: <DollarSign className="w-5 h-5 text-green-500" />,
    important: true,
  },
  {
    id: 'payment_sent',
    label: 'Payment Sent',
    description: 'Confirmation when you send money',
    icon: <Wallet className="w-5 h-5 text-blue-500" />,
  },
  {
    id: 'payment_failed',
    label: 'Payment Failed',
    description: 'When a payment transaction fails',
    icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
    important: true,
  },
  {
    id: 'driver_payment',
    label: 'Driver Fare Collection',
    description: 'When you collect a fare as a driver',
    icon: <Car className="w-5 h-5 text-yellow-500" />,
    important: true,
  },
  {
    id: 'merchant_sale',
    label: 'Merchant Sales',
    description: 'When you receive a payment as a merchant',
    icon: <Store className="w-5 h-5 text-purple-500" />,
    important: true,
  },
  {
    id: 'payout_completed',
    label: 'Payout Completed',
    description: 'When money is sent to your bank account',
    icon: <CheckCircle className="w-5 h-5 text-green-500" />,
  },
  {
    id: 'payout_failed',
    label: 'Payout Failed',
    description: 'When a payout to your bank fails',
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    important: true,
  },
  {
    id: 'low_balance',
    label: 'Low Balance Alert',
    description: 'When your wallet balance is running low',
    icon: <AlertTriangle className="w-5 h-5 text-yellow-500" />,
  },
  {
    id: 'card_transaction',
    label: 'Card Transactions',
    description: 'Activity on your virtual cards',
    icon: <CreditCard className="w-5 h-5 text-indigo-500" />,
  },
  {
    id: 'login_alert',
    label: 'Security Alerts',
    description: 'New login from unknown device',
    icon: <ShieldCheck className="w-5 h-5 text-red-500" />,
    important: true,
  },
  {
    id: 'kyc_approved',
    label: 'KYC Updates',
    description: 'Identity verification status changes',
    icon: <ShieldCheck className="w-5 h-5 text-blue-500" />,
  },
  {
    id: 'refund_processed',
    label: 'Refunds',
    description: 'When a refund is processed',
    icon: <DollarSign className="w-5 h-5 text-teal-500" />,
  },
  {
    id: 'promotional',
    label: 'Promotions & Updates',
    description: 'Special offers and product updates',
    icon: <Gift className="w-5 h-5 text-pink-500" />,
  },
];

export function NotificationSettings() {
  const {
    pushPermission,
    isPushEnabled,
    requestPushPermission,
    sendTestPush,
    pushPreferences,
    updatePushPreferences
  } = useNotification();

  const [loading, setLoading] = useState(false);
  const [testSent, setTestSent] = useState(false);

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      await requestPushPermission();
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: keyof NotificationPreferences) => {
    await updatePushPreferences({ [id]: !pushPreferences[id] });
  };

  const handleTestNotification = async () => {
    setTestSent(false);
    try {
      await sendTestPush();
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    } catch (error) {
      console.error('[NotificationSettings] Test notification failed:', error);
      alert('Failed to send test notification. Check browser console for details.');
    }
  };

  const handleEnableAll = async () => {
    const allEnabled = Object.keys(pushPreferences).reduce((acc, key) => {
      acc[key as keyof NotificationPreferences] = true;
      return acc;
    }, {} as NotificationPreferences);
    await updatePushPreferences(allEnabled);
  };

  const handleDisableAll = async () => {
    const allDisabled = Object.keys(pushPreferences).reduce((acc, key) => {
      acc[key as keyof NotificationPreferences] = false;
      return acc;
    }, {} as NotificationPreferences);
    await updatePushPreferences(allDisabled);
  };

  if (pushPermission === 'unsupported') {
    return (
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex items-center gap-3">
          <BellOff className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          <div>
            <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
              Push Notifications Not Supported
            </h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
              Your browser doesn't support push notifications. Try using a modern browser like Chrome, Firefox, or Edge.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Push Permission Status */}
      <div className={`rounded-lg p-4 ${
        isPushEnabled
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
          : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isPushEnabled ? (
              <Bell className="w-6 h-6 text-green-600 dark:text-green-400" />
            ) : (
              <BellOff className="w-6 h-6 text-gray-400" />
            )}
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">
                {isPushEnabled ? 'Push Notifications Enabled' : 'Enable Push Notifications'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5">
                {isPushEnabled
                  ? 'You will receive notifications for important events'
                  : 'Get instant alerts for payments, transactions, and more'}
              </p>
            </div>
          </div>

          {!isPushEnabled && (
            <button
              onClick={handleEnableNotifications}
              disabled={loading || pushPermission === 'denied'}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {pushPermission === 'denied' ? 'Blocked by Browser' : 'Enable'}
            </button>
          )}
        </div>

      </div>

      {/* Blocked by Browser - Prominent Reset Instructions */}
      {pushPermission === 'denied' && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
          <div className="flex items-start gap-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/40 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-800 dark:text-red-200 text-lg mb-1">
                Notifications Blocked
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                Your browser has blocked notifications for this site. To receive payment alerts, security warnings, and other important updates, you'll need to allow notifications in your browser settings.
              </p>

              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-red-100 dark:border-red-900">
                <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  <span>How to Enable Notifications:</span>
                </h5>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">1</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Click the <strong>lock icon</strong> (or info icon) in your browser's address bar, next to the URL
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">2</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Find <strong>"Notifications"</strong> in the site permissions dropdown
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">3</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Change it from <strong>"Block"</strong> to <strong>"Allow"</strong> or <strong>"Ask"</strong>
                    </p>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center text-xs font-bold text-primary-700 dark:text-primary-300">4</span>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      <strong>Refresh this page</strong> to apply the changes
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 w-full px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Bell className="w-4 h-4" />
                  I've Updated Settings - Refresh Page
                </button>
              </div>

              <p className="text-xs text-red-600 dark:text-red-400 mt-3">
                Note: Due to browser security, we cannot automatically enable notifications. You must change this setting manually.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Test Notification - Always show to allow testing */}
      <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <Volume2 className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          <div>
            <p className="font-medium text-gray-900 dark:text-white">Test Notification</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Send yourself a test notification
              {pushPermission === 'granted' && (
                <span className="ml-2 text-green-600 dark:text-green-400">(Permission: Granted)</span>
              )}
              {pushPermission === 'denied' && (
                <span className="ml-2 text-red-600 dark:text-red-400">(Permission: Blocked)</span>
              )}
              {pushPermission === 'default' && (
                <span className="ml-2 text-yellow-600 dark:text-yellow-400">(Permission: Not requested)</span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={handleTestNotification}
          className="px-3 py-1.5 text-sm text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          {testSent && <CheckCircle className="w-4 h-4 text-green-500" />}
          {testSent ? 'Sent!' : 'Send Test'}
        </button>
      </div>

      {/* Quick Actions */}
      {isPushEnabled && (
        <div className="flex gap-2">
          <button
            onClick={handleEnableAll}
            className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400"
          >
            Enable All
          </button>
          <span className="text-gray-300 dark:text-gray-600">|</span>
          <button
            onClick={handleDisableAll}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            Disable All
          </button>
        </div>
      )}

      {/* Notification Categories */}
      {isPushEnabled && (
        <div className="space-y-1">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Notification Types
          </h4>

          <div className="divide-y divide-gray-100 dark:divide-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            {NOTIFICATION_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-3">
                  {category.icon}
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {category.label}
                      </p>
                      {category.important && (
                        <span className="text-xs px-1.5 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 rounded">
                          Important
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {category.description}
                    </p>
                  </div>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pushPreferences[category.id]}
                    onChange={() => handleToggle(category.id)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationSettings;
