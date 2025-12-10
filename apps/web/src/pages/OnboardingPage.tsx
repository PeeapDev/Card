import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui';
import { IdCardScanner } from '@/components/kyc/IdCardScanner';
import { FaceLiveness } from '@/components/kyc/FaceLiveness';
import { supabase } from '@/lib/supabase';
import {
  CheckCircle,
  Phone,
  CreditCard,
  Camera,
  Building2,
  MapPin,
  FileText,
  Wallet,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  User,
  Store,
  Headphones,
  PartyPopper,
} from 'lucide-react';

// Step definitions for each account type
const PERSONAL_STEPS = [
  { id: 'welcome', title: 'Welcome', icon: PartyPopper },
  { id: 'phone', title: 'Verify Phone', icon: Phone },
  { id: 'id', title: 'ID Verification', icon: CreditCard },
  { id: 'face', title: 'Face Verification', icon: Camera },
  { id: 'complete', title: 'Complete', icon: CheckCircle },
];

const BUSINESS_STEPS = [
  { id: 'welcome', title: 'Welcome', icon: PartyPopper },
  { id: 'phone', title: 'Verify Phone', icon: Phone },
  { id: 'business', title: 'Business Docs', icon: FileText },
  { id: 'id', title: 'Owner ID', icon: CreditCard },
  { id: 'bank', title: 'Bank Details', icon: Wallet },
  { id: 'complete', title: 'Complete', icon: CheckCircle },
];

const AGENT_STEPS = [
  { id: 'welcome', title: 'Welcome', icon: PartyPopper },
  { id: 'phone', title: 'Verify Phone', icon: Phone },
  { id: 'id', title: 'ID Verification', icon: CreditCard },
  { id: 'face', title: 'Face Verification', icon: Camera },
  { id: 'agreement', title: 'Agent Agreement', icon: FileText },
  { id: 'location', title: 'Location Setup', icon: MapPin },
  { id: 'complete', title: 'Complete', icon: CheckCircle },
];

export function OnboardingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpError, setOtpError] = useState('');
  const [idVerified, setIdVerified] = useState(false);
  const [faceVerified, setFaceVerified] = useState(false);
  const [businessDocs, setBusinessDocs] = useState<File | null>(null);
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
  });
  const [agentAgreed, setAgentAgreed] = useState(false);

  // Determine account type from user roles
  const accountType = user?.roles?.includes('merchant')
    ? 'merchant'
    : user?.roles?.includes('agent')
      ? 'agent'
      : 'user';

  // Get steps based on account type
  const steps = accountType === 'merchant'
    ? BUSINESS_STEPS
    : accountType === 'agent'
      ? AGENT_STEPS
      : PERSONAL_STEPS;

  const currentStep = steps[currentStepIndex];
  const isLastStep = currentStepIndex === steps.length - 1;

  // Get account type info for display
  const accountTypeInfo = {
    user: { label: 'Personal Account', icon: User, color: 'text-blue-600 bg-blue-100' },
    merchant: { label: 'Business Account', icon: Store, color: 'text-green-600 bg-green-100' },
    agent: { label: 'Agent Account', icon: Headphones, color: 'text-orange-600 bg-orange-100' },
  }[accountType];

  const AccountIcon = accountTypeInfo.icon;

  // Handle next step
  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  // Handle previous step
  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  // Handle skip (for optional steps)
  const handleSkip = () => {
    goToNextStep();
  };

  // Send OTP for phone verification
  const sendOtp = async () => {
    setIsLoading(true);
    setOtpError('');
    try {
      // Simulate OTP sending
      await new Promise(resolve => setTimeout(resolve, 1500));
      setOtpSent(true);
    } catch (error) {
      setOtpError('Failed to send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const verifyOtp = async () => {
    setIsLoading(true);
    setOtpError('');
    try {
      // Simulate OTP verification (accept any 6-digit code for demo)
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (otpCode.length === 6) {
        // Update user's phone verification status
        if (user?.id) {
          await supabase
            .from('users')
            .update({ phone_verified: true })
            .eq('id', user.id);
        }
        goToNextStep();
      } else {
        setOtpError('Please enter a valid 6-digit code');
      }
    } catch (error) {
      setOtpError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle ID verification complete
  const handleIdComplete = async (result: any) => {
    setIdVerified(true);
    // Update KYC status in database
    if (user?.id) {
      await supabase
        .from('users')
        .update({
          kyc_status: 'SUBMITTED',
          kyc_tier: 1,
        })
        .eq('id', user.id);
    }
    goToNextStep();
  };

  // Handle face verification complete
  const handleFaceComplete = async (result: any) => {
    setFaceVerified(true);
    // Update KYC status in database
    if (user?.id) {
      await supabase
        .from('users')
        .update({
          kyc_status: 'VERIFIED',
          kyc_tier: 2,
        })
        .eq('id', user.id);
    }
    goToNextStep();
  };

  // Handle business document upload
  const handleBusinessDocUpload = async () => {
    setIsLoading(true);
    try {
      // Simulate document upload
      await new Promise(resolve => setTimeout(resolve, 1500));
      goToNextStep();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle bank details submission
  const handleBankSubmit = async () => {
    setIsLoading(true);
    try {
      // Simulate bank details save
      await new Promise(resolve => setTimeout(resolve, 1000));
      goToNextStep();
    } finally {
      setIsLoading(false);
    }
  };

  // Handle agent agreement
  const handleAgentAgreement = async () => {
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      goToNextStep();
    } finally {
      setIsLoading(false);
    }
  };

  // Complete onboarding
  const completeOnboarding = async () => {
    setIsLoading(true);
    try {
      // Update user onboarding status
      if (user?.id) {
        await supabase
          .from('users')
          .update({ onboarding_completed: true })
          .eq('id', user.id);
      }
      // Navigate to appropriate dashboard
      const dashboardPath = accountType === 'merchant'
        ? '/merchant'
        : accountType === 'agent'
          ? '/agent'
          : '/dashboard';
      navigate(dashboardPath);
    } finally {
      setIsLoading(false);
    }
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep.id) {
      case 'welcome':
        return (
          <div className="text-center space-y-6">
            <div className={`w-24 h-24 ${accountTypeInfo.color} rounded-full flex items-center justify-center mx-auto`}>
              <AccountIcon className="w-12 h-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Peeap, {user?.firstName}!
              </h2>
              <p className="text-gray-600">
                Let's complete your {accountTypeInfo.label.toLowerCase()} setup. This will only take a few minutes.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 text-left">
              <h3 className="font-medium text-gray-900 mb-3">What we'll need:</h3>
              <ul className="space-y-2">
                {steps.slice(1, -1).map((step, idx) => {
                  const StepIcon = step.icon;
                  return (
                    <li key={step.id} className="flex items-center gap-3 text-gray-700">
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                        <StepIcon className="w-4 h-4 text-primary-600" />
                      </div>
                      <span>{step.title}</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <Button onClick={goToNextStep} className="w-full">
              Get Started
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>

            <button
              onClick={() => navigate('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        );

      case 'phone':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="w-10 h-10 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Verify Your Phone</h2>
              <p className="text-gray-600">
                We'll send a verification code to {user?.phone || 'your phone'}
              </p>
            </div>

            {!otpSent ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  <p className="text-lg font-medium text-gray-900">{user?.phone}</p>
                </div>
                <Button onClick={sendOtp} className="w-full" isLoading={isLoading}>
                  Send Verification Code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
                    Enter the 6-digit code
                  </label>
                  <input
                    type="text"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="000000"
                  />
                  {otpError && (
                    <p className="mt-2 text-sm text-red-500 text-center">{otpError}</p>
                  )}
                </div>
                <Button onClick={verifyOtp} className="w-full" isLoading={isLoading} disabled={otpCode.length !== 6}>
                  Verify Code
                </Button>
                <button
                  onClick={sendOtp}
                  className="w-full text-sm text-primary-600 hover:text-primary-700"
                  disabled={isLoading}
                >
                  Resend Code
                </button>
              </div>
            )}

            <button
              onClick={handleSkip}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        );

      case 'id':
        return (
          <div className="space-y-4">
            <IdCardScanner
              expectedName={{ firstName: user?.firstName || '', lastName: user?.lastName || '' }}
              onComplete={handleIdComplete}
              onCancel={handleSkip}
            />
          </div>
        );

      case 'face':
        return (
          <div className="space-y-4">
            <FaceLiveness
              onComplete={handleFaceComplete}
              onCancel={handleSkip}
            />
          </div>
        );

      case 'business':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Business Verification</h2>
              <p className="text-gray-600">
                Upload your business registration documents
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <input
                  type="file"
                  id="business-doc"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setBusinessDocs(e.target.files?.[0] || null)}
                />
                <label htmlFor="business-doc" className="cursor-pointer">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-2">
                    {businessDocs ? businessDocs.name : 'Click to upload business registration'}
                  </p>
                  <p className="text-sm text-gray-400">PDF, JPG or PNG (max 10MB)</p>
                </label>
              </div>

              <Button onClick={handleBusinessDocUpload} className="w-full" isLoading={isLoading} disabled={!businessDocs}>
                Upload & Continue
              </Button>
            </div>

            <button
              onClick={handleSkip}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        );

      case 'bank':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Bank Account Details</h2>
              <p className="text-gray-600">
                Add your bank account for receiving payments
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bank Name</label>
                <select
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                >
                  <option value="">Select Bank</option>
                  <option value="SLB">Sierra Leone Commercial Bank</option>
                  <option value="RCB">Rokel Commercial Bank</option>
                  <option value="UBA">United Bank for Africa</option>
                  <option value="GTB">Guaranty Trust Bank</option>
                  <option value="ECO">Ecobank</option>
                  <option value="ZEN">Zenith Bank</option>
                  <option value="ACC">Access Bank</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Number</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter account number"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                <input
                  type="text"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter account holder name"
                  value={bankDetails.accountName}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                />
              </div>

              <Button
                onClick={handleBankSubmit}
                className="w-full"
                isLoading={isLoading}
                disabled={!bankDetails.bankName || !bankDetails.accountNumber || !bankDetails.accountName}
              >
                Save & Continue
              </Button>
            </div>

            <button
              onClick={handleSkip}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        );

      case 'agreement':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Agent Agreement</h2>
              <p className="text-gray-600">
                Please read and accept the agent terms and conditions
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto text-sm text-gray-700">
              <h3 className="font-semibold mb-2">Peeap Agent Terms of Service</h3>
              <p className="mb-2">By becoming a Peeap Agent, you agree to:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Maintain accurate records of all transactions</li>
                <li>Process customer deposits and withdrawals honestly</li>
                <li>Keep your agent float topped up for customer service</li>
                <li>Comply with all AML/KYC regulations</li>
                <li>Report suspicious transactions immediately</li>
                <li>Display your agent credentials at your location</li>
                <li>Provide receipts for all transactions</li>
                <li>Maintain customer confidentiality</li>
              </ul>
              <p className="mt-4">
                Commission rates: 0.5% on deposits, 0.75% on withdrawals.
                Maximum daily transaction limit: SLE 50,000,000.
              </p>
            </div>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={agentAgreed}
                onChange={(e) => setAgentAgreed(e.target.checked)}
                className="w-5 h-5 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the Agent Terms of Service
              </span>
            </label>

            <Button
              onClick={handleAgentAgreement}
              className="w-full"
              isLoading={isLoading}
              disabled={!agentAgreed}
            >
              Accept & Continue
            </Button>
          </div>
        );

      case 'location':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Agent Location</h2>
              <p className="text-gray-600">
                Confirm your operating location
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-2">Your registered location:</p>
              <p className="font-medium text-gray-900">
                {JSON.parse(localStorage.getItem('pendingAgentDetails') || '{}').agentLocation || 'Freetown'}
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
              <p className="font-medium mb-1">Location Verification</p>
              <p>Your location will be verified by our team. You'll receive confirmation within 24-48 hours.</p>
            </div>

            <Button onClick={goToNextStep} className="w-full">
              Confirm Location
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center space-y-6">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">You're All Set!</h2>
              <p className="text-gray-600">
                Your {accountTypeInfo.label.toLowerCase()} is ready to use.
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <h3 className="font-medium text-gray-900">Account Status:</h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Phone Verified</span>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">ID Verified</span>
                {idVerified ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Pending</span>
                )}
              </div>
              {accountType !== 'user' && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">{accountType === 'merchant' ? 'Business Docs' : 'Agent Status'}</span>
                  <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">Under Review</span>
                </div>
              )}
            </div>

            <Button onClick={completeOnboarding} className="w-full" isLoading={isLoading}>
              Go to Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  // If no user, redirect to login
  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/peeap-logo.svg" alt="Peeap" className="h-8" />
            <span className="font-semibold text-gray-900">Setup</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${accountTypeInfo.color}`}>
            <AccountIcon className="w-4 h-4" />
            {accountTypeInfo.label}
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="bg-white px-4 py-4 shadow-sm">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isActive = idx === currentStepIndex;
              const isCompleted = idx < currentStepIndex;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  {idx < steps.length - 1 && (
                    <div
                      className={`w-8 sm:w-12 h-1 mx-1 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-center">
            <p className="text-sm font-medium text-gray-900">{currentStep.title}</p>
            <p className="text-xs text-gray-500">Step {currentStepIndex + 1} of {steps.length}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm p-6">
          {renderStepContent()}
        </div>
      </div>

      {/* Footer Navigation */}
      {currentStep.id !== 'welcome' && currentStep.id !== 'complete' && (
        <div className="bg-white border-t border-gray-200 px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <button
              onClick={goToPrevStep}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
              disabled={currentStepIndex === 0}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <span className="text-sm text-gray-500">
              {currentStepIndex + 1} / {steps.length}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
