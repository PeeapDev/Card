import { useState, useEffect } from 'react';
import { SchoolLayout } from '@/components/school';
import {
  ShoppingBag,
  Search,
  Filter,
  Tag,
  Package,
  Store,
  ShoppingCart,
  Heart,
  Star,
  ChevronDown
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  vendorId: string;
  vendorName: string;
  vendorLogo: string | null;
  image: string | null;
  rating: number;
  soldCount: number;
}

interface Vendor {
  id: string;
  name: string;
  productCount: number;
}

export function SchoolShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    // TODO: Fetch from API - GET /api/schools/{schoolId}/shop/products
    // This pulls products from approved vendors' POS systems
    // filtered by education category
    setProducts([
      {
        id: '1',
        name: 'Mathematics Textbook Grade 10',
        category: 'Books & Stationery',
        price: 5000000,
        discountPrice: 4500000,
        stock: 50,
        vendorId: 'v1',
        vendorName: 'Student Bookshop',
        vendorLogo: null,
        image: null,
        rating: 4.8,
        soldCount: 124,
      },
      {
        id: '2',
        name: 'School Notebook (Pack of 5)',
        category: 'Books & Stationery',
        price: 250000,
        discountPrice: null,
        stock: 200,
        vendorId: 'v1',
        vendorName: 'Student Bookshop',
        vendorLogo: null,
        image: null,
        rating: 4.5,
        soldCount: 456,
      },
      {
        id: '3',
        name: 'Lunch Meal - Rice & Chicken',
        category: 'Food & Beverages',
        price: 150000,
        discountPrice: null,
        stock: 100,
        vendorId: 'v2',
        vendorName: 'Campus Canteen',
        vendorLogo: null,
        image: null,
        rating: 4.2,
        soldCount: 1250,
      },
      {
        id: '4',
        name: 'School Uniform - Shirt (White)',
        category: 'Clothing',
        price: 350000,
        discountPrice: 315000,
        stock: 30,
        vendorId: 'v3',
        vendorName: 'School Uniforms',
        vendorLogo: null,
        image: null,
        rating: 4.6,
        soldCount: 89,
      },
      {
        id: '5',
        name: 'Scientific Calculator',
        category: 'Electronics',
        price: 750000,
        discountPrice: null,
        stock: 25,
        vendorId: 'v1',
        vendorName: 'Student Bookshop',
        vendorLogo: null,
        image: null,
        rating: 4.9,
        soldCount: 67,
      },
      {
        id: '6',
        name: 'Snack Pack - Biscuits & Juice',
        category: 'Food & Beverages',
        price: 50000,
        discountPrice: null,
        stock: 500,
        vendorId: 'v2',
        vendorName: 'Campus Canteen',
        vendorLogo: null,
        image: null,
        rating: 4.0,
        soldCount: 2340,
      },
    ]);

    setVendors([
      { id: 'v1', name: 'Student Bookshop', productCount: 156 },
      { id: 'v2', name: 'Campus Canteen', productCount: 24 },
      { id: 'v3', name: 'School Uniforms', productCount: 12 },
    ]);

    setLoading(false);
  }, []);

  const categories = [...new Set(products.map(p => p.category))];

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.category.toLowerCase().includes(search.toLowerCase());
    const matchesVendor = selectedVendor === 'all' || product.vendorId === selectedVendor;
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesVendor && matchesCategory;
  });

  return (
    <SchoolLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Shop</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Products from approved vendors for your students
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Store className="h-4 w-4" />
            {vendors.length} vendors | {products.length} products
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border border-purple-200 dark:border-purple-800 rounded-xl p-4">
          <div className="flex gap-3">
            <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-purple-900 dark:text-purple-100">Marketplace for Students</h3>
              <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                This shop displays products from your approved vendors' POS systems.
                Students can browse and purchase using their school wallet.
                All transactions are tracked in your school reports.
              </p>
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
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
            >
              {/* Product Image */}
              <div className="relative h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-gray-300 dark:text-gray-500" />
                )}
                {product.discountPrice && (
                  <span className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium bg-red-500 text-white rounded">
                    {Math.round((1 - product.discountPrice / product.price) * 100)}% OFF
                  </span>
                )}
                <button className="absolute top-2 right-2 p-1.5 bg-white/80 dark:bg-gray-800/80 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                  <Heart className="h-4 w-4 text-gray-400 hover:text-red-500" />
                </button>
              </div>

              {/* Product Info */}
              <div className="p-4">
                {/* Vendor */}
                <div className="flex items-center gap-1.5 mb-2">
                  <Store className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-500">{product.vendorName}</span>
                </div>

                {/* Name */}
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2 min-h-[40px]">
                  {product.name}
                </h3>

                {/* Rating & Sold */}
                <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-400 fill-yellow-400" />
                    {product.rating}
                  </span>
                  <span>{product.soldCount} sold</span>
                </div>

                {/* Price */}
                <div className="flex items-center justify-between">
                  <div>
                    {product.discountPrice ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900 dark:text-white">
                          SLE {(product.discountPrice / 100).toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {(product.price / 100).toLocaleString()}
                        </span>
                      </div>
                    ) : (
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        SLE {(product.price / 100).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Stock indicator */}
                <div className="mt-3 flex items-center justify-between">
                  <span className={`text-xs ${product.stock < 20 ? 'text-orange-600' : 'text-gray-500'}`}>
                    {product.stock < 20 ? `Only ${product.stock} left` : `${product.stock} in stock`}
                  </span>
                  <button className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <ShoppingCart className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && !loading && (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl">
            <ShoppingBag className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products found</h3>
            <p className="text-gray-500 dark:text-gray-400">
              {search ? `No products match "${search}"` : 'Approved vendors will add products here'}
            </p>
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
