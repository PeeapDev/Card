"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Square,
  Clock,
  DollarSign,
  Droplets,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { StaffShift } from "@/lib/fuel/types";

export default function EndShiftPage() {
  const router = useRouter();
  const params = useParams();
  const shiftId = params.shiftId as string;

  const [shift, setShift] = useState<StaffShift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [closingCash, setClosingCash] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadShift();
  }, [shiftId]);

  const loadShift = async () => {
    try {
      // For now, we get the active shift for the staff at the station
      // In a real implementation, we'd fetch by shiftId
      const staffId = localStorage.getItem("plusStaffId") || "";
      const stations = await fuelService.getStations();

      for (const station of stations) {
        const activeShift = await fuelService.getActiveShift(station.id, staffId);
        if (activeShift && activeShift.id === shiftId) {
          setShift(activeShift);
          break;
        }
      }
    } catch (error) {
      console.error("Error loading shift:", error);
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

  const getShiftDuration = () => {
    if (!shift) return "0h 0m";
    const start = new Date(shift.start_time);
    const end = new Date();
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shift || !closingCash) return;

    setIsSaving(true);
    try {
      await fuelService.endShift({
        shift_id: shift.id,
        closing_cash: parseFloat(closingCash),
        notes: notes || undefined,
      });
      router.push("/dashboard/fuel/shifts");
    } catch (error: any) {
      console.error("Error ending shift:", error);
      alert(error.message || "Failed to end shift. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate expected cash
  const expectedCash = shift
    ? (shift.opening_cash || 0) + (shift.cash_sales || 0)
    : 0;
  const closingCashNum = parseFloat(closingCash) || 0;
  const cashDifference = closingCashNum - expectedCash;
  const hasDiscrepancy = Boolean(closingCash) && Math.abs(cashDifference) > 0.01;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shift) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/fuel/shifts">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">End Shift</h1>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-orange-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Shift Not Found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              This shift could not be found or may have already ended.
            </p>
            <Link href="/dashboard/fuel/shifts">
              <Button>Back to Shifts</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fuel/shifts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">End Shift</h1>
          <p className="text-muted-foreground">
            Complete your shift and submit for reconciliation
          </p>
        </div>
      </div>

      {/* Shift Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Shift Summary</CardTitle>
            <Badge variant="default" className="bg-green-600">
              Active
            </Badge>
          </div>
          <CardDescription>
            {formatDate(shift.start_time)} | Started at {formatTime(shift.start_time)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Duration</span>
              </div>
              <p className="text-xl font-bold">{getShiftDuration()}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Total Sales</span>
              </div>
              <p className="text-xl font-bold">{formatCurrency(shift.total_sales || 0)}</p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Droplets className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Liters Sold</span>
              </div>
              <p className="text-xl font-bold">
                {(shift.total_liters || 0).toFixed(1)}L
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm text-muted-foreground">Transactions</span>
              </div>
              <p className="text-xl font-bold">{shift.transaction_count || 0}</p>
            </div>
          </div>

          {/* Sales Breakdown */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium mb-4">Sales by Payment Method</h4>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Cash</p>
                <p className="font-medium">{formatCurrency(shift.cash_sales || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Card</p>
                <p className="font-medium">{formatCurrency(shift.card_sales || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">QR</p>
                <p className="font-medium">{formatCurrency(shift.qr_sales || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Fleet</p>
                <p className="font-medium">{formatCurrency(shift.fleet_sales || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Prepaid</p>
                <p className="font-medium">{formatCurrency(shift.prepaid_sales || 0)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Mobile</p>
                <p className="font-medium">{formatCurrency(shift.mobile_sales || 0)}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cash Reconciliation Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Cash Reconciliation</CardTitle>
            <CardDescription>
              Count your cash drawer and enter the closing balance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Opening Cash</p>
                <p className="text-xl font-bold">{formatCurrency(shift.opening_cash || 0)}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Cash Sales</p>
                <p className="text-xl font-bold text-green-600">
                  +{formatCurrency(shift.cash_sales || 0)}
                </p>
              </div>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700 mb-1">Expected Closing Cash</p>
                  <p className="text-2xl font-bold text-blue-900">
                    {formatCurrency(expectedCash)}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="closingCash">Actual Closing Cash *</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  NLe
                </span>
                <Input
                  id="closingCash"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="pl-12"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Count all cash in your drawer
              </p>
            </div>

            {/* Cash Difference */}
            {closingCash && (
              <div
                className={`p-4 rounded-lg ${
                  Math.abs(cashDifference) < 0.01
                    ? "bg-green-50 border border-green-200"
                    : cashDifference > 0
                    ? "bg-green-50 border border-green-200"
                    : "bg-red-50 border border-red-200"
                }`}
              >
                <div className="flex items-center gap-3">
                  {Math.abs(cashDifference) < 0.01 ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : cashDifference > 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-600" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-600" />
                  )}
                  <div>
                    <p
                      className={`font-medium ${
                        Math.abs(cashDifference) < 0.01
                          ? "text-green-800"
                          : cashDifference > 0
                          ? "text-green-800"
                          : "text-red-800"
                      }`}
                    >
                      {Math.abs(cashDifference) < 0.01
                        ? "Cash Balanced"
                        : cashDifference > 0
                        ? `Overage: ${formatCurrency(cashDifference)}`
                        : `Shortage: ${formatCurrency(Math.abs(cashDifference))}`}
                    </p>
                    <p
                      className={`text-sm ${
                        Math.abs(cashDifference) < 0.01
                          ? "text-green-600"
                          : cashDifference > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {Math.abs(cashDifference) < 0.01
                        ? "Your cash matches the expected amount"
                        : cashDifference > 0
                        ? "You have more cash than expected"
                        : "You have less cash than expected"}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes {hasDiscrepancy && "(Required for discrepancies)"}</Label>
              <Textarea
                id="notes"
                placeholder={
                  hasDiscrepancy
                    ? "Please explain the cash discrepancy..."
                    : "Any notes about this shift..."
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                required={hasDiscrepancy}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                variant="destructive"
                disabled={isSaving || !closingCash || (hasDiscrepancy && !notes)}
                className="flex-1"
              >
                <Square className="h-4 w-4 mr-2" />
                {isSaving ? "Ending..." : "End Shift"}
              </Button>
              <Link href="/dashboard/fuel/shifts">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
