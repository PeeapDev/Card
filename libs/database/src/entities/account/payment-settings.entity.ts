import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payment_settings')
export class PaymentSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Monime Configuration
  @Column({ name: 'monime_access_token', type: 'varchar', length: 500, nullable: true })
  monimeAccessToken: string;

  @Column({ name: 'monime_space_id', type: 'varchar', length: 100, nullable: true })
  monimeSpaceId: string;

  @Column({ name: 'monime_webhook_secret', type: 'varchar', length: 255, nullable: true })
  monimeWebhookSecret: string;

  @Column({ name: 'monime_source_account_id', type: 'varchar', length: 100, nullable: true })
  monimeSourceAccountId: string;

  @Column({ name: 'monime_payout_account_id', type: 'varchar', length: 100, nullable: true })
  monimePayoutAccountId: string;

  @Column({ name: 'monime_enabled', type: 'boolean', default: false })
  monimeEnabled: boolean;

  // Callback URLs for Monime payments
  @Column({ name: 'monime_success_url', type: 'varchar', length: 500, nullable: true })
  monimeSuccessUrl: string;

  @Column({ name: 'monime_cancel_url', type: 'varchar', length: 500, nullable: true })
  monimeCancelUrl: string;

  // Backend/Frontend URLs for building redirect URLs
  @Column({ name: 'backend_url', type: 'varchar', length: 255, nullable: true })
  backendUrl: string;

  @Column({ name: 'frontend_url', type: 'varchar', length: 255, nullable: true })
  frontendUrl: string;

  // Withdrawal Settings
  @Column({ name: 'withdrawal_mobile_money_enabled', type: 'boolean', default: true })
  withdrawalMobileMoneyEnabled: boolean;

  @Column({ name: 'withdrawal_bank_transfer_enabled', type: 'boolean', default: true })
  withdrawalBankTransferEnabled: boolean;

  @Column({ name: 'min_withdrawal_amount', type: 'decimal', precision: 19, scale: 4, default: 1000 })
  minWithdrawalAmount: number;

  @Column({ name: 'max_withdrawal_amount', type: 'decimal', precision: 19, scale: 4, default: 50000000 })
  maxWithdrawalAmount: number;

  @Column({ name: 'daily_withdrawal_limit', type: 'decimal', precision: 19, scale: 4, default: 100000000 })
  dailyWithdrawalLimit: number;

  @Column({ name: 'withdrawal_fee_percent', type: 'decimal', precision: 5, scale: 2, default: 1.5 })
  withdrawalFeePercent: number;

  @Column({ name: 'withdrawal_fee_flat', type: 'decimal', precision: 19, scale: 4, default: 100 })
  withdrawalFeeFlat: number;

  @Column({ name: 'withdrawal_require_pin', type: 'boolean', default: true })
  withdrawalRequirePin: boolean;

  @Column({ name: 'withdrawal_auto_approve_under', type: 'decimal', precision: 19, scale: 4, default: 1000000 })
  withdrawalAutoApproveUnder: number;

  // Deposit Settings
  @Column({ name: 'deposit_checkout_enabled', type: 'boolean', default: true })
  depositCheckoutEnabled: boolean;

  @Column({ name: 'deposit_payment_code_enabled', type: 'boolean', default: true })
  depositPaymentCodeEnabled: boolean;

  @Column({ name: 'deposit_mobile_money_enabled', type: 'boolean', default: true })
  depositMobileMoneyEnabled: boolean;

  @Column({ name: 'min_deposit_amount', type: 'decimal', precision: 19, scale: 4, default: 100 })
  minDepositAmount: number;

  @Column({ name: 'max_deposit_amount', type: 'decimal', precision: 19, scale: 4, default: 100000000 })
  maxDepositAmount: number;

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
