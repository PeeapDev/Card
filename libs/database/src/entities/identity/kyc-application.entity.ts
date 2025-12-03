import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum KycApplicationStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  EXPIRED = 'EXPIRED',
}

export enum KycApplicationType {
  INDIVIDUAL = 'INDIVIDUAL',
  BUSINESS = 'BUSINESS',
}

export enum DocumentType {
  PASSPORT = 'PASSPORT',
  DRIVERS_LICENSE = 'DRIVERS_LICENSE',
  NATIONAL_ID = 'NATIONAL_ID',
  UTILITY_BILL = 'UTILITY_BILL',
  BANK_STATEMENT = 'BANK_STATEMENT',
  SELFIE = 'SELFIE',
}

@Entity('kyc_applications')
export class KycApplication {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({
    type: 'enum',
    enum: KycApplicationType,
    default: KycApplicationType.INDIVIDUAL,
  })
  type: KycApplicationType;

  @Column({
    type: 'enum',
    enum: KycApplicationStatus,
    default: KycApplicationStatus.PENDING,
  })
  status: KycApplicationStatus;

  // Personal information (encrypted in application layer)
  @Column({ name: 'first_name', length: 100, nullable: true })
  firstName: string;

  @Column({ name: 'last_name', length: 100, nullable: true })
  lastName: string;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ length: 100, nullable: true })
  nationality: string;

  @Column({ name: 'id_number', length: 100, nullable: true })
  idNumber: string;

  @Column({ name: 'id_type', type: 'enum', enum: DocumentType, nullable: true })
  idType: DocumentType;

  @Column({ name: 'id_expiry_date', type: 'date', nullable: true })
  idExpiryDate: Date;

  @Column({ name: 'tax_id', length: 255, nullable: true })
  taxId: string;

  // Address
  @Column({ type: 'jsonb', nullable: true })
  address: Record<string, any>;

  // Documents (encrypted references)
  @Column({ type: 'jsonb', nullable: true })
  documents: any[];

  // Verification results including OCR data
  @Column({ name: 'verification_result', type: 'jsonb', nullable: true })
  verificationResult: {
    documentCheck: boolean;
    faceMatch: boolean;
    addressVerified: boolean;
    watchlistClear: boolean;
    riskScore?: number;
    notes?: string;
    // OCR verification fields
    documentType?: string;
    extractedData?: {
      documentType?: string;
      documentNumber?: string;
      firstName?: string;
      lastName?: string;
      fullName?: string;
      dateOfBirth?: string;
      expiryDate?: string;
      nationality?: string;
      gender?: string;
      address?: string;
      issuingCountry?: string;
      mrz?: string;
      confidence: number;
    };
    matchScore?: number;
    issues?: string[];
    ocrProcessedAt?: string;
  };

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason: string;

  @Column({ name: 'reviewed_by', type: 'uuid', nullable: true })
  reviewedBy: string;

  @Column({ name: 'submitted_at', type: 'timestamptz', nullable: true })
  submittedAt: Date;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt: Date;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt: Date;

  @Column({ name: 'review_notes', type: 'text', nullable: true })
  reviewNotes: string;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
