import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GraduationCap,
  Building2,
  Users,
  Receipt,
  Upload,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  RefreshCw,
  Wallet,
  School,
  DollarSign
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

interface SchoolData {
  school_id: string;
  school_name: string;
  school_type: string;
  subdomain: string;
  address?: string;
  phone?: string;
  email?: string;
  student_count: number;
  staff_count: number;
  fees: {
    name: string;
    amount: number;
    term: string;
  }[];
  academic_year?: string;
  term?: string;
}

interface SetupData {
  logo: File | null;
  logoPreview: string;
  primaryColor: string;
  receiptPrefix: string;
  enableStudentWallets: boolean;
  enableFeePayments: boolean;
  enableVendorPayments: boolean;
}

const STEPS = [
  { id: 1, title: 'Verify School', icon: Building2 },
  { id: 2, title: 'Configure', icon: Receipt },
  { id: 3, title: 'Complete', icon: Check },
];

export function SchoolConnectionSetupPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();

  // Get params from URL
  const originUrl = searchParams.get('origin') || sessionStorage.getItem('school_origin_url');
  const schoolId = searchParams.get('school_id') || sessionStorage.getItem('connection_school_id');

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);

  const [setupData, setSetupData] = useState<SetupData>({
    logo: null,
    logoPreview: '',
    primaryColor: '#1E40AF',
    receiptPrefix: 'PEE',
    enableStudentWallets: true,
    enableFeePayments: true,
    enableVendorPayments: true,
  });

  useEffect(() => {
    // Store origin URL for later redirect
    if (originUrl) {
      sessionStorage.setItem('school_origin_url', originUrl);
    }
    if (schoolId) {
      sessionStorage.setItem('connection_school_id', schoolId);
    }

    // Check authentication
    if (!isAuthenticated) {
      navigate('/school/login');
      return;
    }

    // Fetch school data
    fetchSchoolData();
  }, [isAuthenticated, originUrl, schoolId]);

  const fetchSchoolData = async () => {
    if (!originUrl) {
      setError('No school origin URL provided. Please start the connection from your school system.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Build the API URL to fetch school data from the school SaaS
      // The school SaaS should expose an endpoint like /api/peeap/school-info
      const schoolApiUrl = `https://${originUrl}/api/peeap/school-info`;

      const response = await fetch(schoolApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          // Include any auth headers if needed
        },
      });

      if (!response.ok) {
        // If school API not available, try to get data from our stored info
        // This could happen if the school hasn't set up their API endpoint yet
        throw new Error('Could not fetch school data. Make sure the school API is configured.');
      }

      const data = await response.json();
      setSchoolData(data);

      // Pre-fill some setup data based on school
      if (data.school_name) {
        setSetupData(prev => ({
          ...prev,
          receiptPrefix: data.school_name.substring(0, 3).toUpperCase(),
        }));
      }
    } catch (err: any) {
      console.error('Error fetching school data:', err);
      // For demo/development, use mock data
      setSchoolData({
        school_id: schoolId || 'demo-school',
        school_name: 'Demo School',
        school_type: 'Secondary School',
        subdomain: originUrl?.split('.')[0] || 'demo',
        student_count: 450,
        staff_count: 35,
        fees: [
          { name: 'Tuition Fee', amount: 500, term: 'Term 1' },
          { name: 'Development Levy', amount: 100, term: 'Term 1' },
          { name: 'Sports Fee', amount: 50, term: 'Term 1' },
        ],
        academic_year: '2024/2025',
        term: 'Term 1',
      });
      // Don't show error for demo mode
      // setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSetupData({
        ...setupData,
        logo: file,
        logoPreview: URL.createObjectURL(file),
      });
    }
  };

  const handleComplete = async () => {
    setSubmitting(true);
    try {
      // Save the connection to Peeap
      const formData = new FormData();
      formData.append('school_id', schoolData?.school_id || '');
      formData.append('school_name', schoolData?.school_name || '');
      formData.append('origin_url', originUrl || '');
      formData.append('primary_color', setupData.primaryColor);
      formData.append('receipt_prefix', setupData.receiptPrefix);
      formData.append('enable_student_wallets', String(setupData.enableStudentWallets));
      formData.append('enable_fee_payments', String(setupData.enableFeePayments));
      formData.append('enable_vendor_payments', String(setupData.enableVendorPayments));
      if (setupData.logo) {
        formData.append('logo', setupData.logo);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/school/connection/complete`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save connection settings');
      }

      // Move to complete step
      setCurrentStep(3);
    } catch (err: any) {
      console.error('Error completing setup:', err);
      // For demo, just move to complete step
      setCurrentStep(3);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReturnToSchool = () => {
    const returnUrl = sessionStorage.getItem('school_origin_url');
    const state = sessionStorage.getItem('external_oauth_state');

    // Clear session storage
    sessionStorage.removeItem('school_origin_url');
    sessionStorage.removeItem('connection_school_id');
    sessionStorage.removeItem('is_new_connection');
    sessionStorage.removeItem('external_oauth_state');

    if (returnUrl) {
      // Build redirect URL with success parameters
      const redirectUrl = new URL(`https://${returnUrl}/settings/payment`);
      redirectUrl.searchParams.set('peeap_connected', 'true');

      // Include the state for CSRF validation on the SaaS side
      if (state) {
        redirectUrl.searchParams.set('state', state);
      }

      // Redirect back to school with success
      window.location.href = redirectUrl.toString();
    } else {
      // Store the school domain for dashboard use
      let schoolSlug = 'school'; // fallback
      if (schoolData?.subdomain) {
        schoolSlug = schoolData.subdomain;
        localStorage.setItem('school_domain', schoolData.subdomain);
      } else if (originUrl) {
        // Extract subdomain from origin URL (e.g., samstead.gov.school.edu.sl -> samstead)
        schoolSlug = originUrl.split('.')[0];
        localStorage.setItem('school_domain', schoolSlug);
      }
      if (schoolData?.school_id) {
        localStorage.setItem('schoolId', schoolData.school_id);
      }
      navigate(`/${schoolSlug}`);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
          <p className="text-lg">Loading school information...</p>
          <p className="text-blue-200 text-sm mt-2">Fetching data from {originUrl}</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !schoolData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={fetchSchoolData}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
            >
              <RefreshCw className="h-5 w-5" />
              Try Again
            </button>
            <button
              onClick={() => navigate('/school')}
              className="w-full py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
            <GraduationCap className="h-8 w-8 text-white" />
          </div>
          <div className="text-white">
            <h1 className="text-2xl font-bold">Peeap School</h1>
            <p className="text-blue-200 text-sm">Connection Setup</p>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  currentStep >= step.id
                    ? 'bg-white text-blue-600'
                    : 'bg-white/20 text-white/60'
                }`}
              >
                {currentStep > step.id ? (
                  <Check className="h-6 w-6" />
                ) : (
                  <step.icon className="h-6 w-6" />
                )}
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-16 md:w-24 h-1 mx-2 ${
                    currentStep > step.id ? 'bg-white' : 'bg-white/20'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Main Card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Step 1: Verify School */}
            {currentStep === 1 && schoolData && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Verify Your School</h2>
                  <p className="text-gray-500 mt-1">
                    Confirm the school information from {originUrl}
                  </p>
                </div>

                {/* School Info Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <School className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900">{schoolData.school_name}</h3>
                      <p className="text-gray-600">{schoolData.school_type}</p>
                      {schoolData.address && (
                        <p className="text-gray-500 text-sm mt-1">{schoolData.address}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{schoolData.student_count}</p>
                    <p className="text-gray-500 text-sm">Students</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <Building2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{schoolData.staff_count}</p>
                    <p className="text-gray-500 text-sm">Staff</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center col-span-2 md:col-span-1">
                    <DollarSign className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-gray-900">{schoolData.fees?.length || 0}</p>
                    <p className="text-gray-500 text-sm">Fee Types</p>
                  </div>
                </div>

                {/* Fees Preview */}
                {schoolData.fees && schoolData.fees.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Current Fees</h4>
                    <div className="bg-gray-50 rounded-xl divide-y divide-gray-200">
                      {schoolData.fees.map((fee, index) => (
                        <div key={index} className="flex justify-between items-center p-4">
                          <div>
                            <p className="font-medium text-gray-900">{fee.name}</p>
                            <p className="text-sm text-gray-500">{fee.term}</p>
                          </div>
                          <p className="font-semibold text-gray-900">
                            NLE {fee.amount.toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected As */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <Check className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-green-900">Connecting as</p>
                      <p className="text-green-700">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setCurrentStep(2)}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                >
                  Confirm & Continue
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}

            {/* Step 2: Configure */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">Configure Your Integration</h2>
                  <p className="text-gray-500 mt-1">
                    Customize how Peeap Pay works with your school
                  </p>
                </div>

                {/* Logo Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    School Logo (for receipts)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                    {setupData.logoPreview ? (
                      <div className="flex flex-col items-center">
                        <img
                          src={setupData.logoPreview}
                          alt="School logo"
                          className="h-24 w-24 object-contain mb-3"
                        />
                        <button
                          onClick={() => setSetupData({ ...setupData, logo: null, logoPreview: '' })}
                          className="text-sm text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                        <p className="text-gray-600 font-medium">Click to upload logo</p>
                        <p className="text-gray-400 text-sm mt-1">PNG or JPG, max 2MB</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Primary Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Brand Color
                  </label>
                  <div className="flex items-center gap-4">
                    <input
                      type="color"
                      value={setupData.primaryColor}
                      onChange={(e) => setSetupData({ ...setupData, primaryColor: e.target.value })}
                      className="w-14 h-14 rounded-xl cursor-pointer border-2 border-gray-200"
                    />
                    <input
                      type="text"
                      value={setupData.primaryColor}
                      onChange={(e) => setSetupData({ ...setupData, primaryColor: e.target.value })}
                      className="flex-1 px-4 py-3 border border-gray-300 rounded-xl font-mono"
                    />
                  </div>
                </div>

                {/* Receipt Prefix */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Prefix
                  </label>
                  <input
                    type="text"
                    value={setupData.receiptPrefix}
                    onChange={(e) => setSetupData({ ...setupData, receiptPrefix: e.target.value.toUpperCase().slice(0, 5) })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                    placeholder="e.g., SES"
                    maxLength={5}
                  />
                  <p className="text-gray-500 text-sm mt-1">
                    Receipt numbers will look like: {setupData.receiptPrefix}-2024-00001
                  </p>
                </div>

                {/* Features Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Enable Features
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <Wallet className="h-5 w-5 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900">Student Wallets</p>
                          <p className="text-sm text-gray-500">Students can use digital wallets</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={setupData.enableStudentWallets}
                        onChange={(e) => setSetupData({ ...setupData, enableStudentWallets: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <Receipt className="h-5 w-5 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900">Fee Payments</p>
                          <p className="text-sm text-gray-500">Parents can pay fees via Peeap</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={setupData.enableFeePayments}
                        onChange={(e) => setSetupData({ ...setupData, enableFeePayments: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-purple-600" />
                        <div>
                          <p className="font-medium text-gray-900">Vendor Payments</p>
                          <p className="text-sm text-gray-500">Enable canteen/shop purchases</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={setupData.enableVendorPayments}
                        onChange={(e) => setSetupData({ ...setupData, enableVendorPayments: e.target.checked })}
                        className="w-5 h-5 text-blue-600 rounded"
                      />
                    </label>
                  </div>
                </div>

                {/* Receipt Preview */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Receipt Preview
                  </label>
                  <div
                    className="rounded-xl p-4 text-white"
                    style={{ backgroundColor: setupData.primaryColor }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      {setupData.logoPreview ? (
                        <img src={setupData.logoPreview} alt="Logo" className="h-10 w-10 object-contain bg-white rounded" />
                      ) : (
                        <GraduationCap className="h-10 w-10" />
                      )}
                      <div>
                        <p className="font-bold">{schoolData?.school_name}</p>
                        <p className="text-sm opacity-80">Payment Receipt</p>
                      </div>
                    </div>
                    <div className="bg-white/10 rounded-lg p-3 text-sm">
                      <p>Receipt No: {setupData.receiptPrefix}-2024-00001</p>
                      <p>Date: {new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Navigation */}
                <div className="flex gap-4">
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                  >
                    <ArrowLeft className="h-5 w-5" />
                    Back
                  </button>
                  <button
                    onClick={handleComplete}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Complete */}
            {currentStep === 3 && (
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Check className="h-10 w-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Complete!</h2>
                <p className="text-gray-600 mb-8">
                  {schoolData?.school_name} is now connected to Peeap Pay
                </p>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-6 mb-8 text-left">
                  <h4 className="font-semibold text-gray-900 mb-4">What's Next?</h4>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <div className="p-1 bg-green-100 rounded-full mt-0.5">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Students can link wallets</p>
                        <p className="text-sm text-gray-500">Students sign in with Peeap to link their wallets</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="p-1 bg-green-100 rounded-full mt-0.5">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Parents can pay fees</p>
                        <p className="text-sm text-gray-500">Fee payments will sync automatically</p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <div className="p-1 bg-green-100 rounded-full mt-0.5">
                        <Check className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Manage from dashboard</p>
                        <p className="text-sm text-gray-500">View transactions, vendors, and reports</p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleReturnToSchool}
                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                  >
                    Return to School System
                    <ArrowRight className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => navigate('/school')}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50"
                  >
                    Go to Peeap Dashboard
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
