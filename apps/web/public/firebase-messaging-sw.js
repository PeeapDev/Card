/**
 * Firebase Cloud Messaging Service Worker
 * Handles background push notifications
 */

// Import Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Initialize Firebase (config will be passed from main app)
// These are placeholder values - actual config should come from environment
const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
};

// Only initialize if config is available
if (firebaseConfig.apiKey) {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const notificationTitle = payload.notification?.title || 'Peeap';
    const notificationOptions = {
      body: payload.notification?.body || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: payload.data?.type || 'default',
      data: payload.data,
      requireInteraction: payload.data?.requireInteraction === 'true',
      actions: getActionsForType(payload.data?.type),
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Get notification actions based on type
function getActionsForType(type) {
  switch (type) {
    case 'payment_received':
    case 'driver_payment':
    case 'merchant_sale':
      return [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'payment_failed':
    case 'payout_failed':
      return [
        { action: 'retry', title: 'Retry' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    case 'low_balance':
      return [
        { action: 'topup', title: 'Top Up' },
        { action: 'dismiss', title: 'Dismiss' },
      ];
    default:
      return [];
  }
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event);

  event.notification.close();

  const type = event.notification.data?.type;
  const action = event.action;

  let url = '/dashboard';

  // Determine URL based on notification type and action
  if (action === 'dismiss') {
    return;
  }

  switch (type) {
    case 'payment_received':
    case 'payment_sent':
    case 'driver_payment':
      url = '/dashboard/transactions';
      break;
    case 'payout_completed':
    case 'payout_failed':
      url = '/merchant/payouts';
      break;
    case 'low_balance':
      url = action === 'topup' ? '/dashboard/wallet' : '/dashboard';
      break;
    case 'card_transaction':
      url = '/dashboard/cards';
      break;
    case 'kyc_approved':
    case 'kyc_rejected':
      url = '/dashboard/settings';
      break;
    case 'merchant_sale':
      url = '/merchant/transactions';
      break;
    case 'login_alert':
      url = '/dashboard/settings/security';
      break;
    default:
      if (event.notification.data?.url) {
        url = event.notification.data.url;
      }
  }

  // Open or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

// Handle push event (fallback for custom push handling)
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('[SW] Push event received:', data);

    // If Firebase handles it, skip
    if (data.notification) return;

    // Handle custom payload format
    const title = data.title || 'Peeap';
    const options = {
      body: data.body || data.message || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: data.type || 'default',
      data: data,
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('[SW] Failed to handle push:', e);
  }
});

// Service worker install
self.addEventListener('install', (event) => {
  console.log('[SW] Service worker installing...');
  self.skipWaiting();
});

// Service worker activate
self.addEventListener('activate', (event) => {
  console.log('[SW] Service worker activating...');
  event.waitUntil(clients.claim());
});
