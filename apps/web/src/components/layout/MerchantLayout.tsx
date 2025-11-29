import { ReactNode, useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDeveloperMode } from '@/context/DeveloperModeContext';

interface MerchantLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/merchant/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/merchant/payouts', label: 'Payouts', icon: DollarSign },
  { path: '/merchant/refunds', label: 'Refunds', icon: RefreshCw },
  { path: '/merchant/reports', label: 'Reports', icon: BarChart3 },
  { path: '/merchant/payment-links', label: 'Payment Links', icon: CreditCard },
  { path: '/merchant/settings', label: 'Settings', icon: Settings },
];

export function MerchantLayout({ children }: MerchantLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { isDeveloperMode } = useDeveloperMode();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <Link to="/merchant" className="flex items-center gap-2">
              <Store className="w-8 h-8 text-green-600" />
              <span className="text-xl font-bold text-gray-900">Merchant</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
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
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  {item.label}
                </Link>
              );
            })}

            {/* Developer Mode Link */}
            {isDeveloperMode && (
              <div className="pt-4 mt-4 border-t border-gray-200">
                <Link
                  to="/merchant/developer"
                  className="flex items-center justify-between px-4 py-3 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors"
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
          <div className="px-4 py-3 border-t border-gray-200">
            <Link
              to="/merchant/support"
              className="flex items-center px-4 py-3 text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <HelpCircle className="w-5 h-5 mr-3" />
              Help & Support
            </Link>
          </div>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <Store className="w-5 h-5 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500">Merchant Account</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
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
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <span className="hidden sm:inline-flex px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                Merchant Portal
              </span>
              {isDeveloperMode && (
                <Link
                  to="/merchant/developer"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium hover:bg-indigo-200 transition-colors"
                >
                  <Code2 className="w-3 h-3" />
                  Developer
                </Link>
              )}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
