import { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Shield,
  ChevronDown,
  MoreVertical,
  Building,
  User,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface Customer {
  id: string;
  type: 'individual' | 'business';
  firstName?: string;
  lastName?: string;
  businessName?: string;
  email: string;
  phone: string;
  country: string;
  kycStatus: 'pending' | 'verified' | 'rejected' | 'not_submitted';
  status: 'active' | 'suspended' | 'closed';
  totalCards: number;
  totalAccounts: number;
  createdAt: string;
  lastActive: string;
}

export function CustomersPage() {
  const [filter, setFilter] = useState<'all' | 'individual' | 'business'>('all');
  const [kycFilter, setKycFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const [stats, setStats] = useState({
    totalCustomers: 0,
    verified: 0,
    pending: 0,
    individuals: 0,
    businesses: 0,
    newThisMonth: 0,
  });

  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      // Fetch all users (customers)
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        setCustomers([]);
        setLoading(false);
        return;
      }

      // Get card counts per user
      const { data: cards } = await supabase.from('cards').select('user_id');
      const cardCounts = new Map<string, number>();
      cards?.forEach(card => {
        cardCounts.set(card.user_id, (cardCounts.get(card.user_id) || 0) + 1);
      });

      // Get wallet counts per user
      const { data: wallets } = await supabase.from('wallets').select('user_id');
      const walletCounts = new Map<string, number>();
      wallets?.forEach(wallet => {
        walletCounts.set(wallet.user_id, (walletCounts.get(wallet.user_id) || 0) + 1);
      });

      // Transform users to customer format
      const formattedCustomers: Customer[] = (users || []).map(user => ({
        id: user.id,
        type: user.role === 'merchant' ? 'business' : 'individual',
        firstName: user.first_name,
        lastName: user.last_name,
        businessName: user.business_name,
        email: user.email,
        phone: user.phone || '',
        country: user.country || 'Unknown',
        kycStatus: (user.kyc_status?.toLowerCase() || 'not_submitted') as Customer['kycStatus'],
        status: user.is_active ? 'active' : 'suspended',
        totalCards: cardCounts.get(user.id) || 0,
        totalAccounts: walletCounts.get(user.id) || 0,
        createdAt: user.created_at,
        lastActive: user.updated_at || user.created_at,
      }));

      setCustomers(formattedCustomers);

      // Calculate stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      setStats({
        totalCustomers: formattedCustomers.length,
        verified: formattedCustomers.filter(c => c.kycStatus === 'verified').length,
        pending: formattedCustomers.filter(c => c.kycStatus === 'pending').length,
        individuals: formattedCustomers.filter(c => c.type === 'individual').length,
        businesses: formattedCustomers.filter(c => c.type === 'business').length,
        newThisMonth: formattedCustomers.filter(c => new Date(c.createdAt) >= startOfMonth).length,
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700"><CheckCircle className="w-3 h-3" /> Verified</span>;
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700"><Clock className="w-3 h-3" /> Pending</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700"><XCircle className="w-3 h-3" /> Rejected</span>;
      case 'not_submitted':
        return <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700"><AlertTriangle className="w-3 h-3" /> Not Submitted</span>;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="w-2 h-2 rounded-full bg-green-500" title="Active" />;
      case 'suspended':
        return <span className="w-2 h-2 rounded-full bg-yellow-500" title="Suspended" />;
      case 'closed':
        return <span className="w-2 h-2 rounded-full bg-red-500" title="Closed" />;
      default:
        return null;
    }
  };

  const filteredCustomers = customers.filter(customer => {
    if (filter !== 'all' && customer.type !== filter) return false;
    if (kycFilter !== 'all' && customer.kycStatus !== kycFilter) return false;
    if (searchQuery) {
      const name = customer.type === 'individual'
        ? `${customer.firstName} ${customer.lastName}`
        : customer.businessName || '';
      if (!name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !customer.email.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !customer.id.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
            <p className="text-gray-500">Manage individual and business customers</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="px-4 py-2 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Customer
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <Card className="p-4">
            <p className="text-sm text-gray-500">Total Customers</p>
            <p className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Verified</p>
            <p className="text-2xl font-bold text-green-600">{stats.verified.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Pending KYC</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Individuals</p>
            <p className="text-2xl font-bold">{stats.individuals.toLocaleString()}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">Businesses</p>
            <p className="text-2xl font-bold">{stats.businesses}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-gray-500">New This Month</p>
            <p className="text-2xl font-bold text-blue-600">+{stats.newThisMonth}</p>
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
                  placeholder="Search by name, email, or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <div className="relative">
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as typeof filter)}
                  className="appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
              <div className="relative">
                <select
                  value={kycFilter}
                  onChange={(e) => setKycFilter(e.target.value as typeof kycFilter)}
                  className="appearance-none border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm focus:ring-2 focus:ring-primary-500"
                >
                  <option value="all">All KYC Status</option>
                  <option value="verified">Verified</option>
                  <option value="pending">Pending</option>
                  <option value="rejected">Rejected</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </Card>

        {/* Customers Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Country</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Cards</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Accounts</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Created</th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          customer.type === 'business' ? 'bg-purple-100' : 'bg-blue-100'
                        }`}>
                          {customer.type === 'business' ? (
                            <Building className={`w-5 h-5 text-purple-600`} />
                          ) : (
                            <User className={`w-5 h-5 text-blue-600`} />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(customer.status)}
                            <span className="font-medium text-sm">
                              {customer.type === 'individual'
                                ? `${customer.firstName} ${customer.lastName}`
                                : customer.businessName}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 font-mono">{customer.id}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-3 h-3" />
                          {customer.email}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Phone className="w-3 h-3" />
                          {customer.phone}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm text-gray-600">
                        <MapPin className="w-3 h-3" />
                        {customer.country}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getKYCStatusBadge(customer.kycStatus)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-sm">
                        <CreditCard className="w-4 h-4 text-gray-400" />
                        {customer.totalCards}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm">{customer.totalAccounts}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-500">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {customer.kycStatus === 'pending' && (
                          <button className="p-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="Review KYC">
                            <Shield className="w-4 h-4" />
                          </button>
                        )}
                        <button className="p-1 hover:bg-gray-100 rounded">
                          <MoreVertical className="w-4 h-4 text-gray-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing 1 to {filteredCustomers.length} of {stats.totalCustomers} customers
            </p>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50" disabled>
                Previous
              </button>
              <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded">1</button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">2</button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">3</button>
              <span className="text-gray-500">...</span>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">125</button>
              <button className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
