import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getVerificationStatus,
  checkVerificationRequired,
  VerificationStatus,
} from '@/services/verification.service';

// Transaction limits for unverified users (in Leones)
const UNVERIFIED_RECEIVE_LIMIT = 999;
const UNVERIFIED_SEND_LIMIT = 999;
const UNVERIFIED_WITHDRAW_LIMIT = 0;

export interface VerificationRestriction {
  allowed: boolean;
  reason?: string;
  requiredAction?: string;
}

export interface UseVerificationResult {
  status: VerificationStatus | null;
  loading: boolean;
  isVerified: boolean;
  verificationPercentage: number;
  pendingSteps: string[];
  showVerificationModal: boolean;
  modalReason: string;
  blockedAction: string;

  // Restriction checks
  canReceive: (amount: number) => VerificationRestriction;
  canSend: (amount: number) => VerificationRestriction;
  canWithdraw: (amount: number) => VerificationRestriction;
  canAccessFeature: (feature: string) => VerificationRestriction;

  // Modal controls
  openVerificationModal: (reason?: string, blockedAction?: string) => void;
  closeVerificationModal: () => void;

  // Refresh status
  refreshStatus: () => Promise<void>;
}

export function useVerification(): UseVerificationResult {
  const { user } = useAuth();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [modalReason, setModalReason] = useState('');
  const [blockedAction, setBlockedAction] = useState('');

  const loadStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const result = await getVerificationStatus();
      setStatus(result);
    } catch (error) {
      console.error('Failed to load verification status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Check on initial load if verification is required
  useEffect(() => {
    const checkInitialVerification = async () => {
      if (!user || loading) return;

      try {
        const required = await checkVerificationRequired();
        if (required.required) {
          // Check if we've shown the modal recently (within 1 hour)
          const lastShown = localStorage.getItem('verification_modal_shown');
          const now = Date.now();
          const hourInMs = 60 * 60 * 1000;

          if (!lastShown || now - parseInt(lastShown) > hourInMs) {
            setModalReason(required.reason || '');
            setBlockedAction('Complete verification to unlock all features');
            setShowVerificationModal(true);
            localStorage.setItem('verification_modal_shown', now.toString());
          }
        }
      } catch (error) {
        console.error('Failed to check verification requirement:', error);
      }
    };

    checkInitialVerification();
  }, [user, loading]);

  const isVerified = status?.overallVerified ?? false;
  const verificationPercentage = status?.verificationPercentage ?? 0;
  const pendingSteps = status?.pendingSteps ?? [];

  const canReceive = useCallback((amount: number): VerificationRestriction => {
    if (isVerified) {
      return { allowed: true };
    }

    if (amount > UNVERIFIED_RECEIVE_LIMIT) {
      return {
        allowed: false,
        reason: `Receiving more than ${UNVERIFIED_RECEIVE_LIMIT.toLocaleString()} SLE requires verification`,
        requiredAction: 'Complete identity verification to receive larger amounts',
      };
    }

    return { allowed: true };
  }, [isVerified]);

  const canSend = useCallback((amount: number): VerificationRestriction => {
    if (isVerified) {
      return { allowed: true };
    }

    if (amount > UNVERIFIED_SEND_LIMIT) {
      return {
        allowed: false,
        reason: `Sending more than ${UNVERIFIED_SEND_LIMIT.toLocaleString()} SLE requires verification`,
        requiredAction: 'Complete identity verification to send larger amounts',
      };
    }

    return { allowed: true };
  }, [isVerified]);

  const canWithdraw = useCallback((amount: number): VerificationRestriction => {
    if (isVerified) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Withdrawals require identity verification',
      requiredAction: 'Complete identity verification to withdraw funds',
    };
  }, [isVerified]);

  const canAccessFeature = useCallback((feature: string): VerificationRestriction => {
    if (isVerified) {
      return { allowed: true };
    }

    // Features that require verification
    const restrictedFeatures = [
      'withdraw',
      'payout',
      'virtual_card',
      'physical_card',
      'bank_transfer',
      'international_transfer',
      'business_account',
      'high_value_transactions',
    ];

    if (restrictedFeatures.includes(feature.toLowerCase())) {
      return {
        allowed: false,
        reason: `${feature.replace(/_/g, ' ')} requires identity verification`,
        requiredAction: 'Complete identity verification to access this feature',
      };
    }

    return { allowed: true };
  }, [isVerified]);

  const openVerificationModal = useCallback((reason?: string, action?: string) => {
    setModalReason(reason || '');
    setBlockedAction(action || '');
    setShowVerificationModal(true);
  }, []);

  const closeVerificationModal = useCallback(() => {
    setShowVerificationModal(false);
    setModalReason('');
    setBlockedAction('');
  }, []);

  const refreshStatus = useCallback(async () => {
    setLoading(true);
    await loadStatus();
  }, [loadStatus]);

  return {
    status,
    loading,
    isVerified,
    verificationPercentage,
    pendingSteps,
    showVerificationModal,
    modalReason,
    blockedAction,
    canReceive,
    canSend,
    canWithdraw,
    canAccessFeature,
    openVerificationModal,
    closeVerificationModal,
    refreshStatus,
  };
}

export default useVerification;
