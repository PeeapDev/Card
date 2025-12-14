/**
 * Reports Service - Analytics and reporting operations
 */

import { createClient } from '@supabase/supabase-js';
import type {
  TimePeriod,
  DateRange,
  ReportSummary,
  RevenueData,
  TransactionSummary,
  InvoiceReport,
  SubscriptionReport,
  FuelReport,
  CustomerReport,
  ScheduledReport,
  CreateScheduledReportDto,
} from './types';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =============================================
// DATE UTILITIES
// =============================================

export function getDateRange(period: TimePeriod, customRange?: DateRange): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'today':
      return {
        from: today.toISOString(),
        to: new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      };
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
      return {
        from: yesterday.toISOString(),
        to: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000 - 1).toISOString(),
      };
    case 'this_week':
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      return {
        from: startOfWeek.toISOString(),
        to: now.toISOString(),
      };
    case 'last_week':
      const lastWeekStart = new Date(today);
      lastWeekStart.setDate(today.getDate() - today.getDay() - 7);
      const lastWeekEnd = new Date(lastWeekStart);
      lastWeekEnd.setDate(lastWeekStart.getDate() + 6);
      return {
        from: lastWeekStart.toISOString(),
        to: lastWeekEnd.toISOString(),
      };
    case 'this_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
        to: now.toISOString(),
      };
    case 'last_month':
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
        to: new Date(now.getFullYear(), now.getMonth(), 0).toISOString(),
      };
    case 'this_quarter':
      const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      return {
        from: quarterStart.toISOString(),
        to: now.toISOString(),
      };
    case 'last_quarter':
      const lastQuarterEnd = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 0);
      const lastQuarterStart = new Date(lastQuarterEnd.getFullYear(), lastQuarterEnd.getMonth() - 2, 1);
      return {
        from: lastQuarterStart.toISOString(),
        to: lastQuarterEnd.toISOString(),
      };
    case 'this_year':
      return {
        from: new Date(now.getFullYear(), 0, 1).toISOString(),
        to: now.toISOString(),
      };
    case 'custom':
      if (customRange) return customRange;
      return { from: today.toISOString(), to: now.toISOString() };
    default:
      return { from: today.toISOString(), to: now.toISOString() };
  }
}

// =============================================
// OVERVIEW REPORTS
// =============================================

export async function getReportSummary(businessId: string, dateRange: DateRange): Promise<ReportSummary> {
  // Get transactions for revenue
  const { data: inflows } = await supabase
    .from('transactions')
    .select('amount')
    .eq('business_id', businessId)
    .eq('type', 'inflow')
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to);

  const { data: outflows } = await supabase
    .from('transactions')
    .select('amount')
    .eq('business_id', businessId)
    .eq('type', 'outflow')
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to);

  const totalRevenue = (inflows || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalExpenses = (outflows || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  const transactionCount = (inflows?.length || 0) + (outflows?.length || 0);

  // Calculate previous period for growth rate
  const periodDuration = new Date(dateRange.to).getTime() - new Date(dateRange.from).getTime();
  const prevPeriodEnd = new Date(dateRange.from);
  const prevPeriodStart = new Date(prevPeriodEnd.getTime() - periodDuration);

  const { data: prevInflows } = await supabase
    .from('transactions')
    .select('amount')
    .eq('business_id', businessId)
    .eq('type', 'inflow')
    .gte('created_at', prevPeriodStart.toISOString())
    .lte('created_at', prevPeriodEnd.toISOString());

  const prevRevenue = (prevInflows || []).reduce((sum, t) => sum + (t.amount || 0), 0);
  const growthRate = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

  return {
    total_revenue: totalRevenue,
    total_expenses: totalExpenses,
    net_income: totalRevenue - totalExpenses,
    transaction_count: transactionCount,
    average_transaction: transactionCount > 0 ? totalRevenue / transactionCount : 0,
    growth_rate: Math.round(growthRate * 100) / 100,
    currency: 'NLE',
  };
}

export async function getRevenueByPeriod(
  businessId: string,
  dateRange: DateRange,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<RevenueData[]> {
  // Get invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('total_amount, amount_paid, issue_date')
    .eq('business_id', businessId)
    .gte('issue_date', dateRange.from)
    .lte('issue_date', dateRange.to);

  // Get subscriptions
  const { data: subscriptions } = await supabase
    .from('subscription_payments')
    .select('amount, paid_at')
    .eq('status', 'completed')
    .gte('paid_at', dateRange.from)
    .lte('paid_at', dateRange.to);

  // Group by period
  const revenueMap: Map<string, RevenueData> = new Map();

  (invoices || []).forEach(inv => {
    const periodKey = getPeriodKey(inv.issue_date, groupBy);
    const existing = revenueMap.get(periodKey) || {
      period: periodKey,
      revenue: 0,
      invoices: 0,
      subscriptions: 0,
      other: 0,
    };
    existing.invoices += inv.amount_paid || 0;
    existing.revenue += inv.amount_paid || 0;
    revenueMap.set(periodKey, existing);
  });

  (subscriptions || []).forEach(sub => {
    const periodKey = getPeriodKey(sub.paid_at, groupBy);
    const existing = revenueMap.get(periodKey) || {
      period: periodKey,
      revenue: 0,
      invoices: 0,
      subscriptions: 0,
      other: 0,
    };
    existing.subscriptions += sub.amount || 0;
    existing.revenue += sub.amount || 0;
    revenueMap.set(periodKey, existing);
  });

  return Array.from(revenueMap.values()).sort((a, b) =>
    a.period.localeCompare(b.period)
  );
}

function getPeriodKey(dateStr: string, groupBy: 'day' | 'week' | 'month'): string {
  const date = new Date(dateStr);
  switch (groupBy) {
    case 'day':
      return date.toISOString().split('T')[0];
    case 'week':
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      return `W${weekStart.toISOString().split('T')[0]}`;
    case 'month':
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }
}

// =============================================
// INVOICE REPORTS
// =============================================

export async function getInvoiceReport(businessId: string, dateRange: DateRange): Promise<InvoiceReport> {
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .gte('issue_date', dateRange.from)
    .lte('issue_date', dateRange.to);

  let totalInvoiced = 0;
  let totalCollected = 0;
  let outstanding = 0;
  let overdue = 0;
  const byStatus: Record<string, { amount: number; count: number }> = {};
  const byCustomer: Record<string, { amount: number; count: number }> = {};
  const aging = { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 };

  const now = new Date();

  (invoices || []).forEach(inv => {
    totalInvoiced += inv.total_amount || 0;
    totalCollected += inv.amount_paid || 0;
    outstanding += inv.balance_due || 0;

    // By status
    byStatus[inv.status] = byStatus[inv.status] || { amount: 0, count: 0 };
    byStatus[inv.status].amount += inv.total_amount || 0;
    byStatus[inv.status].count++;

    // By customer
    byCustomer[inv.customer_name] = byCustomer[inv.customer_name] || { amount: 0, count: 0 };
    byCustomer[inv.customer_name].amount += inv.total_amount || 0;
    byCustomer[inv.customer_name].count++;

    // Aging
    if (inv.balance_due > 0) {
      const dueDate = new Date(inv.due_date);
      const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysOverdue <= 0) {
        aging.current += inv.balance_due;
      } else if (daysOverdue <= 30) {
        aging['1_30'] += inv.balance_due;
        overdue += inv.balance_due;
      } else if (daysOverdue <= 60) {
        aging['31_60'] += inv.balance_due;
        overdue += inv.balance_due;
      } else if (daysOverdue <= 90) {
        aging['61_90'] += inv.balance_due;
        overdue += inv.balance_due;
      } else {
        aging['90_plus'] += inv.balance_due;
        overdue += inv.balance_due;
      }
    }
  });

  return {
    total_invoiced: totalInvoiced,
    total_collected: totalCollected,
    outstanding,
    overdue,
    by_status: Object.entries(byStatus)
      .map(([status, data]) => ({ status, ...data }))
      .sort((a, b) => b.amount - a.amount),
    by_customer: Object.entries(byCustomer)
      .map(([customer, data]) => ({ customer, ...data }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10),
    aging,
  };
}

// =============================================
// SUBSCRIPTION REPORTS
// =============================================

export async function getSubscriptionReport(businessId: string, dateRange: DateRange): Promise<SubscriptionReport> {
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`*, plan:subscription_plans(name)`)
    .eq('business_id', businessId);

  const { data: newSubs } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('business_id', businessId)
    .gte('start_date', dateRange.from)
    .lte('start_date', dateRange.to);

  const { data: churned } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('business_id', businessId)
    .eq('status', 'cancelled')
    .gte('cancelled_at', dateRange.from)
    .lte('cancelled_at', dateRange.to);

  let mrr = 0;
  const byPlan: Record<string, { subscribers: number; mrr: number }> = {};

  (subscriptions || []).filter(s => s.status === 'active').forEach(sub => {
    let monthlyAmount = sub.amount;
    switch (sub.billing_interval) {
      case 'daily': monthlyAmount = sub.amount * 30; break;
      case 'weekly': monthlyAmount = sub.amount * 4.33; break;
      case 'quarterly': monthlyAmount = sub.amount / 3; break;
      case 'yearly': monthlyAmount = sub.amount / 12; break;
    }
    mrr += monthlyAmount / (sub.billing_interval_count || 1);

    const planName = sub.plan?.name || 'Custom';
    byPlan[planName] = byPlan[planName] || { subscribers: 0, mrr: 0 };
    byPlan[planName].subscribers++;
    byPlan[planName].mrr += monthlyAmount;
  });

  const totalActive = (subscriptions || []).filter(s => s.status === 'active').length;
  const churnRate = totalActive > 0 ? ((churned?.length || 0) / totalActive) * 100 : 0;

  return {
    mrr,
    arr: mrr * 12,
    total_subscribers: totalActive,
    new_subscribers: newSubs?.length || 0,
    churned_subscribers: churned?.length || 0,
    churn_rate: Math.round(churnRate * 100) / 100,
    by_plan: Object.entries(byPlan)
      .map(([plan, data]) => ({ plan, ...data }))
      .sort((a, b) => b.mrr - a.mrr),
    trend: [], // Would need historical data
  };
}

// =============================================
// FUEL REPORTS
// =============================================

export async function getFuelReport(businessId: string, dateRange: DateRange): Promise<FuelReport> {
  const { data: sales } = await supabase
    .from('fuel_sales')
    .select(`
      *,
      station:fuel_stations(name),
      fuel_type:fuel_types(name)
    `)
    .eq('station.business_id', businessId)
    .gte('created_at', dateRange.from)
    .lte('created_at', dateRange.to);

  let totalSales = 0;
  let totalLiters = 0;
  let fleetSales = 0;
  let prepaidSales = 0;
  let cashSales = 0;
  const byFuelType: Record<string, { liters: number; amount: number }> = {};
  const byStation: Record<string, { liters: number; amount: number }> = {};
  const byPaymentMethod: Record<string, { amount: number; count: number }> = {};

  (sales || []).forEach(sale => {
    totalSales += sale.total_amount || 0;
    totalLiters += sale.quantity_liters || 0;

    // By customer type
    if (sale.customer_type === 'fleet') fleetSales += sale.total_amount || 0;
    else if (sale.customer_type === 'prepaid') prepaidSales += sale.total_amount || 0;

    // By fuel type
    const fuelName = sale.fuel_type?.name || 'Unknown';
    byFuelType[fuelName] = byFuelType[fuelName] || { liters: 0, amount: 0 };
    byFuelType[fuelName].liters += sale.quantity_liters || 0;
    byFuelType[fuelName].amount += sale.total_amount || 0;

    // By station
    const stationName = sale.station?.name || 'Unknown';
    byStation[stationName] = byStation[stationName] || { liters: 0, amount: 0 };
    byStation[stationName].liters += sale.quantity_liters || 0;
    byStation[stationName].amount += sale.total_amount || 0;

    // By payment method
    const method = sale.payment_method || 'cash';
    byPaymentMethod[method] = byPaymentMethod[method] || { amount: 0, count: 0 };
    byPaymentMethod[method].amount += sale.total_amount || 0;
    byPaymentMethod[method].count++;

    if (method === 'cash') cashSales += sale.total_amount || 0;
  });

  return {
    total_sales: totalSales,
    total_liters: totalLiters,
    average_price: totalLiters > 0 ? totalSales / totalLiters : 0,
    by_fuel_type: Object.entries(byFuelType)
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.amount - a.amount),
    by_station: Object.entries(byStation)
      .map(([station, data]) => ({ station, ...data }))
      .sort((a, b) => b.amount - a.amount),
    by_payment_method: Object.entries(byPaymentMethod)
      .map(([method, data]) => ({ method, ...data }))
      .sort((a, b) => b.amount - a.amount),
    fleet_sales: fleetSales,
    prepaid_sales: prepaidSales,
    cash_sales: cashSales,
  };
}

// =============================================
// SCHEDULED REPORTS
// =============================================

export async function getScheduledReports(businessId: string): Promise<ScheduledReport[]> {
  const { data, error } = await supabase
    .from('scheduled_reports')
    .select('*')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createScheduledReport(
  businessId: string,
  dto: CreateScheduledReportDto
): Promise<ScheduledReport> {
  const nextSendAt = calculateNextSendDate(dto.frequency);

  const { data, error } = await supabase
    .from('scheduled_reports')
    .insert({
      business_id: businessId,
      name: dto.name,
      report_type: dto.report_type,
      frequency: dto.frequency,
      recipients: dto.recipients,
      format: dto.format || 'pdf',
      filters: dto.filters,
      next_send_at: nextSendAt.toISOString(),
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteScheduledReport(reportId: string): Promise<void> {
  const { error } = await supabase
    .from('scheduled_reports')
    .delete()
    .eq('id', reportId);

  if (error) throw error;
}

function calculateNextSendDate(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    case 'weekly':
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7 - now.getDay() + 1); // Next Monday
      return nextWeek;
    case 'monthly':
      return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    case 'quarterly':
      const quarterMonth = Math.floor(now.getMonth() / 3) * 3 + 3;
      return new Date(now.getFullYear(), quarterMonth, 1);
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
}

// =============================================
// HELPERS
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
        // Use businessId if available, otherwise use user ID as business ID
        const id = user.businessId || user.id;
        if (id) {
          localStorage.setItem('plusBusinessId', id);
          return id;
        }
      } catch {}
    }
    console.warn('No business ID found in localStorage. Reports may not work correctly.');
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

// Default empty summary
const emptySummary: ReportSummary = {
  total_revenue: 0,
  total_expenses: 0,
  net_income: 0,
  transaction_count: 0,
  average_transaction: 0,
  growth_rate: 0,
  currency: 'NLE',
};

// =============================================
// FACADE EXPORT
// =============================================

export const reportsService = {
  // Date utilities
  getDateRange,

  // Overview
  getSummary: (period: TimePeriod, customRange?: DateRange) =>
    withBusinessId((bid) => getReportSummary(bid, getDateRange(period, customRange)), emptySummary),
  getRevenueTrend: (period: TimePeriod, groupBy?: 'day' | 'week' | 'month', customRange?: DateRange) =>
    withBusinessId((bid) => getRevenueByPeriod(bid, getDateRange(period, customRange), groupBy), []),

  // Specific reports
  getInvoiceReport: (period: TimePeriod, customRange?: DateRange) =>
    withBusinessId((bid) => getInvoiceReport(bid, getDateRange(period, customRange)), {
      total_invoiced: 0,
      total_collected: 0,
      outstanding: 0,
      overdue: 0,
      by_status: [],
      by_customer: [],
      aging: { current: 0, '1_30': 0, '31_60': 0, '61_90': 0, '90_plus': 0 },
    }),
  getSubscriptionReport: (period: TimePeriod, customRange?: DateRange) =>
    withBusinessId((bid) => getSubscriptionReport(bid, getDateRange(period, customRange)), {
      mrr: 0,
      arr: 0,
      total_subscribers: 0,
      new_subscribers: 0,
      churned_subscribers: 0,
      churn_rate: 0,
      by_plan: [],
      trend: [],
    }),
  getFuelReport: (period: TimePeriod, customRange?: DateRange) =>
    withBusinessId((bid) => getFuelReport(bid, getDateRange(period, customRange)), {
      total_sales: 0,
      total_liters: 0,
      average_price: 0,
      by_fuel_type: [],
      by_station: [],
      by_payment_method: [],
      fleet_sales: 0,
      prepaid_sales: 0,
      cash_sales: 0,
    }),

  // Scheduled reports
  getScheduledReports: () => withBusinessId(getScheduledReports, []),
  createScheduledReport: (dto: CreateScheduledReportDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to create scheduled report');
    return createScheduledReport(businessId, dto);
  },
  deleteScheduledReport,
};
