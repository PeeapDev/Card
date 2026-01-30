import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { SchoolLayout } from '@/components/school';
import { UserSearch, type SearchResult } from '@/components/ui/UserSearch';
import {
  Store,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  ExternalLink,
  ShoppingBag,
  TrendingUp,
  X,
  AlertCircle,
  UserPlus
} from 'lucide-react';

interface ApprovedVendor {
  id: string;
  merchantId: string;
  userId: string;
  username: string | null;
  merchantName: string;
  businessName: string;
  category: string;
  logo: string | null;
  status: 'active' | 'suspended';
  approvedAt: string;
  totalSales: number;
  transactionCount: number;
  productCount: number;
}

export function SchoolVendorsPage() {
  const navigate = useNavigate();
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [vendors, setVendors] = useState<ApprovedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [addingVendor, setAddingVendor] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVendors = async () => {
      setLoading(true);
      try {
        // Use URL param first, then localStorage as fallback
        const schoolDomain = schoolSlug || localStorage.getItem('school_domain');
        if (!schoolDomain) {
          setVendors([]);
          setLoading(false);
          return;
        }

        // Try to fetch approved vendors from SaaS API
        try {
          const params = new URLSearchParams();
          params.append('page', '1');

          const response = await fetch(
            `https://${schoolDomain}.gov.school.edu.sl/api/peeap/sync/vendors?${params.toString()}`,
            {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            const vendorList = (data.vendors || data.data || data || []).map((v: any) => ({
              id: v.id?.toString() || String(Math.random()),
              merchantId: v.merchant_id || v.peeap_merchant_id || '',
              userId: v.user_id || v.peeap_user_id || '',
              username: v.username || null,
              merchantName: v.merchant_name || v.business_name || '',
              businessName: v.business_name || v.name || '',
              category: v.category || 'General',
              logo: v.logo || null,
              status: v.status === 'active' ? 'active' : 'suspended',
              approvedAt: v.approved_at || v.created_at || new Date().toISOString(),
              totalSales: v.total_sales || 0,
              transactionCount: v.transaction_count || 0,
              productCount: v.product_count || 0,
            }));
            setVendors(vendorList);
            return;
          }
        } catch (apiErr) {
          console.log('SaaS vendors API not available:', apiErr);
        }

        // If SaaS API fails, show empty state - vendors will be added manually
        setVendors([]);
      } catch (err) {
        console.error('Error fetching vendors:', err);
        setVendors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVendors();
  }, []);

  const handleUserSelect = (user: SearchResult) => {
    setSelectedUser(user);
    setError(null);
  };

  const handleAddVendor = async () => {
    if (!selectedUser) return;

    setAddingVendor(true);
    setError(null);

    try {
      // TODO: Call API to add vendor
      // POST /api/schools/{schoolId}/vendors
      // { userId: selectedUser.id }

      // The API will check if user is a merchant and return their business details
      console.log('Adding vendor:', selectedUser);

      // Mock success - in real implementation, API validates merchant status
      const newVendor: ApprovedVendor = {
        id: `new_${Date.now()}`,
        merchantId: `merch_${selectedUser.id}`,
        userId: selectedUser.id,
        username: selectedUser.username,
        merchantName: `${selectedUser.first_name} ${selectedUser.last_name}`,
        businessName: selectedUser.username ? `@${selectedUser.username}'s Business` : 'New Vendor',
        category: 'General',
        logo: selectedUser.profile_picture,
        status: 'active',
        approvedAt: new Date().toISOString(),
        totalSales: 0,
        transactionCount: 0,
        productCount: 0,
      };

      setVendors(prev => [...prev, newVendor]);
      setShowAddModal(false);
      setSelectedUser(null);

    } catch (err: any) {
      setError(err.message || 'Failed to add vendor');
    } finally {
      setAddingVendor(false);
    }
  };

  const handleRemoveVendor = async (vendorId: string) => {
    // TODO: Call API to remove vendor
    // DELETE /api/schools/{schoolId}/vendors/{vendorId}
    setVendors(prev => prev.filter(v => v.id !== vendorId));
  };

  const handleToggleStatus = async (vendorId: string) => {
    // TODO: Call API to toggle vendor status
    // PATCH /api/schools/{schoolId}/vendors/{vendorId}
    setVendors(prev =>
      prev.map(v =>
        v.id === vendorId
          ? { ...v, status: v.status === 'active' ? 'suspended' : 'active' }
          : v
      )
    );
  };

  return (
    <SchoolLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Approved Vendors</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Peeap merchants approved to sell to your students
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <UserPlus className="h-4 w-4" />
            Add Vendor
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex gap-3">
            <Store className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">How Vendors Work</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Search for Peeap merchants by @username, phone, or name. Once added, their
                products will be available to your students. Only merchants (users with POS) can be vendors.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Store className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vendors.filter(v => v.status === 'active').length}
                </p>
                <p className="text-sm text-gray-500">Active Vendors</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <ShoppingBag className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {vendors.reduce((sum, v) => sum + v.productCount, 0)}
                </p>
                <p className="text-sm text-gray-500">Products Available</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  SLE {(vendors.reduce((sum, v) => sum + v.totalSales, 0) / 100).toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">Total Sales</p>
              </div>
            </div>
          </div>
        </div>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden">
                      {vendor.logo ? (
                        <img src={vendor.logo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Store className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{vendor.businessName}</h3>
                      {vendor.username && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">@{vendor.username}</p>
                      )}
                    </div>
                  </div>
                  <div className="relative group">
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    <div className="absolute right-0 mt-1 w-32 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      <button
                        onClick={() => handleToggleStatus(vendor.id)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        {vendor.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleRemoveVendor(vendor.id)}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {vendor.category} &bull; by {vendor.merchantName}
                </p>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{vendor.productCount}</p>
                    <p className="text-xs text-gray-500">Products</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{vendor.transactionCount}</p>
                    <p className="text-xs text-gray-500">Sales</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(vendor.totalSales / 100 / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-gray-500">Revenue</p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
                {vendor.status === 'active' ? (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-400">
                    <XCircle className="h-3 w-3" />
                    Suspended
                  </span>
                )}
                <button
                  onClick={() => navigate(`/school/shop?vendorId=${vendor.id}`)}
                  className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                >
                  View Products
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {vendors.length === 0 && !loading && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <Store className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No vendors yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Add Peeap merchants as vendors to let them sell to your students
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Add Vendor
            </button>
          </div>
        )}
      </div>

      {/* Add Vendor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Add Vendor</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUser(null);
                  setError(null);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Peeap User
                </label>
                <UserSearch
                  onSelect={handleUserSelect}
                  placeholder="Search by @username, phone, or name..."
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Only users with merchant accounts can be added as vendors
                </p>
              </div>

              {/* Selected User Preview */}
              {selectedUser && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-3">
                    {selectedUser.profile_picture ? (
                      <img
                        src={selectedUser.profile_picture}
                        alt=""
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-800 rounded-full flex items-center justify-center">
                        <span className="text-blue-700 dark:text-blue-300 font-medium">
                          {selectedUser.first_name?.charAt(0)}{selectedUser.last_name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {selectedUser.first_name} {selectedUser.last_name}
                      </p>
                      {selectedUser.username && (
                        <p className="text-sm text-blue-600 dark:text-blue-400">@{selectedUser.username}</p>
                      )}
                      {selectedUser.phone && (
                        <p className="text-sm text-gray-500">{selectedUser.phone}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg border border-red-200 dark:border-red-800 flex items-center gap-2 text-red-700 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <p className="text-sm">{error}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedUser(null);
                  setError(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddVendor}
                disabled={!selectedUser || addingVendor}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingVendor ? 'Adding...' : 'Add as Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
