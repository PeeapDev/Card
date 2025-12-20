/**
 * Verification Service
 *
 * Handles Sierra Leone ID verification and phone matching
 */

import { api } from '@/lib/api';

// ==================== Types ====================

export interface VerificationStatus {
  userId: string;
  hasIdVerification: boolean;
  hasPhoneVerification: boolean;
  hasNameMatch: boolean;
  overallVerified: boolean;
  verificationPercentage: number;
  pendingSteps: string[];
  idCardName?: string;
  simRegisteredName?: string;
  nin?: string;
  phoneNumber?: string;
}

export interface VerificationResult {
  success: boolean;
  verified: boolean;
  stage: 'id_scan' | 'phone_verification' | 'name_matching' | 'completed';
  idData?: {
    nin?: string;
    fullName?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    gender?: string;
    placeOfBirth?: string;
    documentType?: string;
    confidence: number;
  };
  phoneVerification?: {
    verified: boolean;
    simRegisteredName?: string;
    idCardName?: string;
    nameMatchScore: number;
    phoneNumber: string;
    provider?: string;
    issues: string[];
    verificationMethod: string;
  };
  nameMatch?: {
    match: boolean;
    score: number;
    details: {
      firstNameMatch: boolean;
      lastNameMatch: boolean;
      fullNameSimilarity: number;
    };
  };
  nin?: string;
  issues: string[];
  requiresManualReview: boolean;
  kycApplicationId?: string;
}

export interface ProviderKycResult {
  success: boolean;
  data?: {
    accountHolderName: string;
    accountNumber: string;
    provider: string;
    kycStatus: string;
  };
  error?: string;
}

export interface NameMatchResult {
  match: boolean;
  score: number;
  details: {
    firstNameMatch: boolean;
    lastNameMatch: boolean;
    fullNameSimilarity: number;
  };
}

export interface OtpResult {
  success: boolean;
  message: string;
  requestId?: string;
}

export interface OtpVerifyResult {
  success: boolean;
  verified: boolean;
  message: string;
}

// ==================== API Functions ====================

/**
 * Get current verification status
 */
export async function getVerificationStatus(): Promise<VerificationStatus> {
  return api.get<VerificationStatus>('/kyc/verification/status');
}

/**
 * Check if verification is required
 */
export async function checkVerificationRequired(): Promise<{
  required: boolean;
  reason?: string;
  verificationUrl?: string;
}> {
  return api.get('/kyc/verification/required');
}

/**
 * Submit Sierra Leone ID verification with phone matching
 */
export async function verifySierraLeoneId(data: {
  idCardFrontBase64: string;
  idCardBackBase64?: string;
  mimeType?: string;
  phoneNumber: string;
}): Promise<VerificationResult> {
  const result = await api.post<VerificationResult>('/kyc/verification/sierra-leone', data);
  return result;
}

/**
 * Get SIM registered name from provider (Monime)
 */
export async function getProviderKyc(phoneNumber: string, provider?: string): Promise<ProviderKycResult> {
  return api.post<ProviderKycResult>('/kyc/verification/provider-kyc', { phoneNumber, provider });
}

/**
 * Check if ID name matches SIM registered name
 */
export async function matchNames(
  idFirstName: string,
  idLastName: string,
  simRegisteredName: string,
): Promise<NameMatchResult> {
  return api.post<NameMatchResult>('/kyc/verification/match-names', {
    idFirstName,
    idLastName,
    simRegisteredName,
  });
}

/**
 * Initiate phone verification via OTP
 */
export async function initiatePhoneOtp(phoneNumber: string): Promise<OtpResult> {
  return api.post<OtpResult>('/kyc/verification/phone/initiate', { phoneNumber });
}

/**
 * Verify phone with OTP
 */
export async function verifyPhoneOtp(
  phoneNumber: string,
  otp: string,
  requestId: string,
): Promise<OtpVerifyResult> {
  return api.post<OtpVerifyResult>('/kyc/verification/phone/verify', {
    phoneNumber,
    otp,
    requestId,
  });
}

// ==================== Helper Functions ====================

/**
 * Convert file to base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
}

/**
 * Normalize Sierra Leone phone number
 */
export function normalizeSLPhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let normalized = phone.replace(/[^\d+]/g, '');

  // Handle Sierra Leone numbers
  if (normalized.startsWith('+232')) {
    return normalized;
  } else if (normalized.startsWith('232')) {
    return `+${normalized}`;
  } else if (normalized.startsWith('0')) {
    return `+232${normalized.substring(1)}`;
  } else if (normalized.length === 8) {
    return `+232${normalized}`;
  }

  return normalized;
}

/**
 * Detect mobile provider from phone number
 */
export function detectProvider(phone: string): 'orange' | 'africell' | 'qcell' | 'unknown' {
  const normalized = normalizeSLPhoneNumber(phone);
  const local = normalized.replace('+232', '');

  // Orange SL prefixes: 76, 77, 78
  if (/^(76|77|78)/.test(local)) {
    return 'orange';
  }
  // Africell SL prefixes: 30, 33, 34, 88, 99
  if (/^(30|33|34|88|99)/.test(local)) {
    return 'africell';
  }
  // QCell SL prefixes: 25, 31, 32
  if (/^(25|31|32)/.test(local)) {
    return 'qcell';
  }

  return 'unknown';
}

/**
 * Check verification on page load and show notification if needed
 */
export async function checkAndNotifyVerification(): Promise<VerificationStatus | null> {
  try {
    const status = await getVerificationStatus();
    return status;
  } catch (error) {
    console.error('Failed to check verification status:', error);
    return null;
  }
}

/**
 * Get verification progress percentage
 */
export function getVerificationProgress(status: VerificationStatus): number {
  let progress = 0;
  if (status.hasIdVerification) progress += 40;
  if (status.hasPhoneVerification) progress += 30;
  if (status.hasNameMatch) progress += 30;
  return progress;
}

/**
 * Get next verification step
 */
export function getNextVerificationStep(status: VerificationStatus): string | null {
  if (!status.hasIdVerification) {
    return 'Upload your Sierra Leone National ID card';
  }
  if (!status.hasPhoneVerification) {
    return 'Verify your phone number';
  }
  if (!status.hasNameMatch) {
    return 'Name verification in progress';
  }
  return null;
}
