/**
 * useServiceWorker Hook
 *
 * Registers and manages the service worker for offline support
 */

import { useState, useEffect, useCallback } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdating: boolean;
  registration: ServiceWorkerRegistration | null;
}

export function useServiceWorker() {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isUpdating: false,
    registration: null,
  });

  // Register service worker
  useEffect(() => {
    if (!state.isSupported) {
      console.log('[useServiceWorker] Service workers not supported');
      return;
    }

    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });

        console.log('[useServiceWorker] Service worker registered:', registration.scope);

        setState(prev => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener('updatefound', () => {
          console.log('[useServiceWorker] Update found');
          setState(prev => ({ ...prev, isUpdating: true }));
        });

        // Handle controller change (new SW activated)
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[useServiceWorker] Controller changed');
          setState(prev => ({ ...prev, isUpdating: false }));
        });

      } catch (error) {
        console.error('[useServiceWorker] Registration failed:', error);
      }
    };

    registerSW();
  }, [state.isSupported]);

  // Listen for messages from service worker
  useEffect(() => {
    if (!state.isSupported) return;

    const handleMessage = (event: MessageEvent) => {
      console.log('[useServiceWorker] Message from SW:', event.data);

      if (event.data.type === 'SYNC_AVAILABLE') {
        // Trigger sync in the main app
        window.dispatchEvent(new CustomEvent('sw-sync-available'));
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, [state.isSupported]);

  // Send message to service worker
  const sendMessage = useCallback((message: any) => {
    if (!state.registration?.active) {
      console.warn('[useServiceWorker] No active service worker');
      return;
    }
    state.registration.active.postMessage(message);
  }, [state.registration]);

  // Request background sync
  const requestSync = useCallback(async (tag: string = 'sync-sales') => {
    if (!state.registration) {
      console.warn('[useServiceWorker] No registration for sync');
      return false;
    }

    try {
      // @ts-ignore - Background Sync API
      await state.registration.sync?.register(tag);
      console.log('[useServiceWorker] Sync registered:', tag);
      return true;
    } catch (error) {
      console.error('[useServiceWorker] Sync registration failed:', error);
      return false;
    }
  }, [state.registration]);

  // Cache products data
  const cacheProducts = useCallback((products: any[]) => {
    sendMessage({ type: 'CACHE_PRODUCTS', products });
  }, [sendMessage]);

  // Cache categories data
  const cacheCategories = useCallback((categories: any[]) => {
    sendMessage({ type: 'CACHE_CATEGORIES', categories });
  }, [sendMessage]);

  // Force update
  const update = useCallback(async () => {
    if (!state.registration) return;

    try {
      await state.registration.update();
      console.log('[useServiceWorker] Update check initiated');
    } catch (error) {
      console.error('[useServiceWorker] Update check failed:', error);
    }
  }, [state.registration]);

  // Skip waiting (apply update immediately)
  const skipWaiting = useCallback(() => {
    sendMessage({ type: 'SKIP_WAITING' });
  }, [sendMessage]);

  return {
    ...state,
    sendMessage,
    requestSync,
    cacheProducts,
    cacheCategories,
    update,
    skipWaiting,
  };
}

export default useServiceWorker;
