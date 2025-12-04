/**
 * Business Integration Page
 * Shows copy-paste code snippets for integrating payments
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Store, Loader2, AlertTriangle } from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { QuickIntegrationGuide } from '@/components/merchant/QuickIntegrationGuide';
import { supabase } from '@/lib/supabase';

interface Business {
  id: string;
  name: string;
  logo_url?: string;
  brand_color?: string;
  approval_status: string;
}

export function BusinessIntegrationPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<Business | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (businessId) {
      fetchBusiness();
    }
  }, [businessId]);

  const fetchBusiness = async () => {
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from('merchant_businesses')
        .select('id, name, logo_url, brand_color, approval_status')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      setBusiness(data);
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!business) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Business not found</h2>
          <p className="text-gray-500 mb-4">
            The business you're looking for doesn't exist or you don't have access.
          </p>
          <button
            onClick={() => navigate('/merchant/shops')}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Back to My Shops
          </button>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <button
              onClick={() => navigate(`/merchant/shops/${business.id}`)}
              className="p-2 hover:bg-gray-100 rounded-lg mt-1"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                Integration Guide
              </h1>
              <p className="text-gray-600">
                Copy & paste these code snippets to start accepting payments for{' '}
                <span className="font-semibold">{business.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Approval Warning */}
        {business.approval_status !== 'APPROVED' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900">Business Pending Approval</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Your business is currently pending approval. You can test the integration, but live
                payments will only work after approval.
              </p>
            </div>
          </div>
        )}

        {/* Integration Guide */}
        <QuickIntegrationGuide
          merchantId={business.id}
          merchantName={business.name}
          merchantLogo={business.logo_url}
          brandColor={business.brand_color}
        />
      </div>
    </MerchantLayout>
  );
}
