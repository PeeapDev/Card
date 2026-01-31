/**
 * Student Connect Page
 *
 * Allows parents to:
 * - Search and link to schools
 * - Add students by NSI (National Student Identifier)
 * - View and top up student wallets via Monime USSD
 * - View student transactions
 * - Pay school fees
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  GraduationCap,
  Search,
  Plus,
  Wallet,
  ArrowUpCircle,
  History,
  Receipt,
  ChevronRight,
  X,
  User,
  School,
  CreditCard,
  Check,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Send,
  Building2,
  Smartphone,
  Phone,
  Copy,
  Clock,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MotionCard } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';

interface Student {
  id: string;
  nsi: string;  // National Student Identifier
  firstName: string;
  lastName: string;
  schoolName: string;
  schoolId: string;
  class: string;
  walletId: string;
  balance: number;
  profilePicture?: string;
  linkedAt: string;
}

interface SchoolResult {
  id: string;
  name: string;
  code: string;
  location: string;
  logo?: string;
}

interface Transaction {
  id: string;
  type: 'topup' | 'purchase' | 'fee';
  amount: number;
  description: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  vendorName?: string;
}

type ModalType = 'none' | 'add-student' | 'topup' | 'transactions' | 'pay-fees';
type Tab = 'students' | 'transactions' | 'fees';

export function StudentConnectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('students');
  const [activeModal, setActiveModal] = useState<ModalType>('none');
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  // Add Student Form State
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolResults, setSchoolResults] = useState<SchoolResult[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolResult | null>(null);
  const [nsi, setNsi] = useState('');  // National Student Identifier
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Top-up State
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);

  // USSD Deposit State
  const [showUssdModal, setShowUssdModal] = useState(false);
  const [ussdCode, setUssdCode] = useState('');
  const [ussdExpiry, setUssdExpiry] = useState<Date | null>(null);
  const [paymentCodeId, setPaymentCodeId] = useState('');
  const [ussdPolling, setUssdPolling] = useState(false);
  const [ussdStatus, setUssdStatus] = useState<'pending' | 'completed' | 'failed' | 'expired'>('pending');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Transactions State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  useEffect(() => {
    loadStudents();
  }, [user?.id]);

  const loadStudents = async () => {
    setLoading(true);
    try {
      // TODO: Fetch linked students from API
      // GET /api/parent-students?parentId={userId}

      // Mock data for now
      setStudents([
        {
          id: '1',
          nsi: 'SL-2024-01-00001',
          firstName: 'John',
          lastName: 'Doe',
          schoolName: 'Freetown Secondary School',
          schoolId: 'school_001',
          class: 'Grade 10A',
          walletId: 'wal_001',
          balance: 15000000,
          linkedAt: '2024-01-15T10:00:00Z',
        },
        {
          id: '2',
          nsi: 'SL-2024-01-00002',
          firstName: 'Jane',
          lastName: 'Doe',
          schoolName: 'Freetown Secondary School',
          schoolId: 'school_001',
          class: 'Grade 8B',
          walletId: 'wal_002',
          balance: 8500000,
          linkedAt: '2024-01-15T10:00:00Z',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSchools = async (query: string) => {
    setSchoolSearch(query);
    if (query.length < 2) {
      setSchoolResults([]);
      return;
    }

    setSearchingSchools(true);
    try {
      // TODO: Call API to search schools
      // GET /api/schools/search?q={query}

      // Mock data
      setTimeout(() => {
        setSchoolResults([
          { id: 'school_001', name: 'Freetown Secondary School', code: 'FSS', location: 'Freetown' },
          { id: 'school_002', name: 'Bo Government School', code: 'BGS', location: 'Bo' },
          { id: 'school_003', name: 'Kenema Model School', code: 'KMS', location: 'Kenema' },
        ].filter(s =>
          s.name.toLowerCase().includes(query.toLowerCase()) ||
          s.code.toLowerCase().includes(query.toLowerCase())
        ));
        setSearchingSchools(false);
      }, 500);
    } catch (error) {
      setSearchingSchools(false);
    }
  };

  const handleAddStudent = async () => {
    if (!selectedSchool || !nsi.trim()) {
      setAddError('Please select a school and enter student NSI');
      return;
    }

    setAddingStudent(true);
    setAddError(null);

    try {
      // TODO: Call API to link student
      // POST /api/parent-students
      // { parentId, schoolId, nsi }

      // Mock success
      const newStudent: Student = {
        id: `new_${Date.now()}`,
        nsi: nsi.trim().toUpperCase(),
        firstName: 'New',
        lastName: 'Student',
        schoolName: selectedSchool.name,
        schoolId: selectedSchool.id,
        class: 'Unknown',
        walletId: `wal_${Date.now()}`,
        balance: 0,
        linkedAt: new Date().toISOString(),
      };

      setStudents(prev => [...prev, newStudent]);
      setActiveModal('none');
      setSelectedSchool(null);
      setNsi('');
      setSchoolSearch('');
    } catch (error: any) {
      setAddError(error.message || 'Failed to add student. Please try again.');
    } finally {
      setAddingStudent(false);
    }
  };

  const handleTopup = async () => {
    if (!selectedStudent || !topupAmount) return;

    const amount = parseFloat(topupAmount);
    if (isNaN(amount) || amount <= 0) {
      setTopupError('Please enter a valid amount');
      return;
    }

    setTopupLoading(true);
    setTopupError(null);

    try {
      // Call API to create Monime deposit session for student wallet
      const response = await api.post('/monime/deposit', {
        walletId: selectedStudent.walletId,
        amount: amount,
        currency: 'SLE',
        description: `Top-up for ${selectedStudent.firstName} ${selectedStudent.lastName}`,
      });

      // Check if we got a USSD code (direct display) or payment URL (redirect to Monime checkout)
      if (response.ussdCode) {
        // Show USSD modal with the code
        setUssdCode(response.ussdCode);
        setPaymentCodeId(response.paymentCodeId || response.monimeSessionId);
        setUssdExpiry(new Date(response.expiresAt));
        setUssdStatus('pending');
        setActiveModal('none');
        setShowUssdModal(true);

        // Start polling for payment status
        startPaymentPolling(response.paymentCodeId || response.monimeSessionId);
      } else if (response.paymentUrl) {
        // Redirect to Monime checkout page where user can see USSD code or pay with mobile money
        // Store the session info for when user returns
        sessionStorage.setItem('pendingTopup', JSON.stringify({
          studentId: selectedStudent.id,
          walletId: selectedStudent.walletId,
          amount: amount,
          monimeSessionId: response.monimeSessionId,
        }));

        // Open Monime checkout in new tab (so user doesn't lose their place)
        window.open(response.paymentUrl, '_blank');

        // Show info modal about completing payment
        setUssdCode('');
        setPaymentCodeId(response.monimeSessionId);
        setUssdExpiry(new Date(response.expiresAt));
        setUssdStatus('pending');
        setActiveModal('none');
        setShowUssdModal(true);

        // Start polling for payment completion
        startPaymentPolling(response.monimeSessionId);
      } else {
        setTopupError('Failed to generate payment session. Please try again.');
      }
    } catch (error: any) {
      console.error('Topup error:', error);
      setTopupError(error.message || 'Failed to initiate top-up. Please try again.');
    } finally {
      setTopupLoading(false);
    }
  };

  // Start polling for USSD payment status
  const startPaymentPolling = (sessionId: string) => {
    setUssdPolling(true);

    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    // Poll our transactions table for status updates
    // The deposit gets completed via webhook or redirect callback
    pollingIntervalRef.current = setInterval(async () => {
      try {
        // Check transaction status by looking for a completed transaction with this reference
        const response = await api.get(`/transactions/status?reference=${sessionId}`);

        if (response.status === 'COMPLETED' || response.status === 'completed') {
          setUssdStatus('completed');
          stopPolling();
          // Refresh student data to show updated balance
          loadStudents();
        } else if (response.status === 'FAILED' || response.status === 'failed') {
          setUssdStatus('failed');
          stopPolling();
        } else if (response.status === 'EXPIRED' || response.status === 'expired') {
          setUssdStatus('expired');
          stopPolling();
        }
      } catch (error) {
        // If endpoint doesn't exist or returns error, continue polling
        console.log('Polling - waiting for payment confirmation...');
      }
    }, 4000); // Poll every 4 seconds

    // Auto-stop after 10 minutes (Monime sessions typically expire in 15 mins)
    setTimeout(() => {
      if (ussdPolling) {
        setUssdStatus('expired');
        stopPolling();
      }
    }, 10 * 60 * 1000);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setUssdPolling(false);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Copy USSD code to clipboard
  const copyUssdCode = async () => {
    try {
      await navigator.clipboard.writeText(ussdCode);
      // Could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Dial USSD code (mobile only)
  const dialUssdCode = () => {
    const formatted = ussdCode.replace('#', '%23'); // URL encode hash
    window.location.href = `tel:${formatted}`;
  };

  // Close USSD modal
  const closeUssdModal = () => {
    stopPolling();
    setShowUssdModal(false);
    setUssdCode('');
    setPaymentCodeId('');
    setUssdExpiry(null);
    setUssdStatus('pending');
    setTopupAmount('');
    setSelectedStudent(null);
  };

  const handleViewTransactions = async (student: Student) => {
    setSelectedStudent(student);
    setLoadingTransactions(true);
    setActiveModal('transactions');

    try {
      // TODO: Fetch student transactions from API
      // GET /api/parent-students/{studentId}/transactions

      // Mock data
      setTimeout(() => {
        setTransactions([
          {
            id: 't1',
            type: 'topup',
            amount: 5000000,
            description: 'Wallet top-up from Parent',
            timestamp: '2024-01-15T14:30:00Z',
            status: 'completed',
          },
          {
            id: 't2',
            type: 'purchase',
            amount: -150000,
            description: 'Lunch - Rice & Chicken',
            timestamp: '2024-01-15T12:30:00Z',
            status: 'completed',
            vendorName: 'Campus Canteen',
          },
          {
            id: 't3',
            type: 'purchase',
            amount: -50000,
            description: 'Notebook',
            timestamp: '2024-01-14T10:00:00Z',
            status: 'completed',
            vendorName: 'Student Bookshop',
          },
          {
            id: 't4',
            type: 'fee',
            amount: -2500000,
            description: 'Term 1 School Fees',
            timestamp: '2024-01-10T09:00:00Z',
            status: 'completed',
          },
        ]);
        setLoadingTransactions(false);
      }, 500);
    } catch (error) {
      setLoadingTransactions(false);
    }
  };

  const openTopupModal = (student: Student) => {
    setSelectedStudent(student);
    setActiveModal('topup');
  };

  const formatAmount = (amount: number) => {
    return `SLE ${(amount / 100).toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalBalance = students.reduce((sum, s) => sum + s.balance, 0);

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Student Connect</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage and top up your children's school wallets</p>
            </div>
          </div>
          <button
            onClick={() => setActiveModal('add-student')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>

        {/* Total Balance Card */}
        <MotionCard className="p-6 bg-gradient-to-br from-blue-600 to-blue-700" glowEffect>
          <div className="flex items-center justify-between text-white">
            <div>
              <p className="text-blue-100 text-sm mb-1">Total Student Balances</p>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-bold">
                  {showBalance ? formatAmount(totalBalance) : '••••••'}
                </h2>
                <button
                  onClick={() => setShowBalance(!showBalance)}
                  className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                >
                  {showBalance ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-blue-100 text-sm mt-1">{students.length} linked student(s)</p>
            </div>
            <div className="p-4 bg-white/20 rounded-2xl">
              <Wallet className="w-8 h-8" />
            </div>
          </div>
        </MotionCard>

        {/* Students List */}
        <div className="space-y-4">
          <h3 className="font-semibold text-gray-900 dark:text-white">Linked Students</h3>

          {students.length === 0 ? (
            <MotionCard className="p-8 text-center">
              <GraduationCap className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No students linked</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Add your children to monitor their school spending and top up their wallets
              </p>
              <button
                onClick={() => setActiveModal('add-student')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add First Student
              </button>
            </MotionCard>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {students.map((student) => (
                <MotionCard key={student.id} className="p-4" glowEffect>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                      {student.profilePicture ? (
                        <img src={student.profilePicture} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-blue-600 dark:text-blue-400 font-semibold">
                          {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {student.firstName} {student.lastName}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {student.nsi} • {student.class}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
                        <School className="w-3 h-3" />
                        {student.schoolName}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900 dark:text-white">
                        {showBalance ? formatAmount(student.balance) : '••••'}
                      </p>
                      <p className="text-xs text-gray-500">Balance</p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => openTopupModal(student)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      <ArrowUpCircle className="w-4 h-4" />
                      Top Up
                    </button>
                    <button
                      onClick={() => handleViewTransactions(student)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                      <History className="w-4 h-4" />
                      History
                    </button>
                  </div>
                </MotionCard>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => setActiveModal('add-student')}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-colors text-left"
          >
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
              <Plus className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Add Student</p>
            <p className="text-xs text-gray-500">Link new student</p>
          </button>

          <button
            onClick={() => students.length > 0 && openTopupModal(students[0])}
            disabled={students.length === 0}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-3">
              <Send className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Quick Top Up</p>
            <p className="text-xs text-gray-500">Fund wallet</p>
          </button>

          <button
            onClick={() => students.length > 0 && handleViewTransactions(students[0])}
            disabled={students.length === 0}
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700 transition-colors text-left disabled:opacity-50"
          >
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-3">
              <History className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Transactions</p>
            <p className="text-xs text-gray-500">View history</p>
          </button>

          <button
            disabled
            className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors text-left opacity-50 cursor-not-allowed"
          >
            <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-3">
              <Receipt className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <p className="font-medium text-gray-900 dark:text-white text-sm">Pay Fees</p>
            <p className="text-xs text-gray-500">Coming soon</p>
          </button>
        </div>
      </motion.div>

      {/* Add Student Modal */}
      <AnimatePresence>
        {activeModal === 'add-student' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Student</h2>
                <button
                  onClick={() => {
                    setActiveModal('none');
                    setSelectedSchool(null);
                    setNsi('');
                    setSchoolSearch('');
                    setAddError(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                {/* School Search */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Search School
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={schoolSearch}
                      onChange={(e) => handleSearchSchools(e.target.value)}
                      placeholder="Enter school name or code..."
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>

                  {/* School Results */}
                  {searchingSchools && (
                    <div className="mt-2 p-3 text-center text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    </div>
                  )}

                  {schoolResults.length > 0 && !selectedSchool && (
                    <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      {schoolResults.map((school) => (
                        <button
                          key={school.id}
                          onClick={() => {
                            setSelectedSchool(school);
                            setSchoolSearch(school.name);
                            setSchoolResults([]);
                          }}
                          className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0"
                        >
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="text-left">
                            <p className="font-medium text-gray-900 dark:text-white">{school.name}</p>
                            <p className="text-sm text-gray-500">{school.code} • {school.location}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Selected School */}
                  {selectedSchool && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/50 rounded-lg flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedSchool.name}</p>
                          <p className="text-sm text-blue-600 dark:text-blue-400">{selectedSchool.code}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSchool(null);
                          setSchoolSearch('');
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Student NSI (National Student Identifier) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    National Student ID (NSI)
                  </label>
                  <input
                    type="text"
                    value={nsi}
                    onChange={(e) => setNsi(e.target.value.toUpperCase())}
                    placeholder="e.g., SL-2024-01-00001"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Enter the student's National Student Identifier
                  </p>
                </div>

                {/* Error Message */}
                {addError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm">{addError}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setActiveModal('none');
                    setSelectedSchool(null);
                    setNsi('');
                    setSchoolSearch('');
                    setAddError(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddStudent}
                  disabled={!selectedSchool || !nsi.trim() || addingStudent}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {addingStudent ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Student
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-up Modal */}
      <AnimatePresence>
        {activeModal === 'topup' && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Up Wallet</h2>
                <button
                  onClick={() => {
                    setActiveModal('none');
                    setTopupAmount('');
                    setTopupError(null);
                    setSelectedStudent(null);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Student Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-400 font-semibold">
                        {selectedStudent.firstName.charAt(0)}{selectedStudent.lastName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedStudent.firstName} {selectedStudent.lastName}
                      </p>
                      <p className="text-sm text-gray-500">
                        Balance: {formatAmount(selectedStudent.balance)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Amount Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Amount (SLE)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      SLE
                    </span>
                    <input
                      type="number"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full pl-14 pr-4 py-3 text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Quick Amounts */}
                <div className="flex gap-2">
                  {[500, 1000, 2000, 5000].map((amount) => (
                    <button
                      key={amount}
                      onClick={() => setTopupAmount(amount.toString())}
                      className="flex-1 py-2 text-sm font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      {amount.toLocaleString()}
                    </button>
                  ))}
                </div>

                {/* Payment Method Info */}
                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm font-medium">Mobile Money (USSD)</span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    You'll receive a USSD code to dial on your phone to complete the deposit
                  </p>
                </div>

                {/* Error Message */}
                {topupError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2 text-red-700 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <p className="text-sm">{topupError}</p>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                  onClick={() => {
                    setActiveModal('none');
                    setTopupAmount('');
                    setTopupError(null);
                    setSelectedStudent(null);
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTopup}
                  disabled={!topupAmount || parseFloat(topupAmount) <= 0 || topupLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {topupLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating Code...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4" />
                      Get USSD Code
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions Modal */}
      <AnimatePresence>
        {activeModal === 'transactions' && selectedStudent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h2>
                  <p className="text-sm text-gray-500">{selectedStudent.firstName} {selectedStudent.lastName}</p>
                </div>
                <button
                  onClick={() => {
                    setActiveModal('none');
                    setSelectedStudent(null);
                    setTransactions([]);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {loadingTransactions ? (
                  <div className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="p-8 text-center">
                    <History className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                    <p className="text-gray-500">No transactions yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {transactions.map((tx) => (
                      <div key={tx.id} className="p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          tx.type === 'topup'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : tx.type === 'fee'
                            ? 'bg-amber-100 dark:bg-amber-900/30'
                            : 'bg-blue-100 dark:bg-blue-900/30'
                        }`}>
                          {tx.type === 'topup' ? (
                            <ArrowUpCircle className={`w-5 h-5 text-green-600 dark:text-green-400`} />
                          ) : tx.type === 'fee' ? (
                            <Receipt className={`w-5 h-5 text-amber-600 dark:text-amber-400`} />
                          ) : (
                            <CreditCard className={`w-5 h-5 text-blue-600 dark:text-blue-400`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{tx.description}</p>
                          <p className="text-xs text-gray-500">
                            {formatDate(tx.timestamp)}
                            {tx.vendorName && ` • ${tx.vendorName}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${
                            tx.amount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'
                          }`}>
                            {tx.amount > 0 ? '+' : ''}{formatAmount(tx.amount)}
                          </p>
                          <p className={`text-xs ${
                            tx.status === 'completed' ? 'text-green-500' :
                            tx.status === 'pending' ? 'text-amber-500' : 'text-red-500'
                          }`}>
                            {tx.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* USSD Deposit Modal */}
      <AnimatePresence>
        {showUssdModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full"
            >
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Mobile Money Deposit</h2>
                    <p className="text-sm text-gray-500">Dial to complete payment</p>
                  </div>
                </div>
                <button
                  onClick={closeUssdModal}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status Indicator */}
                <div className="text-center">
                  {ussdStatus === 'pending' && (
                    <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="font-medium">Waiting for payment...</span>
                    </div>
                  )}
                  {ussdStatus === 'completed' && (
                    <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-medium">Payment Successful!</span>
                    </div>
                  )}
                  {ussdStatus === 'failed' && (
                    <div className="flex items-center justify-center gap-2 text-red-600 dark:text-red-400">
                      <XCircle className="w-5 h-5" />
                      <span className="font-medium">Payment Failed</span>
                    </div>
                  )}
                  {ussdStatus === 'expired' && (
                    <div className="flex items-center justify-center gap-2 text-gray-600 dark:text-gray-400">
                      <Clock className="w-5 h-5" />
                      <span className="font-medium">Code Expired</span>
                    </div>
                  )}
                </div>

                {/* Amount Display */}
                <div className="text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Amount to deposit</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    SLE {topupAmount ? parseFloat(topupAmount).toLocaleString() : '0'}
                  </p>
                </div>

                {/* USSD Code Display or Payment Instructions */}
                {ussdStatus === 'pending' && (
                  <>
                    {ussdCode ? (
                      // Direct USSD code display
                      <>
                        <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl text-center border-2 border-dashed border-gray-300 dark:border-gray-600">
                          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Dial this code on your phone</p>
                          <p className="text-2xl font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                            {ussdCode}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                          <button
                            onClick={copyUssdCode}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <Copy className="w-4 h-4" />
                            Copy Code
                          </button>
                          <button
                            onClick={dialUssdCode}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                          >
                            <Phone className="w-4 h-4" />
                            Dial Now
                          </button>
                        </div>
                      </>
                    ) : (
                      // Monime checkout opened in new tab
                      <div className="p-6 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-center">
                        <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Smartphone className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                          Complete Payment in New Tab
                        </h4>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          A payment page has opened in a new tab. Please complete the payment there using mobile money.
                        </p>
                      </div>
                    )}

                    {/* Expiry Timer */}
                    {ussdExpiry && (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Clock className="w-4 h-4" />
                        <span>
                          Expires at {ussdExpiry.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}

                    {/* Polling indicator */}
                    <div className="flex items-center justify-center gap-2 py-2">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        Waiting for payment confirmation...
                      </span>
                    </div>

                    {/* Instructions */}
                    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">Instructions</h4>
                      <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-decimal list-inside">
                        {ussdCode ? (
                          <>
                            <li>Dial the USSD code above on your mobile phone</li>
                            <li>Follow the prompts to authorize the payment</li>
                            <li>Enter your mobile money PIN when prompted</li>
                          </>
                        ) : (
                          <>
                            <li>Go to the payment page that opened in a new tab</li>
                            <li>Select your mobile money provider (Orange Money, Africell, etc.)</li>
                            <li>Enter your phone number and confirm the payment</li>
                          </>
                        )}
                        <li>This page will update automatically when payment is complete</li>
                      </ol>
                    </div>
                  </>
                )}

                {/* Success State */}
                {ussdStatus === 'completed' && (
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-gray-600 dark:text-gray-300">
                      The funds have been added to the student's wallet.
                    </p>
                    <button
                      onClick={closeUssdModal}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Done
                    </button>
                  </div>
                )}

                {/* Failed/Expired State */}
                {(ussdStatus === 'failed' || ussdStatus === 'expired') && (
                  <div className="text-center space-y-4">
                    <p className="text-gray-600 dark:text-gray-300">
                      {ussdStatus === 'failed'
                        ? 'The payment could not be completed. Please try again.'
                        : 'The payment code has expired. Please request a new code.'}
                    </p>
                    <div className="flex gap-3 justify-center">
                      <button
                        onClick={closeUssdModal}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        Close
                      </button>
                      <button
                        onClick={() => {
                          closeUssdModal();
                          if (selectedStudent) {
                            openTopupModal(selectedStudent);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </MainLayout>
  );
}
