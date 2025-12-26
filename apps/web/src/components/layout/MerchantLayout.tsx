import { ReactNode, useState, useEffect, useMemo } from 'react';
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
  Wallet,
  CreditCard,
  Repeat,
  Calendar,
  Nfc,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDeveloperMode } from '@/context/DeveloperModeContext';
import { useApps } from '@/context/AppsContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import { supabase } from '@/lib/supabase';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { RoleSwitcher } from '@/components/ui/RoleSwitcher';
import { NFCIndicator } from '@/components/nfc';
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

// Base nav items (always available)
// Note: Business Profile is now inside Business Settings
const baseNavItems: NavItem[] = [
  { id: 'dashboard', path: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'businesses', path: '/merchant/businesses', label: 'My Businesses', icon: Building2 },
  { id: 'transactions', path: '/merchant/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'payouts', path: '/merchant/payouts', label: 'Payouts', icon: DollarSign },
  { id: 'refunds', path: '/merchant/refunds', label: 'Refunds', icon: RefreshCw },
  { id: 'reports', path: '/merchant/reports', label: 'Reports', icon: BarChart3 },
  { id: 'payment-links', path: '/merchant/payment-links', label: 'Payment Links', icon: Link2 },
  { id: 'subscriptions', path: '/merchant/subscriptions', label: 'Subscription Plans', icon: Repeat },
  { id: 'subscription', path: '/merchant/subscription', label: 'My Plan', icon: CreditCard },
  { id: 'settings', path: '/merchant/settings', label: 'Settings', icon: Settings },
];

// App nav items (conditionally added based on enabled apps)
const appNavItems: Record<string, NavItem> = {
  pos: { id: 'pos', path: '/merchant/apps/pos', label: 'Point of Sale', icon: ShoppingCart },
  fuel_station: { id: 'fuel-station', path: '/merchant/apps/fuel-station', label: 'Fuel Station', icon: Car },
  transportation: { id: 'transportation', path: '/merchant/apps/transportation', label: 'Transportation', icon: Car },
  events: { id: 'events', path: '/merchant/apps/events', label: 'Events', icon: Calendar },
};

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
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasSubscription, setHasSubscription] = useState(false);
  const { user, logout } = useAuth();
  const { isDeveloperMode, checkBusinesses, hasBusinesses, businessCount } = useDeveloperMode();
  const { isAppEnabled } = useApps();
  const { getGlassColors } = useThemeColor();

  // Get themed glass colors for merchant dashboard
  const glassColors = getGlassColors('merchant');

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

  // Check if user has an active Plus subscription
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('merchant_subscriptions')
          .select('id, status, tier')
          .eq('user_id', user.id)
          .in('status', ['active', 'trialing'])
          .maybeSingle();

        setHasSubscription(!!data);
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    };

    checkSubscription();
  }, [user?.id]);

  // Nav items with persisted order (start with base items, apps will be added via useEffect)
  const [navItems, setNavItems] = useState<NavItem[]>(() => {
    const savedOrder = loadNavOrder();
    if (savedOrder) {
      const orderedItems: NavItem[] = [];
      // Include all possible items for initial load
      const allItems = [...baseNavItems, ...Object.values(appNavItems)];
      const itemMap = new Map(allItems.map((item) => [item.id, item]));
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
    return baseNavItems;
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
  const isEventsEnabled = isAppEnabled('events');

  // Build the complete list of available nav items (base + enabled apps)
  const availableNavItems = useMemo(() => {
    const items = [...baseNavItems];
    if (isPosEnabled) items.push(appNavItems.pos);
    if (isFuelStationEnabled) items.push(appNavItems.fuel_station);
    if (isTransportationEnabled) items.push(appNavItems.transportation);
    if (isEventsEnabled) items.push(appNavItems.events);
    return items;
  }, [isPosEnabled, isFuelStationEnabled, isTransportationEnabled, isEventsEnabled]);

  // Update nav items when available items change (e.g., app enabled/disabled)
  useEffect(() => {
    setNavItems((currentItems) => {
      const savedOrder = loadNavOrder();
      const currentIds = new Set(currentItems.map(i => i.id));
      const availableIds = new Set(availableNavItems.map(i => i.id));

      // Check if we need to add new items or remove disabled ones
      const hasNewItems = availableNavItems.some(i => !currentIds.has(i.id));
      const hasRemovedItems = currentItems.some(i => !availableIds.has(i.id));

      if (!hasNewItems && !hasRemovedItems) return currentItems;

      // Build new ordered list
      const itemMap = new Map(availableNavItems.map(item => [item.id, item]));
      const orderedItems: NavItem[] = [];

      // First, add items in saved order (if they're still available)
      if (savedOrder) {
        for (const id of savedOrder) {
          const item = itemMap.get(id);
          if (item) {
            orderedItems.push(item);
            itemMap.delete(id);
          }
        }
      } else {
        // Use current order for existing items
        for (const item of currentItems) {
          if (itemMap.has(item.id)) {
            orderedItems.push(itemMap.get(item.id)!);
            itemMap.delete(item.id);
          }
        }
      }

      // Add any new items at the end
      for (const item of itemMap.values()) {
        orderedItems.push(item);
      }

      return orderedItems;
    });
  }, [availableNavItems]);

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
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 dark:border-gray-700/50">
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
                items={navItems.filter(i => availableNavItems.some(a => a.id === i.id)).map((i) => i.id)}
                strategy={verticalListSortingStrategy}
              >
                {navItems
                  .filter(item => availableNavItems.some(a => a.id === item.id))
                  .map((item) => {
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

            {/* Developer Mode Link */}
            {isDeveloperMode && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700/50">
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
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700/50">
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
          <div className="p-4 border-t border-gray-200 dark:border-gray-700/50">
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
        >
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
              {/* Merchant+ Upgrade Button - only show if no subscription */}
              {!hasSubscription && (
                <Link
                  to="/merchant/upgrade"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-medium hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Upgrade to</span> Merchant+
                </Link>
              )}
              {isDeveloperMode && (
                <Link
                  to="/merchant/developer"
                  className="hidden sm:inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                >
                  <Code2 className="w-3 h-3" />
                  Developer
                </Link>
              )}
              <NFCIndicator />
              <RoleSwitcher compact />
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
