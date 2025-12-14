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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Fuel,
  DollarSign,
  Droplets,
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
  Loader2,
  Store,
  CreditCard,
  Users,
  Gauge,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, StationDashboardStats } from "@/lib/fuel/types";

interface FuelReport {
  stations: FuelStation[];
  stationStats: Record<string, StationDashboardStats>;
  totals: {
    sales: number;
    liters: number;
    transactions: number;
    cashSales: number;
    cardSales: number;
    qrSales: number;
    fleetSales: number;
    prepaidSales: number;
    mobileSales: number;
  };
}

export default function FuelReportsPage() {
  const [period, setPeriod] = useState<string>("today");
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [report, setReport] = useState<FuelReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadReport();
  }, [period, selectedStation]);

  const loadReport = async () => {
    setIsLoading(true);
    try {
      const stations = await fuelService.getStations();
      const stationStats: Record<string, StationDashboardStats> = {};

      const totals = {
        sales: 0,
        liters: 0,
        transactions: 0,
        cashSales: 0,
        cardSales: 0,
        qrSales: 0,
        fleetSales: 0,
        prepaidSales: 0,
        mobileSales: 0,
      };

      for (const station of stations) {
        if (selectedStation === "all" || selectedStation === station.id) {
          const stats = await fuelService.getStationDashboard(station.id);
          stationStats[station.id] = stats;

          totals.sales += stats.today_sales;
          totals.liters += stats.today_liters;
          totals.transactions += stats.today_transactions;

          stats.sales_by_payment?.forEach(p => {
            if (p.method === "cash") totals.cashSales += p.amount;
            else if (p.method === "peeap_card") totals.cardSales += p.amount;
            else if (p.method === "qr") totals.qrSales += p.amount;
            else if (p.method === "fleet") totals.fleetSales += p.amount;
            else if (p.method === "prepaid") totals.prepaidSales += p.amount;
            else if (p.method === "mobile") totals.mobileSales += p.amount;
          });
        }
      }

      setReport({ stations, stationStats, totals });
    } catch (error) {
      console.error("Failed to load fuel report:", error);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en").format(num);
  };

  if (isLoading && !report) {
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
        <div className="flex items-center gap-4">
          <Link href="/dashboard/reports">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Fuel className="h-6 w-6 text-orange-500" />
              Fuel Sales Report
            </h1>
            <p className="text-muted-foreground">
              Detailed fuel station performance analytics
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={selectedStation} onValueChange={setSelectedStation}>
            <SelectTrigger className="w-[200px]">
              <Store className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Stations</SelectItem>
              {report?.stations.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {report && (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(report.totals.sales)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {report.totals.transactions} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Liters Sold</CardTitle>
                <Droplets className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatNumber(report.totals.liters)}L
                </div>
                <p className="text-xs text-muted-foreground">
                  All fuel types combined
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Per Transaction</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(
                    report.totals.transactions > 0
                      ? report.totals.sales / report.totals.transactions
                      : 0
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average sale amount
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Stations</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {report.stations.filter((s) => s.status === "active").length}
                </div>
                <p className="text-xs text-muted-foreground">
                  of {report.stations.length} total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Sales by Payment Method */}
          <Card>
            <CardHeader>
              <CardTitle>Sales by Payment Method</CardTitle>
              <CardDescription>Breakdown of revenue by payment type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Cash</span>
                  </div>
                  <p className="text-xl font-bold text-green-700">
                    {formatCurrency(report.totals.cashSales)}
                  </p>
                  <p className="text-xs text-green-600">
                    {report.totals.sales > 0
                      ? ((report.totals.cashSales / report.totals.sales) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Card</span>
                  </div>
                  <p className="text-xl font-bold text-blue-700">
                    {formatCurrency(report.totals.cardSales)}
                  </p>
                  <p className="text-xs text-blue-600">
                    {report.totals.sales > 0
                      ? ((report.totals.cardSales / report.totals.sales) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Gauge className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">QR</span>
                  </div>
                  <p className="text-xl font-bold text-purple-700">
                    {formatCurrency(report.totals.qrSales)}
                  </p>
                  <p className="text-xs text-purple-600">
                    {report.totals.sales > 0
                      ? ((report.totals.qrSales / report.totals.sales) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-orange-600" />
                    <span className="text-sm font-medium text-orange-800">Fleet</span>
                  </div>
                  <p className="text-xl font-bold text-orange-700">
                    {formatCurrency(report.totals.fleetSales)}
                  </p>
                  <p className="text-xs text-orange-600">
                    {report.totals.sales > 0
                      ? ((report.totals.fleetSales / report.totals.sales) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>

                <div className="p-4 bg-cyan-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-4 w-4 text-cyan-600" />
                    <span className="text-sm font-medium text-cyan-800">Prepaid</span>
                  </div>
                  <p className="text-xl font-bold text-cyan-700">
                    {formatCurrency(report.totals.prepaidSales)}
                  </p>
                  <p className="text-xs text-cyan-600">
                    {report.totals.sales > 0
                      ? ((report.totals.prepaidSales / report.totals.sales) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>

                <div className="p-4 bg-pink-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-pink-600" />
                    <span className="text-sm font-medium text-pink-800">Mobile</span>
                  </div>
                  <p className="text-xl font-bold text-pink-700">
                    {formatCurrency(report.totals.mobileSales)}
                  </p>
                  <p className="text-xs text-pink-600">
                    {report.totals.sales > 0
                      ? ((report.totals.mobileSales / report.totals.sales) * 100).toFixed(1)
                      : 0}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Station Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Station Performance</CardTitle>
              <CardDescription>Sales comparison across stations</CardDescription>
            </CardHeader>
            <CardContent>
              {report.stations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No stations found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Station</TableHead>
                      <TableHead className="text-right">Sales</TableHead>
                      <TableHead className="text-right">Liters</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Active Shifts</TableHead>
                      <TableHead className="text-right">Low Stock</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.stations.map((station) => {
                      const stats = report.stationStats[station.id];
                      if (!stats) return null;

                      return (
                        <TableRow key={station.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                                <Fuel className="h-5 w-5 text-orange-600" />
                              </div>
                              <div>
                                <p className="font-medium">{station.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {station.code}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(stats.today_sales)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatNumber(stats.today_liters)}L
                          </TableCell>
                          <TableCell className="text-right">
                            {stats.today_transactions}
                          </TableCell>
                          <TableCell className="text-right">
                            {stats.active_shifts}
                          </TableCell>
                          <TableCell className="text-right">
                            {stats.low_stock_tanks > 0 ? (
                              <Badge variant="destructive">{stats.low_stock_tanks}</Badge>
                            ) : (
                              <Badge variant="outline">0</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={station.status === "active" ? "default" : "secondary"}
                            >
                              {station.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Fuel Type Breakdown */}
          {Object.keys(report.stationStats).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sales by Fuel Type</CardTitle>
                <CardDescription>Volume and revenue per fuel type</CardDescription>
              </CardHeader>
              <CardContent>
                {(() => {
                  // Aggregate sales by fuel type across all stations
                  const fuelTypeSales: Record<
                    string,
                    { name: string; color: string; liters: number; amount: number }
                  > = {};

                  Object.values(report.stationStats).forEach((stats) => {
                    stats.sales_by_fuel_type?.forEach((sale) => {
                      if (!fuelTypeSales[sale.fuel_type_id]) {
                        fuelTypeSales[sale.fuel_type_id] = {
                          name: sale.fuel_type,
                          color: sale.color,
                          liters: 0,
                          amount: 0,
                        };
                      }
                      fuelTypeSales[sale.fuel_type_id].liters += sale.liters;
                      fuelTypeSales[sale.fuel_type_id].amount += sale.amount;
                    });
                  });

                  const fuelTypes = Object.values(fuelTypeSales);

                  if (fuelTypes.length === 0) {
                    return (
                      <div className="text-center py-8 text-muted-foreground">
                        No sales data available
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {fuelTypes.map((fuel) => {
                        const percentage =
                          report.totals.sales > 0
                            ? (fuel.amount / report.totals.sales) * 100
                            : 0;

                        return (
                          <div key={fuel.name} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: fuel.color }}
                                />
                                <span className="font-medium">{fuel.name}</span>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">{formatCurrency(fuel.amount)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatNumber(fuel.liters)}L
                                </p>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${percentage}%`,
                                  backgroundColor: fuel.color,
                                }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
