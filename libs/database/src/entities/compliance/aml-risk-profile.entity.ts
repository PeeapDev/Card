import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum PepCategory {
  DOMESTIC_PEP = 'domestic_pep',
  FOREIGN_PEP = 'foreign_pep',
  INTERNATIONAL_ORG = 'international_org',
  RCA = 'rca', // Relatives and Close Associates
}

export enum ReviewFrequency {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  SEMI_ANNUAL = 'semi_annual',
  ANNUAL = 'annual',
}

@Entity('aml_risk_profiles')
export class AmlRiskProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid', unique: true })
  @Index()
  userId: string;

  @Column({ name: 'overall_risk_score', type: 'int', default: 0 })
  @Index()
  overallRiskScore: number;

  @Column({ name: 'risk_level', type: 'varchar', length: 20, default: RiskLevel.LOW })
  @Index()
  riskLevel: RiskLevel;

  // Component scores (0-100)
  @Column({ name: 'kyc_risk_score', type: 'int', default: 0 })
  kycRiskScore: number;

  @Column({ name: 'geographic_risk_score', type: 'int', default: 0 })
  geographicRiskScore: number;

  @Column({ name: 'product_risk_score', type: 'int', default: 0 })
  productRiskScore: number;

  @Column({ name: 'channel_risk_score', type: 'int', default: 0 })
  channelRiskScore: number;

  @Column({ name: 'transaction_risk_score', type: 'int', default: 0 })
  transactionRiskScore: number;

  @Column({ name: 'behavior_risk_score', type: 'int', default: 0 })
  behaviorRiskScore: number;

  @Column({ name: 'pep_risk_score', type: 'int', default: 0 })
  pepRiskScore: number;

  @Column({ name: 'sanctions_risk_score', type: 'int', default: 0 })
  sanctionsRiskScore: number;

  @Column({ name: 'risk_factors', type: 'jsonb', default: [] })
  riskFactors: Array<{
    factor: string;
    category: string;
    score: number;
    description: string;
    detectedAt: string;
  }>;

  // Geographic risk
  @Column({ name: 'residence_country', length: 3, nullable: true })
  residenceCountry: string;

  @Column({ name: 'residence_risk_level', length: 20, nullable: true })
  residenceRiskLevel: string;

  @Column({ name: 'citizenship_countries', type: 'varchar', array: true, nullable: true })
  citizenshipCountries: string[];

  @Column({ name: 'high_risk_country_connections', type: 'boolean', default: false })
  highRiskCountryConnections: boolean;

  // PEP status
  @Column({ name: 'is_pep', type: 'boolean', default: false })
  isPep: boolean;

  @Column({ name: 'pep_category', length: 50, nullable: true })
  pepCategory: PepCategory;

  @Column({ name: 'pep_details', type: 'jsonb', nullable: true })
  pepDetails: Record<string, any>;

  // Enhanced Due Diligence
  @Column({ name: 'edd_required', type: 'boolean', default: false })
  @Index()
  eddRequired: boolean;

  @Column({ name: 'edd_completed', type: 'boolean', default: false })
  eddCompleted: boolean;

  @Column({ name: 'edd_completed_at', type: 'timestamptz', nullable: true })
  eddCompletedAt: Date;

  @Column({ name: 'edd_next_review_at', type: 'timestamptz', nullable: true })
  eddNextReviewAt: Date;

  // Periodic review
  @Column({ name: 'next_review_at', type: 'timestamptz', nullable: true })
  @Index()
  nextReviewAt: Date;

  @Column({ name: 'last_reviewed_at', type: 'timestamptz', nullable: true })
  lastReviewedAt: Date;

  @Column({ name: 'review_frequency', length: 50, default: ReviewFrequency.ANNUAL })
  reviewFrequency: ReviewFrequency;

  // Restrictions
  @Column({ name: 'is_restricted', type: 'boolean', default: false })
  isRestricted: boolean;

  @Column({ name: 'restriction_reason', type: 'text', nullable: true })
  restrictionReason: string;

  @Column({ name: 'restricted_at', type: 'timestamptz', nullable: true })
  restrictedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
