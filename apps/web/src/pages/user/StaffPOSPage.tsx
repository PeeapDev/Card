/**
 * Staff POS Page
 *
 * A simplified POS interface for staff members to process sales.
 * - Staff can view products and process transactions
 * - Payments are credited to the merchant's account
 * - Staff sees their own sales performance and logs
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Smartphone,
  Banknote,
  QrCode,
  History,
  BarChart3,
  User,
  Package,
  Loader2,
  CheckCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Receipt,
  ChevronRight,
  ChevronDown,
  Settings,
  LogOut,
  X,
  Maximize2,
  Minimize2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Building2,
  Users,
  Target,
  Calendar,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { posService, POSProduct, POSCategory, POSSale, POSSaleItem, POSStaff } from '@/services/pos.service';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import { formatCurrency } from '@/lib/utils';

// Welcome Wizard Component
function WelcomeWizard({
  staffName,
  merchantName,
  role,
  onComplete,
  onSkip,
}: {
  staffName: string;
  merchantName: string;
  role: string;
  onComplete: () => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      icon: Sparkles,
      title: `Welcome, ${staffName}!`,
      description: `You've been added as a ${role} at ${merchantName}. This POS system will help you process sales efficiently.`,
      color: 'indigo',
    },
    {
      icon: ShoppingCart,
      title: 'Processing Sales',
      description: 'Browse products, add them to cart, and complete sales using various payment methods. All transactions are automatically tracked.',
      color: 'green',
    },
    {
      icon: BarChart3,
      title: 'Track Your Performance',
      description: 'View your sales history, daily stats, and performance metrics. Both you and the business owner can see these reports.',
      color: 'blue',
    },
    {
      icon: Target,
      title: 'Ready to Start!',
      description: 'You\'re all set! Use the fullscreen button for a distraction-free experience. Happy selling!',
      color: 'purple',
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;

  const colorClasses = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-md p-6 animate-fade-in">
        <div className="text-center">
          <div className={clsx('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4', colorClasses[currentStep.color as keyof typeof colorClasses])}>
            <Icon className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {currentStep.title}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {currentStep.description}
          </p>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <div
                key={i}
                className={clsx(
                  'w-2 h-2 rounded-full transition-colors',
                  i === step ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                )}
              />
            ))}
          </div>

          <div className="flex gap-3">
            {step === 0 && (
              <Button variant="outline" className="flex-1" onClick={onSkip}>
                Skip Tour
              </Button>
            )}
            {step > 0 && (
              <Button variant="outline" className="flex-1" onClick={() => setStep(step - 1)}>
                Back
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button className="flex-1" onClick={() => setStep(step + 1)}>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button className="flex-1" onClick={onComplete}>
                Get Started
                <CheckCircle className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Staff Performance Report Dropdown
function StaffReportDropdown({
  staffId,
  merchantId,
  staffName,
  isOpen,
  onToggle,
}: {
  staffId: string;
  merchantId: string;
  staffName: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    weekSales: 0,
    weekTransactions: 0,
    monthSales: 0,
    monthTransactions: 0,
    avgSaleAmount: 0,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen, staffId, merchantId]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      const monthAgo = new Date();
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      monthAgo.setHours(0, 0, 0, 0);

      // Get all completed sales for this staff member
      const { data: allSales } = await supabase
        .from('pos_sales')
        .select('total_amount, created_at')
        .eq('merchant_id', merchantId)
        .eq('cashier_id', staffId)
        .eq('status', 'completed')
        .gte('created_at', monthAgo.toISOString());

      if (allSales) {
        const todaySalesData = allSales.filter(s => new Date(s.created_at) >= today);
        const weekSalesData = allSales.filter(s => new Date(s.created_at) >= weekAgo);

        const totalSales = allSales.reduce((sum, s) => sum + (s.total_amount || 0), 0);

        setStats({
          todaySales: todaySalesData.reduce((sum, s) => sum + (s.total_amount || 0), 0),
          todayTransactions: todaySalesData.length,
          weekSales: weekSalesData.reduce((sum, s) => sum + (s.total_amount || 0), 0),
          weekTransactions: weekSalesData.length,
          monthSales: totalSales,
          monthTransactions: allSales.length,
          avgSaleAmount: allSales.length > 0 ? totalSales / allSales.length : 0,
        });
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:shadow-md transition-all"
      >
        <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Performance Report</span>
        <ChevronDown className={clsx('w-4 h-4 text-gray-500 transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold">{staffName}</h3>
                <p className="text-xs opacity-80">Performance Summary</p>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Today */}
              <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Today</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(stats.todaySales)}</p>
                  <p className="text-xs text-gray-500">{stats.todayTransactions} sales</p>
                </div>
              </div>

              {/* This Week */}
              <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">This Week</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(stats.weekSales)}</p>
                  <p className="text-xs text-gray-500">{stats.weekTransactions} sales</p>
                </div>
              </div>

              {/* This Month */}
              <div className="flex items-center justify-between p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">This Month</span>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(stats.monthSales)}</p>
                  <p className="text-xs text-gray-500">{stats.monthTransactions} sales</p>
                </div>
              </div>

              {/* Average */}
              <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500 dark:text-gray-400">Average Sale</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                    {formatCurrency(stats.avgSaleAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Cart Item Component
function CartItem({
  item,
  onUpdateQuantity,
  onRemove
}: {
  item: POSSaleItem;
  onUpdateQuantity: (quantity: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">{item.product_name}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {formatCurrency(item.unit_price)} each
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onUpdateQuantity(item.quantity - 1)}
          className="p-1 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          <Minus className="w-4 h-4" />
        </button>
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        <button
          onClick={() => onUpdateQuantity(item.quantity + 1)}
          className="p-1 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <p className="font-semibold text-gray-900 dark:text-white w-20 text-right">
        {formatCurrency(item.total_price)}
      </p>
      <button
        onClick={onRemove}
        className="p-1.5 rounded-lg text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Product Card Component
function ProductCard({
  product,
  onAdd
}: {
  product: POSProduct;
  onAdd: () => void;
}) {
  return (
    <button
      onClick={onAdd}
      disabled={!product.is_active || (product.track_inventory && product.stock_quantity <= 0)}
      className={clsx(
        'p-4 rounded-xl border transition-all text-left',
        product.is_active && (!product.track_inventory || product.stock_quantity > 0)
          ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:shadow-md cursor-pointer'
          : 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
      )}
    >
      {product.image_url ? (
        <img
          src={product.image_url}
          alt={product.name}
          className="w-full h-24 object-cover rounded-lg mb-3"
        />
      ) : (
        <div className="w-full h-24 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3 flex items-center justify-center">
          <Package className="w-8 h-8 text-gray-400" />
        </div>
      )}
      <h3 className="font-medium text-gray-900 dark:text-white truncate">{product.name}</h3>
      <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
        {formatCurrency(product.price)}
      </p>
      {product.track_inventory && (
        <p className={clsx(
          'text-xs mt-1',
          product.stock_quantity <= product.low_stock_threshold
            ? 'text-red-500'
            : 'text-gray-500 dark:text-gray-400'
        )}>
          {product.stock_quantity} in stock
        </p>
      )}
    </button>
  );
}

// Staff Stats Card
function StaffStatsCard({
  icon: Icon,
  label,
  value,
  trend,
  color = 'indigo'
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  trend?: string;
  color?: 'indigo' | 'green' | 'blue' | 'purple';
}) {
  const colors = {
    indigo: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div className={clsx('p-2.5 rounded-xl', colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{value}</p>
          {trend && (
            <p className="text-xs text-green-600 dark:text-green-400">{trend}</p>
          )}
        </div>
      </div>
    </Card>
  );
}

// No Position State
function NoPositionState() {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mb-6">
          <Store className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          No Staff Positions
        </h2>
        <p className="text-gray-600 dark:text-gray-400 max-w-md mb-6">
          You haven't been added as staff to any business yet. Check your notifications for pending invitations or ask a business owner to add you.
        </p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    </MainLayout>
  );
}

// Main Staff POS Component
export default function StaffPOSPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // State
  const [loading, setLoading] = useState(true);
  const [staffPositions, setStaffPositions] = useState<Array<{ staff: POSStaff; merchantName: string; merchantId: string }>>([]);
  const [activeStaff, setActiveStaff] = useState<POSStaff | null>(null);
  const [activeMerchantId, setActiveMerchantId] = useState<string | null>(null);
  const [merchantName, setMerchantName] = useState<string>('');

  // POS State
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [categories, setCategories] = useState<POSCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<POSSaleItem[]>([]);
  const [processing, setProcessing] = useState(false);

  // View State
  const [view, setView] = useState<'pos' | 'history' | 'stats'>('pos');
  const [salesHistory, setSalesHistory] = useState<POSSale[]>([]);
  const [stats, setStats] = useState({
    todaySales: 0,
    todayTransactions: 0,
    weekSales: 0,
    weekTransactions: 0,
  });

  // UI State
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [showReportDropdown, setShowReportDropdown] = useState(false);
  const [showBusinessSelector, setShowBusinessSelector] = useState(false);

  // Load staff positions
  useEffect(() => {
    loadStaffPositions();
  }, [user?.id]);

  // Check if should show wizard
  useEffect(() => {
    if (activeStaff) {
      const wizardKey = `staff_pos_wizard_${activeStaff.id}`;
      const hasSeenWizard = localStorage.getItem(wizardKey);
      if (!hasSeenWizard) {
        setShowWizard(true);
      }
    }
  }, [activeStaff]);

  const loadStaffPositions = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Get all staff positions for this user
      const { data: staffData, error } = await supabase
        .from('pos_staff')
        .select('*')
        .eq('user_id', user.id)
        .eq('invitation_status', 'accepted')
        .eq('is_active', true);

      if (error) throw error;

      if (staffData && staffData.length > 0) {
        // Get merchant names from notifications (where the POS business name is stored)
        const positions = await Promise.all(
          staffData.map(async (staff) => {
            let businessName = 'Business';

            // First try to get the business name from the staff invitation notification
            // This is where the POS settings business name is stored
            const { data: notification } = await supabase
              .from('notifications')
              .select('action_data')
              .eq('user_id', user.id)
              .eq('type', 'staff_invitation')
              .eq('source_id', staff.id)
              .single();

            if (notification?.action_data?.merchantName) {
              businessName = notification.action_data.merchantName;
            } else {
              // Fallback: try to get from merchant_businesses table
              const { data: merchant } = await supabase
                .from('merchant_businesses')
                .select('name')
                .eq('merchant_id', staff.merchant_id)
                .single();

              if (merchant?.name) {
                businessName = merchant.name;
              }
            }

            return {
              staff,
              merchantName: businessName,
              merchantId: staff.merchant_id,
            };
          })
        );

        setStaffPositions(positions);

        // Auto-select first position and set merchant name directly
        if (positions.length > 0) {
          const firstPosition = positions[0];
          setActiveStaff(firstPosition.staff);
          setActiveMerchantId(firstPosition.merchantId);
          setMerchantName(firstPosition.merchantName);

          // Load products and categories
          const [productsData, categoriesData] = await Promise.all([
            posService.getProducts(firstPosition.merchantId),
            posService.getCategories(firstPosition.merchantId),
          ]);

          setProducts(productsData);
          setCategories(categoriesData);

          // Load sales history for this staff
          await loadSalesHistory(firstPosition.merchantId, firstPosition.staff.id || '');
          await loadStats(firstPosition.merchantId, firstPosition.staff.id || '');
        }
      }
    } catch (error) {
      console.error('Error loading staff positions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPosition = async (staffId: string, merchantId: string) => {
    try {
      setLoading(true);
      setShowBusinessSelector(false);

      // Get staff details
      const staff = staffPositions.find(p => p.staff.id === staffId);
      if (!staff) {
        // If positions not loaded yet, fetch directly
        const { data: staffRecord } = await supabase
          .from('pos_staff')
          .select('*')
          .eq('id', staffId)
          .single();

        if (staffRecord) {
          let businessName = 'Business';

          // Try to get business name from notification action_data
          const { data: notification } = await supabase
            .from('notifications')
            .select('action_data')
            .eq('user_id', user?.id)
            .eq('type', 'staff_invitation')
            .eq('source_id', staffId)
            .single();

          if (notification?.action_data?.merchantName) {
            businessName = notification.action_data.merchantName;
          } else {
            // Fallback to merchant_businesses
            const { data: merchant } = await supabase
              .from('merchant_businesses')
              .select('name')
              .eq('merchant_id', merchantId)
              .single();

            if (merchant?.name) {
              businessName = merchant.name;
            }
          }

          setActiveStaff(staffRecord);
          setActiveMerchantId(merchantId);
          setMerchantName(businessName);
        }
      } else {
        setActiveStaff(staff.staff);
        setActiveMerchantId(merchantId);
        setMerchantName(staff.merchantName);
      }

      // Load products and categories
      const [productsData, categoriesData] = await Promise.all([
        posService.getProducts(merchantId),
        posService.getCategories(merchantId),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);

      // Load sales history for this staff
      await loadSalesHistory(merchantId, staffId);
      await loadStats(merchantId, staffId);

    } catch (error) {
      console.error('Error selecting position:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSalesHistory = async (merchantId: string, staffId: string) => {
    try {
      const { data, error } = await supabase
        .from('pos_sales')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('cashier_id', staffId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error && data) {
        setSalesHistory(data);
      }
    } catch (error) {
      console.error('Error loading sales history:', error);
    }
  };

  const loadStats = async (merchantId: string, staffId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);

      // Today's stats
      const { data: todayData } = await supabase
        .from('pos_sales')
        .select('total_amount')
        .eq('merchant_id', merchantId)
        .eq('cashier_id', staffId)
        .eq('status', 'completed')
        .gte('created_at', today.toISOString());

      // Week's stats
      const { data: weekData } = await supabase
        .from('pos_sales')
        .select('total_amount')
        .eq('merchant_id', merchantId)
        .eq('cashier_id', staffId)
        .eq('status', 'completed')
        .gte('created_at', weekAgo.toISOString());

      setStats({
        todaySales: todayData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0,
        todayTransactions: todayData?.length || 0,
        weekSales: weekData?.reduce((sum, s) => sum + (s.total_amount || 0), 0) || 0,
        weekTransactions: weekData?.length || 0,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const addToCart = (product: POSProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product_id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total_price: (item.quantity + 1) * item.unit_price,
              }
            : item
        );
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          product_sku: product.sku,
          quantity: 1,
          unit_price: product.price,
          discount_amount: 0,
          tax_amount: product.price * (product.tax_rate / 100),
          total_price: product.price,
        },
      ];
    });
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product_id === productId
          ? {
              ...item,
              quantity,
              total_price: quantity * item.unit_price,
            }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total_price, 0);
  const cartTax = cart.reduce((sum, item) => sum + item.tax_amount, 0);

  const processSale = async (paymentMethod: 'cash' | 'mobile_money' | 'card' | 'qr') => {
    if (!activeStaff || !activeMerchantId || cart.length === 0) return;

    try {
      setProcessing(true);

      const sale: POSSale = {
        merchant_id: activeMerchantId,
        subtotal: cartTotal - cartTax,
        tax_amount: cartTax,
        discount_amount: 0,
        total_amount: cartTotal,
        payment_method: paymentMethod,
        payment_status: 'completed',
        cashier_id: activeStaff.id,
        cashier_name: activeStaff.name,
        status: 'completed',
        items: cart,
      };

      await posService.createSale(sale, cart);

      // Clear cart and refresh
      clearCart();
      await loadSalesHistory(activeMerchantId, activeStaff.id || '');
      await loadStats(activeMerchantId, activeStaff.id || '');

      // Show success (could add a toast here)
      alert('Sale completed successfully!');

    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Failed to process sale. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category_id === selectedCategory;
    return matchesSearch && matchesCategory && product.is_active;
  });

  const handleWizardComplete = () => {
    if (activeStaff) {
      localStorage.setItem(`staff_pos_wizard_${activeStaff.id}`, 'true');
    }
    setShowWizard(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Loading state
  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </MainLayout>
    );
  }

  // No positions state
  if (staffPositions.length === 0) {
    return <NoPositionState />;
  }

  // No active position selected
  if (!activeStaff || !activeMerchantId) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        </div>
      </MainLayout>
    );
  }

  const POSContent = (
    <div className={clsx('bg-gray-50 dark:bg-gray-900', isFullscreen ? 'min-h-screen' : '')}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Business Selector */}
            <div className="relative">
              <button
                onClick={() => setShowBusinessSelector(!showBusinessSelector)}
                className="flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl p-2 transition-colors"
              >
                <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
                  <Store className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div className="text-left">
                  <h1 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                    {merchantName}
                    {staffPositions.length > 1 && <ChevronDown className="w-4 h-4 text-gray-400" />}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activeStaff.name} • <span className="capitalize">{activeStaff.role}</span>
                  </p>
                </div>
              </button>

              {/* Business dropdown */}
              {showBusinessSelector && staffPositions.length > 1 && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="p-2">
                    <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase">Switch Business</p>
                    {staffPositions.map(({ staff, merchantName: name, merchantId }) => (
                      <button
                        key={staff.id}
                        onClick={() => handleSelectPosition(staff.id || '', merchantId)}
                        className={clsx(
                          'w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left',
                          activeMerchantId === merchantId
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        )}
                      >
                        <Building2 className="w-4 h-4" />
                        <div>
                          <p className="font-medium">{name}</p>
                          <p className="text-xs text-gray-500 capitalize">{staff.role}</p>
                        </div>
                        {activeMerchantId === merchantId && (
                          <CheckCircle className="w-4 h-4 ml-auto" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Performance Report Dropdown */}
            <StaffReportDropdown
              staffId={activeStaff.id || ''}
              merchantId={activeMerchantId}
              staffName={activeStaff.name}
              isOpen={showReportDropdown}
              onToggle={() => setShowReportDropdown(!showReportDropdown)}
            />

            {/* View Toggle */}
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setView('pos')}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  view === 'pos'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                )}
                title="POS Terminal"
              >
                <ShoppingCart className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('history')}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  view === 'history'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                )}
                title="Sales History"
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={() => setView('stats')}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  view === 'stats'
                    ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                )}
                title="Performance Stats"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>

            {/* Help Button */}
            <button
              onClick={() => setShowWizard(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title="Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* POS View */}
      {view === 'pos' && (
        <div className={clsx('flex', isFullscreen ? 'h-[calc(100vh-65px)]' : 'h-[calc(100vh-200px)]')}>
          {/* Products Panel */}
          <div className="flex-1 p-4 overflow-y-auto">
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Categories */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={clsx(
                  'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  !selectedCategory
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                )}
              >
                All
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                    selectedCategory === category.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => addToCart(product)}
                />
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No products found</p>
              </div>
            )}
          </div>

          {/* Cart Panel */}
          <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Cart ({cart.length})
                </h2>
                {cart.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Cart is empty</p>
                  <p className="text-sm text-gray-400">Add products to start a sale</p>
                </div>
              ) : (
                cart.map(item => (
                  <CartItem
                    key={item.product_id}
                    item={item}
                    onUpdateQuantity={(qty) => updateCartItemQuantity(item.product_id, qty)}
                    onRemove={() => removeFromCart(item.product_id)}
                  />
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(cartTotal - cartTax)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Tax</span>
                    <span className="text-gray-900 dark:text-white">{formatCurrency(cartTax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-gray-900 dark:text-white">Total</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{formatCurrency(cartTotal)}</span>
                  </div>
                </div>

                {/* Payment Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => processSale('cash')}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
                    Cash
                  </button>
                  <button
                    onClick={() => processSale('mobile_money')}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Smartphone className="w-5 h-5" />}
                    Mobile
                  </button>
                  <button
                    onClick={() => processSale('card')}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                    Card
                  </button>
                  <button
                    onClick={() => processSale('qr')}
                    disabled={processing}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <QrCode className="w-5 h-5" />}
                    QR Pay
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History View */}
      {view === 'history' && (
        <div className="p-4 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Sales History</h2>

          <div className="space-y-3">
            {salesHistory.length === 0 ? (
              <Card className="p-8 text-center">
                <Receipt className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">No sales yet</p>
                <p className="text-sm text-gray-400">Your completed sales will appear here</p>
              </Card>
            ) : (
              salesHistory.map(sale => (
                <Card key={sale.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Sale #{sale.sale_number}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(sale.created_at!).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900 dark:text-white">
                        {formatCurrency(sale.total_amount)}
                      </p>
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full',
                        sale.status === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : sale.status === 'voided'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                      )}>
                        {sale.status === 'completed' && <CheckCircle className="w-3 h-3" />}
                        <span className="capitalize">{sale.status}</span>
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                    <span className="capitalize">{sale.payment_method?.replace('_', ' ')}</span>
                    <span>{sale.items?.length || 0} items</span>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Stats View */}
      {view === 'stats' && (
        <div className="p-4 max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Your Performance</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <StaffStatsCard
              icon={DollarSign}
              label="Today's Sales"
              value={formatCurrency(stats.todaySales)}
              color="green"
            />
            <StaffStatsCard
              icon={Receipt}
              label="Today's Transactions"
              value={stats.todayTransactions.toString()}
              color="blue"
            />
            <StaffStatsCard
              icon={TrendingUp}
              label="This Week's Sales"
              value={formatCurrency(stats.weekSales)}
              color="indigo"
            />
            <StaffStatsCard
              icon={BarChart3}
              label="This Week's Transactions"
              value={stats.weekTransactions.toString()}
              color="purple"
            />
          </div>

          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Average Sale Today</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.todayTransactions > 0
                    ? formatCurrency(stats.todaySales / stats.todayTransactions)
                    : formatCurrency(0)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Average Sale This Week</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {stats.weekTransactions > 0
                    ? formatCurrency(stats.weekSales / stats.weekTransactions)
                    : formatCurrency(0)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Welcome Wizard Modal */}
      {showWizard && (
        <WelcomeWizard
          staffName={activeStaff.name}
          merchantName={merchantName}
          role={activeStaff.role}
          onComplete={handleWizardComplete}
          onSkip={handleWizardComplete}
        />
      )}

      {/* Click outside to close dropdowns */}
      {(showBusinessSelector || showReportDropdown) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setShowBusinessSelector(false);
            setShowReportDropdown(false);
          }}
        />
      )}
    </div>
  );

  // Render with or without MainLayout based on fullscreen
  if (isFullscreen) {
    return POSContent;
  }

  return <MainLayout>{POSContent}</MainLayout>;
}
