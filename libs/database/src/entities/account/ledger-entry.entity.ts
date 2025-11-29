import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { LedgerEntryType } from '../../enums/account-type.enum';

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'journal_entry_id', type: 'uuid' })
  @Index()
  journalEntryId: string;

  @Column({ name: 'account_id', type: 'uuid' })
  @Index()
  accountId: string;

  @Column({ name: 'wallet_id', type: 'uuid', nullable: true })
  @Index()
  walletId: string;

  @Column({ name: 'entry_type', type: 'enum', enum: LedgerEntryType })
  entryType: LedgerEntryType;

  @Column({
    type: 'decimal',
    precision: 19,
    scale: 4,
  })
  amount: number;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({
    name: 'balance_after',
    type: 'decimal',
    precision: 19,
    scale: 4,
  })
  balanceAfter: number;

  @Column({ type: 'text', nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;
}
