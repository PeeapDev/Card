import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getVerificationStatus,
  VerificationStatus,
} from '@/services/verification.service';

interface VerificationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  canClose?: boolean;
  reason?: string;
  blockedAction?: string;
}

export const VerificationModal: React.FC<VerificationModalProps> = ({
  isOpen,
  onClose,
  canClose = false,
  reason,
  blockedAction,
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

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

  const handleStartVerification = () => {
    navigate('/verify');
    if (canClose && onClose) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const progress = status?.verificationPercentage || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blur backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        onClick={canClose ? onClose : undefined}
      />

      {/* Modal content */}
      <div className="relative z-10 w-full max-w-lg mx-4 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Red notification bar */}
        <div className="bg-gradient-to-r from-red-600 to-red-500 px-6 py-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Verification Required</h2>
              <p className="text-sm text-red-100">
                {blockedAction || 'Complete verification to continue'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Sierra Leone ID Card Display */}
          <div className="mb-6 relative">
            <div className="bg-gradient-to-br from-green-700 via-green-600 to-blue-700 rounded-xl p-4 shadow-lg transform hover:scale-[1.02] transition-transform">
              {/* ID Card Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                    <span className="text-green-700 font-bold text-xs">SL</span>
                  </div>
                  <div>
                    <p className="text-white text-xs font-semibold">REPUBLIC OF SIERRA LEONE</p>
                    <p className="text-green-100 text-[10px]">NATIONAL ID CARD</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-100 text-[10px]">NCRA</p>
                </div>
              </div>

              {/* ID Card Body */}
              <div className="flex space-x-4">
                {/* Photo placeholder */}
                <div className="w-20 h-24 bg-white/20 rounded-lg flex items-center justify-center border-2 border-white/30">
                  <svg className="w-10 h-10 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                  </svg>
                </div>

                {/* Details */}
                <div className="flex-1 space-y-1">
                  <div>
                    <p className="text-green-100 text-[10px]">FULL NAME</p>
                    <p className="text-white text-sm font-medium">Your Name Here</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-green-100 text-[10px]">DATE OF BIRTH</p>
                      <p className="text-white text-xs">DD/MM/YYYY</p>
                    </div>
                    <div>
                      <p className="text-green-100 text-[10px]">GENDER</p>
                      <p className="text-white text-xs">M/F</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-green-100 text-[10px]">NIN</p>
                    <p className="text-white text-sm font-mono font-bold tracking-wider">XXXXXX-XXXXX</p>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute top-2 right-2 w-16 h-16 opacity-10">
                <svg viewBox="0 0 100 100" fill="white">
                  <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="2" fill="none" />
                  <path d="M50 20 L60 45 L85 45 L65 60 L75 85 L50 70 L25 85 L35 60 L15 45 L40 45 Z" />
                </svg>
              </div>
            </div>

            {/* Scan animation overlay */}
            <div className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none">
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-white to-transparent opacity-50 animate-scan" />
            </div>
          </div>

          {/* Reason/Message */}
          {reason && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">{reason}</p>
            </div>
          )}

          {/* Progress indicator */}
          {status && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Verification Progress</span>
                <span className="font-semibold text-gray-900 dark:text-white">{progress}%</span>
              </div>
              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    progress >= 100
                      ? 'bg-green-500'
                      : progress >= 50
                      ? 'bg-amber-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>

              {/* Steps */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    status.hasIdVerification ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    {status.hasIdVerification ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-xs text-gray-500">1</span>
                    )}
                  </div>
                  <span className={`text-sm ${status.hasIdVerification ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Upload Sierra Leone ID Card
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    status.hasPhoneVerification ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    {status.hasPhoneVerification ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-xs text-gray-500">2</span>
                    )}
                  </div>
                  <span className={`text-sm ${status.hasPhoneVerification ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    Verify Phone Number
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    status.hasNameMatch ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}>
                    {status.hasNameMatch ? (
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <span className="text-xs text-gray-500">3</span>
                    )}
                  </div>
                  <span className={`text-sm ${status.hasNameMatch ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                    ID & Phone Name Match
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={handleStartVerification}
              className="w-full py-3 px-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-semibold rounded-xl shadow-lg shadow-green-500/25 transition-all hover:shadow-xl hover:shadow-green-500/30"
            >
              Start Verification
            </button>

            {canClose && (
              <button
                onClick={onClose}
                className="w-full py-2 px-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
              >
                I'll do this later
              </button>
            )}
          </div>

          {/* Info text */}
          <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
            Verification takes less than 2 minutes and unlocks all features
          </p>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(2400%); }
        }
        .animate-scan {
          animation: scan 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default VerificationModal;
