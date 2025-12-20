import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, KycApplication, KycApplicationStatus } from '@payment-system/database';
import { OcrService, ExtractedIdData, SierraLeoneIdData } from './ocr.service';
import { MonimeKycService, PhoneVerificationResult, NameMatchResult } from './monime-kyc.service';

export interface SLVerificationRequest {
  userId: string;
  idCardFrontBase64: string;
  idCardBackBase64?: string;
  mimeType?: string;
  phoneNumber: string;
}

export interface SLVerificationResult {
  success: boolean;
  verified: boolean;
  stage: 'id_scan' | 'phone_verification' | 'name_matching' | 'completed';
  idData?: Partial<SierraLeoneIdData>;
  phoneVerification?: PhoneVerificationResult;
  nameMatch?: NameMatchResult;
  nin?: string;
  issues: string[];
  requiresManualReview: boolean;
  kycApplicationId?: string;
}

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

@Injectable()
export class SLVerificationService {
  private readonly logger = new Logger(SLVerificationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(KycApplication)
    private readonly kycApplicationRepository: Repository<KycApplication>,
    private readonly ocrService: OcrService,
    private readonly monimeKycService: MonimeKycService,
  ) {}

  /**
   * Complete Sierra Leone ID + Phone verification flow
   */
  async verifySierraLeoneId(request: SLVerificationRequest): Promise<SLVerificationResult> {
    const issues: string[] = [];
    let stage: SLVerificationResult['stage'] = 'id_scan';

    // Step 1: Get user
    const user = await this.userRepository.findOne({
      where: { id: request.userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Step 2: Process ID card with OCR
    this.logger.log(`Processing Sierra Leone ID for user ${request.userId}`);

    const ocrResult = await this.ocrService.processSierraLeoneId(
      request.idCardFrontBase64,
      request.mimeType || 'image/jpeg',
    );

    if (!ocrResult.success || !ocrResult.extractedData) {
      return {
        success: false,
        verified: false,
        stage: 'id_scan',
        issues: ['Failed to process ID card image. Please ensure the image is clear and try again.'],
        requiresManualReview: true,
      };
    }

    const idData = ocrResult.extractedData as Partial<SierraLeoneIdData>;

    // Check if NIN was extracted
    if (!idData.nin) {
      issues.push('Could not extract NIN from ID card');
    }

    // Check if name was extracted
    if (!idData.fullName && !idData.firstName && !idData.lastName) {
      issues.push('Could not extract name from ID card');
    }

    // Check if date of birth was extracted
    if (!idData.dateOfBirth) {
      issues.push('Could not extract date of birth from ID card');
    }

    // Check if ID card is expired
    let isExpired = false;
    if (idData.expiryDate) {
      const expiryDate = new Date(idData.expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (expiryDate < today) {
        isExpired = true;
        issues.push(`ID card has expired on ${idData.expiryDate}. Please provide a valid, non-expired ID card.`);
        this.logger.warn(`ID card expired for user ${request.userId}. Expiry date: ${idData.expiryDate}`);
      } else {
        this.logger.log(`ID card is valid. Expiry date: ${idData.expiryDate}`);
      }
    } else {
      this.logger.warn('Could not extract expiry date from ID card - manual review may be required');
    }

    stage = 'phone_verification';

    // Step 3: Verify phone number with provider KYC
    this.logger.log(`Verifying phone number ${request.phoneNumber} for user ${request.userId}`);

    const firstName = idData.firstName || '';
    const lastName = idData.lastName || '';
    const fullName = idData.fullName || `${firstName} ${lastName}`.trim();

    const phoneVerification = await this.monimeKycService.verifyPhoneWithIdMatch(
      request.phoneNumber,
      firstName,
      lastName,
      fullName,
    );

    if (!phoneVerification.verified) {
      issues.push(...phoneVerification.issues);
    }

    stage = 'name_matching';

    // Step 4: Calculate name match
    const nameMatch = this.monimeKycService.matchNames(
      firstName,
      lastName,
      phoneVerification.simRegisteredName || '',
    );

    // Determine overall verification status
    // ID must have NIN, not be expired, phone verified, and name match score >= 70
    const verified =
      !!idData.nin &&
      !isExpired &&
      phoneVerification.verified &&
      nameMatch.score >= 70;

    // Step 5: Create or update KYC application
    let kycApplication = await this.kycApplicationRepository.findOne({
      where: { userId: request.userId },
      order: { createdAt: 'DESC' },
    });

    // Store verification data in verificationResult field
    const verificationResultData = {
      documentCheck: !!idData.nin,
      faceMatch: false,
      addressVerified: false,
      watchlistClear: true,
      riskScore: nameMatch.score,
      notes: `Sierra Leone ID verification. Phone: ${request.phoneNumber}`,
      documentType: 'SIERRA_LEONE_NID',
      extractedData: {
        documentType: 'SIERRA_LEONE_NID',
        documentNumber: idData.nin,
        firstName: idData.firstName,
        lastName: idData.lastName,
        fullName: idData.fullName,
        dateOfBirth: idData.dateOfBirth,
        expiryDate: idData.expiryDate,
        dateOfIssue: (idData as SierraLeoneIdData).dateOfIssue,
        gender: idData.gender,
        nationality: 'Sierra Leonean',
        placeOfBirth: (idData as SierraLeoneIdData).placeOfBirth,
        district: (idData as SierraLeoneIdData).district,
        confidence: idData.confidence || 0,
      },
      matchScore: nameMatch.score,
      issues,
      ocrProcessedAt: new Date().toISOString(),
      // ID card image for admin verification
      idCardImage: request.idCardFrontBase64,
      idCardImageMimeType: request.mimeType || 'image/jpeg',
      idCardCapturedAt: new Date().toISOString(),
      // Sierra Leone specific fields stored in notes-style JSON
      slVerification: {
        nin: idData.nin,
        phoneNumber: request.phoneNumber,
        simRegisteredName: phoneVerification.simRegisteredName,
        idCardName: idData.fullName || `${idData.firstName || ''} ${idData.lastName || ''}`.trim(),
        dateOfBirth: idData.dateOfBirth,
        expiryDate: idData.expiryDate,
        isExpired,
        phoneVerified: phoneVerification.verified,
        nameMatchScore: nameMatch.score,
        verificationMethod: phoneVerification.verificationMethod,
        verified,
        completedAt: verified ? new Date().toISOString() : undefined,
      },
    } as any;

    if (kycApplication) {
      // Update existing application
      kycApplication.verificationResult = verificationResultData;
      kycApplication.status = verified ? KycApplicationStatus.APPROVED : KycApplicationStatus.PENDING;
      kycApplication.firstName = idData.firstName;
      kycApplication.lastName = idData.lastName;
      kycApplication.idNumber = idData.nin;
      await this.kycApplicationRepository.save(kycApplication);
    } else {
      // Create new KYC application
      kycApplication = this.kycApplicationRepository.create({
        userId: request.userId,
        status: verified ? KycApplicationStatus.APPROVED : KycApplicationStatus.PENDING,
        firstName: idData.firstName,
        lastName: idData.lastName,
        idNumber: idData.nin,
        verificationResult: verificationResultData,
      });
      await this.kycApplicationRepository.save(kycApplication);
    }

    // Update user's NIN if extracted and verified
    if (verified && idData.nin) {
      await this.userRepository.update(request.userId, {
        kycLevel: 2, // Upgrade to level 2 after verification
        kycStatus: 'approved',
        metadata: {
          ...user.metadata,
          nin: idData.nin,
          ninVerifiedAt: new Date().toISOString(),
          phoneVerifiedAt: new Date().toISOString(),
          phoneVerifiedNumber: request.phoneNumber,
        },
      } as any);
    }

    stage = verified ? 'completed' : stage;

    return {
      success: true,
      verified,
      stage,
      idData,
      phoneVerification,
      nameMatch,
      nin: idData.nin,
      issues,
      requiresManualReview: !verified && issues.length > 0,
      kycApplicationId: kycApplication.id,
    };
  }

  /**
   * Get verification status for a user
   */
  async getVerificationStatus(userId: string): Promise<VerificationStatus> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const kycApplication = await this.kycApplicationRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    const metadata = (user as any).metadata || {};
    const slVerification = (kycApplication?.verificationResult as any)?.slVerification;

    const hasIdVerification = !!(
      slVerification?.nin ||
      kycApplication?.verificationResult?.extractedData?.documentNumber ||
      metadata.nin
    );

    const hasPhoneVerification = !!(
      slVerification?.phoneVerified ||
      metadata.phoneVerifiedAt
    );

    const hasNameMatch = (
      (slVerification?.nameMatchScore || 0) >= 70
    );

    const overallVerified = hasIdVerification && hasPhoneVerification && hasNameMatch;

    // Calculate verification percentage
    let percentage = 0;
    if (hasIdVerification) percentage += 40;
    if (hasPhoneVerification) percentage += 30;
    if (hasNameMatch) percentage += 30;

    // Determine pending steps
    const pendingSteps: string[] = [];
    if (!hasIdVerification) pendingSteps.push('Upload Sierra Leone National ID');
    if (!hasPhoneVerification) pendingSteps.push('Verify phone number');
    if (hasIdVerification && hasPhoneVerification && !hasNameMatch) {
      pendingSteps.push('Name verification pending');
    }

    return {
      userId,
      hasIdVerification,
      hasPhoneVerification,
      hasNameMatch,
      overallVerified,
      verificationPercentage: percentage,
      pendingSteps,
      idCardName: slVerification?.idCardName || kycApplication?.verificationResult?.extractedData?.fullName,
      simRegisteredName: slVerification?.simRegisteredName,
      nin: slVerification?.nin || kycApplication?.verificationResult?.extractedData?.documentNumber || metadata.nin,
      phoneNumber: slVerification?.phoneNumber || metadata.phoneVerifiedNumber,
    };
  }

  /**
   * Initiate phone verification via OTP (fallback method)
   */
  async initiatePhoneVerification(userId: string, phoneNumber: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return this.monimeKycService.requestPhoneOtp(phoneNumber);
  }

  /**
   * Complete phone verification via OTP
   */
  async completePhoneVerification(
    userId: string,
    phoneNumber: string,
    otp: string,
    requestId: string,
  ): Promise<{ success: boolean; verified: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const result = await this.monimeKycService.verifyPhoneOtp(phoneNumber, otp, requestId);

    if (result.verified) {
      // Update user metadata
      await this.userRepository.update(userId, {
        metadata: {
          ...((user as any).metadata || {}),
          phoneVerifiedAt: new Date().toISOString(),
          phoneVerifiedNumber: phoneNumber,
          phoneVerificationMethod: 'otp',
        },
      } as any);
    }

    return result;
  }

  /**
   * Check if user needs to complete verification
   */
  async checkVerificationRequired(userId: string): Promise<{
    required: boolean;
    reason?: string;
    verificationUrl?: string;
  }> {
    const status = await this.getVerificationStatus(userId);

    if (status.overallVerified) {
      return { required: false };
    }

    let reason = 'Complete your identity verification to unlock all features';
    if (status.pendingSteps.length > 0) {
      reason = `Please ${status.pendingSteps[0].toLowerCase()}`;
    }

    return {
      required: true,
      reason,
      verificationUrl: '/verify',
    };
  }
}
