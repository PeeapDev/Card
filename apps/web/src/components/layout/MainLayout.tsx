import { ReactNode, useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Wallet,
  CreditCard,
  ArrowLeftRight,
  User,
  LogOut,
  Menu,
  X,
  Send,
  QrCode,
  PiggyBank,
  HelpCircle,
  Smartphone,
  Store,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NFCIndicator } from '@/components/nfc';
import { supabase } from '@/lib/supabase';
import { SkipLink } from '@/components/ui/SkipLink';

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/wallets', label: 'Wallets', icon: Wallet },
  { path: '/send', label: 'Send Money', icon: Send },
  { path: '/receive', label: 'Receive Money', icon: QrCode },
  { path: '/payout', label: 'Mobile Money Payout', icon: Smartphone },
  { path: '/pots', label: 'Savings Pots', icon: PiggyBank },
  { path: '/cards', label: 'Cards', icon: CreditCard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/profile', label: 'Profile', icon: User },
  { path: '/support', label: 'Help & Support', icon: HelpCircle },
];

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasStaffPositions, setHasStaffPositions] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Check if user has any active staff positions
  useEffect(() => {
    const checkStaffPositions = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('pos_staff')
          .select('id')
          .eq('user_id', user.id)
          .eq('invitation_status', 'accepted')
          .eq('is_active', true)
          .limit(1);

        if (!error && data && data.length > 0) {
          setHasStaffPositions(true);
        }
      } catch (error) {
        console.error('Error checking staff positions:', error);
      }
    };

    checkStaffPositions();
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Build nav items dynamically - add POS if user has staff positions
  const dynamicNavItems = hasStaffPositions
    ? [
        ...navItems.slice(0, 5), // Dashboard to Payout
        { path: '/dashboard/pos', label: 'Staff POS', icon: Store },
        ...navItems.slice(5), // Remaining items
      ]
    : navItems;

  // Handle keyboard navigation for mobile menu
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900" onKeyDown={handleKeyDown}>
      {/* Skip link for keyboard users */}
      <SkipLink />

      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700">
            <Link to="/dashboard" className="text-xl font-bold text-primary-600 dark:text-primary-400">
              PaymentSystem
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close navigation menu"
            >
              <X className="w-5 h-5 dark:text-gray-400" aria-hidden="true" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto scrollbar-hide" aria-label="Main">
            {dynamicNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={clsx(
                    'flex items-center px-4 py-3 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    isActive
                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  )}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="w-5 h-5 mr-3" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <span className="text-primary-700 dark:text-primary-400 font-medium">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              aria-label="Sign out of your account"
            >
              <LogOut className="w-5 h-5 mr-3" aria-hidden="true" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" role="banner">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            {/* Left side - Menu button (mobile only) */}
            <div className="flex items-center">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open navigation menu"
                aria-expanded={sidebarOpen}
                aria-controls="sidebar-navigation"
              >
                <Menu className="w-6 h-6 dark:text-gray-400" aria-hidden="true" />
              </button>
            </div>

            {/* Right side - KYC Status, Theme, Notifications */}
            <div className="flex items-center space-x-4 ml-auto">
              <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                KYC Status:{' '}
                <span
                  className={clsx(
                    'font-medium',
                    user?.kycStatus === 'VERIFIED' && 'text-green-600',
                    user?.kycStatus === 'PENDING' && 'text-yellow-600',
                    user?.kycStatus === 'REJECTED' && 'text-red-600'
                  )}
                  aria-label={`KYC status: ${user?.kycStatus}`}
                >
                  {user?.kycStatus}
                </span>
              </span>
              <NFCIndicator />
              <ThemeToggle />
              <NotificationBell />
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 lg:p-8" role="main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
