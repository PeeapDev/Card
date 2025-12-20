import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, PaymentSettings } from '@payment-system/database';

const DEFAULT_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

export interface MonimeKycCredentials {
  accessToken: string;
  spaceId: string;
}

export interface ProviderKycResponse {
  success: boolean;
  data?: {
    accountHolderName: string;
    accountNumber: string;
    provider: string;
    kycStatus: string;
    additionalInfo?: Record<string, any>;
  };
  error?: string;
}

export interface PhoneVerificationResult {
  verified: boolean;
  simRegisteredName?: string;
  idCardName?: string;
  nameMatchScore: number;
  phoneNumber: string;
  provider?: string;
  issues: string[];
  verificationMethod: 'provider_kyc' | 'otp' | 'manual';
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

@Injectable()
export class MonimeKycService {
  private readonly logger = new Logger(MonimeKycService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(PaymentSettings)
    private readonly settingsRepository: Repository<PaymentSettings>,
  ) {
    this.baseUrl = this.configService.get<string>('MONIME_API_URL', 'https://api.monime.io');
  }

  private async getCredentials(): Promise<MonimeKycCredentials> {
    // Get credentials from PaymentSettings in database (same as account-service)
    const settings = await this.settingsRepository.findOne({
      where: { id: DEFAULT_SETTINGS_ID },
    });

    if (settings) {
      return {
        accessToken: settings.monimeAccessToken || '',
        spaceId: settings.monimeSpaceId || '',
      };
    }

    // Fallback to environment variables
    return {
      accessToken: this.configService.get<string>('MONIME_ACCESS_TOKEN', ''),
      spaceId: this.configService.get<string>('MONIME_SPACE_ID', ''),
    };
  }

  private getHeaders(credentials: MonimeKycCredentials): Record<string, string> {
    return {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      'Monime-Space-Id': credentials.spaceId,
    };
  }

  /**
   * Get Provider KYC information for a phone number
   * This retrieves the SIM-registered name from the mobile operator
   */
  async getProviderKyc(phoneNumber: string, provider: string = 'orange'): Promise<ProviderKycResponse> {
    try {
      const credentials = await this.getCredentials();

      if (!credentials.accessToken) {
        this.logger.warn('Monime credentials not configured');
        return {
          success: false,
          error: 'Monime integration not configured',
        };
      }

      // Normalize phone number (remove spaces, dashes, ensure country code)
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Determine provider code
      const providerCode = this.getProviderCode(provider, normalizedPhone);

      this.logger.log(`Fetching Provider KYC for ${normalizedPhone} via ${providerCode}`);

      // Call Monime Provider KYC endpoint
      const response = await fetch(`${this.baseUrl}/v1/provider-kyc`, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          provider: providerCode,
          country: 'SL',
        }),
      });

      const data = await response.json() as {
        message?: string;
        accountHolderName?: string;
        name?: string;
        holderName?: string;
        kycStatus?: string;
      };

      if (!response.ok) {
        this.logger.error(`Provider KYC failed: ${JSON.stringify(data)}`);
        return {
          success: false,
          error: data.message || 'Failed to retrieve provider KYC',
        };
      }

      return {
        success: true,
        data: {
          accountHolderName: data.accountHolderName || data.name || data.holderName || '',
          accountNumber: normalizedPhone,
          provider: providerCode,
          kycStatus: data.kycStatus || 'verified',
          additionalInfo: data,
        },
      };
    } catch (error: any) {
      this.logger.error(`Provider KYC error: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify phone number by matching SIM-registered name with ID card name
   */
  async verifyPhoneWithIdMatch(
    phoneNumber: string,
    idCardFirstName: string,
    idCardLastName: string,
    idCardFullName?: string,
    provider?: string,
  ): Promise<PhoneVerificationResult> {
    const issues: string[] = [];

    // Get provider KYC (SIM registered name)
    const kycResult = await this.getProviderKyc(phoneNumber, provider);

    if (!kycResult.success || !kycResult.data) {
      return {
        verified: false,
        idCardName: idCardFullName || `${idCardFirstName} ${idCardLastName}`,
        nameMatchScore: 0,
        phoneNumber,
        issues: [kycResult.error || 'Failed to retrieve SIM registration information'],
        verificationMethod: 'provider_kyc',
      };
    }

    const simRegisteredName = kycResult.data.accountHolderName;
    const idName = idCardFullName || `${idCardFirstName} ${idCardLastName}`;

    // Match names
    const matchResult = this.matchNames(
      idCardFirstName,
      idCardLastName,
      simRegisteredName,
    );

    if (!matchResult.match) {
      issues.push(`Name mismatch: ID card shows "${idName}", SIM registered to "${simRegisteredName}"`);
    }

    // Consider verified if match score >= 70%
    const verified = matchResult.score >= 70;

    return {
      verified,
      simRegisteredName,
      idCardName: idName,
      nameMatchScore: matchResult.score,
      phoneNumber,
      provider: kycResult.data.provider,
      issues,
      verificationMethod: 'provider_kyc',
    };
  }

  /**
   * Match ID card name with SIM registered name
   */
  matchNames(
    idFirstName: string,
    idLastName: string,
    simRegisteredName: string,
  ): NameMatchResult {
    const simNameNormalized = simRegisteredName.toLowerCase().trim();
    const simNameParts = simNameNormalized.split(/\s+/);

    const idFirstNorm = idFirstName.toLowerCase().trim();
    const idLastNorm = idLastName.toLowerCase().trim();

    // Check first name match
    const firstNameMatch = simNameParts.some(part =>
      this.fuzzyMatch(part, idFirstNorm)
    );

    // Check last name match
    const lastNameMatch = simNameParts.some(part =>
      this.fuzzyMatch(part, idLastNorm)
    );

    // Calculate full name similarity
    const idFullName = `${idFirstNorm} ${idLastNorm}`;
    const fullNameSimilarity = this.calculateStringSimilarity(idFullName, simNameNormalized);

    // Calculate overall score
    let score = 0;
    if (firstNameMatch) score += 40;
    if (lastNameMatch) score += 40;
    score += fullNameSimilarity * 0.2; // Additional 20% for full name similarity

    return {
      match: score >= 70,
      score: Math.round(score),
      details: {
        firstNameMatch,
        lastNameMatch,
        fullNameSimilarity: Math.round(fullNameSimilarity),
      },
    };
  }

  /**
   * Request OTP verification for phone number
   * Fallback method when Provider KYC is not available
   */
  async requestPhoneOtp(phoneNumber: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    try {
      const credentials = await this.getCredentials();

      if (!credentials.accessToken) {
        return {
          success: false,
          message: 'Monime integration not configured',
        };
      }

      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      // Call Monime USSD OTP endpoint
      const response = await fetch(`${this.baseUrl}/v1/ussd-otp`, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          message: 'Your SoftTouch verification code is: {{otp}}',
          otpLength: 6,
          expiryMinutes: 10,
        }),
      });

      const data = await response.json() as { message?: string; requestId?: string; id?: string };

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'Failed to send OTP',
        };
      }

      return {
        success: true,
        message: 'OTP sent successfully',
        requestId: data.requestId || data.id,
      };
    } catch (error: any) {
      this.logger.error(`OTP request error: ${error.message}`);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Verify OTP code
   */
  async verifyPhoneOtp(
    phoneNumber: string,
    otp: string,
    requestId: string,
  ): Promise<{ success: boolean; verified: boolean; message: string }> {
    try {
      const credentials = await this.getCredentials();

      if (!credentials.accessToken) {
        return {
          success: false,
          verified: false,
          message: 'Monime integration not configured',
        };
      }

      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

      const response = await fetch(`${this.baseUrl}/v1/ussd-otp/verify`, {
        method: 'POST',
        headers: this.getHeaders(credentials),
        body: JSON.stringify({
          phoneNumber: normalizedPhone,
          otp,
          requestId,
        }),
      });

      const data = await response.json() as { verified?: boolean; message?: string };

      if (!response.ok) {
        return {
          success: false,
          verified: false,
          message: data.message || 'OTP verification failed',
        };
      }

      return {
        success: true,
        verified: data.verified === true,
        message: data.verified ? 'Phone number verified' : 'Invalid OTP',
      };
    } catch (error: any) {
      this.logger.error(`OTP verification error: ${error.message}`);
      return {
        success: false,
        verified: false,
        message: error.message,
      };
    }
  }

  /**
   * Normalize Sierra Leone phone number
   */
  private normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');

    // Handle Sierra Leone numbers
    if (normalized.startsWith('+232')) {
      // Already in international format
      return normalized;
    } else if (normalized.startsWith('232')) {
      return `+${normalized}`;
    } else if (normalized.startsWith('0')) {
      // Local format with leading 0
      return `+232${normalized.substring(1)}`;
    } else if (normalized.length === 8) {
      // Local format without leading 0 (e.g., 76123456)
      return `+232${normalized}`;
    }

    return normalized;
  }

  /**
   * Determine provider code from phone number prefix
   */
  private getProviderCode(provider?: string, phoneNumber?: string): string {
    if (provider) {
      const providerMap: Record<string, string> = {
        'orange': 'orange_sl',
        'africell': 'africell_sl',
        'qcell': 'qcell_sl',
      };
      return providerMap[provider.toLowerCase()] || 'orange_sl';
    }

    // Auto-detect from phone number prefix
    if (phoneNumber) {
      const local = phoneNumber.replace('+232', '');

      // Orange SL prefixes: 76, 77, 78
      if (/^(76|77|78)/.test(local)) {
        return 'orange_sl';
      }
      // Africell SL prefixes: 30, 33, 34, 88, 99
      if (/^(30|33|34|88|99)/.test(local)) {
        return 'africell_sl';
      }
      // QCell SL prefixes: 25, 31, 32
      if (/^(25|31|32)/.test(local)) {
        return 'qcell_sl';
      }
    }

    return 'orange_sl'; // Default to Orange
  }

  /**
   * Fuzzy string matching
   */
  private fuzzyMatch(str1: string, str2: string): boolean {
    if (str1 === str2) return true;
    if (str1.includes(str2) || str2.includes(str1)) return true;

    const similarity = this.calculateStringSimilarity(str1, str2);
    return similarity >= 80;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    const distance = this.levenshteinDistance(str1, str2);
    const maxLength = Math.max(str1.length, str2.length);
    if (maxLength === 0) return 100;
    return ((maxLength - distance) / maxLength) * 100;
  }

  /**
   * Levenshtein distance calculation
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;

    if (m === 0) return n;
    if (n === 0) return m;

    const dp: number[][] = Array(m + 1)
      .fill(null)
      .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost,
        );
      }
    }

    return dp[m][n];
  }
}
