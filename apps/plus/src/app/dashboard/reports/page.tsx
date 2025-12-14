"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  RefreshCw,
  Fuel,
  Users,
  Download,
  Calendar,
  Loader2,
  ArrowRight,
  CreditCard,
  Receipt,
  PieChart,
  Clock,
} from "lucide-react";
import { reportsService } from "@/lib/reports/reports.service";
import type {
  TimePeriod,
  ReportSummary,
  RevenueData,
  InvoiceReport,
  SubscriptionReport,
} from "@/lib/reports/types";

const TIME_PERIODS: { value: TimePeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "this_quarter", label: "This Quarter" },
  { value: "this_year", label: "This Year" },
];

function formatCurrency(amount: number, _currency = "SLE"): string {
  return `NLe ${new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<TimePeriod>("this_month");
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [invoiceReport, setInvoiceReport] = useState<InvoiceReport | null>(null);
  const [subscriptionReport, setSubscriptionReport] = useState<SubscriptionReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [period]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const [summaryData, invoiceData, subscriptionData] = await Promise.all([
        reportsService.getSummary(period),
        reportsService.getInvoiceReport(period),
        reportsService.getSubscriptionReport(period),
      ]);
      setSummary(summaryData);
      setInvoiceReport(invoiceData);
      setSubscriptionReport(subscriptionData);
    } catch (error) {
      console.error("Failed to load reports:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Track your business performance and insights
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as TimePeriod)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {summary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.total_revenue)}
              </div>
              <div className={`text-xs flex items-center gap-1 ${
                summary.growth_rate >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {summary.growth_rate >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercent(summary.growth_rate)} vs previous period
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.total_expenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                {summary.transaction_count} transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Income</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${
                summary.net_income >= 0 ? "text-green-600" : "text-red-600"
              }`}>
                {formatCurrency(summary.net_income)}
              </div>
              <p className="text-xs text-muted-foreground">
                Revenue minus expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
              <Receipt className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(summary.average_transaction)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per transaction average
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Invoice & Subscription Reports */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Invoice Report */}
        {invoiceReport && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Invoices
                  </CardTitle>
                  <CardDescription>Invoice performance overview</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/reports/invoices">
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Invoiced</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(invoiceReport.total_invoiced)}
                  </p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">Collected</p>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(invoiceReport.total_collected)}
                  </p>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Collection Rate</span>
                  <span className="font-medium">
                    {invoiceReport.total_invoiced > 0
                      ? Math.round(
                          (invoiceReport.total_collected / invoiceReport.total_invoiced) * 100
                        )
                      : 0}%
                  </span>
                </div>
                <Progress
                  value={
                    invoiceReport.total_invoiced > 0
                      ? (invoiceReport.total_collected / invoiceReport.total_invoiced) * 100
                      : 0
                  }
                  className="h-2"
                />
              </div>

              <div className="flex justify-between pt-2 border-t">
                <div>
                  <p className="text-sm text-muted-foreground">Outstanding</p>
                  <p className="font-medium">
                    {formatCurrency(invoiceReport.outstanding)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-red-500">Overdue</p>
                  <p className="font-medium text-red-600">
                    {formatCurrency(invoiceReport.overdue)}
                  </p>
                </div>
              </div>

              {/* Aging breakdown */}
              <div className="pt-2 border-t">
                <p className="text-sm font-medium mb-2">Aging Analysis</p>
                <div className="grid grid-cols-5 gap-1 text-xs">
                  <div className="text-center">
                    <p className="text-muted-foreground">Current</p>
                    <p className="font-medium">{formatCurrency(invoiceReport.aging.current)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">1-30</p>
                    <p className="font-medium">{formatCurrency(invoiceReport.aging['1_30'])}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">31-60</p>
                    <p className="font-medium">{formatCurrency(invoiceReport.aging['31_60'])}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">61-90</p>
                    <p className="font-medium">{formatCurrency(invoiceReport.aging['61_90'])}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-red-500">90+</p>
                    <p className="font-medium text-red-600">{formatCurrency(invoiceReport.aging['90_plus'])}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Subscription Report */}
        {subscriptionReport && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5" />
                    Subscriptions
                  </CardTitle>
                  <CardDescription>Recurring revenue metrics</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/dashboard/reports/subscriptions">
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-primary/5 rounded-lg">
                  <p className="text-sm text-muted-foreground">MRR</p>
                  <p className="text-xl font-bold text-primary">
                    {formatCurrency(subscriptionReport.mrr)}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">ARR</p>
                  <p className="text-xl font-bold">
                    {formatCurrency(subscriptionReport.arr)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {subscriptionReport.new_subscribers}
                  </p>
                  <p className="text-xs text-muted-foreground">New</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {subscriptionReport.total_subscribers}
                  </p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {subscriptionReport.churned_subscribers}
                  </p>
                  <p className="text-xs text-muted-foreground">Churned</p>
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Churn Rate</span>
                  <Badge variant={subscriptionReport.churn_rate > 5 ? "destructive" : "secondary"}>
                    {subscriptionReport.churn_rate}%
                  </Badge>
                </div>
              </div>

              {/* By plan */}
              {subscriptionReport.by_plan.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2">Revenue by Plan</p>
                  <div className="space-y-2">
                    {subscriptionReport.by_plan.slice(0, 3).map((plan) => (
                      <div key={plan.plan} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{plan.plan}</span>
                        <span className="font-medium">
                          {formatCurrency(plan.mrr)}/mo ({plan.subscribers})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Report Categories */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/reports/transactions">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">Transactions</h3>
                <p className="text-sm text-muted-foreground">
                  Money flow analysis
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/reports/fuel">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Fuel className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <h3 className="font-medium">Fuel Sales</h3>
                <p className="text-sm text-muted-foreground">
                  Station performance
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/reports/customers">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">Customers</h3>
                <p className="text-sm text-muted-foreground">
                  Customer analytics
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/reports/scheduled">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Scheduled Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Automated reporting
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
