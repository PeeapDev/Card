/**
 * Transaction PIN Modal
 *
 * Secure PIN entry for transaction verification
 */

import { useState, useRef, useEffect } from 'react';
import { X, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';

interface TransactionPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (pin: string) => Promise<boolean>;
  amount: string;
  recipientName: string;
}

export function TransactionPinModal({
  isOpen,
  onClose,
  onVerify,
  amount,
  recipientName,
}: TransactionPinModalProps) {
  const [pin, setPin] = useState(['', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const MAX_ATTEMPTS = 3;

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setPin(['', '', '', '']);
      setError('');
      setIsVerifying(false);
      // Focus first input
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleInputChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value.slice(-1); // Only take last character
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    if (newPin.every(digit => digit !== '') && !isVerifying) {
      handleVerify(newPin.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      // Focus previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);

    if (pastedData.length === 4) {
      const newPin = pastedData.split('');
      setPin(newPin);
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (pinCode: string) => {
    if (pinCode.length !== 4 || isVerifying) return;

    setIsVerifying(true);
    setError('');

    try {
      const isValid = await onVerify(pinCode);

      if (!isValid) {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);

        if (newAttempts >= MAX_ATTEMPTS) {
          setError('Too many failed attempts. Please try again later.');
          setTimeout(() => {
            onClose();
          }, 2000);
        } else {
          setError(`Incorrect PIN. ${MAX_ATTEMPTS - newAttempts} attempts remaining.`);
          setPin(['', '', '', '']);
          setTimeout(() => {
            inputRefs.current[0]?.focus();
          }, 100);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setPin(['', '', '', '']);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleNumpadClick = (digit: string) => {
    const emptyIndex = pin.findIndex(p => p === '');
    if (emptyIndex !== -1) {
      handleInputChange(emptyIndex, digit);
    }
  };

  const handleNumpadBackspace = () => {
    const lastFilledIndex = pin.map((p, i) => p !== '' ? i : -1).filter(i => i !== -1).pop();
    if (lastFilledIndex !== undefined) {
      const newPin = [...pin];
      newPin[lastFilledIndex] = '';
      setPin(newPin);
      inputRefs.current[lastFilledIndex]?.focus();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-xl">
              <Lock className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Enter Transaction PIN</h3>
              <p className="text-sm text-gray-500">Verify to send money</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isVerifying}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Transaction Summary */}
          <div className="p-4 bg-gray-50 rounded-xl text-center">
            <p className="text-sm text-gray-500">Sending</p>
            <p className="text-2xl font-bold text-gray-900">${parseFloat(amount).toFixed(2)}</p>
            <p className="text-sm text-gray-600">to {recipientName}</p>
          </div>

          {/* PIN Input */}
          <div className="flex justify-center gap-3" onPaste={handlePaste}>
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleInputChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={isVerifying || attempts >= MAX_ATTEMPTS}
                className={clsx(
                  'w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all',
                  error ? 'border-red-300 bg-red-50' : 'border-gray-300',
                  isVerifying && 'opacity-50'
                )}
              />
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {isVerifying && (
            <div className="flex items-center justify-center gap-2 text-primary-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="font-medium">Verifying...</span>
            </div>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'back'].map((key) => (
              <button
                key={key}
                onClick={() => {
                  if (key === 'back') {
                    handleNumpadBackspace();
                  } else if (key) {
                    handleNumpadClick(key);
                  }
                }}
                disabled={!key || isVerifying || attempts >= MAX_ATTEMPTS}
                className={clsx(
                  'h-14 rounded-xl font-semibold text-xl transition-colors',
                  !key ? 'invisible' : '',
                  key === 'back'
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-gray-50 text-gray-900 hover:bg-gray-100 active:bg-gray-200',
                  (isVerifying || attempts >= MAX_ATTEMPTS) && 'opacity-50 cursor-not-allowed'
                )}
              >
                {key === 'back' ? '⌫' : key}
              </button>
            ))}
          </div>

          {/* Forgot PIN Link */}
          <p className="text-center text-sm text-gray-500">
            Forgot your PIN?{' '}
            <a href="/profile" className="text-primary-600 font-medium hover:underline">
              Reset in Profile
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

export default TransactionPinModal;
