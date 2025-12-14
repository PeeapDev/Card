/**
 * Subscriptions Module - TypeScript Type Definitions
 * Handles recurring payments, subscription plans, and billing cycles
 */

// =============================================
// ENUMS / TYPES
// =============================================

export type SubscriptionStatus = 'active' | 'paused' | 'cancelled' | 'past_due' | 'trialing' | 'expired';
export type BillingInterval = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type PaymentMethod = 'bank_transfer' | 'mobile_money' | 'card' | 'peeap_wallet' | 'auto_debit';

// =============================================
// CORE ENTITIES
// =============================================

export interface SubscriptionPlan {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  billing_interval: BillingInterval;
  billing_interval_count: number; // e.g., 2 for "every 2 months"
  trial_days: number;
  features?: string[];
  is_active: boolean;
  subscriber_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  business_id: string;
  plan_id: string;

  // Customer details
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: string; // Reference to invoice_customers if exists

  // Billing
  amount: number;
  currency: string;
  billing_interval: BillingInterval;
  billing_interval_count: number;

  // Dates
  start_date: string;
  current_period_start: string;
  current_period_end: string;
  next_billing_date: string;
  trial_end?: string;
  cancelled_at?: string;
  ended_at?: string;

  // Payment
  payment_method?: PaymentMethod;
  auto_renew: boolean;

  // Status
  status: SubscriptionStatus;

  // Metadata
  notes?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;

  // Relations
  plan?: SubscriptionPlan;
  payments?: SubscriptionPayment[];
}

export interface SubscriptionPayment {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  payment_method: PaymentMethod;
  payment_reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  billing_period_start: string;
  billing_period_end: string;
  paid_at?: string;
  failed_reason?: string;
  created_at: string;
}

// =============================================
// DTOs
// =============================================

export interface CreatePlanDto {
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billing_interval: BillingInterval;
  billing_interval_count?: number;
  trial_days?: number;
  features?: string[];
}

export interface UpdatePlanDto extends Partial<CreatePlanDto> {
  is_active?: boolean;
}

export interface CreateSubscriptionDto {
  plan_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_id?: string;
  amount?: number;
  currency?: string;
  billing_interval?: BillingInterval;
  billing_interval_count?: number;
  start_date?: string;
  trial_days?: number;
  payment_method?: PaymentMethod;
  auto_renew?: boolean;
  notes?: string;
}

export interface RecordSubscriptionPaymentDto {
  subscription_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  notes?: string;
}

// =============================================
// DASHBOARD / REPORTING
// =============================================

export interface SubscriptionDashboardStats {
  total_subscriptions: number;
  active_subscriptions: number;
  paused_subscriptions: number;
  cancelled_subscriptions: number;
  trialing_subscriptions: number;
  mrr: number; // Monthly Recurring Revenue
  arr: number; // Annual Recurring Revenue
  churn_rate: number;
  this_month_revenue: number;
  last_month_revenue: number;
  revenue_growth: number;
  upcoming_renewals: Subscription[];
  past_due_subscriptions: Subscription[];
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  plan_id?: string;
  customer_id?: string;
  search?: string;
  date_from?: string;
  date_to?: string;
}
