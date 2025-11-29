import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';
import { TransactionState } from '../../enums/transaction-state.enum';
import { TransactionType, PaymentChannel } from '../../enums/transaction-type.enum';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', unique: true, length: 50 })
  @Index()
  externalId: string;

  @Column({ name: 'idempotency_key', unique: true, length: 255 })
  @Index()
  idempotencyKey: string;

  @Column({ type: 'enum', enum: TransactionType })
  @Index()
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionState, default: TransactionState.INITIATED })
  @Index()
  state: TransactionState;

  @Column({ name: 'source_wallet_id', type: 'uuid' })
  @Index()
  sourceWalletId: string;

  @Column({ name: 'destination_wallet_id', type: 'uuid', nullable: true })
  @Index()
  destinationWalletId: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount: number;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({ name: 'fee_amount', type: 'decimal', precision: 19, scale: 4, default: 0 })
  feeAmount: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 19, scale: 4 })
  netAmount: number;

  // Card payment details
  @Column({ name: 'card_id', type: 'uuid', nullable: true })
  @Index()
  cardId: string;

  @Column({ name: 'card_token', length: 100, nullable: true })
  cardToken: string;

  @Column({ name: 'card_last_four', length: 4, nullable: true })
  cardLastFour: string;

  // Merchant details
  @Column({ name: 'merchant_id', type: 'uuid', nullable: true })
  @Index()
  merchantId: string;

  @Column({ name: 'merchant_name', length: 255, nullable: true })
  merchantName: string;

  @Column({ name: 'merchant_category_code', length: 4, nullable: true })
  merchantCategoryCode: string;

  // Authorization
  @Column({ name: 'authorization_code', length: 20, nullable: true })
  @Index()
  authorizationCode: string;

  @Column({ name: 'authorization_expires_at', type: 'timestamptz', nullable: true })
  authorizationExpiresAt: Date;

  // Payment channel and context
  @Column({ type: 'enum', enum: PaymentChannel })
  channel: PaymentChannel;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  // Location data (for fraud detection)
  @Column({ type: 'jsonb', nullable: true })
  location: {
    latitude?: number;
    longitude?: number;
    city?: string;
    country?: string;
    ipAddress?: string;
  };

  // Device info (for fraud detection)
  @Column({ name: 'device_fingerprint', length: 255, nullable: true })
  deviceFingerprint: string;

  // Refund tracking
  @Column({ name: 'original_transaction_id', type: 'uuid', nullable: true })
  @Index()
  originalTransactionId: string;

  @Column({ name: 'refunded_amount', type: 'decimal', precision: 19, scale: 4, default: 0 })
  refundedAmount: number;

  // Settlement
  @Column({ name: 'settlement_batch_id', type: 'uuid', nullable: true })
  @Index()
  settlementBatchId: string;

  @Column({ name: 'settled_at', type: 'timestamptz', nullable: true })
  settledAt: Date;

  // Fraud
  @Column({ name: 'fraud_score', type: 'decimal', precision: 5, scale: 4, nullable: true })
  fraudScore: number;

  @Column({ name: 'fraud_flags', type: 'simple-array', nullable: true })
  fraudFlags: string[];

  // Failure details
  @Column({ name: 'decline_code', length: 50, nullable: true })
  declineCode: string;

  @Column({ name: 'decline_reason', length: 255, nullable: true })
  declineReason: string;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Helper methods
  isRefundable(): boolean {
    return [
      TransactionState.CAPTURED,
      TransactionState.SETTLED,
      TransactionState.PARTIAL_REFUND,
    ].includes(this.state);
  }

  getRemainingRefundable(): number {
    return Number(this.amount) - Number(this.refundedAmount);
  }

  isFullyRefunded(): boolean {
    return Number(this.refundedAmount) >= Number(this.amount);
  }

  isAuthorizationExpired(): boolean {
    return (
      this.authorizationExpiresAt && new Date() > this.authorizationExpiresAt
    );
  }
}
