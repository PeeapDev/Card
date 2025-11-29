import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum SettlementBatchStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  PARTIALLY_FAILED = 'PARTIALLY_FAILED',
}

@Entity('settlement_batches')
export class SettlementBatch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_number', unique: true, length: 50 })
  @Index()
  batchNumber: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  @Index()
  merchantId: string;

  @Column({ type: 'enum', enum: SettlementBatchStatus, default: SettlementBatchStatus.PENDING })
  status: SettlementBatchStatus;

  @Column({ name: 'settlement_date', type: 'date' })
  @Index()
  settlementDate: Date;

  @Column({ name: 'period_start', type: 'timestamptz' })
  periodStart: Date;

  @Column({ name: 'period_end', type: 'timestamptz' })
  periodEnd: Date;

  @Column({ name: 'transaction_count', type: 'int' })
  transactionCount: number;

  @Column({ name: 'gross_amount', type: 'decimal', precision: 19, scale: 4 })
  grossAmount: number;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 19, scale: 4, default: 0 })
  refundAmount: number;

  @Column({ name: 'fee_amount', type: 'decimal', precision: 19, scale: 4 })
  feeAmount: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 19, scale: 4 })
  netAmount: number;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({ name: 'payout_reference', length: 100, nullable: true })
  payoutReference: string;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
