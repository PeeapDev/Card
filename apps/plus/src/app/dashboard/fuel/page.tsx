"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Fuel,
  Store,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Droplets,
  Truck,
  CreditCard,
  Users,
  AlertTriangle,
  Plus,
  ArrowRight,
  Clock,
  Gauge,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, StationDashboardStats } from "@/lib/fuel/types";

export default function FuelOverviewPage() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [dashboardStats, setDashboardStats] = useState<StationDashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const stationsData = await fuelService.getStations();
      setStations(stationsData);

      // Get dashboard stats for first station (or aggregate)
      if (stationsData.length > 0) {
        const stats = await fuelService.getStationDashboard(stationsData[0].id);
        setDashboardStats(stats);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // No stations yet - show setup prompt
  if (stations.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fuel Station Management</h1>
          <p className="text-muted-foreground">
            Manage your fuel stations, sales, inventory, and fleet accounts
          </p>
        </div>

        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Fuel className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Fuel Stations Yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-6">
              Get started by adding your first fuel station. You'll be able to manage pumps,
              track sales, monitor inventory, and handle fleet accounts.
            </p>
            <Link href="/dashboard/fuel/stations/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Station
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Feature Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-2">
                <Store className="h-5 w-5 text-blue-600" />
              </div>
              <CardTitle className="text-sm">Station Management</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Configure stations, pumps, tanks, and pricing
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mb-2">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <CardTitle className="text-sm">Sales Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Record sales with QR, card, and mobile payments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center mb-2">
                <Gauge className="h-5 w-5 text-orange-600" />
              </div>
              <CardTitle className="text-sm">Inventory Control</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Monitor tank levels, deliveries, and reconciliation
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-2">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <CardTitle className="text-sm">Fleet Accounts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Manage corporate clients with credit lines
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Dashboard with stats
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fuel Station Overview</h1>
          <p className="text-muted-foreground">
            {stations.length} station{stations.length !== 1 ? "s" : ""} across your network
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/fuel/sales/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Sale
            </Button>
          </Link>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Sales</CardTitle>
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
            <CardTitle className="text-sm font-medium">Liters Sold Today</CardTitle>
            <Droplets className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatNumber(dashboardStats?.today_liters || 0)}L
            </div>
            <p className="text-xs text-muted-foreground">
              Across all fuel types
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Shifts</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dashboardStats?.active_shifts || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Staff currently on duty
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {dashboardStats?.low_stock_tanks || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Tanks below minimum level
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Station Cards */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Your Stations</h2>
          <Link href="/dashboard/fuel/stations">
            <Button variant="ghost" size="sm">
              View All <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {stations.slice(0, 6).map((station) => (
            <Link key={station.id} href={`/dashboard/fuel/stations/${station.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{station.name}</CardTitle>
                    <Badge
                      variant={station.status === "active" ? "default" : "secondary"}
                    >
                      {station.status}
                    </Badge>
                  </div>
                  <CardDescription>{station.code}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    {station.address}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Fuel className="h-3 w-3" />
                      {station.city}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}

          {/* Add Station Card */}
          <Link href="/dashboard/fuel/stations/new">
            <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="flex flex-col items-center justify-center h-full min-h-[160px]">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-2">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Add Station</p>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link href="/dashboard/fuel/fleet">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Fleet Accounts</p>
                <p className="text-xs text-muted-foreground">Manage corporate clients</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/fuel/cards">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Fuel Cards</p>
                <p className="text-xs text-muted-foreground">Prepaid & fleet cards</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/fuel/inventory">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                <Gauge className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="font-medium">Inventory</p>
                <p className="text-xs text-muted-foreground">Tank levels & deliveries</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/fuel/shifts">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="flex items-center gap-4 py-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Shifts</p>
                <p className="text-xs text-muted-foreground">Staff shift management</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
