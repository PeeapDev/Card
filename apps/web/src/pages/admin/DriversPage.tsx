import { useState, useEffect } from 'react';
import {
  Car,
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
  Filter,
  Download,
  MoreVertical,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, QuickStatsBar, StatItem } from '@/components/admin/AdminPageHeader';
import { DataTableToolbar, FilterConfig, EmptyState } from '@/components/admin/DataTableToolbar';

interface DriverProfile {
  id: string;
  user_id: string;
  vehicle_type: string;
  vehicle_name: string;
  operating_area: string;
  payment_methods: {
    qr: boolean;
    card: boolean;
    mobile: boolean;
  };
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
  total_collections?: number;
}

export function DriversPage() {
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [selectedDriver, setSelectedDriver] = useState<DriverProfile | null>(null);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalCollections: 0,
    todayCollections: 0,
  });

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      // Fetch driver profiles with user info
      const { data: driverProfiles, error } = await supabase
        .from('driver_profiles')
        .select(`
          *,
          user:profiles!driver_profiles_user_id_fkey (
            id,
            first_name,
            last_name,
            email,
            phone
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch driver wallets
      const userIds = driverProfiles?.map(d => d.user_id) || [];

      let walletsMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: wallets } = await supabase
          .from('wallets')
          .select('id, user_id, balance, currency')
          .in('user_id', userIds)
          .eq('wallet_type', 'driver');

        wallets?.forEach(w => {
          walletsMap[w.user_id] = w;
        });
      }

      // Fetch total collections per driver
      let collectionsMap: Record<string, number> = {};
      if (userIds.length > 0) {
        const { data: collections } = await supabase
          .from('transactions')
          .select('wallet_id, amount')
          .in('wallet_id', Object.values(walletsMap).map(w => w.id))
          .eq('type', 'PAYMENT_RECEIVED')
          .gt('amount', 0);

        collections?.forEach(c => {
          const walletId = c.wallet_id;
          collectionsMap[walletId] = (collectionsMap[walletId] || 0) + c.amount;
        });
      }

      // Combine data
      const driversWithData = (driverProfiles || []).map(d => ({
        ...d,
        wallet: walletsMap[d.user_id],
        total_collections: walletsMap[d.user_id]
          ? collectionsMap[walletsMap[d.user_id].id] || 0
          : 0,
      }));

      setDrivers(driversWithData);

      // Calculate stats
      const totalCollections = Object.values(collectionsMap).reduce((a, b) => a + b, 0);

      // Today's collections
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data: todayTx } = await supabase
        .from('transactions')
        .select('amount')
        .eq('type', 'PAYMENT_RECEIVED')
        .gte('created_at', today.toISOString())
        .gt('amount', 0);

      const todayTotal = todayTx?.reduce((sum, t) => sum + t.amount, 0) || 0;

      setStats({
        total: driverProfiles?.length || 0,
        active: driversWithData.filter(d => d.wallet && d.wallet.balance > 0).length,
        totalCollections,
        todayCollections: todayTotal,
      });

    } catch (err) {
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  // Filter drivers
  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch =
      driver.vehicle_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.operating_area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.user?.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.user?.last_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.user?.phone?.includes(searchQuery);

    const matchesVehicle = vehicleFilter === 'all' || driver.vehicle_type === vehicleFilter;

    return matchesSearch && matchesVehicle;
  });

  // Export to CSV
  const exportDrivers = () => {
    const headers = ['Name', 'Phone', 'Vehicle Type', 'Vehicle Name', 'Operating Area', 'Wallet Balance', 'Total Collections', 'Joined'];
    const csvContent = [
      headers.join(','),
      ...filteredDrivers.map(d => [
        `"${d.user?.first_name || ''} ${d.user?.last_name || ''}"`,
        d.user?.phone || '',
        d.vehicle_type,
        `"${d.vehicle_name}"`,
        `"${d.operating_area}"`,
        d.wallet?.balance || 0,
        d.total_collections || 0,
        new Date(d.created_at).toISOString(),
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `drivers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Header stats
  const headerStats: StatItem[] = [
    {
      label: 'Total Drivers',
      value: stats.total.toString(),
      icon: <Car className="w-4 h-4" />,
      color: 'primary',
    },
    {
      label: 'Active Today',
      value: stats.active.toString(),
      icon: <Users className="w-4 h-4" />,
      color: 'green',
    },
    {
      label: 'Total Collections',
      value: `Le ${(stats.totalCollections / 1000).toFixed(1)}K`,
      icon: <TrendingUp className="w-4 h-4" />,
      color: 'blue',
    },
    {
      label: "Today's Collections",
      value: `Le ${stats.todayCollections.toLocaleString()}`,
      icon: <DollarSign className="w-4 h-4" />,
      color: 'green',
    },
  ];

  // Filter configurations
  const filterConfigs: FilterConfig[] = [
    {
      key: 'vehicle',
      label: 'Vehicle Type',
      options: [
        { value: 'all', label: 'All Vehicles' },
        { value: 'keke', label: 'Keke' },
        { value: 'okada', label: 'Okada' },
        { value: 'taxi', label: 'Taxi' },
        { value: 'bus', label: 'Bus' },
      ],
      value: vehicleFilter,
      onChange: (value: string) => setVehicleFilter(value),
    },
  ];

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'keke':
        return '🛺';
      case 'okada':
        return '🏍️';
      case 'taxi':
        return '🚕';
      case 'bus':
        return '🚌';
      default:
        return '🚗';
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header with Stats */}
        <AdminPageHeader
          title="Drivers"
          description="Manage registered drivers and view their collection stats"
          icon={<Car className="w-6 h-6" />}
          breadcrumbs={[
            { label: 'Admin', href: '/admin' },
            { label: 'Transport' },
            { label: 'Drivers' },
          ]}
          onRefresh={fetchDrivers}
          refreshing={loading}
          onExport={exportDrivers}
          stats={<QuickStatsBar stats={headerStats} />}
        />

        {/* Filters */}
        <Card className="p-4">
          <DataTableToolbar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search by name, phone, vehicle, or area..."
            filters={filterConfigs}
            totalCount={stats.total}
            onExport={exportDrivers}
          />
        </Card>

        {/* Drivers Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          ) : filteredDrivers.length === 0 ? (
            <EmptyState
              icon={<Car className="w-12 h-12" />}
              title="No drivers found"
              description={searchQuery ? "Try adjusting your search or filters" : "Drivers will appear here once they register"}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Driver</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vehicle</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Operating Area</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Wallet Balance</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Collections</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Joined</th>
                    <th className="text-left px-6 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 dark:text-primary-400 font-medium">
                              {driver.user?.first_name?.charAt(0)}{driver.user?.last_name?.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {driver.user?.first_name} {driver.user?.last_name}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{driver.user?.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{getVehicleIcon(driver.vehicle_type)}</span>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white capitalize">{driver.vehicle_type}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{driver.vehicle_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {driver.operating_area}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {driver.wallet ? (
                          <span className="font-medium text-gray-900 dark:text-white">
                            Le {driver.wallet.balance.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-gray-400">No wallet</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-green-600 dark:text-green-400">
                          Le {(driver.total_collections || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {new Date(driver.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedDriver(driver)}
                          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
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
