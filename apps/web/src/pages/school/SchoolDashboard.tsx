import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { SchoolLayout } from '@/components/school';
import { supabaseAdmin } from '@/lib/supabase';
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
  AlertCircle,
  Building2,
  ArrowDownRight,
  MessageSquare,
  Send,
  Clock
} from 'lucide-react';
import { schoolChatService, type ChatMessage } from '@/services/schoolChat.service';

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

interface SchoolConnection {
  id: string;
  school_id: string;
  school_name: string;
  peeap_school_id: string;
  wallet_id: string | null;
  status: string;
}

interface SchoolWallet {
  id: string;
  balance: number;
  currency: string;
}

export function SchoolDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [schoolConnection, setSchoolConnection] = useState<SchoolConnection | null>(null);
  const [schoolWallet, setSchoolWallet] = useState<SchoolWallet | null>(null);
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
  const [recentMessages, setRecentMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch school info from SaaS API and create connection if needed
  const fetchOrCreateSchoolConnection = async () => {
    const domain = schoolSlug && schoolSlug !== 'school' ? schoolSlug : localStorage.getItem('school_domain');

    if (!domain) {
      console.log('[SchoolDashboard] No school domain available');
      return null;
    }

    console.log('[SchoolDashboard] Looking for school:', domain);

    try {
      // First, check if connection already exists
      let { data: connection } = await supabaseAdmin
        .from('school_connections')
        .select('*')
        .eq('peeap_school_id', domain)
        .maybeSingle();

      if (!connection) {
        // Try by school_id
        const result = await supabaseAdmin
          .from('school_connections')
          .select('*')
          .eq('school_id', domain)
          .maybeSingle();
        connection = result.data;
      }

      if (connection) {
        console.log('[SchoolDashboard] Found existing connection:', connection);
        localStorage.setItem('schoolId', connection.school_id);
        localStorage.setItem('school_domain', connection.peeap_school_id || domain);
        localStorage.setItem('schoolName', connection.school_name);
        return connection;
      }

      // No connection exists - fetch from SaaS API and create one
      console.log('[SchoolDashboard] No connection found, fetching from SaaS API...');

      let schoolData: any = null;

      try {
        const schoolInfoUrl = `https://${domain}.gov.school.edu.sl/api/peeap/school-info`;
        console.log('[SchoolDashboard] Fetching school info from:', schoolInfoUrl);

        const response = await fetch(schoolInfoUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
        });

        if (response.ok) {
          schoolData = await response.json();
          console.log('[SchoolDashboard] School data from SaaS:', schoolData);
        }
      } catch (fetchErr) {
        console.log('[SchoolDashboard] Could not fetch from SaaS API:', fetchErr);
      }

      // If we couldn't get data from SaaS, create with domain name
      if (!schoolData || !schoolData.school_name) {
        console.log('[SchoolDashboard] Using domain as school name');
        schoolData = {
          school_id: domain,
          school_name: domain.charAt(0).toUpperCase() + domain.slice(1) + ' School',
        };
      }

      // Create wallet for school (no user_id for school wallets)
      const { data: wallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .insert({
          currency: 'SLE',
          balance: 0,
          status: 'ACTIVE',
          wallet_type: 'school',
          name: `${schoolData.school_name} Wallet`,
          external_id: `SCH-${domain}`,
        })
        .select()
        .single();

      if (walletError) {
        console.error('[SchoolDashboard] Failed to create wallet:', walletError);
        return null;
      }

      console.log('[SchoolDashboard] Created wallet:', wallet);

      // Create school connection with correct column names
      const { data: newConnection, error: connectionError } = await supabaseAdmin
        .from('school_connections')
        .insert({
          school_id: schoolData.school_id?.toString() || domain,
          school_name: schoolData.school_name,
          peeap_school_id: domain,
          school_domain: `${domain}.gov.school.edu.sl`,
          connected_by_user_id: user?.id || null,
          connected_by_email: user?.email || null,
          wallet_id: wallet.id,
          status: 'active',
          saas_origin: `${domain}.gov.school.edu.sl`,
          connected_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (connectionError) {
        console.error('[SchoolDashboard] Failed to create connection:', connectionError);
        // Clean up wallet
        await supabaseAdmin.from('wallets').delete().eq('id', wallet.id);
        return null;
      }

      console.log('[SchoolDashboard] Created connection:', newConnection);

      localStorage.setItem('schoolId', newConnection.school_id);
      localStorage.setItem('school_domain', domain);
      localStorage.setItem('schoolName', newConnection.school_name);

      return newConnection;
    } catch (err) {
      console.error('[SchoolDashboard] Error:', err);
      return null;
    }
  };

  // Fetch school wallet data
  const fetchSchoolWallet = async (walletId: string) => {
    const { data, error } = await supabaseAdmin
      .from('wallets')
      .select('id, balance, currency')
      .eq('id', walletId)
      .single();

    if (error) {
      console.error('Error fetching school wallet:', error);
      return null;
    }

    return data;
  };

  // Fetch recent transactions for the school wallet
  const fetchSchoolTransactions = async (walletId: string) => {
    const { data, error } = await supabaseAdmin
      .from('transactions')
      .select('*')
      .eq('wallet_id', walletId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }

    return data || [];
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Get or create school connection from SaaS API
      const connection = await fetchOrCreateSchoolConnection();

      if (!connection) {
        setError('School information not found. Please log in again or contact support to link your school account.');
        setLoading(false);
        return;
      }

      setSchoolConnection(connection);

      // If we're on /school or /school/dashboard but have a proper domain, redirect
      const properDomain = connection.peeap_school_id || connection.school_id;
      if (properDomain && (!schoolSlug || schoolSlug === 'school')) {
        console.log('[SchoolDashboard] Redirecting to proper school URL:', `/${properDomain}`);
        navigate(`/${properDomain}`, { replace: true });
        return;
      }

      // Step 2: Get school wallet if exists
      if (connection.wallet_id) {
        const wallet = await fetchSchoolWallet(connection.wallet_id);
        if (wallet) {
          setSchoolWallet({
            id: wallet.id,
            balance: parseFloat(wallet.balance) || 0,
            currency: wallet.currency || 'SLE',
          });
        }

        // Step 3: Get recent transactions
        const transactions = await fetchSchoolTransactions(connection.wallet_id);
        setRecentTransactions(transactions.map((tx: any) => ({
          id: tx.id,
          type: tx.type || 'payment',
          amount: parseFloat(tx.amount) || 0,
          description: tx.description || tx.reference || 'Transaction',
          date: tx.created_at,
          student_name: tx.metadata?.student_index,
        })));

        // Calculate stats from transactions
        const feeReceived = transactions
          .filter((tx: any) => tx.type === 'FEE_RECEIVED')
          .reduce((sum: number, tx: any) => sum + Math.abs(parseFloat(tx.amount) || 0), 0);

        setStats(prev => ({
          ...prev,
          collectedFees: feeReceived,
          totalVolume: feeReceived,
          totalTransactions: transactions.length,
        }));
      }

      // Step 4: Fetch stats from school system endpoints
      // Note: Don't pass school_id for single-school SaaS instances as it may filter incorrectly
      const schoolDomain = connection.peeap_school_id || localStorage.getItem('school_domain');
      if (schoolDomain) {
        const headers = {
          'Accept': 'application/json',
        };

        // Fetch students count
        try {
          const studentsRes = await fetch(
            `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/students?per_page=1`,
            { method: 'GET', headers }
          );
          if (studentsRes.ok) {
            const data = await studentsRes.json();
            const total = data.pagination?.total || data.total || (data.data?.length || 0);
            setStats(prev => ({
              ...prev,
              totalStudents: total,
              activeStudents: total,
            }));
          }
        } catch (err) {
          console.log('Could not fetch students count:', err);
        }

        // Fetch staff count
        try {
          const staffRes = await fetch(
            `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/staff?per_page=1`,
            { method: 'GET', headers }
          );
          if (staffRes.ok) {
            const data = await staffRes.json();
            const total = data.pagination?.total || data.total || (data.data?.length || 0);
            setStats(prev => ({
              ...prev,
              totalStaff: total,
            }));
          }
        } catch (err) {
          console.log('Could not fetch staff count:', err);
        }

        // Try summary endpoint (may fail but that's OK)
        try {
          const summaryRes = await fetch(
            `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/summary`,
            { method: 'GET', headers }
          );
          if (summaryRes.ok) {
            const data = await summaryRes.json();
            if (data.success && data.data) {
              setStats(prev => ({
                ...prev,
                pendingFees: data.data.pending_fees || data.data.outstanding_invoices || prev.pendingFees,
                pendingSalaries: data.data.pending_salaries || prev.pendingSalaries,
                paidSalaries: data.data.paid_salaries || prev.paidSalaries,
              }));
            }
          }
        } catch (err) {
          console.log('Summary endpoint not available:', err);
        }

        // Fetch recent messages sent by this school
        try {
          const messages = await schoolChatService.getMessagesForSchool(schoolDomain, 10);
          setRecentMessages(messages);
        } catch (err) {
          console.log('Could not fetch messages:', err);
        }
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Could not load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch data when user is available or when schoolSlug changes
    if (user || schoolSlug) {
      fetchDashboardData();
    }
  }, [user, schoolSlug]);

  // Use school slug from URL or fallback to stored domain
  const currentSchoolSlug = schoolSlug || localStorage.getItem('school_domain') || 'school';

  const quickActions = [
    {
      title: 'Students',
      description: 'Manage student wallets',
      icon: Users,
      href: `/${currentSchoolSlug}/students`,
      color: 'bg-blue-500'
    },
    {
      title: 'Fees',
      description: 'Fee collection & tracking',
      icon: Receipt,
      href: `/${currentSchoolSlug}/fees`,
      color: 'bg-emerald-500'
    },
    {
      title: 'Messages',
      description: 'Parent communication',
      icon: MessageSquare,
      href: `/${currentSchoolSlug}/messages`,
      color: 'bg-purple-500'
    },
    {
      title: 'Salary',
      description: 'Payroll management',
      icon: Banknote,
      href: `/${currentSchoolSlug}/salary`,
      color: 'bg-green-500'
    },
  ];

  const moreActions = [
    {
      title: 'Accounting',
      description: 'Income & expenses',
      icon: Calculator,
      href: `/${currentSchoolSlug}/accounting`,
      color: 'bg-cyan-500'
    },
    {
      title: 'Invoices',
      description: 'Create & manage invoices',
      icon: FileText,
      href: `/${currentSchoolSlug}/invoices`,
      color: 'bg-purple-500'
    },
    {
      title: 'Reports',
      description: 'Analytics & insights',
      icon: BarChart3,
      href: `/${currentSchoolSlug}/reports`,
      color: 'bg-rose-500'
    },
    {
      title: 'Transactions',
      description: 'Payment history',
      icon: CreditCard,
      href: `/${currentSchoolSlug}/transactions`,
      color: 'bg-orange-500'
    },
    {
      title: 'Vendors',
      description: 'School shops & canteens',
      icon: Store,
      href: `/${currentSchoolSlug}/vendors`,
      color: 'bg-teal-500'
    },
    {
      title: 'Shop',
      description: 'Products & marketplace',
      icon: ShoppingBag,
      href: `/${currentSchoolSlug}/shop`,
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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-red-800 dark:text-red-300 mb-1">Could Not Connect to School</h3>
                <p className="text-red-700 dark:text-red-400 text-sm mb-2">{error}</p>
                {schoolSlug && schoolSlug !== 'school' && (
                  <p className="text-red-600 dark:text-red-400 text-sm mb-4">
                    School domain: <strong>{schoolSlug}.gov.school.edu.sl</strong>
                  </p>
                )}
                <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                  Make sure the school's API endpoint is accessible and returns valid school info.
                </p>
                <button
                  onClick={fetchDashboardData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </button>
              </div>
            </div>
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
            {/* School Wallet Card */}
            {schoolWallet && (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white mb-6 shadow-lg">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium mb-1">School Wallet Balance</p>
                    <p className="text-4xl font-bold">
                      {schoolWallet.currency === 'SLE' ? 'Le' : '$'} {schoolWallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-blue-200 text-sm mt-2">
                      {schoolConnection?.school_name || 'Your School'} • {schoolWallet.currency}
                    </p>
                  </div>
                  <div className="p-3 bg-white/20 rounded-xl">
                    <Wallet className="h-8 w-8" />
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <Link
                    to="/school/transactions"
                    className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                  >
                    <CreditCard className="h-4 w-4" />
                    View Transactions
                  </Link>
                  <Link
                    to="/school/withdraw"
                    className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-white/90 text-blue-600 rounded-lg text-sm font-medium transition-colors"
                  >
                    <ArrowDownRight className="h-4 w-4" />
                    Withdraw Funds
                  </Link>
                </div>
              </div>
            )}

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

            {/* Recent Messages to Parents */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Messages</h2>
                </div>
                <Link to={`/${currentSchoolSlug}/messages`} className="text-sm text-purple-600 hover:text-purple-700">
                  View All
                </Link>
              </div>
              {recentMessages.length > 0 ? (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {recentMessages.slice(0, 5).map((msg) => (
                    <div key={msg.id} className="py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          msg.type === 'receipt' ? 'bg-green-100 dark:bg-green-900' :
                          msg.type === 'reminder' ? 'bg-red-100 dark:bg-red-900' :
                          msg.type === 'fee_notice' ? 'bg-orange-100 dark:bg-orange-900' :
                          'bg-purple-100 dark:bg-purple-900'
                        }`}>
                          {msg.type === 'receipt' ? (
                            <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : msg.type === 'reminder' ? (
                            <Clock className="h-5 w-5 text-red-600 dark:text-red-400" />
                          ) : msg.type === 'fee_notice' ? (
                            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                          ) : (
                            <Send className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {msg.type === 'receipt' ? 'Payment Receipt' :
                             msg.type === 'reminder' ? 'Payment Reminder' :
                             msg.type === 'fee_notice' ? 'Fee Notice' :
                             msg.type === 'salary_slip' ? 'Salary Slip' : 'Message'}
                            {msg.metadata?.student_name && ` - ${msg.metadata.student_name}`}
                            {msg.metadata?.staff_name && ` - ${msg.metadata.staff_name}`}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {msg.metadata?.amount && `SLE ${(msg.metadata.amount / 100).toLocaleString()} • `}
                            {new Date(msg.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        msg.status === 'read' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300' :
                        msg.status === 'delivered' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {msg.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No messages sent yet</p>
                  <p className="text-sm mt-1">Send invoices and receipts to parents via Peeap Chat</p>
                  <Link
                    to="/school/invoices"
                    className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                  >
                    <FileText className="h-4 w-4" />
                    Create Invoice
                  </Link>
                </div>
              )}
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
