/**
 * POS Manifest Switcher
 *
 * Dynamically switches the manifest.json link when on POS pages
 * This ensures the POS PWA is scoped only to /merchant/pos/
 */

import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function POSManifestSwitcher() {
  const location = useLocation();

  useEffect(() => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (!manifestLink) return;

    const isPOSPage = location.pathname.startsWith('/merchant/pos');
    const currentManifest = manifestLink.getAttribute('href');
    const targetManifest = isPOSPage ? '/manifest-pos.json' : '/manifest.json';

    if (currentManifest !== targetManifest) {
      manifestLink.setAttribute('href', targetManifest);
      console.log('[PWA] Switched manifest to:', targetManifest);
    }
  }, [location.pathname]);

  return null;
}

export default POSManifestSwitcher;
