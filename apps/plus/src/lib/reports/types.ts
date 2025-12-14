/**
 * Reports/Analytics Module - TypeScript Type Definitions
 */

// =============================================
// TIME PERIODS
// =============================================

export type TimePeriod = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_year' | 'custom';

export interface DateRange {
  from: string;
  to: string;
}

// =============================================
// REPORT TYPES
// =============================================

export type ReportType =
  | 'revenue_overview'
  | 'transactions'
  | 'invoices'
  | 'subscriptions'
  | 'expenses'
  | 'cash_flow'
  | 'fuel_sales'
  | 'customer_analysis'
  | 'team_performance';

// =============================================
// CORE ENTITIES
// =============================================

export interface ReportSummary {
  total_revenue: number;
  total_expenses: number;
  net_income: number;
  transaction_count: number;
  average_transaction: number;
  growth_rate: number;
  currency: string;
}

export interface RevenueData {
  period: string;
  revenue: number;
  invoices: number;
  subscriptions: number;
  other: number;
}

export interface ExpenseData {
  period: string;
  amount: number;
  category: string;
}

export interface TransactionSummary {
  total_inflow: number;
  total_outflow: number;
  net_flow: number;
  by_method: { method: string; amount: number; count: number }[];
  by_status: { status: string; amount: number; count: number }[];
  recent: Transaction[];
}

export interface Transaction {
  id: string;
  date: string;
  type: 'inflow' | 'outflow';
  amount: number;
  currency: string;
  description: string;
  method: string;
  status: string;
  reference?: string;
}

export interface InvoiceReport {
  total_invoiced: number;
  total_collected: number;
  outstanding: number;
  overdue: number;
  by_status: { status: string; amount: number; count: number }[];
  by_customer: { customer: string; amount: number; count: number }[];
  aging: {
    current: number;
    '1_30': number;
    '31_60': number;
    '61_90': number;
    '90_plus': number;
  };
}

export interface SubscriptionReport {
  mrr: number;
  arr: number;
  total_subscribers: number;
  new_subscribers: number;
  churned_subscribers: number;
  churn_rate: number;
  by_plan: { plan: string; subscribers: number; mrr: number }[];
  trend: { period: string; mrr: number; subscribers: number }[];
}

export interface FuelReport {
  total_sales: number;
  total_liters: number;
  average_price: number;
  by_fuel_type: { type: string; liters: number; amount: number }[];
  by_station: { station: string; liters: number; amount: number }[];
  by_payment_method: { method: string; amount: number; count: number }[];
  fleet_sales: number;
  prepaid_sales: number;
  cash_sales: number;
}

export interface CustomerReport {
  total_customers: number;
  new_customers: number;
  active_customers: number;
  top_customers: { name: string; total_spend: number; transactions: number }[];
  by_segment: { segment: string; count: number; revenue: number }[];
  retention_rate: number;
}

// =============================================
// DASHBOARD WIDGETS
// =============================================

export interface DashboardWidget {
  id: string;
  type: 'metric' | 'chart' | 'table' | 'list';
  title: string;
  size: 'small' | 'medium' | 'large' | 'full';
  data: unknown;
  config?: Record<string, unknown>;
}

export interface MetricWidget {
  value: number | string;
  label: string;
  change?: number;
  changeLabel?: string;
  format?: 'currency' | 'number' | 'percent';
  icon?: string;
  color?: string;
}

export interface ChartWidget {
  chartType: 'line' | 'bar' | 'pie' | 'area' | 'donut';
  data: { label: string; value: number; [key: string]: unknown }[];
  xAxis?: string;
  yAxis?: string;
  colors?: string[];
}

// =============================================
// EXPORT OPTIONS
// =============================================

export type ExportFormat = 'csv' | 'pdf' | 'xlsx' | 'json';

export interface ExportOptions {
  format: ExportFormat;
  reportType: ReportType;
  dateRange: DateRange;
  includeCharts?: boolean;
  groupBy?: string;
  filters?: Record<string, unknown>;
}

// =============================================
// SCHEDULED REPORTS
// =============================================

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly';

export interface ScheduledReport {
  id: string;
  business_id: string;
  name: string;
  report_type: ReportType;
  frequency: ScheduleFrequency;
  recipients: string[];
  format: ExportFormat;
  filters?: Record<string, unknown>;
  last_sent_at?: string;
  next_send_at: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateScheduledReportDto {
  name: string;
  report_type: ReportType;
  frequency: ScheduleFrequency;
  recipients: string[];
  format?: ExportFormat;
  filters?: Record<string, unknown>;
}
