import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GraduationCap, CheckCircle, BookOpen, Code, Wallet, Users, Shield, ExternalLink, ArrowRight, Loader2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

type PageState = 'loading' | 'setup' | 'complete';

export function SchoolRegisterPage() {
  const [searchParams] = useSearchParams();
  const [pageState, setPageState] = useState<PageState>('loading');
  const [setupStep, setSetupStep] = useState(1);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Get return URL from query params (from School SaaS)
  const returnUrl = searchParams.get('return_url');

  useEffect(() => {
    // Store return URL for after setup
    if (returnUrl) {
      sessionStorage.setItem('school_return_url', returnUrl);
    }

    // Check if user is authenticated
    if (!isAuthenticated) {
      // Not logged in - redirect to my.peeap.com for registration/login
      const currentUrl = window.location.href;
      const authUrl = `https://my.peeap.com/register?redirect=${encodeURIComponent(currentUrl)}`;
      window.location.href = authUrl;
      return;
    }

    // User is authenticated - show setup wizard or complete page
    // Check if they've completed setup (has wallet PIN)
    checkSetupStatus();
  }, [isAuthenticated, returnUrl]);

  const checkSetupStatus = async () => {
    try {
      // Check if user has completed setup (has transaction PIN)
      // For now, just show setup page
      setPageState('setup');
    } catch (error) {
      console.error('Error checking setup status:', error);
      setPageState('setup');
    }
  };

  const handleSetupComplete = () => {
    setPageState('complete');
  };

  const handleReturnToSchool = () => {
    const storedReturnUrl = sessionStorage.getItem('school_return_url');
    if (storedReturnUrl) {
      sessionStorage.removeItem('school_return_url');
      window.location.href = storedReturnUrl;
    } else {
      navigate('/school');
    }
  };

  // Loading state
  if (pageState === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Setting up your school account...</p>
        </div>
      </div>
    );
  }

  // Setup wizard
  if (pageState === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="container mx-auto px-4 py-12">
          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-2xl font-bold">Peeap School</h1>
              <p className="text-blue-200 text-sm">Education Payment Portal</p>
            </div>
          </div>

          {/* Setup Card */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome, {user?.firstName || 'School Admin'}!</h2>
                <p className="text-gray-500 mt-2">
                  Let's set up your school for Peeap Pay
                </p>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center justify-center mb-8">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      setupStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}>
                      {setupStep > step ? <CheckCircle className="h-5 w-5" /> : step}
                    </div>
                    {step < 3 && (
                      <div className={`w-16 h-1 ${
                        setupStep > step ? 'bg-blue-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Step Content */}
              {setupStep === 1 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Step 1: Account Verified</h3>
                    <p className="text-blue-700">
                      Your Peeap account has been created successfully. You're logged in as <strong>{user?.email}</strong>.
                    </p>
                  </div>
                  <button
                    onClick={() => setSetupStep(2)}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </button>
                </div>
              )}

              {setupStep === 2 && (
                <div className="space-y-6">
                  <div className="bg-blue-50 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-2">Step 2: Create Wallet PIN</h3>
                    <p className="text-blue-700 mb-4">
                      Create a 4-digit PIN for quick access from your school dashboard.
                      This PIN will be used instead of your full password when accessing from the school system.
                    </p>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <p className="text-amber-800 text-sm">
                        <strong>Note:</strong> You can set up your wallet PIN in the dashboard settings.
                        For now, continue to complete the registration.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setSetupStep(1)}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setSetupStep(3)}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                      Continue
                      <ArrowRight className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}

              {setupStep === 3 && (
                <div className="space-y-6">
                  <div className="bg-green-50 rounded-xl p-6">
                    <h3 className="font-semibold text-green-900 mb-2">Step 3: Connect Your School</h3>
                    <p className="text-green-700 mb-4">
                      Return to your school system and click "Connect with Peeap" in Payment Settings to complete the integration.
                    </p>
                    <div className="bg-white rounded-lg p-4 border border-green-200">
                      <p className="text-sm text-gray-600 mb-2">What happens next:</p>
                      <ul className="text-sm text-gray-700 space-y-1">
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          School will be linked to your Peeap account
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Students can link their wallets
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Quick PIN access from school dashboard
                        </li>
                      </ul>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setSetupStep(2)}
                      className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSetupComplete}
                      className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                    >
                      Complete Setup
                      <CheckCircle className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Complete - show success and return button
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div className="text-white">
            <h1 className="text-2xl font-bold">Peeap School</h1>
            <p className="text-blue-200 text-sm">Education Payment Portal</p>
          </div>
        </div>

        {/* Success Card */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8 mb-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Setup Complete!</h2>
              <p className="text-gray-500 mt-2">
                Your Peeap account is ready. Now connect it to your school system.
              </p>
            </div>

            {/* Next Steps */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Final Step: Connect Your School
              </h3>
              <ol className="space-y-4 text-sm text-blue-800">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <div>
                    <strong>Return to School System</strong>
                    <p className="text-blue-600 mt-1">
                      Click the button below to go back to your school's Payment Settings.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <div>
                    <strong>Click "Connect with Peeap"</strong>
                    <p className="text-blue-600 mt-1">
                      This will link your school to your Peeap account via secure SSO.
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <div>
                    <strong>Start Using Peeap Pay</strong>
                    <p className="text-blue-600 mt-1">
                      Enable student wallets, manage vendors, and collect fees!
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            {/* Features */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Code className="h-5 w-5 text-purple-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">For Developers</h4>
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  Integrate Peeap Pay into your school management system using our OAuth SSO.
                </p>
                <a
                  href="/school/docs"
                  className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                >
                  View API Documentation
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>

              <div className="border border-gray-200 rounded-xl p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Wallet className="h-5 w-5 text-green-600" />
                  </div>
                  <h4 className="font-semibold text-gray-900">Payment Features</h4>
                </div>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Student wallet payments
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Fee collection
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Vendor management
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Real-time notifications
                  </li>
                </ul>
              </div>
            </div>

            {/* Quick Access Info */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900">Quick Access from School Dashboard</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Once connected, you can access Peeap Pay directly from your school dashboard using just your wallet PIN -
                    no need to enter your full credentials each time!
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={handleReturnToSchool}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
              >
                Return to School System
                <ArrowRight className="h-5 w-5" />
              </button>
              <button
                onClick={() => navigate('/school')}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Go to Peeap Dashboard
              </button>
            </div>
          </div>

          {/* Support Info */}
          <div className="text-center text-blue-200 text-sm">
            <p>Need help? Contact us at <a href="mailto:schools@peeap.com" className="text-white hover:underline">schools@peeap.com</a></p>
          </div>
        </div>
      </div>
    </div>
  );
}
