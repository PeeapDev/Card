/**
 * Business Context
 *
 * Provides the current business context for merchant pages.
 * Fetches and manages the primary business for the logged-in user.
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';

interface Business {
  id: string;
  name: string;
  slug?: string;
  logo_url?: string;
  currency: string;
  is_active: boolean;
  category?: string;
  description?: string;
  address?: string;
  city?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
}

interface BusinessContextType {
  business: Business | null;
  businesses: Business[];
  loading: boolean;
  error: string | null;
  refreshBusiness: () => Promise<void>;
  switchBusiness: (businessId: string) => void;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [business, setBusiness] = useState<Business | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBusinesses = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('merchant_businesses')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (fetchError) throw fetchError;

      if (data && data.length > 0) {
        setBusinesses(data);
        // Use saved preference or first business
        const savedBusinessId = localStorage.getItem('current_business_id');
        const selectedBusiness = savedBusinessId
          ? data.find(b => b.id === savedBusinessId) || data[0]
          : data[0];
        setBusiness(selectedBusiness);
      } else {
        setBusinesses([]);
        setBusiness(null);
      }
    } catch (err) {
      console.error('Error fetching businesses:', err);
      setError('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [user?.id]);

  const refreshBusiness = async () => {
    await fetchBusinesses();
  };

  const switchBusiness = (businessId: string) => {
    const newBusiness = businesses.find(b => b.id === businessId);
    if (newBusiness) {
      setBusiness(newBusiness);
      localStorage.setItem('current_business_id', businessId);
    }
  };

  return (
    <BusinessContext.Provider
      value={{
        business,
        businesses,
        loading,
        error,
        refreshBusiness,
        switchBusiness,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
