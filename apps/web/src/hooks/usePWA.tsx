/**
 * PWA Hook
 * Handles PWA installation, service worker registration, and offline status
 */

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export interface PWAState {
  // Installation
  isInstallable: boolean;
  isInstalled: boolean;
  isInstalling: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
  install: () => Promise<boolean>;

  // Service Worker
  isServiceWorkerReady: boolean;
  hasUpdate: boolean;
  updateServiceWorker: () => void;

  // Online Status
  isOnline: boolean;

  // Sync
  pendingSyncCount: number;
  syncNow: () => Promise<void>;
}

export function usePWA(): PWAState {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isServiceWorkerReady, setIsServiceWorkerReady] = useState(false);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if already installed (standalone mode)
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as any).standalone
        || document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);

    return () => mediaQuery.removeEventListener('change', checkInstalled);
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const registerSW = async () => {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          setSwRegistration(registration);
          setIsServiceWorkerReady(true);

          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setHasUpdate(true);
                }
              });
            }
          });

          // Listen for messages from service worker
          navigator.serviceWorker.addEventListener('message', (event) => {
            if (event.data.type === 'SYNC_AVAILABLE') {
              console.log('[PWA] Background sync available');
            }
          });

        } catch (error) {
          console.error('[PWA] Service worker registration failed:', error);
        }
      };

      registerSW();
    }
  }, []);

  // Online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Check pending sync count periodically
  useEffect(() => {
    const checkPendingSync = async () => {
      try {
        const { posOfflineService } = await import('@/services/pos-offline.service');
        const count = await posOfflineService.getPendingSalesCount();
        setPendingSyncCount(count);
      } catch (error) {
        // IndexedDB not initialized yet
      }
    };

    checkPendingSync();
    const interval = setInterval(checkPendingSync, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  // Install handler
  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;

    setIsInstalling(true);
    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[PWA] Installation failed:', error);
      return false;
    } finally {
      setIsInstalling(false);
    }
  }, [installPrompt]);

  // Update service worker
  const updateServiceWorker = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [swRegistration]);

  // Manual sync trigger
  const syncNow = useCallback(async () => {
    if (!isOnline) {
      console.log('[PWA] Cannot sync while offline');
      return;
    }

    try {
      const { posSyncService } = await import('@/services/pos-sync.service');
      const { posOfflineService } = await import('@/services/pos-offline.service');

      const config = await posOfflineService.getTerminalConfig();
      if (config) {
        await posSyncService.fullSync(config.merchant_id);
        const count = await posOfflineService.getPendingSalesCount();
        setPendingSyncCount(count);
      }
    } catch (error) {
      console.error('[PWA] Manual sync failed:', error);
    }
  }, [isOnline]);

  return {
    isInstallable: !!installPrompt && !isInstalled,
    isInstalled,
    isInstalling,
    installPrompt,
    install,
    isServiceWorkerReady,
    hasUpdate,
    updateServiceWorker,
    isOnline,
    pendingSyncCount,
    syncNow,
  };
}

export default usePWA;
