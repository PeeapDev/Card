import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

/**
 * Transaction Event - Event sourcing store for transactions
 * Provides complete audit trail and ability to rebuild state
 */
@Entity('transaction_events')
@Index(['aggregateId', 'version'], { unique: true })
export class TransactionEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  @Index()
  aggregateId: string;

  @Column({ name: 'aggregate_type', length: 50, default: 'Transaction' })
  aggregateType: string;

  @Column({ name: 'event_type', length: 100 })
  @Index()
  eventType: string;

  @Column({ type: 'jsonb' })
  eventData: Record<string, any>;

  @Column({ type: 'int' })
  version: number;

  @Column({ name: 'caused_by', type: 'uuid', nullable: true })
  causedBy: string;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  @Index()
  correlationId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: {
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    source?: string;
  };

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt: Date;
}

/**
 * Event types for transaction domain
 */
export const TransactionEventTypes = {
  // Lifecycle events
  TRANSACTION_INITIATED: 'transaction.initiated',
  TRANSACTION_PENDING: 'transaction.pending',

  // Authorization events
  AUTHORIZATION_REQUESTED: 'authorization.requested',
  AUTHORIZATION_APPROVED: 'authorization.approved',
  AUTHORIZATION_DECLINED: 'authorization.declined',
  AUTHORIZATION_EXPIRED: 'authorization.expired',

  // Capture events
  CAPTURE_REQUESTED: 'capture.requested',
  CAPTURE_COMPLETED: 'capture.completed',
  CAPTURE_FAILED: 'capture.failed',

  // Void events
  VOID_REQUESTED: 'void.requested',
  VOID_COMPLETED: 'void.completed',

  // Refund events
  REFUND_REQUESTED: 'refund.requested',
  REFUND_COMPLETED: 'refund.completed',
  REFUND_FAILED: 'refund.failed',

  // Settlement events
  SETTLEMENT_QUEUED: 'settlement.queued',
  SETTLEMENT_COMPLETED: 'settlement.completed',

  // Failure events
  TRANSACTION_FAILED: 'transaction.failed',
  TRANSACTION_CANCELLED: 'transaction.cancelled',
} as const;

export type TransactionEventType =
  (typeof TransactionEventTypes)[keyof typeof TransactionEventTypes];
