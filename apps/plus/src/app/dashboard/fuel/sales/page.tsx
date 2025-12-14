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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Receipt,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Printer,
  DollarSign,
  Droplets,
  Calendar,
  Filter,
  Download,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelSale, FuelStation } from "@/lib/fuel/types";
import { PaymentMethod } from "@/lib/fuel/types";

export default function SalesListPage() {
  const [sales, setSales] = useState<FuelSale[]>([]);
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("today");

  useEffect(() => {
    loadData();
  }, [selectedStation, dateFilter]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [stationsData] = await Promise.all([
        fuelService.getStations(),
      ]);
      setStations(stationsData);

      // Load sales for all stations or selected station
      const stationId = selectedStation !== "all" ? selectedStation : undefined;
      const salesData = await fuelService.getSales(stationId);
      setSales(salesData);
    } catch (error) {
      console.error("Error loading sales:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPaymentMethodBadge = (method: PaymentMethod) => {
    const colors: Record<PaymentMethod, string> = {
      cash: "bg-green-100 text-green-800",
      qr: "bg-blue-100 text-blue-800",
      peeap_card: "bg-purple-100 text-purple-800",
      fleet: "bg-orange-100 text-orange-800",
      prepaid: "bg-pink-100 text-pink-800",
      mobile: "bg-yellow-100 text-yellow-800",
    };
    return colors[method] || "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  };

  const filteredSales = sales.filter((sale) => {
    const matchesSearch =
      sale.receipt_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.vehicle_registration?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPayment =
      selectedPaymentMethod === "all" || sale.payment_method === selectedPaymentMethod;
    return matchesSearch && matchesPayment;
  });

  // Calculate totals
  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total_amount, 0);
  const totalLiters = filteredSales.reduce((sum, sale) => sum + sale.quantity_liters, 0);

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
          <h1 className="text-2xl font-bold tracking-tight">Fuel Sales</h1>
          <p className="text-muted-foreground">
            Track and manage fuel sales transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/dashboard/fuel/sales/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSales)}</div>
            <p className="text-xs text-muted-foreground">
              {filteredSales.length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Liters</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("en-GH").format(totalLiters)}L
            </div>
            <p className="text-xs text-muted-foreground">Fuel dispensed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Sale</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
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
                placeholder="Search by receipt or vehicle..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={selectedStation} onValueChange={setSelectedStation}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Stations" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stations</SelectItem>
                {stations.map((station) => (
                  <SelectItem key={station.id} value={station.id}>
                    {station.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Payment Method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="qr">QR Payment</SelectItem>
                <SelectItem value="peeap_card">Card</SelectItem>
                <SelectItem value="fleet">Fleet Credit</SelectItem>
                <SelectItem value="prepaid">Prepaid</SelectItem>
                <SelectItem value="mobile">Mobile Money</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      {filteredSales.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Sales Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              {searchQuery || selectedPaymentMethod !== "all"
                ? "Try adjusting your filters"
                : "Start recording fuel sales to see them here."}
            </p>
            <Link href="/dashboard/fuel/sales/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Record First Sale
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Receipt</TableHead>
                <TableHead>Station</TableHead>
                <TableHead>Fuel Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell>
                    <div>
                      <p className="font-mono text-sm">{sale.receipt_number || "-"}</p>
                      {sale.vehicle_registration && (
                        <p className="text-xs text-muted-foreground">
                          {sale.vehicle_registration}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{sale.station?.name || "-"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{sale.fuel_type?.name || "-"}</p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">
                      {new Intl.NumberFormat("en-GH").format(sale.quantity_liters)}L
                    </p>
                    <p className="text-xs text-muted-foreground">
                      @ {formatCurrency(sale.price_per_liter)}/L
                    </p>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{formatCurrency(sale.total_amount)}</p>
                    {sale.discount_amount > 0 && (
                      <p className="text-xs text-green-600">
                        -{formatCurrency(sale.discount_amount)} discount
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getPaymentMethodBadge(sale.payment_method)}>
                      {sale.payment_method}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">{formatDate(sale.created_at)}</p>
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
                          <Link href={`/dashboard/fuel/sales/${sale.id}`}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Printer className="h-4 w-4 mr-2" />
                          Print Receipt
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
