import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, KeyRound, Loader2, AlertCircle, CheckCircle, User } from 'lucide-react';
import { authService } from '@/services/auth.service';

interface TokenPayload {
  user_id: string;
  school_id: string;
  email: string;
  name: string;
  role: string;
  exp: number;
  iat: number;
  // Added by Peeap backend after looking up the mapping
  peeap_user_id?: string;
  peeap_email?: string;
  has_pin_setup?: boolean;
  is_primary_admin?: boolean;
  mapping_found?: boolean;
  auto_mapped?: boolean;
}

/**
 * Quick Access Page for SaaS Dashboard Access
 *
 * Flow:
 * 1. SaaS generates signed JWT with user info
 * 2. Redirects to school.peeap.com/auth/quick-access?token=xxx
 * 3. User enters their PIN (already set up in Peeap)
 * 4. PIN verified → access granted to dashboard
 */
export function QuickAccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState<'loading' | 'pin' | 'verifying' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [userInfo, setUserInfo] = useState<TokenPayload | null>(null);
  const [pin, setPin] = useState(['', '', '', '']);

  const token = searchParams.get('token');
  const returnUrl = searchParams.get('return_url');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setError('No access token provided. Please access this page from your school system.');
      return;
    }

    verifyToken();
  }, [token]);

  const verifyToken = async () => {
    try {
      // Verify the JWT token from SaaS
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/school/auth/verify-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Invalid or expired access token');
      }

      const data = await response.json();
      const payload = data.payload as TokenPayload;

      // Check if user has a Peeap account mapping
      if (!payload.peeap_user_id && !payload.mapping_found) {
        setStatus('error');
        setError(
          `Your school account (${payload.email}) is not linked to a Peeap account. ` +
          'If you connected this school to Peeap, please ensure you\'re using the same email address. ' +
          'Otherwise, contact your school administrator for access.'
        );
        return;
      }

      setUserInfo(payload);
      setStatus('pin');

      // Store for later use
      sessionStorage.setItem('quick_access_user', JSON.stringify(payload));
      if (returnUrl) {
        sessionStorage.setItem('quick_access_return_url', returnUrl);
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to verify access token');
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newPin = [...pin];
    newPin[index] = value;
    setPin(newPin);

    // Auto-focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`pin-${index + 1}`);
      nextInput?.focus();
    }

    // Auto-submit when all digits entered
    if (value && index === 3 && newPin.every(d => d)) {
      handlePinSubmit(newPin.join(''));
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePinSubmit = async (pinCode?: string) => {
    const code = pinCode || pin.join('');
    if (code.length !== 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setStatus('verifying');
    setError('');

    try {
      // Verify PIN and get session tokens
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/school/auth/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          pin: code,
          user_id: userInfo?.user_id,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Invalid PIN');
      }

      const data = await response.json();

      // Store tokens
      authService.setTokens({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in || 3600,
      });

      // Store school context
      localStorage.setItem('schoolId', userInfo?.school_id || '');
      localStorage.setItem('schoolRole', userInfo?.role || 'user');

      setStatus('success');

      // Redirect to dashboard after brief delay
      setTimeout(() => {
        navigate('/school');
      }, 1000);
    } catch (err: any) {
      setStatus('pin');
      setError(err.message || 'Invalid PIN. Please try again.');
      setPin(['', '', '', '']);
      document.getElementById('pin-0')?.focus();
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePinSubmit();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 rounded-full">
            <GraduationCap className="h-12 w-12 text-blue-600" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Peeap School</h1>

        {/* Loading State */}
        {status === 'loading' && (
          <div className="text-center py-8">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Verifying your access...</p>
          </div>
        )}

        {/* PIN Entry State */}
        {status === 'pin' && userInfo && (
          <div className="mt-6">
            {/* User Info */}
            <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl mb-6">
              <div className="p-2 bg-blue-100 rounded-full">
                <User className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{userInfo.name}</p>
                <p className="text-sm text-gray-500">{userInfo.email}</p>
              </div>
            </div>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <KeyRound className="h-7 w-7 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Enter Your PIN</h2>
              <p className="text-gray-500 mt-1">Enter your 4-digit wallet PIN to continue</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleFormSubmit}>
              <div className="flex justify-center gap-3 mb-6">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    id={`pin-${index}`}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    className="w-14 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    autoFocus={index === 0}
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={pin.some(d => !d)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Access Dashboard
              </button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-4">
              Forgot your PIN?{' '}
              <a href="/school/reset-pin" className="text-blue-600 hover:text-blue-700">
                Reset it here
              </a>
            </p>
          </div>
        )}

        {/* Verifying State */}
        {status === 'verifying' && (
          <div className="text-center py-8">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Verifying your PIN...</p>
          </div>
        )}

        {/* Success State */}
        {status === 'success' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-green-700 font-medium">Access granted!</p>
            <p className="text-gray-500 text-sm mt-1">Redirecting to dashboard...</p>
          </div>
        )}

        {/* Error State */}
        {status === 'error' && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <p className="text-red-700 font-medium mb-2">Access Denied</p>
            <p className="text-gray-600 text-sm mb-6">{error}</p>
            <a
              href="/school/login"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
