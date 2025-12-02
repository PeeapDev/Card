import { ReactNode, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Wallet,
  ArrowLeftRight,
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
  PiggyBank,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

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
      { path: '/admin/agents', label: 'Agents', icon: Layers },
    ],
  },
  {
    title: 'Core',
    items: [
      { path: '/admin/accounts', label: 'Accounts', icon: Wallet },
      { path: '/admin/customers', label: 'Customers', icon: Users },
      { path: '/admin/pots', label: 'Savings Pots', icon: PiggyBank },
      { path: '/admin/cards', label: 'Cards', icon: CreditCard },
      { path: '/admin/card-programs', label: 'Card Programs', icon: Layers },
      { path: '/admin/card-types', label: 'Card Types', icon: ShoppingBag },
      { path: '/admin/card-orders', label: 'Card Orders', icon: ClipboardList, badge: 'New', badgeColor: 'primary' },
    ],
  },
  {
    title: 'Transactions',
    items: [
      { path: '/admin/authorization', label: 'Authorization', icon: ShieldCheck },
      { path: '/admin/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { path: '/admin/disputes', label: 'Disputes', icon: AlertTriangle },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { path: '/admin/fees', label: 'Fees & Pricing', icon: CreditCard },
      { path: '/admin/fee-settings', label: 'Fee Settings', icon: DollarSign },
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
    title: 'Settings',
    items: [
      { path: '/admin/roles', label: 'Role Management', icon: UserCog },
      { path: '/admin/settings', label: 'Settings', icon: Settings },
      { path: '/admin/compliance', label: 'Compliance', icon: FileCheck, badge: 'Pending', badgeColor: 'yellow' },
    ],
  },
];

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-100">
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
          <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {navSections.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                {section.title && (
                  <h3 className="px-4 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
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
              </div>
            ))}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex items-center mb-3">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">
                  {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-white">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-400">Administrator</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center w-full px-4 py-2 text-gray-300 rounded-lg hover:bg-gray-800 hover:text-white transition-colors text-sm"
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
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between h-full px-4 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search customers, cards, transactions..."
                  className="bg-transparent border-none outline-none text-sm w-80"
                />
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                Admin Portal
              </span>
              <button className="relative p-2 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5 text-gray-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
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
