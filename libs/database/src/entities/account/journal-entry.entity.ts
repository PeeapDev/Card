import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { JournalType } from '../../enums/account-type.enum';

@Entity('journal_entries')
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  @Index()
  transactionId: string;

  @Column({ name: 'journal_type', type: 'enum', enum: JournalType })
  journalType: JournalType;

  @Column({ name: 'reference_type', length: 50, nullable: true })
  referenceType: string;

  @Column({ name: 'reference_id', type: 'uuid', nullable: true })
  @Index()
  referenceId: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'idempotency_key', unique: true, length: 255, nullable: true })
  @Index()
  idempotencyKey: string;

  @Column({
    name: 'total_amount',
    type: 'decimal',
    precision: 19,
    scale: 4,
  })
  totalAmount: number;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({ name: 'is_balanced', default: false })
  isBalanced: boolean;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
