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
import { ArrowLeft, Truck, Save, Droplets, DollarSign } from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, FuelTank, FuelType } from "@/lib/fuel/types";

export default function RecordDeliveryPage() {
  const router = useRouter();
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [tanks, setTanks] = useState<FuelTank[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [selectedStation, setSelectedStation] = useState<string>("");
  const [selectedTank, setSelectedTank] = useState<string>("");
  const [quantityLiters, setQuantityLiters] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [deliveryNoteNumber, setDeliveryNoteNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [unitCost, setUnitCost] = useState("");
  const [deliveredAt, setDeliveredAt] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadStations();
    loadFuelTypes();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadTanks(selectedStation);
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

  const loadFuelTypes = async () => {
    try {
      const data = await fuelService.getFuelTypes();
      setFuelTypes(data);
    } catch (error) {
      console.error("Error loading fuel types:", error);
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

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat("en-GH").format(num);
  };

  const formatCurrency = (amount: number) => {
    return `NLe ${new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStation || !selectedTank || !quantityLiters) return;

    const selectedTankData = tanks.find((t) => t.id === selectedTank);
    if (!selectedTankData) return;

    setIsSaving(true);
    try {
      await fuelService.recordDelivery({
        station_id: selectedStation,
        tank_id: selectedTank,
        fuel_type_id: selectedTankData.fuel_type_id,
        quantity_liters: parseFloat(quantityLiters),
        supplier_name: supplierName || undefined,
        delivery_note_number: deliveryNoteNumber || undefined,
        driver_name: driverName || undefined,
        vehicle_number: vehicleNumber || undefined,
        unit_cost: unitCost ? parseFloat(unitCost) : undefined,
        delivered_at: new Date(deliveredAt).toISOString(),
        notes: notes || undefined,
      });
      router.push("/dashboard/fuel/inventory");
    } catch (error) {
      console.error("Error recording delivery:", error);
      alert("Failed to record delivery. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTankData = tanks.find((t) => t.id === selectedTank);
  const quantity = parseFloat(quantityLiters) || 0;
  const totalCost = quantity * (parseFloat(unitCost) || 0);
  const newLevel = selectedTankData
    ? selectedTankData.current_level_liters + quantity
    : 0;
  const wouldOverflow = selectedTankData
    ? newLevel > selectedTankData.capacity_liters
    : false;

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
          <h1 className="text-2xl font-bold tracking-tight">Record Fuel Delivery</h1>
          <p className="text-muted-foreground">
            Log incoming fuel deliveries and update tank levels
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Delivery Details</CardTitle>
              <CardDescription>
                Enter delivery information from the supplier
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
                  <Label htmlFor="tank">Tank *</Label>
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity (Liters) *</Label>
                  <div className="relative">
                    <Input
                      id="quantity"
                      type="number"
                      step="0.001"
                      min="0"
                      placeholder="Enter quantity"
                      value={quantityLiters}
                      onChange={(e) => setQuantityLiters(e.target.value)}
                      className="pr-8"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      L
                    </span>
                  </div>
                  {wouldOverflow && (
                    <p className="text-xs text-red-600">
                      Warning: This would exceed tank capacity!
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deliveredAt">Delivery Date/Time *</Label>
                  <Input
                    id="deliveredAt"
                    type="datetime-local"
                    value={deliveredAt}
                    onChange={(e) => setDeliveredAt(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Supplier Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier Name</Label>
                    <Input
                      id="supplier"
                      placeholder="e.g., GOIL, Shell"
                      value={supplierName}
                      onChange={(e) => setSupplierName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="deliveryNote">Delivery Note Number</Label>
                    <Input
                      id="deliveryNote"
                      placeholder="e.g., DN-2024-001"
                      value={deliveryNoteNumber}
                      onChange={(e) => setDeliveryNoteNumber(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="driver">Driver Name</Label>
                    <Input
                      id="driver"
                      placeholder="Driver's name"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Vehicle Number</Label>
                    <Input
                      id="vehicle"
                      placeholder="e.g., GR-1234-21"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-4">Cost Information</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="unitCost">Unit Cost (NLe/Liter)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        NLe
                      </span>
                      <Input
                        id="unitCost"
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={unitCost}
                        onChange={(e) => setUnitCost(e.target.value)}
                        className="pl-12"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Total Cost</Label>
                    <div className="h-10 px-3 py-2 bg-muted rounded-md flex items-center">
                      <span className="font-medium">{formatCurrency(totalCost)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any additional notes about this delivery..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Tank Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Tank Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedTankData ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Tank</p>
                      <p className="font-medium">{selectedTankData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTankData.fuel_type?.name}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Current Level</span>
                        <span>{formatNumber(selectedTankData.current_level_liters)}L</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Capacity</span>
                        <span>{formatNumber(selectedTankData.capacity_liters)}L</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Available Space</span>
                        <span>
                          {formatNumber(
                            selectedTankData.capacity_liters -
                              selectedTankData.current_level_liters
                          )}
                          L
                        </span>
                      </div>
                    </div>

                    {quantity > 0 && (
                      <>
                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Delivery</span>
                            <span className="text-green-600">
                              +{formatNumber(quantity)}L
                            </span>
                          </div>
                          <div className="flex justify-between font-medium">
                            <span>New Level</span>
                            <span className={wouldOverflow ? "text-red-600" : ""}>
                              {formatNumber(newLevel)}L
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all ${
                                wouldOverflow ? "bg-red-500" : "bg-blue-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  (newLevel / selectedTankData.capacity_liters) * 100,
                                  100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    Select a tank to see summary
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Cost Summary */}
            {totalCost > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    Cost Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>Quantity</span>
                    <span>{formatNumber(quantity)}L</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Unit Cost</span>
                    <span>{formatCurrency(parseFloat(unitCost) || 0)}/L</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-medium">
                    <span>Total Cost</span>
                    <span>{formatCurrency(totalCost)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Buttons */}
            <div className="flex flex-col gap-3">
              <Button
                type="submit"
                disabled={
                  isSaving ||
                  !selectedStation ||
                  !selectedTank ||
                  !quantityLiters ||
                  wouldOverflow
                }
                className="w-full"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? "Recording..." : "Record Delivery"}
              </Button>
              <Link href="/dashboard/fuel/inventory" className="w-full">
                <Button type="button" variant="outline" className="w-full">
                  Cancel
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
