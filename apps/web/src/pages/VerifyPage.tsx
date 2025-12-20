import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  verifySierraLeoneId,
  getVerificationStatus,
  getProviderKyc,
  initiatePhoneOtp,
  verifyPhoneOtp,
  fileToBase64,
  normalizeSLPhoneNumber,
  detectProvider,
  VerificationStatus,
  VerificationResult,
} from '@/services/verification.service';

type Step = 'review-info' | 'id-scan' | 'phone-verify' | 'processing' | 'result';

interface UserInfo {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  dateOfBirth: string;
  gender: string;
  address: string;
}

export const VerifyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('review-info');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<VerificationStatus | null>(null);

  // User info state (pre-filled from registration)
  const [userInfo, setUserInfo] = useState<UserInfo>({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    address: '',
  });
  const [infoConfirmed, setInfoConfirmed] = useState(false);

  // ID Card state
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [idCardPreview, setIdCardPreview] = useState<string | null>(null);

  // Phone verification state
  const [provider, setProvider] = useState<string>('');
  const [simName, setSimName] = useState<string | null>(null);
  const [otpRequestId, setOtpRequestId] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);

  // Result state
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load user info from auth context
  useEffect(() => {
    if (user) {
      setUserInfo({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phoneNumber: user.phone || '',
        dateOfBirth: '',
        gender: '',
        address: '',
      });

      // Detect provider from phone
      const phone = user.phone || '';
      if (phone) {
        setProvider(detectProvider(phone));
      }
    }
  }, [user]);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const s = await getVerificationStatus();
      setStatus(s);
      if (s.overallVerified) {
        setStep('result');
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const handleInfoChange = (field: keyof UserInfo, value: string) => {
    setUserInfo(prev => ({ ...prev, [field]: value }));
    if (field === 'phoneNumber') {
      setProvider(detectProvider(value));
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIdCardFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setIdCardPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleVerifyPhone = async () => {
    if (!userInfo.phoneNumber) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const normalized = normalizeSLPhoneNumber(userInfo.phoneNumber);

      // First try to get SIM name from Monime
      const kycResult = await getProviderKyc(normalized, provider);

      if (kycResult.success && kycResult.data) {
        setSimName(kycResult.data.accountHolderName);
        setPhoneVerified(true);
      } else {
        // Fallback to OTP verification
        const otpResult = await initiatePhoneOtp(normalized);
        if (otpResult.success && otpResult.requestId) {
          setOtpRequestId(otpResult.requestId);
        } else {
          setError(otpResult.message || 'Failed to send verification code');
        }
      }
    } catch (error: any) {
      setError(error.message || 'Phone verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpRequestId || otp.length !== 6) return;

    setLoading(true);
    setError(null);

    try {
      const normalized = normalizeSLPhoneNumber(userInfo.phoneNumber);
      const result = await verifyPhoneOtp(normalized, otp, otpRequestId);

      if (result.verified) {
        setPhoneVerified(true);
        setOtpRequestId(null);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      setError(error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!idCardFile) {
      setError('Please upload your ID card');
      return;
    }

    setLoading(true);
    setError(null);
    setStep('processing');

    try {
      const base64 = await fileToBase64(idCardFile);
      const normalized = normalizeSLPhoneNumber(userInfo.phoneNumber);

      const verificationResult = await verifySierraLeoneId({
        idCardFrontBase64: base64,
        mimeType: idCardFile.type,
        phoneNumber: normalized,
      });

      setResult(verificationResult);
      setStep('result');

      if (verificationResult.verified) {
        await loadStatus();
      }
    } catch (error: any) {
      setError(error.message || 'Verification failed');
      setStep('id-scan');
    } finally {
      setLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { key: 'review-info', label: 'Review Info', number: 1 },
      { key: 'id-scan', label: 'ID Card', number: 2 },
      { key: 'phone-verify', label: 'Phone', number: 3 },
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => (
            <React.Fragment key={s.key}>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-colors ${
                  index < currentIndex
                    ? 'bg-green-500 text-white'
                    : index === currentIndex
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {index < currentIndex ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    s.number
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium hidden sm:block ${
                  index <= currentIndex ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {s.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-4 rounded ${
                  index < currentIndex ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderReviewInfo = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Review Your Information
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Please verify your details are correct. This information will be matched with your ID card.
      </p>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              First Name *
            </label>
            <input
              type="text"
              value={userInfo.firstName}
              onChange={(e) => handleInfoChange('firstName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Last Name *
            </label>
            <input
              type="text"
              value={userInfo.lastName}
              onChange={(e) => handleInfoChange('lastName', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone Number *
          </label>
          <div className="flex">
            <span className="inline-flex items-center px-3 border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-l-lg">
              +232
            </span>
            <input
              type="tel"
              value={userInfo.phoneNumber.replace('+232', '').replace(/^232/, '')}
              onChange={(e) => handleInfoChange('phoneNumber', e.target.value)}
              placeholder="76 123 456"
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {provider && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Provider: <span className="font-medium capitalize">{provider}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Date of Birth
          </label>
          <input
            type="date"
            value={userInfo.dateOfBirth}
            onChange={(e) => handleInfoChange('dateOfBirth', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Gender
          </label>
          <select
            value={userInfo.gender}
            onChange={(e) => handleInfoChange('gender', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address
          </label>
          <input
            type="text"
            value={userInfo.address}
            onChange={(e) => handleInfoChange('address', e.target.value)}
            placeholder="Enter your address"
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-start space-x-3 pt-4">
          <input
            type="checkbox"
            id="confirm-info"
            checked={infoConfirmed}
            onChange={(e) => setInfoConfirmed(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="confirm-info" className="text-sm text-gray-600 dark:text-gray-400">
            I confirm that the information above is correct and matches my official ID card
          </label>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="mt-6">
        <button
          onClick={() => {
            if (!userInfo.firstName || !userInfo.lastName || !userInfo.phoneNumber) {
              setError('Please fill in all required fields');
              return;
            }
            if (!infoConfirmed) {
              setError('Please confirm that your information is correct');
              return;
            }
            setError(null);
            setStep('id-scan');
          }}
          disabled={!infoConfirmed}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderIdScan = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Upload Your ID Card
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Take a clear photo of your Sierra Leone National ID card (front side)
      </p>

      {/* Sierra Leone ID Card Preview */}
      <div className="mb-6">
        <div className="bg-gradient-to-br from-green-700 via-green-600 to-blue-700 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                <span className="text-green-700 font-bold text-xs">SL</span>
              </div>
              <div>
                <p className="text-white text-xs font-semibold">REPUBLIC OF SIERRA LEONE</p>
                <p className="text-green-100 text-[10px]">NATIONAL ID CARD</p>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <div className="w-20 h-24 bg-white/20 rounded-lg flex items-center justify-center border-2 border-white/30">
              <svg className="w-10 h-10 text-white/50" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              <div>
                <p className="text-green-100 text-[10px]">FULL NAME</p>
                <p className="text-white text-sm font-medium">
                  {userInfo.firstName} {userInfo.lastName}
                </p>
              </div>
              <div>
                <p className="text-green-100 text-[10px]">NIN</p>
                <p className="text-white text-sm font-mono font-bold">XXXXXX-XXXXX</p>
              </div>
            </div>
          </div>
        </div>
        <p className="mt-2 text-center text-xs text-gray-500 dark:text-gray-400">
          Your ID card should look like this
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      {idCardPreview ? (
        <div className="mb-6">
          <div className="relative rounded-xl overflow-hidden border-2 border-green-500">
            <img
              src={idCardPreview}
              alt="ID Card Preview"
              className="w-full h-auto"
            />
            <button
              onClick={() => {
                setIdCardFile(null);
                setIdCardPreview(null);
              }}
              className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full shadow-lg"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-0 left-0 right-0 bg-green-500 text-white text-center py-2 text-sm font-medium">
              ID Card Captured
            </div>
          </div>
        </div>
      ) : (
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl flex flex-col items-center justify-center hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors mb-6"
        >
          <svg className="w-12 h-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-gray-600 dark:text-gray-400 font-medium">
            Tap to take photo or upload
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-500 mt-1">
            Make sure all corners are visible
          </span>
        </button>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setStep('review-info')}
          className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Back
        </button>
        <button
          onClick={() => {
            if (!idCardFile) {
              setError('Please upload your ID card');
              return;
            }
            setError(null);
            setStep('phone-verify');
          }}
          disabled={!idCardFile}
          className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  );

  const renderPhoneVerify = () => (
    <div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Verify Your Phone Number
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        We'll verify that your phone number is registered to you through your mobile provider
      </p>

      {/* Phone number display */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Phone Number</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">
              {normalizeSLPhoneNumber(userInfo.phoneNumber)}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {provider && (
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                provider === 'orange' ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                provider === 'africell' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
              }`}>
                {provider.charAt(0).toUpperCase() + provider.slice(1)}
              </span>
            )}
            {phoneVerified && (
              <span className="flex items-center text-green-600 dark:text-green-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* SIM Name Match */}
      {simName && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-800 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-green-800 dark:text-green-200">SIM Registered To:</p>
              <p className="text-green-700 dark:text-green-300">{simName}</p>
            </div>
          </div>
        </div>
      )}

      {/* OTP Input */}
      {otpRequestId && !phoneVerified && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Enter verification code sent to your phone
          </label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="000000"
            maxLength={6}
            className="w-full px-4 py-3 text-center text-2xl tracking-widest border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          onClick={() => setStep('id-scan')}
          className="flex-1 py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Back
        </button>

        {!phoneVerified && !otpRequestId && (
          <button
            onClick={handleVerifyPhone}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Verify Phone'
            )}
          </button>
        )}

        {otpRequestId && !phoneVerified && (
          <button
            onClick={handleVerifyOtp}
            disabled={loading || otp.length !== 6}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors"
          >
            {loading ? 'Verifying...' : 'Confirm Code'}
          </button>
        )}

        {phoneVerified && (
          <button
            onClick={handleSubmitVerification}
            disabled={loading}
            className="flex-1 py-3 px-4 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              'Complete Verification'
            )}
          </button>
        )}
      </div>
    </div>
  );

  const renderProcessing = () => (
    <div className="text-center py-12">
      <div className="w-20 h-20 mx-auto mb-6 relative">
        <svg className="animate-spin h-20 w-20 text-blue-600" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Verifying Your Identity
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Scanning ID card and matching with phone registration...
      </p>
      <div className="max-w-xs mx-auto">
        <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center justify-center space-x-2">
            <svg className="animate-pulse w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Processing ID card</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <svg className="animate-pulse w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Extracting NIN</span>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <svg className="animate-pulse w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Matching names</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResult = () => (
    <div className="text-center">
      {result?.verified || status?.overallVerified ? (
        <>
          <div className="w-24 h-24 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verification Complete!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your identity has been verified. You now have full access to all features.
          </p>

          {result?.nin && (
            <div className="mb-6 inline-block p-4 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-400">Your NIN</p>
              <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                {result.nin}
              </p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <svg className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-green-700 dark:text-green-300">Unlimited Transfers</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <svg className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              <p className="text-xs text-green-700 dark:text-green-300">Virtual Cards</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <svg className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-xs text-green-700 dark:text-green-300">Withdrawals</p>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="w-24 h-24 mx-auto bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-6">
            <svg className="w-12 h-12 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Verification Pending
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {result?.requiresManualReview
              ? 'Your verification requires manual review. We\'ll notify you once complete.'
              : 'There were some issues with your verification.'}
          </p>

          {result?.issues && result.issues.length > 0 && (
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg text-left max-w-sm mx-auto">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">Issues found:</p>
              <ul className="list-disc list-inside text-sm text-amber-700 dark:text-amber-300 space-y-1">
                {result.issues.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <button
        onClick={() => navigate('/dashboard')}
        className="w-full max-w-sm mx-auto py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
      >
        Go to Dashboard
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Identity Verification
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Verify your identity to unlock all features
          </p>
        </div>

        {/* Step indicator */}
        {step !== 'processing' && step !== 'result' && renderStepIndicator()}

        {/* Main content card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
          {step === 'review-info' && renderReviewInfo()}
          {step === 'id-scan' && renderIdScan()}
          {step === 'phone-verify' && renderPhoneVerify()}
          {step === 'processing' && renderProcessing()}
          {step === 'result' && renderResult()}
        </div>

        {/* Help text */}
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Need help? <a href="/support" className="text-blue-600 hover:underline">Contact support</a>
        </p>
      </div>
    </div>
  );
};

export default VerifyPage;
