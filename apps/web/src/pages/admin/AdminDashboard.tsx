import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  CreditCard,
  Wallet,
  AlertTriangle,
  CheckCircle,
  Clock,
  Activity,
  DollarSign,
  Layers,
  ShieldCheck,
  ArrowUpRight,
  Eye,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { currencyService, Currency } from '@/services/currency.service';

interface DashboardStats {
  totalAccounts: number;
  activeAccounts: number;
  totalCustomers: number;
  verifiedCustomers: number;
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
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    totalCustomers: 0,
    verifiedCustomers: 0,
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
  });

  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    fetchDashboardData();
  }, []);

  const currencySymbol = defaultCurrency?.symbol || '';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch user counts - using correct column names (roles, status)
      const { data: allUsers } = await supabase.from('users').select('id, status, kyc_status, roles');
      const users = allUsers?.filter(u => u.roles?.includes('user') && !u.roles?.includes('merchant') && !u.roles?.includes('agent')) || [];
      const merchants = allUsers?.filter(u => u.roles?.includes('merchant')) || [];
      const agents = allUsers?.filter(u => u.roles?.includes('agent')) || [];

      // Fetch card counts
      const { data: cards } = await supabase.from('cards').select('id, status, type');

      // Note: api_keys table doesn't exist yet, using 0 for active developers
      const developerIds = new Set<string>();

      // Fetch recent transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, amount, type, status, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch wallets for volume calculation
      const { data: wallets } = await supabase.from('wallets').select('balance');
      const totalVolume = wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;

      // Calculate stats
      setStats({
        totalAccounts: allUsers?.length || 0,
        activeAccounts: allUsers?.filter(u => u.status === 'ACTIVE').length || 0,
        totalCustomers: users.length,
        verifiedCustomers: users.filter(u => u.kyc_status === 'VERIFIED').length,
        totalCards: cards?.length || 0,
        activeCards: cards?.filter(c => c.status === 'active').length || 0,
        virtualCards: cards?.filter(c => c.type === 'virtual').length || 0,
        physicalCards: cards?.filter(c => c.type === 'physical').length || 0,
        cardPrograms: 0, // Will be fetched when card_programs table exists
        totalVolume,
        pendingAuthorizations: 0,
        disputesOpen: 0,
        apiRequests: 0, // Would come from analytics service
        webhookDeliveries: 0,
        avgResponseTime: 0,
        activeDevelopers: developerIds.size,
      });

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
        });
      }

      const inactiveUsers = users.filter(u => u.status !== 'ACTIVE').length;
      if (inactiveUsers > 0) {
        newPendingItems.push({
          type: 'users',
          description: `${inactiveUsers} inactive user account${inactiveUsers > 1 ? 's' : ''}`,
          priority: 'low',
        });
      }

      setPendingItems(newPendingItems);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400">Overview of your card issuing platform</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">Last updated: Just now</span>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              View Analytics
            </button>
          </div>
        </div>

        {/* Main Stats Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ staggerChildren: 0.1 }}
        >
          <MotionCard className="p-6" delay={0}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Accounts</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalAccounts.toLocaleString()}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.activeAccounts.toLocaleString()} active</p>
          </MotionCard>

          <MotionCard className="p-6" delay={0.1}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Customers</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers.toLocaleString()}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.verifiedCustomers.toLocaleString()} verified</p>
          </MotionCard>

          <MotionCard className="p-6" delay={0.2}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Cards Issued</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCards.toLocaleString()}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{stats.activeCards.toLocaleString()} active</p>
          </MotionCard>

          <MotionCard className="p-6" delay={0.3}>
            <div className="flex items-center justify-between mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Volume</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{currencySymbol}{(stats.totalVolume / 1000000).toFixed(2)}M</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">This month</p>
          </MotionCard>
        </motion.div>

        {/* Action Required Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <MotionCard className="p-6 border-l-4 border-l-yellow-500" delay={0.4}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <ShieldCheck className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Pending Authorizations</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stats.pendingAuthorizations} requests waiting</p>
                </div>
              </div>
              <Link to="/admin/authorization" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </MotionCard>

          <MotionCard className="p-6 border-l-4 border-l-red-500" delay={0.5}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Open Disputes</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stats.disputesOpen} disputes need attention</p>
                </div>
              </div>
              <Link to="/admin/disputes" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </MotionCard>

          <MotionCard className="p-6 border-l-4 border-l-blue-500" delay={0.6}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">Card Programs</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stats.cardPrograms} active programs</p>
                </div>
              </div>
              <Link to="/admin/card-programs" className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                <ArrowUpRight className="w-5 h-5" />
              </Link>
            </div>
          </MotionCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Transactions */}
          <MotionCard className="lg:col-span-2 p-6" delay={0.7}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h2>
              <Link to="/admin/transactions" className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1">
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
                    <th className="pb-3 font-medium">Amount</th>
                    <th className="pb-3 font-medium">Status</th>
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentTransactions.map((txn) => (
                    <tr key={txn.id} className="text-sm">
                      <td className="py-3 font-mono text-gray-600 dark:text-gray-400">{txn.id}</td>
                      <td className="py-3 text-gray-900 dark:text-white">{txn.customer}</td>
                      <td className="py-3 font-medium text-gray-900 dark:text-white">{formatCurrency(txn.amount)}</td>
                      <td className="py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                          txn.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                          txn.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400' :
                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        }`}>
                          {txn.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                          {txn.status === 'pending' && <Clock className="w-3 h-3" />}
                          {txn.status === 'flagged' && <AlertTriangle className="w-3 h-3" />}
                          {txn.status}
                        </span>
                      </td>
                      <td className="py-3 text-gray-500 dark:text-gray-400">{txn.time}</td>
                      <td className="py-3">
                        <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                          <Eye className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </MotionCard>

          {/* Pending Items */}
          <MotionCard className="p-6" delay={0.8}>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Action Required</h2>
            <div className="space-y-3">
              {pendingItems.map((item, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border-l-4 ${
                    item.priority === 'high' ? 'bg-red-50 dark:bg-red-900/20 border-l-red-500' :
                    item.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/20 border-l-yellow-500' :
                    'bg-blue-50 dark:bg-blue-900/20 border-l-blue-500'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{item.description}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 capitalize">{item.priority} priority</p>
                </div>
              ))}
            </div>
          </MotionCard>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MotionCard className="p-4 text-center" delay={0.9}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Virtual Cards</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.virtualCards.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.totalCards > 0 ? Math.round((stats.virtualCards / stats.totalCards) * 100) : 0}% of total
            </p>
          </MotionCard>
          <MotionCard className="p-4 text-center" delay={1.0}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Physical Cards</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.physicalCards.toLocaleString()}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {stats.totalCards > 0 ? Math.round((stats.physicalCards / stats.totalCards) * 100) : 0}% of total
            </p>
          </MotionCard>
          <MotionCard className="p-4 text-center" delay={1.1}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Merchants</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalAccounts - stats.totalCustomers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Business accounts
            </p>
          </MotionCard>
          <MotionCard className="p-4 text-center" delay={1.2}>
            <p className="text-sm text-gray-500 dark:text-gray-400">Active Developers</p>
            <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeDevelopers}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              With API keys
            </p>
          </MotionCard>
        </div>
      </div>
    </AdminLayout>
  );
}
