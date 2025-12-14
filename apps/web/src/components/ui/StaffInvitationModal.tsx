/**
 * Staff Invitation Modal
 *
 * Shows merchant info and allows user to set up a PIN when accepting a staff invitation
 */

import { useState, useRef, useEffect } from 'react';
import { X, Store, UserPlus, ShieldCheck, Loader2, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

interface StaffInvitationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (pin: string) => Promise<void>;
  onDecline: () => Promise<void>;
  merchantName: string;
  role: string;
}

export function StaffInvitationModal({
  isOpen,
  onClose,
  onAccept,
  onDecline,
  merchantName,
  role,
}: StaffInvitationModalProps) {
  const [step, setStep] = useState<'info' | 'pin'>('info');
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [declining, setDeclining] = useState(false);

  const pinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const confirmPinRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep('info');
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setError('');
      setProcessing(false);
      setDeclining(false);
    }
  }, [isOpen]);

  // Focus first PIN input when entering PIN step
  useEffect(() => {
    if (step === 'pin' && pinRefs[0].current) {
      pinRefs[0].current.focus();
    }
  }, [step]);

  const handlePinChange = (index: number, value: string, isConfirm: boolean = false) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newPin = isConfirm ? [...confirmPin] : [...pin];
    newPin[index] = value.slice(-1); // Only keep last digit

    if (isConfirm) {
      setConfirmPin(newPin);
    } else {
      setPin(newPin);
    }

    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      const refs = isConfirm ? confirmPinRefs : pinRefs;
      refs[index + 1].current?.focus();
    }

    // If last digit of confirm PIN, auto-focus stays
    if (isConfirm && index === 3 && value) {
      // Check if PINs match
      const fullPin = [...pin].join('');
      const fullConfirmPin = [...newPin].join('');
      if (fullPin.length === 4 && fullConfirmPin.length === 4 && fullPin !== fullConfirmPin) {
        setError('PINs do not match');
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm: boolean = false) => {
    const refs = isConfirm ? confirmPinRefs : pinRefs;
    const currentPin = isConfirm ? confirmPin : pin;

    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  };

  const handleProceedToPin = () => {
    setStep('pin');
  };

  const handleAccept = async () => {
    const fullPin = pin.join('');
    const fullConfirmPin = confirmPin.join('');

    if (fullPin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    if (fullPin !== fullConfirmPin) {
      setError('PINs do not match');
      return;
    }

    setProcessing(true);
    setError('');

    try {
      await onAccept(fullPin);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setDeclining(true);
    try {
      await onDecline();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to decline invitation');
    } finally {
      setDeclining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="relative px-6 pt-6 pb-4 bg-gradient-to-br from-primary-500 to-primary-600 text-white">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Staff Invitation</h2>
              <p className="text-sm text-white/80">You've been invited to join a team</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'info' ? (
            <>
              {/* Merchant Info */}
              <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <Store className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Business</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{merchantName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Your Role</p>
                    <p className="font-semibold text-gray-900 dark:text-white capitalize">{role}</p>
                  </div>
                </div>
              </div>

              {/* What you'll be able to do */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  As a {role}, you'll be able to:
                </h3>
                <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                  {role === 'cashier' && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Process sales and transactions
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Accept payments from customers
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        View your transaction history
                      </li>
                    </>
                  )}
                  {role === 'manager' && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Process sales and manage inventory
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        View reports and analytics
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Manage cashier shifts
                      </li>
                    </>
                  )}
                  {role === 'admin' && (
                    <>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Full access to POS system
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Manage staff and settings
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Access all reports and analytics
                      </li>
                    </>
                  )}
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={handleDecline}
                  disabled={declining}
                  className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  {declining ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Decline'
                  )}
                </button>
                <button
                  onClick={handleProceedToPin}
                  className="flex-1 px-4 py-2.5 text-white bg-primary-600 hover:bg-primary-700 rounded-xl font-medium transition-colors"
                >
                  Accept & Set PIN
                </button>
              </div>
            </>
          ) : (
            <>
              {/* PIN Setup */}
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Set Your POS PIN
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Create a 4-digit PIN to access the POS terminal
                </p>
              </div>

              {/* PIN Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Enter PIN
                </label>
                <div className="flex justify-center gap-3">
                  {pin.map((digit, index) => (
                    <input
                      key={index}
                      ref={pinRefs[index]}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  ))}
                </div>
              </div>

              {/* Confirm PIN Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Confirm PIN
                </label>
                <div className="flex justify-center gap-3">
                  {confirmPin.map((digit, index) => (
                    <input
                      key={index}
                      ref={confirmPinRefs[index]}
                      type={showPin ? 'text' : 'password'}
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handlePinChange(index, e.target.value, true)}
                      onKeyDown={(e) => handleKeyDown(index, e, true)}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors"
                    />
                  ))}
                </div>
              </div>

              {/* Show/Hide PIN */}
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mx-auto mb-4"
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPin ? 'Hide PIN' : 'Show PIN'}
              </button>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => setStep('info')}
                  className="flex-1 px-4 py-2.5 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleAccept}
                  disabled={processing || pin.join('').length !== 4 || confirmPin.join('').length !== 4}
                  className="flex-1 px-4 py-2.5 text-white bg-green-600 hover:bg-green-700 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Confirm & Join'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
