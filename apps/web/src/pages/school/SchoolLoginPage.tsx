import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, Building2, KeyRound, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type LoginMode = 'credentials' | 'pin';

export function SchoolLoginPage() {
  const [searchParams] = useSearchParams();
  const [loginMode, setLoginMode] = useState<LoginMode>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Check if coming from school dashboard with quick_access param
  useEffect(() => {
    const quickAccess = searchParams.get('quick_access');
    const userId = searchParams.get('user_id');
    const schoolId = searchParams.get('school_id');

    if (quickAccess === 'true' && userId) {
      setLoginMode('pin');
      // Store context for PIN verification
      sessionStorage.setItem('pin_auth_user_id', userId);
      if (schoolId) sessionStorage.setItem('pin_auth_school_id', schoolId);
    }
  }, [searchParams]);

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
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      const prevInput = document.getElementById(`pin-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const pinCode = pin.join('');
    if (pinCode.length !== 4) {
      setError('Please enter your 4-digit PIN');
      return;
    }

    setLoading(true);

    try {
      const userId = sessionStorage.getItem('pin_auth_user_id');

      // Verify PIN against user's wallet PIN
      // This would call an API endpoint to verify the PIN
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, pin: pinCode }),
      });

      if (!response.ok) {
        throw new Error('Invalid PIN');
      }

      const data = await response.json();

      // Store tokens and navigate
      if (data.access_token) {
        localStorage.setItem('accessToken', data.access_token);
        localStorage.setItem('refreshToken', data.refresh_token);
      }

      // Clear session storage
      sessionStorage.removeItem('pin_auth_user_id');
      sessionStorage.removeItem('pin_auth_school_id');

      navigate('/school');
    } catch (err: any) {
      setError(err.message || 'Invalid PIN. Please try again.');
      setPin(['', '', '', '']);
      document.getElementById('pin-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login({ email, password });
      navigate('/school');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <GraduationCap className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Peeap School</h1>
              <p className="text-blue-200 text-sm">Education Payment Portal</p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h2 className="text-4xl font-bold leading-tight">
              Simplify Your School's
              <br />
              <span className="text-blue-200">Payment Management</span>
            </h2>
            <p className="mt-4 text-blue-100 text-lg max-w-md">
              Manage fees, salaries, invoices, and student wallets all in one place.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold">500+</div>
              <div className="text-blue-200 text-sm">Schools Using Peeap</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-blue-200 text-sm">Students Connected</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold">SLE 2B+</div>
              <div className="text-blue-200 text-sm">Fees Processed</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="text-3xl font-bold">98%</div>
              <div className="text-blue-200 text-sm">Collection Rate</div>
            </div>
          </div>
        </div>

        <div className="text-blue-200 text-sm">
          © 2026 Peeap. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">Peeap School</h1>
              <p className="text-blue-200 text-sm">Education Payment Portal</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* PIN Entry Mode */}
            {loginMode === 'pin' ? (
              <>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <KeyRound className="h-8 w-8 text-blue-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Enter Your PIN</h2>
                  <p className="text-gray-500 mt-2">Enter your 4-digit wallet PIN to access</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handlePinSubmit} className="space-y-6">
                  <div className="flex justify-center gap-3">
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
                    disabled={loading || pin.some(d => !d)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        Verify & Access
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <button
                    onClick={() => setLoginMode('credentials')}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Use Email & Password Instead
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Credentials Mode */}
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-gray-900">Welcome Back</h2>
                  <p className="text-gray-500 mt-2">Sign in to your school dashboard</p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@school.edu"
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Remember me</span>
                </label>
                <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            {/* SSO Option */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="relative mb-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  // Generate CSRF state token
                  const state = crypto.randomUUID();
                  sessionStorage.setItem('peeap_oauth_state', state);
                  // Redirect to OAuth authorization
                  const params = new URLSearchParams({
                    client_id: 'school-portal',
                    redirect_uri: window.location.origin + '/auth/callback',
                    response_type: 'code',
                    scope: 'school_admin',
                    state: state,
                  });
                  window.location.href = `https://my.peeap.com/auth/authorize?${params.toString()}`;
                }}
                className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                <Building2 className="h-5 w-5 text-blue-600" />
                Sign in with Peeap Account
              </button>
            </div>

            <p className="mt-6 text-center text-gray-600 text-sm">
              Don't have an account?{' '}
              <Link to="/school/register" className="text-blue-600 hover:text-blue-700 font-medium">
                Register your school
              </Link>
            </p>
              </>
            )}
          </div>

          <p className="mt-6 text-center text-blue-200 text-sm lg:hidden">
            © 2026 Peeap. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
