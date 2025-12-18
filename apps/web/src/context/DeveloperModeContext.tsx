import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { sessionService } from '@/services/session.service';

interface DeveloperModeContextType {
  isDeveloperMode: boolean;
  toggleDeveloperMode: () => void;
  setDeveloperMode: (enabled: boolean) => void;
  hasBusinesses: boolean;
  businessCount: number;
  checkBusinesses: () => Promise<void>;
  isSaving: boolean;
}

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

export function DeveloperModeProvider({ children }: { children: ReactNode }) {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [hasBusinesses, setHasBusinesses] = useState(false);
  const [businessCount, setBusinessCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const isInitialLoad = useRef(true);

  // Get user ID from session on mount and load developer mode from database
  useEffect(() => {
    const initUser = async () => {
      const user = await sessionService.validateSession();
      if (user) {
        setUserId(user.id);

        // First, check localStorage for instant UI (cached value)
        const cached = localStorage.getItem(`developerMode_${user.id}`);
        if (cached === 'true') {
          setIsDeveloperMode(true);
        }

        // Then load from database (source of truth)
        try {
          const { data, error } = await supabase
            .from('users')
            .select('developer_mode_enabled')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            const dbValue = data.developer_mode_enabled === true;
            setIsDeveloperMode(dbValue);
            // Update localStorage cache
            localStorage.setItem(`developerMode_${user.id}`, String(dbValue));
          }
        } catch (err) {
          console.error('Error loading developer mode from database:', err);
        }

        isInitialLoad.current = false;
      } else {
        setUserId(null);
        setIsDeveloperMode(false);
        setHasBusinesses(false);
        setBusinessCount(0);
        isInitialLoad.current = false;
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

  // Save developer mode setting to database when it changes
  useEffect(() => {
    // Skip saving during initial load
    if (isInitialLoad.current || !userId) return;

    const saveToDB = async () => {
      setIsSaving(true);
      try {
        // Save to localStorage for instant cache
        localStorage.setItem(`developerMode_${userId}`, String(isDeveloperMode));

        // Save to database (source of truth)
        const { error } = await supabase
          .from('users')
          .update({ developer_mode_enabled: isDeveloperMode })
          .eq('id', userId);

        if (error) {
          console.error('Error saving developer mode to database:', error);
        }
      } catch (err) {
        console.error('Error saving developer mode:', err);
      } finally {
        setIsSaving(false);
      }
    };

    saveToDB();
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
      checkBusinesses,
      isSaving
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
