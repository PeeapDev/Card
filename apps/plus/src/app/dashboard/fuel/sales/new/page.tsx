"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Fuel,
  DollarSign,
  CreditCard,
  Smartphone,
  Banknote,
  Truck,
  QrCode,
  Calculator,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStation, FuelPump, FuelType, FuelPrice, PaymentMethod, CustomerType } from "@/lib/fuel/types";

export default function NewSalePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedStation = searchParams.get("station");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [stations, setStations] = useState<FuelStation[]>([]);
  const [pumps, setPumps] = useState<FuelPump[]>([]);
  const [fuelTypes, setFuelTypes] = useState<FuelType[]>([]);
  const [prices, setPrices] = useState<FuelPrice[]>([]);

  // Form state
  const [selectedStation, setSelectedStation] = useState<string>(preselectedStation || "");
  const [selectedPump, setSelectedPump] = useState<string>("");
  const [selectedFuelType, setSelectedFuelType] = useState<string>("");
  const [quantityLiters, setQuantityLiters] = useState<string>("");
  const [pricePerLiter, setPricePerLiter] = useState<number>(0);
  const [discount, setDiscount] = useState<string>("0");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [customerType, setCustomerType] = useState<CustomerType>("walkin");
  const [vehicleRegistration, setVehicleRegistration] = useState<string>("");
  const [odometerReading, setOdometerReading] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  // Calculated values
  const quantity = parseFloat(quantityLiters) || 0;
  const discountAmount = parseFloat(discount) || 0;
  const subtotal = quantity * pricePerLiter;
  const total = Math.max(0, subtotal - discountAmount);

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedStation) {
      loadStationData(selectedStation);
    }
  }, [selectedStation]);

  useEffect(() => {
    // Update price when fuel type changes
    if (selectedFuelType && prices.length > 0) {
      const price = prices.find((p) => p.fuel_type_id === selectedFuelType);
      if (price) {
        setPricePerLiter(price.price_per_unit);
      }
    }
  }, [selectedFuelType, prices]);

  const loadInitialData = async () => {
    try {
      const stationsData = await fuelService.getStations();
      setStations(stationsData);

      if (preselectedStation) {
        await loadStationData(preselectedStation);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadStationData = async (stationId: string) => {
    try {
      const [pumpsData, pricesData] = await Promise.all([
        fuelService.getPumps(stationId),
        fuelService.getCurrentPrices(stationId),
      ]);
      setPumps(pumpsData);
      setPrices(pricesData);

      // Extract unique fuel types from prices
      const types = pricesData
        .filter((p) => p.fuel_type)
        .map((p) => p.fuel_type as FuelType);
      setFuelTypes(types);
    } catch (error) {
      console.error("Error loading station data:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!selectedStation) {
      setError("Please select a station");
      return;
    }
    if (!selectedFuelType) {
      setError("Please select a fuel type");
      return;
    }
    if (quantity <= 0) {
      setError("Please enter a valid quantity");
      return;
    }
    if (pricePerLiter <= 0) {
      setError("Invalid price per liter");
      return;
    }

    setIsSubmitting(true);

    try {
      await fuelService.recordSale({
        station_id: selectedStation,
        pump_id: selectedPump || undefined,
        fuel_type_id: selectedFuelType,
        quantity_liters: quantity,
        price_per_liter: pricePerLiter,
        discount_amount: discountAmount,
        payment_method: paymentMethod,
        customer_type: customerType,
        vehicle_registration: vehicleRegistration.trim() || undefined,
        odometer_reading: odometerReading ? parseInt(odometerReading) : undefined,
        notes: notes.trim() || undefined,
      });

      router.push("/dashboard/fuel/sales");
    } catch (err: any) {
      console.error("Error recording sale:", err);
      setError(err.message || "Failed to record sale. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `NLe ${new Intl.NumberFormat("en", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount)}`;
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
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fuel/sales">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Record Fuel Sale</h1>
          <p className="text-muted-foreground">
            Enter sale details and select payment method
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Sale Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Station & Pump Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fuel className="h-5 w-5" />
                  Station & Pump
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="station">Station *</Label>
                    <Select
                      value={selectedStation}
                      onValueChange={setSelectedStation}
                    >
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
                    <Label htmlFor="pump">Pump (Optional)</Label>
                    <Select
                      value={selectedPump}
                      onValueChange={setSelectedPump}
                      disabled={!selectedStation || pumps.length === 0}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pump" />
                      </SelectTrigger>
                      <SelectContent>
                        {pumps.map((pump) => (
                          <SelectItem key={pump.id} value={pump.id}>
                            {pump.name} (#{pump.pump_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fuel Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Fuel Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel Type *</Label>
                    <Select
                      value={selectedFuelType}
                      onValueChange={setSelectedFuelType}
                      disabled={!selectedStation}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map((type) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} ({type.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pricePerLiter">Price per Liter</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        NLe
                      </span>
                      <Input
                        id="pricePerLiter"
                        type="number"
                        step="0.01"
                        value={pricePerLiter}
                        onChange={(e) => setPricePerLiter(parseFloat(e.target.value) || 0)}
                        className="pl-12"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity (Liters) *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.001"
                      placeholder="Enter liters"
                      value={quantityLiters}
                      onChange={(e) => setQuantityLiters(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discount">Discount (NLe)</Label>
                    <Input
                      id="discount"
                      type="number"
                      step="0.01"
                      value={discount}
                      onChange={(e) => setDiscount(e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer & Vehicle */}
            <Card>
              <CardHeader>
                <CardTitle>Customer & Vehicle</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Customer Type</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={customerType === "walkin" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCustomerType("walkin")}
                    >
                      Walk-in
                    </Button>
                    <Button
                      type="button"
                      variant={customerType === "fleet" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCustomerType("fleet")}
                    >
                      Fleet
                    </Button>
                    <Button
                      type="button"
                      variant={customerType === "prepaid" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCustomerType("prepaid")}
                    >
                      Prepaid Card
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle">Vehicle Registration</Label>
                    <Input
                      id="vehicle"
                      placeholder="e.g., GR-1234-21"
                      value={vehicleRegistration}
                      onChange={(e) => setVehicleRegistration(e.target.value.toUpperCase())}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="odometer">Odometer Reading</Label>
                    <Input
                      id="odometer"
                      type="number"
                      placeholder="Current mileage"
                      value={odometerReading}
                      onChange={(e) => setOdometerReading(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Any additional notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Payment & Summary */}
          <div className="space-y-6">
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <TabsList className="grid grid-cols-3 h-auto">
                    <TabsTrigger value="cash" className="flex flex-col py-3">
                      <Banknote className="h-5 w-5 mb-1" />
                      <span className="text-xs">Cash</span>
                    </TabsTrigger>
                    <TabsTrigger value="qr" className="flex flex-col py-3">
                      <QrCode className="h-5 w-5 mb-1" />
                      <span className="text-xs">QR</span>
                    </TabsTrigger>
                    <TabsTrigger value="peeap_card" className="flex flex-col py-3">
                      <CreditCard className="h-5 w-5 mb-1" />
                      <span className="text-xs">Card</span>
                    </TabsTrigger>
                  </TabsList>
                  <TabsList className="grid grid-cols-3 h-auto mt-2">
                    <TabsTrigger value="mobile" className="flex flex-col py-3">
                      <Smartphone className="h-5 w-5 mb-1" />
                      <span className="text-xs">Mobile</span>
                    </TabsTrigger>
                    <TabsTrigger value="fleet" className="flex flex-col py-3">
                      <Truck className="h-5 w-5 mb-1" />
                      <span className="text-xs">Fleet</span>
                    </TabsTrigger>
                    <TabsTrigger value="prepaid" className="flex flex-col py-3">
                      <DollarSign className="h-5 w-5 mb-1" />
                      <span className="text-xs">Prepaid</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardContent>
            </Card>

            {/* Sale Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Sale Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Quantity</span>
                    <span>{quantity.toFixed(3)} L</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price/Liter</span>
                    <span>{formatCurrency(pricePerLiter)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <Card className="border-destructive bg-destructive/10">
                <CardContent className="py-4">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="space-y-2">
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting || !selectedStation || !selectedFuelType || quantity <= 0}
              >
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Complete Sale
              </Button>
              <Link href="/dashboard/fuel/sales" className="block">
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
