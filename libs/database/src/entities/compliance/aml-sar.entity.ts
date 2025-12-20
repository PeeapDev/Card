import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SarReportType {
  SAR = 'SAR',
  CTR = 'CTR',
  SAR_SF = 'SAR-SF', // Simplified form
}

export enum SarStatus {
  DRAFT = 'draft',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  FILED = 'filed',
  ACKNOWLEDGED = 'acknowledged',
}

@Entity('aml_suspicious_activity_reports')
export class AmlSar {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  reference: string;

  @Column({ name: 'report_type', length: 50, default: SarReportType.SAR })
  @Index()
  reportType: SarReportType;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  // Subject snapshot at time of filing
  @Column({ name: 'subject_snapshot', type: 'jsonb' })
  subjectSnapshot: {
    name: string;
    dateOfBirth?: string;
    address?: Record<string, any>;
    idDocuments?: Array<{ type: string; number: string }>;
    accountInfo?: Record<string, any>;
  };

  // Filing institution
  @Column({ name: 'filing_institution', type: 'jsonb', default: {} })
  filingInstitution: {
    name?: string;
    address?: Record<string, any>;
    regulatoryIds?: Record<string, string>;
  };

  // Activity details
  @Column({ name: 'activity_start_date', type: 'date', nullable: true })
  activityStartDate: Date;

  @Column({ name: 'activity_end_date', type: 'date', nullable: true })
  activityEndDate: Date;

  @Column({ name: 'total_amount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  totalAmount: number;

  @Column({ length: 3, default: 'USD' })
  currency: string;

  // Categories
  @Column({ name: 'activity_categories', type: 'text', array: true, nullable: true })
  activityCategories: string[];

  // Narrative
  @Column({ type: 'text' })
  narrative: string;

  // Related items
  @Column({ name: 'related_alerts', type: 'uuid', array: true, nullable: true })
  relatedAlerts: string[];

  @Column({ name: 'related_transactions', type: 'uuid', array: true, nullable: true })
  relatedTransactions: string[];

  @Column({ name: 'supporting_documents', type: 'jsonb', default: [] })
  supportingDocuments: Array<{
    name: string;
    type: string;
    uploadedAt: string;
    reference: string;
  }>;

  // Status and workflow
  @Column({ type: 'varchar', length: 50, default: SarStatus.DRAFT })
  @Index()
  status: SarStatus;

  @Column({ name: 'prepared_by', type: 'uuid', nullable: true })
  preparedBy: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ name: 'approved_by', type: 'uuid', nullable: true })
  approvedBy: string;

  // Filing info
  @Column({ name: 'filed_at', type: 'timestamptz', nullable: true })
  @Index()
  filedAt: Date;

  @Column({ name: 'filing_confirmation', length: 255, nullable: true })
  filingConfirmation: string;

  @Column({ name: 'regulator_response', type: 'jsonb', nullable: true })
  regulatorResponse: Record<string, any>;

  // Deadlines
  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  @Index()
  dueDate: Date;

  @Column({ name: 'extended_due_date', type: 'timestamptz', nullable: true })
  extendedDueDate: Date;

  @Column({ name: 'extension_reason', type: 'text', nullable: true })
  extensionReason: string;

  // Follow-up
  @Column({ name: 'follow_up_required', type: 'boolean', default: false })
  followUpRequired: boolean;

  @Column({ name: 'follow_up_date', type: 'timestamptz', nullable: true })
  followUpDate: Date;

  @Column({ name: 'follow_up_notes', type: 'text', nullable: true })
  followUpNotes: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
