/**
 * Apps Context
 *
 * Manages enabled/disabled state for merchant apps
 * Loads state from database and syncs across components
 * Uses localStorage as cache for offline support
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import posService from '@/services/pos.service';

export interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
}

interface AppsContextType {
  enabledApps: Record<string, boolean>;
  isAppEnabled: (appId: string) => boolean;
  toggleApp: (appId: string) => void;
  enableApp: (appId: string) => void;
  disableApp: (appId: string) => void;
  isLoading: boolean;
  refreshApps: () => Promise<void>;
}

const AppsContext = createContext<AppsContextType | undefined>(undefined);

const STORAGE_KEY = 'peeap_enabled_apps';

// Default app states
const DEFAULT_APPS: Record<string, boolean> = {
  pos: false, // POS disabled by default until user enables it
  fuel_station: false,
  transportation: false,
};

interface AppsProviderProps {
  children: ReactNode;
}

export function AppsProvider({ children }: AppsProviderProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [enabledApps, setEnabledApps] = useState<Record<string, boolean>>(() => {
    // Load from localStorage as initial value (cache)
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_APPS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading app settings from cache:', error);
    }
    return DEFAULT_APPS;
  });

  // Load app states from database
  const loadAppsFromDatabase = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const merchantId = user.id;

      // Check POS setup status from database
      const posEnabled = await posService.isPOSSetupCompleted(merchantId);

      // Update state with database values
      setEnabledApps(prev => {
        const newState = {
          ...prev,
          pos: posEnabled,
          // Add other apps here as they get database support
        };

        // Update localStorage cache
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        } catch (e) {
          console.error('Error caching app settings:', e);
        }

        return newState;
      });
    } catch (error) {
      console.error('Error loading app settings from database:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load from database when user changes
  useEffect(() => {
    loadAppsFromDatabase();
  }, [loadAppsFromDatabase]);

  const isAppEnabled = (appId: string): boolean => {
    return enabledApps[appId] ?? false;
  };

  const toggleApp = async (appId: string) => {
    const newValue = !enabledApps[appId];

    // Update local state immediately
    setEnabledApps(prev => ({
      ...prev,
      [appId]: newValue,
    }));

    // Update localStorage cache
    try {
      const newState = { ...enabledApps, [appId]: newValue };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Error caching app settings:', e);
    }

    // Persist to database
    if (user?.id && appId === 'pos') {
      try {
        if (newValue) {
          // When enabling POS, mark setup as completed
          await posService.savePOSSettings({
            merchant_id: user.id,
            setup_completed: true,
          });
        } else {
          // When disabling POS, mark setup as not completed
          await posService.savePOSSettings({
            merchant_id: user.id,
            setup_completed: false,
          });
        }
      } catch (error) {
        console.error('Error saving app state to database:', error);
        // Revert local state on error
        setEnabledApps(prev => ({
          ...prev,
          [appId]: !newValue,
        }));
      }
    }
  };

  const enableApp = async (appId: string) => {
    // Update local state immediately
    setEnabledApps(prev => ({
      ...prev,
      [appId]: true,
    }));

    // Update localStorage cache
    try {
      const newState = { ...enabledApps, [appId]: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Error caching app settings:', e);
    }

    // Persist to database
    if (user?.id && appId === 'pos') {
      try {
        await posService.savePOSSettings({
          merchant_id: user.id,
          setup_completed: true,
        });
      } catch (error) {
        console.error('Error enabling app in database:', error);
      }
    }
  };

  const disableApp = async (appId: string) => {
    // Update local state immediately
    setEnabledApps(prev => ({
      ...prev,
      [appId]: false,
    }));

    // Update localStorage cache
    try {
      const newState = { ...enabledApps, [appId]: false };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Error caching app settings:', e);
    }

    // Persist to database
    if (user?.id && appId === 'pos') {
      try {
        await posService.savePOSSettings({
          merchant_id: user.id,
          setup_completed: false,
        });
      } catch (error) {
        console.error('Error disabling app in database:', error);
      }
    }
  };

  return (
    <AppsContext.Provider
      value={{
        enabledApps,
        isAppEnabled,
        toggleApp,
        enableApp,
        disableApp,
        isLoading,
        refreshApps: loadAppsFromDatabase,
      }}
    >
      {children}
    </AppsContext.Provider>
  );
}

export function useApps() {
  const context = useContext(AppsContext);
  if (context === undefined) {
    throw new Error('useApps must be used within an AppsProvider');
  }
  return context;
}

export default AppsContext;
