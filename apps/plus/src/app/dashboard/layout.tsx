"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
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
  Bell,
  Building2,
  Loader2,
  DollarSign,
  Calculator,
  Globe,
  Receipt,
  BookOpen,
  Plus,
  UserPlus,
  Link2,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";
import { WelcomeWizard } from "@/components/WelcomeWizard";
import { PaymentPrompt } from "@/components/PaymentPrompt";
import { authService, type User, type UserTier } from "@/lib/auth";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  tier?: string[];
  featureId?: string; // Links to feature addon
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
    icon: <LayoutDashboard className="h-4 w-4" />,
  },
  {
    title: "Wallet",
    href: "/dashboard/wallet",
    icon: <Wallet className="h-4 w-4" />,
  },
  {
    title: "Transactions",
    href: "/dashboard/transactions",
    icon: <BarChart3 className="h-4 w-4" />,
  },
];

// Feature-based navigation items
const featureNavigation: NavItem[] = [
  {
    title: "Invoices",
    href: "/dashboard/invoices",
    icon: <FileText className="h-4 w-4" />,
    tier: ["business", "business_plus"],
    featureId: "invoicing",
  },
  {
    title: "Subscriptions",
    href: "/dashboard/subscriptions",
    icon: <RefreshCw className="h-4 w-4" />,
    tier: ["business", "business_plus"],
    featureId: "subscriptions",
  },
  {
    title: "Batch Payments",
    href: "/dashboard/batch-payments",
    icon: <DollarSign className="h-4 w-4" />,
    featureId: "batch_payments",
  },
  {
    title: "Payroll",
    href: "/dashboard/payroll",
    icon: <Calculator className="h-4 w-4" />,
    featureId: "payroll",
  },
  {
    title: "Expenses",
    href: "/dashboard/expenses",
    icon: <Receipt className="h-4 w-4" />,
    tier: ["business_plus"],
    featureId: "expense_management",
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: <BookOpen className="h-4 w-4" />,
    featureId: "accounting_reports",
  },
  {
    title: "Multi-Currency",
    href: "/dashboard/currencies",
    icon: <Globe className="h-4 w-4" />,
    featureId: "multi_currency",
  },
  {
    title: "Cards",
    href: "/dashboard/cards",
    icon: <CreditCard className="h-4 w-4" />,
    badge: "Business++",
    tier: ["business_plus"],
  },
  {
    title: "Team",
    href: "/dashboard/employees",
    icon: <Users className="h-4 w-4" />,
    featureId: "contact_directory",
  },
  {
    title: "API Keys",
    href: "/dashboard/api",
    icon: <Code2 className="h-4 w-4" />,
    tier: ["business", "business_plus", "developer"],
    featureId: "api_access",
  },
];

// Settings always shown
const settingsNav: NavItem = {
  title: "Settings",
  href: "/dashboard/settings",
  icon: <Settings className="h-4 w-4" />,
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
  {
    id: "create_invoice",
    title: "Create Invoice",
    href: "/dashboard/invoices/new",
    icon: <Plus className="h-3 w-3" />,
    featureId: "invoicing",
    tier: ["business", "business_plus"],
  },
  {
    id: "new_subscription",
    title: "New Subscription",
    href: "/dashboard/subscriptions/new",
    icon: <Plus className="h-3 w-3" />,
    featureId: "subscriptions",
    tier: ["business", "business_plus"],
  },
  {
    id: "issue_card",
    title: "Issue Employee Card",
    href: "/dashboard/cards/new",
    icon: <CreditCard className="h-3 w-3" />,
    tier: ["business_plus"],
  },
  {
    id: "add_employee",
    title: "Add Employee",
    href: "/dashboard/employees/new",
    icon: <UserPlus className="h-3 w-3" />,
    featureId: "contact_directory",
  },
  {
    id: "checkout_link",
    title: "Create Checkout Link",
    href: "/dashboard/checkout/new",
    icon: <Link2 className="h-3 w-3" />,
    tier: ["business", "business_plus"],
  },
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
  business: ["invoicing", "subscriptions", "api_access", "contact_directory"],
  business_plus: ["invoicing", "subscriptions", "api_access", "contact_directory", "expense_management"],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpgradeOverlay, setShowUpgradeOverlay] = useState(false);
  const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);
  const [showPaymentPrompt, setShowPaymentPrompt] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("basic");
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [monthlyFee, setMonthlyFee] = useState<number>(0);
  const [navigation, setNavigation] = useState<NavItem[]>([]);
  const [filteredQuickActions, setFilteredQuickActions] = useState<QuickAction[]>([]);

  // Build navigation based on user tier and selected features
  const buildNavigation = useCallback((tier: UserTier, prefs: Preferences | null) => {
    const nav: NavItem[] = [...baseNavigation];

    // Get enabled features (included in tier + selected addons)
    const includedFeatures = defaultIncludedFeatures[tier] || [];
    const selectedAddons = prefs?.selectedAddons || [];
    const enabledFeatures = [...new Set([...includedFeatures, ...selectedAddons])];

    // Add Cards if card tier is selected
    const hasCards = prefs?.cardStaffTier && prefs.cardStaffTier !== "none";

    // Filter feature navigation based on enabled features and tier
    featureNavigation.forEach(item => {
      // Check tier requirement
      if (item.tier && !item.tier.includes(tier)) {
        return;
      }

      // Check feature requirement
      if (item.featureId) {
        if (!enabledFeatures.includes(item.featureId)) {
          return;
        }
      }

      // Special handling for Cards
      if (item.title === "Cards" && !hasCards) {
        return;
      }

      nav.push(item);
    });

    // Always add settings
    nav.push(settingsNav);

    return nav;
  }, []);

  // Build quick actions based on user tier and selected features
  const buildQuickActions = useCallback((tier: UserTier, prefs: Preferences | null) => {
    const includedFeatures = defaultIncludedFeatures[tier] || [];
    const selectedAddons = prefs?.selectedAddons || [];
    const enabledFeatures = [...new Set([...includedFeatures, ...selectedAddons])];
    const hasCards = prefs?.cardStaffTier && prefs.cardStaffTier !== "none";

    return quickActions.filter(action => {
      // Check tier requirement
      if (action.tier && !action.tier.includes(tier)) {
        return false;
      }
      // Check feature requirement
      if (action.featureId && !enabledFeatures.includes(action.featureId)) {
        return false;
      }
      // Special handling for cards
      if (action.id === "issue_card" && !hasCards) {
        return false;
      }
      return true;
    });
  }, []);

  useEffect(() => {
    checkAuthAndTier();
  }, []);

  // Payment timer - show payment prompt after 5 minutes
  useEffect(() => {
    if (!isLoading && !isPaid && userTier !== "basic") {
      const paymentStatus = localStorage.getItem("plusPaymentComplete");
      if (paymentStatus === "true") {
        setIsPaid(true);
        return;
      }

      // Check if first visit to dashboard
      const welcomeComplete = localStorage.getItem("plusWelcomeComplete");
      if (!welcomeComplete) {
        setShowWelcomeWizard(true);
      }

      // Set timer for payment prompt (5 minutes = 300000ms)
      // For testing, use 30 seconds = 30000ms
      const timer = setTimeout(() => {
        if (!localStorage.getItem("plusPaymentComplete")) {
          setShowPaymentPrompt(true);
        }
      }, 300000); // 5 minutes

      return () => clearTimeout(timer);
    }
  }, [isLoading, isPaid, userTier]);

  const checkAuthAndTier = async () => {
    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      const plusTier = localStorage.getItem("plusTier");
      const setupComplete = localStorage.getItem("plusSetupComplete");
      const storedPreferences = localStorage.getItem("plusPreferences");
      const storedMonthlyFee = localStorage.getItem("plusMonthlyFee");
      const paymentComplete = localStorage.getItem("plusPaymentComplete");

      if (!token) {
        router.push("/auth/login?redirect=/dashboard");
        return;
      }

      // Load preferences
      let prefs: Preferences | null = null;
      if (storedPreferences) {
        prefs = JSON.parse(storedPreferences);
        setPreferences(prefs);
      }

      if (storedMonthlyFee) {
        setMonthlyFee(parseFloat(storedMonthlyFee));
      }

      if (paymentComplete === "true") {
        setIsPaid(true);
      }

      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserData(user);

        const effectiveTier = (plusTier || user.tier || "basic") as UserTier;
        setUserTier(effectiveTier);

        // Build navigation and quick actions
        const nav = buildNavigation(effectiveTier, prefs);
        setNavigation(nav);
        const actions = buildQuickActions(effectiveTier, prefs);
        setFilteredQuickActions(actions);

        if (effectiveTier === "basic") {
          setShowUpgradeOverlay(true);
        }

        if ((effectiveTier === "business" || effectiveTier === "business_plus") && !setupComplete) {
          router.push(`/setup?tier=${effectiveTier}`);
          return;
        }
      } else {
        try {
          const { valid, user } = await authService.validateToken(token);

          if (valid && user) {
            localStorage.setItem("user", JSON.stringify(user));
            setUserData({
              id: user.id,
              email: user.email,
              businessName: user.businessName,
              tier: user.tier || "basic",
            });

            const effectiveTier = user.tier || "basic";
            setUserTier(effectiveTier);

            const nav = buildNavigation(effectiveTier, prefs);
            setNavigation(nav);
            const actions = buildQuickActions(effectiveTier, prefs);
            setFilteredQuickActions(actions);

            if (effectiveTier === "basic") {
              setShowUpgradeOverlay(true);
            }
          } else {
            authService.logout();
            router.push("/auth/login?redirect=/dashboard");
            return;
          }
        } catch (error) {
          console.error("Auth validation error:", error);
          setUserTier("basic");
          setShowUpgradeOverlay(true);
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    router.push("/auth/login");
  };

  const handleWelcomeComplete = () => {
    localStorage.setItem("plusWelcomeComplete", "true");
    setShowWelcomeWizard(false);
  };

  const handlePaymentComplete = () => {
    localStorage.setItem("plusPaymentComplete", "true");
    setIsPaid(true);
    setShowPaymentPrompt(false);
  };

  const handlePaymentDecline = () => {
    // Redirect to my.peeap.com dashboard
    window.location.href = "https://my.peeap.com/dashboard";
  };

  const businessName = userData?.businessName || "My Business";

  const filteredNav = navigation;

  const NavItems = () => (
    <>
      {filteredNav.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setSidebarOpen(false)}
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
            pathname === item.href
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          {item.icon}
          {item.title}
          {item.badge && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {item.badge}
            </Badge>
          )}
        </Link>
      ))}
    </>
  );

  const QuickActions = () => (
    <>
      {filteredQuickActions.length > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center gap-2 px-3 mb-2">
            <Zap className="h-3 w-3 text-amber-500" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick Actions
            </span>
          </div>
          <div className="space-y-1">
            {filteredQuickActions.map((action) => (
              <Link
                key={action.id}
                href={action.href}
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors text-muted-foreground hover:bg-amber-50 hover:text-amber-700 group"
              >
                <div className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center text-amber-600 group-hover:bg-amber-200">
                  {action.icon}
                </div>
                {action.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Upgrade Overlay for basic tier users */}
      {showUpgradeOverlay && (
        <UpgradeOverlay currentTier={userTier} />
      )}

      {/* Welcome Wizard for new users */}
      {showWelcomeWizard && !showUpgradeOverlay && (
        <WelcomeWizard
          tier={userTier}
          preferences={preferences}
          onComplete={handleWelcomeComplete}
        />
      )}

      {/* Payment Prompt after 5 minutes */}
      {showPaymentPrompt && !showUpgradeOverlay && (
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
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-64 border-r bg-white lg:block">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center gap-2 border-b px-6">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P+</span>
            </div>
            <span className="font-bold text-lg">PeeAP Plus</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
            <NavItems />
            <QuickActions />
          </nav>

          {/* Upgrade Banner for business tier (to upgrade to business++) */}
          {userTier === "business" && (
            <div className="m-4 rounded-lg bg-purple-50 border border-purple-200 p-4">
              <p className="text-sm font-medium text-purple-900">Upgrade to Business++</p>
              <p className="text-xs text-purple-700 mt-1">
                Get employee cards, spending controls
              </p>
              <Link href="/upgrade?tier=business_plus">
                <Button size="sm" variant="secondary" className="mt-3 w-full">
                  Upgrade
                </Button>
              </Link>
            </div>
          )}

          {/* User Info */}
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9">
                <AvatarFallback>
                  {businessName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{businessName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userTier.replace("_", " ")}</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-white px-4 lg:hidden">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">
              <div className="flex h-16 items-center gap-2 border-b px-6">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">P+</span>
                </div>
                <span className="font-bold text-lg">PeeAP Plus</span>
              </div>
              <nav className="flex-1 space-y-1 p-4 overflow-y-auto">
                <NavItems />
                <QuickActions />
              </nav>
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex-1" />

        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {businessName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div>
                <p>{businessName}</p>
                <p className="text-xs font-normal text-muted-foreground capitalize">
                  {userTier.replace("_", " ")}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/business">
                <Building2 className="mr-2 h-4 w-4" />
                Business Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Desktop Header */}
      <header className="sticky top-0 z-40 hidden h-16 items-center gap-4 border-b bg-white px-6 lg:ml-64 lg:flex">
        <div className="flex-1" />

        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>
                  {businessName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="hidden md:inline-block">{businessName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>
              <div>
                <p>{businessName}</p>
                <p className="text-xs font-normal text-muted-foreground capitalize">
                  {userTier.replace("_", " ")}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/business">
                <Building2 className="mr-2 h-4 w-4" />
                Business Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Main Content */}
      <main className="lg:ml-64">
        <div className="container mx-auto p-6">{children}</div>
      </main>
    </div>
  );
}
