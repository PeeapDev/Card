import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum RuleCategory {
  STRUCTURING = 'structuring',
  VELOCITY = 'velocity',
  GEOGRAPHIC = 'geographic',
  BEHAVIORAL = 'behavioral',
  AMOUNT = 'amount',
}

export enum RuleType {
  THRESHOLD = 'threshold',
  PATTERN = 'pattern',
  ML_MODEL = 'ml_model',
  AGGREGATE = 'aggregate',
}

export enum RuleActionType {
  ALERT = 'alert',
  BLOCK = 'block',
  REVIEW = 'review',
  NOTIFY = 'notify',
}

@Entity('aml_monitoring_rules')
export class AmlMonitoringRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50 })
  category: RuleCategory;

  @Column({ name: 'rule_type', length: 50 })
  ruleType: RuleType;

  // Rule parameters
  @Column({ type: 'jsonb', default: {} })
  parameters: {
    amount_threshold?: number;
    currency?: string;
    daily_count_limit?: number;
    daily_amount_limit?: number;
    time_window_hours?: number;
    time_window_days?: number;
    countries?: string[];
    percentage_moved?: number;
    deviation_threshold?: number;
    [key: string]: any;
  };

  @Column({ name: 'time_window_minutes', type: 'int', nullable: true })
  timeWindowMinutes: number;

  // Risk impact
  @Column({ name: 'risk_score_impact', type: 'int', default: 10 })
  riskScoreImpact: number;

  @Column({ length: 20, default: 'medium' })
  severity: string;

  // Actions
  @Column({ name: 'action_type', length: 50, default: RuleActionType.ALERT })
  actionType: RuleActionType;

  @Column({ name: 'auto_escalate', type: 'boolean', default: false })
  autoEscalate: boolean;

  @Column({ name: 'requires_sar', type: 'boolean', default: false })
  requiresSar: boolean;

  // Status
  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
