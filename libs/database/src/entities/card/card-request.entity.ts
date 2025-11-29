import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { CardRequestStatus } from '../../enums/card-status.enum';

@Entity('card_requests')
export class CardRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'card_id', type: 'uuid' })
  @Index()
  cardId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: CardRequestStatus,
    default: CardRequestStatus.PENDING,
  })
  status: CardRequestStatus;

  // Shipping address (encrypted in application layer)
  @Column({ name: 'shipping_address', type: 'jsonb' })
  shippingAddress: {
    recipientName: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phoneNumber?: string;
  };

  @Column({ name: 'shipping_method', length: 50, default: 'STANDARD' })
  shippingMethod: 'STANDARD' | 'EXPRESS' | 'PRIORITY';

  @Column({ name: 'tracking_number', length: 100, nullable: true })
  trackingNumber: string;

  @Column({ length: 100, nullable: true })
  carrier: string;

  @Column({
    name: 'shipping_cost',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  shippingCost: number;

  @Column({ name: 'currency_code', length: 3, default: 'USD' })
  currencyCode: string;

  // Card personalization
  @Column({ name: 'emboss_name', length: 26, nullable: true })
  embossName: string;

  @Column({ name: 'card_design', length: 50, nullable: true })
  cardDesign: string;

  // Processing
  @Column({ name: 'print_file_id', length: 100, nullable: true })
  printFileId: string;

  @Column({ name: 'batch_id', length: 50, nullable: true })
  batchId: string;

  @Column({ name: 'failure_reason', type: 'text', nullable: true })
  failureReason: string;

  // Timestamps
  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date;

  @Column({ name: 'processed_at', type: 'timestamptz', nullable: true })
  processedAt: Date;

  @Column({ name: 'shipped_at', type: 'timestamptz', nullable: true })
  shippedAt: Date;

  @Column({ name: 'delivered_at', type: 'timestamptz', nullable: true })
  deliveredAt: Date;

  @Column({ name: 'estimated_delivery', type: 'date', nullable: true })
  estimatedDelivery: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
