"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  CreditCard,
  FileText,
  RefreshCw,
  Plus,
  TrendingUp,
  TrendingDown,
  Users,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

// Mock data - will be replaced with real API calls
// Using New Leone (NLe) amounts - redenominated currency since July 2022
const stats = {
  walletBalance: 2500,      // NLe 2,500
  monthlyRevenue: 15000,    // NLe 15,000
  revenueChange: 12.5,
  pendingInvoices: 5,
  pendingAmount: 750,       // NLe 750
  activeSubscriptions: 23,
  activeCards: 8,
  employees: 12,
};

const recentTransactions = [
  { id: 1, type: "incoming", description: "Payment from Customer A", amount: 500, date: "Today, 2:30 PM" },
  { id: 2, type: "outgoing", description: "Payout to Supplier B", amount: 250, date: "Today, 11:15 AM" },
  { id: 3, type: "incoming", description: "Invoice #INV-0042 paid", amount: 1200, date: "Yesterday" },
  { id: 4, type: "incoming", description: "Subscription payment", amount: 150, date: "Yesterday" },
  { id: 5, type: "outgoing", description: "Card purchase - Office Supplies", amount: 45, date: "Dec 9" },
];

type UserTier = "basic" | "business" | "business_plus" | "developer";

// Mock function to get user tier - will be replaced with real auth
function getUserTier(): UserTier {
  return "business_plus";
}

export default function DashboardPage() {
  // TODO: Get actual user tier from auth context
  const [userTier] = useState<UserTier>(getUserTier);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here&apos;s your business overview.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <ArrowDownLeft className="mr-2 h-4 w-4" />
            Receive
          </Button>
          <Button>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            Send
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.walletBalance)}</div>
            <p className="text-xs text-muted-foreground">Available for payouts</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            {stats.revenueChange >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              <span className={stats.revenueChange >= 0 ? "text-green-500" : "text-red-500"}>
                {stats.revenueChange >= 0 ? "+" : ""}
                {stats.revenueChange}%
              </span>{" "}
              from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(stats.pendingAmount)} outstanding
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
            <p className="text-xs text-muted-foreground">Recurring customers</p>
          </CardContent>
        </Card>
      </div>

      {/* Business++ Stats */}
      {userTier === "business_plus" && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeCards}</div>
              <p className="text-xs text-muted-foreground">Employee expense cards</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Team Members</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.employees}</div>
              <p className="text-xs text-muted-foreground">With card access</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions & Recent Transactions */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks for your business</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Link href="/dashboard/invoices/new">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Create Invoice
                {userTier === "basic" && (
                  <Badge variant="secondary" className="ml-auto">
                    Business
                  </Badge>
                )}
              </Button>
            </Link>
            <Link href="/dashboard/subscriptions/new">
              <Button variant="outline" className="w-full justify-start">
                <RefreshCw className="mr-2 h-4 w-4" />
                New Subscription Plan
                {userTier === "basic" && (
                  <Badge variant="secondary" className="ml-auto">
                    Business
                  </Badge>
                )}
              </Button>
            </Link>
            {userTier === "business_plus" && (
              <>
                <Link href="/dashboard/cards/issue">
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Issue Employee Card
                  </Button>
                </Link>
                <Link href="/dashboard/employees/new">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Add Employee
                  </Button>
                </Link>
              </>
            )}
            <Link href="/dashboard/checkout/create">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="mr-2 h-4 w-4" />
                Create Checkout Link
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>Your latest payment activity</CardDescription>
            </div>
            <Link href="/dashboard/transactions">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4">
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-full ${
                      tx.type === "incoming" ? "bg-green-100" : "bg-red-100"
                    }`}
                  >
                    {tx.type === "incoming" ? (
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{tx.date}</p>
                  </div>
                  <div
                    className={`text-sm font-medium ${
                      tx.type === "incoming" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {tx.type === "incoming" ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Banner for Basic tier */}
      {userTier === "basic" && (
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="flex items-center justify-between p-6">
            <div>
              <h3 className="font-semibold">Upgrade to Business</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Unlock invoicing, recurring payments, and API access for your business.
              </p>
            </div>
            <Button>
              Upgrade Now
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
