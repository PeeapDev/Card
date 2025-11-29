import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CardStatus, CardType } from '../../enums/card-status.enum';

@Entity('cards')
export class Card {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', unique: true, length: 50 })
  @Index()
  externalId: string;

  @Column({ name: 'wallet_id', type: 'uuid' })
  @Index()
  walletId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ type: 'enum', enum: CardType })
  type: CardType;

  @Column({ type: 'enum', enum: CardStatus, default: CardStatus.PENDING_ACTIVATION })
  status: CardStatus;

  @Column({ name: 'card_program_id', length: 50, nullable: true })
  cardProgramId: string;

  // Token reference (actual PAN stored in token vault)
  @Column({ unique: true, length: 100 })
  @Index()
  token: string;

  @Column({ name: 'last_four', length: 4 })
  lastFour: string;

  @Column({ name: 'bin', length: 8, nullable: true })
  bin: string;

  @Column({ name: 'expiry_month', type: 'smallint' })
  expiryMonth: number;

  @Column({ name: 'expiry_year', type: 'smallint' })
  expiryYear: number;

  @Column({ name: 'cardholder_name', length: 100, nullable: true })
  cardholderName: string;

  // Limits
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

  // Features
  @Column({ name: 'nfc_enabled', default: false })
  nfcEnabled: boolean;

  @Column({ name: 'online_enabled', default: true })
  onlineEnabled: boolean;

  @Column({ name: 'international_enabled', default: false })
  internationalEnabled: boolean;

  @Column({ name: 'atm_enabled', default: true })
  atmEnabled: boolean;

  @Column({ name: 'contactless_limit', type: 'decimal', precision: 19, scale: 4, nullable: true })
  contactlessLimit: number;

  // Timestamps
  @Column({ name: 'activated_at', type: 'timestamptz', nullable: true })
  activatedAt: Date;

  @Column({ name: 'frozen_at', type: 'timestamptz', nullable: true })
  frozenAt: Date;

  @Column({ name: 'blocked_at', type: 'timestamptz', nullable: true })
  blockedAt: Date;

  @Column({ name: 'terminated_at', type: 'timestamptz', nullable: true })
  terminatedAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Helper methods
  isActive(): boolean {
    return this.status === CardStatus.ACTIVE;
  }

  isExpired(): boolean {
    const now = new Date();
    const expiryDate = new Date(this.expiryYear, this.expiryMonth, 0);
    return now > expiryDate;
  }

  canTransact(): boolean {
    return this.isActive() && !this.isExpired();
  }

  get maskedNumber(): string {
    return `****-****-****-${this.lastFour}`;
  }

  get expiryDisplay(): string {
    return `${this.expiryMonth.toString().padStart(2, '0')}/${this.expiryYear.toString().slice(-2)}`;
  }
}
