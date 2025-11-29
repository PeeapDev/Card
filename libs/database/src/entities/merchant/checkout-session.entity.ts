import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum CheckoutSessionStatus {
  OPEN = 'OPEN',
  COMPLETE = 'COMPLETE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('checkout_sessions')
export class CheckoutSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'external_id', unique: true, length: 50 })
  @Index()
  externalId: string;

  @Column({ name: 'merchant_id', type: 'uuid' })
  @Index()
  merchantId: string;

  @Column({ type: 'enum', enum: CheckoutSessionStatus, default: CheckoutSessionStatus.OPEN })
  status: CheckoutSessionStatus;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount: number;

  @Column({ name: 'currency_code', length: 3 })
  currencyCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Line items (optional)
  @Column({ name: 'line_items', type: 'jsonb', nullable: true })
  lineItems: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  // Customer info (pre-filled if known)
  @Column({ name: 'customer_email', length: 255, nullable: true })
  customerEmail: string;

  @Column({ name: 'customer_id', type: 'uuid', nullable: true })
  customerId: string;

  // URLs
  @Column({ name: 'success_url', length: 500, nullable: true })
  successUrl: string;

  @Column({ name: 'cancel_url', length: 500, nullable: true })
  cancelUrl: string;

  // Payment
  @Column({ name: 'transaction_id', type: 'uuid', nullable: true })
  transactionId: string;

  // QR code for in-person payments
  @Column({ name: 'qr_code_data', type: 'text', nullable: true })
  qrCodeData: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  isExpired(): boolean {
    return new Date() > this.expiresAt;
  }

  isOpen(): boolean {
    return this.status === CheckoutSessionStatus.OPEN && !this.isExpired();
  }
}
