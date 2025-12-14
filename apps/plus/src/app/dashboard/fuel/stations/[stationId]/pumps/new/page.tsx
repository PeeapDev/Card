"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Gauge, Loader2, Droplets, Zap } from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import { FuelPumpIllustration } from "@/components/fuel/FuelPumpIllustration";
import type { FuelStation, FuelType, PumpStatus } from "@/lib/fuel/types";

export default function AddPumpPage() {
  const params = useParams();
  const router = useRouter();
  const stationId = params.stationId as string;

  const [station, setStation] = useState<FuelStation | null>(null);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [pumpNumber, setPumpNumber] = useState("");
  const [name, setName] = useState("");
  const [fuelTypeId, setFuelTypeId] = useState("");
  const [status, setStatus] = useState<PumpStatus>("active");
  const [currentMeterReading, setCurrentMeterReading] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (stationId) {
      loadData();
    }
  }, [stationId]);

  const loadData = async () => {
    try {
      const [stationData, fuelTypesData] = await Promise.all([
        fuelService.getStation(stationId),
        fuelService.getFuelTypes(),
      ]);
      setStation(stationData);
      setFuelTypes(fuelTypesData);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pumpNumber) return;

    setIsSaving(true);
    try {
      await fuelService.createPump({
        station_id: stationId,
        pump_number: parseInt(pumpNumber),
        name: name || `Pump ${pumpNumber}`,
        fuel_type_id: fuelTypeId || undefined,
        current_meter_reading: currentMeterReading ? parseFloat(currentMeterReading) : 0,
      });

      router.push(`/dashboard/fuel/stations/${stationId}`);
    } catch (error) {
      console.error("Error creating pump:", error);
      alert("Failed to create pump. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Get selected fuel type details
  const selectedFuelType = fuelTypes.find((ft) => ft.id === fuelTypeId);

  // Get status badge variant
  const getStatusBadge = (s: PumpStatus) => {
    switch (s) {
      case "active":
        return <Badge className="bg-green-500 text-white">Active</Badge>;
      case "maintenance":
        return <Badge variant="outline" className="border-orange-500 text-orange-600">Maintenance</Badge>;
      case "offline":
        return <Badge variant="destructive">Offline</Badge>;
      default:
        return <Badge variant="secondary">{s}</Badge>;
    }
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
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/fuel/stations/${stationId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Pump</h1>
          <p className="text-muted-foreground">
            Add a new pump to {station.name}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="h-5 w-5" />
                Pump Details
              </CardTitle>
              <CardDescription>
                Configure the pump settings for this station
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pumpNumber">Pump Number *</Label>
                  <Input
                    id="pumpNumber"
                    type="number"
                    min="1"
                    placeholder="e.g., 1, 2, 3"
                    value={pumpNumber}
                    onChange={(e) => setPumpNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Unique number to identify this pump
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    placeholder={`Pump ${pumpNumber || "1"}`}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional friendly name (defaults to "Pump #")
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fuelType">Fuel Type</Label>
                  <Select value={fuelTypeId} onValueChange={setFuelTypeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                    <SelectContent>
                      {fuelTypes.length === 0 ? (
                        <SelectItem value="none" disabled>
                          No fuel types available
                        </SelectItem>
                      ) : (
                        fuelTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: type.color }}
                              />
                              {type.name} ({type.code})
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The type of fuel this pump dispenses
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as PumpStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="meterReading">Current Meter Reading</Label>
                <Input
                  id="meterReading"
                  type="number"
                  step="0.001"
                  min="0"
                  placeholder="0.000"
                  value={currentMeterReading}
                  onChange={(e) => setCurrentMeterReading(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  The current totalizer reading on the pump (in liters)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this pump..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              {fuelTypes.length === 0 && (
                <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4 text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">No Fuel Types Available</p>
                  <p className="mt-1">
                    You need to create fuel types before adding pumps.
                    <Link href="/dashboard/fuel/settings" className="underline ml-1">
                      Go to settings
                    </Link>
                  </p>
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <Button type="submit" disabled={isSaving || !pumpNumber}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Adding Pump...
                    </>
                  ) : (
                    "Add Pump"
                  )}
                </Button>
                <Link href={`/dashboard/fuel/stations/${stationId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </form>

        {/* Pump Preview Section */}
        <div className="lg:sticky lg:top-6 space-y-4">
          <Card className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <CardTitle className="text-white flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Live Preview
              </CardTitle>
              <CardDescription className="text-blue-100">
                See your pump configuration in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {/* 3D Fuel Pump Illustration */}
              <div className="flex justify-center mb-6">
                <div className="w-48 h-72">
                  <FuelPumpIllustration
                    pumpNumber={pumpNumber}
                    fuelType={selectedFuelType}
                    status={status}
                  />
                </div>
              </div>

              {/* Info Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-muted-foreground">Pump Number</span>
                  <span className="font-bold text-lg">{pumpNumber || "—"}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-muted-foreground">Display Name</span>
                  <span className="font-medium">{name || (pumpNumber ? `Pump ${pumpNumber}` : "—")}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-muted-foreground">Fuel Type</span>
                  {selectedFuelType ? (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: selectedFuelType.color }}
                      />
                      <span className="font-medium">{selectedFuelType.name}</span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Not selected</span>
                  )}
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <span className="text-sm text-muted-foreground">Status</span>
                  {getStatusBadge(status)}
                </div>

                {currentMeterReading && (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <span className="text-sm text-muted-foreground">Meter Reading</span>
                    <span className="font-mono font-medium">
                      {parseFloat(currentMeterReading).toLocaleString("en", {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 3,
                      })} L
                    </span>
                  </div>
                )}
              </div>
            </CardContent>

            {/* Station Info Footer */}
            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{station.name}</p>
                  <p className="text-xs text-muted-foreground">{station.code}</p>
                </div>
                <Badge variant="outline">{station.region || "Sierra Leone"}</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
