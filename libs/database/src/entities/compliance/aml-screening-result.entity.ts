import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ScreeningType {
  ONBOARDING = 'onboarding',
  PERIODIC = 'periodic',
  TRANSACTION = 'transaction',
  MANUAL = 'manual',
}

export enum ScreeningStatus {
  PENDING = 'pending',
  CLEARED = 'cleared',
  ESCALATED = 'escalated',
  BLOCKED = 'blocked',
}

@Entity('aml_screening_results')
export class AmlScreeningResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'screening_type', length: 50, default: ScreeningType.ONBOARDING })
  screeningType: ScreeningType;

  @Column({ name: 'triggered_by', length: 50, default: 'system' })
  triggeredBy: string;

  @Column({ name: 'triggered_by_user_id', type: 'uuid', nullable: true })
  triggeredByUserId: string;

  // Screened data
  @Column({ name: 'screened_name', length: 500, nullable: true })
  screenedName: string;

  @Column({ name: 'screened_dob', type: 'date', nullable: true })
  screenedDob: Date;

  @Column({ name: 'screened_nationality', length: 100, nullable: true })
  screenedNationality: string;

  @Column({ name: 'screened_id_number', length: 255, nullable: true })
  screenedIdNumber: string;

  // Results
  @Column({ name: 'total_matches', type: 'int', default: 0 })
  totalMatches: number;

  @Column({ name: 'highest_match_score', type: 'decimal', precision: 5, scale: 2, default: 0 })
  highestMatchScore: number;

  @Column({ type: 'jsonb', default: [] })
  matches: Array<{
    watchlistId: string;
    watchlistCode: string;
    entryId: string;
    entryName: string;
    matchScore: number;
    matchType: string;
    matchedFields: string[];
  }>;

  // Resolution
  @Column({ type: 'varchar', length: 50, default: ScreeningStatus.PENDING })
  @Index()
  status: ScreeningStatus;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  // Risk assessment
  @Column({ name: 'risk_level', length: 20, nullable: true })
  @Index()
  riskLevel: string;

  @Column({ name: 'requires_edd', type: 'boolean', default: false })
  requiresEdd: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
