"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft,
  Loader2,
  User,
  Calendar,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { subscriptionService } from "@/lib/subscriptions/subscription.service";
import type { SubscriptionPlan, BillingInterval, PaymentMethod } from "@/lib/subscriptions/types";

function formatCurrency(amount: number, currency = "NLE"): string {
  return new Intl.NumberFormat("en-SL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [useCustomPricing, setUseCustomPricing] = useState(false);

  // Form state
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [currency, setCurrency] = useState("NLE");
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");
  const [billingIntervalCount, setBillingIntervalCount] = useState("1");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [trialDays, setTrialDays] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");
  const [autoRenew, setAutoRenew] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await subscriptionService.getPlans();
      setPlans(data.filter(p => p.is_active));
    } catch (error) {
      console.error("Failed to load plans:", error);
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const selectedPlan = plans.find(p => p.id === selectedPlanId);

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      alert("Please enter a customer name");
      return;
    }

    if (!useCustomPricing && !selectedPlanId) {
      alert("Please select a plan or enable custom pricing");
      return;
    }

    setIsLoading(true);
    try {
      const subscription = await subscriptionService.createSubscription({
        plan_id: useCustomPricing ? undefined : selectedPlanId,
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        amount: useCustomPricing ? parseFloat(customAmount) || 0 : undefined,
        currency: useCustomPricing ? currency : undefined,
        billing_interval: useCustomPricing ? billingInterval : undefined,
        billing_interval_count: useCustomPricing ? parseInt(billingIntervalCount) || 1 : undefined,
        start_date: startDate,
        trial_days: parseInt(trialDays) || 0,
        payment_method: paymentMethod || undefined,
        auto_renew: autoRenew,
        notes: notes || undefined,
      });

      router.push(`/dashboard/subscriptions/${subscription.id}`);
    } catch (error) {
      console.error("Failed to create subscription:", error);
      alert("Failed to create subscription. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/subscriptions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Subscription</h1>
          <p className="text-muted-foreground">
            Create a new recurring subscription for your customer
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+232 XX XXX XXXX"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-5 w-5" />
                Subscription Plan
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="customPricing">Use custom pricing</Label>
                <Switch
                  id="customPricing"
                  checked={useCustomPricing}
                  onCheckedChange={setUseCustomPricing}
                />
              </div>

              {!useCustomPricing ? (
                <div>
                  <Label>Select a Plan *</Label>
                  {isLoadingPlans ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="text-center py-8 border rounded-lg bg-muted/30">
                      <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-muted-foreground mb-3">No plans created yet</p>
                      <Button variant="outline" asChild>
                        <Link href="/dashboard/subscriptions/plans/new">
                          Create a Plan
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <RadioGroup
                      value={selectedPlanId}
                      onValueChange={setSelectedPlanId}
                      className="grid gap-3 mt-2"
                    >
                      {plans.map((plan) => (
                        <div key={plan.id}>
                          <RadioGroupItem
                            value={plan.id}
                            id={plan.id}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={plan.id}
                            className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                          >
                            <div>
                              <p className="font-medium">{plan.name}</p>
                              {plan.description && (
                                <p className="text-sm text-muted-foreground">
                                  {plan.description}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="font-bold">
                                {formatCurrency(plan.price, plan.currency)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                /{plan.billing_interval}
                              </p>
                            </div>
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="customAmount">Amount *</Label>
                      <Input
                        id="customAmount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="currency">Currency</Label>
                      <Select value={currency} onValueChange={setCurrency}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="NLE">NLE - Leone</SelectItem>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="billingInterval">Billing Interval</Label>
                      <Select
                        value={billingInterval}
                        onValueChange={(v) => setBillingInterval(v as BillingInterval)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="quarterly">Quarterly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="billingCount">Every X Intervals</Label>
                      <Input
                        id="billingCount"
                        type="number"
                        min="1"
                        value={billingIntervalCount}
                        onChange={(e) => setBillingIntervalCount(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Billing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Billing Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="trialDays">Trial Days</Label>
                  <Input
                    id="trialDays"
                    type="number"
                    min="0"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label htmlFor="autoRenew">Auto-renew</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically renew at the end of each period
                  </p>
                </div>
                <Switch
                  id="autoRenew"
                  checked={autoRenew}
                  onCheckedChange={setAutoRenew}
                />
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Method
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="paymentMethod">Default Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="peeap_wallet">Peeap Wallet</SelectItem>
                    <SelectItem value="auto_debit">Auto Debit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this subscription..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-24">
            <CardHeader>
              <CardTitle>Subscription Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {customerName && (
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-medium">{customerName}</p>
                </div>
              )}

              {(selectedPlan || useCustomPricing) && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-medium">
                      {useCustomPricing ? "Custom Pricing" : selectedPlan?.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Amount</p>
                    <p className="text-xl font-bold">
                      {useCustomPricing
                        ? formatCurrency(parseFloat(customAmount) || 0, currency)
                        : formatCurrency(selectedPlan?.price || 0, selectedPlan?.currency)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      per{" "}
                      {useCustomPricing
                        ? `${billingIntervalCount !== "1" ? billingIntervalCount + " " : ""}${billingInterval}`
                        : selectedPlan?.billing_interval}
                    </p>
                  </div>

                  {parseInt(trialDays) > 0 && (
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-800">
                        {trialDays} day free trial
                      </p>
                    </div>
                  )}
                </>
              )}

              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Create Subscription
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/dashboard/subscriptions">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
