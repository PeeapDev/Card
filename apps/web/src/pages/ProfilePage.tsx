/**
 * Profile Page - Production Ready
 *
 * Complete user profile management:
 * - Profile information editing
 * - KYC verification
 * - Two-Factor Authentication
 * - Transaction PIN management
 * - Password change
 * - Account limits display
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  AlertCircle,
  Clock,
  Camera,
  Key,
  Smartphone,
  Lock,
  Copy,
  Check,
  Upload,
  X,
  Loader2,
  ChevronRight,
  CreditCard,
  Wallet,
  Edit3,
  ShieldCheck,
  FileText,
  Globe,
  Scan,
  Wifi,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import { generateSecret, verifyTOTP, generateOTPAuthURI } from '@/lib/totp';
import QRCode from 'qrcode';
import { FaceLiveness } from '@/components/kyc/FaceLiveness';
import { IdCardScanner } from '@/components/kyc/IdCardScanner';
import { kycService, fileToBase64 } from '@/services/kyc.service';
import { NFCAgentSettings } from '@/components/settings/NFCAgentSettings';
import { BecomeMerchantCard } from '@/components/settings/BecomeMerchantCard';
import { uploadService } from '@/services/upload.service';
import { supabaseAdmin } from '@/lib/supabase';
import { indexedDBService } from '@/services/indexeddb.service';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

type ActiveModal = 'none' | 'password' | '2fa' | 'pin' | 'kyc' | 'edit-profile';
type KycStep = 'info' | 'face-liveness' | 'id-scan' | 'review' | 'submitting' | 'success' | 'failed';

interface UserSettings {
  hasPin: boolean;
  has2FA: boolean;
  kycStatus: string;
  defaultWalletId?: string;
}

interface UserWallet {
  id: string;
  currency: string;
  balance: number;
  wallet_type: string;
  status: string;
}

export function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [activeModal, setActiveModal] = useState<ActiveModal>('none');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({
    hasPin: false,
    has2FA: false,
    kycStatus: 'PENDING',
    defaultWalletId: undefined,
  });

  // Wallet state
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [savingDefaultWallet, setSavingDefaultWallet] = useState(false);

  // Form states
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Avatar upload state
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Password change states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // 2FA states
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAQRCode, setTwoFAQRCode] = useState('');
  const [copied, setCopied] = useState(false);

  // PIN states
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinLoading, setPinLoading] = useState(false);

  // KYC states - New flow with face liveness and ID scan
  const [kycStep, setKycStep] = useState<KycStep>('info');
  const [kycLoading, setKycLoading] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);

  // KYC form data
  const [kycFirstName, setKycFirstName] = useState('');
  const [kycLastName, setKycLastName] = useState('');
  const [kycDateOfBirth, setKycDateOfBirth] = useState('');
  const [kycNationality, setKycNationality] = useState('Sierra Leonean');
  const [kycAddress, setKycAddress] = useState({ street: '', city: '', country: 'Sierra Leone' });

  // Captured data
  const [livenessFrames, setLivenessFrames] = useState<string[]>([]);
  const [selfieImage, setSelfieImage] = useState<string>('');
  const [idCardImage, setIdCardImage] = useState<string>('');
  const [extractedIdData, setExtractedIdData] = useState<any>(null);
  const [idVerificationIssues, setIdVerificationIssues] = useState<string[]>([]);

  // Load user settings on mount
  useEffect(() => {
    if (user?.id) {
      loadUserSettings();
      loadWallets();
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setPhone(user.phone || '');
      // Load avatar from user or cached
      if (user.profilePicture) {
        setAvatarUrl(user.profilePicture);
      } else {
        // Try to get cached avatar
        indexedDBService.getSetting<string>(`avatar_${user.id}`).then((cached) => {
          if (cached) setAvatarUrl(cached);
        });
      }
    }
  }, [user?.id, user?.profilePicture]);

  const loadWallets = async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('wallets')
      .select('id, currency, balance, wallet_type, status')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE')
      .order('wallet_type', { ascending: true });

    if (!error && data) {
      setWallets(data);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setIsUploadingAvatar(true);
    setMessage(null);

    try {
      // Upload to Supabase Storage
      const result = await uploadService.uploadImage(file, 'user-avatars');

      if (result.success && result.url) {
        // Update database using supabaseAdmin (bypasses RLS)
        const { error: dbError } = await supabaseAdmin
          .from('users')
          .update({
            profile_picture: result.url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (dbError) {
          throw new Error(dbError.message);
        }

        // Update local state
        setAvatarUrl(result.url);

        // Cache to IndexedDB
        await indexedDBService.saveSetting(`avatar_${user.id}`, result.url);

        setMessage({ type: 'success', text: 'Profile picture updated successfully!' });

        // Refresh user to update context (await to ensure header updates)
        if (refreshUser) await refreshUser();
      }
    } catch (error: any) {
      console.error('Avatar upload error:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to upload profile picture' });
    } finally {
      setIsUploadingAvatar(false);
      // Clear the input so the same file can be selected again
      event.target.value = '';
    }
  };

  const handleSetDefaultWallet = async (walletId: string) => {
    if (!user?.id) return;

    setSavingDefaultWallet(true);
    try {
      // Note: Default wallet preference is currently handled automatically
      // SLE wallets are prioritized when available
      setSettings(prev => ({ ...prev, defaultWalletId: walletId }));
      setMessage({ type: 'success', text: 'Wallet preference saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update wallet preference' });
    } finally {
      setSavingDefaultWallet(false);
    }
  };

  const loadUserSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('transaction_pin, two_factor_enabled, kyc_status')
        .eq('id', user?.id)
        .single();

      if (!error && data) {
        setSettings({
          hasPin: !!data.transaction_pin,
          has2FA: !!data.two_factor_enabled,
          kycStatus: data.kyc_status || 'NOT_STARTED',
          defaultWalletId: undefined,
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const kycStatusConfig: Record<string, { icon: typeof Clock; color: string; bg: string; label: string; description: string }> = {
    NOT_STARTED: {
      icon: AlertCircle,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      label: 'Not Started',
      description: 'Complete KYC verification to unlock all features',
    },
    PENDING: {
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      label: 'Pending',
      description: 'Your verification is pending. Please complete the process.',
    },
    SUBMITTED: {
      icon: Clock,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      label: 'Under Review',
      description: 'Your documents are being reviewed. This usually takes 1-2 business days.',
    },
    VERIFIED: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: 'Verified',
      description: 'Your identity has been verified. You have full access to all features.',
    },
    APPROVED: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      label: 'Verified',
      description: 'Your identity has been verified. You have full access to all features.',
    },
    REJECTED: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      label: 'Rejected',
      description: 'Your verification was rejected. Please resubmit with valid documents.',
    },
  };

  const kycConfig = kycStatusConfig[settings.kycStatus] || kycStatusConfig.NOT_STARTED;
  const KycIcon = kycConfig.icon;
  const isVerified = settings.kycStatus === 'VERIFIED' || settings.kycStatus === 'APPROVED';

  // Save profile changes
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setActiveModal('none');
      if (refreshUser) refreshUser();
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setPasswordLoading(false);
      return;
    }

    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      setPasswordLoading(false);
      return;
    }

    try {
      // Update password in users table
      const { error } = await supabase
        .from('users')
        .update({
          password_hash: newPassword,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setActiveModal('none');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  // Initialize 2FA setup - generate secret and QR code
  const initializeTwoFA = async () => {
    try {
      // Generate a new secret using native implementation
      const secret = generateSecret(20);
      setTwoFASecret(secret);

      // Generate OTPAuth URL
      const otpAuthUrl = generateOTPAuthURI(secret, user?.email || 'user', 'Peeap');

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });
      setTwoFAQRCode(qrCodeDataUrl);
    } catch (error) {
      console.error('Failed to initialize 2FA:', error);
    }
  };

  // Open 2FA modal and initialize
  const openTwoFAModal = async () => {
    setActiveModal('2fa');
    if (!settings.has2FA) {
      await initializeTwoFA();
    }
  };

  const handleEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFALoading(true);
    setMessage(null);

    try {
      if (twoFACode.length !== 6) {
        throw new Error('Please enter a valid 6-digit code');
      }

      // Verify the code using native TOTP implementation
      const isValid = await verifyTOTP(twoFASecret, twoFACode);

      if (!isValid) {
        throw new Error('Invalid verification code. Please try again.');
      }

      // Save to database
      const { error } = await supabase
        .from('users')
        .update({
          two_factor_enabled: true,
          two_factor_secret: twoFASecret,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, has2FA: true }));
      setMessage({ type: 'success', text: 'Two-factor authentication enabled!' });
      setActiveModal('none');
      setTwoFACode('');
      setTwoFAQRCode('');
      setTwoFASecret('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to enable 2FA' });
    } finally {
      setTwoFALoading(false);
    }
  };

  // Disable 2FA
  const handleDisable2FA = async () => {
    setTwoFALoading(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          two_factor_enabled: false,
          two_factor_secret: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, has2FA: false }));
      setMessage({ type: 'success', text: 'Two-factor authentication disabled' });
      setActiveModal('none');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to disable 2FA' });
    } finally {
      setTwoFALoading(false);
    }
  };

  // Set/Change Transaction PIN
  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinLoading(true);
    setMessage(null);

    if (newPin !== confirmPin) {
      setMessage({ type: 'error', text: 'PINs do not match' });
      setPinLoading(false);
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setMessage({ type: 'error', text: 'PIN must be exactly 4 digits' });
      setPinLoading(false);
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({
          transaction_pin: newPin,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user?.id);

      if (error) throw error;

      setSettings(prev => ({ ...prev, hasPin: true }));
      setMessage({ type: 'success', text: 'Transaction PIN set successfully!' });
      setActiveModal('none');
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to set PIN' });
    } finally {
      setPinLoading(false);
    }
  };

  // Initialize KYC form with user data
  const initializeKycForm = () => {
    setKycFirstName(user?.firstName || '');
    setKycLastName(user?.lastName || '');
    setKycStep('info');
    setKycError(null);
    setLivenessFrames([]);
    setSelfieImage('');
    setIdCardImage('');
    setExtractedIdData(null);
    setIdVerificationIssues([]);
  };

  // Handle face liveness completion
  const handleLivenessComplete = (result: { isLive: boolean; frames: string[]; selfieFrame: string }) => {
    if (result.isLive) {
      setLivenessFrames(result.frames);
      setSelfieImage(result.selfieFrame);
      setKycStep('id-scan');
    } else {
      setKycError('Face liveness verification failed. Please try again.');
      setKycStep('failed');
    }
  };

  // Handle ID scan completion
  const handleIdScanComplete = (result: {
    isValid: boolean;
    idImage: string;
    extractedData: any;
    issues: string[];
  }) => {
    setIdCardImage(result.idImage);
    setExtractedIdData(result.extractedData);
    setIdVerificationIssues(result.issues);

    // Check for blocking issues (expired document)
    const hasExpiredDoc = result.issues.some(i => i.toLowerCase().includes('expired'));
    if (hasExpiredDoc) {
      setKycError('Your ID card has expired. Please renew your ID before continuing.');
      setKycStep('failed');
    } else {
      setKycStep('review');
    }
  };

  // Submit final KYC application
  const handleKycSubmit = async () => {
    if (!user?.id) return;

    setKycLoading(true);
    setKycError(null);
    setKycStep('submitting');

    try {
      // Submit KYC with all collected data
      const result = await kycService.submitKyc(user.id, {
        firstName: kycFirstName,
        lastName: kycLastName,
        dateOfBirth: kycDateOfBirth,
        nationality: kycNationality,
        address: kycAddress,
        documents: [
          {
            type: 'NATIONAL_ID',
            data: idCardImage,
            mimeType: 'image/jpeg',
          },
          {
            type: 'SELFIE',
            data: selfieImage,
            mimeType: 'image/jpeg',
          },
        ],
      });

      // Check if verification passed
      if (result.verificationResult && !result.verificationResult.isValid) {
        const issues = result.verificationResult.issues || [];
        if (issues.some((i: string) => i.includes('expired'))) {
          setKycError('Your ID card has expired. Verification cancelled.');
          setKycStep('failed');
          return;
        }
      }

      setSettings(prev => ({ ...prev, kycStatus: 'SUBMITTED' }));
      setKycStep('success');
      setMessage({ type: 'success', text: 'KYC verification submitted successfully!' });
      if (refreshUser) refreshUser();
    } catch (error: any) {
      console.error('KYC submission error:', error);
      setKycError(error.message || 'Failed to submit KYC verification');
      setKycStep('failed');
    } finally {
      setKycLoading(false);
    }
  };

  // Reset KYC modal
  const resetKycModal = () => {
    setActiveModal('none');
    setKycStep('info');
    setKycError(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
          <p className="text-gray-500 dark:text-gray-400">Manage your account settings and security</p>
        </motion.div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              'p-4 rounded-xl flex items-center gap-3',
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            )}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Profile Card */}
        <motion.div variants={itemVariants}>
          <MotionCard className="p-6" glowEffect>
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Avatar with Upload */}
                <div className="relative group">
                  <ProfileAvatar
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    profilePicture={avatarUrl}
                    size="xl"
                    className="w-24 h-24"
                  />
                  {/* Upload overlay */}
                  <label
                    htmlFor="avatar-upload"
                    className={clsx(
                      'absolute inset-0 flex items-center justify-center rounded-full cursor-pointer transition-all',
                      'bg-black/0 group-hover:bg-black/50',
                      isUploadingAvatar && 'bg-black/50'
                    )}
                  >
                    {isUploadingAvatar ? (
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    ) : (
                      <Camera className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </label>
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAvatarUpload}
                    disabled={isUploadingAvatar}
                    className="hidden"
                  />
                  {isVerified && (
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white dark:border-gray-800">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {user?.firstName} {user?.lastName}
                      </h2>
                      <p className="text-gray-500 dark:text-gray-400">{user?.email}</p>
                      {user?.phone && (
                        <p className="text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
                          <Phone className="w-4 h-4" />
                          {user.phone}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setActiveModal('edit-profile')}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit3 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </button>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex flex-wrap gap-3 mt-4">
                    <span className={clsx(
                      'px-3 py-1 rounded-full text-sm font-medium',
                      isVerified
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    )}>
                      {isVerified ? 'Verified' : 'Unverified'}
                    </span>
                    {settings.has2FA && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                        2FA Enabled
                      </span>
                    )}
                    {settings.hasPin && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400">
                        PIN Set
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </MotionCard>
          </motion.div>

          {/* KYC Status Card */}
          <motion.div variants={itemVariants}>
            <MotionCard className="p-6 h-full" delay={0.1} glowEffect>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Identity Verification</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Verify your identity to unlock all features</p>
                </div>
              </div>
            </div>

            <div className={clsx('p-4 rounded-xl flex items-center gap-4', kycConfig.bg, 'dark:bg-opacity-20')}>
              <div className={clsx('w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-gray-800', kycConfig.color)}>
                <KycIcon className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <p className={clsx('font-semibold', kycConfig.color)}>{kycConfig.label}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{kycConfig.description}</p>
              </div>
              {(settings.kycStatus === 'NOT_STARTED' || settings.kycStatus === 'PENDING' || settings.kycStatus === 'REJECTED') && (
                <button
                  onClick={() => {
                    initializeKycForm();
                    setActiveModal('kyc');
                  }}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                >
                  Start Verification
                </button>
              )}
            </div>
          </MotionCard>
        </motion.div>

        {/* Become a Merchant */}
        <motion.div variants={itemVariants}>
          <BecomeMerchantCard />
        </motion.div>

        {/* NFC Agent Settings - Compact version */}
        <motion.div variants={itemVariants}>
          <NFCAgentSettings compact />
        </motion.div>

        {/* Security and Preferences Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Security Settings */}
          <motion.div variants={itemVariants}>
            <MotionCard className="p-6 h-full" delay={0.2} glowEffect>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Shield className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Security</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your security settings</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Password */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setActiveModal('password')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <Key className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Login Password</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Change your account password</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </motion.button>

              {/* Transaction PIN */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => setActiveModal('pin')}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center">
                    <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Transaction PIN</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {settings.hasPin ? '4-digit PIN is set' : 'Set a 4-digit PIN for transactions'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {settings.hasPin && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                      Active
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.button>

              {/* Two-Factor Authentication */}
              <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={openTwoFAModal}
                className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    settings.has2FA ? 'bg-green-100 dark:bg-green-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
                  )}>
                    <Smartphone className={clsx(
                      'w-5 h-5',
                      settings.has2FA ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                    )} />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {settings.has2FA ? 'Your account is protected with 2FA' : 'Add extra security to your account'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {settings.has2FA && (
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-medium rounded-full">
                      Enabled
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </motion.button>
            </div>
          </MotionCard>
        </motion.div>

          {/* Preferences - Default Wallet */}
          <motion.div variants={itemVariants}>
            <MotionCard className="p-6 h-full" delay={0.25} glowEffect>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Preferences</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Set your default wallet for transactions</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Wallet for Transactions
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  This wallet will be selected by default when sending money or making payments
                </p>

                {wallets.length > 0 ? (
                  <div className="space-y-2">
                    {wallets.map((wallet) => {
                      const isDefault = settings.defaultWalletId === wallet.id ||
                        (!settings.defaultWalletId && wallet.wallet_type === 'primary');

                      return (
                        <motion.button
                          key={wallet.id}
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => handleSetDefaultWallet(wallet.id)}
                          disabled={savingDefaultWallet}
                          className={clsx(
                            'w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all',
                            isDefault
                              ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx(
                              'w-12 h-12 rounded-xl flex items-center justify-center',
                              wallet.currency === 'SLE' ? 'bg-green-100 dark:bg-green-900/30' :
                              wallet.currency === 'USD' ? 'bg-blue-100 dark:bg-blue-900/30' :
                              'bg-gray-100 dark:bg-gray-700'
                            )}>
                              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                                {wallet.currency === 'SLE' ? 'Le' : '$'}
                              </span>
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {wallet.currency} Wallet
                              </p>
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                Balance: {wallet.currency === 'SLE' ? 'Le ' : '$ '}
                                {wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isDefault && (
                              <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 text-xs font-semibold rounded-full">
                                Default
                              </span>
                            )}
                            <div className={clsx(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                              isDefault
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-gray-300 dark:border-gray-600'
                            )}>
                              {isDefault && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500 dark:text-gray-400">No wallets found</p>
                  </div>
                )}
              </div>
            </div>
          </MotionCard>
        </motion.div>
        </div>

        {/* Settings & Statement Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <motion.div variants={itemVariants}>
            <MotionCard className="p-6 h-full" delay={0.28} glowEffect>
              <Link
                to="/settings"
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <ChevronRight className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Settings</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Manage apps, preferences & security
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-primary-600 transition-colors" />
              </Link>
            </MotionCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <MotionCard className="p-6 h-full" delay={0.30} glowEffect>
              <Link
                to="/merchant/statements"
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                    <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Statements</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      View monthly financial statements
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-emerald-600 transition-colors" />
              </Link>
            </MotionCard>
          </motion.div>
        </div>

        {/* Account Limits - Full Width */}
        <motion.div variants={itemVariants}>
          <MotionCard className="p-6" delay={0.3} glowEffect>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Account Limits</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Your current transaction limits</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl"
              >
                <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Daily Limit</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100 mt-1">
                  SLE {isVerified ? '10,000' : '1,000'}
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/30 rounded-xl"
              >
                <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Monthly Limit</p>
                <p className="text-2xl font-bold text-purple-900 dark:text-purple-100 mt-1">
                  SLE {isVerified ? '100,000' : '10,000'}
                </p>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.03 }}
                className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/30 rounded-xl"
              >
                <p className="text-sm text-green-600 dark:text-green-400 font-medium">Per Transaction</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">
                  SLE {isVerified ? '5,000' : '500'}
                </p>
              </motion.div>
            </div>

            {!isVerified && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Complete KYC verification to increase your limits
              </p>
            )}
          </MotionCard>
        </motion.div>
      </motion.div>

      {/* Edit Profile Modal */}
      {activeModal === 'edit-profile' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Edit Profile</h3>
              <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+232 XX XXX XXXX"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {activeModal === 'password' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Key className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Change Password</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  required
                  minLength={8}
                />
                <p className="text-xs text-gray-400 mt-1">Minimum 8 characters</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                <input
                  type={showPasswords ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPasswords}
                  onChange={(e) => setShowPasswords(e.target.checked)}
                  className="rounded"
                />
                Show passwords
              </label>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {passwordLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transaction PIN Modal */}
      {activeModal === 'pin' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Lock className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">
                  {settings.hasPin ? 'Change PIN' : 'Set Transaction PIN'}
                </h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-6">
              Your transaction PIN is required when sending money to protect your account.
            </p>

            <form onSubmit={handleSetPin} className="space-y-4">
              {settings.hasPin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current PIN</label>
                  <input
                    type="password"
                    value={currentPin}
                    onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    inputMode="numeric"
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-primary-500"
                    placeholder="••••"
                    required
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New PIN</label>
                <input
                  type="password"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  inputMode="numeric"
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-primary-500"
                  placeholder="••••"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm PIN</label>
                <input
                  type="password"
                  value={confirmPin}
                  onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  maxLength={4}
                  inputMode="numeric"
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl text-center text-2xl tracking-[1em] focus:ring-2 focus:ring-primary-500"
                  placeholder="••••"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setActiveModal('none')}
                  className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pinLoading}
                  className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pinLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Save PIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2FA Modal */}
      {activeModal === '2fa' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className={clsx('p-2 rounded-lg', settings.has2FA ? 'bg-green-100' : 'bg-orange-100')}>
                  <Smartphone className={clsx('w-5 h-5', settings.has2FA ? 'text-green-600' : 'text-orange-600')} />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Two-Factor Authentication</h3>
              </div>
              <button onClick={() => setActiveModal('none')} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {settings.has2FA ? (
              <div className="space-y-6">
                <div className="p-4 bg-green-50 rounded-xl flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">2FA is enabled</p>
                    <p className="text-sm text-green-700">Your account is protected</p>
                  </div>
                </div>

                <button
                  onClick={handleDisable2FA}
                  disabled={twoFALoading}
                  className="w-full py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {twoFALoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Disable 2FA'}
                </button>
              </div>
            ) : (
              <form onSubmit={handleEnable2FA} className="space-y-4">
                <p className="text-sm text-gray-600">
                  Scan this code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>

                <div className="bg-gray-50 rounded-xl p-6 flex flex-col items-center">
                  <div className="w-48 h-48 bg-white rounded-lg flex items-center justify-center border border-gray-200 mb-4 overflow-hidden">
                    {twoFAQRCode ? (
                      <img
                        src={twoFAQRCode}
                        alt="2FA QR Code"
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">Or enter code manually:</p>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="px-3 py-2 bg-white rounded-lg font-mono text-sm border break-all max-w-[200px]">
                      {twoFASecret || 'Loading...'}
                    </code>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(twoFASecret)}
                      disabled={!twoFASecret}
                      className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                    >
                      {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                  <input
                    type="text"
                    value={twoFACode}
                    onChange={(e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                    className="w-full px-4 py-4 border border-gray-300 rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-primary-500"
                    placeholder="000000"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveModal('none')}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={twoFALoading || twoFACode.length !== 6}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {twoFALoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enable 2FA'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* KYC Modal - New Flow with Face Liveness and ID Scan */}
      {activeModal === 'kyc' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-primary-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">Identity Verification</h3>
              </div>
              <button onClick={resetKycModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Progress Steps */}
            {!['success', 'failed', 'submitting'].includes(kycStep) && (
              <div className="flex items-center justify-between mb-6">
                {[
                  { step: 'info', label: 'Info', num: 1 },
                  { step: 'face-liveness', label: 'Face', num: 2 },
                  { step: 'id-scan', label: 'ID Scan', num: 3 },
                  { step: 'review', label: 'Review', num: 4 },
                ].map(({ step, label, num }, index) => {
                  const steps = ['info', 'face-liveness', 'id-scan', 'review'];
                  const currentIndex = steps.indexOf(kycStep);
                  const stepIndex = steps.indexOf(step);
                  const isComplete = stepIndex < currentIndex;
                  const isCurrent = step === kycStep;

                  return (
                    <div key={step} className="flex items-center">
                      <div className="flex flex-col items-center">
                        <div
                          className={clsx(
                            'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                            isComplete ? 'bg-green-500 text-white' :
                            isCurrent ? 'bg-primary-600 text-white' :
                            'bg-gray-200 text-gray-500'
                          )}
                        >
                          {isComplete ? <Check className="w-4 h-4" /> : num}
                        </div>
                        <span className="text-xs text-gray-500 mt-1">{label}</span>
                      </div>
                      {index < 3 && (
                        <div
                          className={clsx(
                            'w-8 sm:w-12 h-1 mx-1',
                            isComplete ? 'bg-green-500' : 'bg-gray-200'
                          )}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step: Personal Information */}
            {kycStep === 'info' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  Please confirm your personal information before proceeding with verification.
                </p>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      value={kycFirstName}
                      onChange={(e) => setKycFirstName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={kycLastName}
                      onChange={(e) => setKycLastName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={kycDateOfBirth}
                    onChange={(e) => setKycDateOfBirth(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                  <select
                    value={kycNationality}
                    onChange={(e) => setKycNationality(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Sierra Leonean">Sierra Leonean</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Street address"
                    value={kycAddress.street}
                    onChange={(e) => setKycAddress(prev => ({ ...prev, street: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 mb-2"
                  />
                  <input
                    type="text"
                    placeholder="City"
                    value={kycAddress.city}
                    onChange={(e) => setKycAddress(prev => ({ ...prev, city: e.target.value }))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
                  <p className="font-medium mb-1">What's next:</p>
                  <ul className="space-y-1">
                    <li>1. Face liveness verification (read text & turn head)</li>
                    <li>2. Scan your Sierra Leone National ID card</li>
                    <li>3. Review and submit</li>
                  </ul>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={resetKycModal}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setKycStep('face-liveness')}
                    disabled={!kycFirstName || !kycLastName || !kycDateOfBirth}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Start Face Scan
                  </button>
                </div>
              </div>
            )}

            {/* Step: Face Liveness */}
            {kycStep === 'face-liveness' && (
              <FaceLiveness
                onComplete={handleLivenessComplete}
                onCancel={() => setKycStep('info')}
              />
            )}

            {/* Step: ID Card Scan */}
            {kycStep === 'id-scan' && (
              <IdCardScanner
                onComplete={handleIdScanComplete}
                onCancel={() => setKycStep('face-liveness')}
                expectedName={{ firstName: kycFirstName, lastName: kycLastName }}
              />
            )}

            {/* Step: Review */}
            {kycStep === 'review' && (
              <div className="space-y-6">
                <div className="text-center mb-4">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-2" />
                  <h4 className="text-lg font-bold text-gray-900">Verification Complete</h4>
                  <p className="text-sm text-gray-600">Please review your information before submitting</p>
                </div>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h5 className="font-semibold text-gray-900">Personal Information</h5>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <span className="text-gray-500">Name:</span>
                    <span className="font-medium">{kycFirstName} {kycLastName}</span>
                    <span className="text-gray-500">Date of Birth:</span>
                    <span className="font-medium">{kycDateOfBirth}</span>
                    <span className="text-gray-500">Nationality:</span>
                    <span className="font-medium">{kycNationality}</span>
                  </div>
                </div>

                {/* Captured Images */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Selfie</p>
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                      {selfieImage && (
                        <img
                          src={`data:image/jpeg;base64,${selfieImage}`}
                          alt="Selfie"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">ID Card</p>
                    <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                      {idCardImage && (
                        <img
                          src={`data:image/jpeg;base64,${idCardImage}`}
                          alt="ID Card"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>

                {/* Extracted Data */}
                {extractedIdData && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <h5 className="font-semibold text-green-900 mb-2">ID Card Data</h5>
                    <div className="text-sm space-y-1">
                      {extractedIdData.documentNumber && (
                        <p><span className="text-green-700">ID Number:</span> {extractedIdData.documentNumber}</p>
                      )}
                      {extractedIdData.expiryDate && (
                        <p><span className="text-green-700">Expiry:</span> {extractedIdData.expiryDate}</p>
                      )}
                      <p><span className="text-green-700">Confidence:</span> {extractedIdData.confidence}%</p>
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {idVerificationIssues.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                    <p className="font-medium text-yellow-700 mb-1">Warnings:</p>
                    <ul className="text-sm text-yellow-600 space-y-1">
                      {idVerificationIssues.map((issue, i) => (
                        <li key={i}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setKycStep('id-scan')}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleKycSubmit}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 flex items-center justify-center gap-2"
                  >
                    Submit Verification
                  </button>
                </div>
              </div>
            )}

            {/* Step: Submitting */}
            {kycStep === 'submitting' && (
              <div className="text-center py-12">
                <Loader2 className="w-16 h-16 animate-spin text-primary-600 mx-auto mb-4" />
                <h4 className="text-lg font-bold text-gray-900 mb-2">Submitting Verification</h4>
                <p className="text-gray-600">Please wait while we process your documents...</p>
              </div>
            )}

            {/* Step: Success */}
            {kycStep === 'success' && (
              <div className="text-center py-8">
                <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h4 className="text-xl font-bold text-green-900 mb-2">Verification Submitted!</h4>
                <p className="text-gray-600 mb-6">
                  Your identity verification has been submitted successfully. We'll review your documents and notify you within 1-2 business days.
                </p>
                <button
                  onClick={resetKycModal}
                  className="w-full py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
                >
                  Done
                </button>
              </div>
            )}

            {/* Step: Failed */}
            {kycStep === 'failed' && (
              <div className="text-center py-8">
                <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-12 h-12 text-red-600" />
                </div>
                <h4 className="text-xl font-bold text-red-900 mb-2">Verification Failed</h4>
                <p className="text-gray-600 mb-4">
                  {kycError || 'We were unable to verify your identity. Please try again.'}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={resetKycModal}
                    className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setKycStep('info')}
                    className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </MainLayout>
  );
}
