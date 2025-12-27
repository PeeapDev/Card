import { ReactNode, useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  ArrowLeftRight,
  ArrowDownRight,
  Shield,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Code2,
  Webhook,
  AlertTriangle,
  FileCheck,
  Layers,
  ShieldCheck,
  UserCog,
  DollarSign,
  ShoppingBag,
  ClipboardList,
  Package,
  ChevronDown,
  ChevronRight,
  Briefcase,
  Store,
  PackagePlus,
  Puzzle,
  Mail,
  Wifi,
  BellRing,
  Car,
  Fuel,
  BarChart3,
  ExternalLink,
  Globe,
  FileText,
  Bot,
  User,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { AdminNotificationBell } from '@/components/ui/AdminNotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { NFCIndicator } from '@/components/nfc';
import { ProfileAvatar } from '@/components/ui/ProfileAvatar';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
}

const navSections: NavSection[] = [
  {
    items: [
      { path: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'User Management',
    items: [
      { path: '/admin/users', label: 'Users', icon: Users },
      { path: '/admin/merchants', label: 'Merchants', icon: Wallet },
      { path: '/admin/businesses', label: 'Businesses', icon: Store, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/agents', label: 'Agents', icon: Layers },
    ],
  },
  {
    title: 'Core',
    items: [
      { path: '/admin/accounts', label: 'Accounts', icon: Wallet },
      { path: '/admin/customers', label: 'Customers', icon: Users },
      { path: '/admin/pots', label: 'Cash Boxes', icon: Package },
      { path: '/admin/cards', label: 'Cards', icon: CreditCard },
      { path: '/admin/card-products', label: 'Card Products', icon: PackagePlus, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/card-programs', label: 'Card Programs', icon: Layers },
      { path: '/admin/card-types', label: 'Card Types', icon: ShoppingBag },
      { path: '/admin/card-orders', label: 'Card Orders', icon: ClipboardList, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/virtual-cards', label: 'Virtual Cards', icon: CreditCard, badge: 'New', badgeColor: 'success' },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { path: '/admin/authorization', label: 'Authorization', icon: ShieldCheck },
      { path: '/admin/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { path: '/admin/deposits', label: 'Deposits', icon: ArrowDownRight, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/nfc-payment', label: 'NFC Payment', icon: Wifi, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { path: '/admin/business-categories', label: 'Business Categories', icon: Briefcase, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/fee-settings', label: 'Fees & Pricing', icon: DollarSign },
      { path: '/admin/subscriptions', label: 'Subscriptions', icon: Wallet },
    ],
  },
  {
    title: 'Developer',
    items: [
      { path: '/admin/developers', label: 'SDK Management', icon: Code2 },
      { path: '/admin/webhooks', label: 'Webhooks', icon: Webhook },
    ],
  },
  {
    title: 'Content',
    items: [
      { path: '/admin/pages', label: 'Pages', icon: FileText, badge: 'New', badgeColor: 'primary' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { path: '/admin/site-settings', label: 'Site Settings', icon: Globe, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/ai-settings', label: 'AI Settings', icon: Bot, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/modules', label: 'Modules', icon: Puzzle },
      { path: '/admin/roles', label: 'Role Management', icon: UserCog },
      { path: '/admin/payment-settings', label: 'Payment Settings', icon: Settings },
      { path: '/admin/smtp-settings', label: 'SMTP / Email', icon: Mail },
      { path: '/admin/push-notifications', label: 'Push Notifications', icon: BellRing },
      { path: '/admin/compliance', label: 'Compliance', icon: FileCheck, badge: 'Pending', badgeColor: 'yellow' },
    ],
  },
  {
    title: 'Transport',
    items: [
      { path: '/admin/drivers', label: 'Drivers', icon: Car, badge: 'New', badgeColor: 'primary' },
      { path: '/admin/fuel-stations', label: 'Fuel Stations', icon: Fuel, badge: 'New', badgeColor: 'primary' },
    ],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Track which sections are expanded (by section title) - all collapsed by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

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

  const toggleSection = (title: string) => {
    // Accordion behavior: close all others, open the clicked one
    setExpandedSections(prev => ({
      [title]: !prev[title]
    }));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
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
          'fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 transform transition-transform duration-300 ease-in-out lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 bg-gray-800">
            <Link to="/admin" className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary-400" />
              <span className="text-xl font-bold text-white">CardPay</span>
            </Link>
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-gray-700 text-gray-400"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {navSections.map((section, sectionIndex) => {
              const hasActiveItem = section.items.some(item =>
                location.pathname === item.path ||
                (item.path !== '/admin' && location.pathname.startsWith(item.path))
              );
              // If section has active item, always keep it expanded
              const isExpanded = hasActiveItem || (section.title ? expandedSections[section.title] === true : true);

              return (
                <div key={sectionIndex} className="mb-1">
                  {section.title ? (
                    <>
                      {/* Collapsible Section Header */}
                      <button
                        onClick={() => !hasActiveItem && toggleSection(section.title!)}
                        className={clsx(
                          'w-full flex items-center justify-between px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-colors',
                          hasActiveItem
                            ? 'text-primary-400 bg-gray-800 cursor-default'
                            : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800 cursor-pointer'
                        )}
                      >
                        <span>{section.title}</span>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {/* Collapsible Content */}
                      <div
                        className={clsx(
                          'overflow-hidden transition-all duration-200 ease-in-out',
                          isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                        )}
                      >
                        <div className="space-y-1 mt-1 ml-2">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.path ||
                              (item.path !== '/admin' && location.pathname.startsWith(item.path));

                            return (
                              <Link
                                key={item.path}
                                to={item.path}
                                className={clsx(
                                  'flex items-center px-4 py-2 rounded-lg transition-colors text-sm',
                                  isActive
                                    ? 'bg-primary-600 text-white'
                                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                )}
                              >
                                <Icon className="w-4 h-4 mr-3" />
                                <span className="flex-1">{item.label}</span>
                                {item.badge && (
                                  <span className={clsx(
                                    'px-2 py-0.5 text-xs rounded-full',
                                    item.badgeColor === 'yellow' && 'bg-yellow-100 text-yellow-700',
                                    item.badgeColor === 'primary' && 'bg-primary-100 text-primary-700',
                                    !item.badgeColor && 'bg-gray-100 text-gray-700'
                                  )}>
                                    {item.badge}
                                  </span>
                                )}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Non-collapsible items (like Dashboard) */
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path ||
                          (item.path !== '/admin' && location.pathname.startsWith(item.path));

                        return (
                          <Link
                            key={item.path}
                            to={item.path}
                            className={clsx(
                              'flex items-center px-4 py-2.5 rounded-lg transition-colors text-sm',
                              isActive
                                ? 'bg-primary-600 text-white'
                                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                            )}
                          >
                            <Icon className="w-5 h-5 mr-3" />
                            <span className="flex-1">{item.label}</span>
                            {item.badge && (
                              <span className={clsx(
                                'px-2 py-0.5 text-xs rounded-full',
                                item.badgeColor === 'yellow' && 'bg-yellow-100 text-yellow-700',
                                item.badgeColor === 'primary' && 'bg-primary-100 text-primary-700',
                                !item.badgeColor && 'bg-gray-100 text-gray-700'
                              )}>
                                {item.badge}
                              </span>
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6 dark:text-gray-400" />
              </button>
              <div className="hidden md:flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers, cards, transactions..."
                  className="bg-transparent border-none outline-none text-sm w-80 dark:text-white dark:placeholder-gray-400"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                Admin Portal
              </span>
              <a
                href="https://vercel.com/peeapdev/my-peeap-com/analytics"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-xs font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-sm"
              >
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Full Analytics</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <NFCIndicator />
              <ThemeToggle />
              <AdminNotificationBell />

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
                    className="w-9 h-9 border-2 border-primary-200 dark:border-primary-600"
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
                  <div className="absolute right-0 mt-2 w-56 rounded-xl shadow-lg border bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 py-2 z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.firstName} {user?.lastName}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded">
                        Administrator
                      </span>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        to="/admin/site-settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                    </div>

                    {/* Logout */}
                    <div className="border-t border-gray-100 dark:border-gray-700 pt-1">
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
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
