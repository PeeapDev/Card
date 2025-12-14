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
  Store,
  DollarSign,
  RefreshCw,
  BarChart3,
  HelpCircle,
  Code2,
  ExternalLink,
  Link2,
  Building2,
  Crown,
  Car,
  ShoppingCart,
  GripVertical,
  LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDeveloperMode } from '@/context/DeveloperModeContext';
import { useApps } from '@/context/AppsContext';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface MerchantLayoutProps {
  children: ReactNode;
}

interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
}

const defaultNavItems: NavItem[] = [
  { id: 'dashboard', path: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'collect-payment', path: '/merchant/collect-payment', label: 'Collect Payment', icon: Car },
  { id: 'shops', path: '/merchant/shops', label: 'My Shops', icon: Building2 },
  { id: 'transactions', path: '/merchant/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'payouts', path: '/merchant/payouts', label: 'Payouts', icon: DollarSign },
  { id: 'refunds', path: '/merchant/refunds', label: 'Refunds', icon: RefreshCw },
  { id: 'reports', path: '/merchant/reports', label: 'Reports', icon: BarChart3 },
  { id: 'payment-links', path: '/merchant/payment-links', label: 'Payment Links', icon: Link2 },
  { id: 'profile', path: '/merchant/profile', label: 'Business Profile', icon: Store },
  { id: 'settings', path: '/merchant/settings', label: 'Settings', icon: Settings },
];

// Sortable nav item component
function SortableNavItem({
  item,
  isActive,
  isEditMode,
}: {
  item: NavItem;
  isActive: boolean;
  isEditMode: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = item.icon;

  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <Link
        to={item.path}
        className={clsx(
          'flex items-center px-4 py-3 rounded-lg transition-colors',
          isActive
            ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700',
          isDragging && 'ring-2 ring-green-500 shadow-lg'
        )}
      >
        {isEditMode && (
          <button
            {...attributes}
            {...listeners}
            className="mr-2 p-1 cursor-grab active:cursor-grabbing hover:bg-gray-200 dark:hover:bg-gray-600 rounded touch-none"
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
        )}
        <Icon className="w-5 h-5 mr-3" />
        {item.label}
      </Link>
    </div>
  );
}

// Helper to load/save nav order from localStorage
const NAV_ORDER_KEY = 'merchant_nav_order';

function loadNavOrder(): string[] | null {
  try {
    const stored = localStorage.getItem(NAV_ORDER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function saveNavOrder(order: string[]) {
  try {
    localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order));
  } catch (e) {
    console.error('Failed to save nav order:', e);
  }
}

export function MerchantLayout({ children }: MerchantLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { isDeveloperMode, checkBusinesses, hasBusinesses, businessCount } = useDeveloperMode();
  const { isAppEnabled } = useApps();

  // Nav items with persisted order
  const [navItems, setNavItems] = useState<NavItem[]>(() => {
    const savedOrder = loadNavOrder();
    if (savedOrder) {
      const orderedItems: NavItem[] = [];
      const itemMap = new Map(defaultNavItems.map((item) => [item.id, item]));
      for (const id of savedOrder) {
        const item = itemMap.get(id);
        if (item) {
          orderedItems.push(item);
          itemMap.delete(id);
        }
      }
      // Add any new items not in saved order
      for (const item of itemMap.values()) {
        orderedItems.push(item);
      }
      return orderedItems;
    }
    return defaultNavItems;
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      setNavItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        saveNavOrder(newItems.map((i) => i.id));
        return newItems;
      });
    }
  };

  const activeItem = navItems.find((item) => item.id === activeId);

  // Check if any app is enabled to show in sidebar
  const isPosEnabled = isAppEnabled('pos');
  const isFuelStationEnabled = isAppEnabled('fuel_station');
  const isTransportationEnabled = isAppEnabled('transportation');

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
            {/* Edit mode toggle */}
            <button
              onClick={() => setIsEditMode(!isEditMode)}
              className={clsx(
                'w-full flex items-center justify-center gap-2 px-3 py-2 mb-3 rounded-lg text-xs font-medium transition-colors',
                isEditMode
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              )}
            >
              <GripVertical className="w-3.5 h-3.5" />
              {isEditMode ? 'Done Reordering' : 'Reorder Menu'}
            </button>

            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={navItems.map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {navItems.map((item) => {
                  const isActive = location.pathname === item.path ||
                    (item.path !== '/merchant' && location.pathname.startsWith(item.path));

                  return (
                    <SortableNavItem
                      key={item.id}
                      item={item}
                      isActive={isActive}
                      isEditMode={isEditMode}
                    />
                  );
                })}
              </SortableContext>

              <DragOverlay>
                {activeItem && (
                  <div className="bg-white dark:bg-gray-800 shadow-xl rounded-lg p-3 flex items-center gap-3 opacity-90">
                    <activeItem.icon className="w-5 h-5 text-green-600" />
                    <span className="font-medium">{activeItem.label}</span>
                  </div>
                )}
              </DragOverlay>
            </DndContext>

            {/* POS App - Shows as standalone item when enabled */}
            {isPosEnabled && (
              <Link
                to="/merchant/apps/pos"
                className={clsx(
                  'flex items-center px-4 py-3 rounded-lg transition-colors',
                  location.pathname.includes('/pos') || location.pathname === '/merchant/apps/pos'
                    ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <ShoppingCart className="w-5 h-5 mr-3" />
                Point of Sale
              </Link>
            )}

            {/* Fuel Station App - Shows as standalone item when enabled */}
            {isFuelStationEnabled && (
              <Link
                to="/merchant/apps/fuel-station"
                className={clsx(
                  'flex items-center px-4 py-3 rounded-lg transition-colors',
                  location.pathname.includes('/fuel-station')
                    ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <Car className="w-5 h-5 mr-3" />
                Fuel Station
              </Link>
            )}

            {/* Transportation App - Shows as standalone item when enabled */}
            {isTransportationEnabled && (
              <Link
                to="/merchant/apps/transportation"
                className={clsx(
                  'flex items-center px-4 py-3 rounded-lg transition-colors',
                  location.pathname.includes('/transportation')
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <Car className="w-5 h-5 mr-3" />
                Transportation
              </Link>
            )}

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
