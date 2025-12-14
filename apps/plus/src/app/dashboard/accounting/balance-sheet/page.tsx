"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Scale, Calendar, TrendingUp, TrendingDown } from "lucide-react";

const balanceSheetData = {
  asOf: "December 14, 2024",
  assets: {
    current: {
      "Cash and Cash Equivalents": 125000,
      "Accounts Receivable": 45000,
      "Inventory": 85000,
      "Prepaid Expenses": 12000,
    },
    fixed: {
      "Property, Plant & Equipment": 180000,
      "Less: Accumulated Depreciation": -30000,
      "Vehicles": 75000,
      "Less: Vehicle Depreciation": -15000,
    },
    other: {
      "Intangible Assets": 25000,
      "Deposits": 8000,
    },
  },
  liabilities: {
    current: {
      "Accounts Payable": 35000,
      "Salaries Payable": 18000,
      "Taxes Payable": 12000,
      "Accrued Expenses": 8000,
      "Short-term Loans": 20000,
    },
    longTerm: {
      "Long-term Bank Loan": 100000,
      "Deferred Tax Liability": 15000,
    },
  },
  equity: {
    "Owner's Capital": 200000,
    "Retained Earnings": 102000,
    "Current Year Profit": 25000,
  },
};

export default function BalanceSheetPage() {
  const [selectedDate, setSelectedDate] = useState("dec-14-2024");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SL", {
      style: "currency",
      currency: "SLE",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const sumCategory = (category: Record<string, number>) => {
    return Object.values(category).reduce((a, b) => a + b, 0);
  };

  const totalCurrentAssets = sumCategory(balanceSheetData.assets.current);
  const totalFixedAssets = sumCategory(balanceSheetData.assets.fixed);
  const totalOtherAssets = sumCategory(balanceSheetData.assets.other);
  const totalAssets = totalCurrentAssets + totalFixedAssets + totalOtherAssets;

  const totalCurrentLiabilities = sumCategory(balanceSheetData.liabilities.current);
  const totalLongTermLiabilities = sumCategory(balanceSheetData.liabilities.longTerm);
  const totalLiabilities = totalCurrentLiabilities + totalLongTermLiabilities;

  const totalEquity = sumCategory(balanceSheetData.equity);
  const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Balance Sheet</h1>
          <p className="text-muted-foreground">
            As of {balanceSheetData.asOf}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dec-14-2024">Dec 14, 2024</SelectItem>
              <SelectItem value="nov-30-2024">Nov 30, 2024</SelectItem>
              <SelectItem value="oct-31-2024">Oct 31, 2024</SelectItem>
              <SelectItem value="sep-30-2024">Sep 30, 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Scale className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalAssets)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(totalLiabilities)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalEquity)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Balance Sheet */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Assets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-blue-700">Assets</CardTitle>
            <CardDescription>What the business owns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Assets */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Current Assets</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(balanceSheetData.assets.current).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-sm">{name}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold text-sm bg-blue-50 dark:bg-blue-900/20 px-2 rounded">
                <span>Total Current Assets</span>
                <span>{formatCurrency(totalCurrentAssets)}</span>
              </div>
            </div>

            {/* Fixed Assets */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Fixed Assets</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(balanceSheetData.assets.fixed).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-sm">{name}</span>
                    <span className={`font-medium ${amount < 0 ? "text-red-600" : ""}`}>
                      {amount < 0 ? `(${formatCurrency(Math.abs(amount))})` : formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold text-sm bg-blue-50 dark:bg-blue-900/20 px-2 rounded">
                <span>Total Fixed Assets</span>
                <span>{formatCurrency(totalFixedAssets)}</span>
              </div>
            </div>

            {/* Other Assets */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Other Assets</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(balanceSheetData.assets.other).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-sm">{name}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold text-sm bg-blue-50 dark:bg-blue-900/20 px-2 rounded">
                <span>Total Other Assets</span>
                <span>{formatCurrency(totalOtherAssets)}</span>
              </div>
            </div>

            {/* Total Assets */}
            <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL ASSETS</span>
                <span className="text-blue-700">{formatCurrency(totalAssets)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Liabilities & Equity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-orange-700">Liabilities & Equity</CardTitle>
            <CardDescription>What the business owes and owns</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Liabilities */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Current Liabilities</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(balanceSheetData.liabilities.current).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-sm">{name}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold text-sm bg-orange-50 dark:bg-orange-900/20 px-2 rounded">
                <span>Total Current Liabilities</span>
                <span>{formatCurrency(totalCurrentLiabilities)}</span>
              </div>
            </div>

            {/* Long-term Liabilities */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Long-term Liabilities</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(balanceSheetData.liabilities.longTerm).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-sm">{name}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold text-sm bg-orange-50 dark:bg-orange-900/20 px-2 rounded">
                <span>Total Long-term Liabilities</span>
                <span>{formatCurrency(totalLongTermLiabilities)}</span>
              </div>
            </div>

            {/* Total Liabilities */}
            <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
              <div className="flex justify-between font-bold">
                <span>TOTAL LIABILITIES</span>
                <span className="text-orange-700">{formatCurrency(totalLiabilities)}</span>
              </div>
            </div>

            {/* Equity */}
            <div>
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Owner's Equity</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(balanceSheetData.equity).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-sm">{name}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold text-sm bg-green-50 dark:bg-green-900/20 px-2 rounded">
                <span>Total Equity</span>
                <span>{formatCurrency(totalEquity)}</span>
              </div>
            </div>

            {/* Total Liabilities & Equity */}
            <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30">
              <div className="flex justify-between font-bold text-lg">
                <span>TOTAL LIABILITIES & EQUITY</span>
                <span className="text-green-700">{formatCurrency(totalLiabilitiesAndEquity)}</span>
              </div>
            </div>

            {/* Balance Check */}
            {totalAssets === totalLiabilitiesAndEquity ? (
              <div className="p-3 rounded-lg bg-green-50 border border-green-200 text-center">
                <p className="text-sm text-green-700 font-medium">
                  Balance Sheet is balanced
                </p>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-center">
                <p className="text-sm text-red-700 font-medium">
                  Warning: Balance Sheet is not balanced
                </p>
                <p className="text-xs text-red-600">
                  Difference: {formatCurrency(Math.abs(totalAssets - totalLiabilitiesAndEquity))}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
