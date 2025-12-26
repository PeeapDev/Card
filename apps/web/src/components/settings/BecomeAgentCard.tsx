/**
 * Become an Agent Card
 *
 * Allows users to request upgrading to agent role
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Headphones,
  ChevronRight,
  ArrowRightLeft,
  Clock,
  CheckCircle,
  X,
  AlertCircle,
  Loader2,
  CreditCard,
  MapPin,
  Phone,
  FileText,
  Building2,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';

interface BecomeAgentCardProps {
  compact?: boolean;
}

interface RoleRequest {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  toRole: string;
  createdAt: string;
  rejectionReason?: string;
}

export function BecomeAgentCard({ compact = false }: BecomeAgentCardProps) {
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [existingRequest, setExistingRequest] = useState<RoleRequest | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [nationalId, setNationalId] = useState('');
  const [location, setLocation] = useState('');
  const [agentPhone, setAgentPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [reason, setReason] = useState('');

  // Check if user is already an agent
  const isAgent = user?.roles?.includes('agent');

  useEffect(() => {
    if (user?.id && !isAgent) {
      checkExistingRequest();
    }
  }, [user?.id, isAgent]);

  const checkExistingRequest = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_role_requests')
        .select('*')
        .eq('user_id', user.id)
        .eq('to_role', 'agent')
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
    } catch {
      // No existing request
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSubmitting(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('user_role_requests')
        .insert({
          user_id: user.id,
          user_name: `${user.firstName} ${user.lastName}`,
          user_email: user.email,
          from_role: 'user',
          to_role: 'agent',
          national_id: nationalId,
          agent_location: location,
          business_phone: agentPhone,
          business_name: businessName || null,
          reason: reason,
          status: 'pending',
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Your agent application has been submitted! We will review it within 1-2 business days.' });
      setShowModal(false);
      checkExistingRequest();
    } catch (error: unknown) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to submit request' });
    } finally {
      setSubmitting(false);
    }
  };

  // Don't show if user is already an agent
  if (isAgent) {
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
      <MotionCard className={clsx('p-4', compact ? '' : 'p-6')} delay={0.2} glowEffect>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl">
              <Headphones className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Become an Agent</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {existingRequest?.status === 'pending'
                  ? 'Your application is being reviewed'
                  : existingRequest?.status === 'rejected'
                  ? 'Your previous application was declined'
                  : 'Earn commissions by helping users'}
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
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Reapply
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-lg hover:from-orange-700 hover:to-amber-700 transition-colors"
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
                Process Deposits
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Process Withdrawals
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Earn Commissions
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" />
                Agent Dashboard
              </div>
            </div>
          </div>
        )}
      </MotionCard>

      {/* Application Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Headphones className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Become an Agent</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Fill in your details to apply</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Benefits Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-amber-600 rounded-xl p-4 mb-6 text-white">
              <h4 className="font-semibold mb-2">What you'll get:</h4>
              <ul className="grid grid-cols-2 gap-2 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Cash In/Out Services
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Commission Earnings
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Agent Dashboard
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Customer Support
                </li>
              </ul>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <CreditCard className="w-4 h-4 inline mr-1" />
                  National ID Number *
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value)}
                  placeholder="Enter your National ID"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Location / Area of Operation *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g., Freetown Central, Lumley Beach"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  This is where you'll serve customers
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Phone className="w-4 h-4 inline mr-1" />
                  Agent Phone/WhatsApp *
                </label>
                <input
                  type="tel"
                  value={agentPhone}
                  onChange={(e) => setAgentPhone(e.target.value)}
                  placeholder="+232 XX XXX XXXX"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Customers will contact you on this number
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Building2 className="w-4 h-4 inline mr-1" />
                  Business Name (Optional)
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Your shop or business name"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <FileText className="w-4 h-4 inline mr-1" />
                  Why do you want to become an agent?
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Tell us about your experience and why you want to be an agent..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Info */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <AlertCircle className="w-4 h-4 inline mr-1" />
                  Your application will be reviewed within 1-2 business days. You may be contacted for verification of your National ID.
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !nationalId || !location || !agentPhone}
                  className="flex-1 py-3 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-xl font-medium hover:from-orange-700 hover:to-amber-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="w-5 h-5" />
                      Submit Application
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}

export default BecomeAgentCard;
