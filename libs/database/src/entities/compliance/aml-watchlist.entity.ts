import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum WatchlistType {
  SANCTIONS = 'sanctions',
  PEP = 'pep',
  ADVERSE_MEDIA = 'adverse_media',
  LAW_ENFORCEMENT = 'law_enforcement',
}

@Entity('aml_watchlists')
export class AmlWatchlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 50, unique: true })
  code: string;

  @Column({ length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'source_url', type: 'text', nullable: true })
  sourceUrl: string;

  @Column({ name: 'source_organization', length: 255, nullable: true })
  sourceOrganization: string;

  @Column({ name: 'list_type', length: 50, default: WatchlistType.SANCTIONS })
  listType: WatchlistType;

  @Column({ name: 'last_updated_at', type: 'timestamptz', nullable: true })
  lastUpdatedAt: Date;

  @Column({ name: 'update_frequency', length: 50, default: 'daily' })
  updateFrequency: string;

  @Column({ name: 'total_entries', type: 'int', default: 0 })
  totalEntries: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('aml_watchlist_entries')
export class AmlWatchlistEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'watchlist_id', type: 'uuid' })
  @Index()
  watchlistId: string;

  @Column({ name: 'external_id', length: 255, nullable: true })
  externalId: string;

  @Column({ name: 'entity_type', length: 50, default: 'individual' })
  entityType: string;

  @Column({ name: 'primary_name', length: 500 })
  @Index()
  primaryName: string;

  @Column({ type: 'text', array: true, nullable: true })
  aliases: string[];

  @Column({ name: 'name_soundex', length: 50, nullable: true })
  @Index()
  nameSoundex: string;

  @Column({ name: 'name_metaphone', length: 50, nullable: true })
  @Index()
  nameMetaphone: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  @Index()
  dateOfBirth: Date;

  @Column({ name: 'year_of_birth', type: 'int', nullable: true })
  yearOfBirth: number;

  @Column({ name: 'place_of_birth', length: 255, nullable: true })
  placeOfBirth: string;

  @Column({ type: 'varchar', length: 100, array: true, nullable: true })
  nationality: string[];

  @Column({ name: 'passport_numbers', type: 'text', array: true, nullable: true })
  passportNumbers: string[];

  @Column({ name: 'national_ids', type: 'text', array: true, nullable: true })
  nationalIds: string[];

  @Column({ name: 'tax_ids', type: 'text', array: true, nullable: true })
  taxIds: string[];

  @Column({ type: 'jsonb', default: [] })
  addresses: Record<string, any>[];

  @Column({ name: 'listed_on', type: 'date', nullable: true })
  listedOn: Date;

  @Column({ name: 'delisted_on', type: 'date', nullable: true })
  delistedOn: Date;

  @Column({ name: 'listing_reason', type: 'text', nullable: true })
  listingReason: string;

  @Column({ type: 'text', array: true, nullable: true })
  programs: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @Column({ name: 'source_data', type: 'jsonb', default: {} })
  sourceData: Record<string, any>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

@Entity('aml_high_risk_countries')
export class AmlHighRiskCountry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'country_code', length: 3, unique: true })
  countryCode: string;

  @Column({ name: 'country_name', length: 255 })
  countryName: string;

  @Column({ name: 'risk_level', length: 20, default: 'high' })
  riskLevel: string;

  @Column({ name: 'risk_category', length: 50, nullable: true })
  riskCategory: string;

  @Column({ name: 'transactions_blocked', type: 'boolean', default: false })
  transactionsBlocked: boolean;

  @Column({ name: 'requires_edd', type: 'boolean', default: true })
  requiresEdd: boolean;

  @Column({ name: 'max_transaction_amount', type: 'decimal', precision: 18, scale: 2, nullable: true })
  maxTransactionAmount: number;

  @Column({ name: 'listing_authority', length: 100, nullable: true })
  listingAuthority: string;

  @Column({ name: 'listing_date', type: 'date', nullable: true })
  listingDate: Date;

  @Column({ name: 'listing_reason', type: 'text', nullable: true })
  listingReason: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
