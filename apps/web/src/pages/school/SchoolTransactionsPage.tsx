import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { SchoolLayout } from '@/components/school';
import {
  CreditCard,
  Search,
  Filter,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

interface Transaction {
  id: string;
  studentName: string;
  studentId: string;
  vendorName: string;
  amount: number;
  type: 'payment' | 'refund';
  status: 'completed' | 'pending' | 'failed';
  createdAt: string;
  description?: string;
}

export function SchoolTransactionsPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Get school domain from localStorage
  const getSchoolDomain = () => {
    const schoolDomain = localStorage.getItem('school_domain');
    const schoolId = localStorage.getItem('schoolId');
    return schoolDomain || schoolId || null;
  };

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);

    try {
      const schoolDomain = getSchoolDomain();
      if (!schoolDomain) {
        setError('School information not found. Please log in again.');
        setLoading(false);
        return;
      }

      // Try to fetch transactions from SDSL2 sync API
      try {
        const response = await fetch(
          `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/summary`,
          {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          const txList = (data.recent_transactions || data.transactions || data.data || []).map((tx: any) => ({
            id: tx.id,
            studentName: tx.student_name || tx.name || 'Unknown',
            studentId: tx.student_id || tx.index_number || '',
            vendorName: tx.vendor_name || tx.recipient || tx.description || 'School',
            amount: tx.amount,
            type: tx.type === 'refund' ? 'refund' : 'payment',
            status: tx.status || 'completed',
            createdAt: tx.created_at || tx.date || tx.timestamp,
            description: tx.description || tx.narration,
          }));
          setTransactions(txList);
          return;
        }
      } catch (apiErr) {
        console.log('SaaS API not available:', apiErr);
      }

      // If SaaS API fails, show empty state
      setTransactions([]);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Could not load transactions. The school system sync may not be configured yet.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-1 text-xs font-medium text-yellow-700 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30 rounded-full">
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="px-2 py-1 text-xs font-medium text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-900/30 rounded-full">
            Failed
          </span>
        );
    }
  };

  return (
    <SchoolLayout>
      {/* Page Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
            <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Transactions</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {transactions.length} transactions
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTransactions}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={fetchTransactions}
            className="ml-auto text-red-600 hover:text-red-700 font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
        </div>
      )}

      {!loading && !error && (
      <>
      {/* Search & Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      {/* Transactions Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Transaction
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Student
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Date
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {transactions.map((txn) => (
              <tr key={txn.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      txn.type === 'payment'
                        ? 'bg-red-100 dark:bg-red-900/30'
                        : 'bg-green-100 dark:bg-green-900/30'
                    }`}>
                      {txn.type === 'payment' ? (
                        <ArrowUpRight className="h-4 w-4 text-red-600 dark:text-red-400" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white capitalize">{txn.type}</p>
                      <p className="text-xs text-gray-500 font-mono">{txn.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="text-gray-900 dark:text-white">{txn.studentName}</p>
                    <p className="text-xs text-gray-500">{txn.studentId}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600 dark:text-gray-400">
                  {txn.vendorName}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`font-medium ${
                    txn.type === 'payment'
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {txn.type === 'payment' ? '-' : '+'}SLE {(txn.amount / 100).toLocaleString()}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(txn.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                  {new Date(txn.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No transactions found</p>
            <p className="text-sm text-gray-400 mt-1">Transactions from your school system will appear here</p>
          </div>
        )}
      </div>
      </>
      )}
    </SchoolLayout>
  );
}
