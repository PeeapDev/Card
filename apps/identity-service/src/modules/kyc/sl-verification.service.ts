import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, KycApplication, KycApplicationStatus, KycDocumentType } from '@payment-system/database';
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
    const verified =
      !!idData.nin &&
      phoneVerification.verified &&
      nameMatch.score >= 70;

    // Step 5: Create or update KYC application
    let kycApplication = await this.kycApplicationRepository.findOne({
      where: { userId: request.userId },
      order: { createdAt: 'DESC' },
    });

    const kycData = {
      idCardData: idData,
      phoneVerification: {
        phoneNumber: request.phoneNumber,
        simRegisteredName: phoneVerification.simRegisteredName,
        verified: phoneVerification.verified,
        nameMatchScore: nameMatch.score,
        verificationMethod: phoneVerification.verificationMethod,
      },
      verificationResult: {
        verified,
        stage: verified ? 'completed' : stage,
        issues,
        completedAt: verified ? new Date().toISOString() : undefined,
      },
    };

    if (kycApplication) {
      // Update existing application
      kycApplication.documents = {
        ...kycApplication.documents,
        sierraLeoneVerification: kycData,
      };
      kycApplication.status = verified ? KycApplicationStatus.APPROVED : KycApplicationStatus.PENDING;
      kycApplication.verificationStatus = verified ? 'verified' : 'pending_review';
      await this.kycApplicationRepository.save(kycApplication);
    } else {
      // Create new KYC application
      kycApplication = this.kycApplicationRepository.create({
        userId: request.userId,
        status: verified ? KycApplicationStatus.APPROVED : KycApplicationStatus.PENDING,
        documentType: 'SIERRA_LEONE_NID' as any,
        documents: {
          sierraLeoneVerification: kycData,
        },
        verificationStatus: verified ? 'verified' : 'pending_review',
        extractedData: idData,
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
    const slVerification = kycApplication?.documents?.sierraLeoneVerification;

    const hasIdVerification = !!(
      slVerification?.idCardData?.nin ||
      metadata.nin
    );

    const hasPhoneVerification = !!(
      slVerification?.phoneVerification?.verified ||
      metadata.phoneVerifiedAt
    );

    const hasNameMatch = (
      slVerification?.phoneVerification?.nameMatchScore >= 70
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
      idCardName: slVerification?.idCardData?.fullName,
      simRegisteredName: slVerification?.phoneVerification?.simRegisteredName,
      nin: slVerification?.idCardData?.nin || metadata.nin,
      phoneNumber: slVerification?.phoneVerification?.phoneNumber || metadata.phoneVerifiedNumber,
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
