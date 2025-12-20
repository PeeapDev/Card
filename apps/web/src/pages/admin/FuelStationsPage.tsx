import { useState, useEffect } from 'react';
import {
  Fuel,
  Search,
  RefreshCw,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  MapPin,
  Wallet,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Phone,
  Mail,
  Building2,
  Droplet,
  Activity,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, QuickStatsBar, StatItem } from '@/components/admin/AdminPageHeader';
import { DataTableToolbar, FilterConfig, EmptyState } from '@/components/admin/DataTableToolbar';

interface FuelStation {
  id: string;
  user_id: string;
  name: string;
  address: string;
  city: string;
  region: string;
  fuel_types: string[];
  operating_hours: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
  wallet?: {
    id: string;
    balance: number;
    currency: string;
  };
  total_sales?: number;
}

export function FuelStationsPage() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    pending: 0,
    totalSales: 0,
  });

  const fetchStations = async () => {
    setLoading(true);
    try {
      // Try to fetch fuel stations - table may not exist yet
      const { data: fuelStations, error } = await supabase
        .from('fuel_stations')
        .select(`
          *,
          user:profiles!fuel_stations_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        // Table might not exist yet
        console.log('Fuel stations table not found or empty:', error.message);
        setStations([]);
        setStats({ total: 0, active: 0, pending: 0, totalSales: 0 });
        return;
      }

      setStations(fuelStations || []);

      // Calculate stats
      setStats({
        total: fuelStations?.length || 0,
        active: fuelStations?.filter(s => s.status === 'active').length || 0,
        pending: fuelStations?.filter(s => s.status === 'pending').length || 0,
        totalSales: 0, // Would need to calculate from transactions
      });

    } catch (err) {
      console.error('Error fetching fuel stations:', err);
      setStations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStations();
  }, []);

  // Filter stations
  const filteredStations = stations.filter(station => {
    const matchesSearch =
      station.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.address?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || station.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Export to CSV
  const exportStations = () => {
    const headers = ['Name', 'Address', 'City', 'Region', 'Status', 'Fuel Types', 'Created'];
    const csvContent = [
      headers.join(','),
      ...filteredStations.map(s => [
        `"${s.name}"`,
        `"${s.address}"`,
        s.city,
        s.region,
        s.status,
        `"${s.fuel_types?.join(', ') || ''}"`,
        new Date(s.created_at).toISOString(),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuel-stations-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Header stats
  const headerStats: StatItem[] = [
    {
      label: 'Total Stations',
      value: stats.total.toString(),
      icon: <Fuel className="w-4 h-4" />,
      color: 'primary',
    },
    {
      label: 'Active',
      value: stats.active.toString(),
      icon: <CheckCircle className="w-4 h-4" />,
      color: 'green',
    },
    {
      label: 'Pending Approval',
      value: stats.pending.toString(),
      icon: <Clock className="w-4 h-4" />,
      color: 'yellow',
    },
    {
      label: 'Total Sales',
      value: `Le ${stats.totalSales.toLocaleString()}`,
      icon: <DollarSign className="w-4 h-4" />,
      color: 'blue',
    },
  ];

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'all', label: 'All Status' },
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'pending', label: 'Pending' },
      ],
      value: statusFilter,
      onChange: (value: string) => setStatusFilter(value),
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'inactive':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
            <XCircle className="w-3 h-3" />
            Inactive
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Stats */}
        <AdminPageHeader
          title="Fuel Stations"
          description="Manage registered fuel stations and their operations"
          icon={<Fuel className="w-6 h-6" />}
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Transport' },
            { label: 'Fuel Stations' },
          ]}
          onRefresh={fetchStations}
          refreshing={loading}
          onExport={exportStations}
          stats={<QuickStatsBar stats={headerStats} />}
        />

        {/* Filters */}
        <Card className="p-4">
          <DataTableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by name, city, or address..."
            filters={filterConfigs}
            totalCount={stats.total}
            onExport={exportStations}
          />
        </Card>

        {/* Stations Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : filteredStations.length === 0 ? (
            <EmptyState
              icon={<Fuel className="w-12 h-12" />}
              title="No fuel stations found"
              description={searchQuery ? "Try adjusting your search or filters" : "Fuel stations will appear here once they register"}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Station</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Location</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fuel Types</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Operating Hours</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Registered</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredStations.map((station) => (
                    <tr key={station.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                            <Fuel className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{station.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{station.user?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1 text-gray-600 dark:text-gray-300">
                          <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p>{station.address}</p>
                            <p className="text-sm text-gray-500">{station.city}, {station.region}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {station.fuel_types?.map((type, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            >
                              <Droplet className="w-3 h-3" />
                              {type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(station.status)}
                      </td>
                      <td className="px-6 py-4 text-gray-600 dark:text-gray-300">
                        {station.operating_hours || '24/7'}
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(station.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
