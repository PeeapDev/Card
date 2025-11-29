import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('risk_scores')
export class RiskScore {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  @Index()
  transactionId: string;

  @Column({ name: 'card_token', length: 100, nullable: true })
  @Index()
  cardToken: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  @Index()
  userId: string;

  // Overall score (0-100)
  @Column({ name: 'overall_score', type: 'decimal', precision: 5, scale: 2 })
  overallScore: number;

  // Component scores
  @Column({ name: 'velocity_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  velocityScore: number;

  @Column({ name: 'amount_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  amountScore: number;

  @Column({ name: 'geo_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  geoScore: number;

  @Column({ name: 'device_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  deviceScore: number;

  @Column({ name: 'ml_score', type: 'decimal', precision: 5, scale: 2, nullable: true })
  mlScore: number;

  // Decision
  @Column({ length: 20 })
  decision: 'APPROVE' | 'DECLINE' | 'REVIEW';

  // Rules that were triggered
  @Column({ name: 'triggered_rules', type: 'simple-array', nullable: true })
  triggeredRules: string[];

  // Feature vector used for ML (for debugging/auditing)
  @Column({ name: 'feature_vector', type: 'jsonb', nullable: true })
  featureVector: Record<string, any>;

  // Processing time
  @Column({ name: 'processing_time_ms', type: 'int' })
  processingTimeMs: number;

  @Column({ name: 'model_version', length: 50, nullable: true })
  modelVersion: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;
}
