import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Receipt, Loader2 } from 'lucide-react';

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  const sessionId = searchParams.get('sessionId');
  const status = searchParams.get('status');
  const amount = searchParams.get('amount');
  const currency = searchParams.get('currency') || 'SLE';
  const orderNumber = searchParams.get('orderNumber');
  const error = searchParams.get('error');

  // Auto-redirect after countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      navigate('/admin/payment-settings');
    }
  }, [countdown, navigate]);

  // Format amount from minor units (cents) to major units
  const formatAmount = (value: string | null) => {
    if (!value) return '0.00';
    // Monime returns amount in minor units (e.g., 100 = 1.00 SLE)
    const majorUnits = Number(value) / 100;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(majorUnits);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-gray-600">
            Your payment has been processed successfully.
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Note: {error}
            </p>
          </div>
        )}

        <div className="bg-gray-50 rounded-xl p-6 mb-6">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Receipt className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-500">Payment Details</span>
          </div>

          {amount && (
            <div className="mb-4">
              <p className="text-3xl font-bold text-gray-900">
                Le {formatAmount(amount)}
              </p>
              <p className="text-sm text-gray-500">{currency}</p>
            </div>
          )}

          <div className="space-y-2 text-sm">
            {orderNumber && (
              <div className="flex justify-between">
                <span className="text-gray-500">Order Number</span>
                <span className="font-medium text-gray-900">{orderNumber}</span>
              </div>
            )}
            {sessionId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Session ID</span>
                <span className="font-mono text-xs text-gray-900 truncate max-w-[180px]">
                  {sessionId}
                </span>
              </div>
            )}
            {status && (
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`font-medium capitalize ${
                  status === 'completed' ? 'text-green-600' : 'text-blue-600'
                }`}>
                  {status}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Auto-redirect countdown */}
        <div className="flex items-center justify-center gap-2 text-gray-500 mb-4">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">
            Redirecting to Payment Settings in {countdown}s...
          </span>
        </div>

        <button
          onClick={() => navigate('/admin/payment-settings')}
          className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors"
        >
          Go to Payment Settings Now
        </button>
      </div>
    </div>
  );
}
