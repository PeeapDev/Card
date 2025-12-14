"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Gauge,
  Droplets,
  Truck,
  Plus,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, FuelTank, FuelDelivery } from "@/lib/fuel/types";

export default function InventoryPage() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [deliveries, setDeliveries] = useState<FuelDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedStation]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const stationsData = await fuelService.getStations();
      setStations(stationsData);

      if (selectedStation !== "all") {
        const [tanksData, deliveriesData] = await Promise.all([
          fuelService.getTanks(selectedStation),
          fuelService.getDeliveries(selectedStation),
        ]);
        setTanks(tanksData);
        setDeliveries(deliveriesData);
      } else if (stationsData.length > 0) {
        // Load tanks from all stations
        const allTanks: FuelTank[] = [];
        const allDeliveries: FuelDelivery[] = [];
        for (const station of stationsData) {
          const tanksData = await fuelService.getTanks(station.id);
          const deliveriesData = await fuelService.getDeliveries(station.id);
          allTanks.push(...tanksData);
          allDeliveries.push(...deliveriesData);
        }
        setTanks(allTanks);
        setDeliveries(allDeliveries);
      }
    } catch (error) {
      console.error("Error loading inventory:", error);
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getTankLevelStatus = (current: number, capacity: number, minimum: number) => {
    const percentage = (current / capacity) * 100;
    if (current <= minimum) return { color: "destructive", text: "Critical" };
    if (percentage < 30) return { color: "warning", text: "Low" };
    return { color: "default", text: "Normal" };
  };

  // Calculate summary stats
  const totalCapacity = tanks.reduce((sum, t) => sum + t.capacity_liters, 0);
  const totalCurrent = tanks.reduce((sum, t) => sum + t.current_level_liters, 0);
  const lowStockTanks = tanks.filter((t) => t.current_level_liters <= t.minimum_level_liters);

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
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">
            Monitor fuel levels and manage deliveries
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/fuel/inventory/dipping">
            <Button variant="outline">
              <Gauge className="h-4 w-4 mr-2" />
              Record Dipping
            </Button>
          </Link>
          <Link href="/dashboard/fuel/inventory/delivery">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Delivery
            </Button>
          </Link>
        </div>
      </div>

      {/* Station Filter */}
      <div className="flex items-center gap-4">
        <Select value={selectedStation} onValueChange={setSelectedStation}>
          <SelectTrigger className="w-[250px]">
            <SelectValue placeholder="Select station" />
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
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tanks</CardTitle>
            <Gauge className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tanks.length}</div>
            <p className="text-xs text-muted-foreground">Storage tanks</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Capacity</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalCapacity)}L</div>
            <p className="text-xs text-muted-foreground">Maximum storage</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Stock</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNumber(totalCurrent)}L</div>
            <p className="text-xs text-muted-foreground">
              {((totalCurrent / totalCapacity) * 100 || 0).toFixed(1)}% of capacity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{lowStockTanks.length}</div>
            <p className="text-xs text-muted-foreground">Tanks need refill</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tanks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tanks">Tank Levels</TabsTrigger>
          <TabsTrigger value="deliveries">Deliveries</TabsTrigger>
        </TabsList>

        {/* Tank Levels Tab */}
        <TabsContent value="tanks">
          {tanks.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Gauge className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Tanks Found</h3>
                <p className="text-muted-foreground text-center max-w-md">
                  Add tanks to your stations to start tracking inventory levels.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tanks.map((tank) => {
                const percentage = (tank.current_level_liters / tank.capacity_liters) * 100;
                const status = getTankLevelStatus(
                  tank.current_level_liters,
                  tank.capacity_liters,
                  tank.minimum_level_liters
                );

                return (
                  <Card key={tank.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{tank.name}</CardTitle>
                        <Badge variant={status.color as any}>{status.text}</Badge>
                      </div>
                      <CardDescription>
                        {tank.fuel_type?.name} - {tank.fuel_station?.name}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Current Level</span>
                          <span className="font-medium">
                            {formatNumber(tank.current_level_liters)}L
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-4">
                          <div
                            className={`h-4 rounded-full transition-all ${
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
                          <span>Min: {formatNumber(tank.minimum_level_liters)}L</span>
                          <span>{percentage.toFixed(1)}%</span>
                          <span>Max: {formatNumber(tank.capacity_liters)}L</span>
                        </div>
                        {tank.last_dip_at && (
                          <p className="text-xs text-muted-foreground">
                            Last dip: {formatDate(tank.last_dip_at)}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Deliveries Tab */}
        <TabsContent value="deliveries">
          {deliveries.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Truck className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Deliveries Recorded</h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Record fuel deliveries to track your inventory replenishment.
                </p>
                <Link href="/dashboard/fuel/inventory/delivery">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Delivery
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Station</TableHead>
                    <TableHead>Tank</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {formatDate(delivery.delivered_at)}
                        </div>
                      </TableCell>
                      <TableCell>{delivery.fuel_station?.name}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{delivery.fuel_tank?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {delivery.fuel_type?.name}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatNumber(delivery.quantity_liters)}L
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{delivery.supplier_name}</p>
                          {delivery.delivery_note_number && (
                            <p className="text-xs text-muted-foreground">
                              #{delivery.delivery_note_number}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{formatCurrency(delivery.total_cost || 0)}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(delivery.unit_cost || 0)}/L
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
