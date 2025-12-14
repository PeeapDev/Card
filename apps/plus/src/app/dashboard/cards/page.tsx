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
import { Progress } from "@/components/ui/progress";
import {
  Plus,
  Search,
  CreditCard,
  MoreHorizontal,
  Eye,
  Snowflake,
  Play,
  XCircle,
  Loader2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  AlertCircle,
  Users,
  Settings,
} from "lucide-react";
import { cardService } from "@/lib/cards/card.service";
import type { EmployeeCard, CardStatus, CardDashboardStats } from "@/lib/cards/types";

const statusColors: Record<CardStatus, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  frozen: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

const statusLabels: Record<CardStatus, string> = {
  active: "Active",
  frozen: "Frozen",
  cancelled: "Cancelled",
  pending: "Pending",
  expired: "Expired",
};

function formatCurrency(amount: number, _currency = "SLE"): string {
  return `NLe ${new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

export default function CardsPage() {
  const [cards, setCards] = useState<EmployeeCard[]>([]);
  const [stats, setStats] = useState<CardDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadCards();
  }, [statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      const [cardsData, statsData] = await Promise.all([
        cardService.getCards(),
        cardService.getDashboard(),
      ]);
      setCards(cardsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCards = async () => {
    try {
      const filters: { status?: CardStatus; search?: string } = {};
      if (statusFilter && statusFilter !== "all") {
        filters.status = statusFilter as CardStatus;
      }
      if (searchQuery) {
        filters.search = searchQuery;
      }
      const data = await cardService.getCards(filters);
      setCards(data);
    } catch (error) {
      console.error("Failed to load cards:", error);
    }
  };

  const handleFreeze = async (cardId: string) => {
    try {
      await cardService.freezeCard(cardId);
      loadCards();
    } catch (error) {
      console.error("Failed to freeze card:", error);
    }
  };

  const handleUnfreeze = async (cardId: string) => {
    try {
      await cardService.unfreezeCard(cardId);
      loadCards();
    } catch (error) {
      console.error("Failed to unfreeze card:", error);
    }
  };

  const handleCancel = async (cardId: string) => {
    if (!confirm("Are you sure you want to cancel this card? This cannot be undone.")) return;
    try {
      await cardService.cancelCard(cardId);
      loadCards();
      const statsData = await cardService.getDashboard();
      setStats(statsData);
    } catch (error) {
      console.error("Failed to cancel card:", error);
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
          <h1 className="text-2xl font-bold">Employee Cards</h1>
          <p className="text-muted-foreground">
            Issue and manage expense cards for your team
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/cards/policies">
              <Settings className="h-4 w-4 mr-2" />
              Policies
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/cards/new">
              <Plus className="h-4 w-4 mr-2" />
              Issue Card
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spend This Month</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.total_spend_this_month)}
              </div>
              <div className={`text-xs flex items-center gap-1 ${
                stats.spend_growth >= 0 ? "text-red-600" : "text-green-600"
              }`}>
                {stats.spend_growth >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {Math.abs(stats.spend_growth)}% vs last month
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
              <CreditCard className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.active_cards}
              </div>
              <div className="flex gap-2 mt-1">
                {stats.frozen_cards > 0 && (
                  <Badge variant="outline" className="text-xs text-blue-600">
                    {stats.frozen_cards} frozen
                  </Badge>
                )}
                {stats.pending_cards > 0 && (
                  <Badge variant="outline" className="text-xs text-yellow-600">
                    {stats.pending_cards} pending
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Receipts</CardTitle>
              <Receipt className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.pending_receipts}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting upload from employees
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.pending_approvals}
              </div>
              {stats.pending_approvals > 0 && (
                <Button variant="link" className="h-auto p-0 text-xs" asChild>
                  <Link href="/dashboard/cards/transactions?approval=pending">
                    Review now
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search cards..."
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
                <SelectItem value="frozen">Frozen</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Spending Limit</TableHead>
                <TableHead>Current Spend</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">No cards issued yet</p>
                    <Button asChild className="mt-4" variant="outline">
                      <Link href="/dashboard/cards/new">
                        <Plus className="h-4 w-4 mr-2" />
                        Issue your first card
                      </Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ) : (
                cards.map((card) => {
                  const spendPercent = (card.current_spend / card.spending_limit) * 100;
                  const isOverLimit = spendPercent > 100;
                  const isNearLimit = spendPercent > 80;

                  return (
                    <TableRow key={card.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-6 bg-gradient-to-r from-primary to-primary/70 rounded flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                              {card.card_type === "virtual" ? "V" : "P"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{card.card_name}</p>
                            <p className="text-xs text-muted-foreground">
                              •••• {card.card_number_last4}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{card.employee_name}</p>
                          {card.employee_department && (
                            <p className="text-xs text-muted-foreground">
                              {card.employee_department}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {formatCurrency(card.spending_limit, card.currency)}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            per {card.spending_limit_period}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-sm">
                            <span className={isOverLimit ? "text-red-600 font-medium" : ""}>
                              {formatCurrency(card.current_spend, card.currency)}
                            </span>
                            <span className="text-muted-foreground">
                              {Math.round(spendPercent)}%
                            </span>
                          </div>
                          <Progress
                            value={Math.min(spendPercent, 100)}
                            className={`h-1.5 ${
                              isOverLimit
                                ? "[&>div]:bg-red-500"
                                : isNearLimit
                                ? "[&>div]:bg-yellow-500"
                                : ""
                            }`}
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={statusColors[card.status]}>
                          {statusLabels[card.status]}
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
                              <Link href={`/dashboard/cards/${card.id}`}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/dashboard/cards/${card.id}/transactions`}>
                                <Receipt className="h-4 w-4 mr-2" />
                                Transactions
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {card.status === "active" && (
                              <DropdownMenuItem onClick={() => handleFreeze(card.id)}>
                                <Snowflake className="h-4 w-4 mr-2" />
                                Freeze Card
                              </DropdownMenuItem>
                            )}
                            {card.status === "frozen" && (
                              <DropdownMenuItem onClick={() => handleUnfreeze(card.id)}>
                                <Play className="h-4 w-4 mr-2" />
                                Unfreeze Card
                              </DropdownMenuItem>
                            )}
                            {card.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => handleCancel(card.id)}
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Cancel Card
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/cards/transactions">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Receipt className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-medium">All Transactions</h3>
                <p className="text-sm text-muted-foreground">
                  View and manage card transactions
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/cards/policies">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Settings className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium">Spending Policies</h3>
                <p className="text-sm text-muted-foreground">
                  Configure spending limits and rules
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
          <Link href="/dashboard/cards/reports">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium">Spending Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Analytics and expense insights
                </p>
              </div>
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
