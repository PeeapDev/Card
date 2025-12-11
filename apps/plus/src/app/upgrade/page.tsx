"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Loader2,
  ArrowRight,
  CreditCard,
  FileText,
  RefreshCw,
  Users,
  Shield,
  BarChart3,
  Sparkles
} from "lucide-react";

type Tier = "business" | "business_plus";

const tiers = {
  business: {
    name: "Business",
    price: "NLE 150",
    period: "/month",
    description: "For growing businesses that need more tools",
    features: [
      "Everything in Basic",
      "Invoice generator",
      "Recurring payments & subscriptions",
      "Subscription links",
      "Basic API access",
      "Webhook notifications",
      "90-day transaction history",
      "Priority support",
    ],
    icon: FileText,
    color: "amber",
  },
  business_plus: {
    name: "Business++",
    price: "NLE 500",
    period: "/month",
    description: "For enterprises needing full control",
    features: [
      "Everything in Business",
      "Issue employee expense cards",
      "Spending controls & limits",
      "Real-time authorization webhooks",
      "Expense management",
      "Multi-user team access",
      "Department budgets",
      "Advanced analytics & reports",
      "Unlimited transaction history",
      "Dedicated account manager",
    ],
    icon: CreditCard,
    color: "purple",
  },
};

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTier, setSelectedTier] = useState<Tier | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get tier from URL params
    const tierParam = searchParams.get("tier") as Tier | null;
    const tokenParam = searchParams.get("token");
    const fromParam = searchParams.get("from");

    if (tierParam && (tierParam === "business" || tierParam === "business_plus")) {
      setSelectedTier(tierParam);
    }

    // Check if user came with a token from my.peeap.com
    if (tokenParam) {
      // Store the token and validate it
      localStorage.setItem("token", tokenParam);
      validateToken(tokenParam);
    } else {
      // Check existing token
      const existingToken = localStorage.getItem("token");
      if (existingToken) {
        validateToken(existingToken);
      } else {
        setIsLoading(false);
      }
    }
  }, [searchParams]);

  const validateToken = async (token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/auth/validate`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem("user", JSON.stringify(data.user));
        setIsAuthenticated(true);
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    } catch (error) {
      console.error("Token validation error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTier = (tier: Tier) => {
    setSelectedTier(tier);
  };

  const handleProceedToPayment = async () => {
    if (!selectedTier) return;

    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/auth/login?redirect=/upgrade?tier=${selectedTier}`);
      return;
    }

    setIsProcessing(true);

    try {
      // Create subscription checkout session
      const token = localStorage.getItem("token");
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/subscriptions/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tier: selectedTier,
          returnUrl: `${window.location.origin}/setup`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.checkoutUrl) {
        // Redirect to payment checkout
        window.location.href = data.checkoutUrl;
      } else {
        // For now, simulate success and go to setup
        // TODO: Integrate actual payment
        router.push(`/setup?tier=${selectedTier}`);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      // Fallback to setup for demo
      router.push(`/setup?tier=${selectedTier}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">P+</span>
            </div>
            <span className="font-bold text-xl">PeeAP Plus</span>
          </Link>
          {isAuthenticated ? (
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Go to Dashboard
            </Button>
          ) : (
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-medium mb-4">
            <Sparkles className="w-4 h-4" />
            Upgrade Your Account
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Choose Your Plan
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Unlock powerful business tools. Select a plan to continue.
          </p>
        </div>

        {/* Tier Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-12">
          {(Object.entries(tiers) as [Tier, typeof tiers.business][]).map(([key, tier]) => {
            const Icon = tier.icon;
            const isSelected = selectedTier === key;
            const colorClasses = tier.color === "amber"
              ? "border-amber-400 bg-amber-50"
              : "border-purple-400 bg-purple-50";

            return (
              <Card
                key={key}
                className={`relative cursor-pointer transition-all ${
                  isSelected
                    ? `${colorClasses} border-2 shadow-lg scale-105`
                    : "hover:border-gray-300 hover:shadow-md"
                }`}
                onClick={() => handleSelectTier(key)}
              >
                {isSelected && (
                  <div className="absolute -top-3 -right-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      tier.color === "amber" ? "bg-amber-500" : "bg-purple-500"
                    }`}>
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}

                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tier.color === "amber" ? "bg-amber-500" : "bg-purple-600"
                    }`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle>{tier.name}</CardTitle>
                      {key === "business_plus" && (
                        <Badge variant="secondary" className="mt-1">Corporate</Badge>
                      )}
                    </div>
                  </div>
                  <CardDescription>{tier.description}</CardDescription>
                  <div className="pt-4">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.slice(0, 6).map((feature) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className={`h-4 w-4 ${
                          tier.color === "amber" ? "text-amber-500" : "text-purple-500"
                        }`} />
                        {feature}
                      </li>
                    ))}
                    {tier.features.length > 6 && (
                      <li className="text-sm text-muted-foreground">
                        +{tier.features.length - 6} more features
                      </li>
                    )}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Proceed Button */}
        <div className="text-center">
          <Button
            size="lg"
            className="h-14 px-12 text-lg"
            disabled={!selectedTier || isProcessing}
            onClick={handleProceedToPayment}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : !isAuthenticated ? (
              <>
                Sign In to Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            ) : (
              <>
                Proceed to Payment
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          {selectedTier && (
            <p className="text-sm text-muted-foreground mt-4">
              You selected: <strong>{tiers[selectedTier].name}</strong> - {tiers[selectedTier].price}{tiers[selectedTier].period}
            </p>
          )}
        </div>

        {/* Feature Comparison */}
        <div className="mt-20 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">What's Included</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center p-6">
              <FileText className="w-10 h-10 mx-auto mb-4 text-amber-500" />
              <h3 className="font-semibold mb-2">Invoicing</h3>
              <p className="text-sm text-muted-foreground">
                Create and send professional invoices. Track payments automatically.
              </p>
              <Badge className="mt-3">Business</Badge>
            </Card>
            <Card className="text-center p-6">
              <RefreshCw className="w-10 h-10 mx-auto mb-4 text-amber-500" />
              <h3 className="font-semibold mb-2">Subscriptions</h3>
              <p className="text-sm text-muted-foreground">
                Recurring billing for memberships, services, and more.
              </p>
              <Badge className="mt-3">Business</Badge>
            </Card>
            <Card className="text-center p-6">
              <CreditCard className="w-10 h-10 mx-auto mb-4 text-purple-500" />
              <h3 className="font-semibold mb-2">Employee Cards</h3>
              <p className="text-sm text-muted-foreground">
                Issue expense cards with spending controls.
              </p>
              <Badge variant="secondary" className="mt-3">Business++</Badge>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

function UpgradeLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<UpgradeLoading />}>
      <UpgradeContent />
    </Suspense>
  );
}
