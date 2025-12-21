/**
 * User Settings Service
 *
 * Manages user app settings and payment preferences.
 * Primary storage: Supabase
 * Offline cache: IndexedDB
 *
 * NO localStorage usage - all persistence is via Supabase + IndexedDB
 */

import { supabaseAdmin } from '@/lib/supabase';
import { indexedDBService } from './indexeddb.service';

// Note: We use supabaseAdmin because this app uses custom JWT auth,
// not Supabase Auth. auth.uid() returns NULL, so RLS policies fail.
// The app handles authorization by verifying user.id matches the resource owner.

// ================== Types ==================

export interface UserAppsSettings {
  id?: string;
  user_id: string;
  events_enabled: boolean;
  cashbox_enabled: boolean;
  cashbox_setup_completed: boolean;
  cashbox_auto_deposit_enabled: boolean;
  cashbox_auto_deposit_wallet_id: string | null;
  cashbox_auto_deposit_amount: number | null;
  cashbox_auto_deposit_frequency: 'daily' | 'weekly' | 'monthly';
  cashbox_pin_lock_enabled: boolean;
  cashbox_pin_hash: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface UserPaymentPreferences {
  id?: string;
  user_id: string;
  default_wallet_id: string | null;
  default_currency: string;
  auto_convert_currency: boolean;
  show_balance_on_home: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CashBoxSetupData {
  auto_deposit_enabled: boolean;
  auto_deposit_wallet_id: string | null;
  auto_deposit_amount: number | null;
  auto_deposit_frequency: 'daily' | 'weekly' | 'monthly';
  pin_lock_enabled: boolean;
  pin_hash: string | null;
}

// Default values
const DEFAULT_USER_APPS_SETTINGS: Omit<UserAppsSettings, 'user_id'> = {
  events_enabled: false,
  cashbox_enabled: false,
  cashbox_setup_completed: false,
  cashbox_auto_deposit_enabled: false,
  cashbox_auto_deposit_wallet_id: null,
  cashbox_auto_deposit_amount: null,
  cashbox_auto_deposit_frequency: 'monthly',
  cashbox_pin_lock_enabled: false,
  cashbox_pin_hash: null,
};

const DEFAULT_PAYMENT_PREFERENCES: Omit<UserPaymentPreferences, 'user_id'> = {
  default_wallet_id: null,
  default_currency: 'SLE',
  auto_convert_currency: false,
  show_balance_on_home: true,
};

// IndexedDB cache keys
const CACHE_KEYS = {
  USER_APPS_SETTINGS: 'user_apps_settings',
  PAYMENT_PREFERENCES: 'user_payment_preferences',
};

// ================== User Apps Settings ==================

/**
 * Get user apps settings from Supabase, cache to IndexedDB
 */
export const getUserAppsSettings = async (userId: string): Promise<UserAppsSettings> => {
  try {
    // Try to get from Supabase first
    const { data, error } = await supabaseAdmin
      .from('user_apps_settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(); // Use maybeSingle to avoid 406 error when no rows exist

    if (error) {
      // Silently fall back to IndexedDB cache
      return getCachedAppsSettings(userId);
    }

    if (data) {
      // Map DB fields to interface
      const settings: UserAppsSettings = {
        id: data.id,
        user_id: data.user_id,
        events_enabled: data.events_enabled ?? false,
        cashbox_enabled: data.cashbox_enabled ?? false,
        cashbox_setup_completed: data.cashbox_setup_completed ?? false,
        cashbox_auto_deposit_enabled: data.cashbox_auto_deposit_enabled ?? false,
        cashbox_auto_deposit_wallet_id: data.cashbox_auto_deposit_wallet_id,
        cashbox_auto_deposit_amount: data.cashbox_auto_deposit_amount,
        cashbox_auto_deposit_frequency: data.cashbox_auto_deposit_frequency ?? 'monthly',
        cashbox_pin_lock_enabled: data.cashbox_pin_lock_enabled ?? false,
        cashbox_pin_hash: data.cashbox_pin_hash ?? null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Cache to IndexedDB
      await cacheAppsSettings(settings);
      return settings;
    }

    // No data found, return defaults (will be created on first update)
    return {
      ...DEFAULT_USER_APPS_SETTINGS,
      user_id: userId,
    };
  } catch (error) {
    console.error('Error in getUserAppsSettings:', error);
    return getCachedAppsSettings(userId);
  }
};

/**
 * Update user apps settings in Supabase and IndexedDB
 */
export const updateUserAppsSettings = async (
  userId: string,
  updates: Partial<Omit<UserAppsSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserAppsSettings> => {
  try {
    // Map interface fields to DB columns
    const dbUpdates: Record<string, unknown> = {};
    if (updates.events_enabled !== undefined) dbUpdates.events_enabled = updates.events_enabled;
    if (updates.cashbox_enabled !== undefined) dbUpdates.cashbox_enabled = updates.cashbox_enabled;
    if (updates.cashbox_setup_completed !== undefined) dbUpdates.cashbox_setup_completed = updates.cashbox_setup_completed;
    if (updates.cashbox_auto_deposit_enabled !== undefined) dbUpdates.cashbox_auto_deposit_enabled = updates.cashbox_auto_deposit_enabled;
    if (updates.cashbox_auto_deposit_wallet_id !== undefined) dbUpdates.cashbox_auto_deposit_wallet_id = updates.cashbox_auto_deposit_wallet_id;
    if (updates.cashbox_auto_deposit_amount !== undefined) dbUpdates.cashbox_auto_deposit_amount = updates.cashbox_auto_deposit_amount;
    if (updates.cashbox_auto_deposit_frequency !== undefined) dbUpdates.cashbox_auto_deposit_frequency = updates.cashbox_auto_deposit_frequency;
    if (updates.cashbox_pin_lock_enabled !== undefined) dbUpdates.cashbox_pin_lock_enabled = updates.cashbox_pin_lock_enabled;
    if (updates.cashbox_pin_hash !== undefined) dbUpdates.cashbox_pin_hash = updates.cashbox_pin_hash;

    // Upsert to Supabase
    const { data, error } = await supabaseAdmin
      .from('user_apps_settings')
      .upsert(
        {
          user_id: userId,
          ...dbUpdates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating user apps settings:', error);
      throw error;
    }

    // Map response to interface
    const settings: UserAppsSettings = {
      id: data.id,
      user_id: data.user_id,
      events_enabled: data.events_enabled ?? false,
      cashbox_enabled: data.cashbox_enabled ?? false,
      cashbox_setup_completed: data.cashbox_setup_completed ?? false,
      cashbox_auto_deposit_enabled: data.cashbox_auto_deposit_enabled ?? false,
      cashbox_auto_deposit_wallet_id: data.cashbox_auto_deposit_wallet_id,
      cashbox_auto_deposit_amount: data.cashbox_auto_deposit_amount,
      cashbox_auto_deposit_frequency: data.cashbox_auto_deposit_frequency ?? 'monthly',
      cashbox_pin_lock_enabled: data.cashbox_pin_lock_enabled ?? false,
      cashbox_pin_hash: data.cashbox_pin_hash ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // Cache to IndexedDB
    await cacheAppsSettings(settings);
    return settings;
  } catch (error) {
    console.error('Error in updateUserAppsSettings:', error);
    throw error;
  }
};

/**
 * Enable a specific app
 */
export const enableApp = async (userId: string, appId: 'events' | 'cashbox'): Promise<void> => {
  const updates: Partial<UserAppsSettings> = {};
  if (appId === 'events') {
    updates.events_enabled = true;
  } else if (appId === 'cashbox') {
    updates.cashbox_enabled = true;
  }
  await updateUserAppsSettings(userId, updates);
};

/**
 * Disable a specific app
 */
export const disableApp = async (userId: string, appId: 'events' | 'cashbox'): Promise<void> => {
  const updates: Partial<UserAppsSettings> = {};
  if (appId === 'events') {
    updates.events_enabled = false;
  } else if (appId === 'cashbox') {
    updates.cashbox_enabled = false;
    updates.cashbox_setup_completed = false;
  }
  await updateUserAppsSettings(userId, updates);
};

/**
 * Complete Cash Box setup with auto-deposit and PIN lock configuration
 */
export const completeCashBoxSetup = async (userId: string, setupData: CashBoxSetupData): Promise<void> => {
  await updateUserAppsSettings(userId, {
    cashbox_enabled: true,
    cashbox_setup_completed: true,
    cashbox_auto_deposit_enabled: setupData.auto_deposit_enabled,
    cashbox_auto_deposit_wallet_id: setupData.auto_deposit_wallet_id,
    cashbox_auto_deposit_amount: setupData.auto_deposit_amount,
    cashbox_auto_deposit_frequency: setupData.auto_deposit_frequency,
    cashbox_pin_lock_enabled: setupData.pin_lock_enabled,
    cashbox_pin_hash: setupData.pin_hash,
  });
};

/**
 * Check if Cash Box setup is completed
 */
export const isCashBoxSetupCompleted = async (userId: string): Promise<boolean> => {
  const settings = await getUserAppsSettings(userId);
  return settings.cashbox_setup_completed;
};

/**
 * Check if an app is enabled
 */
export const isAppEnabled = async (userId: string, appId: 'events' | 'cashbox'): Promise<boolean> => {
  const settings = await getUserAppsSettings(userId);
  if (appId === 'events') {
    return settings.events_enabled;
  } else if (appId === 'cashbox') {
    return settings.cashbox_enabled && settings.cashbox_setup_completed;
  }
  return false;
};

// ================== Payment Preferences ==================

/**
 * Get user payment preferences from Supabase, cache to IndexedDB
 */
export const getPaymentPreferences = async (userId: string): Promise<UserPaymentPreferences> => {
  try {
    // Try to get from Supabase first
    const { data, error } = await supabaseAdmin
      .from('user_payment_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching payment preferences:', error);
      // Fall back to IndexedDB cache
      return getCachedPaymentPreferences(userId);
    }

    if (data) {
      const preferences: UserPaymentPreferences = {
        id: data.id,
        user_id: data.user_id,
        default_wallet_id: data.default_wallet_id,
        default_currency: data.default_currency ?? 'SLE',
        auto_convert_currency: data.auto_convert_currency ?? false,
        show_balance_on_home: data.show_balance_on_home ?? true,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Cache to IndexedDB
      await cachePaymentPreferences(preferences);
      return preferences;
    }

    // No data found, return defaults
    return {
      ...DEFAULT_PAYMENT_PREFERENCES,
      user_id: userId,
    };
  } catch (error) {
    console.error('Error in getPaymentPreferences:', error);
    return getCachedPaymentPreferences(userId);
  }
};

/**
 * Update user payment preferences in Supabase and IndexedDB
 */
export const updatePaymentPreferences = async (
  userId: string,
  updates: Partial<Omit<UserPaymentPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
): Promise<UserPaymentPreferences> => {
  try {
    const { data, error } = await supabaseAdmin
      .from('user_payment_preferences')
      .upsert(
        {
          user_id: userId,
          ...updates,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Error updating payment preferences:', error);
      throw error;
    }

    const preferences: UserPaymentPreferences = {
      id: data.id,
      user_id: data.user_id,
      default_wallet_id: data.default_wallet_id,
      default_currency: data.default_currency ?? 'SLE',
      auto_convert_currency: data.auto_convert_currency ?? false,
      show_balance_on_home: data.show_balance_on_home ?? true,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    // Cache to IndexedDB
    await cachePaymentPreferences(preferences);
    return preferences;
  } catch (error) {
    console.error('Error in updatePaymentPreferences:', error);
    throw error;
  }
};

// ================== IndexedDB Caching ==================

/**
 * Cache apps settings to IndexedDB
 */
const cacheAppsSettings = async (settings: UserAppsSettings): Promise<void> => {
  try {
    await indexedDBService.saveSetting(`${CACHE_KEYS.USER_APPS_SETTINGS}_${settings.user_id}`, settings);
  } catch (error) {
    console.warn('Failed to cache apps settings to IndexedDB:', error);
  }
};

/**
 * Get cached apps settings from IndexedDB
 */
const getCachedAppsSettings = async (userId: string): Promise<UserAppsSettings> => {
  try {
    const cached = await indexedDBService.getSetting<UserAppsSettings>(`${CACHE_KEYS.USER_APPS_SETTINGS}_${userId}`);
    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn('Failed to get cached apps settings:', error);
  }
  return {
    ...DEFAULT_USER_APPS_SETTINGS,
    user_id: userId,
  };
};

/**
 * Cache payment preferences to IndexedDB
 */
const cachePaymentPreferences = async (preferences: UserPaymentPreferences): Promise<void> => {
  try {
    await indexedDBService.saveSetting(`${CACHE_KEYS.PAYMENT_PREFERENCES}_${preferences.user_id}`, preferences);
  } catch (error) {
    console.warn('Failed to cache payment preferences to IndexedDB:', error);
  }
};

/**
 * Get cached payment preferences from IndexedDB
 */
const getCachedPaymentPreferences = async (userId: string): Promise<UserPaymentPreferences> => {
  try {
    const cached = await indexedDBService.getSetting<UserPaymentPreferences>(`${CACHE_KEYS.PAYMENT_PREFERENCES}_${userId}`);
    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn('Failed to get cached payment preferences:', error);
  }
  return {
    ...DEFAULT_PAYMENT_PREFERENCES,
    user_id: userId,
  };
};

/**
 * Clear all cached settings for a user
 */
export const clearUserSettingsCache = async (userId: string): Promise<void> => {
  try {
    await indexedDBService.saveSetting(`${CACHE_KEYS.USER_APPS_SETTINGS}_${userId}`, null);
    await indexedDBService.saveSetting(`${CACHE_KEYS.PAYMENT_PREFERENCES}_${userId}`, null);
  } catch (error) {
    console.warn('Failed to clear user settings cache:', error);
  }
};

// ================== Export Service ==================

export const userSettingsService = {
  // Apps Settings
  getUserAppsSettings,
  updateUserAppsSettings,
  enableApp,
  disableApp,
  isAppEnabled,
  // Cash Box specific
  completeCashBoxSetup,
  isCashBoxSetupCompleted,
  // Payment Preferences
  getPaymentPreferences,
  updatePaymentPreferences,
  // Cache management
  clearUserSettingsCache,
};

export default userSettingsService;
