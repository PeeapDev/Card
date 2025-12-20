import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AmlSar,
  SarStatus,
  SarReportType,
  User,
  AmlAlert,
} from '@payment-system/database';
import { CreateSarDto, UpdateSarDto, SarQueryDto } from '../dto/aml.dto';

@Injectable()
export class SarService {
  private readonly logger = new Logger(SarService.name);

  // Filing institution details (should be from config in production)
  private readonly filingInstitution = {
    name: 'Soft Touch Payment Systems',
    address: {
      street: '123 Financial District',
      city: 'Freetown',
      country: 'Sierra Leone',
    },
    regulatoryIds: {
      businessRegistration: 'SL-FIN-2024-001',
      amlLicense: 'AML-SL-2024-001',
    },
  };

  constructor(
    @InjectRepository(AmlSar)
    private sarRepo: Repository<AmlSar>,
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(AmlAlert)
    private alertRepo: Repository<AmlAlert>,
  ) {}

  /**
   * Create a new SAR
   */
  async createSar(dto: CreateSarDto, preparedBy: string): Promise<AmlSar> {
    // Get user details for subject snapshot
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Create subject snapshot
    const subjectSnapshot = {
      name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      dateOfBirth: user.dateOfBirth?.toISOString().split('T')[0],
      address: user.address || {},
      idDocuments: [], // Would be populated from KYC
      accountInfo: {
        userId: user.id,
        email: user.email,
        phone: user.phone,
        kycStatus: user.kycStatus,
        createdAt: user.createdAt?.toISOString(),
      },
    };

    // Calculate due date (30 days from creation per most regulations)
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const sar = this.sarRepo.create({
      userId: dto.userId,
      reportType: (dto.reportType as SarReportType) || SarReportType.SAR,
      subjectSnapshot,
      filingInstitution: this.filingInstitution,
      narrative: dto.narrative,
      activityCategories: dto.activityCategories || [],
      totalAmount: dto.totalAmount,
      currency: dto.currency || 'USD',
      relatedAlerts: dto.relatedAlerts || [],
      relatedTransactions: dto.relatedTransactions || [],
      status: SarStatus.DRAFT,
      preparedBy,
      dueDate,
    });

    await this.sarRepo.save(sar);

    // Update related alerts to mark SAR initiated
    if (dto.relatedAlerts && dto.relatedAlerts.length > 0) {
      for (const alertId of dto.relatedAlerts) {
        const alert = await this.alertRepo.findOne({ where: { id: alertId } });
        if (alert) {
          alert.sarId = sar.id;
          alert.sarRequired = true;
          await this.alertRepo.save(alert);
        }
      }
    }

    this.logger.log(`Created SAR ${sar.reference} for user ${dto.userId}`);
    return sar;
  }

  /**
   * Get SAR by ID
   */
  async getSar(id: string): Promise<AmlSar> {
    const sar = await this.sarRepo.findOne({ where: { id } });
    if (!sar) {
      throw new NotFoundException('SAR not found');
    }
    return sar;
  }

  /**
   * Get SAR by reference
   */
  async getSarByReference(reference: string): Promise<AmlSar> {
    const sar = await this.sarRepo.findOne({ where: { reference } });
    if (!sar) {
      throw new NotFoundException('SAR not found');
    }
    return sar;
  }

  /**
   * Get SARs with filtering and pagination
   */
  async getSars(query: SarQueryDto): Promise<{ sars: AmlSar[]; total: number; page: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const whereConditions: any = {};

    if (query.status) whereConditions.status = query.status;
    if (query.reportType) whereConditions.reportType = query.reportType;
    if (query.userId) whereConditions.userId = query.userId;

    const [sars, total] = await this.sarRepo.findAndCount({
      where: whereConditions,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      sars,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get pending SARs (drafts and pending review)
   */
  async getPendingSars(): Promise<AmlSar[]> {
    return this.sarRepo.find({
      where: [
        { status: SarStatus.DRAFT },
        { status: SarStatus.PENDING_REVIEW },
      ],
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Get SARs for a user
   */
  async getUserSars(userId: string): Promise<AmlSar[]> {
    return this.sarRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update SAR (draft editing)
   */
  async updateSar(id: string, dto: UpdateSarDto): Promise<AmlSar> {
    const sar = await this.getSar(id);

    if (sar.status === SarStatus.FILED || sar.status === SarStatus.ACKNOWLEDGED) {
      throw new BadRequestException('Cannot modify filed SAR');
    }

    if (dto.narrative) sar.narrative = dto.narrative;
    if (dto.activityCategories) sar.activityCategories = dto.activityCategories;
    if (dto.totalAmount !== undefined) sar.totalAmount = dto.totalAmount;
    if (dto.followUpNotes) sar.followUpNotes = dto.followUpNotes;

    await this.sarRepo.save(sar);

    this.logger.log(`Updated SAR ${sar.reference}`);
    return sar;
  }

  /**
   * Submit SAR for review
   */
  async submitForReview(id: string): Promise<AmlSar> {
    const sar = await this.getSar(id);

    if (sar.status !== SarStatus.DRAFT) {
      throw new BadRequestException('Only draft SARs can be submitted for review');
    }

    // Validate required fields
    if (!sar.narrative || sar.narrative.length < 100) {
      throw new BadRequestException('Narrative must be at least 100 characters');
    }

    if (!sar.activityCategories || sar.activityCategories.length === 0) {
      throw new BadRequestException('At least one activity category is required');
    }

    sar.status = SarStatus.PENDING_REVIEW;
    await this.sarRepo.save(sar);

    this.logger.log(`SAR ${sar.reference} submitted for review`);
    return sar;
  }

  /**
   * Review SAR (approve or reject)
   */
  async reviewSar(
    id: string,
    action: 'approve' | 'reject',
    reviewedBy: string,
    notes?: string,
  ): Promise<AmlSar> {
    const sar = await this.getSar(id);

    if (sar.status !== SarStatus.PENDING_REVIEW) {
      throw new BadRequestException('SAR is not pending review');
    }

    sar.reviewedBy = reviewedBy;

    if (action === 'approve') {
      sar.status = SarStatus.APPROVED;
      this.logger.log(`SAR ${sar.reference} approved by ${reviewedBy}`);
    } else {
      sar.status = SarStatus.DRAFT; // Send back to draft
      // Add rejection notes
      const docs = sar.supportingDocuments || [];
      docs.push({
        name: 'Review Rejection',
        type: 'note',
        uploadedAt: new Date().toISOString(),
        reference: notes || 'Rejected - please revise',
      });
      sar.supportingDocuments = docs;
      this.logger.log(`SAR ${sar.reference} rejected by ${reviewedBy}`);
    }

    await this.sarRepo.save(sar);
    return sar;
  }

  /**
   * File SAR with regulator
   */
  async fileSar(id: string, filedBy: string): Promise<AmlSar> {
    const sar = await this.getSar(id);

    if (sar.status !== SarStatus.APPROVED) {
      throw new BadRequestException('Only approved SARs can be filed');
    }

    sar.status = SarStatus.FILED;
    sar.filedAt = new Date();
    // In production, this would be the actual BSA filing confirmation
    sar.filingConfirmation = `FIL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Update related alerts
    if (sar.relatedAlerts && sar.relatedAlerts.length > 0) {
      for (const alertId of sar.relatedAlerts) {
        const alert = await this.alertRepo.findOne({ where: { id: alertId } });
        if (alert) {
          alert.status = 'sar_filed' as any;
          await this.alertRepo.save(alert);
        }
      }
    }

    await this.sarRepo.save(sar);

    this.logger.log(`SAR ${sar.reference} filed with confirmation ${sar.filingConfirmation}`);
    return sar;
  }

  /**
   * Acknowledge regulator response
   */
  async acknowledgeSar(
    id: string,
    regulatorResponse: Record<string, any>,
  ): Promise<AmlSar> {
    const sar = await this.getSar(id);

    if (sar.status !== SarStatus.FILED) {
      throw new BadRequestException('Only filed SARs can be acknowledged');
    }

    sar.status = SarStatus.ACKNOWLEDGED;
    sar.regulatorResponse = regulatorResponse;

    await this.sarRepo.save(sar);

    this.logger.log(`SAR ${sar.reference} acknowledged`);
    return sar;
  }

  /**
   * Request extension for SAR filing deadline
   */
  async requestExtension(
    id: string,
    extensionDays: number,
    reason: string,
  ): Promise<AmlSar> {
    const sar = await this.getSar(id);

    if ([SarStatus.FILED, SarStatus.ACKNOWLEDGED].includes(sar.status)) {
      throw new BadRequestException('Cannot extend deadline for filed SAR');
    }

    const currentDue = sar.extendedDueDate || sar.dueDate;
    const newDueDate = new Date(currentDue);
    newDueDate.setDate(newDueDate.getDate() + extensionDays);

    sar.extendedDueDate = newDueDate;
    sar.extensionReason = reason;

    await this.sarRepo.save(sar);

    this.logger.log(`SAR ${sar.reference} deadline extended by ${extensionDays} days`);
    return sar;
  }

  /**
   * Set follow-up required
   */
  async setFollowUp(
    id: string,
    followUpDate: Date,
    notes: string,
  ): Promise<AmlSar> {
    const sar = await this.getSar(id);

    sar.followUpRequired = true;
    sar.followUpDate = followUpDate;
    sar.followUpNotes = notes;

    await this.sarRepo.save(sar);

    this.logger.log(`SAR ${sar.reference} follow-up scheduled for ${followUpDate.toISOString()}`);
    return sar;
  }

  /**
   * Get SAR statistics
   */
  async getSarStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    pendingCount: number;
    overdueCount: number;
    filedThisMonth: number;
  }> {
    const allSars = await this.sarRepo.find();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    Object.values(SarStatus).forEach(status => {
      byStatus[status] = allSars.filter(s => s.status === status).length;
    });

    Object.values(SarReportType).forEach(type => {
      byType[type] = allSars.filter(s => s.reportType === type).length;
    });

    const pendingCount = allSars.filter(
      s => s.status === SarStatus.DRAFT || s.status === SarStatus.PENDING_REVIEW,
    ).length;

    const overdueCount = allSars.filter(s => {
      if (s.status === SarStatus.FILED || s.status === SarStatus.ACKNOWLEDGED) return false;
      const dueDate = s.extendedDueDate || s.dueDate;
      return dueDate && dueDate < now;
    }).length;

    const filedThisMonth = allSars.filter(
      s => s.filedAt && s.filedAt >= startOfMonth,
    ).length;

    return {
      total: allSars.length,
      byStatus,
      byType,
      pendingCount,
      overdueCount,
      filedThisMonth,
    };
  }

  /**
   * Generate SAR narrative template
   */
  generateNarrativeTemplate(
    userName: string,
    alertSummary: string,
    transactionDetails: string,
  ): string {
    return `
SUSPICIOUS ACTIVITY REPORT NARRATIVE

1. SUBJECT INFORMATION
Name: ${userName}
This report is being filed regarding suspicious activity identified through our transaction monitoring and AML compliance program.

2. SUSPICIOUS ACTIVITY SUMMARY
${alertSummary}

3. TRANSACTION DETAILS
${transactionDetails}

4. INVESTIGATION SUMMARY
Our compliance team conducted a thorough review of the subject's account activity and determined that the pattern of transactions is indicative of potentially suspicious activity that warrants reporting to the appropriate regulatory authorities.

5. ADDITIONAL INFORMATION
[To be completed by compliance officer]

6. RECOMMENDATION
Based on the investigation findings, we recommend [action to be determined by compliance officer].

---
Report prepared by: Compliance Department
Date: ${new Date().toISOString().split('T')[0]}
    `.trim();
  }
}
