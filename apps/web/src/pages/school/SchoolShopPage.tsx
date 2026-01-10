import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag,
  Plus,
  ArrowLeft,
  Search,
  Filter,
  Tag,
  Package
} from 'lucide-react';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  vendorName: string;
  image: string | null;
}

export function SchoolShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    // TODO: Fetch from API
    setProducts([
      {
        id: '1',
        name: 'Mathematics Textbook Grade 10',
        category: 'Education',
        price: 5000000,
        discountPrice: 4500000,
        stock: 50,
        vendorName: 'Bookshop',
        image: null,
      },
      {
        id: '2',
        name: 'School Notebook (Pack of 5)',
        category: 'Education',
        price: 250000,
        discountPrice: 225000,
        stock: 200,
        vendorName: 'Bookshop',
        image: null,
      },
      {
        id: '3',
        name: 'Lunch Meal - Rice & Chicken',
        category: 'Food',
        price: 150000,
        discountPrice: null,
        stock: 100,
        vendorName: 'School Canteen',
        image: null,
      },
      {
        id: '4',
        name: 'School Uniform - Shirt',
        category: 'Clothing',
        price: 350000,
        discountPrice: 315000,
        stock: 30,
        vendorName: 'Uniform Store',
        image: null,
      },
    ]);
    setLoading(false);
  }, []);

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/school" className="text-gray-500 hover:text-gray-700 dark:text-gray-400">
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <ShoppingBag className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Shop</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {products.length} products
                  </p>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Add Product
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
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

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-800 dark:text-blue-300">
            <Tag className="h-4 w-4 inline mr-2" />
            Products in the <strong>Education</strong> category have a 10% student discount when accessed from the school portal.
          </p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
            >
              <div className="h-40 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                {product.image ? (
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <Package className="h-12 w-12 text-gray-400" />
                )}
              </div>
              <div className="p-4">
                <p className="text-xs text-gray-500 mb-1">{product.vendorName}</p>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded">
                    {product.category}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    {product.discountPrice ? (
                      <>
                        <p className="text-sm text-gray-400 line-through">
                          SLE {(product.price / 100).toLocaleString()}
                        </p>
                        <p className="font-semibold text-green-600">
                          SLE {(product.discountPrice / 100).toLocaleString()}
                        </p>
                      </>
                    ) : (
                      <p className="font-semibold text-gray-900 dark:text-white">
                        SLE {(product.price / 100).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{product.stock} in stock</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
