/**
 * NFC PREPAID CARD SYSTEM - TYPE DEFINITIONS
 *
 * This module defines all TypeScript types for the closed-loop NFC prepaid card system.
 * These types are SEPARATE from existing card systems (Card Products, Card Programs, Issued Virtual Cards).
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum NFCChipType {
  UID_ONLY = 'UID_ONLY',           // WARNING: Not secure for real money
  DESFIRE_EV1 = 'DESFIRE_EV1',     // Legacy secure element
  DESFIRE_EV2 = 'DESFIRE_EV2',     // Recommended minimum
  DESFIRE_EV3 = 'DESFIRE_EV3',     // Best security
}

export enum NFCCardCategory {
  ANONYMOUS = 'ANONYMOUS',         // No KYC required, lower limits
  NAMED = 'NAMED',                 // KYC required, higher limits
  CORPORATE = 'CORPORATE',         // Business cards
  GIFT = 'GIFT',                   // Gift cards, non-reloadable
}

export enum NFCCardState {
  CREATED = 'CREATED',             // Card manufactured, in warehouse
  ISSUED = 'ISSUED',               // Assigned to vendor
  SOLD = 'SOLD',                   // Vendor marked as sold
  INACTIVE = 'INACTIVE',           // Sold but not activated
  ACTIVATED = 'ACTIVATED',         // User activated, ready to use
  SUSPENDED = 'SUSPENDED',         // Temporarily frozen
  BLOCKED = 'BLOCKED',             // Permanently blocked
  REPLACED = 'REPLACED',           // Replaced with new card
  EXPIRED = 'EXPIRED',             // Past expiry date
  DESTROYED = 'DESTROYED',         // Physically destroyed
}

export enum NFCTransactionType {
  PURCHASE = 'PURCHASE',
  RELOAD = 'RELOAD',
  REFUND = 'REFUND',
  REVERSAL = 'REVERSAL',
  ADJUSTMENT = 'ADJUSTMENT',
  FEE = 'FEE',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN',
  ACTIVATION_CREDIT = 'ACTIVATION_CREDIT',
  BALANCE_TRANSFER = 'BALANCE_TRANSFER',
}

export enum NFCTransactionState {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  SETTLED = 'SETTLED',
  DECLINED = 'DECLINED',
  REVERSED = 'REVERSED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export enum NFCVendorStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TERMINATED = 'TERMINATED',
}

export enum NFCBatchStatus {
  MANUFACTURED = 'MANUFACTURED',
  QUALITY_CHECKED = 'QUALITY_CHECKED',
  IN_WAREHOUSE = 'IN_WAREHOUSE',
  DISTRIBUTED = 'DISTRIBUTED',
  FULLY_SOLD = 'FULLY_SOLD',
  RECALLED = 'RECALLED',
}

export enum NFCTerminalType {
  DEDICATED_POS = 'DEDICATED_POS',
  MOBILE_POS = 'MOBILE_POS',
  SOFTPOS = 'SOFTPOS',
  KIOSK = 'KIOSK',
}

export enum NFCKeyType {
  ISSUER_MASTER = 'ISSUER_MASTER',
  BATCH_MASTER = 'BATCH_MASTER',
  CARD_AUTH = 'CARD_AUTH',
  CARD_MAC = 'CARD_MAC',
  CARD_ENC = 'CARD_ENC',
  SESSION = 'SESSION',
}

export enum NFCFraudRuleType {
  VELOCITY = 'VELOCITY',
  GEO_FENCE = 'GEO_FENCE',
  AMOUNT = 'AMOUNT',
  PATTERN = 'PATTERN',
  TIME_BASED = 'TIME_BASED',
  DEVICE = 'DEVICE',
}

export enum NFCReplacementReason {
  LOST = 'LOST',
  STOLEN = 'STOLEN',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
  UPGRADE = 'UPGRADE',
}

// ============================================================================
// INTERFACES - Card Programs
// ============================================================================

export interface NFCCardProgram {
  id: string;
  programCode: string;
  programName: string;
  description?: string;

  // Classification
  cardCategory: NFCCardCategory;
  isReloadable: boolean;
  requiresKyc: boolean;
  kycLevelRequired: number;

  // Pricing (CRITICAL: Each card has a price)
  cardPrice: number;
  initialBalance: number;
  currency: string;

  // Balance Limits
  maxBalance: number;
  minReloadAmount?: number;
  maxReloadAmount?: number;

  // Transaction Limits
  dailyTransactionLimit: number;
  weeklyTransactionLimit?: number;
  monthlyTransactionLimit?: number;
  perTransactionLimit: number;
  dailyTransactionCount?: number;

  // Fees
  reloadFeePercentage?: number;
  reloadFeeFixed?: number;
  transactionFeePercentage?: number;
  transactionFeeFixed?: number;
  monthlyMaintenanceFee?: number;
  inactivityFee?: number;
  inactivityDays?: number;

  // Design
  cardDesignTemplate?: string;
  cardColorPrimary?: string;
  cardColorSecondary?: string;
  cardImageUrl?: string;

  // Validity
  validityMonths: number;

  // Security
  chipType: NFCChipType;
  requiresPin: boolean;
  maxPinAttempts?: number;

  // Merchant Categories
  allowedMccCodes?: string[];
  blockedMccCodes?: string[];

  // Offline Behavior
  allowOfflineTransactions: boolean;
  offlineTransactionLimit?: number;
  offlineDailyLimit?: number;
  offlineTransactionCount?: number;

  // Status
  status: 'ACTIVE' | 'SUSPENDED' | 'DISCONTINUED';
  isVisible: boolean;

  // Metadata
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
}

// ============================================================================
// INTERFACES - Card Batches
// ============================================================================

export interface NFCCardBatch {
  id: string;
  batchCode: string;
  programId: string;

  // Manufacturing
  cardCount: number;
  manufacturer?: string;
  manufactureDate?: Date;
  manufactureOrderNumber?: string;

  // Key Management
  masterKeyId?: string;
  keyDerivationMethod: string;
  keyVersion: number;

  // Card Number Range
  binPrefix: string;
  sequenceStart: number;
  sequenceEnd: number;

  // Status
  status: NFCBatchStatus;

  // Inventory
  cardsInWarehouse: number;
  cardsDistributed: number;
  cardsSold: number;
  cardsActivated: number;
  cardsDefective: number;

  // Quality Control
  qcPassed: boolean;
  qcDate?: Date;
  qcNotes?: string;

  // Pricing
  unitCost?: number;
  wholesalePrice?: number;
  retailPrice?: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  distributedAt?: Date;
}

// ============================================================================
// INTERFACES - Vendors
// ============================================================================

export interface NFCCardVendor {
  id: string;
  vendorCode: string;
  businessName: string;
  contactName?: string;
  phone: string;
  email?: string;

  // Location
  region?: string;
  district?: string;
  address?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;

  // Commission
  commissionType: 'PERCENTAGE' | 'FIXED' | 'TIERED';
  commissionRate: number;
  commissionFixed?: number;

  // Settlement
  settlementAccountType: 'WALLET' | 'BANK';
  settlementWalletId?: string;
  settlementBankName?: string;
  settlementAccountNumber?: string;
  settlementFrequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';

  // Inventory
  maxInventoryValue: number;
  currentInventoryValue: number;

  // Status
  status: NFCVendorStatus;
  approvedAt?: Date;
  approvedBy?: string;

  // Performance
  totalCardsSold: number;
  totalSalesValue: number;
  lastSaleAt?: Date;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface NFCVendorInventory {
  id: string;
  vendorId: string;
  batchId: string;

  // Assignment
  cardsAssigned: number;
  cardsSold: number;
  cardsReturned: number;
  cardsDamaged: number;

  // Card Range
  sequenceStart: number;
  sequenceEnd: number;

  // Financial
  assignedValue: number;
  salesValue: number;
  commissionEarned: number;
  commissionPaid: number;

  // Status
  status: 'ASSIGNED' | 'ACTIVE' | 'RECONCILED' | 'RETURNED';

  // Timestamps
  assignedAt: Date;
  lastReconciledAt?: Date;
}

// ============================================================================
// INTERFACES - Cards
// ============================================================================

export interface NFCPrepaidCard {
  id: string;

  // Identity
  cardNumber: string;
  cardUid: string;
  cardUidHash: string;

  // Program & Batch
  programId: string;
  batchId: string;

  // Key Reference (NO ACTUAL KEYS)
  keySlotId: string;
  keyVersion: number;
  diversificationData?: string;

  // State
  state: NFCCardState;

  // Vendor
  vendorId?: string;
  vendorInventoryId?: string;

  // User Binding
  userId?: string;
  walletId?: string;
  activationCode?: string;
  activationCodeHash?: string;

  // Balance
  balance: number;
  pendingBalance: number;
  currency: string;

  // Spending Trackers
  dailySpent: number;
  weeklySpent: number;
  monthlySpent: number;
  dailyTransactionCount: number;
  lastSpendingResetDaily?: Date;
  lastSpendingResetWeekly?: Date;
  lastSpendingResetMonthly?: Date;

  // Limits (overrides)
  perTransactionLimit?: number;
  dailyLimit?: number;
  weeklyLimit?: number;
  monthlyLimit?: number;

  // Security
  pinHash?: string;
  pinAttempts: number;
  pinBlockedUntil?: Date;

  // Card Label
  cardLabel?: string;

  // Validity
  manufacturedAt?: Date;
  expiresAt: Date;

  // Lifecycle
  createdAt: Date;
  issuedAt?: Date;
  soldAt?: Date;
  activatedAt?: Date;
  suspendedAt?: Date;
  blockedAt?: Date;
  replacedAt?: Date;
  lastUsedAt?: Date;

  // Replacement
  replacedByCardId?: string;
  replacesCardId?: string;

  // Fraud
  fraudScore: number;
  fraudFlags?: string[];
  lastLocationLat?: number;
  lastLocationLng?: number;
  lastDeviceFingerprint?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

// ============================================================================
// INTERFACES - Transactions
// ============================================================================

export interface NFCCardTransaction {
  id: string;
  transactionReference: string;
  authorizationCode?: string;

  // Card
  cardId: string;
  cardNumberMasked?: string;

  // Type
  transactionType: NFCTransactionType;

  // Amount
  amount: number;
  feeAmount: number;
  netAmount: number;
  currency: string;

  // Balance
  balanceBefore: number;
  balanceAfter: number;

  // State
  state: NFCTransactionState;

  // Merchant
  merchantId?: string;
  merchantName?: string;
  merchantMcc?: string;
  merchantLocation?: string;

  // Terminal
  terminalId?: string;
  terminalType?: string;

  // Crypto Validation
  challengeSent?: string;
  responseReceived?: string;
  cryptoValidationResult?: 'VALID' | 'INVALID' | 'TIMEOUT';

  // Offline
  isOffline: boolean;
  syncedAt?: Date;

  // Location
  latitude?: number;
  longitude?: number;

  // Decline
  declineReason?: string;
  declineCode?: string;
  errorMessage?: string;

  // Settlement
  settlementBatchId?: string;
  settledAt?: Date;

  // Refund
  originalTransactionId?: string;
  refundAmount: number;
  refundStatus?: 'NONE' | 'PARTIAL' | 'FULL';

  // Fraud
  fraudScore: number;
  fraudCheckResult?: 'PASS' | 'FLAG' | 'BLOCK';
  fraudFlags?: string[];

  // Timestamps
  createdAt: Date;
  authorizedAt?: Date;
  capturedAt?: Date;

  // Device
  deviceFingerprint?: string;
  userAgent?: string;
  ipAddress?: string;

  // Metadata
  metadata?: Record<string, unknown>;
}

// ============================================================================
// INTERFACES - Key Management
// ============================================================================

export interface NFCKeyReference {
  id: string;
  keyId: string;
  keyAlias?: string;
  keyType: NFCKeyType;
  parentKeyId?: string;
  batchId?: string;
  algorithm: string;
  keyVersion: number;
  status: 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'EXPIRED';
  hsmSlotId: string;
  hsmProvider?: string;
  createdAt: Date;
  expiresAt?: Date;
  revokedAt?: Date;
  createdBy?: string;
}

// ============================================================================
// INTERFACES - Terminals
// ============================================================================

export interface NFCTerminal {
  id: string;
  terminalId: string;
  terminalName?: string;
  merchantId: string;
  terminalType: NFCTerminalType;
  deviceModel?: string;
  firmwareVersion?: string;
  nfcChipType?: string;
  terminalKeyId?: string;
  lastKeyInjection?: Date;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DECOMMISSIONED';
  locationName?: string;
  latitude?: number;
  longitude?: number;
  supportsOffline: boolean;
  offlineLimit: number;
  supportsPin: boolean;
  supportsContactless: boolean;
  lastTransactionAt?: Date;
  totalTransactions: number;
  registeredAt: Date;
  activatedAt?: Date;
}

// ============================================================================
// INTERFACES - Fraud Rules
// ============================================================================

export interface NFCFraudRule {
  id: string;
  ruleCode: string;
  ruleName: string;
  description?: string;
  ruleType: NFCFraudRuleType;
  ruleConfig: Record<string, unknown>;
  actionOnTrigger: 'FLAG' | 'BLOCK' | 'DECLINE' | 'ALERT';
  scoreImpact: number;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// INTERFACES - Replacements
// ============================================================================

export interface NFCCardReplacement {
  id: string;
  originalCardId: string;
  replacementCardId?: string;
  reason: NFCReplacementReason;
  description?: string;
  originalBalance: number;
  balanceTransferred?: number;
  replacementFee: number;
  status: 'REQUESTED' | 'APPROVED' | 'ISSUED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  requestedAt: Date;
  approvedAt?: Date;
  approvedBy?: string;
  completedAt?: Date;
  deliveryAddress?: string;
  trackingNumber?: string;
}

// ============================================================================
// REQUEST/RESPONSE TYPES
// ============================================================================

// Card Program Management
export interface CreateNFCProgramRequest {
  programCode: string;
  programName: string;
  description?: string;
  cardCategory: NFCCardCategory;
  isReloadable: boolean;
  requiresKyc: boolean;
  cardPrice: number;
  initialBalance: number;
  dailyTransactionLimit: number;
  perTransactionLimit: number;
  chipType: NFCChipType;
  validityMonths: number;
}

// Batch Management
export interface CreateBatchRequest {
  programId: string;
  cardCount: number;
  manufacturer?: string;
  binPrefix: string;
  sequenceStart: number;
  wholesalePrice?: number;
  retailPrice?: number;
}

// Vendor Management
export interface CreateVendorRequest {
  businessName: string;
  contactName?: string;
  phone: string;
  email?: string;
  region?: string;
  district?: string;
  address?: string;
  commissionType?: 'PERCENTAGE' | 'FIXED' | 'TIERED';
  commissionRate?: number;
  maxInventoryValue?: number;
}

export interface AssignInventoryRequest {
  vendorId: string;
  batchId: string;
  sequenceStart: number;
  sequenceEnd: number;
}

// Card Activation
export interface ActivateCardRequest {
  userId: string;
  cardUid: string;
  activationCode?: string;
  cryptoChallenge: string;
  cryptoResponse: string;
  deviceFingerprint: string;
  latitude?: number;
  longitude?: number;
}

export interface ActivateCardResponse {
  success: boolean;
  cardId?: string;
  cardNumber?: string;
  balance?: number;
  expiresAt?: Date;
  error?: string;
  requiresPin?: boolean;
}

// Set PIN
export interface SetCardPinRequest {
  cardId: string;
  userId: string;
  pin: string;
  confirmPin: string;
}

// Transactions
export interface TapToPayRequest {
  cardUid: string;
  terminalId: string;
  merchantId: string;
  amount: number;
  currency?: string;
  cryptoChallenge: string;
  cryptoResponse: string;
  pin?: string;
  latitude?: number;
  longitude?: number;
  isOffline?: boolean;
}

export interface TapToPayResponse {
  success: boolean;
  transactionId?: string;
  authorizationCode?: string;
  balanceAfter?: number;
  declineReason?: string;
  declineCode?: string;
}

// Reload
export interface ReloadCardRequest {
  cardId: string;
  userId: string;
  amount: number;
  sourceWalletId?: string;
  sourceType: 'WALLET' | 'CASH' | 'BANK_TRANSFER' | 'AGENT';
  agentId?: string;
}

// Card Controls
export interface UpdateCardControlsRequest {
  cardId: string;
  userId: string;
  dailyLimit?: number;
  perTransactionLimit?: number;
  allowedMccCodes?: string[];
  blockedMccCodes?: string[];
}

export interface FreezeCardRequest {
  cardId: string;
  userId: string;
  reason: string;
}

// Replacement
export interface RequestReplacementRequest {
  cardId: string;
  userId: string;
  reason: NFCReplacementReason;
  description?: string;
  deliveryAddress?: string;
}

// Vendor Sale
export interface RecordVendorSaleRequest {
  vendorId: string;
  cardId: string;
  salePrice: number;
  paymentMethod?: 'CASH' | 'MOBILE_MONEY';
}

// Reconciliation
export interface VendorReconciliationRequest {
  vendorId: string;
  periodStart: Date;
  periodEnd: Date;
  cardsSold: number;
  grossSales: number;
}

// ============================================================================
// CRYPTO TYPES (For NFC Challenge-Response)
// ============================================================================

/**
 * IMPORTANT: This is for conceptual understanding only.
 * Actual cryptographic operations happen in the HSM.
 * NO keys are ever exposed to the application layer.
 */
export interface NFCCryptoChallenge {
  challengeId: string;
  challenge: string;           // 16-byte random challenge (hex)
  cardUid: string;
  terminalId?: string;
  createdAt: Date;
  expiresAt: Date;             // Short expiry (e.g., 30 seconds)
}

export interface NFCCryptoValidation {
  challengeId: string;
  cardUid: string;
  response: string;            // CMAC response from card
  isValid: boolean;
  validatedAt: Date;
  hsmValidationId?: string;    // HSM audit reference
}

// ============================================================================
// AUDIT TYPES
// ============================================================================

export interface NFCAuditEvent {
  id: string;
  eventType: string;
  eventCategory: 'CARD_LIFECYCLE' | 'TRANSACTION' | 'VENDOR' | 'KEY_MANAGEMENT' | 'ADMIN' | 'SECURITY' | 'FRAUD';
  entityType: string;
  entityId: string;
  actorType: 'USER' | 'ADMIN' | 'SYSTEM' | 'VENDOR' | 'TERMINAL';
  actorId?: string;
  action: string;
  description?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
  latitude?: number;
  longitude?: number;
  createdAt: Date;
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface NFCDashboardStats {
  totalPrograms: number;
  activePrograms: number;
  totalBatches: number;
  totalCards: number;
  cardsByState: Record<NFCCardState, number>;
  totalVendors: number;
  activeVendors: number;
  totalTransactions: number;
  transactionVolume: number;
  todayTransactions: number;
  todayVolume: number;
  activationRate: number;
  averageCardBalance: number;
}

export interface VendorDashboardStats {
  cardsAssigned: number;
  cardsSold: number;
  cardsRemaining: number;
  totalSalesValue: number;
  commissionEarned: number;
  commissionPaid: number;
  commissionPending: number;
  lastSaleAt?: Date;
}
