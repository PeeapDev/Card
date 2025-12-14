"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Search,
  RefreshCw,
  MoreHorizontal,
  Eye,
  Pause,
  Play,
  XCircle,
  DollarSign,
  Loader2,
  TrendingUp,
  TrendingDown,
  Users,
  AlertCircle,
  Clock,
  Calendar,
} from "lucide-react";
import { subscriptionService } from "@/lib/subscriptions/subscription.service";
import type { Subscription, SubscriptionStatus, SubscriptionDashboardStats } from "@/lib/subscriptions/types";

const statusColors: Record<SubscriptionStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  paused: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  past_due: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  trialing: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  expired: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
};

const statusLabels: Record<SubscriptionStatus, string> = {
  active: "Active",
  paused: "Paused",
  cancelled: "Cancelled",
  past_due: "Past Due",
  trialing: "Trialing",
  expired: "Expired",
};

function formatCurrency(amount: number, _currency = "SLE"): string {
  return `NLe ${new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatInterval(interval: string, count: number): string {
  const labels: Record<string, string> = {
    daily: count === 1 ? "day" : "days",
    weekly: count === 1 ? "week" : "weeks",
    monthly: count === 1 ? "month" : "months",
    quarterly: count === 1 ? "quarter" : "quarters",
    yearly: count === 1 ? "year" : "years",
  };
  return count === 1 ? labels[interval] : `${count} ${labels[interval]}`;
}

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadSubscriptions();
  }, [statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      const [subsData, statsData] = await Promise.all([
        subscriptionService.getSubscriptions(),
        subscriptionService.getDashboard(),
      ]);
      setSubscriptions(subsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    try {
      const filters: { status?: SubscriptionStatus; search?: string } = {};
      if (statusFilter && statusFilter !== "all") {
        filters.status = statusFilter as SubscriptionStatus;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }
      const data = await subscriptionService.getSubscriptions(filters);
      setSubscriptions(data);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
    }
  };

  const handlePause = async (subscriptionId: string) => {
    try {
      await subscriptionService.pauseSubscription(subscriptionId);
      loadSubscriptions();
    } catch (error) {
      console.error("Failed to pause subscription:", error);
    }
  };

  const handleResume = async (subscriptionId: string) => {
    try {
      await subscriptionService.resumeSubscription(subscriptionId);
      loadSubscriptions();
    } catch (error) {
      console.error("Failed to resume subscription:", error);
    }
  };

  const handleCancel = async (subscriptionId: string) => {
    if (!confirm("Are you sure you want to cancel this subscription?")) return;
    try {
      await subscriptionService.cancelSubscription(subscriptionId);
      loadSubscriptions();
      const statsData = await subscriptionService.getDashboard();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to cancel subscription:", error);
    }
  };

  if (isLoading) {
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
          <h1 className="text-2xl font-bold">Subscriptions</h1>
          <p className="text-muted-foreground">
            Manage recurring payments and subscription plans
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/subscriptions/plans">
              Manage Plans
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/subscriptions/new">
              <Plus className="h-4 w-4 mr-2" />
              New Subscription
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Recurring Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.mrr)}
              </div>
              <p className="text-xs text-muted-foreground">
                ARR: {formatCurrency(stats.arr)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active_subscriptions}
              </div>
              <div className="flex gap-2 mt-1">
                {stats.trialing_subscriptions > 0 && (
                  <Badge variant="outline" className="text-xs text-blue-600">
                    {stats.trialing_subscriptions} trialing
                  </Badge>
                )}
                {stats.paused_subscriptions > 0 && (
                  <Badge variant="outline" className="text-xs text-yellow-600">
                    {stats.paused_subscriptions} paused
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month Revenue</CardTitle>
              {stats.revenue_growth >= 0 ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.this_month_revenue)}
              </div>
              <p className={`text-xs ${stats.revenue_growth >= 0 ? "text-green-600" : "text-red-600"}`}>
                {stats.revenue_growth >= 0 ? "+" : ""}{stats.revenue_growth}% vs last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.churn_rate}%
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.cancelled_subscriptions} cancelled total
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Upcoming Renewals Alert */}
      {stats && stats.upcoming_renewals.length > 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium">Upcoming Renewals</p>
                <p className="text-sm text-muted-foreground">
                  {stats.upcoming_renewals.length} subscription{stats.upcoming_renewals.length !== 1 ? "s" : ""} renewing in the next 7 days
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Next Billing</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <RefreshCw className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No subscriptions found</p>
                    <Button asChild className="mt-4" variant="outline">
                      <Link href="/dashboard/subscriptions/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Create your first subscription
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                subscriptions.map((subscription) => (
                  <TableRow key={subscription.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{subscription.customer_name}</p>
                        {subscription.customer_email && (
                          <p className="text-xs text-muted-foreground">
                            {subscription.customer_email}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {subscription.plan?.name || "Custom"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Every {formatInterval(subscription.billing_interval, subscription.billing_interval_count)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {formatCurrency(subscription.amount, subscription.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-muted-foreground" />
                        <span
                          className={
                            new Date(subscription.next_billing_date) < new Date()
                              ? "text-red-600 font-medium"
                              : ""
                          }
                        >
                          {formatDate(subscription.next_billing_date)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[subscription.status]}>
                        {statusLabels[subscription.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/subscriptions/${subscription.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          {subscription.status === "active" && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/subscriptions/${subscription.id}/payment`}>
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Record Payment
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handlePause(subscription.id)}>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </DropdownMenuItem>
                            </>
                          )}
                          {subscription.status === "paused" && (
                            <DropdownMenuItem onClick={() => handleResume(subscription.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {subscription.status !== "cancelled" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleCancel(subscription.id)}
                            >
                              <XCircle className="h-4 w-4 mr-2" />
                              Cancel
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/subscriptions/plans">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <RefreshCw className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">Subscription Plans</h3>
                <p className="text-sm text-muted-foreground">
                  Create and manage reusable subscription plans
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/subscriptions/reports">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Revenue Reports</h3>
                <p className="text-sm text-muted-foreground">
                  View MRR, churn, and revenue analytics
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
