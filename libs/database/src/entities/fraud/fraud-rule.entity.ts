import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum FraudRuleType {
  VELOCITY = 'VELOCITY',
  AMOUNT = 'AMOUNT',
  GEO = 'GEO',
  DEVICE = 'DEVICE',
  MCC = 'MCC',
  TIME = 'TIME',
  CUSTOM = 'CUSTOM',
}

export enum FraudRuleAction {
  APPROVE = 'APPROVE',
  DECLINE = 'DECLINE',
  REVIEW = 'REVIEW',
  SCORE = 'SCORE',
}

@Entity('fraud_rules')
export class FraudRule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  @Index()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'rule_type', type: 'enum', enum: FraudRuleType })
  ruleType: FraudRuleType;

  @Column({ type: 'enum', enum: FraudRuleAction })
  action: FraudRuleAction;

  @Column({ type: 'int', default: 50 })
  priority: number;

  @Column({ default: true })
  enabled: boolean;

  // Rule configuration (JSON schema depends on rule type)
  @Column({ type: 'jsonb' })
  conditions: Record<string, any>;

  // Score contribution if action is SCORE
  @Column({ name: 'score_impact', type: 'int', default: 0 })
  scoreImpact: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
