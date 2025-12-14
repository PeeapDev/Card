"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building2, Save, User, Mail, Phone, MapPin, DollarSign } from "lucide-react";
import { fuelService } from "@/lib/fuel/fuel.service";

export default function NewFleetCustomerPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [taxId, setTaxId] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("30");
  const [discountPercent, setDiscountPercent] = useState("0");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) return;

    setIsSaving(true);
    try {
      await fuelService.createFleetCustomer({
        company_name: companyName,
        contact_name: contactName || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address: address || undefined,
        city: city || undefined,
        tax_id: taxId || undefined,
        credit_limit: creditLimit ? parseFloat(creditLimit) : 0,
        payment_terms: parseInt(paymentTerms) || 30,
        discount_percent: parseFloat(discountPercent) || 0,
      });
      router.push("/dashboard/fuel/fleet");
    } catch (error) {
      console.error("Error creating customer:", error);
      alert("Failed to create customer. Please try again.");
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

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/fuel/fleet">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Add Fleet Customer</h1>
          <p className="text-muted-foreground">
            Register a new corporate fleet account
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6">
          {/* Company Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Information
              </CardTitle>
              <CardDescription>
                Basic details about the fleet customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="companyName">Company Name *</Label>
                  <Input
                    id="companyName"
                    placeholder="Enter company name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID / TIN</Label>
                  <Input
                    id="taxId"
                    placeholder="e.g., GHA-123456789"
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="city"
                      placeholder="e.g., Accra"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Textarea
                  id="address"
                  placeholder="Full business address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contact Person */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Contact Person
              </CardTitle>
              <CardDescription>
                Primary contact for this fleet account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    placeholder="Full name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+233 XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Credit Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Credit Terms
              </CardTitle>
              <CardDescription>
                Set credit limits and payment terms for this customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="creditLimit">Credit Limit (NLe)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      NLe
                    </span>
                    <Input
                      id="creditLimit"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="pl-12"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Maximum outstanding balance allowed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                  <Input
                    id="paymentTerms"
                    type="number"
                    min="1"
                    max="365"
                    placeholder="30"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Days allowed for invoice payment
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="discountPercent">Discount (%)</Label>
                  <div className="relative">
                    <Input
                      id="discountPercent"
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={discountPercent}
                      onChange={(e) => setDiscountPercent(e.target.value)}
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      %
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Discount applied to all purchases
                  </p>
                </div>
              </div>

              {/* Preview */}
              {creditLimit && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Account Preview</p>
                  <div className="grid gap-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Credit Limit</span>
                      <span className="font-medium">
                        {formatCurrency(parseFloat(creditLimit) || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Terms</span>
                      <span className="font-medium">Net {paymentTerms} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Volume Discount</span>
                      <span className="font-medium">
                        {parseFloat(discountPercent) || 0}%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special arrangements, requirements, or notes about this customer..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={isSaving || !companyName}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? "Creating..." : "Create Customer"}
            </Button>
            <Link href="/dashboard/fuel/fleet">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
