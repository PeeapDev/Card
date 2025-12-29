/**
 * PWA Install Banner Component
 *
 * Shows an install prompt for the POS app on mobile devices.
 * Automatically detects the device and browser to show appropriate instructions.
 */

import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share, Plus, MoreVertical, Check } from 'lucide-react';
import { Button } from '@/components/ui';
import { usePWA } from '@/hooks/usePWA';

interface PWAInstallBannerProps {
  /** Force show the banner (for manual trigger) */
  forceShow?: boolean;
  /** Callback when banner is dismissed */
  onDismiss?: () => void;
  /** Show as modal instead of banner */
  asModal?: boolean;
}

export function PWAInstallBanner({ forceShow, onDismiss, asModal }: PWAInstallBannerProps) {
  const pwa = usePWA();
  const [showBanner, setShowBanner] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  // Detect device and browser
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isChrome = /Chrome/.test(navigator.userAgent) && !/Edge/.test(navigator.userAgent);
  const isSamsung = /SamsungBrowser/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;

  // Check if already dismissed in this session
  useEffect(() => {
    const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
    if (wasDismissed) {
      setDismissed(true);
    }
  }, []);

  // Show banner logic - controlled by parent component via forceShow
  useEffect(() => {
    if (forceShow) {
      setShowBanner(true);
    } else if (pwa.isInstalled || dismissed) {
      setShowBanner(false);
    }
  }, [forceShow, pwa.isInstalled, dismissed]);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissed(true);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
    onDismiss?.();
  };

  const handleInstall = async () => {
    if (pwa.isInstallable) {
      setInstalling(true);
      const success = await pwa.install();
      setInstalling(false);
      if (success) {
        setInstalled(true);
        setTimeout(() => {
          setShowBanner(false);
        }, 2000);
      }
    }
  };

  if (!showBanner) return null;

  // Render success state
  if (installed) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4`}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full text-center animate-in zoom-in-95">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            App Installed!
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Peeap POS has been added to your home screen. You can now use it offline!
          </p>
        </div>
      </div>
    );
  }

  // Modal content based on device
  const renderInstructions = () => {
    // Always show install button - it will trigger browser prompt or show instructions
    return (
      <div className="text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
          <Smartphone className="w-10 h-10 text-white" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Install Peeap POS
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Install the app for faster access and offline support. Works without internet!
        </p>

        {pwa.isInstallable ? (
          // Browser supports install prompt - show install button
          <Button
            onClick={handleInstall}
            disabled={installing}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            size="lg"
          >
            {installing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Installing...
              </>
            ) : (
              <>
                <Download className="w-5 h-5 mr-2" />
                Install App
              </>
            )}
          </Button>
        ) : (
          // Show device-specific instructions
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-left space-y-3">
            {isIOS ? (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-white">To install on iPhone/iPad:</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Share className="w-5 h-5 text-blue-500" />
                  <span>1. Tap the <strong>Share</strong> button below</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Plus className="w-5 h-5 text-blue-500" />
                  <span>2. Tap <strong>"Add to Home Screen"</strong></span>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-gray-900 dark:text-white">To install:</p>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MoreVertical className="w-5 h-5 text-blue-500" />
                  <span>1. Tap <strong>Menu</strong> (⋮) at top right</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Download className="w-5 h-5 text-blue-500" />
                  <span>2. Tap <strong>"Install app"</strong></span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl p-6 max-w-sm w-full animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {renderInstructions()}

        {/* Skip button */}
        <button
          onClick={handleDismiss}
          className="w-full mt-4 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-sm"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}

export default PWAInstallBanner;
