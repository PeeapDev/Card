import { useState, useEffect, useMemo } from 'react';
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
  ArrowUpRight,
  Clock,
  Sparkles,
  BookOpen,
  Building2,
  TrendingUp,
  Calendar,
  ArrowRight,
  CircleDollarSign,
  BadgeCheck,
  ChevronDown,
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
  nsi: string;
  index_number?: string;
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
    nsi: string;
    index_number?: string;
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
  const [nsi, setNsi] = useState('');
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
  const [showWalletDropdown, setShowWalletDropdown] = useState(false);

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

  // Calculate payment progress
  const paymentProgress = useMemo(() => {
    if (!financials?.fees_summary) return 0;
    const { total_fees, total_paid } = financials.fees_summary;
    if (total_fees === 0) return 100;
    return Math.round((total_paid / total_fees) * 100);
  }, [financials]);

  // Load NSI from URL params
  useEffect(() => {
    const nsiFromUrl = searchParams.get('nsi') || searchParams.get('index');
    if (nsiFromUrl) {
      setNsi(nsiFromUrl);
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
        const allWallets = await walletService.getWallets(user.id);
        if (!allWallets || allWallets.length === 0) {
          setLoadingWallet(false);
          return;
        }

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

        const userWithDefault = user as any;
        let mainWalletId = '';

        if (userWithDefault?.defaultWalletId || userWithDefault?.default_wallet_id) {
          const defaultId = userWithDefault.defaultWalletId || userWithDefault.default_wallet_id;
          if (sleWallets.find(w => w.id === defaultId)) {
            mainWalletId = defaultId;
          }
        }

        if (!mainWalletId) {
          const primaryWallet = sleWallets.find(w => w.walletType === 'primary');
          if (primaryWallet) mainWalletId = primaryWallet.id;
        }

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

  // Auto-format NSI
  const formatNsi = (value: string): string => {
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

  // Search for student by NSI
  const searchStudent = async () => {
    if (!nsi.trim() || nsi.length < 10) {
      setSearchError('Please enter a valid NSI');
      return;
    }

    setSearching(true);
    setSearchError(null);
    setStudent(null);
    setFinancials(null);

    try {
      const verifyRes = await fetch(`${API_BASE}/verify-student`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nsi: nsi.trim(), index_number: nsi.trim() }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success || !verifyData.found) {
        setSearchError(verifyData.message || 'Student not found. Please check the NSI.');
        return;
      }

      const studentData: StudentData = {
        student_id: verifyData.data.student_id,
        student_name: verifyData.data.student_name,
        first_name: verifyData.data.first_name,
        last_name: verifyData.data.last_name,
        admission_no: verifyData.data.admission_no,
        nsi: verifyData.data.nsi || verifyData.data.index_number,
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
      await fetchFinancials(studentData.student_id, studentData.school_id);
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchError(`Could not connect to school system: ${err?.message || 'Unknown error'}`);
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

  // Fetch payment history
  const fetchPaymentHistory = async (studentNsi: string) => {
    setLoadingHistory(true);
    try {
      const { data, error } = await supabaseAdmin
        .from('transactions')
        .select('*')
        .eq('type', 'SCHOOL_FEE')
        .contains('metadata', { student_index: studentNsi })
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

  // Process payment
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
      const result = await parentStudentService.paySchoolFee({
        parentWalletId: userWallet.id,
        studentNsi: student.nsi,
        feeId: selectedFee.id.toString(),
        amount: amount,
        schoolId: student.school_id.toString(),
      });

      if (result.success) {
        setPaymentSuccess(true);
        setUserWallets(prev => prev.map(w =>
          w.id === selectedWalletId ? { ...w, balance: w.balance - amount } : w
        ));
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

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', label: 'Paid' };
      case 'partial':
        return { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', label: 'Partial' };
      case 'unpaid':
        return { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', label: 'Unpaid' };
      case 'overdue':
        return { bg: 'bg-red-50 dark:bg-red-500/10', text: 'text-red-600 dark:text-red-400', label: 'Overdue' };
      default:
        return { bg: 'bg-gray-50 dark:bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', label: status };
    }
  };

  // Clear and go back to search
  const clearStudent = () => {
    setStudent(null);
    setFinancials(null);
    setNsi('');
  };

  return (
    <MainLayout>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="max-w-5xl mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 mb-4">
              <GraduationCap className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              School Fee Payment
            </h1>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
              Pay school fees instantly and securely for any student in Sierra Leone
            </p>
          </div>

          {/* Wallet Card - Floating Style */}
          {!loadingWallet && userWallets.length > 0 && (
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-3xl blur-xl opacity-30" />
              <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 rounded-3xl p-6 text-white overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-32 translate-x-32" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />

                <div className="relative flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Wallet className="h-4 w-4 opacity-80" />
                      <span className="text-sm opacity-80">Payment Wallet</span>
                    </div>
                    <p className="text-3xl font-bold tracking-tight">
                      {formatCurrency(userWallet?.balance || 0)}
                    </p>
                    {userWallets.length > 1 && (
                      <div className="relative mt-3">
                        <button
                          onClick={() => setShowWalletDropdown(!showWalletDropdown)}
                          className="flex items-center gap-2 text-sm bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <span>{userWallet?.name || 'Main Wallet'}</span>
                          <ChevronDown className="h-4 w-4" />
                        </button>
                        {showWalletDropdown && (
                          <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 py-2 z-50">
                            {userWallets.map((w) => (
                              <button
                                key={w.id}
                                onClick={() => {
                                  setSelectedWalletId(w.id);
                                  setShowWalletDropdown(false);
                                }}
                                className={`w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                                  w.id === selectedWalletId ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                                }`}
                              >
                                <span className="text-gray-900 dark:text-white font-medium">
                                  {w.name || 'SLE Wallet'}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400 text-sm">
                                  {formatCurrency(w.balance)}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <CircleDollarSign className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* No Wallet Warning */}
          {!loadingWallet && userWallets.length === 0 && (
            <div className="mb-8 p-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-amber-100 dark:bg-amber-900/50 rounded-xl flex items-center justify-center">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-amber-800 dark:text-amber-200">Wallet Required</h3>
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    You need a Leones wallet to pay school fees. Add funds to your wallet to get started.
                  </p>
                </div>
              </div>
            </div>
          )}

          {!student ? (
            <div className="space-y-6">
              {/* Linked Children Section */}
              {!loadingChildren && linkedChildren.length > 0 && (
                <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-sm shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                        <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">Your Children</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Quick access to linked students</p>
                      </div>
                    </div>
                    <Link
                      to="/my-children"
                      className="text-sm text-purple-600 hover:text-purple-700 dark:text-purple-400 flex items-center gap-1 font-medium"
                    >
                      Manage
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                  <div className="p-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {linkedChildren.map((child) => (
                        <button
                          key={child.id}
                          onClick={() => {
                            setNsi(child.student.nsi);
                            setTimeout(() => searchStudent(), 100);
                          }}
                          className="group flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-200 dark:hover:border-purple-800 border border-transparent transition-all text-left"
                        >
                          {child.student.profilePhotoUrl ? (
                            <img
                              src={child.student.profilePhotoUrl}
                              alt={child.student.fullName}
                              className="w-12 h-12 rounded-xl object-cover ring-2 ring-white dark:ring-gray-700 shadow-sm"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm">
                              {child.student.firstName.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                              {child.student.fullName}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                              {child.student.schoolName}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                              {child.student.className}
                            </p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-gray-300 dark:text-gray-600 group-hover:text-purple-500 dark:group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Search Card */}
              <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-sm shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="p-8">
                  <div className="max-w-md mx-auto">
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-sm font-medium mb-4">
                        <Sparkles className="h-4 w-4" />
                        <span>Find Any Student</span>
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        Enter Student NSI
                      </h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        National Student Identifier - found on student ID card
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div className="relative">
                        <input
                          type="text"
                          value={nsi}
                          onChange={(e) => {
                            setNsi(formatNsi(e.target.value));
                            setSearchError(null);
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && searchStudent()}
                          placeholder="SL-2025-02-00050"
                          className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-100 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-lg text-center tracking-wider transition-all"
                          autoFocus
                        />
                      </div>

                      {searchError && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-300">
                          <AlertCircle className="h-5 w-5 flex-shrink-0" />
                          <span className="text-sm">{searchError}</span>
                        </div>
                      )}

                      <button
                        id="search-student-btn"
                        onClick={searchStudent}
                        disabled={searching || !nsi.trim()}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
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
                    </div>

                    {/* Link to manage children */}
                    <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700/50 text-center">
                      <Link
                        to="/my-children"
                        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-purple-600 dark:text-gray-400 dark:hover:text-purple-400 transition-colors"
                      >
                        <Users className="h-4 w-4" />
                        <span>Link a child to your account for faster access</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Student Details & Fees */
            <div className="space-y-6">
              {/* Student Profile Card */}
              <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-sm shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                <div className="p-6">
                  <div className="flex items-start gap-5">
                    {student.profile_photo_url ? (
                      <img
                        src={student.profile_photo_url}
                        alt={student.student_name}
                        className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white dark:ring-gray-700 shadow-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                        {student.first_name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            {student.student_name}
                          </h2>
                          <div className="flex items-center gap-2 mt-1">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span className="text-gray-500 dark:text-gray-400">{student.school_name}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-3 mt-3">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium">
                              <BookOpen className="h-3.5 w-3.5" />
                              {student.class_name}
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded-lg text-sm font-mono">
                              {student.nsi}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              fetchPaymentHistory(student.nsi);
                              setShowPaymentHistory(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors text-sm font-medium"
                          >
                            <History className="h-4 w-4" />
                            <span className="hidden sm:inline">History</span>
                          </button>
                          <button
                            onClick={clearStudent}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                          >
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {loadingFinancials ? (
                <div className="bg-white dark:bg-gray-800/50 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-16 text-center">
                  <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">Loading fee information...</p>
                </div>
              ) : financials ? (
                <>
                  {/* Payment Progress */}
                  <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-sm shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700/50 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                          <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Payment Progress</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{paymentProgress}% of total fees paid</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Balance Due</p>
                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                          {formatCurrency(financials.fees_summary.balance_due)}
                        </p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="relative h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-500"
                        style={{ width: `${paymentProgress}%` }}
                      />
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-4 mt-6">
                      <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/30 rounded-2xl">
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Fees</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                          {formatCurrency(financials.fees_summary.total_fees)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                        <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">Paid</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(financials.fees_summary.total_paid)}
                        </p>
                      </div>
                      <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/20 rounded-2xl">
                        <p className="text-sm text-rose-600 dark:text-rose-400 mb-1">Outstanding</p>
                        <p className="text-lg font-bold text-rose-600 dark:text-rose-400">
                          {formatCurrency(financials.fees_summary.balance_due)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Fees List */}
                  <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-sm shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                          <Receipt className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 dark:text-white">Fee Breakdown</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{financials.fees.length} fee items</p>
                        </div>
                      </div>
                      <button
                        onClick={refreshFinancials}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                      >
                        <RefreshCw className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                      {financials.fees.length > 0 ? (
                        financials.fees.map((fee) => {
                          const status = getStatusConfig(fee.status);
                          return (
                            <div key={fee.id} className="p-5 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold text-gray-900 dark:text-white">{fee.name}</h4>
                                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.text}`}>
                                      {status.label}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                                    {fee.term && (
                                      <span className="flex items-center gap-1">
                                        <Calendar className="h-3.5 w-3.5" />
                                        {fee.term}
                                      </span>
                                    )}
                                    {fee.due_date && fee.due_date !== '1970-01-01' && (
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3.5 w-3.5" />
                                        Due: {fee.due_date}
                                      </span>
                                    )}
                                  </div>
                                  {fee.paid > 0 && (
                                    <div className="mt-2">
                                      <div className="flex items-center gap-2 text-sm">
                                        <span className="text-gray-500">Paid: </span>
                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                          {formatCurrency(fee.paid)}
                                        </span>
                                        <span className="text-gray-400">of</span>
                                        <span className="font-medium text-gray-700 dark:text-gray-300">
                                          {formatCurrency(fee.amount)}
                                        </span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    {fee.balance > 0 ? (
                                      <>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Balance</p>
                                        <p className="text-xl font-bold text-gray-900 dark:text-white">
                                          {formatCurrency(fee.balance)}
                                        </p>
                                      </>
                                    ) : (
                                      <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                                        <BadgeCheck className="h-5 w-5" />
                                        <span className="font-semibold">Paid</span>
                                      </div>
                                    )}
                                  </div>
                                  {fee.balance > 0 && (
                                    <button
                                      onClick={() => openPayModal(fee)}
                                      className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-sm font-semibold rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                                    >
                                      Pay Now
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-16 text-center">
                          <Receipt className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                          <p className="text-gray-500 dark:text-gray-400 font-medium">No fees found</p>
                          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">This student has no pending fees</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Transactions */}
                  {financials.recent_transactions.length > 0 && (
                    <div className="bg-white dark:bg-gray-800/50 backdrop-blur-sm rounded-3xl shadow-sm shadow-gray-200/50 dark:shadow-none border border-gray-100 dark:border-gray-700/50 overflow-hidden">
                      <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                            <History className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">School-side payment records</p>
                          </div>
                        </div>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {financials.recent_transactions.map((tx) => (
                          <div key={tx.id} className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {tx.description || tx.narration || tx.type}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {tx.date || tx.created_at}
                                </p>
                              </div>
                            </div>
                            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                              +{formatCurrency(Math.abs(tx.amount))}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="bg-white dark:bg-gray-800/50 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-16 text-center">
                  <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 font-medium">Could not load fee information</p>
                  <button
                    onClick={refreshFinancials}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-medium"
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Payment Modal */}
          {showPayModal && selectedFee && student && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <CreditCard className="h-5 w-5 text-white" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                      Pay Fee
                    </h3>
                  </div>
                  <button
                    onClick={() => setShowPayModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-6">
                  {paymentSuccess ? (
                    <div className="text-center py-8">
                      <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30 animate-in zoom-in">
                        <CheckCircle className="h-10 w-10 text-white" />
                      </div>
                      <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                        Payment Successful!
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 mb-1">
                        {formatCurrency(parseFloat(paymentAmount))} paid for {selectedFee.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                        For: {student?.student_name}
                      </p>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-left space-y-2">
                        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                          <CheckCircle className="h-4 w-4" />
                          <span>Deducted from your wallet</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                          <CheckCircle className="h-4 w-4" />
                          <span>Credited to school</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-300">
                          <CheckCircle className="h-4 w-4" />
                          <span>School system updated</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {/* Fee Details */}
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Receipt className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white">{selectedFee.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{student.student_name}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Total</p>
                            <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(selectedFee.amount)}</p>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Paid</p>
                            <p className="font-bold text-emerald-600">{formatCurrency(selectedFee.paid)}</p>
                          </div>
                          <div className="text-center p-3 bg-white dark:bg-gray-800 rounded-xl">
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Due</p>
                            <p className="font-bold text-rose-600">{formatCurrency(selectedFee.balance)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Wallet Balance */}
                      {userWallet && (
                        <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800">
                          <div className="flex items-center gap-3">
                            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Your Wallet</span>
                          </div>
                          <span className="font-bold text-blue-700 dark:text-blue-300">
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
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 font-medium">NLE</span>
                          <input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            className="w-full pl-14 pr-4 py-4 bg-gray-50 dark:bg-gray-700/50 border-2 border-gray-100 dark:border-gray-600 rounded-2xl text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xl font-bold"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => setPaymentAmount((selectedFee.balance / 2).toFixed(2))}
                            className="flex-1 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            50%
                          </button>
                          <button
                            onClick={() => setPaymentAmount(selectedFee.balance.toFixed(2))}
                            className="flex-1 px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            Full Balance
                          </button>
                        </div>
                      </div>

                      {paymentError && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-300">
                          <AlertCircle className="h-5 w-5 flex-shrink-0" />
                          <span className="text-sm">{paymentError}</span>
                        </div>
                      )}

                      <button
                        onClick={processPayment}
                        disabled={processing || !paymentAmount}
                        className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all"
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
            </div>
          )}

          {/* Payment History Modal */}
          {showPaymentHistory && student && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <History className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                        Payment History
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{student.student_name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowPaymentHistory(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-white/50 rounded-xl transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {loadingHistory ? (
                    <div className="text-center py-12">
                      <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-4" />
                      <p className="text-gray-500 dark:text-gray-400">Loading payment history...</p>
                    </div>
                  ) : paymentHistory.length === 0 ? (
                    <div className="text-center py-12">
                      <Receipt className="h-16 w-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
                      <p className="text-gray-600 dark:text-gray-300 font-medium">No payments found</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Payments made through Peeap will appear here</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {paymentHistory.map((payment) => (
                        <div
                          key={payment.id}
                          className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-2xl"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center">
                                <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              </div>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {payment.description || 'School Fee Payment'}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
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
                              <p className="font-bold text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(Math.abs(payment.amount))}
                              </p>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${
                                payment.status === 'COMPLETED'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                              }`}>
                                {payment.status}
                              </span>
                            </div>
                          </div>
                          {payment.reference && (
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-3 font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded inline-block">
                              Ref: {payment.reference}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-gray-100 dark:border-gray-700">
                  <button
                    onClick={() => setShowPaymentHistory(false)}
                    className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-2xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
