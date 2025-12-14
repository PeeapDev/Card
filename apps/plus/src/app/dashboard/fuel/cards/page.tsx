"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CreditCard,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  DollarSign,
  Ban,
  RefreshCw,
  Wallet,
  User,
  Building2,
  Clock,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelCard, FuelCardType, FuelCardStatus } from "@/lib/fuel/types";

export default function FuelCardsPage() {
  const [cards, setCards] = useState<FuelCard[]>([]);
  const [filteredCards, setFilteredCards] = useState<FuelCard[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCards();
  }, []);

  useEffect(() => {
    let filtered = cards;

    if (searchQuery) {
      filtered = filtered.filter(
        (card) =>
          card.card_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          card.holder_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((card) => card.card_type === typeFilter);
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((card) => card.status === statusFilter);
    }

    setFilteredCards(filtered);
  }, [searchQuery, typeFilter, statusFilter, cards]);

  const loadCards = async () => {
    try {
      const data = await fuelService.getFuelCards();
      setCards(data);
      setFilteredCards(data);
    } catch (error) {
      console.error("Error loading fuel cards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NLe ${new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getCardTypeIcon = (type: FuelCardType) => {
    switch (type) {
      case "prepaid":
        return <Wallet className="h-4 w-4" />;
      case "fleet":
        return <Building2 className="h-4 w-4" />;
      case "staff":
        return <User className="h-4 w-4" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getCardTypeColor = (type: FuelCardType) => {
    switch (type) {
      case "prepaid":
        return "bg-blue-100 text-blue-800";
      case "fleet":
        return "bg-purple-100 text-purple-800";
      case "staff":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
    }
  };

  const getStatusColor = (status: FuelCardStatus) => {
    switch (status) {
      case "active":
        return "default";
      case "blocked":
        return "destructive";
      case "expired":
        return "secondary";
      case "cancelled":
        return "outline";
      default:
        return "secondary";
    }
  };

  // Calculate summary stats
  const totalBalance = cards.reduce((sum, c) => sum + c.balance, 0);
  const activeCards = cards.filter((c) => c.status === "active");
  const prepaidCards = cards.filter((c) => c.card_type === "prepaid");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fuel Cards</h1>
          <p className="text-muted-foreground">
            Issue and manage prepaid, fleet, and staff fuel cards
          </p>
        </div>
        <Link href="/dashboard/fuel/cards/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Issue Card
          </Button>
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cards</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cards.length}</div>
            <p className="text-xs text-muted-foreground">
              {activeCards.length} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalBalance)}</div>
            <p className="text-xs text-muted-foreground">Across all cards</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prepaid Cards</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{prepaidCards.length}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(prepaidCards.reduce((s, c) => s + c.balance, 0))} balance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fleet Cards</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {cards.filter((c) => c.card_type === "fleet").length}
            </div>
            <p className="text-xs text-muted-foreground">Corporate cards</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by card number or holder..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Card Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="fleet">Fleet</SelectItem>
                <SelectItem value="staff">Staff</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Cards Table */}
      {filteredCards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <CreditCard className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "No cards found"
                : "No Fuel Cards Yet"}
            </h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {searchQuery || typeFilter !== "all" || statusFilter !== "all"
                ? "Try adjusting your filters"
                : "Issue fuel cards to enable prepaid and fleet fuel purchases."}
            </p>
            {!searchQuery && typeFilter === "all" && statusFilter === "all" && (
              <Link href="/dashboard/fuel/cards/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Issue First Card
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Card</TableHead>
                <TableHead>Holder</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Limits</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCards.map((card) => (
                <TableRow key={card.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-800 to-gray-600 flex items-center justify-center">
                        <CreditCard className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-mono font-medium">{card.card_number}</p>
                        {card.expires_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Exp: {formatDate(card.expires_at)}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm">{card.holder_name || "Unassigned"}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {card.holder_type?.replace(/_/g, " ") || "-"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getCardTypeColor(card.card_type)}>
                      <span className="flex items-center gap-1">
                        {getCardTypeIcon(card.card_type)}
                        {card.card_type}
                      </span>
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{formatCurrency(card.balance)}</p>
                    {card.credit_limit > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Credit: {formatCurrency(card.credit_limit)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs space-y-0.5">
                      {card.daily_limit && (
                        <p>Daily: {formatCurrency(card.daily_limit)}</p>
                      )}
                      {card.monthly_limit && (
                        <p>Monthly: {formatCurrency(card.monthly_limit)}</p>
                      )}
                      {!card.daily_limit && !card.monthly_limit && (
                        <p className="text-muted-foreground">No limits</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(card.status) as any}>
                      {card.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/fuel/cards/${card.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/fuel/cards/${card.id}/topup`}>
                            <DollarSign className="h-4 w-4 mr-2" />
                            Top Up
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/fuel/cards/${card.id}/transactions`}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Transactions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Ban className="h-4 w-4 mr-2" />
                          Block Card
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
