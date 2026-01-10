import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Store,
  Plus,
  ArrowLeft,
  MoreVertical,
  MapPin,
  Phone,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  type: string;
  location: string;
  phone: string;
  status: 'active' | 'inactive';
  totalSales: number;
  transactionCount: number;
}

export function SchoolVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch from API
    setVendors([
      {
        id: '1',
        name: 'School Canteen',
        type: 'Food & Beverages',
        location: 'Main Building, Ground Floor',
        phone: '+232 76 111 2222',
        status: 'active',
        totalSales: 15000000,
        transactionCount: 450,
      },
      {
        id: '2',
        name: 'Bookshop',
        type: 'Books & Supplies',
        location: 'Library Building',
        phone: '+232 76 333 4444',
        status: 'active',
        totalSales: 8500000,
        transactionCount: 120,
      },
      {
        id: '3',
        name: 'Uniform Store',
        type: 'Clothing',
        location: 'Admin Block',
        phone: '+232 76 555 6666',
        status: 'inactive',
        totalSales: 2500000,
        transactionCount: 45,
      },
    ]);
    setLoading(false);
  }, []);

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
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                  <Store className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-white">Vendors</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {vendors.length} vendors
                  </p>
                </div>
              </div>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Add Vendor
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <Store className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{vendor.name}</h3>
                    <p className="text-sm text-gray-500">{vendor.type}</p>
                  </div>
                </div>
                <button className="p-1 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <MapPin className="h-4 w-4" />
                  {vendor.location}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Phone className="h-4 w-4" />
                  {vendor.phone}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-sm text-gray-500">Total Sales</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    SLE {(vendor.totalSales / 100).toLocaleString()}
                  </p>
                </div>
                {vendor.status === 'active' ? (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 dark:text-green-400 dark:bg-green-900/30 rounded-full">
                    <CheckCircle className="h-3 w-3" />
                    Active
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30 rounded-full">
                    <XCircle className="h-3 w-3" />
                    Inactive
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
