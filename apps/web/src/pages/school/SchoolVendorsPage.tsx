import { useState, useEffect } from 'react';
import { SchoolLayout } from '@/components/school';
import {
  Store,
  Search,
  MoreVertical,
  CheckCircle,
  XCircle,
  ExternalLink,
  ShoppingBag,
  TrendingUp,
  Users,
  X,
  Loader2
} from 'lucide-react';

interface ApprovedVendor {
  id: string;
  merchantId: string;
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

interface SearchResult {
  id: string;
  businessName: string;
  category: string;
  logo: string | null;
  isApproved: boolean;
}

export function SchoolVendorsPage() {
  const [vendors, setVendors] = useState<ApprovedVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    // TODO: Fetch approved vendors from API
    setVendors([
      {
        id: '1',
        merchantId: 'merch_abc123',
        merchantName: 'John\'s Enterprises',
        businessName: 'Campus Canteen',
        category: 'Food & Beverages',
        logo: null,
        status: 'active',
        approvedAt: '2024-01-15T10:00:00Z',
        totalSales: 15000000,
        transactionCount: 450,
        productCount: 24,
      },
      {
        id: '2',
        merchantId: 'merch_def456',
        merchantName: 'Education Supplies Ltd',
        businessName: 'Student Bookshop',
        category: 'Books & Stationery',
        logo: null,
        status: 'active',
        approvedAt: '2024-01-10T10:00:00Z',
        totalSales: 8500000,
        transactionCount: 120,
        productCount: 156,
      },
      {
        id: '3',
        merchantId: 'merch_ghi789',
        merchantName: 'Uniform World',
        businessName: 'School Uniforms',
        category: 'Clothing',
        logo: null,
        status: 'suspended',
        approvedAt: '2024-01-05T10:00:00Z',
        totalSales: 2500000,
        transactionCount: 45,
        productCount: 12,
      },
    ]);
    setLoading(false);
  }, []);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    // TODO: Call API to search Peeap merchants
    // GET /api/merchants/search?q={query}&category=education

    // Mock results
    setTimeout(() => {
      setSearchResults([
        {
          id: 'merch_new1',
          businessName: 'Tech Supplies Co',
          category: 'Electronics',
          logo: null,
          isApproved: false,
        },
        {
          id: 'merch_new2',
          businessName: 'Healthy Snacks',
          category: 'Food & Beverages',
          logo: null,
          isApproved: false,
        },
        {
          id: 'merch_abc123',
          businessName: 'Campus Canteen',
          category: 'Food & Beverages',
          logo: null,
          isApproved: true,
        },
      ]);
      setSearching(false);
    }, 500);
  };

  const handleApprove = async (merchantId: string) => {
    // TODO: Call API to approve merchant
    // POST /api/schools/{schoolId}/vendors
    // { merchantId }
    console.log('Approving merchant:', merchantId);
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSuspend = async (vendorId: string) => {
    // TODO: Call API to suspend vendor
    console.log('Suspending vendor:', vendorId);
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
            onClick={() => setShowSearchModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Search className="h-4 w-4" />
            Find Merchant
          </button>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex gap-3">
            <Store className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900 dark:text-blue-100">How Vendors Work</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Search for existing Peeap merchants and approve them to sell to your students.
                Their products in the "Education" category will appear in your school shop.
                Students can only purchase from approved vendors.
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
                    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                      {vendor.logo ? (
                        <img src={vendor.logo} alt="" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <Store className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{vendor.businessName}</h3>
                      <p className="text-sm text-gray-500">{vendor.category}</p>
                    </div>
                  </div>
                  <button className="p-1 text-gray-400 hover:text-gray-600">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>

                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  by {vendor.merchantName}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-4">
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{vendor.productCount}</p>
                    <p className="text-xs text-gray-500">Products</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{vendor.transactionCount}</p>
                    <p className="text-xs text-gray-500">Orders</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(vendor.totalSales / 100 / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-gray-500">Sales</p>
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
                <button className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1">
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
              Search for Peeap merchants and approve them to sell to your students
            </p>
            <button
              onClick={() => setShowSearchModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Find Merchant
            </button>
          </div>
        )}
      </div>

      {/* Search Modal */}
      {showSearchModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Find Peeap Merchant</h2>
              <button
                onClick={() => {
                  setShowSearchModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Search by business name..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {searching ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {searchResults.map((result) => (
                  <div
                    key={result.id}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                        <Store className="h-5 w-5 text-gray-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{result.businessName}</p>
                        <p className="text-sm text-gray-500">{result.category}</p>
                      </div>
                    </div>
                    {result.isApproved ? (
                      <span className="text-sm text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle className="h-4 w-4" />
                        Approved
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApprove(result.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                ))}

                {searchResults.length === 0 && searchQuery && !searching && (
                  <div className="text-center py-8 text-gray-500">
                    No merchants found for "{searchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SchoolLayout>
  );
}
