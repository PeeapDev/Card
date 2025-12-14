/**
 * Billing Engine - Subscription Renewal Processor
 *
 * This script should be run daily via cron job:
 * 0 0 * * * npx ts-node scripts/billing-engine.ts
 *
 * Functions:
 * 1. Process due subscriptions (charge customers)
 * 2. Process expired trials (convert to paid)
 * 3. Handle failed payments (retry logic)
 * 4. Create pending invoice notifications (3 days before)
 * 5. Cancel subscriptions with too many failed payments
 */

import { createClient } from '@supabase/supabase-js';

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Configuration
const CONFIG = {
  MAX_PAYMENT_RETRIES: 3,
  RETRY_INTERVALS_DAYS: [1, 3, 7], // Retry after 1, 3, 7 days
  PENDING_NOTIFICATION_DAYS: 3, // Show "payment pending" 3 days before
  GRACE_PERIOD_DAYS: 7, // Cancel after 7 days of failed payments
};

interface ProcessingResult {
  processed: number;
  succeeded: number;
  failed: number;
  errors: string[];
}

/**
 * Main billing engine entry point
 */
async function runBillingEngine(): Promise<void> {
  console.log('========================================');
  console.log('BILLING ENGINE STARTED');
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log('========================================\n');

  try {
    // 1. Process expired trials
    console.log('1. Processing expired trials...');
    const trialResult = await processExpiredTrials();
    console.log(`   Trials processed: ${trialResult.processed}`);
    console.log(`   Converted to active: ${trialResult.succeeded}`);
    console.log('');

    // 2. Process due subscriptions
    console.log('2. Processing due subscriptions...');
    const dueResult = await processDueSubscriptions();
    console.log(`   Subscriptions processed: ${dueResult.processed}`);
    console.log(`   Payments succeeded: ${dueResult.succeeded}`);
    console.log(`   Payments failed: ${dueResult.failed}`);
    if (dueResult.errors.length > 0) {
      console.log(`   Errors:`, dueResult.errors);
    }
    console.log('');

    // 3. Retry failed payments
    console.log('3. Retrying failed payments...');
    const retryResult = await retryFailedPayments();
    console.log(`   Retries attempted: ${retryResult.processed}`);
    console.log(`   Retries succeeded: ${retryResult.succeeded}`);
    console.log(`   Retries failed: ${retryResult.failed}`);
    console.log('');

    // 4. Create pending notifications
    console.log('4. Creating pending payment notifications...');
    const notificationCount = await createPendingNotifications();
    console.log(`   Notifications created: ${notificationCount}`);
    console.log('');

    // 5. Handle grace period expirations
    console.log('5. Processing grace period expirations...');
    const canceledCount = await processGracePeriodExpirations();
    console.log(`   Subscriptions canceled: ${canceledCount}`);
    console.log('');

    console.log('========================================');
    console.log('BILLING ENGINE COMPLETED SUCCESSFULLY');
    console.log('========================================');

  } catch (error) {
    console.error('BILLING ENGINE ERROR:', error);
    process.exit(1);
  }
}

/**
 * Process expired trials - Convert trialing subscriptions to active
 */
async function processExpiredTrials(): Promise<ProcessingResult> {
  const today = new Date().toISOString().split('T')[0];
  const result: ProcessingResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // Get subscriptions where trial has ended
  const { data: expiredTrials, error } = await supabase
    .from('customer_subscriptions')
    .select(`
      *,
      plan:merchant_subscription_plans(*)
    `)
    .eq('status', 'trialing')
    .lte('trial_end', today + 'T23:59:59Z');

  if (error) {
    result.errors.push(`Failed to fetch expired trials: ${error.message}`);
    return result;
  }

  for (const subscription of expiredTrials || []) {
    result.processed++;

    try {
      // Update subscription status to active and set billing date to today
      const { error: updateError } = await supabase
        .from('customer_subscriptions')
        .update({
          status: 'active',
          next_billing_date: today,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (updateError) {
        result.errors.push(`Failed to update subscription ${subscription.id}: ${updateError.message}`);
        result.failed++;
        continue;
      }

      // Log event
      await logEvent(subscription.id, 'trial_ended', {
        converted_to: 'active',
        trial_end: subscription.trial_end,
      });

      result.succeeded++;
    } catch (err) {
      result.errors.push(`Error processing trial ${subscription.id}: ${err}`);
      result.failed++;
    }
  }

  return result;
}

/**
 * Process subscriptions due for billing today
 */
async function processDueSubscriptions(): Promise<ProcessingResult> {
  const today = new Date().toISOString().split('T')[0];
  const result: ProcessingResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // Get active subscriptions due today
  const { data: dueSubscriptions, error } = await supabase
    .from('customer_subscriptions')
    .select(`
      *,
      plan:merchant_subscription_plans(*),
      payment_method:customer_payment_methods(*)
    `)
    .eq('next_billing_date', today)
    .in('status', ['active']);

  if (error) {
    result.errors.push(`Failed to fetch due subscriptions: ${error.message}`);
    return result;
  }

  for (const subscription of dueSubscriptions || []) {
    result.processed++;

    try {
      const plan = subscription.plan;
      const paymentMethod = subscription.payment_method;

      if (!plan) {
        result.errors.push(`Subscription ${subscription.id} has no plan`);
        result.failed++;
        continue;
      }

      // Generate invoice
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;
      const nextPeriodEnd = calculateNextPeriodEnd(
        new Date(subscription.current_period_end || new Date()),
        plan.interval,
        plan.interval_count
      );

      const { data: invoice, error: invoiceError } = await supabase
        .from('subscription_invoices')
        .insert({
          subscription_id: subscription.id,
          merchant_id: subscription.merchant_id,
          invoice_number: invoiceNumber,
          amount: plan.amount,
          currency: plan.currency,
          status: 'pending',
          billing_period_start: subscription.current_period_end,
          billing_period_end: nextPeriodEnd.toISOString(),
          due_date: today,
          payment_method_id: subscription.default_payment_method_id,
        })
        .select()
        .single();

      if (invoiceError) {
        result.errors.push(`Failed to create invoice for ${subscription.id}: ${invoiceError.message}`);
        result.failed++;
        continue;
      }

      // Process payment based on method
      let paymentSuccess = false;
      let paymentReference = '';
      let paymentError = '';

      if (paymentMethod) {
        switch (paymentMethod.type) {
          case 'card':
            // TODO: Integrate with actual card processor
            // For now, simulate success
            paymentSuccess = true;
            paymentReference = `card_${Date.now()}`;
            console.log(`   Processing card payment for ${subscription.customer_email}...`);
            break;

          case 'wallet':
            // TODO: Deduct from PeeAP wallet
            paymentSuccess = true;
            paymentReference = `wallet_${Date.now()}`;
            console.log(`   Processing wallet payment for ${subscription.customer_email}...`);
            break;

          case 'mobile_money':
            // Mobile money requires customer approval - send request
            // Mark invoice as pending, not paid
            console.log(`   Sending mobile money request to ${paymentMethod.mobile_number}...`);
            // TODO: Send payment request via Monime
            paymentSuccess = false; // Will be marked as paid when customer approves
            paymentError = 'Awaiting customer approval';
            break;

          default:
            paymentError = 'Unknown payment method';
        }
      } else {
        paymentError = 'No payment method on file';
      }

      if (paymentSuccess) {
        // Mark invoice as paid
        await supabase
          .from('subscription_invoices')
          .update({
            status: 'paid',
            paid_at: new Date().toISOString(),
            payment_reference: paymentReference,
            payment_attempt_count: 1,
            last_payment_attempt: new Date().toISOString(),
          })
          .eq('id', invoice.id);

        // Update subscription dates
        await supabase
          .from('customer_subscriptions')
          .update({
            current_period_start: subscription.current_period_end,
            current_period_end: nextPeriodEnd.toISOString(),
            next_billing_date: nextPeriodEnd.toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        await logEvent(subscription.id, 'payment_succeeded', {
          invoice_id: invoice.id,
          amount: plan.amount,
          payment_reference: paymentReference,
        });

        result.succeeded++;
        console.log(`   ✓ Payment successful for ${subscription.customer_email}`);

      } else {
        // Mark invoice as failed
        await supabase
          .from('subscription_invoices')
          .update({
            status: 'failed',
            payment_attempt_count: 1,
            last_payment_attempt: new Date().toISOString(),
            last_payment_error: paymentError,
          })
          .eq('id', invoice.id);

        // Update subscription to past_due
        await supabase
          .from('customer_subscriptions')
          .update({
            status: 'past_due',
            updated_at: new Date().toISOString(),
          })
          .eq('id', subscription.id);

        await logEvent(subscription.id, 'payment_failed', {
          invoice_id: invoice.id,
          error: paymentError,
          attempt: 1,
        });

        result.failed++;
        console.log(`   ✗ Payment failed for ${subscription.customer_email}: ${paymentError}`);
      }

    } catch (err) {
      result.errors.push(`Error processing subscription ${subscription.id}: ${err}`);
      result.failed++;
    }
  }

  return result;
}

/**
 * Retry failed payments that are due for retry
 */
async function retryFailedPayments(): Promise<ProcessingResult> {
  const result: ProcessingResult = { processed: 0, succeeded: 0, failed: 0, errors: [] };

  // Get failed invoices that haven't exceeded max retries
  const { data: failedInvoices, error } = await supabase
    .from('subscription_invoices')
    .select(`
      *,
      subscription:customer_subscriptions(
        *,
        plan:merchant_subscription_plans(*),
        payment_method:customer_payment_methods(*)
      )
    `)
    .eq('status', 'failed')
    .lt('payment_attempt_count', CONFIG.MAX_PAYMENT_RETRIES);

  if (error) {
    result.errors.push(`Failed to fetch failed invoices: ${error.message}`);
    return result;
  }

  for (const invoice of failedInvoices || []) {
    const attemptNumber = invoice.payment_attempt_count;
    const lastAttempt = new Date(invoice.last_payment_attempt || invoice.created_at);
    const retryDays = CONFIG.RETRY_INTERVALS_DAYS[attemptNumber - 1] || CONFIG.RETRY_INTERVALS_DAYS[CONFIG.RETRY_INTERVALS_DAYS.length - 1];
    const nextRetryDate = new Date(lastAttempt);
    nextRetryDate.setDate(nextRetryDate.getDate() + retryDays);

    // Skip if not time for retry yet
    if (new Date() < nextRetryDate) {
      continue;
    }

    result.processed++;

    const subscription = invoice.subscription;
    const paymentMethod = subscription?.payment_method;

    if (!paymentMethod) {
      result.failed++;
      continue;
    }

    console.log(`   Retrying payment for invoice ${invoice.invoice_number} (attempt ${attemptNumber + 1})...`);

    let paymentSuccess = false;
    let paymentReference = '';

    // Retry based on payment method
    switch (paymentMethod.type) {
      case 'card':
      case 'wallet':
        // TODO: Actual payment processing
        paymentSuccess = Math.random() > 0.3; // 70% success rate for demo
        paymentReference = `retry_${Date.now()}`;
        break;
      case 'mobile_money':
        // Send another request
        paymentSuccess = false;
        break;
    }

    if (paymentSuccess) {
      await supabase
        .from('subscription_invoices')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          payment_reference: paymentReference,
          payment_attempt_count: attemptNumber + 1,
          last_payment_attempt: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      // Reactivate subscription
      await supabase
        .from('customer_subscriptions')
        .update({
          status: 'active',
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      await logEvent(subscription.id, 'payment_succeeded', {
        invoice_id: invoice.id,
        retry_attempt: attemptNumber + 1,
      });

      result.succeeded++;
      console.log(`   ✓ Retry successful`);

    } else {
      await supabase
        .from('subscription_invoices')
        .update({
          payment_attempt_count: attemptNumber + 1,
          last_payment_attempt: new Date().toISOString(),
        })
        .eq('id', invoice.id);

      await logEvent(subscription.id, 'payment_retry_failed', {
        invoice_id: invoice.id,
        attempt: attemptNumber + 1,
      });

      result.failed++;
      console.log(`   ✗ Retry failed (attempt ${attemptNumber + 1}/${CONFIG.MAX_PAYMENT_RETRIES})`);
    }
  }

  return result;
}

/**
 * Create pending payment notifications for upcoming renewals
 */
async function createPendingNotifications(): Promise<number> {
  const notificationDate = new Date();
  notificationDate.setDate(notificationDate.getDate() + CONFIG.PENDING_NOTIFICATION_DAYS);
  const targetDate = notificationDate.toISOString().split('T')[0];

  // Get subscriptions billing in 3 days
  const { data: upcomingSubscriptions, error } = await supabase
    .from('customer_subscriptions')
    .select(`
      *,
      plan:merchant_subscription_plans(*)
    `)
    .eq('next_billing_date', targetDate)
    .eq('status', 'active');

  if (error) {
    console.error('Failed to fetch upcoming subscriptions:', error);
    return 0;
  }

  let count = 0;

  for (const subscription of upcomingSubscriptions || []) {
    // Check if notification already exists
    const { data: existingInvoice } = await supabase
      .from('subscription_invoices')
      .select('id')
      .eq('subscription_id', subscription.id)
      .eq('status', 'draft')
      .single();

    if (existingInvoice) {
      continue; // Already has a pending notification
    }

    // Create draft invoice for display purposes
    await supabase
      .from('subscription_invoices')
      .insert({
        subscription_id: subscription.id,
        merchant_id: subscription.merchant_id,
        amount: subscription.plan?.amount || 0,
        currency: subscription.plan?.currency || 'SLE',
        status: 'draft',
        due_date: targetDate,
        show_pending_from: new Date().toISOString().split('T')[0],
      });

    // TODO: Send notification email/SMS to customer
    // await sendNotification(subscription.customer_email, {
    //   type: 'upcoming_payment',
    //   amount: subscription.plan.amount,
    //   date: targetDate,
    // });

    count++;
  }

  return count;
}

/**
 * Cancel subscriptions that have been past_due for too long
 */
async function processGracePeriodExpirations(): Promise<number> {
  const gracePeriodDate = new Date();
  gracePeriodDate.setDate(gracePeriodDate.getDate() - CONFIG.GRACE_PERIOD_DAYS);

  // Get past_due subscriptions that exceeded grace period
  const { data: expiredSubscriptions, error } = await supabase
    .from('customer_subscriptions')
    .select('*')
    .eq('status', 'past_due')
    .lt('updated_at', gracePeriodDate.toISOString());

  if (error) {
    console.error('Failed to fetch expired subscriptions:', error);
    return 0;
  }

  let count = 0;

  for (const subscription of expiredSubscriptions || []) {
    await supabase
      .from('customer_subscriptions')
      .update({
        status: 'canceled',
        canceled_at: new Date().toISOString(),
        cancel_reason: 'Payment failed - grace period expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

    await logEvent(subscription.id, 'canceled', {
      reason: 'grace_period_expired',
      days_past_due: CONFIG.GRACE_PERIOD_DAYS,
    });

    // TODO: Send cancellation notification
    // await sendNotification(subscription.customer_email, {
    //   type: 'subscription_canceled',
    //   reason: 'payment_failed',
    // });

    count++;
    console.log(`   Canceled subscription for ${subscription.customer_email} (grace period expired)`);
  }

  return count;
}

/**
 * Helper: Calculate next billing period end date
 */
function calculateNextPeriodEnd(currentEnd: Date, interval: string, count: number): Date {
  const end = new Date(currentEnd);

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
 * Helper: Log subscription event
 */
async function logEvent(subscriptionId: string, eventType: string, data: Record<string, unknown>): Promise<void> {
  await supabase
    .from('subscription_events')
    .insert({
      subscription_id: subscriptionId,
      event_type: eventType,
      data,
    });
}

// Run the billing engine
runBillingEngine();
