/**
 * POS App Dashboard - Comprehensive Management Hub
 *
 * This is the main POS management interface where all configuration,
 * products, inventory, staff, and settings are managed.
 * The POS Terminal is purely for sales operations.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Settings,
  Loader2,
  TrendingUp,
  Play,
  DollarSign,
  ArrowUpRight,
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  UserCog,
  Boxes,
  Tags,
  Percent,
  Receipt,
  FileText,
  Shield,
  Truck,
  CreditCard,
  Gift,
  Bell,
  Database,
  Building2,
  ChevronRight,
  Activity,
  AlertTriangle,
  PackageX,
  TrendingDown,
  Calendar,
  Target,
  ShoppingBag,
  Globe,
  PieChart as PieChartIcon,
  ArrowDownRight,
} from 'lucide-react';
import posService, { POSCashSession } from '@/services/pos.service';
import { POSWallet } from '@/components/pos/POSWallet';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

// Chart colors
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

interface POSStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  todaySales: number;
  todayRevenue: number;
  lowStockCount: number;
  activeCustomers: number;
  pendingOrders: number;
  // Comparison
  revenueChange: number;
  salesChange: number;
}

interface HourlyData {
  hour: string;
  sales: number;
  revenue: number;
}

interface PaymentData {
  name: string;
  value: number;
  count: number;
}

interface CategoryData {
  name: string;
  revenue: number;
}

interface RecentSale {
  id: string;
  sale_number: string;
  total_amount: number;
  created_at: string;
  payment_method: string;
}

interface QuickLink {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  color: string;
  bgColor: string;
  category: string;
}

export function POSAppPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [stats, setStats] = useState<POSStats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    todaySales: 0,
    todayRevenue: 0,
    lowStockCount: 0,
    activeCustomers: 0,
    pendingOrders: 0,
    revenueChange: 0,
    salesChange: 0,
  });
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [cashSession, setCashSession] = useState<POSCashSession | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'management'>('overview');

  // Chart data
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);

  // Quick Links Configuration - All POS Management Features
  const quickLinks: QuickLink[] = [
    // Sales & Operations
    {
      title: 'POS Terminal',
      description: 'Launch sales terminal',
      icon: Play,
      href: '/merchant/pos/terminal',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      category: 'operations',
    },
    {
      title: 'Sales History',
      description: 'View all transactions',
      icon: Receipt,
      href: '/merchant/pos/sales',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
      category: 'operations',
    },
    // Product & Catalog
    {
      title: 'Products',
      description: 'Manage product catalog',
      icon: Package,
      href: '/merchant/pos/products',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30',
      category: 'catalog',
    },
    {
      title: 'Categories',
      description: 'Organize products',
      icon: Tags,
      href: '/merchant/pos/products?tab=categories',
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
      category: 'catalog',
    },
    {
      title: 'Inventory',
      description: 'Stock control',
      icon: Boxes,
      href: '/merchant/pos/inventory',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30',
      category: 'catalog',
    },
    // People
    {
      title: 'Staff & Roles',
      description: 'Manage team access',
      icon: UserCog,
      href: '/merchant/pos/staff',
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
      category: 'people',
    },
    {
      title: 'Customers',
      description: 'Customer management',
      icon: Users,
      href: '/merchant/pos/customers',
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/30',
      category: 'people',
    },
    {
      title: 'Suppliers',
      description: 'Vendor management',
      icon: Truck,
      href: '/merchant/pos/suppliers',
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      category: 'people',
    },
    // Financial
    {
      title: 'Discounts',
      description: 'Promotions & coupons',
      icon: Percent,
      href: '/merchant/pos/discounts',
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      category: 'financial',
    },
    {
      title: 'Loyalty Program',
      description: 'Rewards & points',
      icon: Gift,
      href: '/merchant/pos/loyalty',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
      category: 'financial',
    },
    {
      title: 'Payments',
      description: 'Payment methods',
      icon: CreditCard,
      href: '/merchant/pos/settings?tab=payments',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
      category: 'financial',
    },
    // Reports & Analytics
    {
      title: 'Reports',
      description: 'Sales analytics',
      icon: BarChart3,
      href: '/merchant/pos/reports',
      color: 'text-violet-600',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
      category: 'reports',
    },
    {
      title: 'Audit Logs',
      description: 'Activity tracking',
      icon: Shield,
      href: '/merchant/pos/audit',
      color: 'text-slate-600',
      bgColor: 'bg-slate-100 dark:bg-slate-900/30',
      category: 'reports',
    },
    // Settings
    {
      title: 'Business Settings',
      description: 'Store configuration',
      icon: Building2,
      href: '/merchant/pos/settings',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100 dark:bg-gray-900/30',
      category: 'settings',
    },
    {
      title: 'Receipt Setup',
      description: 'Invoice templates',
      icon: FileText,
      href: '/merchant/pos/settings?tab=receipts',
      color: 'text-teal-600',
      bgColor: 'bg-teal-100 dark:bg-teal-900/30',
      category: 'settings',
    },
    // Online Sales
    {
      title: 'Marketplace',
      description: 'Sell online to customers',
      icon: Globe,
      href: '/merchant/pos/marketplace',
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      category: 'online',
    },
  ];

  // Check if POS setup has been completed
  useEffect(() => {
    const checkSetup = async () => {
      if (!user?.id) return;

      try {
        const isCompleted = await posService.isPOSSetupCompleted(user.id);
        if (!isCompleted) {
          navigate('/merchant/pos/setup', { replace: true });
          return;
        }
        setCheckingSetup(false);
      } catch (error) {
        console.error('Error checking POS setup:', error);
        navigate('/merchant/pos/setup', { replace: true });
      }
    };

    checkSetup();
  }, [user, navigate]);

  useEffect(() => {
    if (user && !checkingSetup) {
      loadData();
    }
  }, [user, checkingSetup]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

      const [productsResult, lowStockResult, allSalesResult, todaySalesResult, yesterdaySalesResult, customersResult, categoriesResult] = await Promise.all([
        supabaseAdmin
          .from('pos_products')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', user.id)
          .eq('is_active', true),
        supabaseAdmin
          .from('pos_products')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', user.id)
          .eq('is_active', true)
          .eq('track_inventory', true)
          .lte('stock_quantity', 10),
        supabaseAdmin
          .from('pos_sales')
          .select('total_amount')
          .eq('merchant_id', user.id)
          .eq('status', 'completed'),
        supabaseAdmin
          .from('pos_sales')
          .select('id, total_amount, created_at, payment_method')
          .eq('merchant_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', today.toISOString()),
        supabaseAdmin
          .from('pos_sales')
          .select('total_amount')
          .eq('merchant_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', yesterday.toISOString())
          .lt('created_at', today.toISOString()),
        supabaseAdmin
          .from('pos_customers')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', user.id)
          .eq('is_active', true),
        supabaseAdmin
          .from('pos_categories')
          .select('id, name')
          .eq('merchant_id', user.id),
      ]);

      const totalRevenue = allSalesResult.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const todayRevenue = todaySalesResult.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const yesterdayRevenue = yesterdaySalesResult.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const yesterdaySalesCount = yesterdaySalesResult.data?.length || 0;
      const todaySalesCount = todaySalesResult.data?.length || 0;

      // Calculate changes
      const revenueChange = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : 0;
      const salesChange = yesterdaySalesCount > 0 ? ((todaySalesCount - yesterdaySalesCount) / yesterdaySalesCount) * 100 : 0;

      setStats({
        totalProducts: productsResult.count || 0,
        totalSales: allSalesResult.data?.length || 0,
        totalRevenue,
        todaySales: todaySalesCount,
        todayRevenue,
        lowStockCount: lowStockResult.count || 0,
        activeCustomers: customersResult.count || 0,
        pendingOrders: 0,
        revenueChange,
        salesChange,
      });

      // Process hourly data for today
      const hourlyMap = new Map<number, { sales: number; revenue: number }>();
      for (let i = 0; i < 24; i++) {
        hourlyMap.set(i, { sales: 0, revenue: 0 });
      }
      (todaySalesResult.data || []).forEach(sale => {
        const hour = new Date(sale.created_at).getHours();
        const data = hourlyMap.get(hour) || { sales: 0, revenue: 0 };
        data.sales += 1;
        data.revenue += Number(sale.total_amount || 0);
        hourlyMap.set(hour, data);
      });
      const hourlyChartData = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
        hour: `${hour}:00`,
        sales: data.sales,
        revenue: data.revenue,
      }));
      setHourlyData(hourlyChartData);

      // Process payment method data
      const paymentMap = new Map<string, { value: number; count: number }>();
      (todaySalesResult.data || []).forEach(sale => {
        const method = sale.payment_method || 'other';
        const existing = paymentMap.get(method) || { value: 0, count: 0 };
        existing.value += Number(sale.total_amount || 0);
        existing.count += 1;
        paymentMap.set(method, existing);
      });
      const paymentChartData = Array.from(paymentMap.entries())
        .map(([name, data]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
          ...data
        }))
        .sort((a, b) => b.value - a.value);
      setPaymentData(paymentChartData);

      // Fetch category sales data
      const { data: salesWithItems } = await supabaseAdmin
        .from('pos_sales')
        .select('*, items:pos_sale_items(product_id, total_price)')
        .eq('merchant_id', user.id)
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      // Fetch products with category
      const { data: productsData } = await supabaseAdmin
        .from('pos_products')
        .select('id, category_id')
        .eq('merchant_id', user.id);

      // Process category data
      const categoryMap = new Map<string, number>();
      (salesWithItems || []).forEach(sale => {
        (sale.items || []).forEach((item: any) => {
          const product = productsData?.find(p => p.id === item.product_id);
          const category = categoriesResult.data?.find(c => c.id === product?.category_id);
          const categoryName = category?.name || 'Uncategorized';
          categoryMap.set(categoryName, (categoryMap.get(categoryName) || 0) + Number(item.total_price || 0));
        });
      });
      const categoryChartData = Array.from(categoryMap.entries())
        .map(([name, revenue]) => ({ name, revenue }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);
      setCategoryData(categoryChartData);

      // Load recent sales
      const { data: recentSalesData } = await supabaseAdmin
        .from('pos_sales')
        .select('id, sale_number, total_amount, created_at, payment_method')
        .eq('merchant_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentSales(recentSalesData || []);

      // Load today's cash session
      try {
        const session = await posService.getTodayCashSession(user.id);
        setCashSession(session);
      } catch (err) {
        console.error('Error loading cash session:', err);
        setCashSession(null);
      }
    } catch (error) {
      console.error('Error loading POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'mobile_money': return '📱';
      case 'qr': return '📲';
      default: return '💰';
    }
  };

  const merchantName = user ? `${user.firstName} ${user.lastName}` : 'Merchant';

  if (checkingSetup || loading) {
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
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg shadow-green-500/30">
                <ShoppingCart className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">POS Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your point of sale system</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => navigate('/merchant/pos/terminal')}
              size="lg"
              className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/30"
            >
              <Play className="w-5 h-5 mr-2" />
              Launch POS Terminal
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('management')}
            className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'management'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Management
          </button>
        </div>

        {activeTab === 'overview' && (
          <>
            {/* POS Wallet Section */}
            <div className="mb-6">
              <POSWallet />
            </div>

            {/* Alert Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Cash Drawer Status */}
              <Card className={`p-4 ${
                cashSession?.status === 'open'
                  ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
                  : 'bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    cashSession?.status === 'open' ? 'bg-green-100' : 'bg-amber-100'
                  }`}>
                    <Wallet className={`w-5 h-5 ${
                      cashSession?.status === 'open' ? 'text-green-600' : 'text-amber-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Cash Drawer</p>
                    {cashSession?.status === 'open' ? (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Open
                      </p>
                    ) : (
                      <p className="text-xs text-amber-600 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> Not started
                      </p>
                    )}
                  </div>
                  {cashSession?.status === 'open' && (
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(cashSession.opening_balance + (cashSession.cash_in || 0) - (cashSession.cash_out || 0))}
                    </p>
                  )}
                </div>
              </Card>

              {/* Low Stock Alert */}
              <Card className={`p-4 ${
                stats.lowStockCount > 0
                  ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-800'
                  : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${
                    stats.lowStockCount > 0 ? 'bg-red-100' : 'bg-gray-100'
                  }`}>
                    <PackageX className={`w-5 h-5 ${
                      stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Low Stock</p>
                    <p className={`text-xs ${stats.lowStockCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {stats.lowStockCount > 0 ? `${stats.lowStockCount} items need restock` : 'All items stocked'}
                    </p>
                  </div>
                  {stats.lowStockCount > 0 && (
                    <button
                      onClick={() => navigate('/merchant/pos/inventory')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      View
                    </button>
                  )}
                </div>
              </Card>

              {/* Today's Performance */}
              <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-blue-100">
                    <Target className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Today</p>
                    <p className="text-xs text-blue-600">{stats.todaySales} sales</p>
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    {formatCurrency(stats.todayRevenue)}
                  </p>
                </div>
              </Card>
            </div>

            {/* Key Stats with Change Indicators */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/merchant/pos/sales')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  {stats.revenueChange !== 0 && (
                    <span className={`text-xs flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                      stats.revenueChange >= 0
                        ? 'text-green-700 bg-green-100'
                        : 'text-red-700 bg-red-100'
                    }`}>
                      {stats.revenueChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(stats.revenueChange).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.todayRevenue)}</p>
                <p className="text-sm text-gray-500">Today's Revenue</p>
              </Card>

              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/merchant/pos/sales')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <ShoppingBag className="w-5 h-5 text-blue-600" />
                  </div>
                  {stats.salesChange !== 0 && (
                    <span className={`text-xs flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                      stats.salesChange >= 0
                        ? 'text-green-700 bg-green-100'
                        : 'text-red-700 bg-red-100'
                    }`}>
                      {stats.salesChange >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {Math.abs(stats.salesChange).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.todaySales}</p>
                <p className="text-sm text-gray-500">Today's Sales</p>
              </Card>

              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/merchant/pos/products')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                    <Package className="w-5 h-5 text-purple-600" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
                <p className="text-sm text-gray-500">Products</p>
              </Card>

              <Card className="p-4 hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate('/merchant/pos/customers')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-xl">
                    <Users className="w-5 h-5 text-pink-600" />
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeCustomers}</p>
                <p className="text-sm text-gray-500">Customers</p>
              </Card>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Hourly Sales Chart */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gray-400" />
                    Today's Hourly Sales
                  </h3>
                  <button
                    onClick={() => navigate('/merchant/pos/reports')}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    View Details
                  </button>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyData}>
                      <defs>
                        <linearGradient id="colorRevenueDash" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `NLe ${v >= 1000 ? (v/1000).toFixed(0) + 'K' : v}`} />
                      <Tooltip
                        formatter={(value: number, name: string) => [
                          name === 'revenue' ? formatCurrency(value) : value,
                          name === 'revenue' ? 'Revenue' : 'Sales'
                        ]}
                        labelFormatter={(label) => `Time: ${label}`}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#3B82F6"
                        fill="url(#colorRevenueDash)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Payment Methods Pie Chart */}
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <PieChartIcon className="w-5 h-5 text-gray-400" />
                    Payment Methods
                  </h3>
                </div>
                {paymentData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-gray-400">
                    <div className="text-center">
                      <CreditCard className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No sales today yet</p>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 flex items-center">
                    <div className="w-1/2">
                      <ResponsiveContainer width="100%" height={180}>
                        <PieChart>
                          <Pie
                            data={paymentData as any[]}
                            cx="50%"
                            cy="50%"
                            innerRadius={35}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {paymentData.map((_, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="w-1/2 space-y-2">
                      {paymentData.map((item, index) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                            />
                            <span className="text-gray-600 dark:text-gray-400 truncate">{item.name}</span>
                          </div>
                          <div className="text-right">
                            <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.value)}</p>
                            <p className="text-xs text-gray-400">{item.count} txn</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>

            {/* Category Performance Bar Chart */}
            {categoryData.length > 0 && (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Tags className="w-5 h-5 text-gray-400" />
                    Top Categories Today
                  </h3>
                  <button
                    onClick={() => navigate('/merchant/pos/reports')}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    View All
                  </button>
                </div>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `NLe ${v >= 1000 ? (v/1000).toFixed(0) + 'K' : v}`} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={80} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Bar dataKey="revenue" fill="#10B981" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Quick Actions & Recent Sales */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <Card className="p-5 lg:col-span-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => navigate('/merchant/pos/terminal')}
                    className="w-full flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30 rounded-xl transition-colors"
                  >
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                      <Play className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">Start Selling</p>
                      <p className="text-xs text-gray-500">Open POS Terminal</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>

                  <button
                    onClick={() => navigate('/merchant/pos/products')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">Add Product</p>
                      <p className="text-xs text-gray-500">Create new item</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>

                  <button
                    onClick={() => navigate('/merchant/pos/inventory')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Boxes className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">Stock Update</p>
                      <p className="text-xs text-gray-500">Adjust inventory</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>

                  <button
                    onClick={() => navigate('/merchant/pos/reports')}
                    className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                  >
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-gray-900 dark:text-white">View Reports</p>
                      <p className="text-xs text-gray-500">Sales analytics</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
                  </button>
                </div>
              </Card>

              {/* Recent Sales */}
              <Card className="p-5 lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Recent Sales</h3>
                  <button
                    onClick={() => navigate('/merchant/pos/sales')}
                    className="text-sm text-primary-600 hover:underline flex items-center gap-1"
                  >
                    View All <ArrowUpRight className="w-3 h-3" />
                  </button>
                </div>

                {recentSales.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No sales yet today</p>
                    <Button
                      onClick={() => navigate('/merchant/pos/terminal')}
                      size="sm"
                      className="mt-3"
                    >
                      Start Selling
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSales.map(sale => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        onClick={() => navigate(`/merchant/pos/sales?id=${sale.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{getPaymentMethodIcon(sale.payment_method)}</span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">#{sale.sale_number}</p>
                            <p className="text-xs text-gray-500">{formatTime(sale.created_at)}</p>
                          </div>
                        </div>
                        <p className="font-semibold text-green-600">{formatCurrency(sale.total_amount)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}

        {activeTab === 'management' && (
          <>
            {/* Management Sections */}
            <div className="space-y-6">
              {/* Sales & Operations */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Sales & Operations
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickLinks.filter(l => l.category === 'operations').map(link => (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href)}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-300 transition-all text-left"
                    >
                      <div className={`p-3 rounded-xl ${link.bgColor}`}>
                        <link.icon className={`w-6 h-6 ${link.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{link.title}</p>
                        <p className="text-xs text-gray-500">{link.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Product & Catalog */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Product & Catalog
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickLinks.filter(l => l.category === 'catalog').map(link => (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href)}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-300 transition-all text-left"
                    >
                      <div className={`p-3 rounded-xl ${link.bgColor}`}>
                        <link.icon className={`w-6 h-6 ${link.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{link.title}</p>
                        <p className="text-xs text-gray-500">{link.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* People */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  People Management
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickLinks.filter(l => l.category === 'people').map(link => (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href)}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-300 transition-all text-left"
                    >
                      <div className={`p-3 rounded-xl ${link.bgColor}`}>
                        <link.icon className={`w-6 h-6 ${link.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{link.title}</p>
                        <p className="text-xs text-gray-500">{link.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Financial */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Pricing & Financial
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickLinks.filter(l => l.category === 'financial').map(link => (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href)}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-300 transition-all text-left"
                    >
                      <div className={`p-3 rounded-xl ${link.bgColor}`}>
                        <link.icon className={`w-6 h-6 ${link.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{link.title}</p>
                        <p className="text-xs text-gray-500">{link.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Reports & Analytics */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Reports & Analytics
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickLinks.filter(l => l.category === 'reports').map(link => (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href)}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-300 transition-all text-left"
                    >
                      <div className={`p-3 rounded-xl ${link.bgColor}`}>
                        <link.icon className={`w-6 h-6 ${link.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{link.title}</p>
                        <p className="text-xs text-gray-500">{link.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Settings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  System Settings
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {quickLinks.filter(l => l.category === 'settings').map(link => (
                    <button
                      key={link.href}
                      onClick={() => navigate(link.href)}
                      className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-primary-300 transition-all text-left"
                    >
                      <div className={`p-3 rounded-xl ${link.bgColor}`}>
                        <link.icon className={`w-6 h-6 ${link.color}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{link.title}</p>
                        <p className="text-xs text-gray-500">{link.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </MerchantLayout>
  );
}

export default POSAppPage;
