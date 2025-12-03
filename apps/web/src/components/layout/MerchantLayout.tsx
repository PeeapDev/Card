import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  ArrowLeftRight,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Store,
  DollarSign,
  RefreshCw,
  BarChart3,
  CreditCard,
  HelpCircle,
  Code2,
  ExternalLink,
  Link2,
  User,
  Building2,
  Sparkles,
  Crown,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDeveloperMode } from '@/context/DeveloperModeContext';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';

interface MerchantLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/merchant/shops', label: 'My Shops', icon: Building2 },
  { path: '/merchant/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/merchant/payouts', label: 'Payouts', icon: DollarSign },
  { path: '/merchant/refunds', label: 'Refunds', icon: RefreshCw },
  { path: '/merchant/reports', label: 'Reports', icon: BarChart3 },
  { path: '/merchant/payment-links', label: 'Payment Links', icon: Link2 },
  { path: '/merchant/profile', label: 'Business Profile', icon: Store },
  { path: '/merchant/settings', label: 'Settings', icon: Settings },
];

export function MerchantLayout({ children }: MerchantLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDeveloperMode, checkBusinesses, hasBusinesses, businessCount } = useDeveloperMode();

  // Check for businesses when layout mounts
  useEffect(() => {
    checkBusinesses();
  }, []);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <Link to="/merchant" className="flex items-center gap-2">
              <Store className="w-8 h-8 text-green-600 dark:text-green-400" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">Merchant</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path ||
                (item.path !== '/merchant' && location.pathname.startsWith(item.path));

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center px-4 py-3 rounded-lg transition-colors',
                    isActive
                      ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}

            {/* Developer Mode Link */}
            {isDeveloperMode && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  to="/merchant/developer"
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <div className="flex items-center">
                    <Code2 className="w-5 h-5 mr-3" />
                    <span className="font-medium">Developer Portal</span>
                  </div>
                  <ExternalLink className="w-4 h-4" />
                </Link>
              </div>
            )}
          </nav>

          {/* Help section */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <Link
              to="/merchant/support"
              className={clsx(
                'flex items-center px-4 py-3 rounded-lg transition-colors',
                location.pathname === '/merchant/support'
                  ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              Help & Support
            </Link>
          </div>

          {/* User section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                <Store className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Merchant Account</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6 dark:text-gray-400" />
            </button>
            <div className="flex items-center gap-2 sm:gap-4">
              <span className="hidden sm:inline-flex px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
                Merchant Portal
              </span>
              {/* Merchant+ Upgrade Button */}
              <Link
                to="/merchant/upgrade"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
              >
                <Crown className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Upgrade to</span> Merchant+
              </Link>
              {isDeveloperMode && (
                <Link
                  to="/merchant/developer"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Code2 className="w-3 h-3" />
                  Developer
                </Link>
              )}
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
