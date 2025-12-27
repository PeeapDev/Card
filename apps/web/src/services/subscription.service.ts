/**
 * Subscription Service
 *
 * Handles subscription plans, customer subscriptions, invoices, and billing
 * Similar to Stripe Billing API
 */

import { supabase } from '@/lib/supabase';
import { walletService } from '@/services/wallet.service';

// =====================================================
// TYPES
// =====================================================

export type SubscriptionInterval = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type SubscriptionStatus = 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused';
export type InvoiceStatus = 'draft' | 'pending' | 'paid' | 'failed' | 'void';
export type PaymentMethodType = 'card' | 'wallet' | 'mobile_money';

export interface SubscriptionPlan {
  id: string;
  merchant_id: string;
  name: string;
  description?: string;
  features: string[];
  amount: number;
  currency: string;
  interval: SubscriptionInterval;
  interval_count: number;
  trial_days: number;
  is_active: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface PaymentMethod {
  id: string;
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string;
  type: PaymentMethodType;
  // Card details
  card_token?: string;
  card_last_four?: string;
  card_brand?: string;
  card_exp_month?: number;
  card_exp_year?: number;
  // Wallet details
  wallet_id?: string;
  // Mobile money details
  mobile_network?: string;
  mobile_number?: string;
  // Consent
  consent_given: boolean;
  consent_text?: string;
  consented_at?: string;
  consent_ip?: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
}

export interface Subscription {
  id: string;
  plan_id: string;
  merchant_id: string;
  customer_id?: string;
  customer_email?: string;
  customer_phone?: string;
  customer_name?: string;
  default_payment_method_id?: string;
  status: SubscriptionStatus;
  current_period_start?: string;
  current_period_end?: string;
  trial_start?: string;
  trial_end?: string;
  next_billing_date?: string;
  canceled_at?: string;
  cancel_reason?: string;
  paused_at?: string;
  resume_at?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined data
  plan?: SubscriptionPlan;
  payment_method?: PaymentMethod;
}

export interface SubscriptionInvoice {
  id: string;
  subscription_id: string;
  merchant_id: string;
  invoice_number?: string;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  billing_period_start?: string;
  billing_period_end?: string;
  due_date?: string;
  paid_at?: string;
  payment_method_id?: string;
  payment_reference?: string;
  payment_attempt_count: number;
  last_payment_attempt?: string;
  last_payment_error?: string;
  show_pending_from?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionEvent {
  id: string;
  subscription_id: string;
  event_type: string;
  data: Record<string, unknown>;
  created_at: string;
}

export interface CreatePlanRequest {
  name: string;
  description?: string;
  features?: string[];
  amount: number;
  currency?: string;
  interval?: SubscriptionInterval;
  interval_count?: number;
  trial_days?: number;
  metadata?: Record<string, unknown>;
}

export interface CreateSubscriptionRequest {
  plan_id: string;
  customer_email: string;
  customer_phone?: string;
  customer_name?: string;
  payment_method: {
    type: PaymentMethodType;
    // Card
    card_token?: string;
    card_last_four?: string;
    card_brand?: string;
    card_exp_month?: number;
    card_exp_year?: number;
    // Wallet
    wallet_id?: string;
    // Mobile money
    mobile_network?: string;
    mobile_number?: string;
  };
  consent_text: string;
  consent_ip?: string;
  start_trial?: boolean;
  metadata?: Record<string, unknown>;
}

// =====================================================
// SUBSCRIPTION PLANS
// =====================================================

class SubscriptionService {
  /**
   * Create a new subscription plan
   */
  async createPlan(merchantId: string, data: CreatePlanRequest): Promise<SubscriptionPlan> {
    const { data: plan, error } = await supabase
      .from('merchant_subscription_plans')
      .insert({
        merchant_id: merchantId,
        name: data.name,
        description: data.description,
        features: data.features || [],
        amount: data.amount,
        currency: data.currency || 'SLE',
        interval: data.interval || 'monthly',
        interval_count: data.interval_count || 1,
        trial_days: data.trial_days || 0,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return plan;
  }

  /**
   * Get all plans for a merchant
   */
  async getMerchantPlans(merchantId: string): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('merchant_subscription_plans')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get active plans for a merchant (for public display)
   */
  async getActivePlans(merchantId: string): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('merchant_subscription_plans')
      .select('*')
      .eq('merchant_id', merchantId)
      .eq('is_active', true)
      .order('amount', { ascending: true });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get a single plan by ID
   */
  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    const { data, error } = await supabase
      .from('merchant_subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Update a plan
   */
  async updatePlan(planId: string, updates: Partial<CreatePlanRequest>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from('merchant_subscription_plans')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  /**
   * Deactivate a plan (soft delete)
   */
  async deactivatePlan(planId: string): Promise<void> {
    const { error } = await supabase
      .from('merchant_subscription_plans')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', planId);

    if (error) throw new Error(error.message);
  }

  // =====================================================
  // SUBSCRIPTIONS
  // =====================================================

  /**
   * Create a new subscription
   */
  async createSubscription(request: CreateSubscriptionRequest): Promise<Subscription> {
    // 1. Get the plan
    const plan = await this.getPlan(request.plan_id);
    if (!plan) throw new Error('Plan not found');
    if (!plan.is_active) throw new Error('Plan is not active');

    // 2. Create payment method
    const { data: paymentMethod, error: pmError } = await supabase
      .from('customer_payment_methods')
      .insert({
        customer_email: request.customer_email,
        customer_phone: request.customer_phone,
        type: request.payment_method.type,
        card_token: request.payment_method.card_token,
        card_last_four: request.payment_method.card_last_four,
        card_brand: request.payment_method.card_brand,
        card_exp_month: request.payment_method.card_exp_month,
        card_exp_year: request.payment_method.card_exp_year,
        wallet_id: request.payment_method.wallet_id,
        mobile_network: request.payment_method.mobile_network,
        mobile_number: request.payment_method.mobile_number,
        consent_given: true,
        consent_text: request.consent_text,
        consented_at: new Date().toISOString(),
        consent_ip: request.consent_ip,
      })
      .select()
      .single();

    if (pmError) throw new Error(pmError.message);

    // 3. Calculate dates
    const now = new Date();
    const hasTrial = request.start_trial !== false && plan.trial_days > 0;

    let trialStart: Date | null = null;
    let trialEnd: Date | null = null;
    let periodStart = now;
    let periodEnd: Date;
    let nextBillingDate: Date;
    let initialStatus: SubscriptionStatus;

    if (hasTrial) {
      trialStart = now;
      trialEnd = new Date(now);
      trialEnd.setDate(trialEnd.getDate() + plan.trial_days);
      periodStart = trialEnd;
      periodEnd = this.calculatePeriodEnd(trialEnd, plan.interval, plan.interval_count);
      nextBillingDate = trialEnd;
      initialStatus = 'trialing';
    } else {
      periodEnd = this.calculatePeriodEnd(now, plan.interval, plan.interval_count);
      nextBillingDate = periodEnd;
      initialStatus = 'pending'; // Will become 'active' after first payment
    }

    // 4. Create subscription
    const { data: subscription, error: subError } = await supabase
      .from('customer_subscriptions')
      .insert({
        plan_id: plan.id,
        merchant_id: plan.merchant_id,
        customer_email: request.customer_email,
        customer_phone: request.customer_phone,
        customer_name: request.customer_name,
        default_payment_method_id: paymentMethod.id,
        status: initialStatus,
        current_period_start: periodStart.toISOString(),
        current_period_end: periodEnd.toISOString(),
        trial_start: trialStart?.toISOString(),
        trial_end: trialEnd?.toISOString(),
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        metadata: request.metadata || {},
      })
      .select()
      .single();

    if (subError) throw new Error(subError.message);

    // 5. Log event
    await this.logEvent(subscription.id, 'created', {
      plan_id: plan.id,
      plan_name: plan.name,
      amount: plan.amount,
      has_trial: hasTrial,
      trial_days: hasTrial ? plan.trial_days : 0,
    });

    // 6. If no trial, create first invoice and process payment
    if (!hasTrial) {
      await this.createAndProcessInvoice(subscription.id);
    }

    return subscription;
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select(`
        *,
        plan:merchant_subscription_plans(*),
        payment_method:customer_payment_methods(*)
      `)
      .eq('id', subscriptionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data;
  }

  /**
   * Get subscriptions for a merchant
   */
  async getMerchantSubscriptions(merchantId: string, status?: SubscriptionStatus): Promise<Subscription[]> {
    let query = supabase
      .from('customer_subscriptions')
      .select(`
        *,
        plan:merchant_subscription_plans(*)
      `)
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get subscriptions for a customer
   */
  async getCustomerSubscriptions(customerEmail: string): Promise<Subscription[]> {
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .select(`
        *,
        plan:merchant_subscription_plans(*)
      `)
      .eq('customer_email', customerEmail)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string, cancelImmediately = false): Promise<Subscription> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) throw new Error('Subscription not found');

    const updates: Record<string, unknown> = {
      canceled_at: new Date().toISOString(),
      cancel_reason: reason,
      updated_at: new Date().toISOString(),
    };

    if (cancelImmediately) {
      updates.status = 'canceled';
      updates.current_period_end = new Date().toISOString();
    }
    // Otherwise, subscription remains active until current period ends

    const { data, error } = await supabase
      .from('customer_subscriptions')
      .update(updates)
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.logEvent(subscriptionId, 'canceled', { reason, immediate: cancelImmediately });

    return data;
  }

  /**
   * Pause a subscription
   */
  async pauseSubscription(subscriptionId: string, resumeAt?: Date): Promise<Subscription> {
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .update({
        status: 'paused',
        paused_at: new Date().toISOString(),
        resume_at: resumeAt?.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.logEvent(subscriptionId, 'paused', { resume_at: resumeAt?.toISOString() });

    return data;
  }

  /**
   * Resume a paused subscription
   */
  async resumeSubscription(subscriptionId: string): Promise<Subscription> {
    const { data, error } = await supabase
      .from('customer_subscriptions')
      .update({
        status: 'active',
        paused_at: null,
        resume_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.logEvent(subscriptionId, 'resumed', {});

    return data;
  }

  // =====================================================
  // INVOICES & BILLING
  // =====================================================

  /**
   * Create and process an invoice for a subscription
   */
  async createAndProcessInvoice(subscriptionId: string): Promise<SubscriptionInvoice> {
    const subscription = await this.getSubscription(subscriptionId);
    if (!subscription) throw new Error('Subscription not found');
    if (!subscription.plan) throw new Error('Plan not found');

    const plan = subscription.plan;
    const now = new Date();
    const dueDate = new Date(subscription.next_billing_date || now);

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    // Create invoice
    const { data: invoice, error } = await supabase
      .from('subscription_invoices')
      .insert({
        subscription_id: subscriptionId,
        merchant_id: subscription.merchant_id,
        invoice_number: invoiceNumber,
        amount: plan.amount,
        currency: plan.currency,
        status: 'pending',
        billing_period_start: subscription.current_period_start,
        billing_period_end: subscription.current_period_end,
        due_date: dueDate.toISOString().split('T')[0],
        payment_method_id: subscription.default_payment_method_id,
        show_pending_from: new Date(dueDate.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days before
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    // Process payment
    await this.processInvoicePayment(invoice.id);

    // Refresh invoice
    const { data: updatedInvoice } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('id', invoice.id)
      .single();

    return updatedInvoice || invoice;
  }

  /**
   * Process payment for an invoice
   */
  async processInvoicePayment(invoiceId: string): Promise<boolean> {
    const { data: invoice } = await supabase
      .from('subscription_invoices')
      .select(`
        *,
        subscription:customer_subscriptions(
          *,
          payment_method:customer_payment_methods(*)
        )
      `)
      .eq('id', invoiceId)
      .single();

    if (!invoice) throw new Error('Invoice not found');

    const subscription = invoice.subscription;
    const paymentMethod = subscription?.payment_method;

    if (!paymentMethod) {
      await this.markInvoiceFailed(invoiceId, 'No payment method');
      return false;
    }

    // Update attempt count
    await supabase
      .from('subscription_invoices')
      .update({
        payment_attempt_count: invoice.payment_attempt_count + 1,
        last_payment_attempt: new Date().toISOString(),
      })
      .eq('id', invoiceId);

    try {
      let paymentSuccess = false;
      let paymentReference = '';

      switch (paymentMethod.type) {
        case 'card':
          // TODO: Integrate with card payment processor
          // const result = await cardProcessor.charge(paymentMethod.card_token, invoice.amount);
          // paymentSuccess = result.success;
          // paymentReference = result.reference;
          paymentSuccess = true; // Placeholder
          paymentReference = `card_${Date.now()}`;
          break;

        case 'wallet':
          // TODO: Deduct from PeeAP wallet
          // const walletResult = await walletService.deduct(paymentMethod.wallet_id, invoice.amount);
          // paymentSuccess = walletResult.success;
          paymentSuccess = true; // Placeholder
          paymentReference = `wallet_${Date.now()}`;
          break;

        case 'mobile_money':
          // For mobile money, we send a payment request - can't auto-charge
          // TODO: Send payment request via Monime
          // await monimeService.requestPayment(paymentMethod.mobile_number, invoice.amount);
          // Mark as pending, not paid - customer must approve
          await supabase
            .from('subscription_invoices')
            .update({ status: 'pending' })
            .eq('id', invoiceId);
          return false; // Payment pending customer approval
      }

      if (paymentSuccess) {
        await this.markInvoicePaid(invoiceId, paymentReference);

        // Update subscription status and next billing date
        const nextPeriodEnd = this.calculatePeriodEnd(
          new Date(subscription.current_period_end),
          subscription.plan?.interval || 'monthly',
          subscription.plan?.interval_count || 1
        );

        await supabase
          .from('customer_subscriptions')
          .update({
            status: 'active',
            current_period_start: subscription.current_period_end,
            current_period_end: nextPeriodEnd.toISOString(),
            next_billing_date: nextPeriodEnd.toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        await this.logEvent(subscription.id, 'payment_succeeded', {
          invoice_id: invoiceId,
          amount: invoice.amount,
          payment_reference: paymentReference,
        });

        return true;
      } else {
        await this.markInvoiceFailed(invoiceId, 'Payment declined');
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      await this.markInvoiceFailed(invoiceId, errorMessage);
      return false;
    }
  }

  /**
   * Mark invoice as paid
   */
  async markInvoicePaid(invoiceId: string, paymentReference: string): Promise<void> {
    await supabase
      .from('subscription_invoices')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_reference: paymentReference,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);
  }

  /**
   * Mark invoice as failed
   */
  async markInvoiceFailed(invoiceId: string, error: string): Promise<void> {
    await supabase
      .from('subscription_invoices')
      .update({
        status: 'failed',
        last_payment_error: error,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);
  }

  /**
   * Get invoices for a subscription
   */
  async getSubscriptionInvoices(subscriptionId: string): Promise<SubscriptionInvoice[]> {
    const { data, error } = await supabase
      .from('subscription_invoices')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false });

    if (error) throw new Error(error.message);
    return data || [];
  }

  /**
   * Get pending invoices (for showing upcoming payments)
   */
  async getPendingInvoices(customerEmail: string): Promise<SubscriptionInvoice[]> {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('subscription_invoices')
      .select(`
        *,
        subscription:customer_subscriptions(
          *,
          plan:merchant_subscription_plans(*)
        )
      `)
      .eq('status', 'pending')
      .lte('show_pending_from', today)
      .order('due_date', { ascending: true });

    if (error) throw new Error(error.message);

    // Filter by customer email (through subscription)
    return (data || []).filter(inv =>
      inv.subscription?.customer_email === customerEmail
    );
  }

  // =====================================================
  // BILLING ENGINE (for cron job)
  // =====================================================

  /**
   * Process all due subscriptions (run daily)
   */
  async processDueSubscriptions(): Promise<{ processed: number; succeeded: number; failed: number }> {
    const today = new Date().toISOString().split('T')[0];

    // Get subscriptions due today
    const { data: dueSubscriptions, error } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('next_billing_date', today)
      .in('status', ['active', 'trialing']);

    if (error) throw new Error(error.message);

    let succeeded = 0;
    let failed = 0;

    for (const subscription of dueSubscriptions || []) {
      try {
        // If trialing, update status to active first
        if (subscription.status === 'trialing') {
          await supabase
            .from('customer_subscriptions')
            .update({ status: 'active', updated_at: new Date().toISOString() })
            .eq('id', subscription.id);

          await this.logEvent(subscription.id, 'activated', { reason: 'trial_ended' });
        }

        const invoice = await this.createAndProcessInvoice(subscription.id);

        if (invoice.status === 'paid') {
          succeeded++;
        } else {
          failed++;
          // Mark subscription as past_due after failed payment
          await supabase
            .from('customer_subscriptions')
            .update({ status: 'past_due', updated_at: new Date().toISOString() })
            .eq('id', subscription.id);

          await this.logEvent(subscription.id, 'payment_failed', {
            invoice_id: invoice.id,
            error: invoice.last_payment_error,
          });
        }
      } catch (err) {
        console.error(`Failed to process subscription ${subscription.id}:`, err);
        failed++;
      }
    }

    return {
      processed: dueSubscriptions?.length || 0,
      succeeded,
      failed,
    };
  }

  /**
   * Process expired trials (run daily)
   */
  async processExpiredTrials(): Promise<number> {
    const today = new Date().toISOString().split('T')[0];

    const { data: expiredTrials, error } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('status', 'trialing')
      .lte('trial_end', today);

    if (error) throw new Error(error.message);

    let processed = 0;

    for (const subscription of expiredTrials || []) {
      try {
        // Update next billing date to today
        await supabase
          .from('customer_subscriptions')
          .update({
            next_billing_date: today,
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        processed++;
      } catch (err) {
        console.error(`Failed to process expired trial ${subscription.id}:`, err);
      }
    }

    return processed;
  }

  // =====================================================
  // HELPERS
  // =====================================================

  /**
   * Calculate period end date based on interval
   */
  private calculatePeriodEnd(startDate: Date, interval: SubscriptionInterval, count: number): Date {
    const end = new Date(startDate);

    switch (interval) {
      case 'daily':
        end.setDate(end.getDate() + count);
        break;
      case 'weekly':
        end.setDate(end.getDate() + (7 * count));
        break;
      case 'monthly':
        end.setMonth(end.getMonth() + count);
        break;
      case 'yearly':
        end.setFullYear(end.getFullYear() + count);
        break;
    }

    return end;
  }

  /**
   * Log subscription event
   */
  private async logEvent(subscriptionId: string, eventType: string, data: Record<string, unknown>): Promise<void> {
    await supabase
      .from('subscription_events')
      .insert({
        subscription_id: subscriptionId,
        event_type: eventType,
        data,
      });
  }

  // =====================================================
  // STATISTICS
  // =====================================================

  /**
   * Get subscription statistics for a merchant
   */
  async getMerchantStats(merchantId: string): Promise<{
    total_subscriptions: number;
    active_subscriptions: number;
    trialing_subscriptions: number;
    canceled_subscriptions: number;
    mrr: number;
    currency: string;
  }> {
    const { data: subscriptions, error } = await supabase
      .from('customer_subscriptions')
      .select(`
        status,
        plan:merchant_subscription_plans(amount, currency, interval)
      `)
      .eq('merchant_id', merchantId);

    if (error) throw new Error(error.message);

    const stats = {
      total_subscriptions: subscriptions?.length || 0,
      active_subscriptions: 0,
      trialing_subscriptions: 0,
      canceled_subscriptions: 0,
      mrr: 0,
      currency: 'SLE',
    };

    for (const sub of subscriptions || []) {
      switch (sub.status) {
        case 'active':
          stats.active_subscriptions++;
          // Calculate MRR contribution
          if (sub.plan) {
            const plan = sub.plan as unknown as SubscriptionPlan;
            let monthlyAmount = plan.amount;
            if (plan.interval === 'yearly') monthlyAmount = plan.amount / 12;
            if (plan.interval === 'weekly') monthlyAmount = plan.amount * 4.33;
            if (plan.interval === 'daily') monthlyAmount = plan.amount * 30;
            stats.mrr += monthlyAmount;
            stats.currency = plan.currency;
          }
          break;
        case 'trialing':
          stats.trialing_subscriptions++;
          break;
        case 'canceled':
          stats.canceled_subscriptions++;
          break;
      }
    }

    return stats;
  }
}

export const subscriptionService = new SubscriptionService();

// =====================================================
// MERCHANT SUBSCRIPTION TIERS (for POS features)
// =====================================================

export type MerchantTier = 'basic' | 'business' | 'business_plus';
export type MerchantSubscriptionStatus = 'trialing' | 'active' | 'cancelled' | 'expired' | 'past_due';

export interface MerchantSubscription {
  id: string;
  user_id: string;
  business_id?: string;
  tier: MerchantTier;
  status: MerchantSubscriptionStatus;
  trial_started_at?: string;
  trial_ends_at?: string;
  trial_days_remaining?: number;
  current_period_start?: string;
  current_period_end?: string;
  price_monthly: number;
  currency: string;
  selected_addons: string[];
  preferences: Record<string, unknown>;
  cancelled_at?: string;
  cancel_reason?: string;
  created_at: string;
  updated_at: string;
}

// Feature limits by tier
export interface TierLimits {
  products: number;
  staff: number;
  locations: number;
  categories: number;
  eventStaff: number;
  customersCredit: boolean;
  loyaltyProgram: boolean;
  advancedReports: boolean;
  kitchenDisplay: boolean;
  tableManagement: boolean;
  onlineOrdering: boolean;
  multiPayment: boolean;
  discountCodes: boolean;
  inventoryAlerts: boolean;
  exportReports: boolean;
  customReceipts: boolean;
  apiAccess: boolean;
  prioritySupport: boolean;
  barcodeScanner: boolean;
  multiCurrency: boolean;
  supplierManagement: boolean;
  purchaseOrders: boolean;
  eventManagement: boolean;
  eventAnalytics: boolean;
  smsNotifications: boolean;
  whatsappNotifications: boolean;
}

// Database tier configuration
export interface TierConfiguration {
  id: string;
  tier: MerchantTier;
  display_name: string;
  description: string;
  color: string;
  icon: string;
  price_monthly: number;
  price_yearly: number;
  currency: string;
  // Numeric limits
  max_products: number;
  max_staff: number;
  max_locations: number;
  max_categories: number;
  max_event_staff: number;
  max_customers: number;
  max_transactions_per_month: number;
  report_history_days: number;
  transaction_fee_percent: number;
  // Boolean features
  feature_customers_credit: boolean;
  feature_loyalty_program: boolean;
  feature_advanced_reports: boolean;
  feature_kitchen_display: boolean;
  feature_table_management: boolean;
  feature_online_ordering: boolean;
  feature_multi_payment: boolean;
  feature_discount_codes: boolean;
  feature_inventory_alerts: boolean;
  feature_export_reports: boolean;
  feature_custom_receipts: boolean;
  feature_api_access: boolean;
  feature_priority_support: boolean;
  feature_barcode_scanner: boolean;
  feature_multi_currency: boolean;
  feature_supplier_management: boolean;
  feature_purchase_orders: boolean;
  feature_event_management: boolean;
  feature_event_analytics: boolean;
  event_ticket_commission_percent: number;
  feature_sms_notifications: boolean;
  feature_whatsapp_notifications: boolean;
  feature_email_notifications: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Default tier configurations (fallback if database not available)
export const DEFAULT_TIER_LIMITS: Record<MerchantTier, TierLimits> = {
  basic: {
    products: 10,
    staff: 1,
    locations: 1,
    categories: 3,
    eventStaff: 0,
    customersCredit: false,
    loyaltyProgram: false,
    advancedReports: false,
    kitchenDisplay: false,
    tableManagement: false,
    onlineOrdering: false,
    multiPayment: false,
    discountCodes: false,
    inventoryAlerts: true,
    exportReports: false,
    customReceipts: false,
    apiAccess: false,
    prioritySupport: false,
    barcodeScanner: false,
    multiCurrency: false,
    supplierManagement: false,
    purchaseOrders: false,
    eventManagement: false,
    eventAnalytics: false,
    smsNotifications: false,
    whatsappNotifications: false,
  },
  business: {
    products: 50,
    staff: 3,
    locations: 1,
    categories: 10,
    eventStaff: 2,
    customersCredit: true,
    loyaltyProgram: true,
    advancedReports: true,
    kitchenDisplay: false,
    tableManagement: false,
    onlineOrdering: false,
    multiPayment: true,
    discountCodes: true,
    inventoryAlerts: true,
    exportReports: true,
    customReceipts: true,
    apiAccess: false,
    prioritySupport: false,
    barcodeScanner: true,
    multiCurrency: false,
    supplierManagement: false,
    purchaseOrders: false,
    eventManagement: true,
    eventAnalytics: false,
    smsNotifications: true,
    whatsappNotifications: false,
  },
  business_plus: {
    products: -1, // Unlimited
    staff: -1, // Unlimited
    locations: 5,
    categories: -1, // Unlimited
    eventStaff: -1, // Unlimited
    customersCredit: true,
    loyaltyProgram: true,
    advancedReports: true,
    kitchenDisplay: true,
    tableManagement: true,
    onlineOrdering: true,
    multiPayment: true,
    discountCodes: true,
    inventoryAlerts: true,
    exportReports: true,
    customReceipts: true,
    apiAccess: true,
    prioritySupport: true,
    barcodeScanner: true,
    multiCurrency: true,
    supplierManagement: true,
    purchaseOrders: true,
    eventManagement: true,
    eventAnalytics: true,
    smsNotifications: true,
    whatsappNotifications: true,
  },
};

// Mutable tier limits (will be updated from database)
export let TIER_LIMITS: Record<MerchantTier, TierLimits> = { ...DEFAULT_TIER_LIMITS };

// Tier pricing (in NLE - New Leone)
export const TIER_PRICING: Record<MerchantTier, { monthly: number; yearly: number }> = {
  basic: { monthly: 0, yearly: 0 },
  business: { monthly: 250, yearly: 2500 },
  business_plus: { monthly: 500, yearly: 5000 },
};

// Tier display info
export const TIER_INFO: Record<MerchantTier, { name: string; description: string; color: string; icon: string }> = {
  basic: {
    name: 'Basic',
    description: 'Perfect for small shops just getting started',
    color: '#6B7280',
    icon: 'Store',
  },
  business: {
    name: 'Business',
    description: 'For growing businesses with more needs',
    color: '#3B82F6',
    icon: 'Building2',
  },
  business_plus: {
    name: 'Business Plus',
    description: 'Full-featured for established businesses',
    color: '#8B5CF6',
    icon: 'Rocket',
  },
};

class MerchantTierService {
  /**
   * Get current user's merchant subscription
   */
  async getSubscription(userId: string): Promise<MerchantSubscription | null> {
    try {
      // Try the function first
      const { data, error } = await supabase
        .rpc('get_merchant_subscription_with_trial_days', { p_user_id: userId });

      if (error) {
        // If function doesn't exist, try direct query
        if (error.message.includes('does not exist')) {
          const { data: directData, error: directError } = await supabase
            .from('merchant_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .single();

          if (directError) {
            if (directError.code === 'PGRST116') return null; // Not found
            console.error('Error fetching merchant subscription:', directError);
            return null;
          }
          return directData as MerchantSubscription;
        }
        console.error('RPC error:', error);
        return null;
      }

      if (!data || data.length === 0) return null;
      return data[0] as MerchantSubscription;
    } catch (error) {
      console.error('Error fetching merchant subscription:', error);
      return null;
    }
  }

  /**
   * Start a trial subscription for a merchant
   */
  async startTrial(
    userId: string,
    businessId?: string,
    tier: MerchantTier = 'business_plus',
    trialDays: number = 7
  ): Promise<MerchantSubscription | null> {
    try {
      // Get pricing from database
      const pricing = await tierConfigService.getPricing(tier);

      const { data, error } = await supabase.rpc('start_merchant_trial', {
        p_user_id: userId,
        p_business_id: businessId,
        p_tier: tier,
        p_trial_days: trialDays,
        p_price_monthly: pricing.monthly,
      });

      if (error) {
        // Fallback to direct insert if function doesn't exist
        if (error.message.includes('does not exist')) {
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

          const { data: insertData, error: insertError } = await supabase
            .from('merchant_subscriptions')
            .upsert({
              user_id: userId,
              business_id: businessId,
              tier,
              status: trialDays > 0 ? 'trialing' : 'active',
              trial_started_at: trialDays > 0 ? new Date().toISOString() : null,
              trial_ends_at: trialDays > 0 ? trialEndsAt.toISOString() : null,
              price_monthly: pricing.monthly,
              currency: pricing.currency,
            }, {
              onConflict: 'user_id',
            })
            .select()
            .single();

          if (insertError) {
            console.error('Error creating merchant subscription:', insertError);
            return null;
          }

          // Create Business+ wallet for the user if tier is business or business_plus
          if (tier === 'business' || tier === 'business_plus') {
            try {
              await walletService.createBusinessPlusWallet(userId);
              console.log('Business+ wallet created for user:', userId);
            } catch (walletError) {
              console.error('Error creating Business+ wallet:', walletError);
              // Don't fail subscription creation if wallet creation fails
            }
          }

          return insertData as MerchantSubscription;
        }
        console.error('RPC error:', error);
        return null;
      }

      // Create Business+ wallet for successful RPC subscription creation
      if (data && (tier === 'business' || tier === 'business_plus')) {
        try {
          await walletService.createBusinessPlusWallet(userId);
          console.log('Business+ wallet created for user:', userId);
        } catch (walletError) {
          console.error('Error creating Business+ wallet:', walletError);
          // Don't fail subscription creation if wallet creation fails
        }
      }

      return data as MerchantSubscription;
    } catch (error) {
      console.error('Error starting trial:', error);
      return null;
    }
  }

  /**
   * Activate subscription after payment
   */
  async activateSubscription(userId: string, periodMonths: number = 1): Promise<MerchantSubscription | null> {
    try {
      const { data, error } = await supabase.rpc('activate_merchant_subscription', {
        p_user_id: userId,
        p_period_months: periodMonths,
      });

      if (error) {
        // Fallback
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + periodMonths);

        const { data: updateData, error: updateError } = await supabase
          .from('merchant_subscriptions')
          .update({
            status: 'active',
            current_period_start: new Date().toISOString(),
            current_period_end: periodEnd.toISOString(),
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) return null;

        // Ensure Business+ wallet exists when subscription is activated
        if (updateData && (updateData.tier === 'business' || updateData.tier === 'business_plus')) {
          try {
            await walletService.createBusinessPlusWallet(userId);
          } catch (walletError) {
            console.error('Error creating Business+ wallet:', walletError);
          }
        }

        return updateData as MerchantSubscription;
      }

      // Create Business+ wallet on successful activation
      if (data && (data.tier === 'business' || data.tier === 'business_plus')) {
        try {
          await walletService.createBusinessPlusWallet(userId);
        } catch (walletError) {
          console.error('Error creating Business+ wallet:', walletError);
        }
      }

      return data as MerchantSubscription;
    } catch (error) {
      console.error('Error activating subscription:', error);
      return null;
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(userId: string, reason?: string): Promise<MerchantSubscription | null> {
    try {
      const { data, error } = await supabase
        .from('merchant_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return null;
      return data as MerchantSubscription;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      return null;
    }
  }

  /**
   * Update subscription tier
   */
  async updateTier(userId: string, newTier: MerchantTier): Promise<MerchantSubscription | null> {
    try {
      // Get pricing from database
      const pricing = await tierConfigService.getPricing(newTier);

      const { data, error } = await supabase
        .from('merchant_subscriptions')
        .update({
          tier: newTier,
          price_monthly: pricing.monthly,
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) return null;
      return data as MerchantSubscription;
    } catch (error) {
      console.error('Error updating tier:', error);
      return null;
    }
  }

  /**
   * Get tier limits
   */
  getTierLimits(tier: MerchantTier): TierLimits {
    return TIER_LIMITS[tier];
  }

  /**
   * Check if a feature is available for a tier
   */
  hasFeature(tier: MerchantTier, feature: keyof TierLimits): boolean {
    const limits = TIER_LIMITS[tier];
    const value = limits[feature];
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    return false;
  }

  /**
   * Check if user is within limit for a numeric feature
   */
  isWithinLimit(tier: MerchantTier, feature: keyof TierLimits, currentCount: number): boolean {
    const limits = TIER_LIMITS[tier];
    const limit = limits[feature] as number;
    if (limit === -1) return true; // Unlimited
    return currentCount < limit;
  }

  /**
   * Get subscription status display info
   */
  getStatusInfo(status: MerchantSubscriptionStatus): { label: string; color: string; bgColor: string } {
    switch (status) {
      case 'trialing':
        return { label: 'Trial', color: 'text-blue-700', bgColor: 'bg-blue-100' };
      case 'active':
        return { label: 'Active', color: 'text-green-700', bgColor: 'bg-green-100' };
      case 'cancelled':
        return { label: 'Cancelled', color: 'text-gray-700', bgColor: 'bg-gray-100' };
      case 'expired':
        return { label: 'Expired', color: 'text-red-700', bgColor: 'bg-red-100' };
      case 'past_due':
        return { label: 'Past Due', color: 'text-orange-700', bgColor: 'bg-orange-100' };
      default:
        return { label: status, color: 'text-gray-700', bgColor: 'bg-gray-100' };
    }
  }

  /**
   * Check if subscription is active (trialing or active status)
   */
  isActive(subscription: MerchantSubscription | null): boolean {
    if (!subscription) return false;
    return ['trialing', 'active'].includes(subscription.status);
  }

  /**
   * Get days remaining in trial or period
   */
  getDaysRemaining(subscription: MerchantSubscription | null): number {
    if (!subscription) return 0;

    const endDate = subscription.status === 'trialing'
      ? subscription.trial_ends_at
      : subscription.current_period_end;

    if (!endDate) return 0;

    const now = new Date();
    const end = new Date(endDate);
    const diffMs = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  }

  /**
   * Create or get subscription for user (auto-creates basic if none exists)
   */
  async ensureSubscription(userId: string): Promise<MerchantSubscription> {
    let subscription = await this.getSubscription(userId);

    if (!subscription) {
      // Create a basic subscription by default
      subscription = await this.startTrial(userId, undefined, 'basic', 0);

      if (!subscription) {
        // Return a default basic subscription object if creation fails
        return {
          id: '',
          user_id: userId,
          tier: 'basic',
          status: 'active',
          price_monthly: 0,
          currency: 'NLE',
          selected_addons: [],
          preferences: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    }

    return subscription;
  }

  /**
   * Get effective tier (considering trial)
   */
  getEffectiveTier(subscription: MerchantSubscription | null): MerchantTier {
    if (!subscription) return 'basic';
    if (!this.isActive(subscription)) return 'basic';
    return subscription.tier;
  }
}

export const merchantTierService = new MerchantTierService();

// =====================================================
// TIER CONFIGURATION SERVICE (Database-backed)
// =====================================================

class TierConfigurationService {
  private cache: Map<MerchantTier, TierConfiguration> = new Map();
  private lastFetch: number = 0;
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Convert database tier configuration to TierLimits
   */
  private configToLimits(config: TierConfiguration): TierLimits {
    return {
      products: config.max_products,
      staff: config.max_staff,
      locations: config.max_locations,
      categories: config.max_categories,
      eventStaff: config.max_event_staff,
      customersCredit: config.feature_customers_credit,
      loyaltyProgram: config.feature_loyalty_program,
      advancedReports: config.feature_advanced_reports,
      kitchenDisplay: config.feature_kitchen_display,
      tableManagement: config.feature_table_management,
      onlineOrdering: config.feature_online_ordering,
      multiPayment: config.feature_multi_payment,
      discountCodes: config.feature_discount_codes,
      inventoryAlerts: config.feature_inventory_alerts,
      exportReports: config.feature_export_reports,
      customReceipts: config.feature_custom_receipts,
      apiAccess: config.feature_api_access,
      prioritySupport: config.feature_priority_support,
      barcodeScanner: config.feature_barcode_scanner,
      multiCurrency: config.feature_multi_currency,
      supplierManagement: config.feature_supplier_management,
      purchaseOrders: config.feature_purchase_orders,
      eventManagement: config.feature_event_management,
      eventAnalytics: config.feature_event_analytics,
      smsNotifications: config.feature_sms_notifications,
      whatsappNotifications: config.feature_whatsapp_notifications,
    };
  }

  /**
   * Fetch all tier configurations from database
   */
  async fetchAllConfigurations(): Promise<TierConfiguration[]> {
    try {
      const { data, error } = await supabase
        .from('tier_configurations')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');

      if (error) {
        console.error('Error fetching tier configurations:', error);
        return [];
      }

      // Update cache
      this.cache.clear();
      for (const config of data || []) {
        this.cache.set(config.tier as MerchantTier, config);
      }
      this.lastFetch = Date.now();

      // Update global TIER_LIMITS
      this.updateGlobalLimits();

      return data || [];
    } catch (error) {
      console.error('Error fetching tier configurations:', error);
      return [];
    }
  }

  /**
   * Get configuration for a specific tier
   */
  async getConfiguration(tier: MerchantTier): Promise<TierConfiguration | null> {
    // Check cache
    if (this.cache.has(tier) && Date.now() - this.lastFetch < this.cacheTTL) {
      return this.cache.get(tier) || null;
    }

    try {
      const { data, error } = await supabase
        .from('tier_configurations')
        .select('*')
        .eq('tier', tier)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Error fetching tier configuration:', error);
        return null;
      }

      if (data) {
        this.cache.set(tier, data);
      }

      return data;
    } catch (error) {
      console.error('Error fetching tier configuration:', error);
      return null;
    }
  }

  /**
   * Update a tier configuration (admin only)
   */
  async updateConfiguration(
    tier: MerchantTier,
    updates: Partial<TierConfiguration>
  ): Promise<TierConfiguration | null> {
    try {
      const { data, error } = await supabase
        .from('tier_configurations')
        .update(updates)
        .eq('tier', tier)
        .select()
        .single();

      if (error) {
        console.error('Error updating tier configuration:', error);
        throw new Error(error.message);
      }

      // Update cache
      if (data) {
        this.cache.set(tier, data);
        this.updateGlobalLimits();
      }

      return data;
    } catch (error) {
      console.error('Error updating tier configuration:', error);
      throw error;
    }
  }

  /**
   * Update global TIER_LIMITS from cache
   */
  private updateGlobalLimits(): void {
    for (const [tier, config] of this.cache.entries()) {
      TIER_LIMITS[tier] = this.configToLimits(config);
    }
  }

  /**
   * Get limits for a tier (from cache or database)
   */
  async getLimits(tier: MerchantTier): Promise<TierLimits> {
    const config = await this.getConfiguration(tier);
    if (config) {
      return this.configToLimits(config);
    }
    return DEFAULT_TIER_LIMITS[tier];
  }

  /**
   * Check if a user is within a specific limit
   */
  async checkLimit(
    userId: string,
    limitType: 'products' | 'staff' | 'locations' | 'categories' | 'eventStaff',
    currentCount: number
  ): Promise<{ allowed: boolean; current: number; limit: number; tier: MerchantTier; remaining: number }> {
    try {
      // Get user's subscription
      const subscription = await merchantTierService.getSubscription(userId);
      const tier = subscription?.tier || 'basic';

      // Get limits from cache or database
      const limits = await this.getLimits(tier);
      const limit = limits[limitType] as number;

      // -1 means unlimited
      if (limit === -1) {
        return {
          allowed: true,
          current: currentCount,
          limit: -1,
          tier,
          remaining: -1,
        };
      }

      const allowed = currentCount < limit;
      return {
        allowed,
        current: currentCount,
        limit,
        tier,
        remaining: Math.max(0, limit - currentCount),
      };
    } catch (error) {
      console.error('Error checking limit:', error);
      // Fallback to defaults
      const limits = DEFAULT_TIER_LIMITS.basic;
      const limit = limits[limitType] as number;
      return {
        allowed: currentCount < limit,
        current: currentCount,
        limit,
        tier: 'basic',
        remaining: Math.max(0, limit - currentCount),
      };
    }
  }

  /**
   * Get pricing for a tier
   */
  async getPricing(tier: MerchantTier): Promise<{ monthly: number; yearly: number; currency: string }> {
    const config = await this.getConfiguration(tier);
    if (config) {
      return {
        monthly: config.price_monthly,
        yearly: config.price_yearly,
        currency: config.currency,
      };
    }
    return { ...TIER_PRICING[tier], currency: 'NLE' };
  }

  /**
   * Initialize by loading configurations from database
   */
  async initialize(): Promise<void> {
    await this.fetchAllConfigurations();
  }

  /**
   * Clear cache and reload
   */
  async refresh(): Promise<void> {
    this.cache.clear();
    this.lastFetch = 0;
    await this.fetchAllConfigurations();
  }

  /**
   * Seed default tier configurations (admin only)
   * This should only be called if no configurations exist
   */
  async seedDefaultConfigurations(): Promise<TierConfiguration[]> {
    const defaultConfigs: Partial<TierConfiguration>[] = [
      {
        tier: 'basic',
        display_name: 'Basic',
        description: 'Free tier for small merchants getting started',
        color: '#6B7280',
        icon: 'Store',
        price_monthly: 0,
        price_yearly: 0,
        currency: 'NLE',
        max_products: 10,
        max_staff: 1,
        max_locations: 1,
        max_categories: 3,
        max_event_staff: 0,
        max_customers: -1,
        max_transactions_per_month: -1,
        report_history_days: 7,
        transaction_fee_percent: 2.5,
        feature_customers_credit: false,
        feature_loyalty_program: false,
        feature_advanced_reports: false,
        feature_kitchen_display: false,
        feature_table_management: false,
        feature_online_ordering: false,
        feature_multi_payment: false,
        feature_discount_codes: false,
        feature_inventory_alerts: true,
        feature_export_reports: false,
        feature_custom_receipts: false,
        feature_api_access: false,
        feature_priority_support: false,
        feature_barcode_scanner: false,
        feature_multi_currency: false,
        feature_supplier_management: false,
        feature_purchase_orders: false,
        feature_event_management: false,
        feature_event_analytics: false,
        event_ticket_commission_percent: 3.0,
        feature_sms_notifications: false,
        feature_whatsapp_notifications: false,
        feature_email_notifications: true,
        is_active: true,
        sort_order: 1,
      },
      {
        tier: 'business',
        display_name: 'Business',
        description: 'For growing businesses with staff and advanced features',
        color: '#F59E0B',
        icon: 'Building2',
        price_monthly: 150,
        price_yearly: 1500,
        currency: 'NLE',
        max_products: 50,
        max_staff: 3,
        max_locations: 1,
        max_categories: 10,
        max_event_staff: 2,
        max_customers: -1,
        max_transactions_per_month: -1,
        report_history_days: 30,
        transaction_fee_percent: 1.5,
        feature_customers_credit: true,
        feature_loyalty_program: true,
        feature_advanced_reports: true,
        feature_kitchen_display: false,
        feature_table_management: false,
        feature_online_ordering: false,
        feature_multi_payment: true,
        feature_discount_codes: true,
        feature_inventory_alerts: true,
        feature_export_reports: true,
        feature_custom_receipts: true,
        feature_api_access: false,
        feature_priority_support: false,
        feature_barcode_scanner: true,
        feature_multi_currency: false,
        feature_supplier_management: false,
        feature_purchase_orders: false,
        feature_event_management: true,
        feature_event_analytics: false,
        event_ticket_commission_percent: 2.0,
        feature_sms_notifications: true,
        feature_whatsapp_notifications: false,
        feature_email_notifications: true,
        is_active: true,
        sort_order: 2,
      },
      {
        tier: 'business_plus',
        display_name: 'Business++',
        description: 'Full-featured plan for established businesses',
        color: '#8B5CF6',
        icon: 'Rocket',
        price_monthly: 500,
        price_yearly: 5000,
        currency: 'NLE',
        max_products: -1,
        max_staff: -1,
        max_locations: 5,
        max_categories: -1,
        max_event_staff: -1,
        max_customers: -1,
        max_transactions_per_month: -1,
        report_history_days: -1,
        transaction_fee_percent: 1.0,
        feature_customers_credit: true,
        feature_loyalty_program: true,
        feature_advanced_reports: true,
        feature_kitchen_display: true,
        feature_table_management: true,
        feature_online_ordering: true,
        feature_multi_payment: true,
        feature_discount_codes: true,
        feature_inventory_alerts: true,
        feature_export_reports: true,
        feature_custom_receipts: true,
        feature_api_access: true,
        feature_priority_support: true,
        feature_barcode_scanner: true,
        feature_multi_currency: true,
        feature_supplier_management: true,
        feature_purchase_orders: true,
        feature_event_management: true,
        feature_event_analytics: true,
        event_ticket_commission_percent: 1.0,
        feature_sms_notifications: true,
        feature_whatsapp_notifications: true,
        feature_email_notifications: true,
        is_active: true,
        sort_order: 3,
      },
    ];

    try {
      const { data, error } = await supabase
        .from('tier_configurations')
        .upsert(defaultConfigs, { onConflict: 'tier' })
        .select();

      if (error) {
        console.error('Error seeding tier configurations:', error);
        throw new Error(error.message);
      }

      // Update cache
      await this.refresh();

      return data as TierConfiguration[];
    } catch (error) {
      console.error('Error seeding tier configurations:', error);
      throw error;
    }
  }
}

export const tierConfigService = new TierConfigurationService();
