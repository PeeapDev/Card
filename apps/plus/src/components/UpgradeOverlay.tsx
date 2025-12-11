"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

interface UpgradeOverlayProps {
  currentTier?: string;
  onClose?: () => void;
  showClose?: boolean;
}

export function UpgradeOverlay({ currentTier = "basic", onClose, showClose = false }: UpgradeOverlayProps) {
  const router = useRouter();

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
            Starting at SLE 150,000/month. Cancel anytime.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
