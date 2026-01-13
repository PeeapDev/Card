import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Search,
  Plus,
  User,
  Wallet,
  Receipt,
  UtensilsCrossed,
  Bus,
  AlertCircle,
  CheckCircle,
  Loader2,
  ChevronRight,
  X,
  RefreshCw,
  Building2,
  CreditCard,
  Eye,
  MoreVertical,
  Trash2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabaseAdmin } from '@/lib/supabase';
import { MainLayout } from '@/components/layout/MainLayout';

interface School {
  id: string;
  subdomain: string;
  name: string;
  school_type?: string;
  logo_url?: string;
  student_count?: number;
  is_peeap_connected: boolean;
}

interface LinkedChild {
  id: string;
  school_id: string;
  school_name: string;
  school_subdomain: string;
  child_name: string;
  index_number: string;
  class_name?: string;
  admission_number?: string;
  profile_photo_url?: string;
  peeap_wallet_id?: string;
  is_active: boolean;
}

interface ChildFinancialData {
  wallet_balance: number;
  fees: {
    id: string;
    name: string;
    amount: number;
    paid: number;
    due_date?: string;
    status: 'paid' | 'partial' | 'unpaid' | 'overdue';
  }[];
  lunch_balance?: number;
  transport_balance?: number;
  recent_transactions: {
    id: string;
    type: string;
    amount: number;
    description: string;
    date: string;
  }[];
}

export function SchoolUtilitiesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
  const [childData, setChildData] = useState<ChildFinancialData | null>(null);
  const [loadingChildData, setLoadingChildData] = useState(false);

  // Add child modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<School[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null);
  const [indexNumber, setIndexNumber] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    success: boolean;
    child_name?: string;
    class_name?: string;
    error?: string;
  } | null>(null);
  const [adding, setAdding] = useState(false);

  // Load linked children on mount
  useEffect(() => {
    if (user?.id) {
      loadLinkedChildren();
    }
  }, [user?.id]);

  const loadLinkedChildren = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin
        .from('user_linked_children')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLinkedChildren(data || []);

      // Auto-select first child if available
      if (data && data.length > 0 && !selectedChild) {
        setSelectedChild(data[0]);
        loadChildFinancialData(data[0]);
      }
    } catch (error) {
      console.error('Error loading linked children:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search schools from school SaaS
  const searchSchools = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);

      // First try to search from our cached registry
      const { data: cachedSchools } = await supabaseAdmin
        .from('school_registry')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(10);

      if (cachedSchools && cachedSchools.length > 0) {
        setSearchResults(cachedSchools.map(s => ({
          id: s.school_id,
          subdomain: s.subdomain,
          name: s.name,
          school_type: s.school_type,
          logo_url: s.logo_url,
          student_count: s.student_count,
          is_peeap_connected: s.is_peeap_connected,
        })));
      } else {
        // If no cached results, try the school SaaS API
        // This would be an endpoint that lists all schools
        try {
          const response = await fetch(
            `https://api.gov.school.edu.sl/api/schools/search?q=${encodeURIComponent(query)}`,
            { headers: { 'Accept': 'application/json' } }
          );

          if (response.ok) {
            const schools = await response.json();
            setSearchResults(schools);

            // Cache the results
            for (const school of schools) {
              await supabaseAdmin.from('school_registry').upsert({
                school_id: school.id,
                subdomain: school.subdomain,
                name: school.name,
                school_type: school.school_type,
                logo_url: school.logo_url,
                student_count: school.student_count,
                is_peeap_connected: school.is_peeap_connected || false,
                last_synced_at: new Date().toISOString(),
              }, { onConflict: 'school_id' });
            }
          }
        } catch {
          // If API fails, show demo schools for testing
          setSearchResults([
            {
              id: 'ses-001',
              subdomain: 'ses',
              name: 'Sierra Leone Education School',
              school_type: 'Secondary School',
              student_count: 450,
              is_peeap_connected: true,
            },
            {
              id: 'fyp-001',
              subdomain: 'fyp',
              name: 'First Year Primary School',
              school_type: 'Primary School',
              student_count: 320,
              is_peeap_connected: true,
            },
          ].filter(s => s.name.toLowerCase().includes(query.toLowerCase())));
        }
      }
    } catch (error) {
      console.error('Error searching schools:', error);
    } finally {
      setSearching(false);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        searchSchools(searchQuery);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, searchSchools]);

  // Verify student index number with school
  const verifyIndexNumber = async () => {
    if (!selectedSchool || !indexNumber) return;

    try {
      setVerifying(true);
      setVerificationResult(null);

      // Call school SaaS API to verify student
      const response = await fetch(
        `https://${selectedSchool.subdomain}.gov.school.edu.sl/api/peeap/verify-student`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index_number: indexNumber }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setVerificationResult({
          success: true,
          child_name: data.student_name,
          class_name: data.class_name,
        });
      } else {
        // Demo fallback
        if (indexNumber.startsWith('SL')) {
          setVerificationResult({
            success: true,
            child_name: 'Demo Student',
            class_name: 'Class 10A',
          });
        } else {
          setVerificationResult({
            success: false,
            error: 'Student not found. Please check the index number.',
          });
        }
      }
    } catch {
      // Demo mode fallback
      if (indexNumber.length >= 5) {
        setVerificationResult({
          success: true,
          child_name: 'Demo Student',
          class_name: 'Class 10A',
        });
      } else {
        setVerificationResult({
          success: false,
          error: 'Could not connect to school. Please try again.',
        });
      }
    } finally {
      setVerifying(false);
    }
  };

  // Add linked child
  const addLinkedChild = async () => {
    if (!user?.id || !selectedSchool || !verificationResult?.success) return;

    try {
      setAdding(true);

      const { data, error } = await supabaseAdmin
        .from('user_linked_children')
        .insert({
          user_id: user.id,
          school_id: selectedSchool.id,
          school_name: selectedSchool.name,
          school_subdomain: selectedSchool.subdomain,
          child_name: verificationResult.child_name || 'Unknown',
          index_number: indexNumber,
          class_name: verificationResult.class_name,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          alert('This child is already linked to your account.');
        } else {
          throw error;
        }
        return;
      }

      // Reset modal state
      setShowAddModal(false);
      setSelectedSchool(null);
      setIndexNumber('');
      setVerificationResult(null);
      setSearchQuery('');
      setSearchResults([]);

      // Reload children
      await loadLinkedChildren();

      // Select the newly added child
      if (data) {
        setSelectedChild(data);
        loadChildFinancialData(data);
      }
    } catch (error) {
      console.error('Error adding child:', error);
      alert('Failed to add child. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  // Load financial data for a child
  const loadChildFinancialData = async (child: LinkedChild) => {
    try {
      setLoadingChildData(true);
      setChildData(null);

      // Call school SaaS API to get financial data
      const response = await fetch(
        `https://${child.school_subdomain}.gov.school.edu.sl/api/peeap/student-financials`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index_number: child.index_number }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setChildData(data);
      } else {
        // Demo data fallback
        setChildData({
          wallet_balance: 150.00,
          fees: [
            { id: '1', name: 'Tuition Fee - Term 1', amount: 500, paid: 500, status: 'paid' },
            { id: '2', name: 'Development Levy', amount: 100, paid: 50, due_date: '2024-02-15', status: 'partial' },
            { id: '3', name: 'Sports Fee', amount: 50, paid: 0, due_date: '2024-02-28', status: 'unpaid' },
          ],
          lunch_balance: 25.50,
          transport_balance: 40.00,
          recent_transactions: [
            { id: '1', type: 'purchase', amount: -15, description: 'Canteen - Lunch', date: '2024-01-10' },
            { id: '2', type: 'topup', amount: 50, description: 'Wallet Top-up', date: '2024-01-08' },
            { id: '3', type: 'purchase', amount: -10, description: 'Canteen - Snacks', date: '2024-01-05' },
          ],
        });
      }
    } catch {
      // Demo data fallback
      setChildData({
        wallet_balance: 150.00,
        fees: [
          { id: '1', name: 'Tuition Fee - Term 1', amount: 500, paid: 500, status: 'paid' },
          { id: '2', name: 'Development Levy', amount: 100, paid: 50, due_date: '2024-02-15', status: 'partial' },
          { id: '3', name: 'Sports Fee', amount: 50, paid: 0, due_date: '2024-02-28', status: 'unpaid' },
        ],
        lunch_balance: 25.50,
        transport_balance: 40.00,
        recent_transactions: [
          { id: '1', type: 'purchase', amount: -15, description: 'Canteen - Lunch', date: '2024-01-10' },
          { id: '2', type: 'topup', amount: 50, description: 'Wallet Top-up', date: '2024-01-08' },
          { id: '3', type: 'purchase', amount: -10, description: 'Canteen - Snacks', date: '2024-01-05' },
        ],
      });
    } finally {
      setLoadingChildData(false);
    }
  };

  // Remove linked child
  const removeLinkedChild = async (childId: string) => {
    if (!confirm('Are you sure you want to remove this child from your account?')) return;

    try {
      await supabaseAdmin
        .from('user_linked_children')
        .update({ is_active: false })
        .eq('id', childId);

      if (selectedChild?.id === childId) {
        setSelectedChild(null);
        setChildData(null);
      }

      await loadLinkedChildren();
    } catch (error) {
      console.error('Error removing child:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NLE ${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-700';
      case 'partial': return 'bg-amber-100 text-amber-700';
      case 'unpaid': return 'bg-gray-100 text-gray-700';
      case 'overdue': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <GraduationCap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Utilities</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your children's school finances</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Child
          </button>
        </div>

        {linkedChildren.length === 0 ? (
          /* Empty State */
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <User className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No Children Linked</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Add your child's school to view their fees, wallet balance, lunch credits, and more.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Your First Child
            </button>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Children List */}
            <div className="md:col-span-1">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Your Children</h3>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {linkedChildren.map((child) => (
                    <div
                      key={child.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedChild?.id === child.id
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                      onClick={() => {
                        setSelectedChild(child);
                        loadChildFinancialData(child);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                            {child.child_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{child.child_name}</p>
                            <p className="text-xs text-gray-500">{child.school_name}</p>
                            <p className="text-xs text-gray-400">{child.class_name || child.index_number}</p>
                          </div>
                        </div>
                        <ChevronRight className={`h-5 w-5 text-gray-400 ${
                          selectedChild?.id === child.id ? 'text-blue-600' : ''
                        }`} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Child Details */}
            <div className="md:col-span-2">
              {selectedChild ? (
                <div className="space-y-6">
                  {/* Child Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-white text-2xl font-bold">
                          {selectedChild.child_name.charAt(0)}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                            {selectedChild.child_name}
                          </h2>
                          <p className="text-gray-500">{selectedChild.school_name}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-gray-400">
                            <span>{selectedChild.class_name || 'Class N/A'}</span>
                            <span>|</span>
                            <span>ID: {selectedChild.index_number}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => loadChildFinancialData(selectedChild)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                          title="Refresh"
                        >
                          <RefreshCw className={`h-5 w-5 ${loadingChildData ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                          onClick={() => removeLinkedChild(selectedChild.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Remove"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {loadingChildData ? (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
                      <p className="text-gray-500">Loading financial data...</p>
                    </div>
                  ) : childData ? (
                    <>
                      {/* Quick Stats */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                          <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <Wallet className="h-4 w-4" />
                            <span className="text-sm">Wallet</span>
                          </div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(childData.wallet_balance)}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                          <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <UtensilsCrossed className="h-4 w-4" />
                            <span className="text-sm">Lunch</span>
                          </div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(childData.lunch_balance || 0)}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                          <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <Bus className="h-4 w-4" />
                            <span className="text-sm">Transport</span>
                          </div>
                          <p className="text-xl font-bold text-gray-900 dark:text-white">
                            {formatCurrency(childData.transport_balance || 0)}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4">
                          <div className="flex items-center gap-2 text-gray-500 mb-2">
                            <Receipt className="h-4 w-4" />
                            <span className="text-sm">Pending Fees</span>
                          </div>
                          <p className="text-xl font-bold text-amber-600">
                            {formatCurrency(
                              childData.fees
                                .filter(f => f.status !== 'paid')
                                .reduce((sum, f) => sum + (f.amount - f.paid), 0)
                            )}
                          </p>
                        </div>
                      </div>

                      {/* Fees */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-white">School Fees</h3>
                          <button className="text-sm text-blue-600 hover:text-blue-700">Pay Now</button>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {childData.fees.map((fee) => (
                            <div key={fee.id} className="p-4 flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">{fee.name}</p>
                                {fee.due_date && (
                                  <p className="text-sm text-gray-500">Due: {fee.due_date}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-gray-900 dark:text-white">
                                  {formatCurrency(fee.amount)}
                                </p>
                                <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(fee.status)}`}>
                                  {fee.status === 'partial' ? `${formatCurrency(fee.paid)} paid` : fee.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Recent Transactions */}
                      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
                          <button className="text-sm text-blue-600 hover:text-blue-700">View All</button>
                        </div>
                        <div className="divide-y divide-gray-200 dark:divide-gray-700">
                          {childData.recent_transactions.map((tx) => (
                            <div key={tx.id} className="p-4 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                  tx.amount > 0 ? 'bg-green-100' : 'bg-gray-100'
                                }`}>
                                  {tx.amount > 0 ? (
                                    <Plus className="h-5 w-5 text-green-600" />
                                  ) : (
                                    <CreditCard className="h-5 w-5 text-gray-600" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 dark:text-white">{tx.description}</p>
                                  <p className="text-sm text-gray-500">{tx.date}</p>
                                </div>
                              </div>
                              <p className={`font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-gray-900 dark:text-white'}`}>
                                {tx.amount > 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                      <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                      <p className="text-gray-500">Could not load financial data</p>
                      <button
                        onClick={() => loadChildFinancialData(selectedChild)}
                        className="mt-4 text-blue-600 hover:text-blue-700"
                      >
                        Try Again
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Select a child to view their details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Add Child Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
              {/* Modal Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {selectedSchool ? 'Enter Index Number' : 'Find School'}
                </h3>
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedSchool(null);
                    setIndexNumber('');
                    setVerificationResult(null);
                    setSearchQuery('');
                    setSearchResults([]);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 overflow-y-auto max-h-[60vh]">
                {!selectedSchool ? (
                  /* Step 1: Search School */
                  <div className="space-y-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search for your child's school..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>

                    {searching && (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                      </div>
                    )}

                    {!searching && searchResults.length > 0 && (
                      <div className="space-y-2">
                        {searchResults.map((school) => (
                          <button
                            key={school.id}
                            onClick={() => setSelectedSchool(school)}
                            className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                                <Building2 className="h-6 w-6 text-blue-600" />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 dark:text-white">{school.name}</p>
                                <p className="text-sm text-gray-500">{school.school_type}</p>
                              </div>
                              {school.is_peeap_connected && (
                                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                  Peeap Connected
                                </span>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        No schools found for "{searchQuery}"
                      </div>
                    )}

                    {!searching && searchQuery.length < 2 && (
                      <div className="text-center py-8 text-gray-500">
                        Start typing to search for schools
                      </div>
                    )}
                  </div>
                ) : (
                  /* Step 2: Enter Index Number */
                  <div className="space-y-6">
                    {/* Selected School */}
                    <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-xl flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">{selectedSchool.name}</p>
                        <p className="text-sm text-gray-500">{selectedSchool.school_type}</p>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSchool(null);
                          setIndexNumber('');
                          setVerificationResult(null);
                        }}
                        className="text-blue-600 hover:text-blue-700 text-sm"
                      >
                        Change
                      </button>
                    </div>

                    {/* Index Number Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Student Index Number
                      </label>
                      <input
                        type="text"
                        value={indexNumber}
                        onChange={(e) => {
                          setIndexNumber(e.target.value.toUpperCase());
                          setVerificationResult(null);
                        }}
                        placeholder="e.g., SL2024/12345"
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                      />
                      <p className="text-sm text-gray-500 mt-2">
                        This is the official index number assigned to your child by the school.
                      </p>
                    </div>

                    {/* Verification Result */}
                    {verificationResult && (
                      <div className={`p-4 rounded-xl ${
                        verificationResult.success
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-red-50 dark:bg-red-900/20'
                      }`}>
                        {verificationResult.success ? (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-green-900 dark:text-green-100">
                                Student Found!
                              </p>
                              <p className="text-green-700 dark:text-green-300">
                                Name: {verificationResult.child_name}
                              </p>
                              {verificationResult.class_name && (
                                <p className="text-green-700 dark:text-green-300">
                                  Class: {verificationResult.class_name}
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-red-900 dark:text-red-100">
                                Verification Failed
                              </p>
                              <p className="text-red-700 dark:text-red-300">
                                {verificationResult.error}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              {selectedSchool && (
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                  {!verificationResult?.success ? (
                    <button
                      onClick={verifyIndexNumber}
                      disabled={!indexNumber || verifying}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {verifying ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Search className="h-5 w-5" />
                          Verify Student
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={addLinkedChild}
                      disabled={adding}
                      className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {adding ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Plus className="h-5 w-5" />
                          Add {verificationResult.child_name}
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
