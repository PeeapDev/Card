export type UserRole = 'superadmin' | 'admin' | 'user' | 'merchant' | 'developer' | 'agent';

export interface RolePermission {
  id: string;
  role: UserRole;
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface SystemRole {
  id: string;
  name: UserRole;
  displayName: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  profilePicture?: string;
  roles: UserRole[];
  kycStatus: 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED' | 'APPROVED';
  kycTier?: number;
  emailVerified?: boolean;
  isActive?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role?: 'user' | 'merchant' | 'agent' | 'school_admin';
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: 'ACTIVE' | 'FROZEN' | 'CLOSED';
  dailyLimit: number;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
  walletType?: 'primary' | 'driver' | 'pot' | 'merchant' | 'pos' | 'business_plus' | 'business' | 'savings';
  name?: string;
}

export interface Card {
  id: string;
  walletId: string;
  cardNumber: string;
  maskedNumber: string;
  expiryMonth: number;
  expiryYear: number;
  cardholderName: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'EXPIRED';
  type: 'VIRTUAL' | 'PHYSICAL';
  dailyLimit: number;
  monthlyLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  walletId: string;
  cardId?: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER' | 'PAYMENT' | 'REFUND';
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  description?: string;
  merchantName?: string;
  merchantCategory?: string;
  reference: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ==========================================
// Pot (Locked Wallet) Types
// ==========================================

export type PotLockType = 'time_based' | 'goal_based' | 'manual' | 'hybrid';
export type PotStatus = 'ACTIVE' | 'LOCKED' | 'UNLOCKED' | 'CLOSED' | 'FROZEN';
export type PotLockStatus = 'LOCKED' | 'UNLOCKING' | 'UNLOCKED' | 'PARTIALLY_LOCKED';
export type AutoDepositFrequency = 'daily' | 'weekly' | 'bi_weekly' | 'monthly';
export type PotTransactionType = 'contribution' | 'withdrawal' | 'auto_deposit' | 'penalty' | 'interest' | 'bonus' | 'fee' | 'refund';
export type PotTransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export interface Pot {
  id: string;
  userId: string;
  walletId: string;
  name: string;
  description?: string;
  goalAmount?: number;
  targetAmount?: number;
  currentBalance: number;
  maturityDate?: string;
  lockType: PotLockType;
  lockPeriodDays?: number;
  lockEndDate?: string;

  // Auto-deposit settings
  autoDepositEnabled: boolean;
  autoDepositAmount?: number;
  autoDepositFrequency?: AutoDepositFrequency;
  autoDepositDay?: number;
  sourceWalletId?: string;
  nextAutoDepositDate?: string;
  lastAutoDepositDate?: string;

  // Status
  status: PotStatus;
  lockStatus: PotLockStatus;
  withdrawalEnabled: boolean;
  unlockedAt?: string;
  unlockReason?: string;

  // Admin override
  adminLocked: boolean;
  adminLockedBy?: string;
  adminLockedAt?: string;
  adminLockReason?: string;

  // Metadata
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;

  // Computed fields (from get_pot_summary)
  progressPercent?: number;
  daysUntilUnlock?: number;
  stats?: PotStats;
}

export interface PotStats {
  totalContributions: number;
  totalWithdrawals: number;
  contributionCount: number;
}

export interface PotTransaction {
  id: string;
  potId: string;
  transactionId?: string;
  transactionType: PotTransactionType;
  amount: number;
  balanceAfter?: number;
  status: PotTransactionStatus;
  description?: string;
  sourceWalletId?: string;
  destinationWalletId?: string;
  reference?: string;
  failureReason?: string;
  retryCount: number;
  scheduledAt?: string;
  processedAt?: string;
  createdAt: string;
}

export interface PotNotification {
  id: string;
  potId: string;
  userId: string;
  notificationType: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  sentAt: string;
  readAt?: string;
}

export interface WithdrawalEligibility {
  canWithdraw: boolean;
  canWithdrawWithPenalty?: boolean;
  lockStatus: string;
  lockEndDate?: string;
  daysUntilUnlock?: number;
  penaltyPercent?: number;
  currentBalance: number;
  maxWithdrawalAmount: number;
  withdrawalAfterPenalty?: number;
  goalAmount?: number;
  remainingToGoal?: number;
  progressPercent?: number;
  reason?: string;
  error?: string;
}

export interface CreatePotRequest {
  name: string;
  description?: string;
  goalAmount?: number;
  lockType: PotLockType;
  lockPeriodDays?: number;
  maturityDate?: string;
  autoDepositEnabled?: boolean;
  autoDepositAmount?: number;
  autoDepositFrequency?: AutoDepositFrequency;
  sourceWalletId?: string;
  icon?: string;
  color?: string;
}

export interface ContributePotRequest {
  potId: string;
  sourceWalletId: string;
  amount: number;
  description?: string;
}

export interface WithdrawPotRequest {
  potId: string;
  destinationWalletId: string;
  amount: number;
  forceWithPenalty?: boolean;
  description?: string;
}

export interface UpdatePotRequest {
  name?: string;
  description?: string;
  goalAmount?: number;
  autoDepositEnabled?: boolean;
  autoDepositAmount?: number;
  autoDepositFrequency?: AutoDepositFrequency;
  sourceWalletId?: string;
  icon?: string;
  color?: string;
}

export interface PotSummary {
  id: string;
  name: string;
  description?: string;
  currentBalance: number;
  goalAmount?: number;
  progressPercent?: number;
  lockType: PotLockType;
  lockStatus: PotLockStatus;
  lockEndDate?: string;
  maturityDate?: string;
  daysUntilUnlock: number;
  autoDeposit: {
    enabled: boolean;
    amount?: number;
    frequency?: AutoDepositFrequency;
    nextDate?: string;
  };
  stats: PotStats;
  status: PotStatus;
  adminLocked: boolean;
  icon: string;
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface PotSettings {
  maxPotsPerUser: number;
  minContributionAmount: number;
  maxContributionAmount: number;
  minLockPeriodDays: number;
  maxLockPeriodDays: number;
  earlyWithdrawalPenaltyPercent: number;
  autoDepositRetryHours: number;
}
