/**
 * Theme Color Context
 *
 * Manages user's preferred color theme for cards and UI elements.
 * Stores preference in localStorage and optionally syncs to database.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CardColorTheme, getThemeColors, useCardTheme as useCardThemeUtil } from '@/components/ui/Card';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

interface ThemeColorContextType {
  colorTheme: CardColorTheme;
  setColorTheme: (theme: CardColorTheme) => void;
  merchantColorTheme: CardColorTheme;
  setMerchantColorTheme: (theme: CardColorTheme) => void;
  getTheme: (isActive?: boolean) => ReturnType<typeof useCardThemeUtil>;
  getMerchantTheme: (isActive?: boolean) => ReturnType<typeof useCardThemeUtil>;
  availableThemes: CardColorTheme[];
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

// Storage keys
const USER_THEME_KEY = 'user_color_theme';
const MERCHANT_THEME_KEY = 'merchant_color_theme';

// All available themes
const availableThemes: CardColorTheme[] = [
  'green', 'blue', 'purple', 'orange', 'cyan', 'pink', 'amber', 'red', 'indigo', 'teal', 'gray'
];

// Theme display names
export const themeDisplayNames: Record<CardColorTheme, string> = {
  green: 'Green',
  blue: 'Blue',
  purple: 'Purple',
  orange: 'Orange',
  cyan: 'Cyan',
  pink: 'Pink',
  amber: 'Amber',
  red: 'Red',
  indigo: 'Indigo',
  teal: 'Teal',
  gray: 'Gray',
};

interface ThemeColorProviderProps {
  children: ReactNode;
}

export function ThemeColorProvider({ children }: ThemeColorProviderProps) {
  const { user } = useAuth();

  // Load initial themes from localStorage
  const [colorTheme, setColorThemeState] = useState<CardColorTheme>(() => {
    try {
      const stored = localStorage.getItem(USER_THEME_KEY);
      return (stored as CardColorTheme) || 'blue';
    } catch {
      return 'blue';
    }
  });

  const [merchantColorTheme, setMerchantColorThemeState] = useState<CardColorTheme>(() => {
    try {
      const stored = localStorage.getItem(MERCHANT_THEME_KEY);
      return (stored as CardColorTheme) || 'green';
    } catch {
      return 'green';
    }
  });

  // Load theme from user preferences in database
  useEffect(() => {
    const loadUserTheme = async () => {
      if (!user?.id) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        if (!error && data?.preferences) {
          const prefs = typeof data.preferences === 'string'
            ? JSON.parse(data.preferences)
            : data.preferences;

          if (prefs.colorTheme && availableThemes.includes(prefs.colorTheme)) {
            setColorThemeState(prefs.colorTheme);
            localStorage.setItem(USER_THEME_KEY, prefs.colorTheme);
          }
          if (prefs.merchantColorTheme && availableThemes.includes(prefs.merchantColorTheme)) {
            setMerchantColorThemeState(prefs.merchantColorTheme);
            localStorage.setItem(MERCHANT_THEME_KEY, prefs.merchantColorTheme);
          }
        }
      } catch (err) {
        console.error('Error loading user theme preferences:', err);
      }
    };

    loadUserTheme();
  }, [user?.id]);

  // Set color theme and persist
  const setColorTheme = async (theme: CardColorTheme) => {
    setColorThemeState(theme);
    localStorage.setItem(USER_THEME_KEY, theme);

    // Save to database if user is logged in
    if (user?.id) {
      try {
        const { data: currentData } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        const currentPrefs = currentData?.preferences
          ? (typeof currentData.preferences === 'string'
              ? JSON.parse(currentData.preferences)
              : currentData.preferences)
          : {};

        await supabase
          .from('users')
          .update({
            preferences: { ...currentPrefs, colorTheme: theme }
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error saving color theme:', err);
      }
    }
  };

  // Set merchant color theme and persist
  const setMerchantColorTheme = async (theme: CardColorTheme) => {
    setMerchantColorThemeState(theme);
    localStorage.setItem(MERCHANT_THEME_KEY, theme);

    // Save to database if user is logged in
    if (user?.id) {
      try {
        const { data: currentData } = await supabase
          .from('users')
          .select('preferences')
          .eq('id', user.id)
          .single();

        const currentPrefs = currentData?.preferences
          ? (typeof currentData.preferences === 'string'
              ? JSON.parse(currentData.preferences)
              : currentData.preferences)
          : {};

        await supabase
          .from('users')
          .update({
            preferences: { ...currentPrefs, merchantColorTheme: theme }
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error saving merchant color theme:', err);
      }
    }
  };

  // Get theme colors for user dashboard
  const getTheme = (isActive: boolean = true) => {
    return useCardThemeUtil(colorTheme, isActive);
  };

  // Get theme colors for merchant dashboard
  const getMerchantTheme = (isActive: boolean = true) => {
    return useCardThemeUtil(merchantColorTheme, isActive);
  };

  return (
    <ThemeColorContext.Provider
      value={{
        colorTheme,
        setColorTheme,
        merchantColorTheme,
        setMerchantColorTheme,
        getTheme,
        getMerchantTheme,
        availableThemes,
      }}
    >
      {children}
    </ThemeColorContext.Provider>
  );
}

export function useThemeColor() {
  const context = useContext(ThemeColorContext);
  if (context === undefined) {
    throw new Error('useThemeColor must be used within a ThemeColorProvider');
  }
  return context;
}

// Hook to get current theme colors directly (for user dashboard)
export function useUserTheme(isActive: boolean = true) {
  const { colorTheme } = useThemeColor();
  return useCardThemeUtil(colorTheme, isActive);
}

// Hook to get current merchant theme colors directly
export function useMerchantTheme(isActive: boolean = true) {
  const { merchantColorTheme } = useThemeColor();
  return useCardThemeUtil(merchantColorTheme, isActive);
}
