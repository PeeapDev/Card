"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Droplets,
  DollarSign,
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, FuelTank, FuelSale, StationDashboardStats } from "@/lib/fuel/types";

interface ReconciliationData {
  date: string;
  station: FuelStation;
  tanks: Array<{
    tank: FuelTank;
    openingLevel: number;
    deliveries: number;
    theoreticalUsage: number;
    actualLevel: number;
    variance: number;
    variancePercent: number;
  }>;
  sales: {
    total: number;
    liters: number;
    transactions: number;
    byPaymentMethod: Record<string, number>;
  };
  status: "draft" | "completed";
}

export default function ReconciliationPage() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [dashboardStats, setDashboardStats] = useState<StationDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dippingReadings, setDippingReadings] = useState<Record<string, string>>({});

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadReconciliationData();
    }
  }, [selectedStation, selectedDate]);

  const loadStations = async () => {
    try {
      const data = await fuelService.getStations();
      setStations(data);
      if (data.length > 0) {
        setSelectedStation(data[0].id);
      }
    } catch (error) {
      console.error("Error loading stations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReconciliationData = async () => {
    if (!selectedStation) return;

    try {
      setIsLoading(true);
      const [tanksData, statsData] = await Promise.all([
        fuelService.getTanks(selectedStation),
        fuelService.getStationDashboard(selectedStation),
      ]);
      setTanks(tanksData);
      setDashboardStats(statsData);

      // Initialize dipping readings with current tank levels
      const readings: Record<string, string> = {};
      tanksData.forEach((tank) => {
        readings[tank.id] = tank.current_level_liters.toString();
      });
      setDippingReadings(readings);
    } catch (error) {
      console.error("Error loading reconciliation data:", error);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-GH").format(num);
  };

  const handleDippingChange = (tankId: string, value: string) => {
    setDippingReadings((prev) => ({
      ...prev,
      [tankId]: value,
    }));
  };

  // Calculate variances for each tank
  const calculateTankReconciliation = (tank: FuelTank) => {
    const actualLevel = parseFloat(dippingReadings[tank.id]) || tank.current_level_liters;
    const systemLevel = tank.current_level_liters;
    const variance = actualLevel - systemLevel;
    const variancePercent = systemLevel > 0 ? (variance / systemLevel) * 100 : 0;

    return {
      systemLevel,
      actualLevel,
      variance,
      variancePercent,
    };
  };

  const totalVarianceLiters = tanks.reduce((sum, tank) => {
    const { variance } = calculateTankReconciliation(tank);
    return sum + variance;
  }, 0);

  const hasSignificantVariance = tanks.some((tank) => {
    const { variancePercent } = calculateTankReconciliation(tank);
    return Math.abs(variancePercent) > 1; // More than 1% variance
  });

  if (isLoading && stations.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fuel/inventory">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Daily Reconciliation</h1>
          <p className="text-muted-foreground">
            Compare system records with physical stock counts
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label>Station</Label>
              <Select value={selectedStation} onValueChange={setSelectedStation}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={station.id}>
                      {station.name} ({station.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="pl-9 w-[200px]"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <Button variant="outline" onClick={loadReconciliationData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(dashboardStats?.today_sales || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats?.today_transactions || 0} transactions
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
              {formatNumber(dashboardStats?.today_liters || 0)}L
            </div>
            <p className="text-xs text-muted-foreground">All fuel types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Variance</CardTitle>
            {totalVarianceLiters >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                totalVarianceLiters >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {totalVarianceLiters >= 0 ? "+" : ""}
              {formatNumber(totalVarianceLiters)}L
            </div>
            <p className="text-xs text-muted-foreground">Actual vs system</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            {hasSignificantVariance ? (
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-green-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasSignificantVariance ? (
                <Badge variant="destructive">Review Needed</Badge>
              ) : (
                <Badge variant="default" className="bg-green-600">
                  Balanced
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {hasSignificantVariance ? "Variance > 1%" : "Within tolerance"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tank Reconciliation */}
      <Card>
        <CardHeader>
          <CardTitle>Tank Inventory Reconciliation</CardTitle>
          <CardDescription>
            Enter actual dip readings to compare with system levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tanks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Droplets className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No tanks found for this station</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tank</TableHead>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead className="text-right">System Level</TableHead>
                  <TableHead className="text-right">Actual Dip Reading</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tanks.map((tank) => {
                  const recon = calculateTankReconciliation(tank);
                  const isOK = Math.abs(recon.variancePercent) <= 1;

                  return (
                    <TableRow key={tank.id}>
                      <TableCell className="font-medium">{tank.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: tank.fuel_type?.color || "#6B7280" }}
                          />
                          {tank.fuel_type?.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatNumber(recon.systemLevel)}L
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="relative inline-block">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            max={tank.capacity_liters}
                            value={dippingReadings[tank.id] || ""}
                            onChange={(e) => handleDippingChange(tank.id, e.target.value)}
                            className="w-32 text-right pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                            L
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div
                          className={`font-medium ${
                            recon.variance >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {recon.variance >= 0 ? "+" : ""}
                          {formatNumber(recon.variance)}L
                        </div>
                        <div
                          className={`text-xs ${
                            recon.variance >= 0 ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          ({recon.variancePercent >= 0 ? "+" : ""}
                          {recon.variancePercent.toFixed(2)}%)
                        </div>
                      </TableCell>
                      <TableCell>
                        {isOK ? (
                          <Badge variant="outline" className="border-green-500 text-green-600">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            OK
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Review
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sales by Payment Method */}
      {dashboardStats && (
        <Card>
          <CardHeader>
            <CardTitle>Sales Summary by Payment Method</CardTitle>
            <CardDescription>
              Breakdown of today's sales for cash reconciliation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
              {dashboardStats.sales_by_payment?.map((payment) => (
                <div key={payment.method} className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground capitalize mb-1">
                    {payment.method}
                  </p>
                  <p className="text-lg font-bold">{formatCurrency(payment.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {payment.count} transactions
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sales by Fuel Type */}
      {dashboardStats && dashboardStats.sales_by_fuel_type && dashboardStats.sales_by_fuel_type.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sales by Fuel Type</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuel Type</TableHead>
                  <TableHead className="text-right">Liters Sold</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dashboardStats.sales_by_fuel_type.map((item) => (
                  <TableRow key={item.fuel_type_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        {item.fuel_type}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatNumber(item.liters)}L
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <Button className="flex-1">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Submit Reconciliation
            </Button>
            <Button variant="outline">Export Report</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
