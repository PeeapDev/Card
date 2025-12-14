"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ArrowLeft, Gauge, Save, Droplets, Calendar } from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, FuelTank, TankDipping } from "@/lib/fuel/types";

export default function RecordDippingPage() {
  const router = useRouter();
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [recentDippings, setRecentDippings] = useState<TankDipping[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedTank, setSelectedTank] = useState<string>("");
  const [readingLiters, setReadingLiters] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadStations();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadTanks(selectedStation);
    }
  }, [selectedStation]);

  useEffect(() => {
    if (selectedTank) {
      loadRecentDippings(selectedTank);
    }
  }, [selectedTank]);

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

  const loadTanks = async (stationId: string) => {
    try {
      const data = await fuelService.getTanks(stationId);
      setTanks(data);
    } catch (error) {
      console.error("Error loading tanks:", error);
    }
  };

  const loadRecentDippings = async (tankId: string) => {
    try {
      const data = await fuelService.getDippings(tankId);
      setRecentDippings(data);
    } catch (error) {
      console.error("Error loading dippings:", error);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-GH").format(num);
  };

  const formatDateTime = (date: string) => {
    return new Date(date).toLocaleString("en-GH", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !selectedTank || !readingLiters) return;

    setIsSaving(true);
    try {
      await fuelService.recordDipping({
        station_id: selectedStation,
        tank_id: selectedTank,
        reading_liters: parseFloat(readingLiters),
        notes: notes || undefined,
      });
      router.push("/dashboard/fuel/inventory");
    } catch (error) {
      console.error("Error recording dipping:", error);
      alert("Failed to record dipping. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTankData = tanks.find((t) => t.id === selectedTank);

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
        <Link href="/dashboard/fuel/inventory">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Tank Dipping</h1>
          <p className="text-muted-foreground">
            Manually measure and record tank fuel levels
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle>Dipping Details</CardTitle>
            <CardDescription>
              Enter the current tank level reading from manual dipping
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="station">Station</Label>
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
                <Label htmlFor="tank">Tank</Label>
                <Select
                  value={selectedTank}
                  onValueChange={setSelectedTank}
                  disabled={!selectedStation}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tank" />
                  </SelectTrigger>
                  <SelectContent>
                    {tanks.map((tank) => (
                      <SelectItem key={tank.id} value={tank.id}>
                        {tank.name} - {tank.fuel_type?.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Current Tank Info */}
              {selectedTankData && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Current Tank Status</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">System Level</p>
                      <p className="font-medium">
                        {formatNumber(selectedTankData.current_level_liters)}L
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Capacity</p>
                      <p className="font-medium">
                        {formatNumber(selectedTankData.capacity_liters)}L
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Minimum</p>
                      <p className="font-medium">
                        {formatNumber(selectedTankData.minimum_level_liters)}L
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reading">Dip Reading (Liters)</Label>
                <div className="relative">
                  <Input
                    id="reading"
                    type="number"
                    step="0.001"
                    min="0"
                    max={selectedTankData?.capacity_liters}
                    placeholder="Enter measured level"
                    value={readingLiters}
                    onChange={(e) => setReadingLiters(e.target.value)}
                    className="pr-8"
                    required
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    L
                  </span>
                </div>
                {selectedTankData && readingLiters && (
                  <p className="text-xs text-muted-foreground">
                    Variance from system:{" "}
                    <span
                      className={
                        parseFloat(readingLiters) - selectedTankData.current_level_liters >= 0
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {parseFloat(readingLiters) - selectedTankData.current_level_liters >= 0
                        ? "+"
                        : ""}
                      {formatNumber(
                        parseFloat(readingLiters) - selectedTankData.current_level_liters
                      )}
                      L
                    </span>
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any observations or notes about this dipping..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  disabled={isSaving || !selectedStation || !selectedTank || !readingLiters}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Recording..." : "Record Dipping"}
                </Button>
                <Link href="/dashboard/fuel/inventory">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Dippings */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Dippings</CardTitle>
            <CardDescription>
              Previous readings for the selected tank
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedTank ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Gauge className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  Select a tank to view recent dippings
                </p>
              </div>
            ) : recentDippings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">
                  No previous dippings recorded for this tank
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date/Time</TableHead>
                    <TableHead>Reading</TableHead>
                    <TableHead>By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentDippings.slice(0, 10).map((dipping) => (
                    <TableRow key={dipping.id}>
                      <TableCell className="text-sm">
                        {formatDateTime(dipping.dipped_at)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatNumber(dipping.reading_liters)}L
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {dipping.dipped_by_staff?.first_name}{" "}
                        {dipping.dipped_by_staff?.last_name}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dipping Guidelines</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4 text-sm">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-600">1</span>
              </div>
              <div>
                <p className="font-medium">Prepare Equipment</p>
                <p className="text-muted-foreground">
                  Use a clean, calibrated dipping stick
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-600">2</span>
              </div>
              <div>
                <p className="font-medium">Take Reading</p>
                <p className="text-muted-foreground">
                  Lower stick straight to bottom of tank
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-600">3</span>
              </div>
              <div>
                <p className="font-medium">Convert to Liters</p>
                <p className="text-muted-foreground">
                  Use tank chart to convert depth to volume
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <span className="font-bold text-blue-600">4</span>
              </div>
              <div>
                <p className="font-medium">Record Reading</p>
                <p className="text-muted-foreground">
                  Enter the converted liter value above
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
