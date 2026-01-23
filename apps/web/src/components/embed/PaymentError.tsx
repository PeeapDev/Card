/**
 * Payment Error Component
 *
 * Displays error message with retry option
 */

import { XCircle, RefreshCw, ArrowLeft } from 'lucide-react';

interface PaymentErrorProps {
  message: string;
  code?: string;
  onRetry?: () => void;
  onBack?: () => void;
  onClose?: () => void;
}

export function PaymentError({
  message,
  code,
  onRetry,
  onBack,
  onClose,
}: PaymentErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
      {/* Error Icon */}
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <XCircle className="w-12 h-12 text-red-600" />
      </div>

      {/* Error Message */}
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Failed</h2>
      <p className="text-gray-600 mb-2">{message}</p>

      {code && (
        <p className="text-xs text-gray-400 mb-6">Error code: {code}</p>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {onRetry && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            Try Again
          </button>
        )}

        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Choose Different Method
          </button>
        )}

        {onClose && (
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}
