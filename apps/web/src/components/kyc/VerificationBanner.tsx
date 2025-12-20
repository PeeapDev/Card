import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getVerificationStatus,
  VerificationStatus,
  getNextVerificationStep,
} from '@/services/verification.service';

interface VerificationBannerProps {
  className?: string;
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export const VerificationBanner: React.FC<VerificationBannerProps> = ({
  className = '',
  onDismiss,
  showDismiss = true,
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const result = await getVerificationStatus();
      setStatus(result);
    } catch (error) {
      console.error('Failed to load verification status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Store dismissal for 24 hours
    localStorage.setItem('verification_banner_dismissed', Date.now().toString());
    onDismiss?.();
  };

  const handleVerify = () => {
    navigate('/verify');
  };

  // Check if banner was dismissed recently
  useEffect(() => {
    const dismissedAt = localStorage.getItem('verification_banner_dismissed');
    if (dismissedAt) {
      const dayInMs = 24 * 60 * 60 * 1000;
      if (Date.now() - parseInt(dismissedAt) < dayInMs) {
        setDismissed(true);
      }
    }
  }, []);

  if (loading || dismissed || !status || status.overallVerified) {
    return null;
  }

  const nextStep = getNextVerificationStep(status);
  const progress = status.verificationPercentage;

  return (
    <div
      className={`bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-l-4 border-amber-500 rounded-lg p-4 ${className}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <svg
              className="w-6 h-6 text-amber-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200">
              Complete Your Verification
            </h3>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {nextStep || 'Verify your identity to unlock all features'}
            </p>

            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-1">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-amber-200 dark:bg-amber-800 rounded-full h-2">
                <div
                  className="bg-amber-500 rounded-full h-2 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <button
              onClick={handleVerify}
              className="mt-3 inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors"
            >
              Complete Verification
              <svg
                className="ml-2 w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
          </div>
        </div>

        {showDismiss && (
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 ml-4 text-amber-400 hover:text-amber-500"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default VerificationBanner;
