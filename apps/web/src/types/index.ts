export type UserRole = 'admin' | 'user' | 'merchant' | 'developer' | 'agent';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
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
