import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, KycApplication, KycStatus, KycApplicationStatus } from '@payment-system/database';
import { encrypt } from '@payment-system/common';
import { ConfigService } from '@nestjs/config';
import { SubmitKycDto, ReviewKycDto, DocumentType } from './dto/kyc.dto';

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

    // TODO: Trigger OCR processing for documents
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
}
