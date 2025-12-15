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

export function DeveloperModeProvider({ children }: { children: ReactNode }) {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [hasBusinesses, setHasBusinesses] = useState(false);
  const [businessCount, setBusinessCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  // Get user ID from session on mount
  useEffect(() => {
    const initUser = async () => {
      const user = await sessionService.validateSession();
      if (user) {
        setUserId(user.id);
        // Load stored developer mode preference
        const stored = localStorage.getItem(`developerMode_${user.id}`);
        if (stored === 'true') {
          setIsDeveloperMode(true);
        }
      } else {
        setUserId(null);
        setIsDeveloperMode(false);
        setHasBusinesses(false);
        setBusinessCount(0);
      }
    };
    initUser();
  }, []);

  // Check businesses when userId is set
  useEffect(() => {
    if (userId) {
      checkBusinesses();
    }
  }, [userId]);

  // Save developer mode setting when it changes
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`developerMode_${userId}`, String(isDeveloperMode));
    }
  }, [isDeveloperMode, userId]);

  // Check if user has businesses (and auto-enable developer mode)
  const checkBusinesses = async () => {
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
