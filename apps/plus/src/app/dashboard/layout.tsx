"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UpgradeOverlay } from "@/components/UpgradeOverlay";

interface NavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  tier?: string[];
}

const navigation: NavItem[] = [
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
  {
    title: "Invoices",
    href: "/dashboard/invoices",
    icon: <FileText className="h-4 w-4" />,
    tier: ["business", "business_plus"],
  },
  {
    title: "Subscriptions",
    href: "/dashboard/subscriptions",
    icon: <RefreshCw className="h-4 w-4" />,
    tier: ["business", "business_plus"],
  },
  {
    title: "Cards",
    href: "/dashboard/cards",
    icon: <CreditCard className="h-4 w-4" />,
    badge: "Business++",
    tier: ["business_plus"],
  },
  {
    title: "Employees",
    href: "/dashboard/employees",
    icon: <Users className="h-4 w-4" />,
    tier: ["business_plus"],
  },
  {
    title: "API Keys",
    href: "/dashboard/api",
    icon: <Code2 className="h-4 w-4" />,
    tier: ["business", "business_plus", "developer"],
  },
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: <Settings className="h-4 w-4" />,
  },
];

type UserTier = "basic" | "business" | "business_plus" | "developer";

interface UserData {
  id: string;
  email: string;
  businessName?: string;
  tier: UserTier;
  plusSetupComplete?: boolean;
}

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
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userTier, setUserTier] = useState<UserTier>("basic");

  useEffect(() => {
    checkAuthAndTier();
  }, []);

  const checkAuthAndTier = async () => {
    try {
      const token = localStorage.getItem("token");
      const storedUser = localStorage.getItem("user");
      const plusTier = localStorage.getItem("plusTier");
      const setupComplete = localStorage.getItem("plusSetupComplete");

      if (!token) {
        // Not logged in, redirect to login
        router.push("/auth/login?redirect=/dashboard");
        return;
      }

      // Check if user has completed Plus setup
      if (storedUser) {
        const user = JSON.parse(storedUser);
        setUserData(user);

        // Determine user tier
        // Priority: plusTier from setup > user.tier from API > basic
        const effectiveTier = (plusTier || user.tier || "basic") as UserTier;
        setUserTier(effectiveTier);

        // Show upgrade overlay if user is on basic tier
        if (effectiveTier === "basic") {
          setShowUpgradeOverlay(true);
        }

        // Check if setup is needed for new Plus users
        if ((effectiveTier === "business" || effectiveTier === "business_plus") && !setupComplete) {
          router.push(`/setup?tier=${effectiveTier}`);
          return;
        }
      } else {
        // Validate token with API
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/validate`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (response.ok) {
            const data = await response.json();
            localStorage.setItem("user", JSON.stringify(data.user));
            setUserData(data.user);

            const effectiveTier = (data.user.tier || "basic") as UserTier;
            setUserTier(effectiveTier);

            if (effectiveTier === "basic") {
              setShowUpgradeOverlay(true);
            }
          } else {
            // Invalid token, redirect to login
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            router.push("/auth/login?redirect=/dashboard");
            return;
          }
        } catch (error) {
          console.error("Auth validation error:", error);
          // For demo, allow access with basic tier
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
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("plusTier");
    localStorage.removeItem("plusSetupComplete");
    router.push("/auth/login");
  };

  const businessName = userData?.businessName || "My Business";

  const filteredNav = navigation.filter(
    (item) => !item.tier || item.tier.includes(userTier)
  );

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
          <nav className="flex-1 space-y-1 p-4">
            <NavItems />
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
              <nav className="flex-1 space-y-1 p-4">
                <NavItems />
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
