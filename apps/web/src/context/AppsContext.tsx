/**
 * Apps Context
 *
 * Manages enabled/disabled state for merchant apps
 * Persists all state to database - NO localStorage
 */

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

export interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  setup_completed: boolean;
  wallet_id?: string;
  settings?: Record<string, any>;
}

interface AppsContextType {
  enabledApps: Record<string, boolean>;
  appConfigs: Record<string, AppConfig>;
  isAppEnabled: (appId: string) => boolean;
  isAppSetupComplete: (appId: string) => boolean;
  toggleApp: (appId: string) => Promise<boolean>; // Returns true if setup wizard should be shown
  enableApp: (appId: string, setupComplete?: boolean) => Promise<void>;
  disableApp: (appId: string) => Promise<void>;
  completeAppSetup: (appId: string, walletId?: string, settings?: Record<string, any>) => Promise<void>;
  isLoading: boolean;
  hasLoadedFromDB: boolean;
  refreshApps: () => Promise<void>;
}

const AppsContext = createContext<AppsContextType | undefined>(undefined);

// List of all available apps
const ALL_APPS = [
  'pos',
  'events',
  'terminal',
  'driver_wallet',
  'invoices',
  'payment_links',
  'fuel_station',
  'transportation',
];

interface AppsProviderProps {
  children: ReactNode;
}

export function AppsProvider({ children }: AppsProviderProps) {
  const { user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedFromDB, setHasLoadedFromDB] = useState(false);
  const [enabledApps, setEnabledApps] = useState<Record<string, boolean>>({});
  const [appConfigs, setAppConfigs] = useState<Record<string, AppConfig>>({});

  // Load app states from database
  const loadAppsFromDatabase = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const merchantId = user.id;

      // Fetch all app settings for this merchant
      const { data: appSettings, error } = await supabase
        .from('merchant_app_settings')
        .select('*')
        .eq('merchant_id', merchantId);

      if (error) {
        console.error('Error loading app settings:', error);
        setHasLoadedFromDB(true);
        setIsLoading(false);
        return;
      }

      // Build enabled apps map and configs
      const enabled: Record<string, boolean> = {};
      const configs: Record<string, AppConfig> = {};

      // Initialize all apps as disabled
      ALL_APPS.forEach(appId => {
        enabled[appId] = false;
        configs[appId] = {
          id: appId,
          name: appId,
          enabled: false,
          setup_completed: false,
        };
      });

      // Override with database values
      if (appSettings) {
        appSettings.forEach((setting: any) => {
          enabled[setting.app_id] = setting.enabled;
          configs[setting.app_id] = {
            id: setting.app_id,
            name: setting.app_id,
            enabled: setting.enabled,
            setup_completed: setting.setup_completed,
            wallet_id: setting.wallet_id,
            settings: setting.settings,
          };
        });
      }

      setEnabledApps(enabled);
      setAppConfigs(configs);
      setHasLoadedFromDB(true);
    } catch (error) {
      console.error('Error loading app settings from database:', error);
      setHasLoadedFromDB(true);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Load from database when user changes and auth is done loading
  useEffect(() => {
    if (authLoading) {
      return;
    }
    loadAppsFromDatabase();
  }, [loadAppsFromDatabase, authLoading]);

  const isAppEnabled = (appId: string): boolean => {
    return enabledApps[appId] ?? false;
  };

  const isAppSetupComplete = (appId: string): boolean => {
    return appConfigs[appId]?.setup_completed ?? false;
  };

  // Toggle app - returns true if setup wizard should be shown (first time enabling)
  const toggleApp = async (appId: string): Promise<boolean> => {
    const currentlyEnabled = enabledApps[appId];
    const setupComplete = appConfigs[appId]?.setup_completed ?? false;

    if (currentlyEnabled) {
      // Disabling - just disable, no wizard needed
      await disableApp(appId);
      return false;
    } else {
      // Enabling - check if setup is complete
      await enableApp(appId, setupComplete);
      // Return true to show setup wizard if setup not complete
      return !setupComplete;
    }
  };

  const enableApp = async (appId: string, setupComplete: boolean = false) => {
    if (!user?.id) return;

    // Update local state immediately
    setEnabledApps(prev => ({
      ...prev,
      [appId]: true,
    }));
    setAppConfigs(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        id: appId,
        name: appId,
        enabled: true,
        setup_completed: setupComplete,
      },
    }));

    // Persist to database
    try {
      const { error } = await supabase
        .from('merchant_app_settings')
        .upsert({
          merchant_id: user.id,
          app_id: appId,
          enabled: true,
          setup_completed: setupComplete,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'merchant_id,app_id',
        });

      if (error) {
        console.error('Error enabling app in database:', error);
        // Revert local state on error
        setEnabledApps(prev => ({
          ...prev,
          [appId]: false,
        }));
      }
    } catch (error) {
      console.error('Error enabling app:', error);
    }
  };

  const disableApp = async (appId: string) => {
    if (!user?.id) return;

    // Update local state immediately
    setEnabledApps(prev => ({
      ...prev,
      [appId]: false,
    }));
    setAppConfigs(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        enabled: false,
      },
    }));

    // Persist to database
    try {
      const { error } = await supabase
        .from('merchant_app_settings')
        .upsert({
          merchant_id: user.id,
          app_id: appId,
          enabled: false,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'merchant_id,app_id',
        });

      if (error) {
        console.error('Error disabling app in database:', error);
        // Revert local state on error
        setEnabledApps(prev => ({
          ...prev,
          [appId]: true,
        }));
      }
    } catch (error) {
      console.error('Error disabling app:', error);
    }
  };

  // Complete app setup - called when setup wizard finishes
  const completeAppSetup = async (appId: string, walletId?: string, settings?: Record<string, any>) => {
    if (!user?.id) return;

    // Update local state
    setAppConfigs(prev => ({
      ...prev,
      [appId]: {
        ...prev[appId],
        setup_completed: true,
        wallet_id: walletId,
        settings: settings,
      },
    }));

    // Persist to database
    try {
      const updateData: any = {
        merchant_id: user.id,
        app_id: appId,
        enabled: true,
        setup_completed: true,
        updated_at: new Date().toISOString(),
      };

      if (walletId) {
        updateData.wallet_id = walletId;
      }

      if (settings) {
        updateData.settings = settings;
      }

      const { error } = await supabase
        .from('merchant_app_settings')
        .upsert(updateData, {
          onConflict: 'merchant_id,app_id',
        });

      if (error) {
        console.error('Error completing app setup:', error);
      }
    } catch (error) {
      console.error('Error completing app setup:', error);
    }
  };

  return (
    <AppsContext.Provider
      value={{
        enabledApps,
        appConfigs,
        isAppEnabled,
        isAppSetupComplete,
        toggleApp,
        enableApp,
        disableApp,
        completeAppSetup,
        isLoading,
        hasLoadedFromDB,
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
