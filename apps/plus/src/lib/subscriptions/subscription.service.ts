/**
 * Subscription Service - CRUD operations for subscriptions and plans
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Subscription,
  SubscriptionPlan,
  SubscriptionPayment,
  SubscriptionDashboardStats,
  SubscriptionStatus,
  CreatePlanDto,
  UpdatePlanDto,
  CreateSubscriptionDto,
  RecordSubscriptionPaymentDto,
  SubscriptionFilters,
  BillingInterval,
} from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =============================================
// PLANS
// =============================================

export async function getPlans(businessId: string): Promise<SubscriptionPlan[]> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getPlan(planId: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createPlan(businessId: string, dto: CreatePlanDto): Promise<SubscriptionPlan> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .insert({
      business_id: businessId,
      name: dto.name,
      description: dto.description,
      price: dto.price,
      currency: dto.currency || 'NLE',
      billing_interval: dto.billing_interval,
      billing_interval_count: dto.billing_interval_count || 1,
      trial_days: dto.trial_days || 0,
      features: dto.features || [],
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updatePlan(planId: string, dto: UpdatePlanDto): Promise<SubscriptionPlan> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.name !== undefined) updates.name = dto.name;
  if (dto.description !== undefined) updates.description = dto.description;
  if (dto.price !== undefined) updates.price = dto.price;
  if (dto.currency !== undefined) updates.currency = dto.currency;
  if (dto.billing_interval !== undefined) updates.billing_interval = dto.billing_interval;
  if (dto.billing_interval_count !== undefined) updates.billing_interval_count = dto.billing_interval_count;
  if (dto.trial_days !== undefined) updates.trial_days = dto.trial_days;
  if (dto.features !== undefined) updates.features = dto.features;
  if (dto.is_active !== undefined) updates.is_active = dto.is_active;

  const { data, error } = await supabase
    .from('subscription_plans')
    .update(updates)
    .eq('id', planId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deletePlan(planId: string): Promise<void> {
  const { error } = await supabase
    .from('subscription_plans')
    .delete()
    .eq('id', planId);

  if (error) throw error;
}

// =============================================
// SUBSCRIPTIONS
// =============================================

function calculateNextBillingDate(fromDate: Date, interval: BillingInterval, count: number): Date {
  const next = new Date(fromDate);
  switch (interval) {
    case 'daily':
      next.setDate(next.getDate() + count);
      break;
    case 'weekly':
      next.setDate(next.getDate() + (7 * count));
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + count);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + (3 * count));
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + count);
      break;
  }
  return next;
}

export async function getSubscriptions(businessId: string, filters?: SubscriptionFilters): Promise<Subscription[]> {
  let query = supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*),
      payments:subscription_payments(*)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.plan_id) {
    query = query.eq('plan_id', filters.plan_id);
  }
  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }
  if (filters?.search) {
    query = query.or(`customer_name.ilike.%${filters.search}%,customer_email.ilike.%${filters.search}%`);
  }
  if (filters?.date_from) {
    query = query.gte('start_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('start_date', filters.date_to);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data || [];
}

export async function getSubscription(subscriptionId: string): Promise<Subscription | null> {
  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      *,
      plan:subscription_plans(*),
      payments:subscription_payments(*)
    `)
    .eq('id', subscriptionId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createSubscription(businessId: string, dto: CreateSubscriptionDto): Promise<Subscription> {
  // Get plan details if plan_id provided
  let plan: SubscriptionPlan | null = null;
  if (dto.plan_id) {
    plan = await getPlan(dto.plan_id);
  }

  const startDate = dto.start_date ? new Date(dto.start_date) : new Date();
  const billingInterval = dto.billing_interval || plan?.billing_interval || 'monthly';
  const billingIntervalCount = dto.billing_interval_count || plan?.billing_interval_count || 1;
  const amount = dto.amount ?? plan?.price ?? 0;
  const currency = dto.currency || plan?.currency || 'NLE';
  const trialDays = dto.trial_days ?? plan?.trial_days ?? 0;

  let currentPeriodStart = startDate;
  let trialEnd: Date | null = null;
  let status: SubscriptionStatus = 'active';

  if (trialDays > 0) {
    trialEnd = new Date(startDate);
    trialEnd.setDate(trialEnd.getDate() + trialDays);
    status = 'trialing';
  }

  const currentPeriodEnd = calculateNextBillingDate(currentPeriodStart, billingInterval, billingIntervalCount);
  const nextBillingDate = trialEnd || currentPeriodEnd;

  const { data, error } = await supabase
    .from('subscriptions')
    .insert({
      business_id: businessId,
      plan_id: dto.plan_id,
      customer_name: dto.customer_name,
      customer_email: dto.customer_email,
      customer_phone: dto.customer_phone,
      customer_id: dto.customer_id,
      amount,
      currency,
      billing_interval: billingInterval,
      billing_interval_count: billingIntervalCount,
      start_date: startDate.toISOString(),
      current_period_start: currentPeriodStart.toISOString(),
      current_period_end: currentPeriodEnd.toISOString(),
      next_billing_date: nextBillingDate.toISOString(),
      trial_end: trialEnd?.toISOString(),
      payment_method: dto.payment_method,
      auto_renew: dto.auto_renew ?? true,
      status,
      notes: dto.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return getSubscription(data.id) as Promise<Subscription>;
}

export async function updateSubscription(subscriptionId: string, dto: Partial<CreateSubscriptionDto>): Promise<Subscription> {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (dto.customer_name !== undefined) updates.customer_name = dto.customer_name;
  if (dto.customer_email !== undefined) updates.customer_email = dto.customer_email;
  if (dto.customer_phone !== undefined) updates.customer_phone = dto.customer_phone;
  if (dto.amount !== undefined) updates.amount = dto.amount;
  if (dto.payment_method !== undefined) updates.payment_method = dto.payment_method;
  if (dto.auto_renew !== undefined) updates.auto_renew = dto.auto_renew;
  if (dto.notes !== undefined) updates.notes = dto.notes;

  const { error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId);

  if (error) throw error;
  return getSubscription(subscriptionId) as Promise<Subscription>;
}

export async function pauseSubscription(subscriptionId: string): Promise<Subscription> {
  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'paused',
      updated_at: new Date().toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) throw error;
  return getSubscription(subscriptionId) as Promise<Subscription>;
}

export async function resumeSubscription(subscriptionId: string): Promise<Subscription> {
  const subscription = await getSubscription(subscriptionId);
  if (!subscription) throw new Error('Subscription not found');

  // Reset billing period
  const now = new Date();
  const nextBilling = calculateNextBillingDate(
    now,
    subscription.billing_interval,
    subscription.billing_interval_count
  );

  const { error } = await supabase
    .from('subscriptions')
    .update({
      status: 'active',
      current_period_start: now.toISOString(),
      current_period_end: nextBilling.toISOString(),
      next_billing_date: nextBilling.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq('id', subscriptionId);

  if (error) throw error;
  return getSubscription(subscriptionId) as Promise<Subscription>;
}

export async function cancelSubscription(subscriptionId: string, immediate: boolean = false): Promise<Subscription> {
  const updates: Record<string, unknown> = {
    cancelled_at: new Date().toISOString(),
    auto_renew: false,
    updated_at: new Date().toISOString(),
  };

  if (immediate) {
    updates.status = 'cancelled';
    updates.ended_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from('subscriptions')
    .update(updates)
    .eq('id', subscriptionId);

  if (error) throw error;
  return getSubscription(subscriptionId) as Promise<Subscription>;
}

export async function deleteSubscription(subscriptionId: string): Promise<void> {
  // Delete payments first
  await supabase.from('subscription_payments').delete().eq('subscription_id', subscriptionId);

  const { error } = await supabase
    .from('subscriptions')
    .delete()
    .eq('id', subscriptionId);

  if (error) throw error;
}

// =============================================
// PAYMENTS
// =============================================

export async function recordSubscriptionPayment(dto: RecordSubscriptionPaymentDto): Promise<Subscription> {
  const subscription = await getSubscription(dto.subscription_id);
  if (!subscription) throw new Error('Subscription not found');

  // Record payment
  const { error: paymentError } = await supabase
    .from('subscription_payments')
    .insert({
      subscription_id: dto.subscription_id,
      amount: dto.amount,
      currency: subscription.currency,
      payment_method: dto.payment_method,
      payment_reference: dto.payment_reference,
      status: 'completed',
      billing_period_start: subscription.current_period_start,
      billing_period_end: subscription.current_period_end,
      paid_at: new Date().toISOString(),
    });

  if (paymentError) throw paymentError;

  // Update subscription for next period
  const nextPeriodStart = new Date(subscription.current_period_end);
  const nextPeriodEnd = calculateNextBillingDate(
    nextPeriodStart,
    subscription.billing_interval,
    subscription.billing_interval_count
  );

  const { error: updateError } = await supabase
    .from('subscriptions')
    .update({
      current_period_start: nextPeriodStart.toISOString(),
      current_period_end: nextPeriodEnd.toISOString(),
      next_billing_date: nextPeriodEnd.toISOString(),
      status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.subscription_id);

  if (updateError) throw updateError;

  return getSubscription(dto.subscription_id) as Promise<Subscription>;
}

export async function getSubscriptionPayments(subscriptionId: string): Promise<SubscriptionPayment[]> {
  const { data, error } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('subscription_id', subscriptionId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

// =============================================
// DASHBOARD
// =============================================

export async function getSubscriptionDashboard(businessId: string): Promise<SubscriptionDashboardStats> {
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('business_id', businessId);

  const allSubs = subscriptions || [];
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  let mrr = 0;
  let activeCount = 0;
  let pausedCount = 0;
  let cancelledCount = 0;
  let trialingCount = 0;
  const upcomingRenewals: Subscription[] = [];
  const pastDue: Subscription[] = [];

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  allSubs.forEach(sub => {
    if (sub.status === 'active') {
      activeCount++;
      // Calculate MRR based on billing interval
      let monthlyAmount = sub.amount;
      switch (sub.billing_interval) {
        case 'daily':
          monthlyAmount = sub.amount * 30;
          break;
        case 'weekly':
          monthlyAmount = sub.amount * 4.33;
          break;
        case 'quarterly':
          monthlyAmount = sub.amount / 3;
          break;
        case 'yearly':
          monthlyAmount = sub.amount / 12;
          break;
      }
      mrr += monthlyAmount / (sub.billing_interval_count || 1);

      // Check upcoming renewals
      const nextBilling = new Date(sub.next_billing_date);
      if (nextBilling <= sevenDaysFromNow) {
        upcomingRenewals.push(sub);
      }
    } else if (sub.status === 'paused') {
      pausedCount++;
    } else if (sub.status === 'cancelled') {
      cancelledCount++;
    } else if (sub.status === 'trialing') {
      trialingCount++;
    } else if (sub.status === 'past_due') {
      pastDue.push(sub);
    }
  });

  // Get payments for revenue calculation
  const { data: payments } = await supabase
    .from('subscription_payments')
    .select('*')
    .eq('status', 'completed')
    .gte('paid_at', startOfLastMonth.toISOString());

  let thisMonthRevenue = 0;
  let lastMonthRevenue = 0;

  (payments || []).forEach(payment => {
    const paidAt = new Date(payment.paid_at);
    if (paidAt >= startOfMonth) {
      thisMonthRevenue += payment.amount;
    } else if (paidAt >= startOfLastMonth && paidAt <= endOfLastMonth) {
      lastMonthRevenue += payment.amount;
    }
  });

  const revenueGrowth = lastMonthRevenue > 0
    ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    : 0;

  // Calculate churn rate
  const totalActive = activeCount + trialingCount;
  const churnRate = totalActive > 0
    ? (cancelledCount / (totalActive + cancelledCount)) * 100
    : 0;

  return {
    total_subscriptions: allSubs.length,
    active_subscriptions: activeCount,
    paused_subscriptions: pausedCount,
    cancelled_subscriptions: cancelledCount,
    trialing_subscriptions: trialingCount,
    mrr,
    arr: mrr * 12,
    churn_rate: Math.round(churnRate * 100) / 100,
    this_month_revenue: thisMonthRevenue,
    last_month_revenue: lastMonthRevenue,
    revenue_growth: Math.round(revenueGrowth * 100) / 100,
    upcoming_renewals: upcomingRenewals.slice(0, 5),
    past_due_subscriptions: pastDue.slice(0, 5),
  };
}

// =============================================
// HELPER
// =============================================

function getBusinessId(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  const businessId = localStorage.getItem('plusBusinessId');
  if (!businessId) {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.businessId) {
          localStorage.setItem('plusBusinessId', user.businessId);
          return user.businessId;
        }
      } catch {}
    }
    console.warn('No business ID found in localStorage. Subscription operations may not work correctly.');
    return '';
  }
  return businessId;
}

// Wrapper to handle empty businessId gracefully
async function withBusinessId<T>(fn: (businessId: string) => Promise<T>, defaultValue: T): Promise<T> {
  const businessId = getBusinessId();
  if (!businessId) {
    console.warn('No business ID available - returning empty result');
    return defaultValue;
  }
  return fn(businessId);
}

// =============================================
// FACADE EXPORT
// =============================================

export const subscriptionService = {
  // Plans
  getPlans: () => withBusinessId(getPlans, []),
  getPlan,
  createPlan: (dto: CreatePlanDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to create plan');
    return createPlan(businessId, dto);
  },
  updatePlan,
  deletePlan,

  // Subscriptions
  getSubscriptions: (filters?: SubscriptionFilters) => withBusinessId((bid) => getSubscriptions(bid, filters), []),
  getSubscription,
  createSubscription: (dto: CreateSubscriptionDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to create subscription');
    return createSubscription(businessId, dto);
  },
  updateSubscription,
  pauseSubscription,
  resumeSubscription,
  cancelSubscription,
  deleteSubscription,

  // Payments
  recordPayment: recordSubscriptionPayment,
  getPayments: getSubscriptionPayments,

  // Dashboard
  getDashboard: () => withBusinessId(getSubscriptionDashboard, {
    total_subscribers: 0,
    active_subscribers: 0,
    mrr: 0,
    arr: 0,
    churn_rate: 0,
    total_revenue: 0,
    plans_count: 0,
    recent_subscriptions: [],
    subscriptions_by_plan: [],
    revenue_trend: [],
  }),
};
