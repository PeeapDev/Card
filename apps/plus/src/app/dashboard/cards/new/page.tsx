"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Loader2,
  User,
  CreditCard,
  Shield,
  DollarSign,
} from "lucide-react";
import { cardService } from "@/lib/cards/card.service";
import type { CardType, SpendingLimitPeriod, MerchantCategory } from "@/lib/cards/types";

const MERCHANT_CATEGORIES: { value: MerchantCategory; label: string }[] = [
  { value: "general", label: "General" },
  { value: "travel", label: "Travel" },
  { value: "fuel", label: "Fuel & Gas" },
  { value: "dining", label: "Dining & Restaurants" },
  { value: "office_supplies", label: "Office Supplies" },
  { value: "software", label: "Software & SaaS" },
  { value: "utilities", label: "Utilities" },
  { value: "advertising", label: "Advertising" },
  { value: "professional_services", label: "Professional Services" },
  { value: "other", label: "Other" },
];

function formatCurrency(amount: number, currency = "NLE"): string {
  return new Intl.NumberFormat("en-SL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export default function IssueCardPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  // Employee details
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [employeeDepartment, setEmployeeDepartment] = useState("");

  // Card settings
  const [cardType, setCardType] = useState<CardType>("virtual");
  const [cardName, setCardName] = useState("");
  const [spendingLimit, setSpendingLimit] = useState("");
  const [spendingLimitPeriod, setSpendingLimitPeriod] = useState<SpendingLimitPeriod>("monthly");
  const [currency, setCurrency] = useState("NLE");

  // Category controls
  const [useCategoryRestrictions, setUseCategoryRestrictions] = useState(false);
  const [allowedCategories, setAllowedCategories] = useState<MerchantCategory[]>([]);

  // Compliance settings
  const [requireReceipt, setRequireReceipt] = useState(false);
  const [requireMemo, setRequireMemo] = useState(false);
  const [notes, setNotes] = useState("");

  const toggleCategory = (category: MerchantCategory) => {
    setAllowedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const handleSubmit = async () => {
    if (!employeeName.trim()) {
      alert("Please enter employee name");
      return;
    }
    if (!spendingLimit || parseFloat(spendingLimit) <= 0) {
      alert("Please enter a valid spending limit");
      return;
    }

    setIsLoading(true);
    try {
      // Generate a unique employee ID (in production, this would come from your HR system)
      const employeeId = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const card = await cardService.issueCard({
        employee_id: employeeId,
        employee_name: employeeName,
        employee_email: employeeEmail || undefined,
        employee_department: employeeDepartment || undefined,
        card_type: cardType,
        card_name: cardName || undefined,
        spending_limit: parseFloat(spendingLimit),
        spending_limit_period: spendingLimitPeriod,
        currency,
        allowed_categories: useCategoryRestrictions && allowedCategories.length > 0
          ? allowedCategories
          : undefined,
        require_receipt: requireReceipt,
        require_memo: requireMemo,
        notes: notes || undefined,
      });

      router.push(`/dashboard/cards/${card.id}`);
    } catch (error) {
      console.error("Failed to issue card:", error);
      alert("Failed to issue card. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/dashboard/cards">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Issue New Card</h1>
          <p className="text-muted-foreground">
            Issue an expense card to an employee
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Employee Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="employeeName">Employee Name *</Label>
                <Input
                  id="employeeName"
                  value={employeeName}
                  onChange={(e) => setEmployeeName(e.target.value)}
                  placeholder="Enter employee name"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="employeeEmail">Email</Label>
                  <Input
                    id="employeeEmail"
                    type="email"
                    value={employeeEmail}
                    onChange={(e) => setEmployeeEmail(e.target.value)}
                    placeholder="employee@company.com"
                  />
                </div>
                <div>
                  <Label htmlFor="employeeDepartment">Department</Label>
                  <Input
                    id="employeeDepartment"
                    value={employeeDepartment}
                    onChange={(e) => setEmployeeDepartment(e.target.value)}
                    placeholder="e.g., Marketing, Sales"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Card Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Card Type</Label>
                <RadioGroup
                  value={cardType}
                  onValueChange={(v) => setCardType(v as CardType)}
                  className="grid grid-cols-2 gap-4 mt-2"
                >
                  <div>
                    <RadioGroupItem value="virtual" id="virtual" className="peer sr-only" />
                    <Label
                      htmlFor="virtual"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <CreditCard className="mb-3 h-6 w-6" />
                      <span className="font-medium">Virtual Card</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Instant, for online purchases
                      </span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="physical" id="physical" className="peer sr-only" />
                    <Label
                      htmlFor="physical"
                      className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <CreditCard className="mb-3 h-6 w-6" />
                      <span className="font-medium">Physical Card</span>
                      <span className="text-xs text-muted-foreground text-center">
                        Shipped to employee
                      </span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="cardName">Card Name (Optional)</Label>
                <Input
                  id="cardName"
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value)}
                  placeholder={`${employeeName || "Employee"}'s Card`}
                />
              </div>
            </CardContent>
          </Card>

          {/* Spending Limits */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Spending Limits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <Label htmlFor="spendingLimit">Spending Limit *</Label>
                  <Input
                    id="spendingLimit"
                    type="number"
                    min="0"
                    step="100"
                    value={spendingLimit}
                    onChange={(e) => setSpendingLimit(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NLE">NLE</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="limitPeriod">Limit Period</Label>
                <Select
                  value={spendingLimitPeriod}
                  onValueChange={(v) => setSpendingLimitPeriod(v as SpendingLimitPeriod)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per_transaction">Per Transaction</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="total">Total (No Reset)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Restrict to specific categories</Label>
                  <p className="text-sm text-muted-foreground">
                    Only allow spending at certain merchant types
                  </p>
                </div>
                <Switch
                  checked={useCategoryRestrictions}
                  onCheckedChange={setUseCategoryRestrictions}
                />
              </div>

              {useCategoryRestrictions && (
                <div className="grid grid-cols-2 gap-2 p-4 border rounded-lg bg-muted/30">
                  {MERCHANT_CATEGORIES.map((category) => (
                    <div key={category.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={category.value}
                        checked={allowedCategories.includes(category.value)}
                        onCheckedChange={() => toggleCategory(category.value)}
                      />
                      <label
                        htmlFor={category.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {category.label}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Compliance Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Compliance Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Require receipt upload</Label>
                  <p className="text-sm text-muted-foreground">
                    Employee must upload receipt for each transaction
                  </p>
                </div>
                <Switch
                  checked={requireReceipt}
                  onCheckedChange={setRequireReceipt}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <Label>Require memo/description</Label>
                  <p className="text-sm text-muted-foreground">
                    Employee must add description for each transaction
                  </p>
                </div>
                <Switch
                  checked={requireMemo}
                  onCheckedChange={setRequireMemo}
                />
              </div>

              <div>
                <Label htmlFor="notes">Internal Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any internal notes about this card..."
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
              <CardTitle>Card Summary</CardTitle>
              <CardDescription>Review before issuing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {employeeName && (
                <div>
                  <p className="text-sm text-muted-foreground">Employee</p>
                  <p className="font-medium">{employeeName}</p>
                  {employeeDepartment && (
                    <p className="text-sm text-muted-foreground">{employeeDepartment}</p>
                  )}
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground">Card Type</p>
                <p className="font-medium capitalize">{cardType}</p>
              </div>

              {spendingLimit && (
                <div>
                  <p className="text-sm text-muted-foreground">Spending Limit</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(parseFloat(spendingLimit) || 0, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {spendingLimitPeriod.replace("_", " ")}
                  </p>
                </div>
              )}

              {useCategoryRestrictions && allowedCategories.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">Allowed Categories</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {allowedCategories.slice(0, 3).map((cat) => (
                      <span
                        key={cat}
                        className="text-xs bg-muted px-2 py-1 rounded capitalize"
                      >
                        {cat.replace("_", " ")}
                      </span>
                    ))}
                    {allowedCategories.length > 3 && (
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        +{allowedCategories.length - 3} more
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                {requireReceipt && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Receipts required
                  </p>
                )}
                {requireMemo && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="h-3 w-3" /> Memo required
                  </p>
                )}
              </div>

              <div className="space-y-2 pt-4">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CreditCard className="h-4 w-4 mr-2" />
                  )}
                  Issue Card
                </Button>
                <Button variant="ghost" className="w-full" asChild>
                  <Link href="/dashboard/cards">Cancel</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
