import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exchange_permissions')
export class ExchangePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_type', length: 50, unique: true })
  userType: string;

  @Column({ name: 'can_exchange', default: false })
  canExchange: boolean;

  @Column('decimal', { name: 'daily_limit', precision: 18, scale: 2, nullable: true })
  dailyLimit: number | null;

  @Column('decimal', { name: 'monthly_limit', precision: 18, scale: 2, nullable: true })
  monthlyLimit: number | null;

  @Column('decimal', { name: 'min_amount', precision: 18, scale: 2, default: 1 })
  minAmount: number;

  @Column('decimal', { name: 'max_amount', precision: 18, scale: 2, nullable: true })
  maxAmount: number | null;

  @Column('decimal', { name: 'fee_percentage', precision: 5, scale: 2, default: 0 })
  feePercentage: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
