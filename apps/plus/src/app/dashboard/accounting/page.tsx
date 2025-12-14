"use client";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  BookOpen,
  FileText,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
} from "lucide-react";

const stats = {
  revenue: 125000,
  expenses: 78500,
  netIncome: 46500,
  assets: 450000,
  liabilities: 180000,
  equity: 270000,
};

const recentTransactions = [
  { id: 1, date: "Dec 14", description: "Fuel Sales Revenue", debit: null, credit: 15000, account: "Sales Revenue" },
  { id: 2, date: "Dec 14", description: "Fuel Purchase", debit: 8500, credit: null, account: "Inventory" },
  { id: 3, date: "Dec 13", description: "Salary Payment", debit: 12000, credit: null, account: "Salaries Expense" },
  { id: 4, date: "Dec 13", description: "Customer Payment Received", debit: null, credit: 5000, account: "Accounts Receivable" },
  { id: 5, date: "Dec 12", description: "Utility Bill", debit: 850, credit: null, account: "Utilities Expense" },
];

const quickLinks = [
  { title: "Chart of Accounts", description: "Manage account categories", href: "/dashboard/accounting/accounts", icon: Scale },
  { title: "Journal Entries", description: "Record transactions", href: "/dashboard/accounting/journal", icon: BookOpen },
  { title: "Profit & Loss", description: "View income statement", href: "/dashboard/accounting/pnl", icon: TrendingUp },
  { title: "Balance Sheet", description: "Assets & liabilities", href: "/dashboard/accounting/balance-sheet", icon: FileText },
];

export default function AccountingPage() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-SL", {
      style: "currency",
      currency: "SLE",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Accounting</h1>
          <p className="text-muted-foreground">
            Financial overview and management
          </p>
        </div>
        <Link href="/dashboard/accounting/journal/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Journal Entry
          </Button>
        </Link>
      </div>

      {/* Financial Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
            <DollarSign className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(stats.revenue)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Expenses (MTD)</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(stats.expenses)}</div>
            <p className="text-xs text-muted-foreground flex items-center mt-1">
              <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
              -5% from last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Net Income (MTD)</CardTitle>
            <PieChart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.netIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              37.2% profit margin
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance Sheet Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <Scale className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(stats.assets)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Liabilities</CardTitle>
            <Scale className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatCurrency(stats.liabilities)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Owner's Equity</CardTitle>
            <Scale className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(stats.equity)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Navigate to accounting modules</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {quickLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <link.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{link.title}</p>
                      <p className="text-xs text-muted-foreground">{link.description}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest journal entries</CardDescription>
              </div>
              <Link href="/dashboard/accounting/journal">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.date} • {tx.account}</p>
                  </div>
                  <div className="text-right">
                    {tx.debit && (
                      <p className="text-sm font-medium text-red-600">-{formatCurrency(tx.debit)}</p>
                    )}
                    {tx.credit && (
                      <p className="text-sm font-medium text-green-600">+{formatCurrency(tx.credit)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
