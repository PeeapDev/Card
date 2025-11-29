import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum AuthorizationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED',
  VOIDED = 'VOIDED',
  CAPTURED = 'CAPTURED',
}

@Entity('authorizations')
export class Authorization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  @Index()
  transactionId: string;

  @Column({
    type: 'enum',
    enum: AuthorizationStatus,
    default: AuthorizationStatus.PENDING,
  })
  status: AuthorizationStatus;

  @Column({ name: 'authorization_code', length: 20, nullable: true })
  @Index()
  authorizationCode: string;

  @Column({
    name: 'amount_authorized',
    type: 'decimal',
    precision: 19,
    scale: 4,
  })
  amountAuthorized: number;

  @Column({
    name: 'amount_captured',
    type: 'decimal',
    precision: 19,
    scale: 4,
    default: 0,
  })
  amountCaptured: number;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  // Hold reference
  @Column({ name: 'hold_id', type: 'uuid', nullable: true })
  holdId: string;

  // Fraud evaluation
  @Column({
    name: 'fraud_score',
    type: 'decimal',
    precision: 5,
    scale: 4,
    nullable: true,
  })
  fraudScore: number;

  @Column({ name: 'fraud_decision', length: 20, nullable: true })
  fraudDecision: 'APPROVE' | 'DECLINE' | 'REVIEW';

  @Column({ name: 'fraud_rules_triggered', type: 'simple-array', nullable: true })
  fraudRulesTriggered: string[];

  // Decline details
  @Column({ name: 'decline_code', length: 50, nullable: true })
  declineCode: string;

  @Column({ name: 'decline_reason', length: 255, nullable: true })
  declineReason: string;

  // Request details
  @Column({ type: 'jsonb', nullable: true })
  request: {
    cardToken: string;
    merchantId: string;
    merchantName: string;
    mcc: string;
    channel: string;
    ipAddress: string;
    deviceFingerprint: string;
  };

  // Response time tracking
  @Column({ name: 'processing_time_ms', type: 'int', nullable: true })
  processingTimeMs: number;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'captured_at', type: 'timestamptz', nullable: true })
  capturedAt: Date;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  getRemainingCapturable(): number {
    return Number(this.amountAuthorized) - Number(this.amountCaptured);
  }

  canCapture(): boolean {
    return (
      this.status === AuthorizationStatus.APPROVED &&
      !this.isExpired() &&
      this.getRemainingCapturable() > 0
    );
  }
}
