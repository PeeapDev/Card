/**
 * Become a Merchant Card
 *
 * Allows users to request upgrading to merchant role.
 * Opens the MerchantSetupWizard for a guided experience.
 */

import { useState, useEffect } from 'react';
import {
  Store,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import { MerchantSetupWizard } from './MerchantSetupWizard';

interface BecomeMerchantCardProps {
  compact?: boolean;
}

interface RoleRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  toRole: string;
  createdAt: string;
  rejectionReason?: string;
}

export function BecomeMerchantCard({ compact = false }: BecomeMerchantCardProps) {
  const { user } = useAuth();
  const [showWizard, setShowWizard] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingRequest, setExistingRequest] = useState<RoleRequest | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Check if user is already a merchant
  const isMerchant = user?.roles?.includes('merchant');

  useEffect(() => {
    if (user?.id && !isMerchant) {
      checkExistingRequest();
    }
  }, [user?.id, isMerchant]);

  const checkExistingRequest = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_role_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('to_role', 'merchant')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!error && data) {
        setExistingRequest({
          id: data.id,
          status: data.status,
          toRole: data.to_role,
          createdAt: data.created_at,
          rejectionReason: data.rejection_reason,
        });
      }
    } catch (error) {
      // No existing request
    } finally {
      setLoading(false);
    }
  };

  const handleWizardComplete = () => {
    setMessage({ type: 'success', text: 'Your merchant application has been submitted! We will review it within 1-2 business days.' });
    checkExistingRequest();
  };

  // Don't show if user is already a merchant
  if (isMerchant) {
    return null;
  }

  // If loading, show skeleton
  if (loading) {
    return (
      <MotionCard className={clsx('p-4', compact ? '' : 'p-6')} glowEffect>
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          <div className="flex-1">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          </div>
        </div>
      </MotionCard>
    );
  }

  return (
    <>
      <MotionCard className={clsx('p-4', compact ? '' : 'p-6')} delay={0.15} glowEffect>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
              <Store className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Become a Merchant</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {existingRequest?.status === 'pending'
                  ? 'Your request is being reviewed'
                  : existingRequest?.status === 'rejected'
                  ? 'Your previous request was declined'
                  : 'Start selling on Peeap marketplace'}
              </p>
            </div>
          </div>

          {existingRequest?.status === 'pending' ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full text-sm font-medium">
              <Clock className="w-4 h-4" />
              Pending
            </span>
          ) : existingRequest?.status === 'rejected' ? (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Reapply
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-colors"
            >
              Apply Now
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status messages */}
        {message && (
          <div className={clsx(
            'mt-4 p-3 rounded-lg flex items-start gap-2',
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
          )}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm">{message.text}</span>
          </div>
        )}

        {existingRequest?.status === 'rejected' && existingRequest.rejectionReason && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-400">
              <span className="font-medium">Reason:</span> {existingRequest.rejectionReason}
            </p>
          </div>
        )}

        {/* Benefits preview */}
        {!existingRequest && !compact && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                POS System Access
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Sell on Marketplace
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Accept Payments
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Business Analytics
              </div>
            </div>
          </div>
        )}
      </MotionCard>

      {/* Merchant Setup Wizard */}
      {showWizard && (
        <MerchantSetupWizard
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </>
  );
}

export default BecomeMerchantCard;
