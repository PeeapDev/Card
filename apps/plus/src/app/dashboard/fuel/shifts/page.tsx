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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Clock,
  Play,
  Square,
  DollarSign,
  Droplets,
  User,
  Calendar,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, StaffShift } from "@/lib/fuel/types";

export default function ShiftsPage() {
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [selectedStation, setSelectedStation] = useState<string>("all");
  const [shifts, setShifts] = useState<StaffShift[]>([]);
  const [activeShift, setActiveShift] = useState<StaffShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedStation]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const stationsData = await fuelService.getStations();
      setStations(stationsData);

      // Check for active shift for current user
      if (stationsData.length > 0) {
        const stationId = selectedStation !== "all" ? selectedStation : stationsData[0].id;
        try {
          // getActiveShift requires stationId and staffId - for now we'll handle the case where it might not exist
          const staffId = localStorage.getItem("plusStaffId") || "";
          const shift = await fuelService.getActiveShift(stationId, staffId);
          setActiveShift(shift);
        } catch {
          setActiveShift(null);
        }
      }

      // In a real implementation, we'd load shift history from the API
      // For now, we'll show a placeholder
      setShifts([]);
    } catch (error) {
      console.error("Error loading shifts:", error);
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

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("en-GH", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getShiftStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default";
      case "closed":
        return "secondary";
      case "reconciled":
        return "outline";
      default:
        return "secondary";
    }
  };

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
          <h1 className="text-2xl font-bold tracking-tight">Shift Management</h1>
          <p className="text-muted-foreground">
            Manage staff shifts and track daily operations
          </p>
        </div>
        {!activeShift ? (
          <Link href="/dashboard/fuel/shifts/start">
            <Button>
              <Play className="h-4 w-4 mr-2" />
              Start Shift
            </Button>
          </Link>
        ) : (
          <Link href={`/dashboard/fuel/shifts/${activeShift.id}/end`}>
            <Button variant="destructive">
              <Square className="h-4 w-4 mr-2" />
              End Shift
            </Button>
          </Link>
        )}
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

      {/* Active Shift Card */}
      {activeShift ? (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <CardTitle className="text-green-800">Active Shift</CardTitle>
              </div>
              <Badge variant="default" className="bg-green-600">
                In Progress
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-green-700">Started At</p>
                <p className="font-medium text-green-900">
                  {formatTime(activeShift.start_time)}
                </p>
                <p className="text-xs text-green-600">
                  {formatDate(activeShift.start_time)}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Shift Type</p>
                <p className="font-medium text-green-900 capitalize">
                  {activeShift.shift_type}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Opening Cash</p>
                <p className="font-medium text-green-900">
                  {formatCurrency(activeShift.opening_cash)}
                </p>
              </div>
              <div>
                <p className="text-sm text-green-700">Current Sales</p>
                <p className="font-medium text-green-900">
                  {formatCurrency(activeShift.total_sales || 0)}
                </p>
                <p className="text-xs text-green-600">
                  {activeShift.transaction_count || 0} transactions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Clock className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-1">No Active Shift</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              Start a shift to begin recording sales and tracking your work period.
            </p>
            <Link href="/dashboard/fuel/shifts/start">
              <Button>
                <Play className="h-4 w-4 mr-2" />
                Start Shift
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Shift Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Shift Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-600">1</span>
              </div>
              <div>
                <p className="font-medium text-sm">Start Your Shift</p>
                <p className="text-xs text-muted-foreground">
                  Count and enter your opening cash balance before serving customers.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-600">2</span>
              </div>
              <div>
                <p className="font-medium text-sm">Record All Sales</p>
                <p className="text-xs text-muted-foreground">
                  Enter each fuel sale with correct quantity and payment method.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-bold text-blue-600">3</span>
              </div>
              <div>
                <p className="font-medium text-sm">End Your Shift</p>
                <p className="text-xs text-muted-foreground">
                  Count closing cash and submit for reconciliation by supervisor.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Shifts</CardTitle>
          <CardDescription>View past shift records and summaries</CardDescription>
        </CardHeader>
        <CardContent>
          {shifts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No shift history available</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead>Station</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Sales</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((shift) => (
                  <TableRow key={shift.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{formatDate(shift.start_time)}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatTime(shift.start_time)} - {shift.end_time ? formatTime(shift.end_time) : "Ongoing"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {shift.staff?.first_name} {shift.staff?.last_name}
                      </div>
                    </TableCell>
                    <TableCell>{shift.station?.name}</TableCell>
                    <TableCell>
                      {shift.end_time
                        ? `${Math.round(
                            (new Date(shift.end_time).getTime() - new Date(shift.start_time).getTime()) /
                              (1000 * 60 * 60)
                          )}h`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <p className="font-medium">{formatCurrency(shift.total_sales || 0)}</p>
                      <p className="text-xs text-muted-foreground">
                        {(shift.total_liters || 0).toFixed(1)}L sold
                      </p>
                    </TableCell>
                    <TableCell>{shift.transaction_count || 0}</TableCell>
                    <TableCell>
                      <Badge variant={getShiftStatusColor(shift.status) as any}>
                        {shift.status === "reconciled" && (
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                        )}
                        {shift.cash_difference !== 0 && shift.status === "closed" && (
                          <AlertCircle className="h-3 w-3 mr-1" />
                        )}
                        {shift.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
