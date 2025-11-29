import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { AccountType } from '../../enums/account-type.enum';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'account_number', unique: true, length: 50 })
  @Index()
  accountNumber: string;

  @Column({ name: 'account_type', type: 'enum', enum: AccountType })
  @Index()
  accountType: AccountType;

  @Column({ name: 'account_name', length: 255 })
  accountName: string;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({ name: 'is_system_account', default: false })
  isSystemAccount: boolean;

  @Column({ name: 'owner_type', length: 50, nullable: true })
  ownerType: string;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true })
  @Index()
  ownerId: string;

  @Column({ name: 'parent_account_id', type: 'uuid', nullable: true })
  parentAccountId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  // Helper to determine normal balance side
  get normalBalanceSide(): 'DEBIT' | 'CREDIT' {
    const debitNormalAccounts = [
      AccountType.ASSET_USER_WALLET,
      AccountType.ASSET_USER_HELD,
      AccountType.ASSET_MERCHANT_WALLET,
      AccountType.ASSET_SETTLEMENT_PENDING,
      AccountType.ASSET_CASH,
      AccountType.ASSET_RECEIVABLES,
      AccountType.EXPENSE_REFUND,
      AccountType.EXPENSE_CHARGEBACK,
      AccountType.EXPENSE_FRAUD_LOSS,
    ];

    return debitNormalAccounts.includes(this.accountType) ? 'DEBIT' : 'CREDIT';
  }
}
