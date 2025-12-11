"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Clock,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowRight,
  Loader2,
  Shield,
} from "lucide-react";

interface PaymentPromptProps {
  tier: string;
  monthlyFee: number;
  businessName?: string;
  userName?: string;
  onPay: () => void;
  onDecline: () => void;
}

export function PaymentPrompt({ tier, monthlyFee, businessName, userName, onPay, onDecline }: PaymentPromptProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [countdown, setCountdown] = useState(60); // 60 seconds to pay

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-SL").format(price);
  };

  const tierName = tier === "business_plus" ? "Business++" : "Business";

  // Get display name for redirect message
  const displayName = businessName || userName || "your account";

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-redirect when countdown reaches 0
          onDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onDecline]);

  const handlePay = async () => {
    setIsProcessing(true);

    // Simulate payment processing via PeeAP wallet
    // In production, this would call my.peeap.com API to deduct from wallet
    await new Promise(resolve => setTimeout(resolve, 2000));

    setIsProcessing(false);
    onPay();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>
          <CardTitle className="text-xl">Complete Your Payment</CardTitle>
          <CardDescription>
            Your trial period has ended. Activate your {tierName} plan to continue.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Timer warning */}
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Time remaining:</strong> {countdown} seconds
              <br />
              <span className="text-sm">
                You will be redirected to <strong>{displayName}</strong> personal merchant dashboard at my.peeap.com if payment is not completed.
              </span>
            </AlertDescription>
          </Alert>

          {/* Payment details */}
          <div className="bg-muted rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Plan</span>
              <Badge>{tierName}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Monthly Fee</span>
              <span className="font-semibold">NLE {formatPrice(monthlyFee)}</span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="font-medium">Amount Due</span>
              <span className="text-lg font-bold text-primary">NLE {formatPrice(monthlyFee)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Wallet className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">PeeAP Wallet</p>
              <p className="text-xs text-muted-foreground">
                Payment will be deducted from your my.peeap.com wallet
              </p>
            </div>
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
          </div>

          {/* Security note */}
          <div className="flex items-start gap-2 text-xs text-muted-foreground">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Secure payment processed by PeeAP. Your subscription will auto-renew monthly.
              Cancel anytime from your my.peeap.com account.
            </span>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button
            className="w-full"
            size="lg"
            onClick={handlePay}
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
                Pay NLE {formatPrice(monthlyFee)} Now
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onDecline}
            disabled={isProcessing}
          >
            Not now - Return to my.peeap.com
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
