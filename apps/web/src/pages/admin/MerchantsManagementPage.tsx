import { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Plus,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Mail,
  Phone,
  DollarSign,
  CreditCard,
  Calendar,
  Settings,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface Merchant {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  business_name?: string;
  business_category_id?: string;
  kyc_status: string;
  status: string; // Database uses 'status' column ('ACTIVE', 'INACTIVE')
  created_at: string;
  subscription_status?: string;
  subscription_plan?: string;
  monthly_volume?: number;
}

export function MerchantsManagementPage() {
  const navigate = useNavigate();
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchMerchants();
  }, []);

  const fetchMerchants = async () => {
    setLoading(true);
    try {
      // Database uses 'roles' column (plural), may contain comma-separated values
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .ilike('roles', '%merchant%')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching merchants:', error);
        setMerchants([]);
        return;
      }
      setMerchants(data || []);
    } catch (error) {
      console.error('Error fetching merchants:', error);
      setMerchants([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredMerchants = merchants.filter(merchant => {
    const matchesSearch =
      merchant.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${merchant.first_name} ${merchant.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchant.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      merchant.business_name?.toLowerCase().includes(searchTerm.toLowerCase());

    const isActive = merchant.status === 'ACTIVE';
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && isActive) ||
      (statusFilter === 'inactive' && !isActive) ||
      (statusFilter === 'subscribed' && merchant.subscription_status === 'active');

    return matchesSearch && matchesStatus;
  });

  const getSubscriptionBadge = (status?: string, plan?: string) => {
    if (!status || status === 'inactive') {
      return <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">No Subscription</span>;
    }
    const planColors: Record<string, string> = {
      starter: 'bg-blue-100 text-blue-700',
      business: 'bg-purple-100 text-purple-700',
      enterprise: 'bg-indigo-100 text-indigo-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${planColors[plan || 'starter'] || 'bg-green-100 text-green-700'}`}>
        {plan?.charAt(0).toUpperCase()}{plan?.slice(1) || 'Active'}
      </span>
    );
  };

  const toggleMerchantStatus = async (merchantId: string, currentStatus: boolean) => {
    try {
      // Database uses 'status' column ('ACTIVE' or 'INACTIVE')
      const newStatus = currentStatus ? 'INACTIVE' : 'ACTIVE';
      const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', merchantId);

      if (error) {
        console.error('Error updating merchant status:', error);
        return;
      }
      fetchMerchants();
    } catch (error) {
      console.error('Error updating merchant status:', error);
    }
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Merchant Management</h1>
            <p className="text-gray-500">Manage merchant accounts, subscriptions and settings</p>
          </div>
          <button
            onClick={() => navigate('/admin/merchants/create')}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Merchant
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Store className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Merchants</p>
                <p className="text-xl font-semibold">{merchants.length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-semibold">{merchants.filter(m => m.status === 'ACTIVE').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Subscribed</p>
                <p className="text-xl font-semibold">{merchants.filter(m => m.subscription_status === 'active').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Monthly Revenue</p>
                <p className="text-xl font-semibold">$0</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, business, email or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="subscribed">Subscribed</option>
            </select>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </Card>

        {/* Merchants Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading merchants...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredMerchants.map((merchant) => (
                  <tr key={merchant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <Store className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{merchant.first_name} {merchant.last_name}</p>
                          {merchant.business_name && (
                            <p className="text-sm text-primary-600 font-medium">{merchant.business_name}</p>
                          )}
                          <p className="text-sm text-gray-500">{merchant.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-1">
                          <Mail className="w-3 h-3 text-gray-400" />
                          {merchant.email}
                        </p>
                        {merchant.phone && (
                          <p className="text-sm flex items-center gap-1">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {merchant.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getSubscriptionBadge(merchant.subscription_status, merchant.subscription_plan)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        merchant.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {merchant.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-500">
                        {new Date(merchant.created_at).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="View">
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="Edit">
                          <Edit className="w-4 h-4 text-gray-500" />
                        </button>
                        <button className="p-2 hover:bg-gray-100 rounded-lg" title="Settings">
                          <Settings className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => toggleMerchantStatus(merchant.id, merchant.status === 'ACTIVE')}
                          className={`p-2 hover:bg-gray-100 rounded-lg ${merchant.status === 'ACTIVE' ? 'text-red-500' : 'text-green-500'}`}
                          title={merchant.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                        >
                          {merchant.status === 'ACTIVE' ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && filteredMerchants.length === 0 && (
            <div className="p-8 text-center">
              <Store className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No merchants found</p>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
