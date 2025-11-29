import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum ApiKeyStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  REVOKED = 'REVOKED',
}

export enum ApiKeyEnvironment {
  LIVE = 'LIVE',
  TEST = 'TEST',
}

@Entity('api_keys')
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'merchant_id', type: 'uuid', nullable: true })
  @Index()
  merchantId: string;

  @Column({ name: 'developer_id', type: 'uuid', nullable: true })
  @Index()
  developerId: string;

  @Column({ name: 'key_hash', unique: true, length: 255 })
  keyHash: string;

  @Column({ name: 'key_prefix', length: 20 })
  keyPrefix: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'enum', enum: ApiKeyEnvironment })
  environment: ApiKeyEnvironment;

  @Column({ type: 'enum', enum: ApiKeyStatus, default: ApiKeyStatus.ACTIVE })
  status: ApiKeyStatus;

  @Column({ type: 'simple-array' })
  scopes: string[];

  @Column({ name: 'rate_limit_tier', length: 50, default: 'basic' })
  rateLimitTier: string;

  @Column({ name: 'ip_whitelist', type: 'simple-array', nullable: true })
  ipWhitelist: string[];

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date;

  @Column({ name: 'revoke_reason', length: 255, nullable: true })
  revokeReason: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
