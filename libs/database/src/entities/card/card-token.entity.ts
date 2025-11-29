import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Card Token Entity - Stored in isolated Token Vault database
 * Contains tokenized PAN data with encryption
 * Part of PCI DSS Cardholder Data Environment (CDE)
 */
@Entity('card_tokens')
export class CardToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 50 })
  @Index()
  token: string;

  @Column({ name: 'token_hash', unique: true, length: 64 })
  @Index()
  tokenHash: string;

  // Encrypted PAN (AES-256-GCM)
  @Column({ name: 'encrypted_pan', type: 'bytea' })
  encryptedPan: Buffer;

  @Column({ name: 'pan_last_4', length: 4 })
  @Index()
  panLast4: string;

  @Column({ name: 'pan_first_6', length: 6 })
  panFirst6: string;

  // Encrypted expiry
  @Column({ name: 'encrypted_expiry', type: 'bytea' })
  encryptedExpiry: Buffer;

  // Cardholder name hash (for matching)
  @Column({ name: 'cardholder_hash', length: 64, nullable: true })
  cardholderHash: string;

  // Encryption key version (for key rotation)
  @Column({ name: 'key_version', type: 'int' })
  keyVersion: number;

  @Column({ name: 'card_type', length: 20 })
  cardType: 'VIRTUAL' | 'PHYSICAL';

  @Column({ length: 20, default: 'active' })
  status: 'active' | 'suspended' | 'deleted';

  @Column({ name: 'issued_by', length: 100, nullable: true })
  issuedBy: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

/**
 * Token Audit Log - Tracks all tokenization/detokenization operations
 */
@Entity('token_audit_log')
export class TokenAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 20 })
  operation: 'TOKENIZE' | 'DETOKENIZE' | 'DELETE' | 'ROTATE_KEY';

  @Column({ name: 'token_hash', length: 64 })
  @Index()
  tokenHash: string;

  @Column({ name: 'performed_by', length: 64 })
  performedBy: string;

  @Column({ name: 'source_service', length: 50 })
  sourceService: string;

  @Column({ name: 'source_ip', length: 45, nullable: true })
  sourceIp: string;

  @Column({ length: 20 })
  result: 'SUCCESS' | 'FAILURE' | 'DENIED';

  @Column({ name: 'failure_reason', length: 255, nullable: true })
  failureReason: string;

  @CreateDateColumn({ type: 'timestamptz' })
  @Index()
  timestamp: Date;
}

/**
 * Encryption Key Tracking
 */
@Entity('encryption_keys')
export class EncryptionKey {
  @Column({ type: 'int', primary: true })
  version: number;

  @Column({ name: 'key_id', length: 64 })
  keyId: string;

  @Column({ length: 20, default: 'AES-256-GCM' })
  algorithm: string;

  @Column({ length: 20, default: 'active' })
  status: 'active' | 'decrypt-only' | 'retired';

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @Column({ name: 'rotated_at', type: 'timestamptz', nullable: true })
  rotatedAt: Date;
}
