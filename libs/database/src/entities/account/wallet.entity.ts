import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  VersionColumn,
} from 'typeorm';

export enum WalletStatus {
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  CLOSED = 'CLOSED',
}

export enum WalletOwnerType {
  USER = 'USER',
  MERCHANT = 'MERCHANT',
  SYSTEM = 'SYSTEM',
}

@Entity('wallets')
@Index(['ownerType', 'ownerId', 'currencyCode'], { unique: true })
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', unique: true, length: 50 })
  externalId: string;

  @Column({ name: 'owner_type', type: 'enum', enum: WalletOwnerType })
  @Index()
  ownerType: WalletOwnerType;

  @Column({ name: 'owner_id', type: 'uuid' })
  @Index()
  ownerId: string;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({
    name: 'available_balance',
    type: 'decimal',
    precision: 19,
    scale: 4,
    default: 0,
  })
  availableBalance: number;

  @Column({
    name: 'held_balance',
    type: 'decimal',
    precision: 19,
    scale: 4,
    default: 0,
  })
  heldBalance: number;

  @Column({
    type: 'enum',
    enum: WalletStatus,
    default: WalletStatus.ACTIVE,
  })
  status: WalletStatus;

  @Column({
    name: 'daily_limit',
    type: 'decimal',
    precision: 19,
    scale: 4,
    nullable: true,
  })
  dailyLimit: number;

  @Column({
    name: 'monthly_limit',
    type: 'decimal',
    precision: 19,
    scale: 4,
    nullable: true,
  })
  monthlyLimit: number;

  @Column({
    name: 'single_transaction_limit',
    type: 'decimal',
    precision: 19,
    scale: 4,
    nullable: true,
  })
  singleTransactionLimit: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @VersionColumn()
  version: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Computed property
  get totalBalance(): number {
    return Number(this.availableBalance) + Number(this.heldBalance);
  }

  canDebit(amount: number): boolean {
    return (
      this.status === WalletStatus.ACTIVE &&
      Number(this.availableBalance) >= amount
    );
  }

  canHold(amount: number): boolean {
    return (
      this.status === WalletStatus.ACTIVE &&
      Number(this.availableBalance) >= amount
    );
  }
}
