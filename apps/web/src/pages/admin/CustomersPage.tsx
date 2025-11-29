import { useState } from 'react';
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

  const [stats] = useState({
    totalCustomers: 1247,
    verified: 1089,
    pending: 103,
    individuals: 1045,
    businesses: 202,
    newThisMonth: 156,
  });

  const [customers] = useState<Customer[]>([
    {
      id: 'cust_001',
      type: 'individual',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1 234 567 8900',
      country: 'United States',
      kycStatus: 'verified',
      status: 'active',
      totalCards: 2,
      totalAccounts: 1,
      createdAt: '2024-01-10T10:00:00Z',
      lastActive: '2024-01-15T10:30:00Z',
    },
    {
      id: 'cust_002',
      type: 'business',
      businessName: 'Acme Corporation',
      email: 'finance@acme.com',
      phone: '+1 234 567 8901',
      country: 'United States',
      kycStatus: 'verified',
      status: 'active',
      totalCards: 15,
      totalAccounts: 3,
      createdAt: '2024-01-08T09:00:00Z',
      lastActive: '2024-01-15T11:00:00Z',
    },
    {
      id: 'cust_003',
      type: 'individual',
      firstName: 'Jane',
      lastName: 'Smith',
      email: 'jane.smith@example.com',
      phone: '+44 20 1234 5678',
      country: 'United Kingdom',
      kycStatus: 'pending',
      status: 'active',
      totalCards: 0,
      totalAccounts: 1,
      createdAt: '2024-01-14T14:00:00Z',
      lastActive: '2024-01-15T08:00:00Z',
    },
    {
      id: 'cust_004',
      type: 'business',
      businessName: 'Tech Innovations Ltd',
      email: 'hello@techinnovations.com',
      phone: '+49 30 1234567',
      country: 'Germany',
      kycStatus: 'rejected',
      status: 'suspended',
      totalCards: 0,
      totalAccounts: 0,
      createdAt: '2024-01-05T11:00:00Z',
      lastActive: '2024-01-10T15:00:00Z',
    },
    {
      id: 'cust_005',
      type: 'individual',
      firstName: 'Bob',
      lastName: 'Wilson',
      email: 'bob.wilson@example.com',
      phone: '+234 801 234 5678',
      country: 'Nigeria',
      kycStatus: 'not_submitted',
      status: 'active',
      totalCards: 0,
      totalAccounts: 0,
      createdAt: '2024-01-15T09:00:00Z',
      lastActive: '2024-01-15T09:00:00Z',
    },
    {
      id: 'cust_006',
      type: 'individual',
      firstName: 'Alice',
      lastName: 'Brown',
      email: 'alice.brown@example.com',
      phone: '+1 555 123 4567',
      country: 'Canada',
      kycStatus: 'verified',
      status: 'active',
      totalCards: 3,
      totalAccounts: 2,
      createdAt: '2023-12-20T10:00:00Z',
      lastActive: '2024-01-15T12:00:00Z',
    },
  ]);

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
