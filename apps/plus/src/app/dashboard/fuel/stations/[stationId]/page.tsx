"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Edit,
  Fuel,
  MapPin,
  Phone,
  Clock,
  DollarSign,
  Droplets,
  Plus,
  Gauge,
  Settings,
  TrendingUp,
  Users,
  AlertTriangle,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, FuelPump, FuelTank, FuelPrice, StationDashboardStats } from "@/lib/fuel/types";

export default function StationDetailPage() {
  const params = useParams();
  const stationId = params.stationId as string;

  const [station, setStation] = useState<FuelStation | null>(null);
  const [pumps, setPumps] = useState<FuelPump[]>([]);
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [stats, setStats] = useState<StationDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (stationId) {
      loadStationData();
    }
  }, [stationId]);

  const loadStationData = async () => {
    try {
      const [stationData, pumpsData, tanksData, pricesData, statsData] = await Promise.all([
        fuelService.getStation(stationId),
        fuelService.getPumps(stationId),
        fuelService.getTanks(stationId),
        fuelService.getCurrentPrices(stationId),
        fuelService.getStationDashboard(stationId),
      ]);

      setStation(stationData);
      setPumps(pumpsData);
      setTanks(tanksData);
      setPrices(pricesData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading station data:", error);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "inactive":
        return "secondary";
      case "maintenance":
        return "outline";
      case "offline":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const getTankLevelColor = (current: number, capacity: number, minimum: number) => {
    const percentage = (current / capacity) * 100;
    if (current <= minimum) return "text-red-600 bg-red-100";
    if (percentage < 30) return "text-orange-600 bg-orange-100";
    return "text-green-600 bg-green-100";
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!station) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/fuel/stations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Station Not Found</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/fuel/stations">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{station.name}</h1>
              <Badge variant={getStatusColor(station.status)}>{station.status}</Badge>
            </div>
            <p className="text-muted-foreground">{station.code}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/fuel/stations/${stationId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Link href={`/dashboard/fuel/sales/new?station=${stationId}`}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.today_sales || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.today_transactions || 0} transactions
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
              {formatNumber(stats?.today_liters || 0)}L
            </div>
            <p className="text-xs text-muted-foreground">Today</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active_shifts || 0}</div>
            <p className="text-xs text-muted-foreground">Staff on duty</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Tanks</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.low_stock_tanks || 0}
            </div>
            <p className="text-xs text-muted-foreground">Need refill</p>
          </CardContent>
        </Card>
      </div>

      {/* Station Info & Tabs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Station Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Station Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              <div>
                <p className="text-sm">{station.address || "No address"}</p>
                <p className="text-xs text-muted-foreground">
                  {station.city}
                  {station.region && `, ${station.region}`}
                </p>
              </div>
            </div>
            {station.contact_phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm">{station.contact_phone}</p>
              </div>
            )}
            {station.operating_hours && (
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="text-sm">
                  <p className="font-medium">Operating Hours</p>
                  <p className="text-xs text-muted-foreground">
                    {JSON.stringify(station.operating_hours)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pumps" className="space-y-4">
            <TabsList>
              <TabsTrigger value="pumps">Pumps ({pumps.length})</TabsTrigger>
              <TabsTrigger value="tanks">Tanks ({tanks.length})</TabsTrigger>
              <TabsTrigger value="pricing">Pricing</TabsTrigger>
            </TabsList>

            {/* Pumps Tab */}
            <TabsContent value="pumps" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Manage fuel dispensing pumps
                </p>
                <Link href={`/dashboard/fuel/stations/${stationId}/pumps/new`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Pump
                  </Button>
                </Link>
              </div>

              {pumps.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Fuel className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No pumps configured</p>
                    <Link href={`/dashboard/fuel/stations/${stationId}/pumps/new`}>
                      <Button size="sm" className="mt-4">
                        Add First Pump
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Pump</TableHead>
                        <TableHead>Fuel Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Meter Reading</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pumps.map((pump) => (
                        <TableRow key={pump.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                                <span className="text-xs font-bold text-primary">
                                  {pump.pump_number}
                                </span>
                              </div>
                              <span className="font-medium">{pump.name}</span>
                            </div>
                          </TableCell>
                          <TableCell>{pump.fuel_type?.name || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(pump.status)}>
                              {pump.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono">
                            {formatNumber(pump.current_meter_reading || 0)}L
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            {/* Tanks Tab */}
            <TabsContent value="tanks" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Monitor fuel storage tanks
                </p>
                <Link href={`/dashboard/fuel/stations/${stationId}/tanks/new`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Tank
                  </Button>
                </Link>
              </div>

              {tanks.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <Gauge className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No tanks configured</p>
                    <Link href={`/dashboard/fuel/stations/${stationId}/tanks/new`}>
                      <Button size="sm" className="mt-4">
                        Add First Tank
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {tanks.map((tank) => {
                    const percentage = (tank.current_level_liters / tank.capacity_liters) * 100;
                    const levelColor = getTankLevelColor(
                      tank.current_level_liters,
                      tank.capacity_liters,
                      tank.minimum_level_liters
                    );

                    return (
                      <Card key={tank.id}>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{tank.name}</CardTitle>
                            {tank.current_level_liters <= tank.minimum_level_liters && (
                              <Badge variant="destructive">Low Stock</Badge>
                            )}
                          </div>
                          <CardDescription>{tank.fuel_type?.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Current Level</span>
                              <span className="font-medium">
                                {formatNumber(tank.current_level_liters)}L
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full ${
                                  percentage > 50
                                    ? "bg-green-500"
                                    : percentage > 25
                                    ? "bg-orange-500"
                                    : "bg-red-500"
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Capacity: {formatNumber(tank.capacity_liters)}L</span>
                              <span>{percentage.toFixed(1)}%</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Pricing Tab */}
            <TabsContent value="pricing" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Current fuel prices at this station
                </p>
                <Link href={`/dashboard/fuel/stations/${stationId}/pricing`}>
                  <Button size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Manage Prices
                  </Button>
                </Link>
              </div>

              {prices.length === 0 ? (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-8">
                    <DollarSign className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No prices set</p>
                    <Link href={`/dashboard/fuel/stations/${stationId}/pricing`}>
                      <Button size="sm" className="mt-4">
                        Set Prices
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-3">
                  {prices.map((price) => (
                    <Card key={price.id}>
                      <CardContent className="pt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">
                            {price.fuel_type?.name}
                          </p>
                          <p className="text-3xl font-bold mt-1">
                            {formatCurrency(price.price_per_unit)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">per liter</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
