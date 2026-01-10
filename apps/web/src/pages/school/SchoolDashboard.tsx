import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Store,
  ShoppingBag,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  GraduationCap,
  Building2,
  Wallet,
  Settings,
  Receipt,
  UserCog,
  Calculator,
  Banknote,
  FileText,
  BarChart3
} from 'lucide-react';

interface DashboardStats {
  totalStudents: number;
  activeStudents: number;
  totalVendors: number;
  totalTransactions: number;
  totalVolume: number;
  todayTransactions: number;
  todayVolume: number;
}

export function SchoolDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalStudents: 0,
    activeStudents: 0,
    totalVendors: 0,
    totalTransactions: 0,
    totalVolume: 0,
    todayTransactions: 0,
    todayVolume: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch actual stats from API
    setStats({
      totalStudents: 1250,
      activeStudents: 980,
      totalVendors: 8,
      totalTransactions: 15420,
      totalVolume: 45000000,
      todayTransactions: 156,
      todayVolume: 2340000,
    });
    setLoading(false);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">School Dashboard</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your school's payment system</p>
              </div>
            </div>
            <Link
              to="/school/settings"
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              {stats.activeStudents} active
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Vendors</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.totalVendors}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                <Store className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Canteens, bookshops, etc.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today's Transactions</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {stats.todayTransactions.toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <CreditCard className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              SLE {(stats.todayVolume / 100).toLocaleString()}
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Volume</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  SLE {(stats.totalVolume / 100).toLocaleString()}
                </p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              All time
            </p>
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Recent transactions will appear here</p>
          </div>
        </div>
      </main>
    </div>
  );
}
