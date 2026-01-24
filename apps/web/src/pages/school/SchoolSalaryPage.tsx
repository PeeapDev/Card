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
  RefreshCw
} from 'lucide-react';

interface StaffSalary {
  id: string;
  staffId: string;
  name: string;
  role: string;
  department: string;
  avatar?: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'pending' | 'processing';
  paymentDate?: string;
  accountNumber?: string;
  bankName?: string;
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
  const [selectedMonth, setSelectedMonth] = useState('2026-01');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showPayrollModal, setShowPayrollModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<string[]>([]);
  const [salaries, setSalaries] = useState<StaffSalary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const departments = ['Teaching', 'Administration', 'Support', 'Security', 'Finance'];

  // Get school domain from localStorage
  const getSchoolDomain = () => {
    const schoolDomain = localStorage.getItem('school_domain');
    const schoolId = localStorage.getItem('schoolId');
    return schoolDomain || schoolId || null;
  };

  const fetchSalaries = async () => {
    setLoading(true);
    setError(null);

    try {
      const schoolDomain = getSchoolDomain();
      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Try to fetch salaries from SDSL2 sync API
      try {
        const response = await fetch(
          `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/salaries?month=${selectedMonth}`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const salaryList = (data.salaries || data.data || data || []).map((s: any) => ({
            id: s.id,
            staffId: s.staff_id || s.employee_id || `STF${s.id}`,
            name: s.staff_name || s.name || `${s.first_name || ''} ${s.last_name || ''}`.trim(),
            role: s.role || s.position || s.job_title || 'Staff',
            department: s.department || 'General',
            avatar: s.avatar_url,
            baseSalary: s.base_salary || s.gross_salary || 0,
            allowances: s.allowances || s.total_allowances || 0,
            deductions: s.deductions || s.total_deductions || 0,
            netSalary: s.net_salary || s.net_pay || 0,
            status: s.status || (s.paid_at ? 'paid' : 'pending'),
            paymentDate: s.payment_date || s.paid_at,
            accountNumber: s.account_number ? `****${s.account_number.slice(-4)}` : undefined,
            bankName: s.bank_name,
          }));
          setSalaries(salaryList);
          return;
        }
      } catch (apiErr) {
        console.log('SaaS API not available:', apiErr);
      }

      // If SaaS API fails, show empty state
      setSalaries([]);
    } catch (err) {
      console.error('Error fetching salaries:', err);
      setError('Could not load salaries. The school system sync may not be configured yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSalaries();
  }, [selectedMonth]);

  // Calculate summary from loaded salaries
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
      case 'paid':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'processing':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return null;
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

  const pendingPayments = filteredSalaries.filter(
    (s) => s.status === 'pending' && selectedStaff.includes(s.id)
  );

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
            onClick={fetchSalaries}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download className="h-4 w-4" />
            Export Payroll
          </button>
          <button
            onClick={() => setShowPayrollModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Run Payroll
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchSalaries}
            className="ml-auto text-red-600 hover:text-red-700 font-medium"
          >
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
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
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
              </span>
              <div className="flex items-center gap-2">
                {pendingPayments.length > 0 && (
                  <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <Send className="h-4 w-4" />
                    Pay Selected ({pendingPayments.length})
                  </button>
                )}
                <button
                  onClick={() => setSelectedStaff([])}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Clear Selection
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Staff
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Department
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Base Salary
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Allowances
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Deductions
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Net Salary
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
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
                          {salary.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{salary.name}</p>
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
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          salary.status
                        )}`}
                      >
                        {getStatusIcon(salary.status)}
                        {salary.status.charAt(0).toUpperCase() + salary.status.slice(1)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {salary.status === 'pending' && (
                        <button className="px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
                          Pay Now
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <ChevronDown className="h-4 w-4" />
                      </button>
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
          All salary payments are processed through Peeap. Staff members will receive their salary directly in their Peeap wallet or linked bank account.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">Peeap Wallet</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Instant transfer to staff wallet</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">Bank Transfer</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Direct deposit to bank account</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 dark:text-white mb-1">Mobile Money</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Orange Money / Africell Money</p>
          </div>
        </div>
      </div>
      </>
      )}

      {/* Run Payroll Modal */}
      {showPayrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 w-full max-w-md m-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Run Payroll</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payroll Month
                </label>
                <input
                  type="month"
                  defaultValue={selectedMonth}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Method
                </label>
                <select className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option>Peeap Wallet</option>
                  <option>Bank Transfer</option>
                  <option>Mobile Money</option>
                </select>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">Total Staff</span>
                  <span className="font-medium text-gray-900 dark:text-white">{summary.pending}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(
                      salaries
                        .filter((s) => s.status === 'pending')
                        .reduce((sum, s) => sum + s.netSalary, 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowPayrollModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowPayrollModal(false)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Process Payroll
              </button>
            </div>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
