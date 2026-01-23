import { ReactNode, useState, useEffect, useMemo, useRef } from 'react';
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
  Repeat,
  Calendar,
  FileText,
  MessageSquare,
  ChevronDown,
  Nfc,
  Grid3X3,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useDeveloperMode } from '@/context/DeveloperModeContext';
import { useApps } from '@/context/AppsContext';
import { useThemeColor } from '@/context/ThemeColorContext';
import { supabase } from '@/lib/supabase';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { notificationService } from '@/services/notification.service';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { RoleSwitcher } from '@/components/ui/RoleSwitcher';
import { NFCIndicator } from '@/components/nfc';
import { MobileFooterNav } from '@/components/ui/MobileFooterNav';
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
// Note: Settings is accessed via avatar dropdown, not sidebar
// Note: "My Businesses" and "Developer" are only visible when developer mode is enabled
const baseNavItems: NavItem[] = [
  { id: 'dashboard', path: '/merchant', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transactions', path: '/merchant/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { id: 'payouts', path: '/merchant/payouts', label: 'Payouts', icon: DollarSign },
  { id: 'refunds', path: '/merchant/refunds', label: 'Refunds', icon: RefreshCw },
  { id: 'reports', path: '/merchant/reports', label: 'Reports', icon: BarChart3 },
  { id: 'subscriptions', path: '/merchant/subscriptions', label: 'Subscriptions', icon: Repeat },
  { id: 'messages', path: '/messages', label: 'Messages', icon: MessageSquare },
];

// Developer mode only nav items
const developerNavItems: NavItem[] = [
  { id: 'businesses', path: '/merchant/businesses', label: 'My Businesses', icon: Building2 },
];

// App nav items (conditionally added based on enabled apps in Settings)
const appNavItems: Record<string, NavItem> = {
  terminal: { id: 'terminal', path: '/merchant/terminal', label: 'Payment Terminal', icon: Nfc },
  driver_wallet: { id: 'driver-wallet', path: '/merchant/driver-wallet', label: 'Driver Wallet', icon: Wallet },
  payment_links: { id: 'payment-links', path: '/merchant/payment-links', label: 'Payment Links', icon: Link2 },
  invoices: { id: 'invoices', path: '/merchant/invoices', label: 'Invoices', icon: FileText },
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
  unreadCount = 0,
}: {
  item: NavItem;
  isActive: boolean;
  isEditMode: boolean;
  unreadCount?: number;
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
  const showBadge = item.id === 'messages' && unreadCount > 0;

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
        <div className="relative">
          <Icon className="w-5 h-5 mr-3" />
          {showBadge && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-bold text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        {item.label}
        {showBadge && (
          <span className="ml-auto flex items-center justify-center min-w-[20px] h-[20px] px-1.5 text-xs font-medium text-white bg-indigo-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
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
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [activeBusiness, setActiveBusiness] = useState<{ id: string; name: string; logo_url?: string } | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { user, logout, activeRole, switchRole } = useAuth();
  const { isDeveloperMode, checkBusinesses, hasBusinesses, businessCount } = useDeveloperMode();

  // Sync activeRole to 'merchant' when on merchant dashboard
  useEffect(() => {
    if (activeRole !== 'merchant' && user?.roles?.includes('merchant')) {
      switchRole('merchant');
    }
  }, []);
  const { isAppEnabled, isAppPinned, pinnedApps } = useApps();
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

  // Fetch active business for logo display
  useEffect(() => {
    const fetchActiveBusiness = async () => {
      if (!user?.id) return;

      try {
        const { data } = await supabase
          .from('businesses')
          .select('id, name, logo_url')
          .eq('owner_id', user.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setActiveBusiness(data);
        }
      } catch (err) {
        console.error('Error fetching active business:', err);
      }
    };

    fetchActiveBusiness();
  }, [user?.id]);

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

  // Fetch unread chat message count
  useEffect(() => {
    const fetchUnreadChatCount = async () => {
      if (!user?.id) return;
      try {
        const count = await notificationService.getUnreadChatCount(user.id);
        setUnreadChatCount(count);
      } catch (error) {
        console.error('Error fetching unread chat count:', error);
      }
    };

    fetchUnreadChatCount();

    // Subscribe to notification changes for real-time updates
    const channel = supabase
      .channel(`merchant-chat-notifications:${user?.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user?.id}`,
        },
        () => {
          fetchUnreadChatCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
  const isTerminalEnabled = isAppEnabled('terminal');
  const isDriverWalletEnabled = isAppEnabled('driver_wallet');
  const isPaymentLinksEnabled = isAppEnabled('payment_links');
  const isInvoicesEnabled = isAppEnabled('invoices');
  const isPosEnabled = isAppEnabled('pos');
  const isFuelStationEnabled = isAppEnabled('fuel_station');
  const isTransportationEnabled = isAppEnabled('transportation');
  const isEventsEnabled = isAppEnabled('events');

  // Build the list of enabled apps for the Apps menu
  const enabledApps = useMemo(() => {
    const apps: NavItem[] = [];
    if (isTerminalEnabled) apps.push(appNavItems.terminal);
    if (isDriverWalletEnabled) apps.push(appNavItems.driver_wallet);
    if (isPaymentLinksEnabled) apps.push(appNavItems.payment_links);
    if (isInvoicesEnabled) apps.push(appNavItems.invoices);
    if (isPosEnabled) apps.push(appNavItems.pos);
    if (isFuelStationEnabled) apps.push(appNavItems.fuel_station);
    if (isTransportationEnabled) apps.push(appNavItems.transportation);
    if (isEventsEnabled) apps.push(appNavItems.events);
    return apps;
  }, [isTerminalEnabled, isDriverWalletEnabled, isPaymentLinksEnabled, isInvoicesEnabled, isPosEnabled, isFuelStationEnabled, isTransportationEnabled, isEventsEnabled]);

  // State for Apps menu popup
  const [appsMenuOpen, setAppsMenuOpen] = useState(false);
  const appsMenuRef = useRef<HTMLDivElement>(null);

  // Close apps menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (appsMenuRef.current && !appsMenuRef.current.contains(event.target as Node)) {
        setAppsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Build base navigation (without apps - apps are in separate menu)
  const availableNavItems = useMemo(() => {
    const items = [...baseNavItems];

    // Add developer-only items (My Businesses) when developer mode is enabled
    if (isDeveloperMode) {
      // Insert after Dashboard
      items.splice(1, 0, ...developerNavItems);
    }

    return items;
  }, [isDeveloperMode]);

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
                        unreadCount={unreadChatCount}
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

            {/* Pinned Apps - Show directly in sidebar */}
            {pinnedApps.length > 0 && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700/50">
                <p className="px-4 mb-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Pinned Apps
                </p>
                {pinnedApps.map((appId) => {
                  const app = appNavItems[appId];
                  if (!app) return null;
                  const AppIcon = app.icon;
                  const isActive = location.pathname === app.path ||
                    (app.path !== '/merchant' && location.pathname.startsWith(app.path));

                  return (
                    <Link
                      key={app.id}
                      to={app.path}
                      className={clsx(
                        'flex items-center px-4 py-3 rounded-lg transition-colors mb-1',
                        isActive
                          ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      <AppIcon className="w-5 h-5 mr-3" />
                      {app.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Apps Menu - Shows enabled apps as icon grid (like mobile phone) */}
            {enabledApps.length > 0 && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700/50" ref={appsMenuRef}>
                <div className="relative">
                  <button
                    onClick={() => setAppsMenuOpen(!appsMenuOpen)}
                    className={clsx(
                      'w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors',
                      appsMenuOpen
                        ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    )}
                  >
                    <div className="flex items-center">
                      <Grid3X3 className="w-5 h-5 mr-3" />
                      <span className="font-medium">Apps</span>
                      <span className="ml-2 px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 rounded-full">
                        {enabledApps.length}
                      </span>
                    </div>
                    <ChevronDown className={clsx(
                      'w-4 h-4 transition-transform',
                      appsMenuOpen && 'rotate-180'
                    )} />
                  </button>

                  {/* Apps Grid Popup - Like mobile phone app icons */}
                  {appsMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 p-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50">
                      <div className="grid grid-cols-3 gap-3">
                        {enabledApps.map((app) => {
                          const AppIcon = app.icon;
                          const isActive = location.pathname === app.path ||
                            (app.path !== '/merchant' && location.pathname.startsWith(app.path));

                          // Color mapping for app icons
                          const iconColors: Record<string, string> = {
                            terminal: 'from-indigo-500 to-purple-600',
                            'driver-wallet': 'from-teal-500 to-emerald-600',
                            'payment-links': 'from-cyan-500 to-blue-600',
                            invoices: 'from-slate-500 to-gray-600',
                            pos: 'from-green-500 to-emerald-600',
                            'fuel-station': 'from-orange-500 to-red-600',
                            transportation: 'from-blue-500 to-indigo-600',
                            events: 'from-purple-500 to-pink-600',
                          };

                          return (
                            <Link
                              key={app.id}
                              to={app.path}
                              onClick={() => setAppsMenuOpen(false)}
                              className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                            >
                              <div className={clsx(
                                'w-12 h-12 rounded-2xl flex items-center justify-center bg-gradient-to-br shadow-lg transition-transform group-hover:scale-110',
                                iconColors[app.id] || 'from-gray-500 to-gray-600',
                                isActive && 'ring-2 ring-green-500 ring-offset-2 dark:ring-offset-gray-800'
                              )}>
                                <AppIcon className="w-6 h-6 text-white" />
                              </div>
                              <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 text-center leading-tight max-w-[60px] truncate">
                                {app.label.replace(' ', '\n').split(' ')[0]}
                              </span>
                            </Link>
                          );
                        })}

                        {/* Add More Apps button */}
                        <Link
                          to="/merchant/settings?tab=apps"
                          onClick={() => setAppsMenuOpen(false)}
                          className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                        >
                          <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-gray-100 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 transition-transform group-hover:scale-110">
                            <Settings className="w-5 h-5 text-gray-400" />
                          </div>
                          <span className="text-[10px] font-medium text-gray-400 text-center">
                            More
                          </span>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

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
            {/* Left side - Menu button (mobile only) */}
            <div className="flex items-center">
              <button
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-6 h-6 dark:text-gray-400" />
              </button>
            </div>

            {/* Right side - All controls */}
            <div className="flex items-center gap-2 sm:gap-4 ml-auto">
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

              {/* Business/User Avatar Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                  aria-expanded={userMenuOpen}
                  aria-haspopup="true"
                >
                  {/* Show business logo if available, otherwise show store icon */}
                  {activeBusiness?.logo_url ? (
                    <img
                      src={activeBusiness.logo_url}
                      alt={activeBusiness.name}
                      className="w-9 h-9 rounded-full object-cover border-2 border-green-200 dark:border-green-600"
                    />
                  ) : (
                    <div className="w-9 h-9 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center border-2 border-green-200 dark:border-green-600">
                      <Store className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  )}
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
                    {/* User/Business Info */}
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700/50">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activeBusiness?.name || `${user?.firstName} ${user?.lastName}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user?.email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">
                        Merchant Account
                      </span>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      {isDeveloperMode && (
                        <Link
                          to="/merchant/businesses"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <Building2 className="w-4 h-4" />
                          My Businesses
                        </Link>
                      )}
                      <Link
                        to="/merchant/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </Link>
                      <Link
                        to="/merchant/support"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      >
                        <HelpCircle className="w-4 h-4" />
                        Help & Support
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
        <main className="p-4 lg:p-8 pb-20 md:pb-8">{children}</main>
      </div>

      {/* Mobile Footer Navigation */}
      <MobileFooterNav mode="merchant" />
    </div>
  );
}
