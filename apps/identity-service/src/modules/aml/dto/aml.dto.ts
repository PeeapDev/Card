import { IsString, IsUUID, IsOptional, IsEnum, IsNumber, IsBoolean, IsArray, IsObject, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { AlertStatus, AlertSeverity, AlertType, AlertResolution } from '@payment-system/database';

// ================== Screening DTOs ==================

export class ScreenUserDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  screeningType?: 'onboarding' | 'periodic' | 'transaction' | 'manual';

  @IsOptional()
  @IsString()
  triggeredBy?: string;
}

export class ScreeningResultDto {
  id: string;
  userId: string;
  screeningType: string;
  screenedName: string;
  totalMatches: number;
  highestMatchScore: number;
  matches: any[];
  status: string;
  riskLevel: string;
  requiresEdd: boolean;
  createdAt: Date;
}

export class ResolveScreeningDto {
  @IsEnum(['cleared', 'escalated', 'blocked'])
  status: string;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;
}

// ================== Alert DTOs ==================

export class CreateAlertDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsUUID()
  transactionId?: string;

  @IsEnum(AlertType)
  alertType: AlertType;

  @IsEnum(AlertSeverity)
  severity: AlertSeverity;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  triggerData?: Record<string, any>;

  @IsOptional()
  @IsString()
  ruleCode?: string;

  @IsOptional()
  @IsNumber()
  riskScoreImpact?: number;
}

export class UpdateAlertDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ResolveAlertDto {
  @IsEnum(AlertResolution)
  resolution: AlertResolution;

  @IsOptional()
  @IsString()
  resolutionNotes?: string;

  @IsOptional()
  @IsBoolean()
  requiresSar?: boolean;
}

export class AlertQueryDto {
  @IsOptional()
  @IsEnum(AlertStatus)
  status?: AlertStatus;

  @IsOptional()
  @IsEnum(AlertSeverity)
  severity?: AlertSeverity;

  @IsOptional()
  @IsEnum(AlertType)
  alertType?: AlertType;

  @IsOptional()
  @IsUUID()
  assignedTo?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ================== Risk Profile DTOs ==================

export class RiskProfileDto {
  id: string;
  userId: string;
  overallRiskScore: number;
  riskLevel: string;
  kycRiskScore: number;
  geographicRiskScore: number;
  transactionRiskScore: number;
  behaviorRiskScore: number;
  pepRiskScore: number;
  sanctionsRiskScore: number;
  riskFactors: any[];
  isPep: boolean;
  eddRequired: boolean;
  eddCompleted: boolean;
  isRestricted: boolean;
  nextReviewAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class UpdateRiskProfileDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  kycRiskScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  geographicRiskScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  transactionRiskScore?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  behaviorRiskScore?: number;

  @IsOptional()
  @IsBoolean()
  isPep?: boolean;

  @IsOptional()
  @IsString()
  pepCategory?: string;

  @IsOptional()
  @IsBoolean()
  eddRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  isRestricted?: boolean;

  @IsOptional()
  @IsString()
  restrictionReason?: string;
}

// ================== SAR DTOs ==================

export class CreateSarDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  reportType?: 'SAR' | 'CTR' | 'SAR-SF';

  @IsString()
  narrative: string;

  @IsOptional()
  @IsArray()
  activityCategories?: string[];

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsArray()
  relatedAlerts?: string[];

  @IsOptional()
  @IsArray()
  relatedTransactions?: string[];
}

export class UpdateSarDto {
  @IsOptional()
  @IsString()
  narrative?: string;

  @IsOptional()
  @IsArray()
  activityCategories?: string[];

  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsEnum(['draft', 'pending_review', 'approved', 'filed', 'acknowledged'])
  status?: string;

  @IsOptional()
  @IsString()
  followUpNotes?: string;
}

export class SarQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reportType?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ================== Monitoring Rule DTOs ==================

export class CreateMonitoringRuleDto {
  @IsString()
  code: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(['structuring', 'velocity', 'geographic', 'behavioral', 'amount'])
  category: string;

  @IsEnum(['threshold', 'pattern', 'ml_model', 'aggregate'])
  ruleType: string;

  @IsObject()
  parameters: Record<string, any>;

  @IsOptional()
  @IsNumber()
  timeWindowMinutes?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  riskScoreImpact?: number;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: string;

  @IsOptional()
  @IsEnum(['alert', 'block', 'review', 'notify'])
  actionType?: string;

  @IsOptional()
  @IsBoolean()
  autoEscalate?: boolean;

  @IsOptional()
  @IsBoolean()
  requiresSar?: boolean;
}

export class UpdateMonitoringRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;

  @IsOptional()
  @IsNumber()
  riskScoreImpact?: number;

  @IsOptional()
  @IsString()
  severity?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ================== Dashboard/Stats DTOs ==================

export class AmlDashboardStatsDto {
  pendingScreenings: number;
  openAlerts: number;
  criticalAlerts: number;
  highRiskUsers: number;
  pendingSars: number;
  alertsTodayCount: number;
  alertsResolvedToday: number;
  eddPendingCount: number;
}

export class AlertStatsDto {
  total: number;
  open: number;
  investigating: number;
  resolved: number;
  dismissed: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byType: Record<string, number>;
}
