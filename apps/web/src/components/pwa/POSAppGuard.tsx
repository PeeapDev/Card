/**
 * POS App Guard
 *
 * When running as installed PWA, restricts navigation to POS-only pages.
 * If user tries to navigate outside POS, redirects back to POS terminal.
 */

import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

export function usePOSAppMode() {
  const [isPOSApp, setIsPOSApp] = useState(false);

  useEffect(() => {
    // Check if running as standalone PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true;

    // Check if started from POS (check the start_url in URL or referrer)
    const startedFromPOS = sessionStorage.getItem('pos-app-mode') === 'true';

    // If standalone and on a POS page, mark as POS app mode
    if (isStandalone) {
      const isPOSPage = window.location.pathname.startsWith('/merchant/pos');
      if (isPOSPage || startedFromPOS) {
        sessionStorage.setItem('pos-app-mode', 'true');
        setIsPOSApp(true);
      }
    }

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (!e.matches) {
        // No longer standalone, clear POS app mode
        sessionStorage.removeItem('pos-app-mode');
        setIsPOSApp(false);
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isPOSApp;
}

export function POSAppGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const isPOSApp = usePOSAppMode();

  useEffect(() => {
    if (!isPOSApp) return;

    const isPOSPage = location.pathname.startsWith('/merchant/pos');
    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

    // Allow auth pages
    if (isAuthPage) return;

    // If not on a POS page, redirect to POS terminal
    if (!isPOSPage) {
      console.log('[POS App] Redirecting to POS terminal - outside POS scope');
      navigate('/merchant/pos/terminal', { replace: true });
    }
  }, [location.pathname, isPOSApp, navigate]);

  return <>{children}</>;
}

export default POSAppGuard;
