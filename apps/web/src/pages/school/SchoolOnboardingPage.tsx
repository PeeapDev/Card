import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  User,
  Palette,
  Globe,
  Check,
  ArrowRight,
  ArrowLeft,
  Upload,
  Loader2
} from 'lucide-react';

interface OnboardingData {
  // Step 1: School Details
  schoolName: string;
  schoolType: string;
  country: string;
  address: string;

  // Step 2: Admin Account
  adminName: string;
  adminEmail: string;
  adminPhone: string;
  adminPassword: string;

  // Step 3: Branding
  logo: File | null;
  logoPreview: string;
  primaryColor: string;

  // Step 4: Portal Verification
  portalUrl: string;
  verificationMethod: 'dns' | 'meta';
}

const STEPS = [
  { id: 1, title: 'School Details', icon: Building2 },
  { id: 2, title: 'Admin Account', icon: User },
  { id: 3, title: 'Branding', icon: Palette },
  { id: 4, title: 'Portal Verification', icon: Globe },
  { id: 5, title: 'Complete', icon: Check },
];

const SCHOOL_TYPES = [
  'Primary School',
  'Secondary School',
  'High School',
  'College',
  'University',
  'Vocational School',
  'Other',
];

export function SchoolOnboardingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');

  const [data, setData] = useState<OnboardingData>({
    schoolName: '',
    schoolType: '',
    country: 'Sierra Leone',
    address: '',
    adminName: '',
    adminEmail: '',
    adminPhone: '',
    adminPassword: '',
    logo: null,
    logoPreview: '',
    primaryColor: '#1E40AF',
    portalUrl: '',
    verificationMethod: 'meta',
  });

  useEffect(() => {
    // Validate session on mount
    validateSession();
  }, [sessionId]);

  const validateSession = async () => {
    if (!sessionId) {
      setSessionValid(false);
      setSessionError('No session ID provided. Please request a new registration link.');
      return;
    }

    try {
      // TODO: Call API to validate session
      // const response = await api.get(`/school/onboarding/validate?session=${sessionId}`);

      // For now, simulate validation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSessionValid(true);
      setVerificationCode(`peeap-verify-${sessionId.slice(0, 8)}`);
    } catch (error: any) {
      setSessionValid(false);
      setSessionError(error.message || 'Invalid or expired session');
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setData({
        ...data,
        logo: file,
        logoPreview: URL.createObjectURL(file),
      });
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // TODO: Submit to API
      // await api.post('/school/onboarding/complete', { sessionId, ...data });

      await new Promise(resolve => setTimeout(resolve, 2000));
      setCurrentStep(5);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Show loading while validating session
  if (sessionValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Validating session...</p>
        </div>
      </div>
    );
  }

  // Show error if session is invalid
  if (sessionValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 max-w-md text-center shadow-lg">
          <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full w-fit mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Link Expired</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">{sessionError}</p>
          <button
            onClick={() => navigate('/school/register')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Request New Link
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl w-fit mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Register Your School</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Set up Peeap Pay for your institution</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 px-4">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  currentStep >= step.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <step.icon className="h-5 w-5" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-12 lg:w-24 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
          {/* Step 1: School Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">School Details</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  value={data.schoolName}
                  onChange={(e) => setData({ ...data, schoolName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="ABC Academy"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  School Type
                </label>
                <select
                  value={data.schoolType}
                  onChange={(e) => setData({ ...data, schoolType: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">Select type...</option>
                  {SCHOOL_TYPES.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Country
                </label>
                <select
                  value={data.country}
                  onChange={(e) => setData({ ...data, country: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="Sierra Leone">Sierra Leone</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <textarea
                  value={data.address}
                  onChange={(e) => setData({ ...data, address: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  rows={2}
                  placeholder="123 Education Street, Freetown"
                />
              </div>
            </div>
          )}

          {/* Step 2: Admin Account */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Account</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                This person will manage the school's Peeap integration
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={data.adminName}
                  onChange={(e) => setData({ ...data, adminName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={data.adminEmail}
                  onChange={(e) => setData({ ...data, adminEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="admin@school.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={data.adminPhone}
                  onChange={(e) => setData({ ...data, adminPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="+232 76 123 4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={data.adminPassword}
                  onChange={(e) => setData({ ...data, adminPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Create a secure password"
                />
              </div>
            </div>
          )}

          {/* Step 3: Branding */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Customize Your Wallet</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Students will see your branding when using their school wallet
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  School Logo
                </label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  {data.logoPreview ? (
                    <div className="flex flex-col items-center">
                      <img
                        src={data.logoPreview}
                        alt="Logo preview"
                        className="h-20 w-20 object-contain mb-3"
                      />
                      <button
                        onClick={() => setData({ ...data, logo: null, logoPreview: '' })}
                        className="text-sm text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        Click to upload logo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">PNG or JPG, max 2MB</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="color"
                    value={data.primaryColor}
                    onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                    className="w-12 h-12 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={data.primaryColor}
                    onChange={(e) => setData({ ...data, primaryColor: e.target.value })}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
                  />
                </div>
              </div>

              {/* Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Preview
                </label>
                <div
                  className="rounded-lg p-4 text-white"
                  style={{ backgroundColor: data.primaryColor }}
                >
                  <div className="flex items-center gap-3">
                    {data.logoPreview ? (
                      <img src={data.logoPreview} alt="Logo" className="h-10 w-10 object-contain bg-white rounded" />
                    ) : (
                      <GraduationCap className="h-10 w-10" />
                    )}
                    <div>
                      <p className="font-semibold">{data.schoolName || 'School Name'} Wallet</p>
                      <p className="text-sm opacity-80">Powered by Peeap</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Portal Verification */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Verify Your Portal</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your student portal URL. This ensures only your students can link to your school.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Portal URL
                </label>
                <input
                  type="url"
                  value={data.portalUrl}
                  onChange={(e) => setData({ ...data, portalUrl: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="https://portal.school.edu"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Verification Method
                </label>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="verification"
                      checked={data.verificationMethod === 'meta'}
                      onChange={() => setData({ ...data, verificationMethod: 'meta' })}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Meta Tag</p>
                      <p className="text-sm text-gray-500">Add this to your portal's {'<head>'}:</p>
                      <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs break-all">
                        {`<meta name="peeap-verify" content="${verificationCode}" />`}
                      </code>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-4 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                    <input
                      type="radio"
                      name="verification"
                      checked={data.verificationMethod === 'dns'}
                      onChange={() => setData({ ...data, verificationMethod: 'dns' })}
                      className="mt-1"
                    />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">DNS Record</p>
                      <p className="text-sm text-gray-500">Add a TXT record to your domain:</p>
                      <code className="block mt-2 p-2 bg-gray-100 dark:bg-gray-900 rounded text-xs break-all">
                        {verificationCode}
                      </code>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">You're All Set!</h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {data.schoolName} is now registered with Peeap Pay
              </p>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6 text-left">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Steps:</p>
                <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
                  <li>Add the widget code to your student portal</li>
                  <li>Students click "Connect Wallet" to link their accounts</li>
                  <li>Manage everything from your dashboard</li>
                </ol>
              </div>

              <button
                onClick={() => navigate('/school')}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Navigation Buttons */}
          {currentStep < 5 && (
            <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={prevStep}
                disabled={currentStep === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  currentStep === 1
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <button
                onClick={nextStep}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : currentStep === 4 ? (
                  'Complete Registration'
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
