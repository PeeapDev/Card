/**
 * User Apps Context
 *
 * Manages app settings for regular users (not merchants).
 * Allows users to enable/disable apps like Events, Cash Box, etc.
 *
 * Storage: Supabase (primary) + IndexedDB (offline cache)
 * NO localStorage usage
 */

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import {
  userSettingsService,
  type UserAppsSettings,
  type CashBoxSetupData,
} from '@/services/userSettings.service';

// Default apps - all disabled by default
const DEFAULT_USER_APPS = {
  events: false,
  cashbox: false,
  school_utilities: false,
};

interface UserAppsContextType {
  enabledApps: Record<string, boolean>;
  isAppEnabled: (appId: string) => boolean;
  enableApp: (appId: string) => Promise<void>;
  disableApp: (appId: string) => Promise<void>;
  toggleApp: (appId: string) => Promise<void>;
  isLoading: boolean;
  hasLoadedFromDB: boolean;
  refreshApps: () => Promise<void>;
  // Cash Box specific
  isCashBoxSetupCompleted: () => boolean;
  completeCashBoxSetup: (setupData: CashBoxSetupData) => Promise<void>;
  cashBoxSettings: {
    autoDepositEnabled: boolean;
    autoDepositWalletId: string | null;
    autoDepositAmount: number | null;
    autoDepositFrequency: 'daily' | 'weekly' | 'monthly';
  } | null;
}

const UserAppsContext = createContext<UserAppsContextType | undefined>(undefined);

interface UserAppsProviderProps {
  children: ReactNode;
}

export function UserAppsProvider({ children }: UserAppsProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [enabledApps, setEnabledApps] = useState<Record<string, boolean>>(DEFAULT_USER_APPS);
  const [appsSettings, setAppsSettings] = useState<UserAppsSettings | null>(null);

  // Load app settings from database (via service)
  const loadAppsFromDatabase = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Get user's app settings from the service
      const settings = await userSettingsService.getUserAppsSettings(user.id);

      setAppsSettings(settings);
      setEnabledApps({
        events: settings.events_enabled,
        // Cash Box is only enabled if setup is completed
        cashbox: settings.cashbox_enabled && settings.cashbox_setup_completed,
        // School Utilities
        school_utilities: settings.school_utilities_enabled,
      });

      setHasLoadedFromDB(true);
    } catch (error) {
      console.error('Error loading user app settings:', error);
      // Service handles IndexedDB fallback internally
      setHasLoadedFromDB(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load from database when user changes
  useEffect(() => {
    if (authLoading) return;
    loadAppsFromDatabase();
  }, [loadAppsFromDatabase, authLoading]);

  // Check if an app is enabled
  const isAppEnabled = useCallback((appId: string): boolean => {
    return enabledApps[appId] ?? false;
  }, [enabledApps]);

  // Check if Cash Box setup is completed
  const isCashBoxSetupCompleted = useCallback((): boolean => {
    return appsSettings?.cashbox_setup_completed ?? false;
  }, [appsSettings]);

  // Enable an app
  const enableApp = useCallback(async (appId: string) => {
    if (!user?.id) return;

    try {
      await userSettingsService.enableApp(user.id, appId as 'events' | 'cashbox' | 'school_utilities');

      // If enabling cashbox without setup, don't set enabled state yet
      // The setup wizard will complete the process
      if (appId === 'cashbox' && !appsSettings?.cashbox_setup_completed) {
        // Just mark as enabled in DB, wizard will complete setup
        setAppsSettings(prev => prev ? {
          ...prev,
          cashbox_enabled: true,
        } : null);
      } else {
        setEnabledApps(prev => ({ ...prev, [appId]: true }));
        await loadAppsFromDatabase(); // Refresh to get latest state
      }
    } catch (error) {
      console.error('Error enabling app:', error);
      throw error;
    }
  }, [user?.id, appsSettings, loadAppsFromDatabase]);

  // Disable an app
  const disableApp = useCallback(async (appId: string) => {
    if (!user?.id) return;

    try {
      await userSettingsService.disableApp(user.id, appId as 'events' | 'cashbox' | 'school_utilities');

      setEnabledApps(prev => ({ ...prev, [appId]: false }));

      if (appId === 'cashbox') {
        setAppsSettings(prev => prev ? {
          ...prev,
          cashbox_enabled: false,
          cashbox_setup_completed: false,
        } : null);
      } else if (appId === 'school_utilities') {
        setAppsSettings(prev => prev ? {
          ...prev,
          school_utilities_enabled: false,
          school_utilities_setup_completed: false,
        } : null);
      }
    } catch (error) {
      console.error('Error disabling app:', error);
      throw error;
    }
  }, [user?.id]);

  // Toggle an app
  const toggleApp = useCallback(async (appId: string) => {
    if (enabledApps[appId]) {
      await disableApp(appId);
    } else {
      await enableApp(appId);
    }
  }, [enabledApps, enableApp, disableApp]);

  // Complete Cash Box setup
  const completeCashBoxSetup = useCallback(async (setupData: CashBoxSetupData) => {
    if (!user?.id) return;

    try {
      await userSettingsService.completeCashBoxSetup(user.id, setupData);

      // Update local state (including PIN lock fields)
      setAppsSettings(prev => prev ? {
        ...prev,
        cashbox_enabled: true,
        cashbox_setup_completed: true,
        cashbox_auto_deposit_enabled: setupData.auto_deposit_enabled,
        cashbox_auto_deposit_wallet_id: setupData.auto_deposit_wallet_id,
        cashbox_auto_deposit_amount: setupData.auto_deposit_amount,
        cashbox_auto_deposit_frequency: setupData.auto_deposit_frequency,
        cashbox_pin_lock_enabled: setupData.pin_lock_enabled,
        cashbox_pin_hash: setupData.pin_hash,
      } : null);

      setEnabledApps(prev => ({ ...prev, cashbox: true }));
    } catch (error) {
      console.error('Error completing Cash Box setup:', error);
      throw error;
    }
  }, [user?.id]);

  // Cash Box settings for display
  const cashBoxSettings = appsSettings ? {
    autoDepositEnabled: appsSettings.cashbox_auto_deposit_enabled,
    autoDepositWalletId: appsSettings.cashbox_auto_deposit_wallet_id,
    autoDepositAmount: appsSettings.cashbox_auto_deposit_amount,
    autoDepositFrequency: appsSettings.cashbox_auto_deposit_frequency,
  } : null;

  return (
    <UserAppsContext.Provider
      value={{
        enabledApps,
        isAppEnabled,
        enableApp,
        disableApp,
        toggleApp,
        isLoading,
        hasLoadedFromDB,
        refreshApps: loadAppsFromDatabase,
        isCashBoxSetupCompleted,
        completeCashBoxSetup,
        cashBoxSettings,
      }}
    >
      {children}
    </UserAppsContext.Provider>
  );
}

export function useUserApps() {
  const context = useContext(UserAppsContext);
  if (context === undefined) {
    throw new Error('useUserApps must be used within a UserAppsProvider');
  }
  return context;
}
