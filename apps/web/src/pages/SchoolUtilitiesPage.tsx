import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Wallet,
  Receipt,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  CreditCard,
  RefreshCw,
  Users,
  ChevronRight,
  History,
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { parentStudentService, LinkedChild } from '@/services/parentStudent.service';
import { walletService } from '@/services/wallet.service';
import { supabaseAdmin } from '@/lib/supabase';

// API base URL - use api.peeap.com proxy for reliable JSON responses
const API_BASE = 'https://api.peeap.com/school/peeap';

interface StudentData {
  student_id: number;
  student_name: string;
  first_name: string;
  last_name: string;
  admission_no: number;
  index_number: string;
  class_name: string;
  section_name?: string;
  gender: string;
  date_of_birth: string;
  phone?: string;
  email?: string;
  profile_photo_url?: string;
  school_id: number;
  school_name: string;
}

interface FeeItem {
  id: number;
  fees_master_id: number;
  name: string;
  group: string;
  term?: string;
  term_id?: number;
  amount: number;
  paid: number;
  balance: number;
  due_date: string;
  status: 'paid' | 'partial' | 'unpaid' | 'overdue';
}

interface FinancialData {
  student: {
    id: number;
    name: string;
    admission_no: number;
    index_number: string;
    class: string;
    section?: string;
  };
  wallet_balance: number;
  lunch_balance: number;
  transport_balance: number;
  fees_summary: {
    total_fees: number;
    total_paid: number;
    balance_due: number;
    currency: string;
  };
  fees: FeeItem[];
  recent_transactions: {
    id: number;
    type: string;
    amount: number;
    description?: string;
    narration?: string;
    date?: string;
    created_at?: string;
  }[];
}

export function SchoolUtilitiesPage() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  // Search state
  const [indexNumber, setIndexNumber] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Student data
  const [student, setStudent] = useState<StudentData | null>(null);
  const [financials, setFinancials] = useState<FinancialData | null>(null);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  // Linked children
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);

  // User wallets
  const [userWallets, setUserWallets] = useState<{ id: string; balance: number; name?: string; walletType?: string }[]>([]);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [loadingWallet, setLoadingWallet] = useState(true);

  // Get selected wallet
  const userWallet = userWallets.find(w => w.id === selectedWalletId) || null;

  // Payment modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<FeeItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  // Payment history
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load index from URL params
  useEffect(() => {
    const indexFromUrl = searchParams.get('index');
    if (indexFromUrl) {
      setIndexNumber(indexFromUrl);
      // Auto-search when index is provided
      setTimeout(() => {
        const searchBtn = document.getElementById('search-student-btn');
        if (searchBtn) searchBtn.click();
      }, 100);
    }
  }, [searchParams]);

  // Load linked children
  useEffect(() => {
    async function loadChildren() {
      if (!user?.id) {
        setLoadingChildren(false);
        return;
      }
      try {
        const children = await parentStudentService.getLinkedChildren(user.id);
        setLinkedChildren(children);
      } catch (err) {
        console.error('Error loading children:', err);
      } finally {
        setLoadingChildren(false);
      }
    }
    loadChildren();
  }, [user?.id]);

  // Load user's SLE wallets
  useEffect(() => {
    async function loadWallets() {
      if (!user?.id) {
        setLoadingWallet(false);
        return;
      }
      try {
        // Get all user's wallets
        const allWallets = await walletService.getWallets(user.id);
        if (!allWallets || allWallets.length === 0) {
          setLoadingWallet(false);
          return;
        }

        // Filter to only active SLE wallets (exclude special types like school, student)
        const sleWallets = allWallets.filter(w =>
          w.currency === 'SLE' &&
          w.status === 'ACTIVE' &&
          !['school', 'student'].includes((w as any).walletType || '')
        ).map(w => ({
          id: w.id,
          balance: w.balance,
          name: (w as any).name,
          walletType: (w as any).walletType,
        }));

        setUserWallets(sleWallets);

        // Find main wallet to pre-select
        const userWithDefault = user as any;
        let mainWalletId = '';

        // 1. Check user's default_wallet_id
        if (userWithDefault?.defaultWalletId || userWithDefault?.default_wallet_id) {
          const defaultId = userWithDefault.defaultWalletId || userWithDefault.default_wallet_id;
          if (sleWallets.find(w => w.id === defaultId)) {
            mainWalletId = defaultId;
          }
        }

        // 2. Check for wallet_type === 'primary'
        if (!mainWalletId) {
          const primaryWallet = sleWallets.find(w => w.walletType === 'primary');
          if (primaryWallet) mainWalletId = primaryWallet.id;
        }

        // 3. Get wallet with highest balance (most likely the main one)
        if (!mainWalletId && sleWallets.length > 0) {
          const highestBalance = sleWallets.reduce((prev, curr) =>
            curr.balance > prev.balance ? curr : prev
          );
          mainWalletId = highestBalance.id;
        }

        setSelectedWalletId(mainWalletId);
      } catch (err) {
        console.error('Error loading wallets:', err);
      } finally {
        setLoadingWallet(false);
      }
    }
    loadWallets();
  }, [user?.id]);

  // Auto-format index number: SL-YYYY-MM-NNNNN
  const formatIndexNumber = (value: string): string => {
    let cleaned = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (cleaned.startsWith('SL')) {
      cleaned = cleaned.slice(2);
    }
    if (cleaned.length === 0) return '';
    let formatted = 'SL-';
    if (cleaned.length > 0) formatted += cleaned.slice(0, 4);
    if (cleaned.length > 4) formatted += '-' + cleaned.slice(4, 6);
    if (cleaned.length > 6) formatted += '-' + cleaned.slice(6, 11);
    return formatted;
  };

  // Search for student
  const searchStudent = async () => {
    if (!indexNumber.trim() || indexNumber.length < 10) {
      setSearchError('Please enter a valid index number');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setStudent(null);
    setFinancials(null);

    try {
      // Step 1: Verify student (index_number is globally unique, school_id is optional)
      const verifyRes = await fetch(`${API_BASE}/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index_number: indexNumber.trim() }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success || !verifyData.found) {
        setSearchError(verifyData.message || 'Student not found. Please check the index number.');
        return;
      }

      const studentData: StudentData = {
        student_id: verifyData.data.student_id,
        student_name: verifyData.data.student_name,
        first_name: verifyData.data.first_name,
        last_name: verifyData.data.last_name,
        admission_no: verifyData.data.admission_no,
        index_number: verifyData.data.index_number,
        class_name: verifyData.data.class_name,
        section_name: verifyData.data.section_name,
        gender: verifyData.data.gender,
        date_of_birth: verifyData.data.date_of_birth,
        phone: verifyData.data.phone,
        email: verifyData.data.email,
        profile_photo_url: verifyData.data.profile_photo_url,
        school_id: verifyData.data.school_id,
        school_name: verifyData.data.school_name,
      };

      setStudent(studentData);

      // Step 2: Fetch financials
      await fetchFinancials(studentData.student_id, studentData.school_id);

    } catch (err: any) {
      console.error('Search error:', err);
      const errorMessage = err?.message || 'Unknown error';
      setSearchError(`Could not connect to school system: ${errorMessage}`);
    } finally {
      setSearching(false);
    }
  };

  // Fetch financial data
  const fetchFinancials = async (studentId: number, schoolId: number) => {
    setLoadingFinancials(true);
    try {
      const res = await fetch(`${API_BASE}/student-financials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ student_id: studentId, school_id: schoolId }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setFinancials(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch financials:', err);
    } finally {
      setLoadingFinancials(false);
    }
  };

  // Refresh financials
  const refreshFinancials = () => {
    if (student) {
      fetchFinancials(student.student_id, student.school_id);
    }
  };

  // Fetch payment history for a student
  const fetchPaymentHistory = async (indexNumber: string) => {
    setLoadingHistory(true);
    try {
      // Get payments from transactions table where metadata contains this student
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('type', 'SCHOOL_FEE')
        .contains('metadata', { student_index: indexNumber })
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (err) {
      console.error('Error fetching payment history:', err);
      setPaymentHistory([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Open payment modal
  const openPayModal = (fee: FeeItem) => {
    setSelectedFee(fee);
    setPaymentAmount(fee.balance.toString());
    setPaymentError(null);
    setPaymentSuccess(false);
    setShowPayModal(true);
  };

  // Process payment from user's wallet
  const processPayment = async () => {
    if (!student || !selectedFee || !user?.id) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setPaymentError('Please enter a valid amount');
      return;
    }
    if (amount > selectedFee.balance) {
      setPaymentError(`Amount cannot exceed ${formatCurrency(selectedFee.balance)}`);
      return;
    }

    // Check wallet
    if (!userWallet) {
      setPaymentError('No wallet found. Please set up your wallet first.');
      return;
    }
    if (userWallet.balance < amount) {
      setPaymentError(`Insufficient balance. Available: ${formatCurrency(userWallet.balance)}`);
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      // Use the parentStudentService to process payment
      const result = await parentStudentService.paySchoolFee({
        parentWalletId: userWallet.id,
        studentIndexNumber: student.index_number,
        feeId: selectedFee.id.toString(),
        amount: amount,
        schoolId: student.school_id.toString(),
      });

      if (result.success) {
        setPaymentSuccess(true);
        // Update local wallet balance in the userWallets array
        setUserWallets(prev => prev.map(w =>
          w.id === selectedWalletId ? { ...w, balance: w.balance - amount } : w
        ));
        // Close modal after 3 seconds
        setTimeout(() => {
          setShowPayModal(false);
          setPaymentSuccess(false);
          setSelectedFee(null);
          setPaymentAmount('');
          refreshFinancials();
        }, 3000);
      } else {
        setPaymentError('Payment failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setPaymentError(err.message || 'Could not process payment. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NLE ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      case 'unpaid': return 'bg-red-100 text-red-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Clear and go back to search
  const clearStudent = () => {
    setStudent(null);
    setFinancials(null);
    setIndexNumber('');
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
            <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pay School Fees</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Search for a student and pay their fees</p>
          </div>
        </div>

        {/* Wallet Balance Banner - SLE Wallet Selector */}
        {!loadingWallet && userWallets.length > 0 && (
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-4 mb-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Wallet className="h-5 w-5" />
                <div>
                  {userWallets.length > 1 ? (
                    <select
                      value={selectedWalletId}
                      onChange={(e) => setSelectedWalletId(e.target.value)}
                      className="bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50"
                    >
                      {userWallets.map((w) => (
                        <option key={w.id} value={w.id} className="text-gray-900">
                          {w.name || (w.walletType === 'primary' ? 'Main Wallet' : 'SLE Wallet')} - {formatCurrency(w.balance)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm opacity-90">
                      {userWallet?.name || 'Leones Wallet'}
                    </span>
                  )}
                  <p className="text-xs opacity-70 mt-1">Payments will be made from this wallet</p>
                </div>
              </div>
              <p className="text-xl font-bold">{formatCurrency(userWallet?.balance || 0)}</p>
            </div>
          </div>
        )}
        {!loadingWallet && userWallets.length === 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 mb-6 border border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3 text-amber-700 dark:text-amber-300">
              <AlertCircle className="h-5 w-5" />
              <div>
                <p className="font-medium">No SLE wallet found</p>
                <p className="text-sm opacity-80">You need a Leones wallet to pay school fees</p>
              </div>
            </div>
          </div>
        )}

        {!student ? (
          <div className="space-y-6">
            {/* Linked Children Quick Select */}
            {!loadingChildren && linkedChildren.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    <h2 className="font-semibold text-gray-900 dark:text-white">Your Children</h2>
                  </div>
                  <Link
                    to="/my-children"
                    className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
                  >
                    Manage
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
                <div className="grid gap-3">
                  {linkedChildren.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => {
                        setIndexNumber(child.student.indexNumber);
                        setTimeout(() => searchStudent(), 100);
                      }}
                      className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors text-left"
                    >
                      {child.student.profilePhotoUrl ? (
                        <img
                          src={child.student.profilePhotoUrl}
                          alt={child.student.fullName}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold">
                          {child.student.firstName.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 dark:text-white truncate">
                          {child.student.fullName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {child.student.schoolName} - {child.student.className}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search Form */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Student Index Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={indexNumber}
                      onChange={(e) => {
                        setIndexNumber(formatIndexNumber(e.target.value));
                        setSearchError(null);
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
                      placeholder="SL-2025-02-00050"
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                      autoFocus
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Enter the student's index number (e.g., SL-2025-02-00050)
                  </p>
                </div>

                {searchError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="text-sm">{searchError}</span>
                  </div>
                )}

                <button
                  id="search-student-btn"
                  onClick={searchStudent}
                  disabled={searching || !indexNumber.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {searching ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Search className="h-5 w-5" />
                      Search Student
                    </>
                  )}
                </button>

                {/* Link to manage children */}
                <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to="/my-children"
                    className="text-sm text-purple-600 hover:text-purple-700 inline-flex items-center gap-1"
                  >
                    <Users className="h-4 w-4" />
                    Add child to your account for quick access
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Student Details & Fees */
          <div className="space-y-6">
            {/* Student Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  {student.profile_photo_url ? (
                    <img
                      src={student.profile_photo_url}
                      alt={student.student_name}
                      className="w-16 h-16 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                      {student.first_name.charAt(0)}
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      {student.student_name}
                    </h2>
                    <p className="text-gray-500">{student.school_name}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                      <span>{student.class_name}</span>
                      <span>|</span>
                      <span>ID: {student.index_number}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      fetchPaymentHistory(student.index_number);
                      setShowPaymentHistory(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                    title="View payment history"
                  >
                    <History className="h-4 w-4" />
                    Payment History
                  </button>
                  <button
                    onClick={clearStudent}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    title="Search another student"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {loadingFinancials ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-500">Loading fees...</p>
              </div>
            ) : financials ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Receipt className="h-4 w-4" />
                      <span className="text-sm">Total Fees</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(financials.fees_summary.total_fees)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm">Paid</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(financials.fees_summary.total_paid)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">Balance Due</span>
                    </div>
                    <p className="text-xl font-bold text-red-600">
                      {formatCurrency(financials.fees_summary.balance_due)}
                    </p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-2 text-gray-500 mb-2">
                      <Wallet className="h-4 w-4" />
                      <span className="text-sm">Wallet</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {formatCurrency(financials.wallet_balance)}
                    </p>
                  </div>
                </div>

                {/* Fees List */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white">Fees</h3>
                    <button
                      onClick={refreshFinancials}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Refresh"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {financials.fees.length > 0 ? (
                      financials.fees.map((fee) => (
                        <div key={fee.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{fee.name}</p>
                            {fee.term && (
                              <p className="text-sm text-gray-500">{fee.term}</p>
                            )}
                            {fee.due_date && fee.due_date !== '1970-01-01' && (
                              <p className="text-xs text-gray-400">Due: {fee.due_date}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-gray-900 dark:text-white">
                                {formatCurrency(fee.amount)}
                              </p>
                              {fee.paid > 0 && (
                                <p className="text-xs text-green-600">
                                  Paid: {formatCurrency(fee.paid)}
                                </p>
                              )}
                              <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${getStatusColor(fee.status)}`}>
                                {fee.status === 'unpaid' ? `${formatCurrency(fee.balance)} due` : fee.status}
                              </span>
                            </div>
                            {fee.balance > 0 && (
                              <button
                                onClick={() => openPayModal(fee)}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <Receipt className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No fees found</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Recent Transactions */}
                {financials.recent_transactions.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="font-semibold text-gray-900 dark:text-white">Recent Payments</h3>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                      {financials.recent_transactions.map((tx) => (
                        <div key={tx.id} className="p-4 flex items-center justify-between">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {tx.description || tx.narration || tx.type}
                            </p>
                            <p className="text-sm text-gray-500">
                              {tx.date || tx.created_at}
                            </p>
                          </div>
                          <p className={`font-semibold ${tx.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {tx.amount < 0 ? '-' : '+'}{formatCurrency(Math.abs(tx.amount))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <p className="text-gray-500">Could not load fees</p>
                <button
                  onClick={refreshFinancials}
                  className="mt-4 text-blue-600 hover:text-blue-700"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>
        )}

        {/* Payment Modal */}
        {showPayModal && selectedFee && student && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Pay Fee
                </h3>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {paymentSuccess ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-green-600" />
                    </div>
                    <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                      Payment Successful!
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 mb-1">
                      {formatCurrency(parseFloat(paymentAmount))} paid for {selectedFee.name}
                    </p>
                    <p className="text-sm text-gray-500 mb-4">
                      For: {student?.student_name} at {student?.school_name}
                    </p>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-left mb-4">
                      <p className="text-xs text-green-700 dark:text-green-300 font-medium mb-1">Payment Details:</p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        • Deducted from your wallet
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        • Credited to school's Peeap wallet
                      </p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        • School system notified
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setShowPayModal(false);
                        setPaymentSuccess(false);
                        setSelectedFee(null);
                        setPaymentAmount('');
                        refreshFinancials();
                      }}
                      className="w-full py-2.5 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Fee Details */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedFee.name}</p>
                          <p className="text-sm text-gray-500">For: {student.student_name}</p>
                          {selectedFee.term && (
                            <p className="text-xs text-blue-600">{selectedFee.term}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {formatCurrency(selectedFee.amount)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Paid</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(selectedFee.paid)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Balance</p>
                          <p className="font-semibold text-red-600">
                            {formatCurrency(selectedFee.balance)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Balance */}
                    {userWallet && (
                      <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm text-blue-700 dark:text-blue-300">Your Wallet</span>
                        </div>
                        <span className="font-semibold text-blue-700 dark:text-blue-300">
                          {formatCurrency(userWallet.balance)}
                        </span>
                      </div>
                    )}

                    {/* Amount Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Payment Amount
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">NLE</span>
                        <input
                          type="number"
                          value={paymentAmount}
                          onChange={(e) => setPaymentAmount(e.target.value)}
                          className="w-full pl-14 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                          placeholder="0.00"
                        />
                      </div>
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => setPaymentAmount((selectedFee.balance / 2).toFixed(2))}
                          className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          50%
                        </button>
                        <button
                          onClick={() => setPaymentAmount(selectedFee.balance.toFixed(2))}
                          className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200"
                        >
                          Full Balance
                        </button>
                      </div>
                    </div>

                    {paymentError && (
                      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg flex items-center gap-2 text-red-700 dark:text-red-300">
                        <AlertCircle className="h-5 w-5" />
                        <span className="text-sm">{paymentError}</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {!paymentSuccess && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={processPayment}
                    disabled={processing || !paymentAmount}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {processing ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5" />
                        Pay {paymentAmount ? formatCurrency(parseFloat(paymentAmount)) : 'Now'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Payment History Modal */}
        {showPaymentHistory && student && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <History className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Payment History
                    </h3>
                    <p className="text-sm text-gray-500">{student.student_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingHistory ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading payment history...</p>
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No payments found for this student</p>
                    <p className="text-sm text-gray-400 mt-1">Payments made through Peeap will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                              <ArrowUpRight className="h-4 w-4 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">
                                {payment.description || 'School Fee Payment'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(payment.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              {formatCurrency(Math.abs(payment.amount))}
                            </p>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              payment.status === 'COMPLETED'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {payment.status}
                            </span>
                          </div>
                        </div>
                        {payment.reference && (
                          <p className="text-xs text-gray-400 mt-2 font-mono">
                            Ref: {payment.reference}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowPaymentHistory(false)}
                  className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
