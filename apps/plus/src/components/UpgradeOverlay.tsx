"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Lock,
  FileText,
  RefreshCw,
  CreditCard,
  Users,
  BarChart3,
  Sparkles,
  ArrowRight,
  X,
  Wallet,
  CheckCircle2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

interface UpgradeOverlayProps {
  currentTier?: string;
  onClose?: () => void;
  showClose?: boolean;
  isActivation?: boolean; // True if user had setup but hasn't paid
  pendingTier?: string; // The tier they selected but haven't paid for
  monthlyFee?: number;
  onActivate?: () => void;
}

export function UpgradeOverlay({
  currentTier = "basic",
  onClose,
  showClose = false,
  isActivation = false,
  pendingTier,
  monthlyFee = 0,
  onActivate,
}: UpgradeOverlayProps) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [showActivation, setShowActivation] = useState(false);

  // Check if this is a returning user who hasn't paid
  useEffect(() => {
    const setupComplete = localStorage.getItem("plusSetupComplete");
    const paymentComplete = localStorage.getItem("plusPaymentComplete");
    const storedTier = localStorage.getItem("plusTier");

    if (setupComplete === "true" && paymentComplete !== "true" && storedTier && storedTier !== "basic") {
      setShowActivation(true);
    }
  }, []);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-SL").format(price);
  };

  const handleActivate = async () => {
    setIsProcessing(true);

    // Simulate payment
    await new Promise(resolve => setTimeout(resolve, 2000));

    localStorage.setItem("plusPaymentComplete", "true");
    setIsProcessing(false);

    if (onActivate) {
      onActivate();
    } else {
      window.location.reload();
    }
  };

  const features = [
    {
      icon: FileText,
      title: "Invoice Generator",
      description: "Create and send professional invoices",
      tier: "business",
    },
    {
      icon: RefreshCw,
      title: "Recurring Payments",
      description: "Set up subscriptions and auto-billing",
      tier: "business",
    },
    {
      icon: CreditCard,
      title: "Employee Cards",
      description: "Issue expense cards with controls",
      tier: "business_plus",
    },
    {
      icon: Users,
      title: "Team Access",
      description: "Add team members with roles",
      tier: "business_plus",
    },
    {
      icon: BarChart3,
      title: "Advanced Analytics",
      description: "Deep insights into your business",
      tier: "business_plus",
    },
  ];

  // Get stored fee for activation
  const storedFee = typeof window !== "undefined"
    ? parseFloat(localStorage.getItem("plusMonthlyFee") || "0")
    : 0;
  const storedTier = typeof window !== "undefined"
    ? localStorage.getItem("plusTier") || ""
    : "";

  const activationFee = monthlyFee || storedFee;
  const activationTierName = (pendingTier || storedTier) === "business_plus" ? "Business++" : "Business";

  // Show activation UI for returning unpaid users
  if (showActivation || isActivation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

        <Card className="relative z-10 w-full max-w-md mx-4 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            </div>
            <CardTitle className="text-xl">Activate Your Account</CardTitle>
            <CardDescription>
              Your {activationTierName} plan setup is complete but payment is pending.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Complete payment to unlock all your selected features and add-ons.
              </AlertDescription>
            </Alert>

            {/* Payment details */}
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Plan</span>
                <Badge>{activationTierName}</Badge>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Monthly Fee</span>
                <span className="text-lg font-bold text-primary">
                  NLE {formatPrice(activationFee)}
                </span>
              </div>
            </div>

            {/* Payment method */}
            <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <Wallet className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium">PeeAP Wallet</p>
                <p className="text-xs text-muted-foreground">
                  Payment from your my.peeap.com wallet
                </p>
              </div>
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button
              size="lg"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
              onClick={handleActivate}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Activate Account - Pay NLE {formatPrice(activationFee)}
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full text-muted-foreground"
              onClick={() => {
                window.location.href = "https://my.peeap.com/dashboard";
              }}
              disabled={isProcessing}
            >
              Return to my.peeap.com
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - blurs the dashboard behind */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <Card className="relative z-10 w-full max-w-lg mx-4 shadow-2xl">
        {showClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-2xl">Upgrade to Unlock</CardTitle>
          <CardDescription className="text-base">
            You're on the <Badge variant="secondary" className="mx-1">{currentTier}</Badge> plan.
            Upgrade to access premium features.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              const isBusinessPlus = feature.tier === "business_plus";

              return (
                <div
                  key={feature.title}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isBusinessPlus ? "bg-purple-100" : "bg-amber-100"
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      isBusinessPlus ? "text-purple-600" : "text-amber-600"
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{feature.title}</span>
                      <Badge variant={isBusinessPlus ? "secondary" : "default"} className="text-xs">
                        {isBusinessPlus ? "Business++" : "Business"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            size="lg"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
            onClick={() => router.push("/upgrade")}
          >
            <Sparkles className="mr-2 h-4 w-4" />
            View Plans & Upgrade
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Starting at NLE 150/month. Cancel anytime.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
