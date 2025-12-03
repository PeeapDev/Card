import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, KycApplication, KycStatus, KycApplicationStatus } from '@payment-system/database';
import { encrypt, decrypt, EncryptedData } from '@payment-system/common';
import { ConfigService } from '@nestjs/config';
import { SubmitKycDto, ReviewKycDto, DocumentType } from './dto/kyc.dto';
import { OcrService, DocumentVerificationResult } from './ocr.service';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(KycApplication)
    private readonly kycRepository: Repository<KycApplication>,
    private readonly configService: ConfigService,
    private readonly ocrService: OcrService,
  ) {
    this.encryptionKey = this.configService.get('ENCRYPTION_KEY', 'default-key-change-me');
  }

  async getKycStatus(userId: string): Promise<{
    status: KycStatus;
    tier?: number;
    applicationId?: string;
    submittedAt?: Date;
    reviewedAt?: Date;
    rejectionReason?: string;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const application = await this.kycRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return {
      status: user.kycStatus,
      tier: user.kycTier,
      applicationId: application?.id,
      submittedAt: application?.submittedAt,
      reviewedAt: application?.reviewedAt,
      rejectionReason: application?.rejectionReason,
    };
  }

  async submitKyc(userId: string, dto: SubmitKycDto): Promise<KycApplication> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if user already has pending or approved KYC
    if (user.kycStatus === KycStatus.PENDING) {
      throw new BadRequestException('KYC application already pending');
    }

    if (user.kycStatus === KycStatus.APPROVED) {
      throw new BadRequestException('KYC already approved');
    }

    // Validate required documents
    const hasIdentityDoc = dto.documents.some(
      doc => [DocumentType.PASSPORT, DocumentType.DRIVERS_LICENSE, DocumentType.NATIONAL_ID].includes(doc.type),
    );
    const hasSelfie = dto.documents.some(doc => doc.type === DocumentType.SELFIE);

    if (!hasIdentityDoc) {
      throw new BadRequestException('Identity document required (passport, driver\'s license, or national ID)');
    }

    if (!hasSelfie) {
      throw new BadRequestException('Selfie required for verification');
    }

    // Encrypt and store documents
    const encryptedDocuments = dto.documents.map(doc => ({
      type: doc.type,
      encryptedData: encrypt(doc.data, this.encryptionKey),
      mimeType: doc.mimeType || 'image/jpeg',
      uploadedAt: new Date(),
    }));

    // Create KYC application
    const application = this.kycRepository.create({
      userId,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: new Date(dto.dateOfBirth),
      address: dto.address,
      nationality: dto.nationality,
      taxId: dto.taxId ? JSON.stringify(encrypt(dto.taxId, this.encryptionKey)) : undefined,
      documents: encryptedDocuments,
      status: KycApplicationStatus.PENDING,
      submittedAt: new Date(),
    });

    await this.kycRepository.save(application);

    // Update user status
    user.kycStatus = KycStatus.PENDING;
    user.firstName = dto.firstName;
    user.lastName = dto.lastName;
    user.dateOfBirth = new Date(dto.dateOfBirth);
    user.address = dto.address;
    await this.userRepository.save(user);

    this.logger.log(`KYC submitted for user: ${userId}, application: ${application.id}`);

    // Trigger OCR processing for identity document (non-blocking)
    this.processDocumentWithOcr(application, dto).catch(err => {
      this.logger.error(`OCR processing failed for application ${application.id}: ${err.message}`);
    });

    // TODO: Send confirmation notification

    return application;
  }

  async getApplication(applicationId: string): Promise<KycApplication> {
    const application = await this.kycRepository.findOne({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('KYC application not found');
    }

    return application;
  }

  async getPendingApplications(): Promise<KycApplication[]> {
    return this.kycRepository.find({
      where: { status: KycApplicationStatus.PENDING },
      order: { submittedAt: 'ASC' },
    });
  }

  async reviewApplication(
    applicationId: string,
    dto: ReviewKycDto,
    reviewerId: string,
  ): Promise<KycApplication> {
    const application = await this.getApplication(applicationId);

    if (application.status !== KycApplicationStatus.PENDING) {
      throw new BadRequestException('Application is not pending review');
    }

    const user = await this.userRepository.findOne({
      where: { id: application.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    application.reviewedAt = new Date();
    application.reviewedBy = reviewerId;
    application.reviewNotes = dto.notes;

    if (dto.decision === 'APPROVED') {
      application.status = KycApplicationStatus.APPROVED;
      user.kycStatus = KycStatus.APPROVED;
      user.kycTier = dto.tier || 1;
      user.kycApprovedAt = new Date();

      this.logger.log(`KYC approved for user: ${user.id}, tier: ${user.kycTier}`);
    } else {
      if (!dto.rejectionReason) {
        throw new BadRequestException('Rejection reason required');
      }

      application.status = KycApplicationStatus.REJECTED;
      application.rejectionReason = dto.rejectionReason;
      user.kycStatus = KycStatus.REJECTED;

      this.logger.log(`KYC rejected for user: ${user.id}, reason: ${dto.rejectionReason}`);
    }

    await this.kycRepository.save(application);
    await this.userRepository.save(user);

    // TODO: Send notification to user about decision

    return application;
  }

  async resubmitKyc(userId: string, dto: SubmitKycDto): Promise<KycApplication> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kycStatus !== KycStatus.REJECTED) {
      throw new BadRequestException('Can only resubmit after rejection');
    }

    // Reset status and submit new application
    user.kycStatus = KycStatus.NOT_STARTED;
    await this.userRepository.save(user);

    return this.submitKyc(userId, dto);
  }

  async cancelApplication(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.kycStatus !== KycStatus.PENDING) {
      throw new BadRequestException('No pending application to cancel');
    }

    const application = await this.kycRepository.findOne({
      where: { userId, status: KycApplicationStatus.PENDING },
    });

    if (application) {
      application.status = KycApplicationStatus.NOT_STARTED;
      application.cancelledAt = new Date();
      await this.kycRepository.save(application);
    }

    user.kycStatus = KycStatus.NOT_STARTED;
    await this.userRepository.save(user);

    this.logger.log(`KYC application cancelled for user: ${userId}`);
  }

  /**
   * Process identity document with DeepSeek OCR and store verification results
   */
  private async processDocumentWithOcr(
    application: KycApplication,
    dto: SubmitKycDto,
  ): Promise<void> {
    // Find the identity document (passport, driver's license, or national ID)
    const identityDoc = dto.documents.find(doc =>
      [DocumentType.PASSPORT, DocumentType.DRIVERS_LICENSE, DocumentType.NATIONAL_ID].includes(doc.type),
    );

    if (!identityDoc) {
      this.logger.warn(`No identity document found for application ${application.id}`);
      return;
    }

    this.logger.log(`Starting OCR processing for application ${application.id}`);

    // Verify the document against provided data
    const verificationResult = await this.ocrService.verifyIdDocument(
      identityDoc.data, // Base64 document image
      identityDoc.mimeType || 'image/jpeg',
      {
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth,
      },
    );

    this.logger.log(`OCR verification complete for application ${application.id}: isValid=${verificationResult.isValid}, matchScore=${verificationResult.matchScore}%`);

    // Store verification result in the application
    application.verificationResult = {
      documentCheck: verificationResult.isValid,
      documentType: verificationResult.documentType,
      extractedData: verificationResult.extractedData,
      matchScore: verificationResult.matchScore,
      issues: verificationResult.issues,
      ocrProcessedAt: new Date().toISOString(),
      faceMatch: false, // TODO: Add face matching with selfie
      addressVerified: false, // TODO: Add address verification
      watchlistClear: true, // TODO: Add watchlist check
    };

    await this.kycRepository.save(application);

    // Auto-approve high-confidence submissions (optional, can be disabled)
    if (verificationResult.isValid && verificationResult.matchScore >= 90) {
      this.logger.log(`High confidence verification for application ${application.id}, auto-flagging for quick review`);
      // Note: Not auto-approving, just logging for admin visibility
      // Admins can still review and approve/reject
    }

    // Log issues for admin review
    if (verificationResult.issues.length > 0) {
      this.logger.warn(`OCR issues found for application ${application.id}: ${verificationResult.issues.join(', ')}`);
    }
  }

  /**
   * Get OCR verification result for an application
   */
  async getVerificationResult(applicationId: string): Promise<DocumentVerificationResult | null> {
    const application = await this.getApplication(applicationId);

    if (!application.verificationResult) {
      return null;
    }

    return {
      isValid: application.verificationResult.documentCheck,
      documentType: application.verificationResult.documentType || 'UNKNOWN',
      extractedData: application.verificationResult.extractedData || { confidence: 0 },
      matchScore: application.verificationResult.matchScore || 0,
      issues: application.verificationResult.issues || [],
      ocrText: '', // Not stored for privacy
    };
  }

  /**
   * Manually trigger OCR re-processing for an application
   */
  async reprocessOcr(applicationId: string): Promise<DocumentVerificationResult> {
    const application = await this.getApplication(applicationId);

    // Find original documents (need to decrypt)
    if (!application.documents || application.documents.length === 0) {
      throw new BadRequestException('No documents found for this application');
    }

    // Find identity document
    const identityDoc = application.documents.find((doc: any) =>
      [DocumentType.PASSPORT, DocumentType.DRIVERS_LICENSE, DocumentType.NATIONAL_ID].includes(doc.type),
    );

    if (!identityDoc) {
      throw new BadRequestException('No identity document found');
    }

    // Decrypt document data
    const encryptedData = identityDoc.encryptedData as EncryptedData;
    const decryptedData = decrypt(encryptedData, this.encryptionKey);

    // Re-run OCR verification
    const verificationResult = await this.ocrService.verifyIdDocument(
      decryptedData,
      identityDoc.mimeType || 'image/jpeg',
      {
        firstName: application.firstName,
        lastName: application.lastName,
        dateOfBirth: application.dateOfBirth?.toISOString().split('T')[0],
      },
    );

    // Update stored result
    application.verificationResult = {
      ...application.verificationResult,
      documentCheck: verificationResult.isValid,
      documentType: verificationResult.documentType,
      extractedData: verificationResult.extractedData,
      matchScore: verificationResult.matchScore,
      issues: verificationResult.issues,
      ocrProcessedAt: new Date().toISOString(),
    };

    await this.kycRepository.save(application);

    this.logger.log(`OCR reprocessing complete for application ${applicationId}`);

    return verificationResult;
  }
}
