import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

export function MerchantApiKeysPage() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAndRedirect() {
      // Wait for auth to load
      if (isLoading) return;

      // If not authenticated, redirect to login with return URL
      if (!isAuthenticated || !user) {
        const returnUrl = encodeURIComponent('/merchant/api-keys');
        navigate(`/login?redirect=${returnUrl}`);
        return;
      }

      try {
        // Check if user has any developer businesses
        const { data: businesses, error } = await supabase
          .from('developer_businesses')
          .select('id, name')
          .eq('user_id', user.id)
          .limit(1);

        if (error) {
          console.error('Error checking businesses:', error);
          // Redirect to developer page on error
          navigate('/merchant/developer');
          return;
        }

        if (!businesses || businesses.length === 0) {
          // No business - redirect to create one
          navigate('/merchant/developer/create-business');
        } else {
          // Has business - redirect to business API keys page
          navigate(`/merchant/developer/${businesses[0].id}`);
        }
      } catch (err) {
        console.error('Error:', err);
        navigate('/merchant/developer');
      }
    }

    checkAndRedirect();
  }, [user, isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Loading API Keys...</p>
      </div>
    </div>
  );
}
