import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FeeType {
  TRANSACTION = 'TRANSACTION',
  P2P = 'P2P',
  WITHDRAWAL = 'WITHDRAWAL',
  MONTHLY = 'MONTHLY',
  FX_CONVERSION = 'FX_CONVERSION',
}

export enum FeeCalculationMethod {
  PERCENTAGE = 'PERCENTAGE',
  FIXED = 'FIXED',
  TIERED = 'TIERED',
  HYBRID = 'HYBRID',
}

@Entity('fee_schedules')
export class FeeSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'fee_type', type: 'enum', enum: FeeType })
  feeType: FeeType;

  @Column({ name: 'merchant_tier', length: 50, nullable: true })
  merchantTier: string;

  @Column({ name: 'calculation_method', type: 'enum', enum: FeeCalculationMethod })
  calculationMethod: FeeCalculationMethod;

  @Column({ name: 'percentage_rate', type: 'decimal', precision: 8, scale: 4, nullable: true })
  percentageRate: number;

  @Column({ name: 'fixed_amount', type: 'decimal', precision: 19, scale: 4, nullable: true })
  fixedAmount: number;

  @Column({ name: 'minimum_fee', type: 'decimal', precision: 19, scale: 4, nullable: true })
  minimumFee: number;

  @Column({ name: 'maximum_fee', type: 'decimal', precision: 19, scale: 4, nullable: true })
  maximumFee: number;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({ name: 'tier_breakpoints', type: 'jsonb', nullable: true })
  tierBreakpoints: Array<{
    minAmount: number;
    maxAmount: number;
    rate: number;
  }>;

  @Column({ name: 'effective_from', type: 'timestamptz' })
  effectiveFrom: Date;

  @Column({ name: 'effective_to', type: 'timestamptz', nullable: true })
  effectiveTo: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
