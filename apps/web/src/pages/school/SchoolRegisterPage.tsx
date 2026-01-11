import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight, User, Phone, Building2,
  CheckCircle, BookOpen, Code, Wallet, Users, Shield, ExternalLink
} from 'lucide-react';
import { authService } from '@/services/auth.service';

type RegistrationStep = 'form' | 'success';

export function SchoolRegisterPage() {
  const [step, setStep] = useState<RegistrationStep>('form');
  const [formData, setFormData] = useState({
    schoolName: '',
    adminName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      // Register the school admin account
      await authService.register({
        email: formData.email,
        password: formData.password,
        firstName: formData.adminName.split(' ')[0],
        lastName: formData.adminName.split(' ').slice(1).join(' ') || '',
        phone: formData.phone,
        roles: ['user', 'school_admin'],
      });

      // Show success with integration instructions
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Success page with integration instructions
  if (step === 'success') {
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
                <h2 className="text-2xl font-bold text-gray-900">Registration Successful!</h2>
                <p className="text-gray-500 mt-2">
                  Welcome to Peeap Pay, {formData.schoolName || 'School Admin'}!
                </p>
              </div>

              {/* Next Steps */}
              <div className="bg-blue-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Next Steps to Integrate Peeap Pay
                </h3>
                <ol className="space-y-4 text-sm text-blue-800">
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                    <div>
                      <strong>Set Up Your Wallet PIN</strong>
                      <p className="text-blue-600 mt-1">
                        Log in to your dashboard and complete the setup wizard to create your wallet PIN.
                        This PIN will be used for quick access from your school system.
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                    <div>
                      <strong>Connect Your School System</strong>
                      <p className="text-blue-600 mt-1">
                        Go to Payment Settings in your school dashboard (gov.school.edu.sl) and click "Connect with Peeap".
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                    <div>
                      <strong>Enable Student Wallets</strong>
                      <p className="text-blue-600 mt-1">
                        Students can link their wallets via "Sign in with Peeap" to start making cashless payments.
                      </p>
                    </div>
                  </li>
                </ol>
              </div>

              {/* Integration Guide */}
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
                  onClick={() => navigate('/school/login')}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="h-5 w-5" />
                </button>
                <a
                  href="https://docs.peeap.com/schools"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  <BookOpen className="h-5 w-5" />
                  Read Full Documentation
                </a>
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

  // Registration Form
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
              Join 500+ Schools
              <br />
              <span className="text-blue-200">Using Peeap Pay</span>
            </h2>
            <p className="mt-4 text-blue-100 text-lg max-w-md">
              Register your school to enable cashless payments, fee collection, and student wallet management.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Wallet className="h-8 w-8 text-blue-200" />
              <div>
                <div className="font-semibold">Student Wallets</div>
                <div className="text-blue-200 text-sm">Cashless payments at school vendors</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Users className="h-8 w-8 text-blue-200" />
              <div>
                <div className="font-semibold">Parent Connect</div>
                <div className="text-blue-200 text-sm">Parents can top-up and monitor spending</div>
              </div>
            </div>
            <div className="flex items-center gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <Shield className="h-8 w-8 text-blue-200" />
              <div>
                <div className="font-semibold">Secure & Compliant</div>
                <div className="text-blue-200 text-sm">Bank-grade security for all transactions</div>
              </div>
            </div>
          </div>
        </div>

        <div className="text-blue-200 text-sm">
          © 2026 Peeap. All rights reserved.
        </div>
      </div>

      {/* Right Panel - Registration Form */}
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
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900">Register Your School</h2>
              <p className="text-gray-500 mt-2">Create an account to get started with Peeap Pay</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Name
                </label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="schoolName"
                    value={formData.schoolName}
                    onChange={handleChange}
                    placeholder="Government Secondary School"
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    name="adminName"
                    value={formData.adminName}
                    onChange={handleChange}
                    placeholder="John Doe"
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="admin@school.edu.sl"
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+232 76 123456"
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
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a strong password"
                    required
                    minLength={8}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    placeholder="Confirm your password"
                    required
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  required
                  className="w-4 h-4 mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600">
                  I agree to the <a href="/terms" className="text-blue-600 hover:underline">Terms of Service</a> and{' '}
                  <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>
                </span>
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
                    Create Account
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-6 text-center text-gray-600 text-sm">
              Already have an account?{' '}
              <Link to="/school/login" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </p>
          </div>

          <p className="mt-6 text-center text-blue-200 text-sm lg:hidden">
            © 2026 Peeap. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
