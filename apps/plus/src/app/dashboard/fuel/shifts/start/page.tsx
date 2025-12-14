"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Play, Clock, Fuel, DollarSign, AlertCircle } from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, FuelPump, ShiftType } from "@/lib/fuel/types";

export default function StartShiftPage() {
  const router = useRouter();
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [pumps, setPumps] = useState<FuelPump[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedStation, setSelectedStation] = useState<string>("");
  const [shiftType, setShiftType] = useState<ShiftType>("morning");
  const [assignedPumps, setAssignedPumps] = useState<string[]>([]);
  const [openingCash, setOpeningCash] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadPumps(selectedStation);
    }
  }, [selectedStation]);

  const loadStations = async () => {
    try {
      const data = await fuelService.getStations();
      setStations(data);
      if (data.length === 1) {
        setSelectedStation(data[0].id);
      }
    } catch (error) {
      console.error("Error loading stations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPumps = async (stationId: string) => {
    try {
      const data = await fuelService.getPumps(stationId);
      setPumps(data.filter((p) => p.status === "active"));
    } catch (error) {
      console.error("Error loading pumps:", error);
    }
  };

  const handlePumpToggle = (pumpId: string, checked: boolean) => {
    if (checked) {
      setAssignedPumps([...assignedPumps, pumpId]);
    } else {
      setAssignedPumps(assignedPumps.filter((id) => id !== pumpId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !openingCash) return;

    setIsSaving(true);
    try {
      await fuelService.startShift({
        station_id: selectedStation,
        shift_type: shiftType,
        assigned_pumps: assignedPumps,
        opening_cash: parseFloat(openingCash),
        notes: notes || undefined,
      });
      router.push("/dashboard/fuel/shifts");
    } catch (error: any) {
      console.error("Error starting shift:", error);
      alert(error.message || "Failed to start shift. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NLe ${new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const selectedStationData = stations.find((s) => s.id === selectedStation);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fuel/shifts">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Start New Shift</h1>
          <p className="text-muted-foreground">
            Begin your work shift and start recording sales
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Form - spans 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Shift Details</CardTitle>
            <CardDescription>
              Enter your shift information to begin
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="station">Station *</Label>
                <Select value={selectedStation} onValueChange={setSelectedStation}>
                  <SelectTrigger>
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
                <Label htmlFor="shiftType">Shift Type</Label>
                <Select
                  value={shiftType}
                  onValueChange={(v) => setShiftType(v as ShiftType)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="morning">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Morning Shift (6 AM - 2 PM)
                      </div>
                    </SelectItem>
                    <SelectItem value="afternoon">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Afternoon Shift (2 PM - 10 PM)
                      </div>
                    </SelectItem>
                    <SelectItem value="night">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Night Shift (10 PM - 6 AM)
                      </div>
                    </SelectItem>
                    <SelectItem value="custom">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Custom Shift
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="openingCash">Opening Cash Balance *</Label>
              <div className="relative max-w-xs">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  NLe
                </span>
                <Input
                  id="openingCash"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={openingCash}
                  onChange={(e) => setOpeningCash(e.target.value)}
                  className="pl-12"
                  required
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Count all cash in your drawer before starting
              </p>
            </div>

            {pumps.length > 0 && (
              <div className="space-y-3">
                <Label>Assigned Pumps (Optional)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {pumps.map((pump) => (
                    <div
                      key={pump.id}
                      className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                        assignedPumps.includes(pump.id)
                          ? "border-primary bg-primary/5"
                          : "border-border"
                      }`}
                    >
                      <Checkbox
                        id={`pump-${pump.id}`}
                        checked={assignedPumps.includes(pump.id)}
                        onCheckedChange={(checked) =>
                          handlePumpToggle(pump.id, checked as boolean)
                        }
                      />
                      <label
                        htmlFor={`pump-${pump.id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <Fuel className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-sm">
                            {pump.name || `Pump ${pump.pump_number}`}
                          </span>
                        </div>
                        {pump.fuel_type && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {pump.fuel_type.name}
                          </p>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Select the pumps you will be operating during this shift
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any notes for this shift (e.g., equipment issues, handover notes)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSaving || !selectedStation || !openingCash}
                className="flex-1"
              >
                <Play className="h-4 w-4 mr-2" />
                {isSaving ? "Starting..." : "Start Shift"}
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

        {/* Sidebar - right column */}
        <div className="space-y-6">
          {/* Pre-Shift Checklist */}
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-blue-800">
                <AlertCircle className="h-4 w-4" />
                Before You Start
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Count all cash in your drawer
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Check pumps are operational
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                  Record pump meter readings
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Station Info */}
          {selectedStationData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Station Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Station</p>
                  <p className="font-medium">{selectedStationData.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Location</p>
                  <p className="font-medium">
                    {selectedStationData.address || selectedStationData.city || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedStationData.status}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
