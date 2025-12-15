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
  userId?: string;
  onPay: () => void;
  onDecline: () => void;
}

// Trial period: 7 days in milliseconds
const TRIAL_PERIOD_MS = 7 * 24 * 60 * 60 * 1000;

// Cookie/localStorage key for trial start
const TRIAL_START_KEY = "plusTrialStartedAt";

export function PaymentPrompt({ tier, monthlyFee, businessName, userName, userId, onPay, onDecline }: PaymentPromptProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);
  const [trialExpired, setTrialExpired] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-SL").format(price);
  };

  const tierName = tier === "business_plus" ? "Business++" : "Business";

  // Get display name for redirect message
  const displayName = businessName || userName || "your account";

  // Initialize trial start time if not set
  useEffect(() => {
    let trialStartedAt = localStorage.getItem(TRIAL_START_KEY);

    if (!trialStartedAt) {
      // First time - start the trial now
      trialStartedAt = new Date().toISOString();
      localStorage.setItem(TRIAL_START_KEY, trialStartedAt);
    }

    const startTime = new Date(trialStartedAt).getTime();
    const endTime = startTime + TRIAL_PERIOD_MS;

    // Update countdown every second
    const timer = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        setTrialExpired(true);
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }

      const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor((remaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      const minutes = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-redirect when trial expires
  useEffect(() => {
    if (trialExpired) {
      const redirectTimer = setTimeout(() => {
        onDecline();
      }, 5000); // Give 5 seconds warning before redirect

      return () => clearTimeout(redirectTimer);
    }
  }, [trialExpired, onDecline]);

  const formatTimeRemaining = () => {
    if (!timeRemaining) return "Loading...";

    const parts = [];
    if (timeRemaining.days > 0) parts.push(`${timeRemaining.days} day${timeRemaining.days !== 1 ? 's' : ''}`);
    if (timeRemaining.hours > 0) parts.push(`${timeRemaining.hours} hour${timeRemaining.hours !== 1 ? 's' : ''}`);
    if (timeRemaining.minutes > 0) parts.push(`${timeRemaining.minutes} minute${timeRemaining.minutes !== 1 ? 's' : ''}`);
    if (parts.length === 0 || (timeRemaining.days === 0 && timeRemaining.hours === 0)) {
      parts.push(`${timeRemaining.seconds} second${timeRemaining.seconds !== 1 ? 's' : ''}`);
    }

    return parts.slice(0, 2).join(', '); // Show max 2 units
  };

  const handlePay = async () => {
    setIsProcessing(true);

    try {
      // Redirect to my.peeap.com payment page with subscription details
      const paymentParams = new URLSearchParams({
        type: 'plus_subscription',
        tier: tier,
        amount: monthlyFee.toString(),
        userId: userId || '',
        businessName: businessName || '',
        returnUrl: `${window.location.origin}/dashboard?payment=success`,
        cancelUrl: `${window.location.origin}/dashboard?payment=cancelled`,
      });

      // Redirect to PeeAP payment gateway
      window.location.href = `https://my.peeap.com/pay/subscription?${paymentParams.toString()}`;
    } catch (error) {
      console.error("Payment redirect error:", error);
      setIsProcessing(false);
    }
  };

  const handleSkipForNow = () => {
    // Allow user to continue using the app during trial
    // Close the prompt without redirecting
    onPay(); // Mark as "handled" so prompt closes
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center pb-2">
          <div className={`w-16 h-16 ${trialExpired ? 'bg-red-100' : 'bg-amber-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
            <Clock className={`w-8 h-8 ${trialExpired ? 'text-red-600' : 'text-amber-600'}`} />
          </div>
          <CardTitle className="text-xl">
            {trialExpired ? 'Trial Period Ended' : 'Free Trial Active'}
          </CardTitle>
          <CardDescription>
            {trialExpired
              ? `Your 7-day trial has ended. Activate your ${tierName} plan to continue.`
              : `You have a 7-day free trial. Upgrade to ${tierName} to unlock all features.`
            }
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Timer */}
          <Alert className={`${trialExpired ? 'border-red-200 bg-red-50' : 'border-amber-200 bg-amber-50'}`}>
            <AlertTriangle className={`h-4 w-4 ${trialExpired ? 'text-red-600' : 'text-amber-600'}`} />
            <AlertDescription className={trialExpired ? 'text-red-800' : 'text-amber-800'}>
              <strong>Time remaining:</strong> {formatTimeRemaining()}
              <br />
              <span className="text-sm">
                {trialExpired
                  ? `You will be redirected to ${displayName} dashboard at my.peeap.com in a few seconds.`
                  : `Subscribe now to avoid interruption when your trial ends.`
                }
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
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700"
            size="lg"
            onClick={handlePay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Payment...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-4 w-4" />
                Pay NLE {formatPrice(monthlyFee)} Now
              </>
            )}
          </Button>

          {!trialExpired && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleSkipForNow}
              disabled={isProcessing}
            >
              Continue Trial
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-muted-foreground"
            onClick={onDecline}
            disabled={isProcessing}
          >
            {trialExpired ? 'Return to my.peeap.com' : 'Not interested - Go back'}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
