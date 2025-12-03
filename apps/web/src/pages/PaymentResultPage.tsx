/**
 * Payment Result Page
 * Shows success or cancelled/error state after checkout
 */
import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const reference = searchParams.get('reference');
  const businessId = searchParams.get('businessId');
  const status = searchParams.get('status');

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-10 h-10 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-2">Your payment has been processed successfully.</p>
        {reference && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            Reference: {reference}
          </p>
        )}
        <p className="text-sm text-gray-500 mb-6">
          Redirecting to dashboard in {countdown} seconds...
        </p>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
        >
          Go to Dashboard
        </button>
      </Card>
    </div>
  );
}

export function PaymentCancelledPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const reference = searchParams.get('reference');
  const businessId = searchParams.get('businessId');

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <XCircle className="w-10 h-10 text-orange-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Cancelled</h1>
        <p className="text-gray-600 mb-6">
          Your payment was cancelled. No charges have been made.
        </p>
        {reference && (
          <p className="text-xs text-gray-400 mb-4 font-mono">
            Reference: {reference}
          </p>
        )}
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-4 py-3 bg-orange-600 text-white rounded-xl font-medium hover:bg-orange-700 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </Card>
    </div>
  );
}

export function PaymentErrorPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const error = searchParams.get('error') || 'Something went wrong';

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Error</h1>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Try Again
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
          >
            Dashboard
          </button>
        </div>
      </Card>
    </div>
  );
}
