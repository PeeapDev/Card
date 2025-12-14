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
import { Download, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";

const profitLossData = {
  period: "December 2024",
  revenue: {
    "Fuel Sales": 450000,
    "Service Revenue": 35000,
    "Other Income": 8000,
  },
  costOfGoodsSold: {
    "Cost of Goods Sold - Fuel": 280000,
  },
  operatingExpenses: {
    "Salaries & Wages": 85000,
    "Rent Expense": 24000,
    "Utilities": 12000,
    "Depreciation": 18000,
    "Insurance": 8000,
    "Maintenance & Repairs": 6500,
    "Office Supplies": 2000,
    "Marketing": 3500,
  },
  otherExpenses: {
    "Interest Expense": 4500,
    "Bank Charges": 1200,
  },
};

export default function ProfitLossPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("dec-2024");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SL", {
      style: "currency",
      currency: "SLE",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const totalRevenue = Object.values(profitLossData.revenue).reduce((a, b) => a + b, 0);
  const totalCOGS = Object.values(profitLossData.costOfGoodsSold).reduce((a, b) => a + b, 0);
  const grossProfit = totalRevenue - totalCOGS;
  const totalOperatingExpenses = Object.values(profitLossData.operatingExpenses).reduce((a, b) => a + b, 0);
  const operatingIncome = grossProfit - totalOperatingExpenses;
  const totalOtherExpenses = Object.values(profitLossData.otherExpenses).reduce((a, b) => a + b, 0);
  const netIncome = operatingIncome - totalOtherExpenses;

  const grossProfitMargin = ((grossProfit / totalRevenue) * 100).toFixed(1);
  const netProfitMargin = ((netIncome / totalRevenue) * 100).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">
            Income statement for {profitLossData.period}
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dec-2024">December 2024</SelectItem>
              <SelectItem value="nov-2024">November 2024</SelectItem>
              <SelectItem value="q4-2024">Q4 2024</SelectItem>
              <SelectItem value="ytd-2024">YTD 2024</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(grossProfit)}</div>
            <p className="text-xs text-muted-foreground">{grossProfitMargin}% margin</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalCOGS + totalOperatingExpenses + totalOtherExpenses)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netIncome >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(netIncome)}
            </div>
            <p className="text-xs text-muted-foreground">{netProfitMargin}% margin</p>
          </CardContent>
        </Card>
      </div>

      {/* P&L Statement */}
      <Card>
        <CardHeader>
          <CardTitle>Income Statement</CardTitle>
          <CardDescription>For the period ending {profitLossData.period}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Revenue Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-green-700">Revenue</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(profitLossData.revenue).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold border-t-2">
                <span>Total Revenue</span>
                <span className="text-green-600">{formatCurrency(totalRevenue)}</span>
              </div>
            </div>

            {/* Cost of Goods Sold Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-orange-700">Cost of Goods Sold</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(profitLossData.costOfGoodsSold).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium">({formatCurrency(amount)})</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold border-t-2">
                <span>Total COGS</span>
                <span className="text-orange-600">({formatCurrency(totalCOGS)})</span>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex justify-between font-bold text-lg">
                <span>Gross Profit</span>
                <span className="text-blue-600">{formatCurrency(grossProfit)}</span>
              </div>
            </div>

            {/* Operating Expenses Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-red-700">Operating Expenses</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(profitLossData.operatingExpenses).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium">({formatCurrency(amount)})</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold border-t-2">
                <span>Total Operating Expenses</span>
                <span className="text-red-600">({formatCurrency(totalOperatingExpenses)})</span>
              </div>
            </div>

            {/* Operating Income */}
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="flex justify-between font-bold text-lg">
                <span>Operating Income</span>
                <span className="text-purple-600">{formatCurrency(operatingIncome)}</span>
              </div>
            </div>

            {/* Other Expenses Section */}
            <div>
              <h3 className="font-semibold text-lg mb-3 text-gray-700">Other Expenses</h3>
              <div className="space-y-2 pl-4">
                {Object.entries(profitLossData.otherExpenses).map(([name, amount]) => (
                  <div key={name} className="flex justify-between py-1 border-b border-dashed">
                    <span className="text-muted-foreground">{name}</span>
                    <span className="font-medium">({formatCurrency(amount)})</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between py-2 mt-2 font-semibold border-t-2">
                <span>Total Other Expenses</span>
                <span>({formatCurrency(totalOtherExpenses)})</span>
              </div>
            </div>

            {/* Net Income */}
            <div className={`p-4 rounded-lg ${netIncome >= 0 ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"}`}>
              <div className="flex justify-between font-bold text-xl">
                <span>Net Income</span>
                <span className={netIncome >= 0 ? "text-green-700" : "text-red-700"}>
                  {formatCurrency(netIncome)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
