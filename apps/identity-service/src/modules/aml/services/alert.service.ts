import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, In } from 'typeorm';
import {
  AmlAlert,
  AlertStatus,
  AlertSeverity,
  AlertType,
  AlertResolution,
} from '@payment-system/database';
import { CreateAlertDto, UpdateAlertDto, ResolveAlertDto, AlertQueryDto, AlertStatsDto } from '../dto/aml.dto';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);

  constructor(
    @InjectRepository(AmlAlert)
    private alertRepo: Repository<AmlAlert>,
  ) {}

  /**
   * Create a new AML alert
   */
  async createAlert(dto: CreateAlertDto): Promise<AmlAlert> {
    const alert = this.alertRepo.create({
      userId: dto.userId,
      transactionId: dto.transactionId,
      alertType: dto.alertType,
      severity: dto.severity,
      title: dto.title,
      description: dto.description,
      triggerData: dto.triggerData || {},
      ruleCode: dto.ruleCode,
      riskScoreImpact: dto.riskScoreImpact || 0,
      status: AlertStatus.OPEN,
      // Due date: 30 days for low/medium, 7 days for high/critical
      dueDate: this.calculateDueDate(dto.severity),
    });

    await this.alertRepo.save(alert);

    this.logger.log(`Created alert ${alert.reference} for user ${dto.userId}: ${dto.title}`);
    return alert;
  }

  /**
   * Calculate due date based on severity
   */
  private calculateDueDate(severity: AlertSeverity): Date {
    const now = new Date();
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
      case AlertSeverity.HIGH:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
      case AlertSeverity.MEDIUM:
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
      default:
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  }

  /**
   * Get alert by ID
   */
  async getAlert(id: string): Promise<AmlAlert> {
    const alert = await this.alertRepo.findOne({ where: { id } });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    return alert;
  }

  /**
   * Get alert by reference
   */
  async getAlertByReference(reference: string): Promise<AmlAlert> {
    const alert = await this.alertRepo.findOne({ where: { reference } });
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }
    return alert;
  }

  /**
   * Get alerts with filtering and pagination
   */
  async getAlerts(query: AlertQueryDto): Promise<{ alerts: AmlAlert[]; total: number; page: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = query.limit || 20;

    const whereConditions: any = {};

    if (query.status) whereConditions.status = query.status;
    if (query.severity) whereConditions.severity = query.severity;
    if (query.alertType) whereConditions.alertType = query.alertType;
    if (query.assignedTo) whereConditions.assignedTo = query.assignedTo;
    if (query.userId) whereConditions.userId = query.userId;

    const [alerts, total] = await this.alertRepo.findAndCount({
      where: whereConditions,
      order: {
        severity: 'DESC', // Critical first
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      alerts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get open alerts (not resolved or dismissed)
   */
  async getOpenAlerts(page = 1, limit = 20): Promise<{ alerts: AmlAlert[]; total: number }> {
    const [alerts, total] = await this.alertRepo.findAndCount({
      where: {
        status: In([AlertStatus.OPEN, AlertStatus.INVESTIGATING, AlertStatus.ESCALATED]),
      },
      order: {
        severity: 'DESC',
        createdAt: 'DESC',
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { alerts, total };
  }

  /**
   * Get critical alerts
   */
  async getCriticalAlerts(): Promise<AmlAlert[]> {
    return this.alertRepo.find({
      where: {
        severity: AlertSeverity.CRITICAL,
        status: In([AlertStatus.OPEN, AlertStatus.INVESTIGATING, AlertStatus.ESCALATED]),
      },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get alerts for a specific user
   */
  async getUserAlerts(userId: string): Promise<AmlAlert[]> {
    return this.alertRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Update alert (assign, add notes, change status)
   */
  async updateAlert(id: string, dto: UpdateAlertDto, updatedBy: string): Promise<AmlAlert> {
    const alert = await this.getAlert(id);

    if (dto.status) {
      // Validate status transition
      this.validateStatusTransition(alert.status, dto.status);
      alert.status = dto.status;

      if (dto.status === AlertStatus.ESCALATED) {
        alert.escalatedAt = new Date();
      }
    }

    if (dto.assignedTo) {
      alert.assignedTo = dto.assignedTo;
      alert.assignedAt = new Date();
    }

    if (dto.note) {
      const notes = alert.investigationNotes || [];
      notes.push({
        note: dto.note,
        addedBy: updatedBy,
        addedAt: new Date().toISOString(),
      });
      alert.investigationNotes = notes;
    }

    await this.alertRepo.save(alert);

    this.logger.log(`Updated alert ${alert.reference} by ${updatedBy}`);
    return alert;
  }

  /**
   * Validate status transition
   */
  private validateStatusTransition(currentStatus: AlertStatus, newStatus: AlertStatus): void {
    const validTransitions: Record<AlertStatus, AlertStatus[]> = {
      [AlertStatus.OPEN]: [AlertStatus.INVESTIGATING, AlertStatus.ESCALATED, AlertStatus.DISMISSED],
      [AlertStatus.INVESTIGATING]: [AlertStatus.RESOLVED, AlertStatus.ESCALATED, AlertStatus.DISMISSED, AlertStatus.SAR_FILED],
      [AlertStatus.ESCALATED]: [AlertStatus.INVESTIGATING, AlertStatus.RESOLVED, AlertStatus.SAR_FILED],
      [AlertStatus.RESOLVED]: [], // Cannot change from resolved
      [AlertStatus.DISMISSED]: [], // Cannot change from dismissed
      [AlertStatus.SAR_FILED]: [AlertStatus.RESOLVED], // Can only go to resolved after SAR
    };

    if (!validTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}`,
      );
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(id: string, dto: ResolveAlertDto, resolvedBy: string): Promise<AmlAlert> {
    const alert = await this.getAlert(id);

    if ([AlertStatus.RESOLVED, AlertStatus.DISMISSED].includes(alert.status)) {
      throw new BadRequestException('Alert is already resolved or dismissed');
    }

    alert.resolution = dto.resolution;
    alert.resolutionNotes = dto.resolutionNotes;
    alert.resolvedBy = resolvedBy;
    alert.resolvedAt = new Date();
    alert.status = dto.resolution === AlertResolution.SAR_FILED
      ? AlertStatus.SAR_FILED
      : AlertStatus.RESOLVED;
    alert.sarRequired = dto.requiresSar || false;

    await this.alertRepo.save(alert);

    this.logger.log(`Alert ${alert.reference} resolved as ${dto.resolution} by ${resolvedBy}`);
    return alert;
  }

  /**
   * Dismiss an alert (false positive with quick resolution)
   */
  async dismissAlert(id: string, reason: string, dismissedBy: string): Promise<AmlAlert> {
    const alert = await this.getAlert(id);

    alert.status = AlertStatus.DISMISSED;
    alert.resolution = AlertResolution.FALSE_POSITIVE;
    alert.resolutionNotes = reason;
    alert.resolvedBy = dismissedBy;
    alert.resolvedAt = new Date();

    await this.alertRepo.save(alert);

    this.logger.log(`Alert ${alert.reference} dismissed by ${dismissedBy}: ${reason}`);
    return alert;
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(): Promise<AlertStatsDto> {
    const allAlerts = await this.alertRepo.find();

    const stats: AlertStatsDto = {
      total: allAlerts.length,
      open: allAlerts.filter(a => a.status === AlertStatus.OPEN).length,
      investigating: allAlerts.filter(a => a.status === AlertStatus.INVESTIGATING).length,
      resolved: allAlerts.filter(a => a.status === AlertStatus.RESOLVED).length,
      dismissed: allAlerts.filter(a => a.status === AlertStatus.DISMISSED).length,
      bySeverity: {
        low: allAlerts.filter(a => a.severity === AlertSeverity.LOW).length,
        medium: allAlerts.filter(a => a.severity === AlertSeverity.MEDIUM).length,
        high: allAlerts.filter(a => a.severity === AlertSeverity.HIGH).length,
        critical: allAlerts.filter(a => a.severity === AlertSeverity.CRITICAL).length,
      },
      byType: {},
    };

    // Count by type
    Object.values(AlertType).forEach(type => {
      stats.byType[type] = allAlerts.filter(a => a.alertType === type).length;
    });

    return stats;
  }

  /**
   * Get today's alert count
   */
  async getTodayAlertCount(): Promise<{ created: number; resolved: number }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const created = await this.alertRepo.count({
      where: {
        createdAt: MoreThanOrEqual(today),
      },
    });

    const resolved = await this.alertRepo.count({
      where: {
        resolvedAt: MoreThanOrEqual(today),
      },
    });

    return { created, resolved };
  }

  /**
   * Get overdue alerts
   */
  async getOverdueAlerts(): Promise<AmlAlert[]> {
    const now = new Date();

    return this.alertRepo.find({
      where: {
        status: In([AlertStatus.OPEN, AlertStatus.INVESTIGATING]),
        dueDate: Between(new Date(0), now),
      },
      order: { dueDate: 'ASC' },
    });
  }

  /**
   * Auto-escalate overdue critical/high alerts
   */
  async autoEscalateOverdueAlerts(): Promise<number> {
    const overdueAlerts = await this.alertRepo.find({
      where: {
        status: AlertStatus.OPEN,
        severity: In([AlertSeverity.CRITICAL, AlertSeverity.HIGH]),
        dueDate: Between(new Date(0), new Date()),
      },
    });

    let escalatedCount = 0;
    for (const alert of overdueAlerts) {
      alert.status = AlertStatus.ESCALATED;
      alert.escalatedAt = new Date();
      const notes = alert.investigationNotes || [];
      notes.push({
        note: 'Auto-escalated due to overdue status',
        addedBy: 'system',
        addedAt: new Date().toISOString(),
      });
      alert.investigationNotes = notes;
      await this.alertRepo.save(alert);
      escalatedCount++;
    }

    if (escalatedCount > 0) {
      this.logger.log(`Auto-escalated ${escalatedCount} overdue alerts`);
    }

    return escalatedCount;
  }
}
