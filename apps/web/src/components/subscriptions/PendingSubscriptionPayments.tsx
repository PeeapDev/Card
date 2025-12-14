/**
 * Pending Subscription Payments Component
 *
 * Shows upcoming subscription payments (3 days before due)
 * Displays in transaction lists and dashboards
 */

import { useState, useEffect } from 'react';
import { Clock, CreditCard, AlertCircle, ChevronRight, Repeat } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface PendingPayment {
  id: string;
  subscription_id: string;
  amount: number;
  currency: string;
  due_date: string;
  plan_name?: string;
  merchant_name?: string;
  payment_method_type?: string;
  payment_method_last_four?: string;
}

const CURRENCIES: Record<string, string> = {
  SLE: 'Le',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

export function PendingSubscriptionPayments() {
  const { user } = useAuth();
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.email) {
      loadPendingPayments();
    }
  }, [user?.email]);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];

      // Get invoices that are pending or draft with show_pending_from <= today
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select(`
          id,
          subscription_id,
          amount,
          currency,
          due_date,
          subscription:customer_subscriptions(
            customer_email,
            plan:merchant_subscription_plans(name),
            payment_method:customer_payment_methods(type, card_last_four)
          )
        `)
        .in('status', ['draft', 'pending'])
        .lte('show_pending_from', today)
        .order('due_date', { ascending: true });

      if (error) {
        console.error('Failed to load pending payments:', error);
        return;
      }

      // Filter by user's email and transform data
      const userPayments = (data || [])
        .filter(invoice => {
          const sub = invoice.subscription as any;
          return sub?.customer_email === user?.email;
        })
        .map(invoice => {
          const sub = invoice.subscription as any;
          return {
            id: invoice.id,
            subscription_id: invoice.subscription_id,
            amount: invoice.amount,
            currency: invoice.currency,
            due_date: invoice.due_date,
            plan_name: sub?.plan?.name,
            payment_method_type: sub?.payment_method?.type,
            payment_method_last_four: sub?.payment_method?.card_last_four,
          };
        });

      setPendingPayments(userPayments);
    } catch (err) {
      console.error('Error loading pending payments:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    const symbol = CURRENCIES[currency] || currency;
    return `${symbol} ${amount.toLocaleString()}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const diffTime = date.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays < 7) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getPaymentMethodLabel = (type?: string, lastFour?: string) => {
    if (!type) return 'Payment method';

    switch (type) {
      case 'card':
        return lastFour ? `Card •••• ${lastFour}` : 'Card';
      case 'wallet':
        return 'PeeAP Wallet';
      case 'mobile_money':
        return 'Mobile Money';
      default:
        return type;
    }
  };

  if (loading || pendingPayments.length === 0) {
    return null;
  }

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-100/50">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Upcoming Subscription Payments</h3>
          </div>
        </div>

        <div className="divide-y divide-yellow-200">
          {pendingPayments.map((payment) => (
            <div
              key={payment.id}
              className="p-4 hover:bg-yellow-50/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Repeat className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {payment.plan_name || 'Subscription'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {getPaymentMethodLabel(payment.payment_method_type, payment.payment_method_last_four)}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-semibold text-gray-900">
                    {formatAmount(payment.amount, payment.currency)}
                  </p>
                  <p className="text-sm text-yellow-700 font-medium">
                    Due {formatDate(payment.due_date)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This payment will be automatically processed on the due date
                </p>
                <a
                  href="/subscriptions"
                  className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  Manage <ChevronRight className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact version for sidebars/widgets
 */
export function PendingSubscriptionPaymentsCompact() {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [currency, setCurrency] = useState('SLE');

  useEffect(() => {
    if (user?.email) {
      loadSummary();
    }
  }, [user?.email]);

  const loadSummary = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('subscription_invoices')
      .select(`
        amount,
        currency,
        subscription:customer_subscriptions(customer_email)
      `)
      .in('status', ['draft', 'pending'])
      .lte('show_pending_from', today);

    if (!data) return;

    const userPayments = data.filter(inv => {
      const sub = inv.subscription as any;
      return sub?.customer_email === user?.email;
    });

    setCount(userPayments.length);
    setTotalAmount(userPayments.reduce((sum, p) => sum + p.amount, 0));
    if (userPayments.length > 0) {
      setCurrency(userPayments[0].currency);
    }
  };

  if (count === 0) return null;

  const symbol = CURRENCIES[currency] || currency;

  return (
    <a
      href="/subscriptions"
      className="block p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-yellow-100 rounded-lg">
          <Clock className="w-5 h-5 text-yellow-600" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-yellow-800">
            {count} Pending Payment{count > 1 ? 's' : ''}
          </p>
          <p className="text-sm text-yellow-600">
            {symbol} {totalAmount.toLocaleString()} due soon
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-yellow-600" />
      </div>
    </a>
  );
}
