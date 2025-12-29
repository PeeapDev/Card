/**
 * POS Reports Page - Comprehensive Analytics Dashboard
 * Features: Sales analytics, charts, comparisons, insights
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { supabaseAdmin } from '@/lib/supabase';
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  Percent,
  RefreshCw,
  FileText,
  Printer,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Zap,
  CreditCard,
  Banknote,
  Smartphone,
  Star,
  Award,
  Activity,
  ShoppingCart,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
} from 'recharts';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  if (amount >= 1000000) {
    return `NLe ${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `NLe ${(amount / 1000).toFixed(1)}K`;
  }
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

const formatFullCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Colors for charts
const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

interface ReportData {
  // Summary stats
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  totalItems: number;
  avgTicket: number;
  profitMargin: number;
  totalCustomers: number;
  totalRefunds: number;
  refundAmount: number;
  // Cash vs Digital breakdown
  cashTotal: number;       // Physical cash collected
  digitalTotal: number;    // Digital payments (QR, mobile money, card, etc.)
  // Comparison with previous period
  salesChange: number;
  revenueChange: number;
  profitChange: number;
  ticketChange: number;
  // Hourly data
  hourlyData: { hour: string; sales: number; revenue: number }[];
  // Daily data
  dailyData: { date: string; sales: number; revenue: number; profit: number }[];
  // Category data
  categoryData: { name: string; revenue: number; quantity: number; profit: number }[];
  // Payment data
  paymentData: { name: string; value: number; count: number; method?: string }[];
  // Top products
  topProducts: { name: string; quantity: number; revenue: number; profit: number }[];
  // Staff performance
  staffData: { name: string; sales: number; revenue: number }[];
  // Peak hours
  peakHour: string;
  peakDay: string;
  // Customer metrics
  newCustomers: number;
  returningCustomers: number;
}

export function POSReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('today');
  const [report, setReport] = useState<ReportData | null>(null);
  const [activeChart, setActiveChart] = useState<'revenue' | 'sales' | 'profit'>('revenue');

  useEffect(() => {
    if (merchantId) {
      loadReport();
    }
  }, [merchantId, period]);

  const getDateRange = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    switch (period) {
      case 'today':
        return {
          start: today.toISOString(),
          end: now.toISOString(),
          prevStart: new Date(today.getTime() - 24 * 60 * 60 * 1000).toISOString(),
          prevEnd: today.toISOString(),
        };
      case 'week':
        const weekStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
        return {
          start: weekStart.toISOString(),
          end: now.toISOString(),
          prevStart: new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          prevEnd: weekStart.toISOString(),
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        return {
          start: monthStart.toISOString(),
          end: now.toISOString(),
          prevStart: prevMonthStart.toISOString(),
          prevEnd: monthStart.toISOString(),
        };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        const prevYearStart = new Date(today.getFullYear() - 1, 0, 1);
        return {
          start: yearStart.toISOString(),
          end: now.toISOString(),
          prevStart: prevYearStart.toISOString(),
          prevEnd: yearStart.toISOString(),
        };
      default:
        return { start: today.toISOString(), end: now.toISOString(), prevStart: '', prevEnd: '' };
    }
  };

  const loadReport = async () => {
    if (!merchantId) return;

    setLoading(true);
    try {
      const dateRange = getDateRange();

      // Fetch current period sales
      const { data: currentSales, error: salesError } = await supabaseAdmin
        .from('pos_sales')
        .select('*, items:pos_sale_items(*)')
        .eq('merchant_id', merchantId)
        .gte('created_at', dateRange.start)
        .lte('created_at', dateRange.end)
        .order('created_at', { ascending: true });

      if (salesError) throw salesError;

      // Fetch previous period sales for comparison
      const { data: prevSales } = await supabaseAdmin
        .from('pos_sales')
        .select('total_amount, subtotal')
        .eq('merchant_id', merchantId)
        .eq('status', 'completed')
        .gte('created_at', dateRange.prevStart)
        .lte('created_at', dateRange.prevEnd);

      // Fetch products for cost calculation
      const { data: products } = await supabaseAdmin
        .from('pos_products')
        .select('id, name, price, cost_price, category_id')
        .eq('merchant_id', merchantId);

      // Fetch categories
      const { data: categories } = await supabaseAdmin
        .from('pos_categories')
        .select('id, name')
        .eq('merchant_id', merchantId);

      // Fetch staff
      const { data: staff } = await supabaseAdmin
        .from('pos_staff')
        .select('id, name')
        .eq('merchant_id', merchantId);

      // Process current period data
      const completedSales = (currentSales || []).filter(s => s.status === 'completed');
      const refundedSales = (currentSales || []).filter(s => s.status === 'refunded' || s.status === 'voided');

      // Calculate totals
      const totalRevenue = completedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const totalCost = completedSales.reduce((sum, s) => {
        const items = s.items || [];
        return sum + items.reduce((itemSum: number, item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          return itemSum + (Number(product?.cost_price || 0) * item.quantity);
        }, 0);
      }, 0);
      const totalProfit = totalRevenue - totalCost;
      const totalItems = completedSales.reduce((sum, s) => {
        return sum + (s.items || []).reduce((itemSum: number, item: any) => itemSum + item.quantity, 0);
      }, 0);

      // Previous period totals
      const prevRevenue = (prevSales || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
      const prevSalesCount = prevSales?.length || 0;

      // Calculate changes
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
      const salesChange = prevSalesCount > 0 ? ((completedSales.length - prevSalesCount) / prevSalesCount) * 100 : 0;

      // Hourly breakdown
      const hourlyMap = new Map<number, { sales: number; revenue: number }>();
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { sales: 0, revenue: 0 });
      }
      completedSales.forEach(sale => {
        const hour = new Date(sale.created_at).getHours();
        const data = hourlyMap.get(hour) || { sales: 0, revenue: 0 };
        data.sales += 1;
        data.revenue += Number(sale.total_amount || 0);
        hourlyMap.set(hour, data);
      });
      const hourlyData = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour: `${hour}:00`,
        sales: data.sales,
        revenue: data.revenue,
      }));

      // Daily breakdown (for week/month/year views)
      const dailyMap = new Map<string, { sales: number; revenue: number; profit: number }>();
      completedSales.forEach(sale => {
        const date = new Date(sale.created_at).toISOString().split('T')[0];
        const existing = dailyMap.get(date) || { sales: 0, revenue: 0, profit: 0 };
        const saleCost = (sale.items || []).reduce((sum: number, item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          return sum + (Number(product?.cost_price || 0) * item.quantity);
        }, 0);
        existing.sales += 1;
        existing.revenue += Number(sale.total_amount || 0);
        existing.profit += Number(sale.total_amount || 0) - saleCost;
        dailyMap.set(date, existing);
      });
      const dailyData = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Category breakdown
      const categoryMap = new Map<string, { revenue: number; quantity: number; profit: number }>();
      completedSales.forEach(sale => {
        (sale.items || []).forEach((item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          const category = categories?.find(c => c.id === product?.category_id);
          const categoryName = category?.name || 'Uncategorized';
          const existing = categoryMap.get(categoryName) || { revenue: 0, quantity: 0, profit: 0 };
          const itemCost = Number(product?.cost_price || 0) * item.quantity;
          existing.revenue += Number(item.total_price || 0);
          existing.quantity += item.quantity;
          existing.profit += Number(item.total_price || 0) - itemCost;
          categoryMap.set(categoryName, existing);
        });
      });
      const categoryData = Array.from(categoryMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      // Payment method breakdown
      const paymentMap = new Map<string, { value: number; count: number }>();
      completedSales.forEach(sale => {
        const method = sale.payment_method || 'other';
        const existing = paymentMap.get(method) || { value: 0, count: 0 };
        existing.value += Number(sale.total_amount || 0);
        existing.count += 1;
        paymentMap.set(method, existing);
      });

      // Map payment method names for display - cash is physical, others are digital
      const getPaymentDisplayName = (method: string): string => {
        const displayNames: Record<string, string> = {
          'cash': 'Cash (Physical)',
          'mobile_money': 'Mobile Money',
          'qr': 'QR Payment',
          'card': 'Card',
          'credit': 'Credit/Tab',
          'bank': 'Bank Transfer',
          'other': 'Other',
        };
        return displayNames[method] || method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' ');
      };

      const paymentData = Array.from(paymentMap.entries())
        .map(([name, data]) => ({
          name: getPaymentDisplayName(name),
          method: name, // Keep original method for categorization
          ...data
        }))
        .sort((a, b) => b.value - a.value);

      // Calculate cash vs digital totals for summary
      const cashTotal = paymentMap.get('cash')?.value || 0;
      const digitalTotal = totalRevenue - cashTotal;

      // Top products
      const productMap = new Map<string, { quantity: number; revenue: number; profit: number }>();
      completedSales.forEach(sale => {
        (sale.items || []).forEach((item: any) => {
          const product = products?.find(p => p.id === item.product_id);
          const productName = item.product_name || product?.name || 'Unknown';
          const existing = productMap.get(productName) || { quantity: 0, revenue: 0, profit: 0 };
          const itemCost = Number(product?.cost_price || 0) * item.quantity;
          existing.quantity += item.quantity;
          existing.revenue += Number(item.total_price || 0);
          existing.profit += Number(item.total_price || 0) - itemCost;
          productMap.set(productName, existing);
        });
      });
      const topProducts = Array.from(productMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      // Staff performance
      const staffMap = new Map<string, { sales: number; revenue: number }>();
      completedSales.forEach(sale => {
        const staffName = sale.cashier_name || 'Unknown';
        const existing = staffMap.get(staffName) || { sales: 0, revenue: 0 };
        existing.sales += 1;
        existing.revenue += Number(sale.total_amount || 0);
        staffMap.set(staffName, existing);
      });
      const staffData = Array.from(staffMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue);

      // Find peak hour
      let peakHour = '12:00';
      let maxHourlyRevenue = 0;
      hourlyData.forEach(h => {
        if (h.revenue > maxHourlyRevenue) {
          maxHourlyRevenue = h.revenue;
          peakHour = h.hour;
        }
      });

      // Find peak day
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const dayMap = new Map<number, number>();
      completedSales.forEach(sale => {
        const day = new Date(sale.created_at).getDay();
        dayMap.set(day, (dayMap.get(day) || 0) + Number(sale.total_amount || 0));
      });
      let peakDay = 'Monday';
      let maxDayRevenue = 0;
      dayMap.forEach((revenue, day) => {
        if (revenue > maxDayRevenue) {
          maxDayRevenue = revenue;
          peakDay = dayNames[day];
        }
      });

      // Customer metrics
      const uniqueCustomers = new Set(completedSales.map(s => s.customer_id).filter(Boolean)).size;

      setReport({
        totalSales: completedSales.length,
        totalRevenue,
        totalProfit,
        totalItems,
        avgTicket: completedSales.length > 0 ? totalRevenue / completedSales.length : 0,
        profitMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
        totalCustomers: uniqueCustomers,
        totalRefunds: refundedSales.length,
        refundAmount: refundedSales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
        cashTotal,
        digitalTotal,
        salesChange,
        revenueChange,
        profitChange: revenueChange, // Simplified
        ticketChange: 0,
        hourlyData,
        dailyData,
        categoryData,
        paymentData,
        topProducts,
        staffData,
        peakHour,
        peakDay,
        newCustomers: uniqueCustomers,
        returningCustomers: 0,
      });
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const csv = [
      ['POS Sales Report'],
      [`Period: ${period.toUpperCase()}`],
      [''],
      ['Summary Metrics'],
      ['Total Sales', report.totalSales],
      ['Total Revenue', report.totalRevenue],
      ['Total Profit', report.totalProfit],
      ['Profit Margin', `${report.profitMargin.toFixed(1)}%`],
      ['Average Ticket', report.avgTicket],
      ['Items Sold', report.totalItems],
      [''],
      ['Cash vs Digital Breakdown'],
      ['Physical Cash (Liquid cash with you)', report.cashTotal],
      ['Digital Payments (QR, Mobile Money, Card, Bank)', report.digitalTotal],
      [''],
      ['Top Products'],
      ['Product', 'Quantity', 'Revenue', 'Profit'],
      ...report.topProducts.map(p => [p.name, p.quantity, p.revenue, p.profit]),
      [''],
      ['Category Breakdown'],
      ['Category', 'Revenue', 'Quantity'],
      ...report.categoryData.map(c => [c.name, c.revenue, c.quantity]),
      [''],
      ['Payment Methods'],
      ['Method', 'Amount', 'Count'],
      ...report.paymentData.map(p => [p.name, p.value, p.count]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pos-report-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading && !report) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/apps/pos')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Analytics</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Comprehensive performance insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadReport}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {(['today', 'week', 'month', 'year'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                period === p
                  ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {report && (
          <>
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <StatCard
                icon={<ShoppingBag className="w-5 h-5" />}
                label="Total Sales"
                value={report.totalSales.toString()}
                change={report.salesChange}
                color="blue"
              />
              <StatCard
                icon={<DollarSign className="w-5 h-5" />}
                label="Revenue"
                value={formatCurrency(report.totalRevenue)}
                change={report.revenueChange}
                color="green"
              />
              <StatCard
                icon={<TrendingUp className="w-5 h-5" />}
                label="Profit"
                value={formatCurrency(report.totalProfit)}
                change={report.profitChange}
                color="purple"
              />
              <StatCard
                icon={<Percent className="w-5 h-5" />}
                label="Margin"
                value={`${report.profitMargin.toFixed(1)}%`}
                color="orange"
              />
              <StatCard
                icon={<Target className="w-5 h-5" />}
                label="Avg Ticket"
                value={formatCurrency(report.avgTicket)}
                color="cyan"
              />
              <StatCard
                icon={<Package className="w-5 h-5" />}
                label="Items Sold"
                value={report.totalItems.toString()}
                color="pink"
              />
            </div>

            {/* Quick Insights */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-xs text-blue-600 font-medium">Peak Hour</p>
                    <p className="text-xl font-bold text-blue-700">{report.peakHour}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <Calendar className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-xs text-green-600 font-medium">Best Day</p>
                    <p className="text-xl font-bold text-green-700">{report.peakDay}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-purple-600" />
                  <div>
                    <p className="text-xs text-purple-600 font-medium">Customers</p>
                    <p className="text-xl font-bold text-purple-700">{report.totalCustomers}</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-xs text-red-600 font-medium">Refunds</p>
                    <p className="text-xl font-bold text-red-700">{report.totalRefunds}</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Cash vs Digital Revenue - Important distinction */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-5 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
                      <Banknote className="w-6 h-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">Physical Cash Collected</p>
                      <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{formatCurrency(report.cashTotal)}</p>
                      <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Liquid cash with you</p>
                    </div>
                  </div>
                  {report.totalRevenue > 0 && (
                    <div className="text-right">
                      <p className="text-3xl font-bold text-amber-700">
                        {((report.cashTotal / report.totalRevenue) * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-amber-600">of revenue</p>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-5 bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border-cyan-200 dark:border-cyan-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div>
                      <p className="text-sm text-cyan-700 dark:text-cyan-400 font-medium">Digital Payments</p>
                      <p className="text-2xl font-bold text-cyan-800 dark:text-cyan-300">{formatCurrency(report.digitalTotal)}</p>
                      <p className="text-xs text-cyan-600 dark:text-cyan-500 mt-1">QR, Mobile Money, Card, Bank</p>
                    </div>
                  </div>
                  {report.totalRevenue > 0 && (
                    <div className="text-right">
                      <p className="text-3xl font-bold text-cyan-700">
                        {((report.digitalTotal / report.totalRevenue) * 100).toFixed(0)}%
                      </p>
                      <p className="text-xs text-cyan-600">of revenue</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue/Sales Trend Chart */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                    {period === 'today' ? 'Hourly' : 'Daily'} Performance
                  </h3>
                  <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    {(['revenue', 'sales', 'profit'] as const).map(type => (
                      <button
                        key={type}
                        onClick={() => setActiveChart(type)}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          activeChart === type
                            ? 'bg-white dark:bg-gray-700 text-primary-600 shadow-sm'
                            : 'text-gray-500'
                        }`}
                      >
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    {period === 'today' ? (
                      <AreaChart data={report.hourlyData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => activeChart === 'sales' ? v : formatCurrency(v)} />
                        <Tooltip
                          formatter={(value: number) => [
                            activeChart === 'sales' ? value : formatFullCurrency(value),
                            activeChart.charAt(0).toUpperCase() + activeChart.slice(1)
                          ]}
                        />
                        <Area
                          type="monotone"
                          dataKey={activeChart === 'sales' ? 'sales' : 'revenue'}
                          stroke="#3B82F6"
                          fill="url(#colorRevenue)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    ) : (
                      <BarChart data={report.dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 10 }}
                          tickFormatter={(v) => new Date(v).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                        />
                        <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => activeChart === 'sales' ? v : formatCurrency(v)} />
                        <Tooltip
                          formatter={(value: number) => [
                            activeChart === 'sales' ? value : formatFullCurrency(value),
                            activeChart.charAt(0).toUpperCase() + activeChart.slice(1)
                          ]}
                          labelFormatter={(v) => new Date(v).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                        />
                        <Bar
                          dataKey={activeChart}
                          fill="#3B82F6"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    )}
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Payment Methods Pie Chart */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-gray-400" />
                  Payment Methods
                </h3>
                {report.paymentData.length === 0 ? (
                  <div className="h-64 flex items-center justify-center text-gray-400">
                    No payment data available
                  </div>
                ) : (
                  <div className="h-64 flex items-center">
                    <div className="w-1/2">
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={report.paymentData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {report.paymentData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-2">
                      {report.paymentData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="text-gray-600 dark:text-gray-400">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(item.value)}</p>
                            <p className="text-xs text-gray-400">{item.count} txns</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Category Performance */}
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-400" />
                Category Performance
              </h3>
              {report.categoryData.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-gray-400">
                  No category data available
                </div>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={report.categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => formatCurrency(v)} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(value: number) => formatFullCurrency(value)} />
                      <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            {/* Bottom Section: Top Products & Staff Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Products */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Top Selling Products
                </h3>
                {report.topProducts.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">No product data</div>
                ) : (
                  <div className="space-y-3">
                    {report.topProducts.slice(0, 8).map((product, index) => (
                      <div
                        key={product.name}
                        className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? 'bg-yellow-100 text-yellow-700' :
                          index === 1 ? 'bg-gray-200 text-gray-700' :
                          index === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{product.name}</p>
                          <p className="text-xs text-gray-500">{product.quantity} sold</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900 dark:text-white">{formatCurrency(product.revenue)}</p>
                          <p className="text-xs text-green-600">+{formatCurrency(product.profit)} profit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Staff Performance */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-500" />
                  Staff Performance
                </h3>
                {report.staffData.length === 0 ? (
                  <div className="py-8 text-center text-gray-400">No staff data</div>
                ) : (
                  <div className="space-y-3">
                    {report.staffData.map((staff, index) => {
                      const maxRevenue = Math.max(...report.staffData.map(s => s.revenue), 1);
                      const percentage = (staff.revenue / maxRevenue) * 100;

                      return (
                        <div key={staff.name} className="space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                index === 0 ? 'bg-purple-500' :
                                index === 1 ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`}>
                                {staff.name.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-gray-900 dark:text-white">{staff.name}</span>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{formatCurrency(staff.revenue)}</p>
                              <p className="text-xs text-gray-500">{staff.sales} sales</p>
                            </div>
                          </div>
                          <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                index === 0 ? 'bg-purple-500' :
                                index === 1 ? 'bg-blue-500' :
                                'bg-gray-400'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </MerchantLayout>
  );
}

// Stat Card Component
function StatCard({
  icon,
  label,
  value,
  change,
  color
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: number;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'cyan' | 'pink';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600',
    orange: 'bg-orange-50 dark:bg-orange-900/20 text-orange-600',
    cyan: 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600',
    pink: 'bg-pink-50 dark:bg-pink-900/20 text-pink-600',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white truncate">{value}</p>
        </div>
      </div>
      {change !== undefined && change !== 0 && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          <span>{Math.abs(change).toFixed(1)}% vs prev</span>
        </div>
      )}
    </Card>
  );
}

export default POSReportsPage;
