import { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface DeveloperModeContextType {
  isDeveloperMode: boolean;
  toggleDeveloperMode: () => void;
  setDeveloperMode: (enabled: boolean) => void;
  hasBusinesses: boolean;
  businessCount: number;
  checkBusinesses: () => Promise<void>;
  isSaving: boolean;
  isLoading: boolean;
}

const DeveloperModeContext = createContext<DeveloperModeContextType | undefined>(undefined);

export function DeveloperModeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [hasBusinesses, setHasBusinesses] = useState(false);
  const [businessCount, setBusinessCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialLoad = useRef(true);
  const hasLoadedFromDB = useRef(false);
  const hasCheckedBusinesses = useRef(false);
  const lastUserId = useRef<string | null>(null);

  // Reset refs when user changes (different user logged in)
  useEffect(() => {
    if (user?.id && user.id !== lastUserId.current) {
      // New user logged in - reset refs
      hasLoadedFromDB.current = false;
      hasCheckedBusinesses.current = false;
      isInitialLoad.current = true;
      lastUserId.current = user.id;
    }
  }, [user?.id]);

  // Load developer mode from database when user changes
  useEffect(() => {
    const loadDeveloperMode = async () => {
      if (!user?.id) {
        // No user - just stop loading, don't reset mode (might be temporary)
        setIsLoading(false);
        return;
      }

      // Only load from DB once per user session
      if (hasLoadedFromDB.current) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('users')
          .select('developer_mode_enabled')
          .eq('id', user.id)
          .single();

        if (!error && data) {
          const dbValue = data.developer_mode_enabled === true;
          setIsDeveloperMode(dbValue);
          hasLoadedFromDB.current = true;
        }
      } catch (err) {
        console.error('Error loading developer mode from database:', err);
      } finally {
        isInitialLoad.current = false;
        setIsLoading(false);
      }
    };

    loadDeveloperMode();
  }, [user?.id]);

  // Check businesses when user is set
  useEffect(() => {
    if (user?.id && !hasCheckedBusinesses.current) {
      hasCheckedBusinesses.current = true;
      checkBusinesses();
    }
  }, [user?.id]);

  // Save developer mode setting to database when it changes
  useEffect(() => {
    // Skip saving during initial load or if no user
    if (isInitialLoad.current || !user?.id) return;

    const saveToDB = async () => {
      setIsSaving(true);
      try {
        // Save to database ONLY (no localStorage)
        const { error } = await supabase
          .from('users')
          .update({ developer_mode_enabled: isDeveloperMode })
          .eq('id', user.id);

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
  }, [isDeveloperMode, user?.id]);

  // Check if user has businesses (and auto-enable developer mode)
  const checkBusinesses = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('merchant_businesses')
        .select('id')
        .eq('merchant_id', user.id);

      if (error) {
        console.error('Error checking businesses:', error);
        return;
      }

      const count = data?.length || 0;
      setBusinessCount(count);
      setHasBusinesses(count > 0);

      // Auto-enable developer mode if user has businesses AND save to database
      if (count > 0 && !isDeveloperMode) {
        // Update database directly
        await supabase
          .from('users')
          .update({ developer_mode_enabled: true })
          .eq('id', user.id);

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
      isSaving,
      isLoading
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
