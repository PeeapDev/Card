import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'from_currency', length: 3 })
  fromCurrency: string;

  @Column({ name: 'to_currency', length: 3 })
  toCurrency: string;

  @Column('decimal', { precision: 18, scale: 8 })
  rate: number;

  @Column('decimal', { name: 'margin_percentage', precision: 5, scale: 2, default: 0 })
  marginPercentage: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'set_by', type: 'uuid', nullable: true })
  setBy: string | null;

  @Column({ name: 'effective_from', type: 'timestamptz', default: () => 'NOW()' })
  effectiveFrom: Date;

  @Column({ name: 'effective_until', type: 'timestamptz', nullable: true })
  effectiveUntil: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
