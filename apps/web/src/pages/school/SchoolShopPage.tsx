import { useState, useEffect } from 'react';
import { SchoolLayout } from '@/components/school';
import {
  ShoppingBag,
  Search,
  Package,
  Store,
  Eye,
  EyeOff,
  ChevronDown,
  Filter,
  Check,
  X,
  AlertTriangle,
  ExternalLink
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  vendorId: string;
  vendorName: string;
  image: string | null;
  isBlocked: boolean; // School can block specific products
  stock: number;
}

interface Vendor {
  id: string;
  name: string;
  productCount: number;
  blockedCount: number;
}

export function SchoolShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'visible' | 'blocked'>('all');

  useEffect(() => {
    // TODO: Fetch from API - GET /api/schools/{schoolId}/products
    // Returns products from approved vendors with school's block status
    setProducts([
      {
        id: '1',
        name: 'Mathematics Textbook Grade 10',
        category: 'Books & Stationery',
        price: 5000000,
        vendorId: 'v1',
        vendorName: 'Student Bookshop',
        image: null,
        isBlocked: false,
        stock: 50,
      },
      {
        id: '2',
        name: 'School Notebook (Pack of 5)',
        category: 'Books & Stationery',
        price: 250000,
        vendorId: 'v1',
        vendorName: 'Student Bookshop',
        image: null,
        isBlocked: false,
        stock: 200,
      },
      {
        id: '3',
        name: 'Lunch Meal - Rice & Chicken',
        category: 'Food & Beverages',
        price: 150000,
        vendorId: 'v2',
        vendorName: 'Campus Canteen',
        image: null,
        isBlocked: false,
        stock: 100,
      },
      {
        id: '4',
        name: 'Energy Drink (Not Recommended)',
        category: 'Food & Beverages',
        price: 50000,
        vendorId: 'v2',
        vendorName: 'Campus Canteen',
        image: null,
        isBlocked: true, // Blocked by school
        stock: 50,
      },
      {
        id: '5',
        name: 'School Uniform - Shirt (White)',
        category: 'Clothing',
        price: 350000,
        vendorId: 'v3',
        vendorName: 'School Uniforms',
        image: null,
        isBlocked: false,
        stock: 30,
      },
      {
        id: '6',
        name: 'Scientific Calculator',
        category: 'Electronics',
        price: 750000,
        vendorId: 'v1',
        vendorName: 'Student Bookshop',
        image: null,
        isBlocked: false,
        stock: 25,
      },
    ]);

    setVendors([
      { id: 'v1', name: 'Student Bookshop', productCount: 3, blockedCount: 0 },
      { id: 'v2', name: 'Campus Canteen', productCount: 2, blockedCount: 1 },
      { id: 'v3', name: 'School Uniforms', productCount: 1, blockedCount: 0 },
    ]);

    setLoading(false);
  }, []);

  const handleToggleBlock = async (productId: string) => {
    // TODO: Call API - POST /api/schools/{schoolId}/products/{productId}/toggle-block
    setProducts(prev =>
      prev.map(p =>
        p.id === productId ? { ...p, isBlocked: !p.isBlocked } : p
      )
    );
  };

  const categories = [...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());
    const matchesVendor = selectedVendor === 'all' || product.vendorId === selectedVendor;
    const matchesStatus =
      filterStatus === 'all' ||
      (filterStatus === 'visible' && !product.isBlocked) ||
      (filterStatus === 'blocked' && product.isBlocked);
    return matchesSearch && matchesVendor && matchesStatus;
  });

  const visibleCount = products.filter(p => !p.isBlocked).length;
  const blockedCount = products.filter(p => p.isBlocked).length;

  return (
    <SchoolLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Product Management</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Control which products are visible to your students
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-amber-900 dark:text-amber-100">Admin View Only</h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                This page is for managing product visibility. Students and staff purchase products
                through your school's portal, which connects to Peeap via API.
                Block products here to hide them from your school's shop.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Package className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{products.length}</p>
                <p className="text-sm text-gray-500">Total Products</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                <Eye className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{visibleCount}</p>
                <p className="text-sm text-gray-500">Visible</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
                <EyeOff className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{blockedCount}</p>
                <p className="text-sm text-gray-500">Blocked</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                <Store className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{vendors.length}</p>
                <p className="text-sm text-gray-500">Vendors</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <select
                value={selectedVendor}
                onChange={(e) => setSelectedVendor(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Vendors</option>
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="visible">Visible Only</option>
                <option value="blocked">Blocked Only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Products Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Stock
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className={product.isBlocked ? 'bg-red-50/50 dark:bg-red-900/10' : ''}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                          {product.image ? (
                            <img src={product.image} alt="" className="w-full h-full object-cover rounded-lg" />
                          ) : (
                            <Package className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                        <span className={`font-medium ${product.isBlocked ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                        <Store className="h-4 w-4" />
                        {product.vendorName}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      SLE {(product.price / 100).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {product.stock}
                    </td>
                    <td className="px-6 py-4">
                      {product.isBlocked ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
                          <EyeOff className="h-3 w-3" />
                          Blocked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
                          <Eye className="h-3 w-3" />
                          Visible
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleToggleBlock(product.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          product.isBlocked
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                        }`}
                      >
                        {product.isBlocked ? (
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            Unblock
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <EyeOff className="h-3 w-3" />
                            Block
                          </span>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products found</h3>
              <p className="text-gray-500 dark:text-gray-400">
                {search ? `No products match "${search}"` : 'Products from approved vendors will appear here'}
              </p>
            </div>
          )}
        </div>

        {/* API Info */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            API Integration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Your school portal should call these APIs to display products to students:
          </p>
          <code className="block text-xs bg-gray-900 text-green-400 p-3 rounded-lg overflow-x-auto">
            GET /api/schools/{'{schoolId}'}/products?blocked=false
          </code>
        </div>
      </div>
    </SchoolLayout>
  );
}
