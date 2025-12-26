import { ReactNode, useState, useEffect, useCallback, useRef } from 'react';
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
  Package,
  HelpCircle,
  Smartphone,
  Store,
  ShoppingBag,
  Calendar,
  Ticket,
  Settings,
  ChevronDown,
  ShieldAlert,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useUserApps } from '@/context/UserAppsContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { RoleSwitcher } from '@/components/ui/RoleSwitcher';
import { NFCIndicator } from '@/components/nfc';
import { supabase } from '@/lib/supabase';
import { SkipLink } from '@/components/ui/SkipLink';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';
import { VerificationModal } from '@/components/kyc/VerificationModal';
import { useVerification } from '@/hooks/useVerification';

interface MainLayoutProps {
  children: ReactNode;
}

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/wallets', label: 'Wallets', icon: Wallet },
  { path: '/send', label: 'Send Money', icon: Send },
  { path: '/receive', label: 'Receive Money', icon: QrCode },
  { path: '/payout', label: 'Mobile Money Payout', icon: Smartphone },
  { path: '/marketplace', label: 'Shop', icon: ShoppingBag },
  // Cash Box is added dynamically based on user settings
  { path: '/cards', label: 'Cards', icon: CreditCard },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/support', label: 'Help & Support', icon: HelpCircle },
];

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hasStaffPositions, setHasStaffPositions] = useState(false);
  const [hasEventStaffPositions, setHasEventStaffPositions] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const { isAppEnabled } = useUserApps();
  const { getGlassColors } = useThemeColor();
  const location = useLocation();
  const navigate = useNavigate();

  // Get themed glass colors for user dashboard
  const glassColors = getGlassColors('user');

  // Track dark mode changes
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    // Observer for class changes on html element
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Verification status and modal controls
  const {
    isVerified,
    verificationPercentage,
    showVerificationModal,
    modalReason,
    blockedAction,
    closeVerificationModal,
  } = useVerification();

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check if user has any active staff positions (POS and Events)
  useEffect(() => {
    const checkStaffPositions = async () => {
      if (!user?.id) return;
      try {
        // Check POS staff positions
        const { data: posData, error: posError } = await supabase
          .from('pos_staff')
          .select('id')
          .eq('user_id', user.id)
          .eq('invitation_status', 'accepted')
          .eq('is_active', true)
          .limit(1);

        if (!posError && posData && posData.length > 0) {
          setHasStaffPositions(true);
        }

        // Check Event staff positions
        const { data: eventData, error: eventError } = await supabase
          .from('event_staff')
          .select('id')
          .eq('user_id', user.id)
          .eq('invitation_status', 'accepted')
          .limit(1);

        if (!eventError && eventData && eventData.length > 0) {
          setHasEventStaffPositions(true);
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

  // Build nav items dynamically - add POS, Events, and Cash Box based on user settings
  const dynamicNavItems = (() => {
    let items = [...navItems];
    const insertIndex = 6; // After Shop (index 5 in base array)
    let addedCount = 0;

    // Add Staff POS if user has staff positions
    if (hasStaffPositions) {
      items.splice(insertIndex + addedCount, 0, { path: '/dashboard/pos', label: 'Staff POS', icon: Store });
      addedCount++;
    }

    // Add Events if enabled in user apps
    if (isAppEnabled('events')) {
      items.splice(insertIndex + addedCount, 0, { path: '/events', label: 'Events', icon: Calendar });
      addedCount++;
      items.splice(insertIndex + addedCount, 0, { path: '/my-tickets', label: 'My Tickets', icon: Ticket });
      addedCount++;
    }

    // Add Cash Box if enabled in user apps (setup completed)
    if (isAppEnabled('cashbox')) {
      items.splice(insertIndex + addedCount, 0, { path: '/pots', label: 'Cash Box', icon: Package });
      addedCount++;
    }

    return items;
  })();

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
          'fixed inset-y-0 left-0 z-50 w-64 border-r transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          !isDarkMode && 'bg-white border-gray-200'
        )}
        style={isDarkMode ? {
          backgroundColor: glassColors.bg,
          borderColor: glassColors.border,
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
        } : undefined}
        aria-label="Main navigation"
        role="navigation"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700/50">
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
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header
          className={clsx(
            'sticky top-0 z-30 h-16 border-b',
            !isDarkMode && 'bg-white border-gray-200'
          )}
          style={isDarkMode ? {
            backgroundColor: glassColors.bg,
            borderColor: glassColors.border,
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
          } : undefined}
          role="banner"
        >
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

            {/* Right side - KYC Status, Theme, Notifications, User Menu */}
            <div className="flex items-center space-x-4 ml-auto">
              {/* Verification Warning Badge */}
              {!isVerified && (
                <button
                  onClick={() => navigate('/verify')}
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white text-sm font-medium rounded-full hover:from-red-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md animate-pulse"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Verify Now</span>
                  {verificationPercentage > 0 && (
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                      {verificationPercentage}%
                    </span>
                  )}
                </button>
              )}
              {isVerified && (
                <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
                  <span className="flex items-center gap-1 text-green-600">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Verified
                  </span>
                </span>
              )}
              <NFCIndicator />
              <RoleSwitcher compact />
              <ThemeToggle />
              <NotificationBell />

              {/* User Avatar Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  <ProfileAvatar
                    firstName={user?.firstName}
                    lastName={user?.lastName}
                    profilePicture={user?.profilePicture}
                    size="sm"
                    className="w-9 h-9 border-2 border-gray-200 dark:border-gray-600"
                  />
                  <ChevronDown
                    className={clsx(
                      'w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform hidden sm:block',
                      userMenuOpen && 'rotate-180'
                    )}
                  />
                </button>

                {/* Dropdown Menu */}
                {userMenuOpen && (
                  <div
                    className={clsx(
                      'absolute right-0 mt-2 w-56 rounded-xl shadow-lg border py-2 z-50',
                      !isDarkMode && 'bg-white border-gray-200'
                    )}
                    style={isDarkMode ? {
                      backgroundColor: glassColors.bg,
                      borderColor: glassColors.border,
                      backdropFilter: 'blur(24px)',
                      WebkitBackdropFilter: 'blur(24px)',
                    } : undefined}
                  >
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <User className="w-4 h-4" />
                        Profile
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 dark:border-gray-700/50 pt-1">
                      <button
                        onClick={() => {
                          setUserMenuOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main id="main-content" className="p-4 lg:p-8" role="main" tabIndex={-1}>
          {children}
        </main>
      </div>

      {/* Verification Modal - appears from any page */}
      <VerificationModal
        isOpen={showVerificationModal}
        onClose={closeVerificationModal}
        canClose={true}
        reason={modalReason}
        blockedAction={blockedAction}
      />

      {/* Mobile Verification Banner - Fixed at bottom for unverified users */}
      {!isVerified && (
        <div className="fixed bottom-0 left-0 right-0 lg:left-64 bg-gradient-to-r from-red-600 to-red-500 text-white px-4 py-3 sm:hidden z-40 safe-area-bottom">
          <button
            onClick={() => navigate('/verify')}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" />
              <div>
                <p className="font-medium text-sm">Account Not Verified</p>
                <p className="text-xs text-red-100">Tap to unlock all features</p>
              </div>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
