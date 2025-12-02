/**
 * Setup Transaction PIN Modal
 *
 * Prompts user to set up their transaction PIN before first transfer
 */

import { useState, useRef, useEffect } from 'react';
import { X, Lock, Shield, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { supabase } from '@/lib/supabase';

interface SetupPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}

export function SetupPinModal({
  isOpen,
  onClose,
  onSuccess,
  userId,
}: SetupPinModalProps) {
  const [step, setStep] = useState<'intro' | 'enter' | 'confirm'>('intro');
  const [pin, setPin] = useState(['', '', '', '']);
  const [confirmPin, setConfirmPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const confirmInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep('intro');
      setPin(['', '', '', '']);
      setConfirmPin(['', '', '', '']);
      setError('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (step === 'enter') {
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else if (step === 'confirm') {
      setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
    }
  }, [step]);

  const handlePinChange = (index: number, value: string, isConfirm = false) => {
    if (!/^\d*$/.test(value)) return;

    const newPin = isConfirm ? [...confirmPin] : [...pin];
    newPin[index] = value.slice(-1);

    if (isConfirm) {
      setConfirmPin(newPin);
    } else {
      setPin(newPin);
    }
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      const refs = isConfirm ? confirmInputRefs : inputRefs;
      refs.current[index + 1]?.focus();
    }

    // Auto-proceed when PIN is complete
    if (newPin.every(d => d !== '')) {
      if (!isConfirm) {
        setTimeout(() => setStep('confirm'), 300);
      } else {
        handleSubmit(newPin.join(''));
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent, isConfirm = false) => {
    const currentPin = isConfirm ? confirmPin : pin;
    const refs = isConfirm ? confirmInputRefs : inputRefs;

    if (e.key === 'Backspace' && !currentPin[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (confirmedPin: string) => {
    const enteredPin = pin.join('');

    if (enteredPin !== confirmedPin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin(['', '', '', '']);
      setTimeout(() => confirmInputRefs.current[0]?.focus(), 100);
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          transaction_pin: enteredPin,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to set PIN');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNumpadClick = (digit: string, isConfirm = false) => {
    const currentPin = isConfirm ? confirmPin : pin;
    const emptyIndex = currentPin.findIndex(p => p === '');
    if (emptyIndex !== -1) {
      handlePinChange(emptyIndex, digit, isConfirm);
    }
  };

  const handleNumpadBackspace = (isConfirm = false) => {
    const currentPin = isConfirm ? confirmPin : pin;
    const lastFilledIndex = currentPin.map((p, i) => p !== '' ? i : -1).filter(i => i !== -1).pop();
    if (lastFilledIndex !== undefined) {
      handlePinChange(lastFilledIndex, '', isConfirm);
      const refs = isConfirm ? confirmInputRefs : inputRefs;
      refs.current[lastFilledIndex]?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl">
              <Shield className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Set Transaction PIN</h3>
              <p className="text-sm text-gray-500">Secure your transfers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {step === 'intro' && (
            <>
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-10 h-10 text-purple-600" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Protect Your Transfers</h4>
                <p className="text-gray-500 mt-2">
                  Before you can send money, you need to set up a 4-digit transaction PIN.
                  This PIN will be required every time you make a transfer.
                </p>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">Important</p>
                    <p className="mt-1">Remember your PIN! You'll need it for all transfers. If you forget it, you can reset it from your profile settings.</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setStep('enter')}
                className="w-full py-4 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
              >
                Set Up PIN Now
              </button>

              <button
                onClick={onClose}
                className="w-full py-3 text-gray-500 font-medium hover:text-gray-700"
              >
                I'll do this later
              </button>
            </>
          )}

          {step === 'enter' && (
            <>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900">Create Your PIN</h4>
                <p className="text-gray-500 mt-1">Enter a 4-digit PIN</p>
              </div>

              {/* PIN Input */}
              <div className="flex justify-center gap-3">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                ))}
              </div>

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === 'back') handleNumpadBackspace();
                      else if (key) handleNumpadClick(key);
                    }}
                    disabled={!key}
                    className={clsx(
                      'h-14 rounded-xl font-semibold text-xl transition-colors',
                      !key ? 'invisible' : '',
                      key === 'back'
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100 active:bg-gray-200'
                    )}
                  >
                    {key === 'back' ? '⌫' : key}
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="text-center">
                <h4 className="text-lg font-semibold text-gray-900">Confirm Your PIN</h4>
                <p className="text-gray-500 mt-1">Re-enter your 4-digit PIN</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Confirm PIN Input */}
              <div className="flex justify-center gap-3">
                {confirmPin.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => (confirmInputRefs.current[index] = el)}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value, true)}
                    onKeyDown={(e) => handleKeyDown(index, e, true)}
                    disabled={isLoading}
                    className={clsx(
                      'w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                      error ? 'border-red-300 bg-red-50' : 'border-gray-300'
                    )}
                  />
                ))}
              </div>

              {isLoading && (
                <div className="flex items-center justify-center gap-2 text-primary-600">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="font-medium">Setting up PIN...</span>
                </div>
              )}

              {/* Numpad */}
              <div className="grid grid-cols-3 gap-3">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key) => (
                  <button
                    key={key}
                    onClick={() => {
                      if (key === 'back') handleNumpadBackspace(true);
                      else if (key) handleNumpadClick(key, true);
                    }}
                    disabled={!key || isLoading}
                    className={clsx(
                      'h-14 rounded-xl font-semibold text-xl transition-colors',
                      !key ? 'invisible' : '',
                      key === 'back'
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-gray-50 text-gray-900 hover:bg-gray-100 active:bg-gray-200',
                      isLoading && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {key === 'back' ? '⌫' : key}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setStep('enter');
                  setPin(['', '', '', '']);
                  setConfirmPin(['', '', '', '']);
                  setError('');
                }}
                disabled={isLoading}
                className="w-full py-3 text-gray-500 font-medium hover:text-gray-700 disabled:opacity-50"
              >
                Start Over
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SetupPinModal;
