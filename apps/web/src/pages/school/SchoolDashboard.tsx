import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SchoolLayout } from '@/components/school';
import {
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  Wallet,
  Receipt,
  UserCog,
  Calculator,
  Banknote,
  FileText,
  BarChart3,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalStaff: number;
  totalVendors: number;
  totalTransactions: number;
  totalVolume: number;
  todayTransactions: number;
  todayVolume: number;
  pendingFees: number;
  collectedFees: number;
  pendingSalaries: number;
  paidSalaries: number;
}

interface RecentTransaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  student_name?: string;
  staff_name?: string;
}

export function SchoolDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalStaff: 0,
    totalVendors: 0,
    totalTransactions: 0,
    totalVolume: 0,
    todayTransactions: 0,
    todayVolume: 0,
    pendingFees: 0,
    collectedFees: 0,
    pendingSalaries: 0,
    paidSalaries: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get school domain from localStorage (set during SSO login)
  const getSchoolDomain = () => {
    // Try to get from various possible storage keys
    const schoolId = localStorage.getItem('schoolId');
    const schoolDomain = localStorage.getItem('school_domain');

    // If we have a school domain stored, use it
    if (schoolDomain) return schoolDomain;

    // Try to extract from schoolId if it contains domain info
    if (schoolId) {
      // The school domain format is typically: subdomain.gov.school.edu.sl
      // For now, we'll need to get this from the school registry or SSO context
      return schoolId;
    }

    return null;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      const schoolDomain = getSchoolDomain();

      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Fetch summary data from SDSL2 sync API
      const response = await fetch(
        `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/summary`,
        {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Map SDSL2 response to our stats interface
        setStats({
          totalStudents: data.total_students || data.students_count || 0,
          activeStudents: data.active_students || data.enrolled_students || 0,
          totalStaff: data.total_staff || data.staff_count || 0,
          totalVendors: data.total_vendors || data.vendors_count || 0,
          totalTransactions: data.total_transactions || 0,
          totalVolume: data.total_volume || data.total_revenue || 0,
          todayTransactions: data.today_transactions || 0,
          todayVolume: data.today_volume || data.today_revenue || 0,
          pendingFees: data.pending_fees || data.outstanding_invoices || 0,
          collectedFees: data.collected_fees || data.paid_invoices || 0,
          pendingSalaries: data.pending_salaries || data.unpaid_salaries || 0,
          paidSalaries: data.paid_salaries || 0,
        });

        // Get recent transactions if included
        if (data.recent_transactions) {
          setRecentTransactions(data.recent_transactions.slice(0, 5).map((tx: any) => ({
            id: tx.id,
            type: tx.type || 'payment',
            amount: tx.amount,
            description: tx.description || tx.narration || tx.title,
            date: tx.date || tx.created_at,
            student_name: tx.student_name,
            staff_name: tx.staff_name,
          })));
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || 'Failed to load dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not connect to school system. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const quickActions = [
    {
      title: 'Students',
      description: 'Manage student wallets',
      icon: Users,
      href: '/school/students',
      color: 'bg-blue-500'
    },
    {
      title: 'Fees',
      description: 'Fee collection & tracking',
      icon: Receipt,
      href: '/school/fees',
      color: 'bg-emerald-500'
    },
    {
      title: 'Staff',
      description: 'Manage school staff',
      icon: UserCog,
      href: '/school/staff',
      color: 'bg-indigo-500'
    },
    {
      title: 'Salary',
      description: 'Payroll management',
      icon: Banknote,
      href: '/school/salary',
      color: 'bg-green-500'
    },
  ];

  const moreActions = [
    {
      title: 'Accounting',
      description: 'Income & expenses',
      icon: Calculator,
      href: '/school/accounting',
      color: 'bg-cyan-500'
    },
    {
      title: 'Invoices',
      description: 'Create & manage invoices',
      icon: FileText,
      href: '/school/invoices',
      color: 'bg-purple-500'
    },
    {
      title: 'Reports',
      description: 'Analytics & insights',
      icon: BarChart3,
      href: '/school/reports',
      color: 'bg-rose-500'
    },
    {
      title: 'Transactions',
      description: 'Payment history',
      icon: CreditCard,
      href: '/school/transactions',
      color: 'bg-orange-500'
    },
    {
      title: 'Vendors',
      description: 'School shops & canteens',
      icon: Store,
      href: '/school/vendors',
      color: 'bg-teal-500'
    },
    {
      title: 'Shop',
      description: 'Products & marketplace',
      icon: ShoppingBag,
      href: '/school/shop',
      color: 'bg-pink-500'
    },
  ];

  const formatCurrency = (amount: number) => {
    return `NLE ${amount.toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SchoolLayout>
      <div className="space-y-6">
        {/* Header with Refresh */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">School financial overview</p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button
              onClick={fetchDashboardData}
              className="ml-auto text-red-600 hover:text-red-700 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !error && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.totalStudents.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <ArrowUpRight className="h-4 w-4" />
                  {stats.activeStudents.toLocaleString()} active
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                      {stats.totalStaff.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                    <UserCog className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Teachers & administrators
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Fees</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
                      {formatCurrency(stats.pendingFees)}
                    </p>
                  </div>
                  <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-lg">
                    <Receipt className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {formatCurrency(stats.collectedFees)} collected
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Pending Salaries</p>
                    <p className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">
                      {formatCurrency(stats.pendingSalaries)}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <Banknote className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <TrendingUp className="h-4 w-4" />
                  {formatCurrency(stats.paidSalaries)} paid
                </p>
              </div>
            </div>

            {/* Fee Collection Analytics Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fee Collection Analytics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Circular Progress */}
                <div className="flex items-center justify-center">
                  <div className="relative w-48 h-48">
                    {/* Background circle */}
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        className="text-gray-200 dark:text-gray-700"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="50"
                        cy="50"
                        r="40"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="12"
                        strokeLinecap="round"
                        className="text-emerald-500"
                        strokeDasharray={`${((stats.collectedFees / (stats.collectedFees + stats.pendingFees || 1)) * 251.2).toFixed(0)} 251.2`}
                      />
                    </svg>
                    {/* Center text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold text-gray-900 dark:text-white">
                        {stats.collectedFees + stats.pendingFees > 0
                          ? Math.round((stats.collectedFees / (stats.collectedFees + stats.pendingFees)) * 100)
                          : 0}%
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">Collected</span>
                    </div>
                  </div>
                </div>

                {/* Stats breakdown */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">Collected Fees</span>
                    </div>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatCurrency(stats.collectedFees)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">Pending Fees</span>
                    </div>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">
                      {formatCurrency(stats.pendingFees)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-gray-700 dark:text-gray-300">Total Expected</span>
                    </div>
                    <span className="font-semibold text-blue-600 dark:text-blue-400">
                      {formatCurrency(stats.collectedFees + stats.pendingFees)}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {stats.totalStudents > 0 && (
                        <>
                          Based on {stats.totalStudents.toLocaleString()} enrolled students
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {quickActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`p-3 ${action.color} rounded-lg w-fit mb-4`}>
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{action.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
                </Link>
              ))}
            </div>

            {/* More Actions */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">More</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {moreActions.map((action) => (
                <Link
                  key={action.href}
                  to={action.href}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow text-center"
                >
                  <div className={`p-3 ${action.color} rounded-lg w-fit mx-auto mb-3`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="font-medium text-gray-900 dark:text-white text-sm">{action.title}</h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{action.description}</p>
                </Link>
              ))}
            </div>

            {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
            <Link to="/school/transactions" className="text-sm text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      tx.type === 'fee_payment' || tx.type === 'payment'
                        ? 'bg-green-100 dark:bg-green-900'
                        : tx.type === 'salary'
                        ? 'bg-purple-100 dark:bg-purple-900'
                        : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      {tx.type === 'fee_payment' || tx.type === 'payment' ? (
                        <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                      ) : tx.type === 'salary' ? (
                        <Banknote className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      ) : (
                        <CreditCard className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tx.student_name || tx.staff_name || ''} • {formatDate(tx.date)}
                      </p>
                    </div>
                  </div>
                  <p className={`font-semibold ${
                    tx.amount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'
                  }`}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No recent transactions</p>
              <p className="text-sm mt-1">Transactions from your school system will appear here</p>
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </SchoolLayout>
  );
}
