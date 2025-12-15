"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  CreditCard,
  FileText,
  RefreshCw,
  Users,
  Settings,
  LogOut,
  Menu,
  Wallet,
  BarChart3,
  Code2,
  Building2,
  Calculator,
  Receipt,
  BookOpen,
  Plus,
  Zap,
  Fuel,
  Store,
  Gauge,
  Truck,
  ClipboardList,
  ChevronDown,
  X,
  Briefcase,
  PieChart,
  TrendingUp,
  Scale,
  Shield,
  Send,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WelcomeWizard } from "@/components/WelcomeWizard";
import { PaymentPrompt } from "@/components/PaymentPrompt";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsDropdown } from "@/components/notifications";
import { authService, type UserTier } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  tier?: string[];
  featureId?: string;
  children?: NavItem[];
}

interface Preferences {
  enableInvoicing: boolean;
  enableSubscriptions: boolean;
  enableCards: boolean;
  defaultCurrency: string;
  autoApproveExpenses: boolean;
  expenseApprovalLimit: string;
  selectedAddons: string[];
  cardStaffTier: string;
}

// Base navigation items
const baseNavigation: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    title: "Wallet",
    href: "/dashboard/wallet",
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    title: "Transactions",
    href: "/dashboard/transactions",
    icon: <BarChart3 className="h-5 w-5" />,
  },
];

// Fuel Station CRM navigation - children items for collapsible menu
const fuelChildNavigation: NavItem[] = [
  { title: "Overview", href: "/dashboard/fuel", icon: <LayoutDashboard className="h-4 w-4" /> },
  { title: "Stations", href: "/dashboard/fuel/stations", icon: <Store className="h-4 w-4" /> },
  { title: "Sales", href: "/dashboard/fuel/sales", icon: <Receipt className="h-4 w-4" /> },
  { title: "Shifts", href: "/dashboard/fuel/shifts", icon: <ClipboardList className="h-4 w-4" /> },
  { title: "Inventory", href: "/dashboard/fuel/inventory", icon: <Gauge className="h-4 w-4" /> },
  { title: "Fleet Accounts", href: "/dashboard/fuel/fleet", icon: <Truck className="h-4 w-4" /> },
  { title: "Fuel Cards", href: "/dashboard/fuel/cards", icon: <CreditCard className="h-4 w-4" /> },
];

// Fuel Station parent nav item with children
const fuelStationNav: NavItem = {
  title: "Fuel Station",
  href: "/dashboard/fuel",
  icon: <Fuel className="h-5 w-5" />,
  featureId: "fuel_station",
  children: fuelChildNavigation,
};

// HR navigation - children items for collapsible menu
const hrChildNavigation: NavItem[] = [
  { title: "Employees", href: "/dashboard/hr/employees", icon: <Users className="h-4 w-4" /> },
  { title: "Roles & Permissions", href: "/dashboard/hr/roles", icon: <Shield className="h-4 w-4" /> },
  { title: "Departments", href: "/dashboard/hr/departments", icon: <Building2 className="h-4 w-4" /> },
  { title: "Attendance", href: "/dashboard/hr/attendance", icon: <ClipboardList className="h-4 w-4" /> },
];

// HR parent nav item with children
const hrNav: NavItem = {
  title: "HR",
  href: "/dashboard/hr",
  icon: <Briefcase className="h-5 w-5" />,
  featureId: "hr_management",
  children: hrChildNavigation,
};

// Accounting navigation - children items for collapsible menu
const accountingChildNavigation: NavItem[] = [
  { title: "Overview", href: "/dashboard/accounting", icon: <PieChart className="h-4 w-4" /> },
  { title: "Chart of Accounts", href: "/dashboard/accounting/accounts", icon: <Scale className="h-4 w-4" /> },
  { title: "Journal Entries", href: "/dashboard/accounting/journal", icon: <BookOpen className="h-4 w-4" /> },
  { title: "Profit & Loss", href: "/dashboard/accounting/pnl", icon: <TrendingUp className="h-4 w-4" /> },
  { title: "Balance Sheet", href: "/dashboard/accounting/balance-sheet", icon: <FileText className="h-4 w-4" /> },
];

// Accounting parent nav item with children
const accountingNav: NavItem = {
  title: "Accounting",
  href: "/dashboard/accounting",
  icon: <Calculator className="h-5 w-5" />,
  featureId: "accounting",
  children: accountingChildNavigation,
};

// Feature-based navigation items
const featureNavigation: NavItem[] = [
  { title: "Invoices", href: "/dashboard/invoices", icon: <FileText className="h-5 w-5" />, featureId: "invoicing" },
  { title: "Subscriptions", href: "/dashboard/subscriptions", icon: <RefreshCw className="h-5 w-5" />, featureId: "subscriptions" },
  { title: "Batch Payments", href: "/dashboard/batch-payments", icon: <Send className="h-5 w-5" />, featureId: "batch_payments" },
  { title: "Expenses", href: "/dashboard/expenses", icon: <Receipt className="h-5 w-5" />, tier: ["business_plus"], featureId: "expense_management" },
  { title: "Cards", href: "/dashboard/cards", icon: <CreditCard className="h-5 w-5" />, featureId: "employee_cards" },
  { title: "API Keys", href: "/dashboard/api", icon: <Code2 className="h-5 w-5" />, tier: ["business", "business_plus", "developer"], featureId: "api_access" },
];

// Settings always shown
const settingsNav: NavItem = {
  title: "Settings",
  href: "/dashboard/settings",
  icon: <Settings className="h-5 w-5" />,
};

// Quick action items
interface QuickAction {
  id: string;
  title: string;
  href: string;
  icon: React.ReactNode;
  featureId?: string;
  tier?: string[];
}

const quickActions: QuickAction[] = [
  { id: "create_invoice", title: "Create Invoice", href: "/dashboard/invoices/new", icon: <Plus className="h-3 w-3" />, featureId: "invoicing", tier: ["business", "business_plus"] },
  { id: "batch_payment", title: "Batch Payment", href: "/dashboard/batch-payments/new", icon: <Send className="h-3 w-3" />, featureId: "batch_payments" },
  { id: "record_sale", title: "Record Fuel Sale", href: "/dashboard/fuel/sales/new", icon: <Fuel className="h-3 w-3" />, featureId: "fuel_station" },
  { id: "journal_entry", title: "Journal Entry", href: "/dashboard/accounting/journal/new", icon: <BookOpen className="h-3 w-3" />, featureId: "accounting" },
];

interface UserData {
  id: string;
  email: string;
  businessName?: string;
  tier: UserTier;
  plusSetupComplete?: boolean;
}

// Default included features by tier
const defaultIncludedFeatures: Record<string, string[]> = {
  basic: ["invoicing", "subscriptions", "hr_management", "accounting", "fuel_station", "batch_payments"],
  business: ["invoicing", "subscriptions", "api_access", "hr_management", "accounting", "fuel_station", "employee_cards", "batch_payments"],
  business_plus: ["invoicing", "subscriptions", "api_access", "hr_management", "expense_management", "accounting", "fuel_station", "batch_payments", "employee_cards"],
};

// Animation variants - optimized for speed
const sidebarVariants = {
  hidden: { x: -280, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 400, damping: 35 }
  },
  exit: {
    x: -280,
    opacity: 0,
    transition: { duration: 0.15 }
  }
};

const navItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.02, duration: 0.15 }
  })
};

const childMenuVariants = {
  hidden: { opacity: 0, height: 0 },
  visible: {
    opacity: 1,
    height: "auto" as const,
    transition: { duration: 0.15, ease: "easeOut" as const }
  },
  exit: {
    opacity: 0,
    height: 0,
    transition: { duration: 0.1 }
  }
};

const pageTransition = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.1 }
  }
};

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } }
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("basic");
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [monthlyFee, setMonthlyFee] = useState<number>(0);
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  // Initialize with basic navigation
  const [navigation, setNavigation] = useState<NavItem[]>(() => {
    const nav: NavItem[] = [...baseNavigation];
    const basicFeatures = defaultIncludedFeatures["basic"] || [];
    // Add collapsible sections
    if (basicFeatures.includes("fuel_station")) nav.push(fuelStationNav);
    if (basicFeatures.includes("hr_management")) nav.push(hrNav);
    if (basicFeatures.includes("accounting")) nav.push(accountingNav);
    // Add feature items
    featureNavigation.forEach(item => {
      if (item.featureId && basicFeatures.includes(item.featureId)) nav.push(item);
    });
    nav.push(settingsNav);
    return nav;
  });
  const [filteredQuickActions, setFilteredQuickActions] = useState<QuickAction[]>([]);

  const buildNavigation = useCallback((tier: UserTier, prefs: Preferences | null) => {
    const nav: NavItem[] = [...baseNavigation];
    const includedFeatures = defaultIncludedFeatures[tier] || [];
    const selectedAddons = prefs?.selectedAddons || [];
    const enabledFeatures = [...new Set([...includedFeatures, ...selectedAddons])];

    // Add collapsible sections
    if (enabledFeatures.includes("fuel_station")) nav.push(fuelStationNav);
    if (enabledFeatures.includes("hr_management")) nav.push(hrNav);
    if (enabledFeatures.includes("accounting")) nav.push(accountingNav);

    // Add feature items
    featureNavigation.forEach(item => {
      if (item.tier && !item.tier.includes(tier)) return;
      if (item.featureId && !enabledFeatures.includes(item.featureId)) return;
      nav.push(item);
    });
    nav.push(settingsNav);
    return nav;
  }, []);

  const buildQuickActions = useCallback((tier: UserTier, prefs: Preferences | null) => {
    const includedFeatures = defaultIncludedFeatures[tier] || [];
    const selectedAddons = prefs?.selectedAddons || [];
    const enabledFeatures = [...new Set([...includedFeatures, ...selectedAddons])];
    return quickActions.filter(action => {
      if (action.tier && !action.tier.includes(tier)) return false;
      if (action.featureId && !enabledFeatures.includes(action.featureId)) return false;
      return true;
    });
  }, []);

  useEffect(() => {
    checkAuthAndTier();
  }, []);

  useEffect(() => {
    if (pathname.startsWith("/dashboard/fuel")) {
      setExpandedMenus(prev => ({ ...prev, "Fuel Station": true }));
    }
    if (pathname.startsWith("/dashboard/hr")) {
      setExpandedMenus(prev => ({ ...prev, "HR": true }));
    }
    if (pathname.startsWith("/dashboard/accounting")) {
      setExpandedMenus(prev => ({ ...prev, "Accounting": true }));
    }
  }, [pathname]);

  useEffect(() => {
    if (!isLoading && !isPaid && userTier !== "basic") {
      const paymentStatus = localStorage.getItem("plusPaymentComplete");
      if (paymentStatus === "true") { setIsPaid(true); return; }
      const welcomeComplete = localStorage.getItem("plusWelcomeComplete");
      if (!welcomeComplete) setShowWelcomeWizard(true);
      const timer = setTimeout(() => {
        if (!localStorage.getItem("plusPaymentComplete")) setShowPaymentPrompt(true);
      }, 300000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isPaid, userTier]);

  const checkAuthAndTier = async () => {
    try {
      const token = authService.getAccessToken();
      const storedUser = localStorage.getItem("user");
      const plusTier = localStorage.getItem("plusTier");
      let setupComplete = localStorage.getItem("plusSetupComplete") === "true";
      const storedPreferences = localStorage.getItem("plusPreferences");
      const storedMonthlyFee = localStorage.getItem("plusMonthlyFee");
      const paymentComplete = localStorage.getItem("plusPaymentComplete");

      if (!token) { router.push("/auth/login?redirect=/dashboard"); return; }

      let prefs: Preferences | null = null;
      if (storedPreferences) { try { prefs = JSON.parse(storedPreferences); setPreferences(prefs); } catch {} }
      if (storedMonthlyFee) setMonthlyFee(parseFloat(storedMonthlyFee));
      if (paymentComplete === "true") setIsPaid(true);

      if (storedUser) {
        let user;
        try { user = JSON.parse(storedUser); } catch { user = null; }
        if (user) {
          setUserData(user);
          const effectiveTier = (plusTier || user.tier || "basic") as UserTier;
          setUserTier(effectiveTier);
          setNavigation(buildNavigation(effectiveTier, prefs));
          setFilteredQuickActions(buildQuickActions(effectiveTier, prefs));

          // Check database for setup completion if not in localStorage
          if ((effectiveTier === "business" || effectiveTier === "business_plus") && !setupComplete) {
            try {
              const { data: subscription } = await supabase
                .from("merchant_subscriptions")
                .select("id, status, tier")
                .eq("user_id", user.id)
                .single();

              if (subscription) {
                // User has a subscription, so setup was completed
                setupComplete = true;
                localStorage.setItem("plusSetupComplete", "true");
                localStorage.setItem("plusTier", subscription.tier || effectiveTier);
                localStorage.setItem("plusSubscriptionStatus", subscription.status || "active");
              }
            } catch (e) {
              // No subscription found - re-check localStorage as it may have just been set
              setupComplete = localStorage.getItem("plusSetupComplete") === "true";
              if (!setupComplete) {
                console.log("No subscription found in database");
              }
            }
          }

          // Only redirect to setup if setup is truly not complete
          // Re-check localStorage one more time to avoid race conditions
          if ((effectiveTier === "business" || effectiveTier === "business_plus") && !setupComplete) {
            const finalCheck = localStorage.getItem("plusSetupComplete") === "true";
            if (!finalCheck) {
              router.push(`/setup?tier=${effectiveTier}`);
              return;
            }
          }
        }
      } else {
        try {
          const { valid, user } = await authService.validateToken(token);
          if (valid && user) {
            localStorage.setItem("user", JSON.stringify({ id: user.id, email: user.email, businessName: user.businessName, firstName: user.firstName, lastName: user.lastName }));
            setUserData({ id: user.id, email: user.email, businessName: user.businessName, tier: user.tier || "basic" });
            const effectiveTier = user.tier || "basic";
            setUserTier(effectiveTier);
            setNavigation(buildNavigation(effectiveTier, prefs));
            setFilteredQuickActions(buildQuickActions(effectiveTier, prefs));
          } else { authService.logout(); router.push("/auth/login?redirect=/dashboard"); return; }
        } catch (error) {
          console.error("Auth validation error:", error);
          setUserTier("basic");
          setNavigation(buildNavigation("basic", prefs));
          setFilteredQuickActions(buildQuickActions("basic", prefs));
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      setNavigation(buildNavigation("basic", null));
      setFilteredQuickActions(buildQuickActions("basic", null));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => { authService.logout(); router.push("/auth/login"); };
  const handleWelcomeComplete = () => { localStorage.setItem("plusWelcomeComplete", "true"); setShowWelcomeWizard(false); };
  const handlePaymentComplete = () => { localStorage.setItem("plusPaymentComplete", "true"); setIsPaid(true); setShowPaymentPrompt(false); };
  const handlePaymentDecline = () => {
    // Clear Plus session before redirecting to main site
    authService.logout();
    window.location.href = "https://my.peeap.com/dashboard";
  };
  const toggleMenu = (title: string) => { setExpandedMenus(prev => ({ ...prev, [title]: !prev[title] })); };

  const businessName = userData?.businessName || "My Business";

  // Navigation Item Component - no animations
  const NavItem = ({ item, index }: { item: NavItem; index: number }) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedMenus[item.title] || false;
    const isActive = pathname === item.href;
    const isChildActive = hasChildren && item.children!.some(child => pathname === child.href || pathname.startsWith(child.href + "/"));

    if (hasChildren) {
      return (
        <div>
          <button
            onClick={() => toggleMenu(item.title)}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
              isChildActive
                ? "bg-primary/10 text-primary shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <span className={cn(
              "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
              isChildActive ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            )}>
              {item.icon}
            </span>
            <span className="flex-1 text-left">{item.title}</span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
          </button>
          {isExpanded && (
            <div className="ml-6 mt-2 space-y-1 border-l-2 border-border pl-4">
              {item.children!.map((child) => (
                <Link
                  key={child.href}
                  href={child.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    pathname === child.href
                      ? "bg-primary text-white shadow-md"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  {child.icon}
                  {child.title}
                </Link>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <Link
        href={item.href}
        onClick={() => setSidebarOpen(false)}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-white shadow-md"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span className={cn(
          "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
          isActive ? "bg-white/20" : "bg-muted text-muted-foreground"
        )}>
          {item.icon}
        </span>
        {item.title}
        {item.badge && (
          <Badge variant="secondary" className="ml-auto text-xs">
            {item.badge}
          </Badge>
        )}
      </Link>
    );
  };

  // Quick Actions Component - no animations
  const QuickActionsSection = () => (
    filteredQuickActions.length > 0 && (
      <div className="pt-4 mt-4 border-t border-border">
        <div className="flex items-center gap-2 px-4 mb-3">
          <Zap className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Actions
          </span>
        </div>
        <div className="space-y-1">
          {filteredQuickActions.map((action) => (
            <Link
              key={action.id}
              href={action.href}
              onClick={() => setSidebarOpen(false)}
              className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm transition-colors text-muted-foreground hover:bg-amber-50 hover:text-amber-700 dark:hover:bg-amber-950 dark:hover:text-amber-400 group"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:bg-amber-200 dark:group-hover:bg-amber-800 transition-colors">
                {action.icon}
              </div>
              {action.title}
            </Link>
          ))}
        </div>
      </div>
    )
  );

  // Sidebar Content - no animations
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-20 items-center gap-3 px-6 border-b border-border">
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
          <span className="text-white font-bold text-lg">P+</span>
        </div>
        <span className="font-bold text-xl text-foreground">PeeAP Plus</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-2 p-4 overflow-y-auto">
        {navigation.map((item, index) => (
          <NavItem key={item.href} item={item} index={index} />
        ))}
        <QuickActionsSection />
      </nav>

      {/* User Info */}
      <div className="border-t border-border p-4 space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
          <Avatar className="h-10 w-10 ring-2 ring-primary/20">
            <AvatarFallback className="bg-primary text-white font-semibold">
              {businessName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{businessName}</p>
            <p className="text-xs text-muted-foreground capitalize">{userTier.replace("_", " ")} Plan</p>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  );

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      {/* Welcome Wizard */}
      {showWelcomeWizard && (
        <WelcomeWizard tier={userTier} preferences={preferences} onComplete={handleWelcomeComplete} />
      )}

      {/* Payment Prompt */}
      {showPaymentPrompt && (
        <PaymentPrompt
          tier={userTier}
          monthlyFee={monthlyFee}
          businessName={userData?.businessName}
          userName={userData?.email?.split('@')[0]}
          onPay={handlePaymentComplete}
          onDecline={handlePaymentDecline}
        />
      )}

      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-72 bg-card shadow-xl lg:block">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              variants={overlayVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              variants={sidebarVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="fixed inset-y-0 left-0 z-50 w-72 bg-card shadow-2xl lg:hidden"
            >
              <button
                onClick={() => setSidebarOpen(false)}
                className="absolute top-5 right-4 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Header */}
      <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-md px-4 lg:hidden">
        <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)} className="rounded-xl">
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex-1" />
        <ThemeToggle />
        <NotificationsDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white text-xs">
                  {businessName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-semibold">{businessName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userTier.replace("_", " ")}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/business"><Building2 className="mr-2 h-4 w-4" />Business Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Desktop Header */}
      <header className="sticky top-0 z-30 hidden h-16 items-center gap-4 border-b bg-card/80 backdrop-blur-md px-6 lg:ml-72 lg:flex">
        <div className="flex-1" />
        <ThemeToggle />
        <NotificationsDropdown />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 rounded-xl">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-white text-xs">
                  {businessName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block font-medium">{businessName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-semibold">{businessName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userTier.replace("_", " ")}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/business"><Building2 className="mr-2 h-4 w-4" />Business Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main className="lg:ml-72">
        <motion.div
          key={pathname}
          variants={pageTransition}
          initial="hidden"
          animate="visible"
          className="p-6"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}
