/**
 * Theme Color Context
 *
 * Manages user's preferred color theme for cards and UI elements.
 * Also manages font preferences (type and size).
 * Stores preference in localStorage and optionally syncs to database.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CardColorTheme, getThemeColors, useCardTheme as useCardThemeUtil } from '@/components/ui/Card';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';

// Font types
export type FontFamily = 'system' | 'inter' | 'roboto' | 'poppins' | 'opensans' | 'lato' | 'montserrat' | 'nunito';
export type FontSize = 'small' | 'medium' | 'large';

// Font family CSS values
export const fontFamilyValues: Record<FontFamily, string> = {
  system: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  inter: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  roboto: '"Roboto", -apple-system, BlinkMacSystemFont, sans-serif',
  poppins: '"Poppins", -apple-system, BlinkMacSystemFont, sans-serif',
  opensans: '"Open Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  lato: '"Lato", -apple-system, BlinkMacSystemFont, sans-serif',
  montserrat: '"Montserrat", -apple-system, BlinkMacSystemFont, sans-serif',
  nunito: '"Nunito", -apple-system, BlinkMacSystemFont, sans-serif',
};

// Font size scale factors
export const fontSizeScale: Record<FontSize, number> = {
  small: 0.875,
  medium: 1,
  large: 1.125,
};

// Font display names
export const fontDisplayNames: Record<FontFamily, string> = {
  system: 'System Default',
  inter: 'Inter',
  roboto: 'Roboto',
  poppins: 'Poppins',
  opensans: 'Open Sans',
  lato: 'Lato',
  montserrat: 'Montserrat',
  nunito: 'Nunito',
};

// Glass/sidebar color values per theme
export const glassColors: Record<CardColorTheme, { bg: string; border: string; text: string }> = {
  green: { bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.2)', text: 'rgb(34, 197, 94)' },
  blue: { bg: 'rgba(59, 130, 246, 0.1)', border: 'rgba(59, 130, 246, 0.2)', text: 'rgb(59, 130, 246)' },
  purple: { bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.2)', text: 'rgb(168, 85, 247)' },
  orange: { bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.2)', text: 'rgb(249, 115, 22)' },
  cyan: { bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.2)', text: 'rgb(6, 182, 212)' },
  pink: { bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.2)', text: 'rgb(236, 72, 153)' },
  amber: { bg: 'rgba(245, 158, 11, 0.1)', border: 'rgba(245, 158, 11, 0.2)', text: 'rgb(245, 158, 11)' },
  red: { bg: 'rgba(239, 68, 68, 0.1)', border: 'rgba(239, 68, 68, 0.2)', text: 'rgb(239, 68, 68)' },
  indigo: { bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.2)', text: 'rgb(99, 102, 241)' },
  teal: { bg: 'rgba(20, 184, 166, 0.1)', border: 'rgba(20, 184, 166, 0.2)', text: 'rgb(20, 184, 166)' },
  gray: { bg: 'rgba(107, 114, 128, 0.1)', border: 'rgba(107, 114, 128, 0.2)', text: 'rgb(107, 114, 128)' },
};

interface ThemeColorContextType {
  colorTheme: CardColorTheme;
  setColorTheme: (theme: CardColorTheme) => void;
  merchantColorTheme: CardColorTheme;
  setMerchantColorTheme: (theme: CardColorTheme) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  getTheme: (isActive?: boolean) => ReturnType<typeof useCardThemeUtil>;
  getMerchantTheme: (isActive?: boolean) => ReturnType<typeof useCardThemeUtil>;
  getGlassColors: (type: 'user' | 'merchant') => { bg: string; border: string; text: string };
  availableThemes: CardColorTheme[];
  availableFonts: FontFamily[];
}

const ThemeColorContext = createContext<ThemeColorContextType | undefined>(undefined);

// Storage keys
const USER_THEME_KEY = 'user_color_theme';
const MERCHANT_THEME_KEY = 'merchant_color_theme';
const FONT_FAMILY_KEY = 'user_font_family';
const FONT_SIZE_KEY = 'user_font_size';

// Available fonts
const availableFonts: FontFamily[] = ['system', 'inter', 'roboto', 'poppins', 'opensans', 'lato', 'montserrat', 'nunito'];

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

  // Load initial font settings from localStorage
  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    try {
      const stored = localStorage.getItem(FONT_FAMILY_KEY);
      return (stored as FontFamily) || 'system';
    } catch {
      return 'system';
    }
  });

  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    try {
      const stored = localStorage.getItem(FONT_SIZE_KEY);
      return (stored as FontSize) || 'medium';
    } catch {
      return 'medium';
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
          if (prefs.fontFamily && availableFonts.includes(prefs.fontFamily)) {
            setFontFamilyState(prefs.fontFamily);
            localStorage.setItem(FONT_FAMILY_KEY, prefs.fontFamily);
          }
          if (prefs.fontSize && ['small', 'medium', 'large'].includes(prefs.fontSize)) {
            setFontSizeState(prefs.fontSize);
            localStorage.setItem(FONT_SIZE_KEY, prefs.fontSize);
          }
        }
      } catch (err) {
        console.error('Error loading user theme preferences:', err);
      }
    };

    loadUserTheme();
  }, [user?.id]);

  // Apply font settings to document
  useEffect(() => {
    document.documentElement.style.setProperty('--app-font-family', fontFamilyValues[fontFamily]);
    document.documentElement.style.setProperty('--app-font-scale', fontSizeScale[fontSize].toString());
    document.body.style.fontFamily = fontFamilyValues[fontFamily];
    document.body.style.fontSize = `${fontSizeScale[fontSize]}rem`;
  }, [fontFamily, fontSize]);

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

  // Set font family and persist
  const setFontFamily = async (font: FontFamily) => {
    setFontFamilyState(font);
    localStorage.setItem(FONT_FAMILY_KEY, font);

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
            preferences: { ...currentPrefs, fontFamily: font }
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error saving font family:', err);
      }
    }
  };

  // Set font size and persist
  const setFontSize = async (size: FontSize) => {
    setFontSizeState(size);
    localStorage.setItem(FONT_SIZE_KEY, size);

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
            preferences: { ...currentPrefs, fontSize: size }
          })
          .eq('id', user.id);
      } catch (err) {
        console.error('Error saving font size:', err);
      }
    }
  };

  // Get glass colors for themed glass effects
  const getGlassColors = (type: 'user' | 'merchant') => {
    const theme = type === 'user' ? colorTheme : merchantColorTheme;
    return glassColors[theme];
  };

  return (
    <ThemeColorContext.Provider
      value={{
        colorTheme,
        setColorTheme,
        merchantColorTheme,
        setMerchantColorTheme,
        fontFamily,
        setFontFamily,
        fontSize,
        setFontSize,
        getTheme,
        getMerchantTheme,
        getGlassColors,
        availableThemes,
        availableFonts,
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
