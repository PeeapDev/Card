import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  CreditCard,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Layers,
  ShieldCheck,
  ArrowUpRight,
  Eye,
  Bell,
  Package,
  CheckCheck,
  TrendingUp,
  TrendingDown,
  Building2,
  Calendar,
  Ticket,
  BarChart3,
  Activity,
  Store,
  ArrowUp,
  CircleDollarSign,
  UserCheck,
  CreditCardIcon,
  RefreshCw,
  Banknote,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { SafeResponsiveContainer } from '@/components/charts/SafeResponsiveContainer';
import { Card, MotionCard } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase, supabaseAdmin } from '@/lib/supabase';
import { currencyService, Currency } from '@/services/currency.service';
import { adminNotificationService, AdminNotification } from '@/services/adminNotification.service';
import { authService } from '@/services/auth.service';
import { useAuth } from '@/context/AuthContext';
import { FloatManagementModal } from '@/components/admin/FloatManagementModal';
import { FloatOverviewModal } from '@/components/admin/FloatOverviewModal';
import { mobileMoneyFloatService, EarningsSummary } from '@/services/mobileMoneyFloat.service';

interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  totalCustomers: number;
  verifiedCustomers: number;
  totalMerchants: number;
  activeMerchants: number;
  totalCards: number;
  activeCards: number;
  virtualCards: number;
  physicalCards: number;
  cardPrograms: number;
  totalVolume: number;
  pendingAuthorizations: number;
  disputesOpen: number;
  apiRequests: number;
  webhookDeliveries: number;
  avgResponseTime: number;
  activeDevelopers: number;
  pageViewsToday: number;
  pageViewsTotal: number;
  uniqueVisitorsToday: number;
  // Events stats
  totalEvents: number;
  publishedEvents: number;
  totalTicketsSold: number;
  eventRevenue: number;
  // Transaction stats
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  pendingTransactions: number;
}

interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  status: string;
  created_at: string;
  user?: { first_name: string; last_name: string };
}

interface PendingItem {
  type: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  link?: string;
}

interface ChartData {
  name: string;
  value: number;
  transactions?: number;
  revenue?: number;
  tickets?: number;
  businesses?: number;
  events?: number;
  [key: string]: string | number | undefined;
}

// Chart colors
const CHART_COLORS = {
  primary: '#6366f1',
  secondary: '#22c55e',
  tertiary: '#f59e0b',
  quaternary: '#ef4444',
  purple: '#a855f7',
  cyan: '#06b6d4',
};

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

// Cache key for localStorage
const DASHBOARD_STATS_CACHE_KEY = 'admin_dashboard_stats';
const DASHBOARD_EARNINGS_CACHE_KEY = 'admin_dashboard_earnings';

// Load cached stats from localStorage
const loadCachedStats = (): DashboardStats | null => {
  try {
    const cached = localStorage.getItem(DASHBOARD_STATS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Error loading cached stats:', e);
  }
  return null;
};

// Load cached earnings from localStorage
const loadCachedEarnings = (): EarningsSummary | null => {
  try {
    const cached = localStorage.getItem(DASHBOARD_EARNINGS_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Error loading cached earnings:', e);
  }
  return null;
};

// Save stats to localStorage
const saveCachedStats = (stats: DashboardStats) => {
  try {
    localStorage.setItem(DASHBOARD_STATS_CACHE_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Error saving cached stats:', e);
  }
};

// Save earnings to localStorage
const saveCachedEarnings = (earnings: EarningsSummary) => {
  try {
    localStorage.setItem(DASHBOARD_EARNINGS_CACHE_KEY, JSON.stringify(earnings));
  } catch (e) {
    console.error('Error saving cached earnings:', e);
  }
};

const defaultStats: DashboardStats = {
  totalAccounts: 0,
  activeAccounts: 0,
  totalCustomers: 0,
  verifiedCustomers: 0,
  totalMerchants: 0,
  activeMerchants: 0,
  totalCards: 0,
  activeCards: 0,
  virtualCards: 0,
  physicalCards: 0,
  cardPrograms: 0,
  totalVolume: 0,
  pendingAuthorizations: 0,
  disputesOpen: 0,
  apiRequests: 0,
  webhookDeliveries: 0,
  avgResponseTime: 0,
  activeDevelopers: 0,
  pageViewsToday: 0,
  pageViewsTotal: 0,
  uniqueVisitorsToday: 0,
  totalEvents: 0,
  publishedEvents: 0,
  totalTicketsSold: 0,
  eventRevenue: 0,
  totalTransactions: 0,
  successfulTransactions: 0,
  failedTransactions: 0,
  pendingTransactions: 0,
};

export function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load from cache immediately for instant render
  const [stats, setStats] = useState<DashboardStats>(() => loadCachedStats() || defaultStats);

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Only show loading skeleton if there's no cached data
  const hasCachedData = loadCachedStats() !== null;
  const [loading, setLoading] = useState(!hasCachedData);
  const [refreshing, setRefreshing] = useState(false);

  // Chart data
  const [transactionChartData, setTransactionChartData] = useState<ChartData[]>([]);
  const [businessChartData, setBusinessChartData] = useState<ChartData[]>([]);
  const [eventChartData, setEventChartData] = useState<ChartData[]>([]);
  const [transactionTypeData, setTransactionTypeData] = useState<ChartData[]>([]);
  const [businessCategoryData, setBusinessCategoryData] = useState<ChartData[]>([]);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // System Float Modal state
  const [floatOverviewOpen, setFloatOverviewOpen] = useState(false);
  const [floatModalOpen, setFloatModalOpen] = useState(false);
  const [floatModalMode, setFloatModalMode] = useState<'open' | 'replenish' | 'close' | 'history'>('open');
  const [floatModalCurrency, setFloatModalCurrency] = useState<string | undefined>();
  const [floatSidebarKey, setFloatSidebarKey] = useState(0);

  // Load earnings from cache for instant render
  const [platformEarnings, setPlatformEarnings] = useState<EarningsSummary>(() => loadCachedEarnings() || {
    totalEarnings: 0,
    depositFees: 0,
    withdrawalFees: 0,
    transactionFees: 0,
    checkoutFees: 0,
    count: 0,
  });

  // Multi-currency earnings
  const [earningsByCurrency, setEarningsByCurrency] = useState<Record<string, EarningsSummary>>({});

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);

    if (user) {
      fetchDashboardData();
      fetchAdminNotifications();
    }

    const unsubscribe = adminNotificationService.subscribeToNotifications((notification) => {
      setAdminNotifications((prev) => [notification, ...prev].slice(0, 10));
      setUnreadNotificationCount((prev) => prev + 1);
    });

    return () => {
      unsubscribe();
    };
  }, [user]);

  const fetchAdminNotifications = async () => {
    try {
      const [notifications, unreadCount] = await Promise.all([
        adminNotificationService.getNotifications({ limit: 10 }),
        adminNotificationService.getUnreadCount(),
      ]);
      setAdminNotifications(notifications);
      setUnreadNotificationCount(unreadCount);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    try {
      await adminNotificationService.markAsRead(notificationId, user.id);
      setAdminNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, status: 'read' as const } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await adminNotificationService.markAllAsRead(user.id);
      setAdminNotifications((prev) =>
        prev.map((n) => ({ ...n, status: 'read' as const }))
      );
      setUnreadNotificationCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification: AdminNotification) => {
    handleMarkAsRead(notification.id);
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'card_order':
        return <Package className="w-4 h-4" />;
      case 'kyc_request':
        return <ShieldCheck className="w-4 h-4" />;
      case 'dispute':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-l-red-500';
      case 'high':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-l-orange-500';
      case 'medium':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border-l-yellow-500';
      default:
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-l-blue-500';
    }
  };

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatCompactNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch user counts
      const { data: allUsers } = await supabase.from('users').select('id, status, kyc_status, roles, created_at');
      const users = allUsers?.filter(u => u.roles?.includes('user') && !u.roles?.includes('merchant') && !u.roles?.includes('agent')) || [];
      const merchants = allUsers?.filter(u => u.roles?.includes('merchant')) || [];

      // Fetch businesses
      const { data: businesses } = await supabaseAdmin.from('businesses').select('id, category, status, created_at');

      // Fetch card counts
      const { data: cards } = await supabase.from('cards').select('id, status, type');

      // Calculate date 30 days ago for filtering
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

      // Fetch transactions - only completed ones for accurate analytics
      const { data: allTransactions, error: txnError } = await supabase
        .from('transactions')
        .select('id, amount, type, status, created_at, user_id')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgoISO)
        .order('created_at', { ascending: false });

      if (txnError) {
        console.error('Error fetching transactions:', txnError);
      }

      // Debug: Log transaction types found
      if (allTransactions && allTransactions.length > 0) {
        const typeCount: Record<string, number> = {};
        allTransactions.forEach(t => {
          typeCount[t.type] = (typeCount[t.type] || 0) + 1;
        });
        console.log('[AdminDashboard] Transaction types (last 30 days, completed):', typeCount);
      } else {
        console.log('[AdminDashboard] No completed transactions found in last 30 days');
      }

      // Fetch all transactions for overall stats (not filtered by date)
      const { data: allTimeTransactions } = await supabase
        .from('transactions')
        .select('id, status');

      // Fetch recent transactions for the table
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, amount, type, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch wallets for volume calculation
      const { data: wallets } = await supabase.from('wallets').select('balance');
      const totalVolume = wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;

      // Fetch events data
      const { data: events } = await supabaseAdmin.from('events').select('id, status, tickets_sold, total_revenue, created_at');
      const { data: eventTickets } = await supabaseAdmin.from('event_tickets').select('id, price_paid, created_at');

      // Fetch page views analytics via API
      let pageViewsToday = 0;
      let pageViewsTotal = 0;
      let uniqueVisitorsToday = 0;

      try {
        const accessToken = authService.getAccessToken();
        if (accessToken) {
          const analyticsRes = await fetch(`/api/analytics/summary?period=24h`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          });
          if (analyticsRes.ok) {
            const analyticsData = await analyticsRes.json();
            pageViewsToday = analyticsData.totalViews || 0;
            uniqueVisitorsToday = analyticsData.uniqueVisitors || 0;
            pageViewsTotal = analyticsData.totalViews || 0;
          }
        }
      } catch (err) {
        // Analytics fetch failed silently
      }

      // Fetch platform earnings
      try {
        const earningsResponse = await mobileMoneyFloatService.getEarnings('month');
        if (earningsResponse.success) {
          setPlatformEarnings(earningsResponse.summary);
          saveCachedEarnings(earningsResponse.summary);
          // Set multi-currency earnings
          if (earningsResponse.earningsByCurrency) {
            setEarningsByCurrency(earningsResponse.earningsByCurrency);
          }
        }
      } catch (err) {
        // Earnings fetch failed silently
      }

      // Calculate transaction stats from all-time data
      const successfulTxns = allTimeTransactions?.filter(t => t.status === 'completed').length || 0;
      const failedTxns = allTimeTransactions?.filter(t => t.status === 'failed').length || 0;
      const pendingTxns = allTimeTransactions?.filter(t => t.status === 'pending').length || 0;
      const totalTxns = allTimeTransactions?.length || 0;

      // Calculate event stats
      const publishedEventsCount = events?.filter(e => e.status === 'published').length || 0;
      const totalTicketsSold = events?.reduce((sum, e) => sum + (e.tickets_sold || 0), 0) || 0;
      const eventRevenueTotal = events?.reduce((sum, e) => sum + (e.total_revenue || 0), 0) || 0;

      // Generate chart data - Transaction trends (last 7 days)
      const transactionsByDay = generateDailyChartData(allTransactions || [], 7);
      setTransactionChartData(transactionsByDay);

      // Generate transaction type distribution
      const txnTypeMap: Record<string, number> = {};
      allTransactions?.forEach(t => {
        const type = t.type || 'other';
        txnTypeMap[type] = (txnTypeMap[type] || 0) + 1;
      });
      setTransactionTypeData(
        Object.entries(txnTypeMap)
          .map(([name, value]) => ({ name: formatTypeName(name), value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
      );

      // Generate business growth data
      const businessesByDay = generateDailyChartData(businesses || [], 30, 'businesses');
      setBusinessChartData(businessesByDay);

      // Generate business category distribution
      const categoryMap: Record<string, number> = {};
      businesses?.forEach(b => {
        const category = b.category || 'Uncategorized';
        categoryMap[category] = (categoryMap[category] || 0) + 1;
      });
      setBusinessCategoryData(
        Object.entries(categoryMap)
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
      );

      // Generate event chart data
      const eventsByMonth = generateMonthlyEventData(events || [], eventTickets || []);
      setEventChartData(eventsByMonth);

      // Set stats and cache for instant render next time
      const newStats: DashboardStats = {
        totalAccounts: allUsers?.length || 0,
        activeAccounts: allUsers?.filter(u => u.status === 'ACTIVE').length || 0,
        totalCustomers: users.length,
        verifiedCustomers: users.filter(u => u.kyc_status === 'VERIFIED').length,
        totalMerchants: merchants.length,
        activeMerchants: merchants.filter(m => m.status === 'ACTIVE').length,
        totalCards: cards?.length || 0,
        activeCards: cards?.filter(c => c.status === 'active').length || 0,
        virtualCards: cards?.filter(c => c.type === 'virtual').length || 0,
        physicalCards: cards?.filter(c => c.type === 'physical').length || 0,
        cardPrograms: 0,
        totalVolume,
        pendingAuthorizations: 0,
        disputesOpen: 0,
        apiRequests: 0,
        webhookDeliveries: 0,
        avgResponseTime: 0,
        activeDevelopers: 0,
        pageViewsToday,
        pageViewsTotal: pageViewsTotal || 0,
        uniqueVisitorsToday,
        totalEvents: events?.length || 0,
        publishedEvents: publishedEventsCount,
        totalTicketsSold,
        eventRevenue: eventRevenueTotal,
        totalTransactions: totalTxns,
        successfulTransactions: successfulTxns,
        failedTransactions: failedTxns,
        pendingTransactions: pendingTxns,
      };
      setStats(newStats);
      saveCachedStats(newStats);

      // Format recent transactions
      if (transactions && transactions.length > 0) {
        const userIds = [...new Set(transactions.map(t => t.user_id))];
        const { data: txnUsers } = await supabase
          .from('users')
          .select('id, first_name, last_name')
          .in('id', userIds);

        const userMap = new Map(txnUsers?.map(u => [u.id, u]) || []);

        setRecentTransactions(transactions.map(txn => {
          const user = userMap.get(txn.user_id);
          const timeAgo = getTimeAgo(new Date(txn.created_at));
          return {
            id: txn.id.slice(0, 8).toUpperCase(),
            customer: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
            amount: txn.amount,
            type: txn.type,
            status: txn.status,
            time: timeAgo,
          };
        }));
      }

      // Calculate pending items
      const pendingKyc = users.filter(u => u.kyc_status === 'PENDING').length;
      const newPendingItems: PendingItem[] = [];

      if (pendingKyc > 0) {
        newPendingItems.push({
          type: 'kyc',
          description: `${pendingKyc} KYC verification${pendingKyc > 1 ? 's' : ''} awaiting review`,
          priority: pendingKyc > 10 ? 'high' : 'medium',
          link: '/admin/users',
        });
      }

      const inactiveUsers = users.filter(u => u.status !== 'ACTIVE').length;
      if (inactiveUsers > 0) {
        newPendingItems.push({
          type: 'users',
          description: `${inactiveUsers} inactive user account${inactiveUsers > 1 ? 's' : ''}`,
          priority: 'low',
          link: '/admin/users',
        });
      }

      setPendingItems(newPendingItems);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboardData();
  };

  // Helper functions for chart data generation
  const generateDailyChartData = (data: any[], days: number, type: string = 'transactions') => {
    const result: ChartData[] = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });

      const dayData = data.filter(item => {
        const itemDate = new Date(item.created_at).toISOString().split('T')[0];
        return itemDate === dateStr;
      });

      if (type === 'transactions') {
        const revenue = dayData.reduce((sum, t) => sum + (t.amount || 0), 0);
        result.push({
          name: dayName,
          value: dayData.length,
          transactions: dayData.length,
          revenue,
        });
      } else {
        result.push({
          name: dayName,
          value: dayData.length,
          businesses: dayData.length,
        });
      }
    }
    return result;
  };

  const generateMonthlyEventData = (events: any[], tickets: any[]) => {
    const result: ChartData[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const date = new Date(now);
      date.setMonth(date.getMonth() - i);
      const monthName = date.toLocaleDateString('en-US', { month: 'short' });
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthEvents = events.filter(e => {
        const eventDate = new Date(e.created_at);
        return eventDate >= monthStart && eventDate <= monthEnd;
      });

      const monthTickets = tickets.filter(t => {
        const ticketDate = new Date(t.created_at);
        return ticketDate >= monthStart && ticketDate <= monthEnd;
      });

      const revenue = monthTickets.reduce((sum, t) => sum + (t.price_paid || 0), 0);

      result.push({
        name: monthName,
        value: monthEvents.length,
        events: monthEvents.length,
        tickets: monthTickets.length,
        revenue,
      });
    }
    return result;
  };

  const formatTypeName = (type: string): string => {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const getTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr ago`;
    return `${Math.floor(hours / 24)} days ago`;
  };

  // Float management handlers
  const handleOpenFloat = () => {
    setFloatModalMode('open');
    setFloatModalCurrency(undefined);
    setFloatModalOpen(true);
  };

  const handleReplenishFloat = (currency: string) => {
    setFloatModalMode('replenish');
    setFloatModalCurrency(currency);
    setFloatModalOpen(true);
  };

  const handleCloseFloat = (currency: string) => {
    setFloatModalMode('close');
    setFloatModalCurrency(currency);
    setFloatModalOpen(true);
  };

  const handleViewHistory = (currency: string) => {
    setFloatModalMode('history');
    setFloatModalCurrency(currency);
    setFloatModalOpen(true);
  };

  const handleFloatModalClose = () => {
    setFloatModalOpen(false);
    setFloatModalCurrency(undefined);
  };

  const handleFloatSuccess = () => {
    setFloatSidebarKey(prev => prev + 1);
  };

  // Custom Tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {entry.name.toLowerCase().includes('revenue') ? formatCurrency(entry.value) : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <AdminLayout>
      <div className="relative">
        {/* Main Content */}
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
              <p className="text-gray-500 dark:text-gray-400">Welcome back! Here's what's happening today.</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <div className="flex items-center gap-3 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
                <Eye className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div className="text-sm">
                  <span className="font-semibold text-indigo-700 dark:text-indigo-300">{stats.pageViewsToday.toLocaleString()}</span>
                  <span className="text-indigo-600 dark:text-indigo-400 ml-1">visits today</span>
                </div>
              </div>

              {/* System Float Button */}
              <button
                onClick={() => setFloatOverviewOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg shadow-sm bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white transition-all duration-200"
                title="System Float Management"
              >
                <Banknote className="w-4 h-4" />
                <span className="text-sm font-medium">Float</span>
              </button>
            </div>
          </div>

          {/* ==================== OVERVIEW SECTION ==================== */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Overview</h2>
            </div>
            <motion.div
              className="grid grid-cols-2 md:grid-cols-4 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ staggerChildren: 0.1 }}
            >
              {/* Total Volume */}
              <Link to="/admin/wallets">
                <MotionCard className="p-5 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 transition-all cursor-pointer" delay={0}>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <CircleDollarSign className="w-5 h-5" />
                    </div>
                    <span className="flex items-center text-xs text-indigo-100">
                      <ArrowUpRight className="w-3 h-3 mr-1" />
                      View
                    </span>
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-24 mt-3 bg-white/20" />
                  ) : (
                    <p className="text-2xl font-bold mt-3">{currencySymbol}{formatCompactNumber(stats.totalVolume)}</p>
                  )}
                  <p className="text-sm text-indigo-100 mt-1">Total Volume</p>
                </MotionCard>
              </Link>

              {/* Total Users */}
              <Link to="/admin/users">
                <MotionCard className="p-5 hover:shadow-lg transition-all cursor-pointer" delay={0.1}>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    {loading ? (
                      <Skeleton className="h-4 w-8" />
                    ) : (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                        <ArrowUp className="w-3 h-3" />
                        {stats.activeAccounts} active
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-20 mt-3" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{stats.totalAccounts.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Users</p>
                </MotionCard>
              </Link>

              {/* Transactions */}
              <Link to="/admin/transactions">
                <MotionCard className="p-5 hover:shadow-lg transition-all cursor-pointer" delay={0.2}>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    {loading ? (
                      <Skeleton className="h-4 w-16" />
                    ) : (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center">
                        {stats.successfulTransactions} completed
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-20 mt-3" />
                  ) : (
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-3">{stats.totalTransactions.toLocaleString()}</p>
                  )}
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Transactions</p>
                </MotionCard>
              </Link>

              {/* Today's Profit */}
              <div onClick={() => setFloatOverviewOpen(true)} className="cursor-pointer">
                <MotionCard className="p-5 hover:shadow-lg transition-all bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800" delay={0.3}>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    {loading ? (
                      <Skeleton className="h-4 w-12" />
                    ) : (
                      <span className="text-xs text-emerald-600 dark:text-emerald-400">
                        {platformEarnings.count || 0} txns
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-24 mt-3" />
                  ) : (
                    <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-3">
                      {currencySymbol} {platformEarnings.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  )}
                  <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-1">Today's Profit</p>
                </MotionCard>
              </div>
            </motion.div>

            {/* Platform Profit Card - Multi-Currency */}
            <motion.div
              className="mt-4 cursor-pointer"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => setFloatOverviewOpen(true)}
            >
              <Card className="p-5 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 text-white hover:shadow-xl transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm text-emerald-100">Platform Profit (This Month)</p>
                      <p className="text-xs text-emerald-200/70">{platformEarnings.count} transactions</p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-emerald-100" />
                </div>

                {/* Multi-Currency Profit Display */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* SLE Profit */}
                  <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🇸🇱</span>
                      <span className="text-xs text-emerald-100">Leones (SLE)</span>
                    </div>
                    {loading ? (
                      <Skeleton className="h-8 w-28 bg-white/20" />
                    ) : (
                      <p className="text-2xl font-bold">
                        NLe {(earningsByCurrency?.SLE?.totalEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                    <p className="text-xs text-emerald-200/70 mt-1">
                      {earningsByCurrency?.SLE?.count || 0} txns
                    </p>
                  </div>

                  {/* USD Profit */}
                  <div className="p-3 bg-white/10 rounded-xl border border-white/20">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">🇺🇸</span>
                      <span className="text-xs text-emerald-100">Dollars (USD)</span>
                    </div>
                    {loading ? (
                      <Skeleton className="h-8 w-28 bg-white/20" />
                    ) : (
                      <p className="text-2xl font-bold">
                        $ {(earningsByCurrency?.USD?.totalEarnings || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                    )}
                    <p className="text-xs text-emerald-200/70 mt-1">
                      {earningsByCurrency?.USD?.count || 0} txns
                    </p>
                  </div>
                </div>

                {/* Fee Breakdown (Combined) */}
                <div className="grid grid-cols-4 gap-3 pt-3 border-t border-white/20">
                  <div className="text-center">
                    <p className="text-sm font-bold">{currencySymbol} {platformEarnings.withdrawalFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-emerald-100">Withdrawals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">{currencySymbol} {platformEarnings.transactionFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-emerald-100">Transactions</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">{currencySymbol} {platformEarnings.checkoutFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-emerald-100">Checkout</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold">{currencySymbol} {platformEarnings.depositFees.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    <p className="text-xs text-emerald-100">Subs</p>
                  </div>
                </div>
              </Card>
            </motion.div>
          </section>

          {/* ==================== TRANSACTION ANALYTICS SECTION ==================== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction Analytics</h2>
              </div>
              <Link to="/admin/transactions" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Transaction Trend Chart */}
              <MotionCard className="lg:col-span-2 p-6" delay={0.4}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Transaction Trends (Last 7 Days)</h3>
                <SafeResponsiveContainer height={256} className="h-64">
                  <AreaChart data={transactionChartData}>
                    <defs>
                      <linearGradient id="transactionGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.secondary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="transactions"
                      stroke={CHART_COLORS.primary}
                      fill="url(#transactionGradient)"
                      name="Transactions"
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={CHART_COLORS.secondary}
                      fill="url(#revenueGradient)"
                      name="Revenue"
                    />
                  </AreaChart>
                </SafeResponsiveContainer>
              </MotionCard>

              {/* Transaction Type Distribution */}
              <MotionCard className="p-6" delay={0.5}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Transaction Types</h3>
                <SafeResponsiveContainer height={256} className="h-64">
                  <PieChart>
                    <Pie
                      data={transactionTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {transactionTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </SafeResponsiveContainer>
                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    {loading ? (
                      <Skeleton className="h-5 w-12 mx-auto" />
                    ) : (
                      <p className="text-lg font-bold text-green-600 dark:text-green-400">{stats.successfulTransactions}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">Successful</p>
                  </div>
                  <div className="text-center">
                    {loading ? (
                      <Skeleton className="h-5 w-10 mx-auto" />
                    ) : (
                      <p className="text-lg font-bold text-red-600 dark:text-red-400">{stats.failedTransactions}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">Failed</p>
                  </div>
                </div>
              </MotionCard>
            </div>
          </section>

          {/* ==================== BUSINESS ANALYTICS SECTION ==================== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Business Analytics</h2>
              </div>
              <Link to="/admin/businesses" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Business Stats Cards */}
              <div className="grid grid-cols-2 gap-4">
                <MotionCard className="p-4" delay={0.6}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                      <Store className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-6 w-10" />
                      ) : (
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalMerchants}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Merchants</p>
                    </div>
                  </div>
                </MotionCard>
                <MotionCard className="p-4" delay={0.65}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                      <UserCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-6 w-8" />
                      ) : (
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeMerchants}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Active</p>
                    </div>
                  </div>
                </MotionCard>
                <MotionCard className="p-4" delay={0.7}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                      <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-6 w-10" />
                      ) : (
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Customers</p>
                    </div>
                  </div>
                </MotionCard>
                <MotionCard className="p-4" delay={0.75}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                      <ShieldCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      {loading ? (
                        <Skeleton className="h-6 w-8" />
                      ) : (
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.verifiedCustomers}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Verified</p>
                    </div>
                  </div>
                </MotionCard>
              </div>

              {/* Business Growth Chart */}
              <MotionCard className="lg:col-span-2 p-6" delay={0.8}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Business Registrations (Last 30 Days)</h3>
                <SafeResponsiveContainer height={208} className="h-52">
                  <BarChart data={businessChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="businesses" fill={CHART_COLORS.tertiary} name="New Businesses" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </SafeResponsiveContainer>
              </MotionCard>
            </div>
          </section>

          {/* ==================== EVENTS ANALYTICS SECTION ==================== */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Events Analytics</h2>
              </div>
              <Link to="/admin/events" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1">
                View All <ArrowUpRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Stats Cards */}
              <div className="space-y-4">
                <MotionCard className="p-5 bg-gradient-to-br from-purple-500 to-purple-600 text-white" delay={0.85}>
                  <div className="flex items-center justify-between">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Calendar className="w-5 h-5" />
                    </div>
                    {loading ? (
                      <Skeleton className="h-5 w-20 bg-white/20" />
                    ) : (
                      <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                        {stats.publishedEvents} published
                      </span>
                    )}
                  </div>
                  {loading ? (
                    <Skeleton className="h-9 w-16 mt-3 bg-white/20" />
                  ) : (
                    <p className="text-3xl font-bold mt-3">{stats.totalEvents}</p>
                  )}
                  <p className="text-sm text-purple-100 mt-1">Total Events</p>
                </MotionCard>

                <div className="grid grid-cols-2 gap-4">
                  <MotionCard className="p-4" delay={0.9}>
                    <div className="text-center">
                      <div className="p-2 bg-cyan-100 dark:bg-cyan-900/30 rounded-lg w-fit mx-auto mb-2">
                        <Ticket className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      {loading ? (
                        <Skeleton className="h-6 w-12 mx-auto" />
                      ) : (
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCompactNumber(stats.totalTicketsSold)}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Tickets Sold</p>
                    </div>
                  </MotionCard>
                  <MotionCard className="p-4" delay={0.95}>
                    <div className="text-center">
                      <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg w-fit mx-auto mb-2">
                        <DollarSign className="w-5 h-5 text-green-600 dark:text-green-400" />
                      </div>
                      {loading ? (
                        <Skeleton className="h-6 w-16 mx-auto" />
                      ) : (
                        <p className="text-xl font-bold text-gray-900 dark:text-white">{currencySymbol}{formatCompactNumber(stats.eventRevenue)}</p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                    </div>
                  </MotionCard>
                </div>
              </div>

              {/* Events Chart */}
              <MotionCard className="lg:col-span-2 p-6" delay={1}>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">Events & Ticket Sales (Last 6 Months)</h3>
                <SafeResponsiveContainer height={208} className="h-52">
                  <BarChart data={eventChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis yAxisId="left" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="events" fill={CHART_COLORS.purple} name="Events Created" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="tickets" fill={CHART_COLORS.cyan} name="Tickets Sold" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </SafeResponsiveContainer>
              </MotionCard>
            </div>
          </section>

          {/* ==================== QUICK ACTIONS & NOTIFICATIONS SECTION ==================== */}
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Action Required */}
              <MotionCard className="p-6" delay={1.05}>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Action Required</h2>
                </div>

                {pendingItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500 opacity-50" />
                    <p>All caught up!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingItems.map((item, index) => (
                      <Link
                        key={index}
                        to={item.link || '#'}
                        className={`block p-3 rounded-lg border-l-4 transition-all hover:shadow-md ${
                          item.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-l-red-500' :
                          item.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-500' :
                          'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500'
                        }`}
                      >
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{item.description}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">{item.priority} priority</p>
                      </Link>
                    ))}
                  </div>
                )}
              </MotionCard>

              {/* Notifications */}
              <MotionCard className="lg:col-span-2 p-6" delay={1.1}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
                    {unreadNotificationCount > 0 && (
                      <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-500 rounded-full">
                        {unreadNotificationCount}
                      </span>
                    )}
                  </div>
                  {unreadNotificationCount > 0 && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Mark all read
                    </button>
                  )}
                </div>

                {adminNotifications.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No notifications yet</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {adminNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification)}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer transition-all hover:shadow-md ${
                          notification.status === 'unread'
                            ? getNotificationColor(notification.priority)
                            : 'bg-gray-50 dark:bg-gray-800/50 border-l-gray-300 dark:border-l-gray-600'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            notification.status === 'unread'
                              ? getNotificationColor(notification.priority).split(' ').slice(0, 2).join(' ')
                              : 'bg-gray-200 dark:bg-gray-700'
                          }`}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm font-medium ${
                                notification.status === 'unread'
                                  ? 'text-gray-900 dark:text-white'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {notification.title}
                              </p>
                              {notification.status === 'unread' && (
                                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 truncate">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {getTimeAgo(new Date(notification.createdAt))}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </MotionCard>
            </div>
          </section>

          {/* ==================== RECENT TRANSACTIONS TABLE ==================== */}
          <section>
            <MotionCard className="p-6" delay={1.15}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
                </div>
                <Link to="/admin/transactions" className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center gap-1">
                  View all
                  <ArrowUpRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <th className="pb-3 font-medium">Transaction ID</th>
                      <th className="pb-3 font-medium">Customer</th>
                      <th className="pb-3 font-medium">Type</th>
                      <th className="pb-3 font-medium">Amount</th>
                      <th className="pb-3 font-medium">Status</th>
                      <th className="pb-3 font-medium">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {recentTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-500 dark:text-gray-400">
                          No recent transactions
                        </td>
                      </tr>
                    ) : (
                      recentTransactions.map((txn) => (
                        <tr key={txn.id} className="text-sm hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="py-3 font-mono text-gray-600 dark:text-gray-400">{txn.id}</td>
                          <td className="py-3 text-gray-900 dark:text-white">{txn.customer}</td>
                          <td className="py-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                              {formatTypeName(txn.type)}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(txn.amount)}</td>
                          <td className="py-3">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              txn.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              txn.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                              'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                            }`}>
                              {txn.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                              {txn.status === 'pending' && <Clock className="w-3 h-3" />}
                              {txn.status === 'failed' && <AlertTriangle className="w-3 h-3" />}
                              {txn.status}
                            </span>
                          </td>
                          <td className="py-3 text-gray-500 dark:text-gray-400">{txn.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </MotionCard>
          </section>

          {/* ==================== QUICK STATS SECTION ==================== */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Stats</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <MotionCard className="p-4 text-center" delay={1.2}>
                <CreditCardIcon className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                {loading ? (
                  <Skeleton className="h-6 w-10 mx-auto" />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.virtualCards.toLocaleString()}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Virtual Cards</p>
              </MotionCard>
              <MotionCard className="p-4 text-center" delay={1.25}>
                <CreditCard className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                {loading ? (
                  <Skeleton className="h-6 w-10 mx-auto" />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.physicalCards.toLocaleString()}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Physical Cards</p>
              </MotionCard>
              <MotionCard className="p-4 text-center" delay={1.3}>
                <ShieldCheck className="w-6 h-6 mx-auto mb-2 text-green-500" />
                {loading ? (
                  <Skeleton className="h-6 w-10 mx-auto" />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.verifiedCustomers}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Verified Users</p>
              </MotionCard>
              <MotionCard className="p-4 text-center" delay={1.35}>
                <Clock className="w-6 h-6 mx-auto mb-2 text-yellow-500" />
                {loading ? (
                  <Skeleton className="h-6 w-10 mx-auto" />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.pendingTransactions}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Txns</p>
              </MotionCard>
              <MotionCard className="p-4 text-center" delay={1.4}>
                <Eye className="w-6 h-6 mx-auto mb-2 text-indigo-500" />
                {loading ? (
                  <Skeleton className="h-6 w-10 mx-auto" />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.uniqueVisitorsToday}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Unique Visitors</p>
              </MotionCard>
              <MotionCard className="p-4 text-center" delay={1.45}>
                <Activity className="w-6 h-6 mx-auto mb-2 text-cyan-500" />
                {loading ? (
                  <Skeleton className="h-6 w-10 mx-auto" />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeDevelopers}</p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Devs</p>
              </MotionCard>
            </div>
          </section>
        </div>
      </div>

      {/* Float Overview Modal */}
      <FloatOverviewModal
        isOpen={floatOverviewOpen}
        onClose={() => setFloatOverviewOpen(false)}
        onOpenFloat={handleOpenFloat}
        onReplenishFloat={handleReplenishFloat}
        onCloseFloat={handleCloseFloat}
        onViewHistory={handleViewHistory}
        sidebarKey={floatSidebarKey}
      />

      {/* Float Management Modal */}
      <FloatManagementModal
        isOpen={floatModalOpen}
        onClose={handleFloatModalClose}
        mode={floatModalMode}
        currency={floatModalCurrency}
        onSuccess={handleFloatSuccess}
      />
    </AdminLayout>
  );
}
