import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

export enum ExchangeTransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('exchange_transactions')
export class ExchangeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId: string;

  @Column({ name: 'from_wallet_id', type: 'uuid' })
  fromWalletId: string;

  @Column({ name: 'to_wallet_id', type: 'uuid' })
  toWalletId: string;

  @Column({ name: 'from_currency', length: 3 })
  fromCurrency: string;

  @Column({ name: 'to_currency', length: 3 })
  toCurrency: string;

  @Column('decimal', { name: 'from_amount', precision: 18, scale: 4 })
  fromAmount: number;

  @Column('decimal', { name: 'to_amount', precision: 18, scale: 4 })
  toAmount: number;

  @Column('decimal', { name: 'exchange_rate', precision: 18, scale: 8 })
  exchangeRate: number;

  @Column('decimal', { name: 'fee_amount', precision: 18, scale: 4, default: 0 })
  feeAmount: number;

  @Column({ name: 'fee_currency', length: 3, nullable: true })
  feeCurrency: string | null;

  @Column({
    type: 'enum',
    enum: ExchangeTransactionStatus,
    default: ExchangeTransactionStatus.COMPLETED,
  })
  status: ExchangeTransactionStatus;

  @Column({ name: 'rate_id', type: 'uuid', nullable: true })
  rateId: string | null;

  @Column({ length: 50, nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
