import { useState, useEffect } from 'react';
import { ArrowDownRight, Search, RefreshCw, CheckCircle, XCircle, Clock, AlertTriangle, Loader2, User } from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { monimeService, MonimeTransaction, fromMinorUnits } from '@/services/monime.service';
import { currencyService, Currency } from '@/services/currency.service';
import { supabase } from '@/lib/supabase';

// User info cache
interface UserInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  expired: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-gray-100 text-gray-800',
  delayed: 'bg-orange-100 text-orange-800',
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="w-3 h-3" />,
  processing: <Loader2 className="w-3 h-3 animate-spin" />,
  completed: <CheckCircle className="w-3 h-3" />,
  failed: <XCircle className="w-3 h-3" />,
  expired: <Clock className="w-3 h-3" />,
  cancelled: <XCircle className="w-3 h-3" />,
  delayed: <AlertTriangle className="w-3 h-3" />,
};

export function DepositsPage() {
  const [deposits, setDeposits] = useState<MonimeTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [usersMap, setUsersMap] = useState<Map<string, UserInfo>>(new Map());
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // Fetch default currency
  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Fetch user info for all unique user IDs
  const fetchUsers = async (userIds: string[]) => {
    const uniqueIds = [...new Set(userIds.filter(id => id && !usersMap.has(id)))];
    if (uniqueIds.length === 0) return;

    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .in('id', uniqueIds);

      if (users) {
        const newMap = new Map(usersMap);
        users.forEach((user: any) => {
          newMap.set(user.id, {
            id: user.id,
            firstName: user.first_name || '',
            lastName: user.last_name || '',
            email: user.email || '',
            phone: user.phone || '',
          });
        });
        setUsersMap(newMap);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    }
  };

  const fetchDeposits = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await monimeService.getAllDeposits(100, 0);
      setDeposits(response.data || []);
      setTotal(response.total || 0);

      // Fetch user info for all deposits
      const userIds = response.data?.map(d => d.userId).filter(Boolean) as string[];
      if (userIds.length > 0) {
        await fetchUsers(userIds);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch deposits');
      setDeposits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeposits();
  }, []);

  // Get user display name
  const getUserDisplayName = (userId?: string): string => {
    if (!userId) return 'Unknown';
    const user = usersMap.get(userId);
    if (user) {
      const fullName = `${user.firstName} ${user.lastName}`.trim();
      return fullName || user.email || user.phone || userId.slice(0, 8);
    }
    return userId.slice(0, 8) + '...';
  };

  // Filter deposits - now includes user name search
  const filteredDeposits = deposits.filter(deposit => {
    const user = deposit.userId ? usersMap.get(deposit.userId) : null;
    const userName = user ? `${user.firstName} ${user.lastName}`.toLowerCase() : '';
    const userEmail = user?.email?.toLowerCase() || '';
    const userPhone = user?.phone?.toLowerCase() || '';

    const matchesSearch = searchTerm === '' ||
      deposit.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.monimeReference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.walletId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      deposit.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userName.includes(searchTerm.toLowerCase()) ||
      userEmail.includes(searchTerm.toLowerCase()) ||
      userPhone.includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || deposit.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: deposits.length,
    completed: deposits.filter(d => d.status === 'completed').length,
    pending: deposits.filter(d => d.status === 'pending' || d.status === 'processing').length,
    failed: deposits.filter(d => d.status === 'failed' || d.status === 'cancelled').length,
    totalAmount: deposits
      .filter(d => d.status === 'completed')
      .reduce((sum, d) => sum + (d.amount || 0), 0),
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Deposit History</h1>
            <p className="text-gray-500 mt-1">Track all customer deposits via Monime</p>
          </div>
          <Button onClick={fetchDeposits} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ArrowDownRight className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Deposits</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
            </div>
          </Card>
          <Card>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <ArrowDownRight className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Volume</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(fromMinorUnits(stats.totalAmount))}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email, phone, ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <Card className="bg-red-50 border-red-200">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Deposits Table */}
        <Card>
          <CardHeader>
            <CardTitle>Deposits ({filteredDeposits.length})</CardTitle>
          </CardHeader>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
            </div>
          ) : filteredDeposits.length === 0 ? (
            <div className="text-center py-12">
              <ArrowDownRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No deposits found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Method</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredDeposits.map((deposit) => {
                    const user = deposit.userId ? usersMap.get(deposit.userId) : null;
                    return (
                    <tr key={deposit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {getUserDisplayName(deposit.userId)}
                            </div>
                            {user?.email && (
                              <div className="text-xs text-gray-500">
                                {user.email}
                              </div>
                            )}
                            {user?.phone && !user?.email && (
                              <div className="text-xs text-gray-500">
                                {user.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {formatCurrency(fromMinorUnits(deposit.amount || 0))}
                        </div>
                        <div className="text-xs text-gray-500">{deposit.currency || 'SLE'}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusColors[deposit.status] || 'bg-gray-100 text-gray-800'}`}>
                          {statusIcons[deposit.status]}
                          {deposit.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {deposit.depositMethod?.replace('_', ' ') || 'CHECKOUT'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs text-gray-900">
                          {deposit.id.slice(0, 8)}...
                        </div>
                        {deposit.monimeReference && (
                          <div className="font-mono text-xs text-gray-500">
                            {deposit.monimeReference.slice(0, 15)}...
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {deposit.createdAt ? new Date(deposit.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {deposit.completedAt ? new Date(deposit.completedAt).toLocaleString() : '-'}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
