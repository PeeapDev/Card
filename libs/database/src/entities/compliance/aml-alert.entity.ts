import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum AlertType {
  AML = 'aml',
  PEP = 'pep',
  SANCTIONS = 'sanctions',
  VELOCITY = 'velocity',
  FRAUD = 'fraud',
  BEHAVIORAL = 'behavioral',
  STRUCTURING = 'structuring',
  GEOGRAPHIC = 'geographic',
}

export enum AlertSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum AlertStatus {
  OPEN = 'open',
  INVESTIGATING = 'investigating',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed',
  SAR_FILED = 'sar_filed',
}

export enum AlertResolution {
  FALSE_POSITIVE = 'false_positive',
  TRUE_POSITIVE = 'true_positive',
  INCONCLUSIVE = 'inconclusive',
  SAR_FILED = 'sar_filed',
}

@Entity('aml_alerts')
export class AmlAlert {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  reference: string;

  @Column({ name: 'rule_id', type: 'uuid', nullable: true })
  ruleId: string;

  @Column({ name: 'rule_code', length: 50, nullable: true })
  ruleCode: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string;

  @Column({ name: 'alert_type', type: 'varchar', length: 50 })
  @Index()
  alertType: AlertType;

  @Column({ type: 'varchar', length: 20, default: AlertSeverity.MEDIUM })
  @Index()
  severity: AlertSeverity;

  @Column({ length: 500 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'trigger_data', type: 'jsonb', default: {} })
  triggerData: Record<string, any>;

  @Column({ type: 'varchar', length: 50, default: AlertStatus.OPEN })
  @Index()
  status: AlertStatus;

  @Column({ name: 'assigned_to', type: 'uuid', nullable: true })
  @Index()
  assignedTo: string;

  @Column({ name: 'assigned_at', type: 'timestamptz', nullable: true })
  assignedAt: Date;

  @Column({ name: 'investigation_notes', type: 'jsonb', default: [] })
  investigationNotes: Array<{
    note: string;
    addedBy: string;
    addedAt: string;
  }>;

  @Column({ type: 'varchar', length: 50, nullable: true })
  resolution: AlertResolution;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @Column({ name: 'resolved_by', type: 'uuid', nullable: true })
  resolvedBy: string;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'sar_required', type: 'boolean', default: false })
  sarRequired: boolean;

  @Column({ name: 'sar_id', type: 'uuid', nullable: true })
  sarId: string;

  @Column({ name: 'risk_score_impact', type: 'int', default: 0 })
  riskScoreImpact: number;

  @Column({ name: 'due_date', type: 'timestamptz', nullable: true })
  dueDate: Date;

  @Column({ name: 'escalated_at', type: 'timestamptz', nullable: true })
  escalatedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
