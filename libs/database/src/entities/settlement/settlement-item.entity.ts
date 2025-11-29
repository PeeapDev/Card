import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

export enum SettlementItemType {
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  CHARGEBACK = 'CHARGEBACK',
  ADJUSTMENT = 'ADJUSTMENT',
  FEE = 'FEE',
}

@Entity('settlement_batch_items')
export class SettlementBatchItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'batch_id', type: 'uuid' })
  @Index()
  batchId: string;

  @Column({ name: 'transaction_id', type: 'uuid' })
  @Index()
  transactionId: string;

  @Column({ name: 'item_type', type: 'enum', enum: SettlementItemType })
  itemType: SettlementItemType;

  @Column({ type: 'decimal', precision: 19, scale: 4 })
  amount: number;

  @Column({ name: 'fee_amount', type: 'decimal', precision: 19, scale: 4 })
  feeAmount: number;

  @Column({ name: 'net_amount', type: 'decimal', precision: 19, scale: 4 })
  netAmount: number;
}
