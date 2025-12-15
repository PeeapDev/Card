/**
 * POS App Landing Page
 *
 * Uses the merchant's user profile directly - no need to create a separate business
 * Provides quick access to POS terminal, products, and sales
 * Redirects to setup wizard if POS hasn't been configured yet
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  ShoppingCart,
  Store,
  Package,
  BarChart3,
  Settings,
  Loader2,
  Boxes,
  TrendingUp,
  Play,
  History,
  DollarSign,
  ArrowUpRight,
  Wallet,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import posService, { POSCashSession } from '@/services/pos.service';

interface POSStats {
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  todaySales: number;
  todayRevenue: number;
}

interface RecentSale {
  id: string;
  sale_number: string;
  total_amount: number;
  created_at: string;
}

export function POSAppPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [checkingSetup, setCheckingSetup] = useState(true);
  const [stats, setStats] = useState<POSStats>({
    totalProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
    todaySales: 0,
    todayRevenue: 0,
  });
  const [recentSales, setRecentSales] = useState<RecentSale[]>([]);
  const [cashSession, setCashSession] = useState<POSCashSession | null>(null);

  // Check if POS setup has been completed
  useEffect(() => {
    const checkSetup = async () => {
      if (!user?.id) return;

      try {
        // Check database for setup status
        const isCompleted = await posService.isPOSSetupCompleted(user.id);
        if (!isCompleted) {
          // Redirect to setup wizard if not completed
          navigate('/merchant/pos/setup', { replace: true });
          return;
        }
        setCheckingSetup(false);
      } catch (error) {
        console.error('Error checking POS setup:', error);
        // On error, redirect to setup to be safe
        navigate('/merchant/pos/setup', { replace: true });
      }
    };

    checkSetup();
  }, [user, navigate]);

  useEffect(() => {
    if (user && !checkingSetup) {
      loadData();
    }
  }, [user, checkingSetup]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Load stats for this merchant's products and sales (using merchant_id = user.id)
      const [productsResult, allSalesResult, todaySalesResult] = await Promise.all([
        supabase
          .from('pos_products')
          .select('id', { count: 'exact', head: true })
          .eq('merchant_id', user.id)
          .eq('is_active', true),
        supabase
          .from('pos_sales')
          .select('total_amount')
          .eq('merchant_id', user.id)
          .eq('status', 'completed'),
        supabase
          .from('pos_sales')
          .select('total_amount')
          .eq('merchant_id', user.id)
          .eq('status', 'completed')
          .gte('created_at', new Date().toISOString().split('T')[0]),
      ]);

      const totalRevenue = allSalesResult.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;
      const todayRevenue = todaySalesResult.data?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0;

      setStats({
        totalProducts: productsResult.count || 0,
        totalSales: allSalesResult.data?.length || 0,
        totalRevenue,
        todaySales: todaySalesResult.data?.length || 0,
        todayRevenue,
      });

      // Load recent sales
      const { data: recentSalesData } = await supabase
        .from('pos_sales')
        .select('id, sale_number, total_amount, created_at')
        .eq('merchant_id', user.id)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(5);

      setRecentSales(recentSalesData || []);

      // Load today's cash session
      try {
        const session = await posService.getTodayCashSession(user.id);
        setCashSession(session);
      } catch (err) {
        console.error('Error loading cash session:', err);
        setCashSession(null);
      }
    } catch (error) {
      console.error('Error loading POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get merchant name from user profile
  const merchantName = user ? `${user.firstName} ${user.lastName}` : 'Merchant';

  // Show loading while checking setup or loading data
  if (checkingSetup || loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <ShoppingCart className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Point of Sale</h1>
                <p className="text-gray-500 dark:text-gray-400">{merchantName}'s POS Terminal</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => navigate('/merchant/pos/terminal')}
              size="lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Launch POS
            </Button>
            <Button
              onClick={() => navigate('/merchant/pos/settings')}
              variant="outline"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => navigate('/merchant/pos/terminal')}
            className="bg-green-500 hover:bg-green-600 text-white rounded-xl p-4 text-left transition-colors"
          >
            <Play className="w-6 h-6 mb-2" />
            <p className="font-semibold">Start Selling</p>
            <p className="text-sm text-green-100">Open POS Terminal</p>
          </button>
          <button
            onClick={() => navigate('/merchant/pos/products')}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-xl p-4 text-left transition-colors"
          >
            <Package className="w-6 h-6 mb-2" />
            <p className="font-semibold">Products</p>
            <p className="text-sm text-blue-100">Manage inventory</p>
          </button>
          <button
            onClick={() => navigate('/merchant/pos/sales')}
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl p-4 text-left transition-colors"
          >
            <History className="w-6 h-6 mb-2" />
            <p className="font-semibold">Sales History</p>
            <p className="text-sm text-purple-100">View transactions</p>
          </button>
          <button
            onClick={() => navigate('/merchant/reports')}
            className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl p-4 text-left transition-colors"
          >
            <BarChart3 className="w-6 h-6 mb-2" />
            <p className="font-semibold">Reports</p>
            <p className="text-sm text-orange-100">Analytics & insights</p>
          </button>
        </div>

        {/* Cash Drawer Status */}
        <Card className={`p-4 ${
          cashSession?.status === 'open'
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800'
            : cashSession?.status === 'closed'
            ? 'bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-900/20 dark:to-slate-900/20 border-gray-200 dark:border-gray-700'
            : 'bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${
                cashSession?.status === 'open'
                  ? 'bg-green-100 dark:bg-green-900/30'
                  : cashSession?.status === 'closed'
                  ? 'bg-gray-100 dark:bg-gray-800/50'
                  : 'bg-yellow-100 dark:bg-yellow-900/30'
              }`}>
                <Wallet className={`w-6 h-6 ${
                  cashSession?.status === 'open'
                    ? 'text-green-600 dark:text-green-400'
                    : cashSession?.status === 'closed'
                    ? 'text-gray-600 dark:text-gray-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Cash Drawer
                </h3>
                {cashSession ? (
                  <div className="flex items-center gap-2 mt-1">
                    {cashSession.status === 'open' ? (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                          <CheckCircle className="w-3 h-3" />
                          Open
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Opened at {new Date(cashSession.opened_at!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          <Clock className="w-3 h-3" />
                          Closed
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          Day ended
                        </span>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    No session started today
                  </p>
                )}
              </div>
            </div>

            {/* Balance Info */}
            <div className="text-right">
              {cashSession ? (
                cashSession.status === 'open' ? (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Current Balance</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(
                        cashSession.opening_balance +
                        (cashSession.cash_in || 0) -
                        (cashSession.cash_out || 0) +
                        stats.todayRevenue
                      )}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Opening: {formatCurrency(cashSession.opening_balance)}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Final Balance</p>
                    <p className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                      {formatCurrency(cashSession.closing_balance || 0)}
                    </p>
                    {cashSession.difference !== undefined && cashSession.difference !== 0 && (
                      <p className={`text-xs ${
                        cashSession.difference > 0 ? 'text-blue-600' : 'text-red-600'
                      }`}>
                        {cashSession.difference > 0 ? '+' : ''}{formatCurrency(cashSession.difference)} difference
                      </p>
                    )}
                  </>
                )
              ) : (
                <Button
                  onClick={() => navigate('/merchant/pos/terminal')}
                  size="sm"
                >
                  <Play className="w-4 h-4 mr-1" />
                  Start Day
                </Button>
              )}
            </div>
          </div>

          {/* Session Details for Open Sessions */}
          {cashSession?.status === 'open' && (
            <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Opening</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {formatCurrency(cashSession.opening_balance)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cash In</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    +{formatCurrency(cashSession.cash_in || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cash Out</p>
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    -{formatCurrency(cashSession.cash_out || 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Cash Sales</p>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    +{formatCurrency(stats.todayRevenue)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Today's Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.todaySales}
                </p>
                <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                  {formatCurrency(stats.todayRevenue)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Sales</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalSales}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All time</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {formatCurrency(stats.totalRevenue)}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">All time</p>
              </div>
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Products</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalProducts}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Active items</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <Package className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Sales */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Recent Sales</h3>
            <button
              onClick={() => navigate('/merchant/pos/sales')}
              className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
            >
              View All
              <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>No sales yet</p>
              <p className="text-sm">Start your first sale!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {recentSales.map(sale => (
                <div
                  key={sale.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      #{sale.sale_number}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(sale.created_at)}
                    </p>
                  </div>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {formatCurrency(sale.total_amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Features Info */}
        <Card className="p-6 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">POS Features</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-start gap-2">
              <ShoppingCart className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Quick Sales</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Fast checkout</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Package className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Inventory</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Track stock</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Boxes className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Offline Mode</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Works offline</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <BarChart3 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Reports</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Sales analytics</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </MerchantLayout>
  );
}

export default POSAppPage;
