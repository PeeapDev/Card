/**
 * Employee Cards Module - TypeScript Type Definitions
 * Handles issuing, managing, and controlling employee expense cards
 */

// =============================================
// ENUMS / TYPES
// =============================================

export type CardStatus = 'active' | 'frozen' | 'cancelled' | 'pending' | 'expired';
export type CardType = 'virtual' | 'physical';
export type SpendingLimitPeriod = 'daily' | 'weekly' | 'monthly' | 'per_transaction' | 'total';
export type TransactionStatus = 'pending' | 'approved' | 'declined' | 'refunded';
export type MerchantCategory =
  | 'general'
  | 'travel'
  | 'fuel'
  | 'dining'
  | 'office_supplies'
  | 'software'
  | 'utilities'
  | 'advertising'
  | 'professional_services'
  | 'other';

// =============================================
// CORE ENTITIES
// =============================================

export interface EmployeeCard {
  id: string;
  business_id: string;
  employee_id: string;

  // Card details
  card_number_last4: string;
  card_type: CardType;
  card_name: string;
  status: CardStatus;

  // Employee info
  employee_name: string;
  employee_email?: string;
  employee_department?: string;
  employee_role?: string;

  // Spending controls
  spending_limit: number;
  spending_limit_period: SpendingLimitPeriod;
  current_spend: number;
  currency: string;

  // Category restrictions
  allowed_categories?: MerchantCategory[];
  blocked_categories?: MerchantCategory[];
  allowed_merchants?: string[];
  blocked_merchants?: string[];

  // Dates
  issued_at: string;
  expires_at?: string;
  frozen_at?: string;
  cancelled_at?: string;

  // Settings
  require_receipt: boolean;
  require_memo: boolean;
  auto_approve_limit?: number;

  // Metadata
  notes?: string;
  created_at: string;
  updated_at: string;

  // Relations
  transactions?: CardTransaction[];
}

export interface CardTransaction {
  id: string;
  card_id: string;
  employee_card_id: string;

  // Transaction details
  amount: number;
  currency: string;
  merchant_name: string;
  merchant_category?: MerchantCategory;
  merchant_location?: string;

  // Status
  status: TransactionStatus;
  decline_reason?: string;

  // Expense tracking
  expense_category?: string;
  memo?: string;
  receipt_url?: string;
  receipt_uploaded_at?: string;

  // Approval workflow
  requires_approval: boolean;
  approved_by?: string;
  approved_at?: string;

  // Metadata
  transaction_date: string;
  posted_at?: string;
  created_at: string;
}

export interface SpendingPolicy {
  id: string;
  business_id: string;
  name: string;
  description?: string;

  // Limits
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
  per_transaction_limit?: number;
  total_limit?: number;
  currency: string;

  // Category controls
  allowed_categories?: MerchantCategory[];
  blocked_categories?: MerchantCategory[];

  // Approval rules
  auto_approve_limit?: number;
  require_receipt_above?: number;
  require_memo: boolean;

  // Assignment
  default_policy: boolean;
  assigned_card_count?: number;

  created_at: string;
  updated_at: string;
}

// =============================================
// DTOs
// =============================================

export interface IssueCardDto {
  employee_id: string;
  employee_name: string;
  employee_email?: string;
  employee_department?: string;
  card_type?: CardType;
  card_name?: string;
  spending_limit: number;
  spending_limit_period?: SpendingLimitPeriod;
  currency?: string;
  policy_id?: string;
  allowed_categories?: MerchantCategory[];
  blocked_categories?: MerchantCategory[];
  require_receipt?: boolean;
  require_memo?: boolean;
  notes?: string;
}

export interface UpdateCardDto {
  card_name?: string;
  spending_limit?: number;
  spending_limit_period?: SpendingLimitPeriod;
  allowed_categories?: MerchantCategory[];
  blocked_categories?: MerchantCategory[];
  require_receipt?: boolean;
  require_memo?: boolean;
  notes?: string;
}

export interface CreatePolicyDto {
  name: string;
  description?: string;
  daily_limit?: number;
  weekly_limit?: number;
  monthly_limit?: number;
  per_transaction_limit?: number;
  currency?: string;
  allowed_categories?: MerchantCategory[];
  blocked_categories?: MerchantCategory[];
  auto_approve_limit?: number;
  require_receipt_above?: number;
  require_memo?: boolean;
}

export interface UpdateTransactionDto {
  expense_category?: string;
  memo?: string;
  receipt_url?: string;
}

// =============================================
// DASHBOARD / REPORTING
// =============================================

export interface CardDashboardStats {
  total_cards: number;
  active_cards: number;
  frozen_cards: number;
  pending_cards: number;

  total_spend_this_month: number;
  total_spend_last_month: number;
  spend_growth: number;

  total_transactions: number;
  pending_receipts: number;
  pending_approvals: number;

  spend_by_category: Record<string, number>;
  spend_by_employee: { employee_name: string; amount: number }[];
  recent_transactions: CardTransaction[];
}

export interface CardFilters {
  status?: CardStatus;
  card_type?: CardType;
  employee_id?: string;
  department?: string;
  search?: string;
}

export interface TransactionFilters {
  card_id?: string;
  status?: TransactionStatus;
  category?: MerchantCategory;
  date_from?: string;
  date_to?: string;
  search?: string;
  needs_receipt?: boolean;
  needs_approval?: boolean;
}
