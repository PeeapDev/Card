import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Receipt,
  ArrowLeft,
  Plus,
  Search,
  Filter,
  Download,
  MoreVertical,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Edit,
  Trash2,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { SchoolLayout } from '@/components/school';

interface FeeStructure {
  id: string;
  name: string;
  description: string;
  amount: number;
  frequency: 'one_time' | 'termly' | 'monthly' | 'yearly';
  dueDate: string;
  applicableTo: string;
  status: 'active' | 'inactive';
  paidCount: number;
  pendingCount: number;
  totalStudents: number;
}

interface FeePayment {
  id: string;
  studentName: string;
  studentId: string;
  feeName: string;
  amount: number;
  paidAmount: number;
  status: 'paid' | 'partial' | 'pending' | 'overdue';
  dueDate: string;
  paidDate: string | null;
}

export function SchoolFeesPage() {
  const [activeTab, setActiveTab] = useState<'structures' | 'payments'>('structures');
  const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
  const [payments, setPayments] = useState<FeePayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Get school domain from localStorage
  const getSchoolDomain = () => {
    const schoolDomain = localStorage.getItem('school_domain');
    const schoolId = localStorage.getItem('schoolId');
    return schoolDomain || schoolId || null;
  };

  const fetchFees = async () => {
    setLoading(true);
    setError(null);

    try {
      const schoolDomain = getSchoolDomain();
      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Try to fetch invoices/fees from SDSL2 sync API
      try {
        const response = await fetch(
          `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/invoices`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }
        );

        if (response.ok) {
          const data = await response.json();

          // Group invoices by fee type to create fee structures
          const feeMap = new Map<string, FeeStructure>();
          const paymentsList: FeePayment[] = [];

          (data.invoices || data.data || data || []).forEach((inv: any) => {
            const feeName = inv.fee_name || inv.title || inv.description || 'Fee';
            const feeId = inv.fee_id || inv.fee_type_id || feeName;

            // Add to fee structure
            if (!feeMap.has(feeId)) {
              feeMap.set(feeId, {
                id: feeId,
                name: feeName,
                description: inv.fee_description || inv.description || '',
                amount: inv.amount || inv.total_amount || 0,
                frequency: inv.frequency || 'termly',
                dueDate: inv.due_date || '',
                applicableTo: inv.applicable_to || 'All Students',
                status: inv.fee_status || 'active',
                paidCount: 0,
                pendingCount: 0,
                totalStudents: 0,
              });
            }

            const structure = feeMap.get(feeId)!;
            structure.totalStudents++;

            const paidAmount = inv.paid_amount || inv.amount_paid || 0;
            const totalAmount = inv.amount || inv.total_amount || 0;

            if (paidAmount >= totalAmount) {
              structure.paidCount++;
            } else {
              structure.pendingCount++;
            }

            // Add to payments list
            let status: FeePayment['status'] = 'pending';
            if (paidAmount >= totalAmount) {
              status = 'paid';
            } else if (paidAmount > 0) {
              status = 'partial';
            } else if (inv.due_date && new Date(inv.due_date) < new Date()) {
              status = 'overdue';
            }

            paymentsList.push({
              id: inv.id,
              studentName: inv.student_name || `${inv.first_name || ''} ${inv.last_name || ''}`.trim() || 'Unknown',
              studentId: inv.student_id || inv.index_number || '',
              feeName: feeName,
              amount: totalAmount,
              paidAmount: paidAmount,
              status: status,
              dueDate: inv.due_date || '',
              paidDate: inv.paid_date || inv.paid_at || null,
            });
          });

          setFeeStructures(Array.from(feeMap.values()));
          setPayments(paymentsList);
          return;
        }
      } catch (apiErr) {
        console.log('SaaS API not available:', apiErr);
      }

      // If SaaS API fails, show empty state
      setFeeStructures([]);
      setPayments([]);
    } catch (err) {
      console.error('Error fetching fees:', err);
      setError('Could not load fees. The school system sync may not be configured yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFees();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Paid
          </span>
        );
      case 'partial':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30 rounded-full">
            <Clock className="h-3 w-3" />
            Partial
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30 rounded-full">
            <Clock className="h-3 w-3" />
            Pending
          </span>
        );
      case 'overdue':
        return (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded-full">
            <AlertCircle className="h-3 w-3" />
            Overdue
          </span>
        );
      default:
        return null;
    }
  };

  const stats = {
    totalExpected: feeStructures.reduce((sum, f) => sum + f.amount * f.totalStudents, 0),
    totalCollected: feeStructures.reduce((sum, f) => sum + f.amount * f.paidCount, 0),
    pendingAmount: feeStructures.reduce((sum, f) => sum + f.amount * f.pendingCount, 0),
  };

  const { schoolSlug } = useParams<{ schoolSlug: string }>();

  return (
    <SchoolLayout>
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Fee Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage school fees and payments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchFees}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Fee
            </button>
          </div>
        </div>
      </div>

      <div>
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Expected</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
              SLE {(stats.totalExpected / 100).toLocaleString()}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Total Collected</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              SLE {(stats.totalCollected / 100).toLocaleString()}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {((stats.totalCollected / stats.totalExpected) * 100).toFixed(1)}% collected
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">Pending Amount</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">
              SLE {(stats.pendingAmount / 100).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('structures')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'structures'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Fee Structures
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeTab === 'payments'
                ? 'bg-blue-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
          >
            Payments
          </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Filter className="h-4 w-4" />
            Filter
          </button>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>

        {/* Fee Structures Tab */}
        {activeTab === 'structures' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {feeStructures.map((fee) => (
              <div
                key={fee.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{fee.name}</h3>
                    <p className="text-sm text-gray-500">{fee.description}</p>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 mb-4">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    SLE {(fee.amount / 100).toLocaleString()}
                  </div>
                  <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded capitalize">
                    {fee.frequency.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                  <Calendar className="h-4 w-4" />
                  Due: {new Date(fee.dueDate).toLocaleDateString()}
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">Collection Progress</span>
                    <span className="text-gray-900 dark:text-white">
                      {fee.paidCount} / {fee.totalStudents}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${(fee.paidCount / fee.totalStudents) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="text-green-600">{fee.paidCount} paid</span>
                    <span className="text-gray-400">|</span>
                    <span className="text-orange-600">{fee.pendingCount} pending</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Fee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{payment.studentName}</p>
                        <p className="text-xs text-gray-500">{payment.studentId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                      {payment.feeName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-gray-900 dark:text-white">
                          SLE {(payment.amount / 100).toLocaleString()}
                        </p>
                        {payment.paidAmount > 0 && payment.paidAmount < payment.amount && (
                          <p className="text-xs text-green-600">
                            Paid: SLE {(payment.paidAmount / 100).toLocaleString()}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(payment.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(payment.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
