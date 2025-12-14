/**
 * Apps Context
 *
 * Manages enabled/disabled state for merchant apps
 * Stores state in localStorage and syncs across components
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  const [enabledApps, setEnabledApps] = useState<Record<string, boolean>>(() => {
    // Load from localStorage on init
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return { ...DEFAULT_APPS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Error loading app settings:', error);
    }
    return DEFAULT_APPS;
  });

  // Save to localStorage when state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enabledApps));
    } catch (error) {
      console.error('Error saving app settings:', error);
    }
  }, [enabledApps]);

  const isAppEnabled = (appId: string): boolean => {
    return enabledApps[appId] ?? false;
  };

  const toggleApp = (appId: string) => {
    setEnabledApps(prev => ({
      ...prev,
      [appId]: !prev[appId],
    }));
  };

  const enableApp = (appId: string) => {
    setEnabledApps(prev => ({
      ...prev,
      [appId]: true,
    }));
  };

  const disableApp = (appId: string) => {
    setEnabledApps(prev => ({
      ...prev,
      [appId]: false,
    }));
  };

  return (
    <AppsContext.Provider
      value={{
        enabledApps,
        isAppEnabled,
        toggleApp,
        enableApp,
        disableApp,
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
