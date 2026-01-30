import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SchoolLayout } from '@/components/school';
import {
  Wallet,
  Search,
  Filter,
  Plus,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Send,
  ChevronDown,
  Building2,
  TrendingUp,
  Loader2,
  RefreshCw,
  X,
  CreditCard,
  Smartphone,
  Building,
  User,
  MessageSquare
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { schoolSalaryService, type StaffMember, type SalaryPaymentRequest } from '@/services/schoolSalary.service';

interface StaffSalary {
  id: string;
  staffId: string;
  name: string;
  email?: string;
  phone?: string;
  role: string;
  department: string;
  avatar?: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'pending' | 'processing';
  paymentDate?: string;
  transactionId?: string;
  accountNumber?: string;
  bankName?: string;
  peeapUserId?: string;
  peeapWalletId?: string;
  hasPeeapAccount: boolean;
}

interface PayrollSummary {
  totalStaff: number;
  totalBaseSalary: number;
  totalAllowances: number;
  totalDeductions: number;
  totalNetPayable: number;
  paid: number;
  pending: number;
}

export function SchoolSalaryPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [showPaySingleModal, setShowPaySingleModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [salaries, setSalaries] = useState<StaffSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  // Single payment state
  const [payingStaff, setPayingStaff] = useState<StaffSalary | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'bank' | 'mobile_money'>('wallet');
  const [paymentSuccess, setPaymentSuccess] = useState<{ transactionId: string } | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  // School wallet
  const [schoolWallet, setSchoolWallet] = useState<{ id: string; balance: number } | null>(null);

  const departments = ['Teaching', 'Administration', 'Support', 'Security', 'Finance'];

  const schoolDomain = schoolSlug || localStorage.getItem('school_domain');
  const schoolName = localStorage.getItem('schoolName') || 'School';

  // Fetch school wallet
  const fetchSchoolWallet = async () => {
    if (!schoolDomain) return;

    try {
      const { data: connection } = await supabaseAdmin
        .from('school_connections')
        .select('wallet_id')
        .eq('school_id', schoolDomain)
        .single();

      if (connection?.wallet_id) {
        const { data: wallet } = await supabaseAdmin
          .from('wallets')
          .select('id, balance')
          .eq('id', connection.wallet_id)
          .single();

        if (wallet) {
          setSchoolWallet({
            id: wallet.id,
            balance: parseFloat(wallet.balance) || 0,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching school wallet:', err);
    }
  };

  const fetchSalaries = async () => {
    setLoading(true);
    setError(null);

    try {
      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Fetch salaries from SaaS sync API
      let salaryList: StaffSalary[] = [];

      try {
        const params = new URLSearchParams();
        params.append('month', selectedMonth);

        const response = await fetch(
          `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/salaries?${params.toString()}`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const rawList = data.salaries || data.data || data || [];

          // Get staff with Peeap wallet status
          const staffWithWallets = await schoolSalaryService.getStaffWithWalletStatus(schoolDomain, rawList);

          // Check which ones are already paid this month
          const paidSalaries = await schoolSalaryService.getSalaryHistory(schoolDomain, selectedMonth);
          const paidStaffIds = new Set(paidSalaries.map(p => p.staff_id));

          salaryList = rawList.map((s: any, index: number) => {
            const staffInfo = staffWithWallets[index];
            const isPaid = paidStaffIds.has(s.staff_id || s.employee_id || `STF${s.id}`);
            const paidRecord = paidSalaries.find(p => p.staff_id === (s.staff_id || s.employee_id || `STF${s.id}`));

            return {
              id: s.id,
              staffId: s.staff_id || s.employee_id || `STF${s.id}`,
              name: s.staff_name || s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
              email: s.email,
              phone: s.phone,
              role: s.role || s.position || s.job_title || 'Staff',
              department: s.department || 'General',
              avatar: s.avatar_url,
              baseSalary: s.base_salary || s.gross_salary || 0,
              allowances: s.allowances || s.total_allowances || 0,
              deductions: s.deductions || s.total_deductions || 0,
              netSalary: s.net_salary || s.net_pay || 0,
              status: isPaid ? 'paid' : 'pending',
              paymentDate: paidRecord?.paid_at,
              transactionId: paidRecord?.transaction_id,
              accountNumber: s.account_number ? `****${s.account_number.slice(-4)}` : undefined,
              bankName: s.bank_name,
              peeapUserId: staffInfo?.peeapUserId,
              peeapWalletId: staffInfo?.peeapWalletId,
              hasPeeapAccount: staffInfo?.hasPeeapAccount || false,
            };
          });
        }
      } catch (apiErr) {
        console.log('SaaS API not available:', apiErr);
      }

      setSalaries(salaryList);
    } catch (err) {
      console.error('Error fetching salaries:', err);
      setError('Could not load salaries. The school system sync may not be configured yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
    fetchSchoolWallet();
  }, [selectedMonth, schoolDomain]);

  // Calculate summary
  const summary: PayrollSummary = {
    totalStaff: salaries.length,
    totalBaseSalary: salaries.reduce((sum, s) => sum + s.baseSalary, 0),
    totalAllowances: salaries.reduce((sum, s) => sum + s.allowances, 0),
    totalDeductions: salaries.reduce((sum, s) => sum + s.deductions, 0),
    totalNetPayable: salaries.reduce((sum, s) => sum + s.netSalary, 0),
    paid: salaries.filter(s => s.status === 'paid').length,
    pending: salaries.filter(s => s.status === 'pending' || s.status === 'processing').length,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'processing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Loader2 className="h-4 w-4 animate-spin" />;
      default: return null;
    }
  };

  const filteredSalaries = salaries.filter((salary) => {
    const matchesSearch =
      salary.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salary.staffId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      salary.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDepartment = selectedDepartment === 'all' || salary.department === selectedDepartment;
    const matchesStatus = selectedStatus === 'all' || salary.status === selectedStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const handleSelectAll = () => {
    if (selectedStaff.length === filteredSalaries.length) {
      setSelectedStaff([]);
    } else {
      setSelectedStaff(filteredSalaries.map((s) => s.id));
    }
  };

  const handleSelectStaff = (id: string) => {
    if (selectedStaff.includes(id)) {
      setSelectedStaff(selectedStaff.filter((s) => s !== id));
    } else {
      setSelectedStaff([...selectedStaff, id]);
    }
  };

  // Open pay single modal
  const openPaySingleModal = (staff: StaffSalary) => {
    setPayingStaff(staff);
    setPaymentMethod(staff.hasPeeapAccount ? 'wallet' : 'bank');
    setPaymentError(null);
    setPaymentSuccess(null);
    setShowPaySingleModal(true);
  };

  // Pay single staff member
  const handlePaySingle = async () => {
    if (!payingStaff || !schoolWallet) return;

    setProcessing(true);
    setPaymentError(null);

    try {
      const request: SalaryPaymentRequest = {
        staffId: payingStaff.staffId,
        staffName: payingStaff.name,
        schoolId: schoolDomain!,
        schoolName,
        schoolWalletId: schoolWallet.id,
        recipientWalletId: payingStaff.peeapWalletId,
        recipientUserId: payingStaff.peeapUserId,
        month: selectedMonth,
        baseSalary: payingStaff.baseSalary,
        allowances: payingStaff.allowances,
        deductions: payingStaff.deductions,
        netSalary: payingStaff.netSalary,
        paymentMethod,
        bankDetails: paymentMethod === 'bank' && payingStaff.bankName ? {
          bankName: payingStaff.bankName,
          accountNumber: payingStaff.accountNumber || '',
          accountName: payingStaff.name,
        } : undefined,
      };

      const result = await schoolSalaryService.paySalary(request);

      if (result.success) {
        setPaymentSuccess({ transactionId: result.transactionId! });
        // Refresh data
        fetchSalaries();
        fetchSchoolWallet();
      } else {
        setPaymentError(result.error || 'Payment failed');
      }
    } catch (err: any) {
      setPaymentError(err.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  // Bulk pay selected staff
  const handleBulkPay = async () => {
    if (!schoolWallet || selectedStaff.length === 0) return;

    setProcessing(true);

    const pendingPayments = filteredSalaries.filter(
      s => s.status === 'pending' && selectedStaff.includes(s.id)
    );

    const requests: SalaryPaymentRequest[] = pendingPayments.map(staff => ({
      staffId: staff.staffId,
      staffName: staff.name,
      schoolId: schoolDomain!,
      schoolName,
      schoolWalletId: schoolWallet.id,
      recipientWalletId: staff.peeapWalletId,
      recipientUserId: staff.peeapUserId,
      month: selectedMonth,
      baseSalary: staff.baseSalary,
      allowances: staff.allowances,
      deductions: staff.deductions,
      netSalary: staff.netSalary,
      paymentMethod: staff.hasPeeapAccount ? 'wallet' : 'bank',
      bankDetails: !staff.hasPeeapAccount && staff.bankName ? {
        bankName: staff.bankName,
        accountNumber: staff.accountNumber || '',
        accountName: staff.name,
      } : undefined,
    }));

    const result = await schoolSalaryService.processBulkPayroll(requests);

    alert(`Payroll processed!\nSuccessful: ${result.successful}\nFailed: ${result.failed}`);

    setSelectedStaff([]);
    setShowPayrollModal(false);
    fetchSalaries();
    fetchSchoolWallet();
    setProcessing(false);
  };

  const pendingPayments = filteredSalaries.filter(
    (s) => s.status === 'pending' && selectedStaff.includes(s.id)
  );

  const totalPendingAmount = pendingPayments.reduce((sum, s) => sum + s.netSalary, 0);

  return (
    <SchoolLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
            <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Salary Management</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage staff payroll and payments
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { fetchSalaries(); fetchSchoolWallet(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={() => setShowPayrollModal(true)}
            disabled={summary.pending === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Run Payroll
          </button>
        </div>
      </div>

      {/* School Wallet Balance */}
      {schoolWallet && (
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl p-4 mb-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">School Wallet Balance</p>
              <p className="text-2xl font-bold">{formatCurrency(schoolWallet.balance)}</p>
            </div>
            {summary.pending > 0 && (
              <div className="text-right">
                <p className="text-green-100 text-sm">Pending Payroll</p>
                <p className="text-xl font-semibold">{formatCurrency(
                  salaries.filter(s => s.status === 'pending').reduce((sum, s) => sum + s.netSalary, 0)
                )}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={fetchSalaries} className="ml-auto text-red-600 hover:text-red-700 font-medium">
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Month Selector */}
          <div className="mb-6 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400">Payroll Period:</span>
            </div>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{summary.totalStaff}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Base Salary</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(summary.totalBaseSalary)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allowances</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">
                    +{formatCurrency(summary.totalAllowances)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                  <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Deductions</p>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    -{formatCurrency(summary.totalDeductions)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border-2 border-green-500">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Wallet className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Net Payable</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(summary.totalNetPayable)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Progress */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">Payment Progress</h3>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {summary.paid} of {summary.totalStaff} staff paid
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
              <div
                className="bg-green-500 h-3 rounded-full transition-all"
                style={{ width: `${summary.totalStaff > 0 ? (summary.paid / summary.totalStaff) * 100 : 0}%` }}
              />
            </div>
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Paid ({summary.paid})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending ({summary.pending})</span>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm mb-6">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search staff by name, ID, or role..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5 text-gray-400" />
                  <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Departments</option>
                    {departments.map((dept) => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Status</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="processing">Processing</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Bulk Actions */}
            {selectedStaff.length > 0 && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedStaff.length} staff selected
                    {pendingPayments.length > 0 && ` (${pendingPayments.length} pending - ${formatCurrency(totalPendingAmount)})`}
                  </span>
                  <div className="flex items-center gap-2">
                    {pendingPayments.length > 0 && (
                      <button
                        onClick={() => setShowPayrollModal(true)}
                        disabled={!schoolWallet || schoolWallet.balance < totalPendingAmount}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" />
                        Pay Selected
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedStaff([])}
                      className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Salary Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedStaff.length === filteredSalaries.length && filteredSalaries.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Staff</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Department</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Base Salary</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Allowances</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Deductions</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Net Salary</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredSalaries.map((salary) => (
                    <tr key={salary.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedStaff.includes(salary.id)}
                          onChange={() => handleSelectStaff(salary.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              {salary.name.split(' ').map((n) => n[0]).join('')}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">{salary.name}</p>
                              {salary.hasPeeapAccount && (
                                <span className="text-xs text-green-600 bg-green-100 px-1.5 py-0.5 rounded">Peeap</span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {salary.staffId} - {salary.role}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600 dark:text-gray-300">{salary.department}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-gray-900 dark:text-white">
                        {formatCurrency(salary.baseSalary)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-green-600 dark:text-green-400">
                        +{formatCurrency(salary.allowances)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm text-red-600 dark:text-red-400">
                        -{formatCurrency(salary.deductions)}
                      </td>
                      <td className="px-4 py-4 text-right text-sm font-semibold text-gray-900 dark:text-white">
                        {formatCurrency(salary.netSalary)}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(salary.status)}`}>
                            {getStatusIcon(salary.status)}
                            {salary.status.charAt(0).toUpperCase() + salary.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {salary.status === 'pending' && (
                            <button
                              onClick={() => openPaySingleModal(salary)}
                              disabled={!schoolWallet || schoolWallet.balance < salary.netSalary}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50"
                            >
                              Pay Now
                            </button>
                          )}
                          {salary.status === 'paid' && salary.transactionId && (
                            <span className="text-xs text-gray-400">{salary.transactionId}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredSalaries.length === 0 && (
              <div className="text-center py-12">
                <Wallet className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No salary records found</p>
                <p className="text-sm text-gray-400 mt-1">Salary data from your school system will appear here</p>
              </div>
            )}
          </div>

          {/* Payment Methods Info */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Salary Payments via Peeap
            </h3>
            <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">
              Staff with Peeap accounts receive instant payments. Others can receive via bank transfer or mobile money.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                <CreditCard className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Peeap Wallet</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Instant transfer + salary slip</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                <Building className="h-6 w-6 text-blue-600" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Bank Transfer</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Direct deposit to bank</p>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 flex items-center gap-3">
                <Smartphone className="h-6 w-6 text-orange-600" />
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">Mobile Money</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Orange / Africell Money</p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Pay Single Staff Modal */}
      {showPaySingleModal && payingStaff && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Pay Salary</h3>
              <button onClick={() => setShowPaySingleModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              {paymentSuccess ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Successful!</h4>
                  <p className="text-gray-500 mb-2">Transaction: {paymentSuccess.transactionId}</p>
                  {payingStaff.hasPeeapAccount && (
                    <p className="text-sm text-gray-400 flex items-center justify-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      Salary slip sent via Peeap Chat
                    </p>
                  )}
                  <button
                    onClick={() => setShowPaySingleModal(false)}
                    className="mt-4 w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  {/* Staff info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{payingStaff.name}</p>
                        <p className="text-sm text-gray-500">{payingStaff.role} - {payingStaff.department}</p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base Salary</span>
                        <span>{formatCurrency(payingStaff.baseSalary)}</span>
                      </div>
                      <div className="flex justify-between text-green-600">
                        <span>Allowances</span>
                        <span>+{formatCurrency(payingStaff.allowances)}</span>
                      </div>
                      <div className="flex justify-between text-red-600">
                        <span>Deductions</span>
                        <span>-{formatCurrency(payingStaff.deductions)}</span>
                      </div>
                      <div className="flex justify-between font-bold pt-2 border-t">
                        <span>Net Salary</span>
                        <span className="text-lg">{formatCurrency(payingStaff.netSalary)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Payment method */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Payment Method
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => setPaymentMethod('wallet')}
                        disabled={!payingStaff.hasPeeapAccount}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                          paymentMethod === 'wallet'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600'
                        } ${!payingStaff.hasPeeapAccount ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <CreditCard className="h-5 w-5" />
                        <span className="text-xs">Wallet</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('bank')}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                          paymentMethod === 'bank'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <Building className="h-5 w-5" />
                        <span className="text-xs">Bank</span>
                      </button>
                      <button
                        onClick={() => setPaymentMethod('mobile_money')}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-colors ${
                          paymentMethod === 'mobile_money'
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-600'
                        }`}
                      >
                        <Smartphone className="h-5 w-5" />
                        <span className="text-xs">Mobile</span>
                      </button>
                    </div>
                    {!payingStaff.hasPeeapAccount && paymentMethod !== 'wallet' && (
                      <p className="text-xs text-yellow-600 mt-2">
                        Staff doesn't have a Peeap account. Payment will be queued for manual processing.
                      </p>
                    )}
                  </div>

                  {/* School wallet balance */}
                  {schoolWallet && (
                    <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/30 rounded-xl mb-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-green-600" />
                        <span className="text-sm text-green-700 dark:text-green-300">School Balance</span>
                      </div>
                      <span className="font-bold text-green-600">{formatCurrency(schoolWallet.balance)}</span>
                    </div>
                  )}

                  {paymentError && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 mb-4 text-red-700">
                      <AlertCircle className="h-5 w-5" />
                      <span className="text-sm">{paymentError}</span>
                    </div>
                  )}

                  <button
                    onClick={handlePaySingle}
                    disabled={processing || !schoolWallet || schoolWallet.balance < payingStaff.netSalary}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    {processing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        Pay {formatCurrency(payingStaff.netSalary)}
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Payroll Modal */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Process Payroll</h3>
              <button onClick={() => setShowPayrollModal(false)} className="p-2 text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6">
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Staff to Pay</span>
                  <span className="font-medium text-gray-900 dark:text-white">{pendingPayments.length}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(totalPendingAmount)}</span>
                </div>
                {schoolWallet && (
                  <div className="flex justify-between text-sm pt-2 border-t">
                    <span className="text-gray-600 dark:text-gray-400">School Balance</span>
                    <span className={`font-medium ${schoolWallet.balance >= totalPendingAmount ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(schoolWallet.balance)}
                    </span>
                  </div>
                )}
              </div>

              {schoolWallet && schoolWallet.balance < totalPendingAmount && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 mb-4 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  <span className="text-sm">Insufficient balance to process payroll</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowPayrollModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkPay}
                  disabled={processing || !schoolWallet || schoolWallet.balance < totalPendingAmount}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {processing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Process
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
