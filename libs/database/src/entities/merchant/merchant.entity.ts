import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum MerchantStatus {
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export enum SettlementFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  ON_DEMAND = 'ON_DEMAND',
}

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', unique: true, length: 50 })
  @Index()
  externalId: string;

  @Column({ name: 'business_name', length: 255 })
  businessName: string;

  @Column({ name: 'display_name', length: 100 })
  displayName: string;

  @Column({ name: 'business_type', length: 50 })
  businessType: string;

  @Column({ name: 'mcc', length: 4 })
  mcc: string;

  @Column({ unique: true, length: 255 })
  @Index()
  email: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ type: 'jsonb', nullable: true })
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };

  @Column({ type: 'enum', enum: MerchantStatus, default: MerchantStatus.PENDING_VERIFICATION })
  status: MerchantStatus;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  @Index()
  walletId: string;

  @Column({ name: 'owner_user_id', type: 'uuid' })
  @Index()
  ownerUserId: string;

  // Settlement configuration
  @Column({ name: 'settlement_frequency', type: 'enum', enum: SettlementFrequency, default: SettlementFrequency.DAILY })
  settlementFrequency: SettlementFrequency;

  @Column({ name: 'settlement_delay_days', type: 'smallint', default: 2 })
  settlementDelayDays: number;

  // Fee configuration (reference to fee schedule)
  @Column({ name: 'fee_schedule_id', type: 'uuid', nullable: true })
  feeScheduleId: string;

  @Column({ name: 'transaction_fee_percent', type: 'decimal', precision: 5, scale: 4, default: 2.9 })
  transactionFeePercent: number;

  @Column({ name: 'transaction_fee_fixed', type: 'decimal', precision: 10, scale: 4, default: 0.30 })
  transactionFeeFixed: number;

  // API access
  @Column({ name: 'api_enabled', default: false })
  apiEnabled: boolean;

  @Column({ name: 'webhook_url', length: 500, nullable: true })
  webhookUrl: string;

  @Column({ name: 'webhook_secret', length: 255, nullable: true })
  webhookSecret: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
