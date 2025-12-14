"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ArrowLeft,
  Building2,
  Edit,
  Car,
  Users,
  FileText,
  DollarSign,
  Plus,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  TrendingUp,
} from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";
import type { FleetCustomer, FleetVehicle, FleetDriver } from "@/lib/fuel/types";

export default function FleetCustomerDetailPage() {
  const params = useParams();
  const customerId = params.customerId as string;

  const [customer, setCustomer] = useState<FleetCustomer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCustomer();
  }, [customerId]);

  const loadCustomer = async () => {
    try {
      const data = await fuelService.getFleetCustomer(customerId);
      setCustomer(data);
    } catch (error) {
      console.error("Error loading customer:", error);
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/fuel/fleet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Customer Not Found</h1>
          </div>
        </div>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Customer not found</h3>
            <p className="text-muted-foreground text-center max-w-md mb-4">
              The fleet customer you're looking for doesn't exist.
            </p>
            <Link href="/dashboard/fuel/fleet">
              <Button>Back to Fleet Accounts</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const creditUtilization =
    customer.credit_limit > 0
      ? (customer.current_balance / customer.credit_limit) * 100
      : 0;
  const availableCredit = customer.credit_limit - customer.current_balance;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/fuel/fleet">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                {customer.company_name}
              </h1>
              <Badge variant={customer.status === "active" ? "default" : "secondary"}>
                {customer.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Fleet Account since{" "}
              {new Date(customer.created_at).toLocaleDateString("en-GH", {
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/fuel/fleet/${customerId}/edit`}>
            <Button variant="outline">
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Limit</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(customer.credit_limit)}
            </div>
            <p className="text-xs text-muted-foreground">
              Net {customer.payment_terms} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                customer.current_balance > 0 ? "text-orange-600" : ""
              }`}
            >
              {formatCurrency(customer.current_balance)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full ${
                  creditUtilization > 80
                    ? "bg-red-500"
                    : creditUtilization > 50
                    ? "bg-orange-500"
                    : "bg-green-500"
                }`}
                style={{ width: `${Math.min(creditUtilization, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Credit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(availableCredit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {creditUtilization.toFixed(1)}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Discount</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customer.discount_percent}%</div>
            <p className="text-xs text-muted-foreground">On all purchases</p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Details and Tabs */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Contact Info Sidebar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer.contact_name && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{customer.contact_name}</p>
                </div>
              </div>
            )}

            {customer.email && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${customer.email}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {customer.email}
                  </a>
                </div>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${customer.phone}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {customer.phone}
                  </a>
                </div>
              </div>
            )}

            {(customer.address || customer.city) && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {customer.address}
                    {customer.address && customer.city && ", "}
                    {customer.city}
                  </p>
                </div>
              </div>
            )}

            {customer.tax_id && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tax ID</p>
                  <p className="font-medium">{customer.tax_id}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="vehicles" className="space-y-4">
            <TabsList>
              <TabsTrigger value="vehicles" className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicles ({customer.vehicles?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="drivers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Drivers ({customer.drivers?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="transactions" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Transactions
              </TabsTrigger>
            </TabsList>

            {/* Vehicles Tab */}
            <TabsContent value="vehicles">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Registered Vehicles</CardTitle>
                    <CardDescription>
                      Vehicles authorized to purchase fuel on this account
                    </CardDescription>
                  </div>
                  <Link href={`/dashboard/fuel/fleet/${customerId}/vehicles/new`}>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Vehicle
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {!customer.vehicles || customer.vehicles.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Car className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-3">No vehicles registered</p>
                      <Link href={`/dashboard/fuel/fleet/${customerId}/vehicles/new`}>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Vehicle
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Registration</TableHead>
                          <TableHead>Vehicle</TableHead>
                          <TableHead>Fuel Type</TableHead>
                          <TableHead>Monthly Usage</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.vehicles.map((vehicle: FleetVehicle) => (
                          <TableRow key={vehicle.id}>
                            <TableCell className="font-medium">
                              {vehicle.registration_number}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">
                                  {vehicle.make} {vehicle.model}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {vehicle.vehicle_type}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{vehicle.fuel_type?.name || "Any"}</TableCell>
                            <TableCell>
                              <div>
                                <p className="text-sm">
                                  {vehicle.current_month_usage_liters?.toFixed(1) || 0}L
                                </p>
                                {vehicle.monthly_limit_liters && (
                                  <p className="text-xs text-muted-foreground">
                                    Limit: {vehicle.monthly_limit_liters}L
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={vehicle.is_active ? "default" : "secondary"}
                              >
                                {vehicle.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Drivers Tab */}
            <TabsContent value="drivers">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Authorized Drivers</CardTitle>
                    <CardDescription>
                      Drivers who can make purchases on behalf of this customer
                    </CardDescription>
                  </div>
                  <Link href={`/dashboard/fuel/fleet/${customerId}/drivers/new`}>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Driver
                    </Button>
                  </Link>
                </CardHeader>
                <CardContent>
                  {!customer.drivers || customer.drivers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground mb-3" />
                      <p className="text-muted-foreground mb-3">No drivers registered</p>
                      <Link href={`/dashboard/fuel/fleet/${customerId}/drivers/new`}>
                        <Button size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add First Driver
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>License</TableHead>
                          <TableHead>Daily Limit</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customer.drivers.map((driver: FleetDriver) => (
                          <TableRow key={driver.id}>
                            <TableCell className="font-medium">{driver.name}</TableCell>
                            <TableCell>
                              <div>
                                {driver.phone && (
                                  <p className="text-sm">{driver.phone}</p>
                                )}
                                {driver.email && (
                                  <p className="text-xs text-muted-foreground">
                                    {driver.email}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>{driver.license_number || "-"}</TableCell>
                            <TableCell>
                              {driver.daily_limit
                                ? formatCurrency(driver.daily_limit)
                                : "Unlimited"}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={driver.is_active ? "default" : "secondary"}
                              >
                                {driver.is_active ? "Active" : "Inactive"}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Transactions Tab */}
            <TabsContent value="transactions">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>
                    Fuel purchases made by this fleet customer
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col items-center justify-center py-8">
                    <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                      Transaction history will appear here
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
