"use client";

import { useState } from "react";
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
import { ArrowLeft, Loader2, Store } from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FuelStationStatus } from "@/lib/fuel/types";

// Sierra Leone Regions and Districts
const SIERRA_LEONE_REGIONS = {
  "Western Area": ["Western Area Urban", "Western Area Rural"],
  "North West": ["Kambia", "Karene", "Port Loko"],
  "Northern": ["Bombali", "Falaba", "Koinadugu", "Tonkolili"],
  "Southern": ["Bo", "Bonthe", "Moyamba", "Pujehun"],
  "Eastern": ["Kailahun", "Kenema", "Kono"],
} as const;

type Region = keyof typeof SIERRA_LEONE_REGIONS;

interface FormData {
  name: string;
  code: string;
  address: string;
  district: string;
  region: string;
  contact_phone: string;
  status: FuelStationStatus;
}

export default function NewStationPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: "",
    code: "",
    address: "",
    district: "",
    region: "",
    contact_phone: "",
    status: "active",
  });

  // Get districts for selected region
  const availableDistricts = formData.region
    ? SIERRA_LEONE_REGIONS[formData.region as Region] || []
    : [];

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };
      // Clear district when region changes
      if (field === "region") {
        newData.district = "";
      }
      return newData;
    });
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.name.trim()) {
      setError("Station name is required");
      return;
    }
    if (!formData.code.trim()) {
      setError("Station code is required");
      return;
    }
    if (!formData.region) {
      setError("Region is required");
      return;
    }
    if (!formData.district) {
      setError("District is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const station = await fuelService.createStation({
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        address: formData.address.trim() || undefined,
        city: formData.district, // Use district as city
        region: formData.region,
        contact_phone: formData.contact_phone.trim() || undefined,
      });

      router.push(`/dashboard/fuel/stations/${station.id}`);
    } catch (err: any) {
      console.error("Error creating station:", err);
      setError(err.message || "Failed to create station. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Generate station code from name
  const generateCode = () => {
    if (formData.name) {
      const words = formData.name.trim().split(" ");
      let code = "";
      if (words.length >= 2) {
        code = words.map((w) => w[0]).join("").toUpperCase();
      } else {
        code = formData.name.substring(0, 3).toUpperCase();
      }
      // Add random number
      code += Math.floor(Math.random() * 900 + 100);
      handleChange("code", code);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fuel/stations">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add New Station</h1>
          <p className="text-muted-foreground">
            Create a new fuel station in your network
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Enter the station's basic details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Station Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Main Street Station"
                  value={formData.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => !formData.code && generateCode()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Station Code *</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    placeholder="e.g., MSS001"
                    value={formData.code}
                    onChange={(e) => handleChange("code", e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateCode}
                    disabled={!formData.name}
                  >
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Unique identifier for this station
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleChange("status", value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Contact Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., +232 XX XXX XXX"
                  value={formData.contact_phone}
                  onChange={(e) => handleChange("contact_phone", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle>Location Details</CardTitle>
              <CardDescription>
                Where is this station located in Sierra Leone?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region *</Label>
                  <Select
                    value={formData.region}
                    onValueChange={(value) => handleChange("region", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select region" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(SIERRA_LEONE_REGIONS).map((region) => (
                        <SelectItem key={region} value={region}>
                          {region}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District *</Label>
                  <Select
                    value={formData.district}
                    onValueChange={(value) => handleChange("district", value)}
                    disabled={!formData.region}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={formData.region ? "Select district" : "Select region first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDistricts.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Street Address</Label>
                <Textarea
                  id="address"
                  placeholder="Enter the full street address (e.g., 25 Siaka Stevens Street)"
                  value={formData.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive bg-destructive/10">
            <CardContent className="py-4">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-4 mt-6">
          <Link href="/dashboard/fuel/stations">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Station
          </Button>
        </div>
      </form>
    </div>
  );
}
