/**
 * POS Reports Page
 * Comprehensive reporting dashboard with sales reports, analytics, and end of day summary
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  ArrowLeft,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  BarChart3,
  PieChart,
  Clock,
  DollarSign,
  ShoppingBag,
  Users,
  Package,
  Percent,
  RefreshCw,
  FileText,
  Printer,
  Wifi,
  WifiOff,
} from 'lucide-react';
import posService, { POSSalesReport } from '@/services/pos.service';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Format percentage
const formatPercent = (value: number) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

// Simple bar chart component
const SimpleBarChart = ({ data, labelKey, valueKey, formatValue }: {
  data: any[];
  labelKey: string;
  valueKey: string;
  formatValue?: (v: number) => string;
}) => {
  const maxValue = Math.max(...data.map(d => d[valueKey]), 1);

  return (
    <div className="space-y-2">
      {data.map((item, idx) => (
        <div key={idx} className="flex items-center gap-3">
          <span className="text-sm text-gray-600 dark:text-gray-400 w-20 truncate">{item[labelKey]}</span>
          <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${(item[valueKey] / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium w-24 text-right">
            {formatValue ? formatValue(item[valueKey]) : item[valueKey]}
          </span>
        </div>
      ))}
    </div>
  );
};

// Hourly chart component
const HourlyChart = ({ data }: { data: { hour: number; count: number; amount: number }[] }) => {
  const maxAmount = Math.max(...data.map(d => d.amount), 1);

  return (
    <div className="flex items-end gap-1 h-32">
      {Array.from({ length: 24 }, (_, hour) => {
        const item = data.find(d => d.hour === hour) || { hour, count: 0, amount: 0 };
        const height = (item.amount / maxAmount) * 100;

        return (
          <div
            key={hour}
            className="flex-1 bg-primary-500 rounded-t transition-all hover:bg-primary-600 cursor-pointer group relative"
            style={{ height: `${Math.max(height, 2)}%` }}
            title={`${hour}:00 - ${formatCurrency(item.amount)} (${item.count} sales)`}
          >
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
              {hour}:00 - {formatCurrency(item.amount)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export function POSReportsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  // Use offline sync hook for offline-first data access
  const offlineSync = useOfflineSync(merchantId);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [report, setReport] = useState<POSSalesReport | null>(null);
  const [eodReport, setEodReport] = useState<any>(null);
  const [customDates, setCustomDates] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [showEOD, setShowEOD] = useState(false);
  const [isOfflineData, setIsOfflineData] = useState(false);

  useEffect(() => {
    if (merchantId) {
      loadReport();
    }
  }, [merchantId, activeTab, customDates]);

  const loadReport = async () => {
    try {
      setLoading(true);

      let startDate: string;
      let endDate = new Date().toISOString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      switch (activeTab) {
        case 'daily':
          startDate = today.toISOString();
          break;
        case 'weekly':
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          startDate = weekAgo.toISOString();
          break;
        case 'monthly':
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          startDate = monthAgo.toISOString();
          break;
        case 'custom':
          startDate = new Date(customDates.start).toISOString();
          endDate = new Date(customDates.end + 'T23:59:59').toISOString();
          break;
        default:
          startDate = today.toISOString();
      }

      // Use offline sync - works offline with IndexedDB
      const data = await offlineSync.getSalesReport(startDate, endDate);
      setReport({ ...data, period: activeTab } as POSSalesReport);
      setIsOfflineData(data?.isOffline || false);

      // Also load end of day report for today (online only)
      if (activeTab === 'daily' && offlineSync.isOnline) {
        try {
          const eod = await posService.getEndOfDayReport(merchantId!, today.toISOString().split('T')[0]);
          setEodReport(eod);
        } catch (e) {
          console.warn('EOD report not available offline');
        }
      }
    } catch (error) {
      console.error('Error loading report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = () => {
    if (!report) return;

    const csv = [
      ['Sales Report', report.period.toUpperCase()],
      ['Period', `${report.start_date} to ${report.end_date}`],
      [''],
      ['Metric', 'Value'],
      ['Total Sales', report.total_sales],
      ['Total Revenue', report.total_revenue],
      ['Total Cost', report.total_cost],
      ['Gross Profit', report.gross_profit],
      ['Profit Margin', `${report.profit_margin.toFixed(1)}%`],
      ['Items Sold', report.total_items_sold],
      ['Average Ticket', report.average_ticket],
      [''],
      ['Sales by Category'],
      ['Category', 'Sales Count', 'Revenue'],
      ...report.sales_by_category.map(c => [c.category, c.sales, c.revenue]),
      [''],
      ['Payment Methods'],
      ['Method', 'Count', 'Amount'],
      ...report.sales_by_payment.map(p => [p.method, p.count, p.amount]),
      [''],
      ['Top Products'],
      ['Product', 'Qty Sold', 'Revenue', 'Profit'],
      ...report.top_products.map(p => [p.name, p.quantity, p.revenue, p.profit]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${report.period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printEODReport = () => {
    window.print();
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/pos/terminal')}
              className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Reports</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Analytics and performance insights</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowEOD(!showEOD)}>
              <FileText className="w-4 h-4 mr-2" />
              {showEOD ? 'Sales Report' : 'End of Day'}
            </Button>
            <Button variant="outline" onClick={loadReport}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={exportReport}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Period Tabs */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex bg-gray-100 dark:bg-gray-900 rounded-lg p-1">
            {(['daily', 'weekly', 'monthly', 'custom'] as const).map(period => (
              <button
                key={period}
                onClick={() => setActiveTab(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === period
                    ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:text-white'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>

          {activeTab === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customDates.start}
                onChange={e => setCustomDates({ ...customDates, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
              <span className="text-gray-500 dark:text-gray-400">to</span>
              <input
                type="date"
                value={customDates.end}
                onChange={e => setCustomDates({ ...customDates, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
              />
            </div>
          )}
        </div>

        {showEOD && eodReport ? (
          /* End of Day Report View */
          <div className="space-y-6 print:space-y-4" id="eod-report">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 print:border-none print:p-0">
              <div className="text-center mb-6 print:mb-4">
                <h2 className="text-xl font-bold">End of Day Report</h2>
                <p className="text-gray-500 dark:text-gray-400">{eodReport.date}</p>
              </div>

              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
                  <p className="text-2xl font-bold">{eodReport.total_sales}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Revenue</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(eodReport.total_revenue)}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Items Sold</p>
                  <p className="text-2xl font-bold text-blue-600">{eodReport.total_items_sold}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg Ticket</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(eodReport.average_ticket)}</p>
                </div>
              </div>

              {/* Cash Session */}
              {eodReport.cash_session && (
                <div className="mb-6 p-4 border rounded-lg">
                  <h3 className="font-semibold mb-3">Cash Drawer</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Opening Balance:</span>
                      <span className="font-medium">{formatCurrency(eodReport.cash_session.opening_balance || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Cash Sales:</span>
                      <span className="font-medium">{formatCurrency(eodReport.cash_session.cash_sales_total || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Cash In:</span>
                      <span className="font-medium text-green-600">+{formatCurrency(eodReport.cash_session.cash_in || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500 dark:text-gray-400">Cash Out:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(eodReport.cash_session.cash_out || 0)}</span>
                    </div>
                    <div className="flex justify-between col-span-2 pt-2 border-t">
                      <span className="font-semibold">Expected Balance:</span>
                      <span className="font-bold">{formatCurrency(eodReport.cash_session.expected_balance || 0)}</span>
                    </div>
                    {eodReport.cash_session.closing_balance !== null && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Actual Balance:</span>
                          <span className="font-medium">{formatCurrency(eodReport.cash_session.closing_balance || 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Difference:</span>
                          <span className={`font-medium ${
                            (eodReport.cash_session.difference || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(eodReport.cash_session.difference || 0)}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Payment Breakdown */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Payment Methods</h3>
                <div className="space-y-2">
                  {eodReport.payment_breakdown?.map((pm: any) => (
                    <div key={pm.method} className="flex justify-between text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <span className="capitalize">{pm.method.replace('_', ' ')}</span>
                      <span className="font-medium">{pm.count} x {formatCurrency(pm.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Refunds */}
              {eodReport.refunds && eodReport.refunds.count > 0 && (
                <div className="mb-6 p-4 bg-red-50 rounded-lg">
                  <h3 className="font-semibold mb-2 text-red-700">Refunds</h3>
                  <div className="flex justify-between text-sm">
                    <span>{eodReport.refunds.count} refunds</span>
                    <span className="font-medium text-red-600">-{formatCurrency(eodReport.refunds.total)}</span>
                  </div>
                </div>
              )}

              {/* Top Products */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Top Products</h3>
                <div className="space-y-2">
                  {eodReport.top_products?.slice(0, 5).map((p: any, idx: number) => (
                    <div key={p.id} className="flex justify-between text-sm">
                      <span>{idx + 1}. {p.name}</span>
                      <span className="font-medium">{p.quantity} sold - {formatCurrency(p.revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-center mt-6 print:hidden">
                <Button onClick={printEODReport}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print Report
                </Button>
              </div>
            </div>
          </div>
        ) : report ? (
          /* Main Report View */
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <MetricCard
                icon={<ShoppingBag className="w-5 h-5 text-blue-600" />}
                label="Total Sales"
                value={report.total_sales.toString()}
                bgColor="bg-blue-50"
              />
              <MetricCard
                icon={<DollarSign className="w-5 h-5 text-green-600" />}
                label="Revenue"
                value={formatCurrency(report.total_revenue)}
                bgColor="bg-green-50"
              />
              <MetricCard
                icon={<TrendingUp className="w-5 h-5 text-purple-600" />}
                label="Gross Profit"
                value={formatCurrency(report.gross_profit)}
                bgColor="bg-purple-50"
              />
              <MetricCard
                icon={<Percent className="w-5 h-5 text-orange-600" />}
                label="Profit Margin"
                value={`${report.profit_margin.toFixed(1)}%`}
                bgColor="bg-orange-50"
              />
              <MetricCard
                icon={<Package className="w-5 h-5 text-cyan-600" />}
                label="Items Sold"
                value={report.total_items_sold.toString()}
                bgColor="bg-cyan-50"
              />
              <MetricCard
                icon={<TrendingUp className="w-5 h-5 text-pink-600" />}
                label="Avg Ticket"
                value={formatCurrency(report.average_ticket)}
                bgColor="bg-pink-50"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales by Category */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <PieChart className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Sales by Category</h3>
                </div>
                {report.sales_by_category.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No category data</p>
                ) : (
                  <SimpleBarChart
                    data={report.sales_by_category}
                    labelKey="category"
                    valueKey="revenue"
                    formatValue={formatCurrency}
                  />
                )}
              </div>

              {/* Payment Methods */}
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Payment Methods</h3>
                </div>
                {report.sales_by_payment.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-8">No payment data</p>
                ) : (
                  <SimpleBarChart
                    data={report.sales_by_payment.map(p => ({
                      method: p.method.charAt(0).toUpperCase() + p.method.slice(1).replace('_', ' '),
                      amount: p.amount,
                    }))}
                    labelKey="method"
                    valueKey="amount"
                    formatValue={formatCurrency}
                  />
                )}
              </div>
            </div>

            {/* Hourly Sales */}
            {activeTab === 'daily' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Sales by Hour</h3>
                </div>
                <HourlyChart data={report.sales_by_hour} />
                <div className="flex justify-between text-xs text-gray-400 mt-2">
                  <span>12am</span>
                  <span>6am</span>
                  <span>12pm</span>
                  <span>6pm</span>
                  <span>11pm</span>
                </div>
              </div>
            )}

            {/* Sales Trend */}
            {(activeTab === 'weekly' || activeTab === 'monthly' || activeTab === 'custom') && report.sales_trend.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-5 h-5 text-gray-400" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">Sales Trend</h3>
                </div>
                <div className="overflow-x-auto">
                  <div className="flex items-end gap-2 h-40 min-w-[600px]">
                    {report.sales_trend.map((day, idx) => {
                      const maxRevenue = Math.max(...report.sales_trend.map(d => d.revenue), 1);
                      const height = (day.revenue / maxRevenue) * 100;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center">
                          <div
                            className="w-full bg-primary-500 rounded-t hover:bg-primary-600 transition-colors"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${day.date}: ${formatCurrency(day.revenue)}`}
                          />
                          <span className="text-xs text-gray-400 mt-1 rotate-45 origin-left whitespace-nowrap">
                            {new Date(day.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Top Products */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-5 h-5 text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-white">Top Products</h3>
              </div>
              {report.top_products.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">No product data</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="border-b">
                      <tr>
                        <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">#</th>
                        <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Product</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Qty Sold</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Revenue</th>
                        <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Profit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {report.top_products.map((product, idx) => (
                        <tr key={product.id}>
                          <td className="py-3 text-sm text-gray-400">{idx + 1}</td>
                          <td className="py-3 font-medium">{product.name}</td>
                          <td className="py-3 text-right text-sm">{product.quantity}</td>
                          <td className="py-3 text-right text-sm font-medium">{formatCurrency(product.revenue)}</td>
                          <td className="py-3 text-right text-sm font-medium text-green-600">
                            {formatCurrency(product.profit)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No report data available</p>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

// Metric Card Component
function MetricCard({ icon, label, value, bgColor }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default POSReportsPage;
