/**
 * Firebase Configuration
 *
 * Initializes Firebase for Cloud Messaging (FCM) push notifications.
 * Configure these environment variables in .env.local:
 *
 * VITE_FIREBASE_API_KEY=your-api-key
 * VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
 * VITE_FIREBASE_PROJECT_ID=your-project-id
 * VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
 * VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
 * VITE_FIREBASE_APP_ID=your-app-id
 * VITE_FIREBASE_VAPID_KEY=your-vapid-key
 */

import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, Messaging, isSupported } from 'firebase/messaging';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyC42eJgE3aJQZnCTPG08nXrX7Tv40Gje1k',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'peeap2025.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'peeap2025',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'peeap2025.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1095173463432',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:1095173463432:web:1364a76e1f4a79a0826e3d',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-H21NEWKMV8',
};

// VAPID key for web push
export const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || 'BECA0yV4lMKyyrMvKFV3Uz4KNezCgWEVkdMGzUxjfI7ztOxbHitxVG3z2RZyblxxG8yNNjveA-h3WIGKw16nvmw';

// Check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.messagingSenderId &&
    firebaseConfig.appId
  );
};

// Initialize Firebase app (singleton)
let app: FirebaseApp | null = null;
let messaging: Messaging | null = null;

export const initializeFirebase = (): FirebaseApp | null => {
  if (!isFirebaseConfigured()) {
    console.warn('[Firebase] Not configured. Set VITE_FIREBASE_* environment variables.');
    return null;
  }

  if (!app) {
    const existingApps = getApps();
    if (existingApps.length > 0) {
      app = existingApps[0];
    } else {
      app = initializeApp(firebaseConfig);
    }
    console.log('[Firebase] App initialized');
  }

  return app;
};

// Get Firebase Messaging instance
export const getFirebaseMessaging = async (): Promise<Messaging | null> => {
  if (messaging) return messaging;

  // Check if messaging is supported in this browser
  const supported = await isSupported();
  if (!supported) {
    console.warn('[Firebase] Messaging is not supported in this browser');
    return null;
  }

  const firebaseApp = initializeFirebase();
  if (!firebaseApp) return null;

  try {
    messaging = getMessaging(firebaseApp);
    console.log('[Firebase] Messaging initialized');
    return messaging;
  } catch (error) {
    console.error('[Firebase] Error initializing messaging:', error);
    return null;
  }
};

// Export config for service worker (will be injected at build time)
export const getFirebaseConfig = () => firebaseConfig;

export { app, messaging };
