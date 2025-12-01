import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  RefreshCw,
  Filter,
  Search,
  CreditCard,
  DollarSign,
  MapPin,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface AuthorizationRequest {
  id: string;
  cardId: string;
  cardLast4: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  merchantName: string;
  merchantCategory: string;
  location: string;
  status: 'pending' | 'approved' | 'declined' | 'timeout';
  riskScore: number;
  timestamp: string;
  expiresIn: number;
}

export function AuthorizationPage() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [authRequests, setAuthRequests] = useState<AuthorizationRequest[]>([]);

  const [stats, setStats] = useState({
    totalToday: 0,
    approved: 0,
    declined: 0,
    pending: 0,
    avgResponseTime: '0ms',
    approvalRate: 0,
  });

  useEffect(() => {
    fetchAuthorizationData();
  }, []);

  const fetchAuthorizationData = async () => {
    setLoading(true);
    try {
      // Fetch recent transactions that can represent authorization requests
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('created_at', today.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching transactions:', error);
        setAuthRequests([]);
        setLoading(false);
        return;
      }

      // Get user info
      const userIds = [...new Set(transactions?.map(t => t.user_id) || [])];
      const { data: users } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds);

      const userMap = new Map(users?.map(u => [u.id, u]) || []);

      // Get card info
      const cardIds = [...new Set(transactions?.map(t => t.card_id).filter(Boolean) || [])];
      const { data: cards } = await supabase
        .from('cards')
        .select('id, last_four')
        .in('id', cardIds);

      const cardMap = new Map(cards?.map(c => [c.id, c]) || []);

      // Transform transactions to authorization requests format
      const authData: AuthorizationRequest[] = (transactions || []).map((txn, index) => {
        const user = userMap.get(txn.user_id);
        const card = txn.card_id ? cardMap.get(txn.card_id) : null;

        // Map transaction status to auth status
        let authStatus: AuthorizationRequest['status'] = 'approved';
        if (txn.status === 'pending') authStatus = 'pending';
        else if (txn.status === 'failed') authStatus = 'declined';
        else if (txn.status === 'completed') authStatus = 'approved';

        return {
          id: `AUTH-${txn.id.slice(0, 6).toUpperCase()}`,
          cardId: txn.card_id || '',
          cardLast4: card?.last_four || '****',
          customerId: txn.user_id,
          customerName: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
          amount: txn.amount || 0,
          currency: txn.currency || 'USD',
          merchantName: txn.merchant_name || 'N/A',
          merchantCategory: txn.merchant_category || 'General',
          location: txn.location || 'Unknown',
          status: authStatus,
          riskScore: Math.floor(Math.random() * 30), // Would come from fraud service
          timestamp: txn.created_at,
          expiresIn: authStatus === 'pending' ? 45 : 0,
        };
      });

      setAuthRequests(authData);

      // Calculate stats
      const approved = authData.filter(a => a.status === 'approved').length;
      const declined = authData.filter(a => a.status === 'declined').length;
      const pending = authData.filter(a => a.status === 'pending').length;
      const total = authData.length;

      setStats({
        totalToday: total,
        approved,
        declined,
        pending,
        avgResponseTime: '-',
        approvalRate: total > 0 ? Math.round((approved / total) * 100 * 10) / 10 : 0,
      });
    } catch (error) {
      console.error('Error fetching authorization data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-600 bg-green-100';
    if (score < 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'declined':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Declined</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">Timeout</span>;
    }
  };

  const filteredRequests = authRequests.filter(req => {
    if (filter !== 'all' && req.status !== filter) return false;
    if (searchQuery && !req.customerName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !req.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !req.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Authorization</h1>
            <p className="text-gray-500">Real-time card authorization management</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchAuthorizationData}
              className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              Configure Rules
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Today's Requests</p>
            <p className="text-2xl font-bold">{stats.totalToday.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Approved</p>
            <p className="text-2xl font-bold text-green-600">{stats.approved.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Declined</p>
            <p className="text-2xl font-bold text-red-600">{stats.declined}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Avg Response</p>
            <p className="text-2xl font-bold">{stats.avgResponseTime}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Approval Rate</p>
            <p className="text-2xl font-bold text-green-600">{stats.approvalRate}%</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer, merchant, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as typeof filter)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="declined">Declined</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Authorization Requests */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Request ID</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Card</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Location</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Risk</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      Loading authorization data...
                    </td>
                  </tr>
                ) : filteredRequests.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                      <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No authorization requests found
                    </td>
                  </tr>
                ) : (
                  filteredRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm">{req.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{req.customerName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-gray-400" />
                          <span className="font-mono text-sm">****{req.cardLast4}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-medium">{req.amount.toLocaleString()}</span>
                          <span className="text-gray-400 text-sm">{req.currency}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium">{req.merchantName}</p>
                          <p className="text-xs text-gray-500">{req.merchantCategory}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-4 h-4" />
                          {req.location}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(req.riskScore)}`}>
                          {req.riskScore}%
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(req.status)}
                        {req.status === 'pending' && req.expiresIn > 0 && (
                          <p className="text-xs text-gray-500 mt-1">Expires in {req.expiresIn}s</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {req.status === 'pending' && (
                            <>
                              <button className="p-1 bg-green-100 text-green-600 rounded hover:bg-green-200" title="Approve">
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              <button className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Decline">
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="View Details">
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Information Panel */}
        {stats.pending > 0 && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              <h2 className="text-lg font-semibold">Pending Authorizations</h2>
            </div>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border-l-4 border-l-yellow-500 rounded-r-lg">
                <p className="text-sm font-medium text-yellow-800">
                  {stats.pending} authorization request{stats.pending !== 1 ? 's' : ''} awaiting review
                </p>
                <p className="text-xs text-yellow-600">
                  Click the approve or decline buttons to process pending requests
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
