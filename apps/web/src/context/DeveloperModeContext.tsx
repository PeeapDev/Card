import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { sessionService } from '@/services/session.service';

interface DeveloperModeContextType {
  isDeveloperMode: boolean;
  toggleDeveloperMode: () => void;
  setDeveloperMode: (enabled: boolean) => void;
  hasBusinesses: boolean;
  businessCount: number;
  checkBusinesses: () => Promise<void>;
}

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

// Get user ID from session token (secure cookie)
const getUserIdFromToken = (): string | null => {
  const accessToken = sessionService.getSessionToken();
  if (!accessToken) return null;
  try {
    const payload = JSON.parse(atob(accessToken));
    return payload.userId || null;
  } catch {
    return null;
  }
};

export function DeveloperModeProvider({ children }: { children: ReactNode }) {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [hasBusinesses, setHasBusinesses] = useState(false);
  const [businessCount, setBusinessCount] = useState(0);

  // Load developer mode setting per user
  useEffect(() => {
    const userId = getUserIdFromToken();
    if (userId) {
      const stored = localStorage.getItem(`developerMode_${userId}`);
      // Auto-enable if user previously enabled it
      if (stored === 'true') {
        setIsDeveloperMode(true);
      }
      // Check if user has any businesses (auto-enable developer mode if they do)
      checkBusinesses();
    } else {
      // No user logged in, reset
      setIsDeveloperMode(false);
      setHasBusinesses(false);
      setBusinessCount(0);
    }
  }, []);

  // Save developer mode setting when it changes
  useEffect(() => {
    const userId = getUserIdFromToken();
    if (userId) {
      localStorage.setItem(`developerMode_${userId}`, String(isDeveloperMode));
    }
  }, [isDeveloperMode]);

  // Check if user has businesses (and auto-enable developer mode)
  const checkBusinesses = async () => {
    const userId = getUserIdFromToken();
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('merchant_businesses')
        .select('id')
        .eq('merchant_id', userId);

      if (error) {
        console.error('Error checking businesses:', error);
        return;
      }

      const count = data?.length || 0;
      setBusinessCount(count);
      setHasBusinesses(count > 0);

      // Auto-enable developer mode if user has businesses
      if (count > 0) {
        setIsDeveloperMode(true);
      }
    } catch (err) {
      console.error('Error checking businesses:', err);
    }
  };

  const toggleDeveloperMode = () => {
    setIsDeveloperMode(prev => !prev);
  };

  const setDeveloperMode = (enabled: boolean) => {
    setIsDeveloperMode(enabled);
  };

  return (
    <DeveloperModeContext.Provider value={{
      isDeveloperMode,
      toggleDeveloperMode,
      setDeveloperMode,
      hasBusinesses,
      businessCount,
      checkBusinesses
    }}>
      {children}
    </DeveloperModeContext.Provider>
  );
}

export function useDeveloperMode() {
  const context = useContext(DeveloperModeContext);
  if (context === undefined) {
    throw new Error('useDeveloperMode must be used within a DeveloperModeProvider');
  }
  return context;
}
