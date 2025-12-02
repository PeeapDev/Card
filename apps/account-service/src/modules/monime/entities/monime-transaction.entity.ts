import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MonimeTransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAWAL = 'WITHDRAWAL',
}

export enum MonimeTransactionStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  DELAYED = 'DELAYED',
  CANCELLED = 'CANCELLED',
}

export enum MonimeDepositMethod {
  CHECKOUT_SESSION = 'CHECKOUT_SESSION',
  PAYMENT_CODE = 'PAYMENT_CODE',
  MOBILE_MONEY = 'MOBILE_MONEY',
}

export enum MonimeWithdrawMethod {
  MOBILE_MONEY = 'MOBILE_MONEY',
  BANK_TRANSFER = 'BANK_TRANSFER',
}

@Entity('monime_transactions')
@Index(['monimeReference'])
@Index(['walletId', 'type'])
@Index(['userId', 'createdAt'])
@Index(['status', 'type'])
export class MonimeTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  @Index()
  idempotencyKey: string;

  @Column({ type: 'enum', enum: MonimeTransactionType })
  type: MonimeTransactionType;

  @Column({ type: 'enum', enum: MonimeTransactionStatus, default: MonimeTransactionStatus.PENDING })
  status: MonimeTransactionStatus;

  @Column({ type: 'varchar', length: 100, nullable: true })
  monimeReference: string; // Monime's transaction/session ID

  @Column({ type: 'varchar', length: 100, nullable: true })
  monimeEventId: string; // Last webhook event ID processed

  @Column({ type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount: number;

  @Column({ type: 'varchar', length: 3, default: 'SLE' })
  currencyCode: string;

  @Column({ type: 'decimal', precision: 19, scale: 4, nullable: true })
  fee: number;

  @Column({ type: 'decimal', precision: 19, scale: 4, nullable: true })
  netAmount: number;

  // Deposit specific fields
  @Column({ type: 'enum', enum: MonimeDepositMethod, nullable: true })
  depositMethod: MonimeDepositMethod;

  @Column({ type: 'varchar', length: 500, nullable: true })
  paymentUrl: string; // Checkout session URL

  @Column({ type: 'varchar', length: 50, nullable: true })
  ussdCode: string; // Payment code USSD

  // Withdrawal specific fields
  @Column({ type: 'enum', enum: MonimeWithdrawMethod, nullable: true })
  withdrawMethod: MonimeWithdrawMethod;

  @Column({ type: 'varchar', length: 20, nullable: true })
  destinationPhone: string; // Mobile money phone

  @Column({ type: 'varchar', length: 50, nullable: true })
  destinationBankCode: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  destinationAccountNumber: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  destinationAccountName: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  failureReason: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  delayReason: string;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  monimeResponse: Record<string, any>; // Store raw Monime API response

  @Column({ type: 'jsonb', nullable: true })
  webhookHistory: Array<{
    eventId: string;
    eventName: string;
    timestamp: string;
    data: Record<string, any>;
  }>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
