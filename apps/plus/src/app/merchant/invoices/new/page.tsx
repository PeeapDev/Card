"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Send,
  Save,
  AlertTriangle,
} from "lucide-react";
import { merchantInvoiceService, type MerchantInvoiceLimits, type CreateMerchantInvoiceDto } from "@/lib/merchant/merchant-invoice.service";
import { merchantInvoiceTypesService, type InvoiceTypeDefinition } from "@/lib/merchant/merchant-invoice-types.service";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
}

export default function NewMerchantInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [limits, setLimits] = useState<MerchantInvoiceLimits | null>(null);

  // Invoice types
  const [availableTypes, setAvailableTypes] = useState<InvoiceTypeDefinition[]>([]);
  const [selectedType, setSelectedType] = useState<string>("standard");

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [currency, setCurrency] = useState("SLE");
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unit_price: 0 },
  ]);

  useEffect(() => {
    loadData();
    // Set default due date to 14 days from now
    const defaultDue = new Date();
    defaultDue.setDate(defaultDue.getDate() + 14);
    setDueDate(defaultDue.toISOString().split("T")[0]);
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/auth/login");
        return;
      }

      const { data: business } = await supabase
        .from("plus_businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (business) {
        setBusinessId(business.id);

        // Load limits
        const limitsData = await merchantInvoiceService.getInvoiceLimits(business.id);
        setLimits(limitsData);

        if (!limitsData.can_create) {
          toast.error("Monthly invoice limit reached");
        }

        // Load available invoice types for this merchant
        const types = await merchantInvoiceTypesService.getUsableTypes(business.id);
        setAvailableTypes(types);

        // Set default selected type
        if (types.length > 0) {
          setSelectedType(types[0].code);
        }
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 1, unit_price: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: string | number) => {
    const updated = [...items];
    if (field === "quantity" || field === "unit_price") {
      updated[index][field] = Number(value) || 0;
    } else {
      updated[index][field] = value as string;
    }
    setItems(updated);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  };

  const formatCurrency = (amount: number) => `${currency} ${amount.toLocaleString()}`;

  const validateForm = (): string | null => {
    if (!customerName.trim()) return "Customer name is required";
    if (!dueDate) return "Due date is required";
    if (items.length === 0) return "At least one item is required";

    for (let i = 0; i < items.length; i++) {
      if (!items[i].description.trim()) {
        return `Item ${i + 1}: Description is required`;
      }
      if (items[i].quantity <= 0) {
        return `Item ${i + 1}: Quantity must be greater than 0`;
      }
      if (items[i].unit_price <= 0) {
        return `Item ${i + 1}: Price must be greater than 0`;
      }
    }

    return null;
  };

  const handleSubmit = async (sendImmediately: boolean = false) => {
    const error = validateForm();
    if (error) {
      toast.error(error);
      return;
    }

    if (!businessId) {
      toast.error("Business not found");
      return;
    }

    if (!limits?.can_create) {
      toast.error("Monthly invoice limit reached");
      return;
    }

    setLoading(true);
    try {
      const dto: CreateMerchantInvoiceDto = {
        customer_name: customerName,
        customer_email: customerEmail || undefined,
        customer_phone: customerPhone || undefined,
        due_date: dueDate,
        items: items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
        })),
        notes: notes || undefined,
        currency,
        invoice_type_code: selectedType,
      };

      const result = await merchantInvoiceService.createInvoice(businessId, dto);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      if (result.invoice && sendImmediately) {
        await merchantInvoiceService.sendInvoice(result.invoice.id);
        toast.success("Invoice created and sent!");
      } else {
        toast.success("Invoice created as draft");
      }

      router.push("/merchant/invoices");
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  if (limits && !limits.can_create) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/merchant/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            New Invoice
          </h1>
        </div>

        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-200 text-lg">
                  Monthly Invoice Limit Reached
                </h3>
                <p className="text-amber-700 dark:text-amber-300 mt-2">
                  You've created {limits.current_month_count} of {limits.max_invoices_per_month} invoices this month.
                </p>
                <p className="text-amber-700 dark:text-amber-300 mt-1">
                  Contact your administrator to increase your limit or wait until next month.
                </p>
                <Link href="/merchant/invoices">
                  <Button className="mt-4" variant="outline">
                    Back to Invoices
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/merchant/invoices">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            New Invoice
          </h1>
          {limits && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {limits.remaining} invoices remaining this month
            </p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone">Phone</Label>
                  <Input
                    id="customerPhone"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+232..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invoice Type Selector */}
              {availableTypes.length > 0 && (
                <div>
                  <Label htmlFor="invoiceType">Invoice Type *</Label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select invoice type" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTypes.map((type) => (
                        <SelectItem key={type.code} value={type.code}>
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {type.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {availableTypes.find((t) => t.code === selectedType)?.description && (
                    <p className="text-xs text-gray-500 mt-1">
                      {availableTypes.find((t) => t.code === selectedType)?.description}
                    </p>
                  )}
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date *</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SLE">SLE - Sierra Leone Leone</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg space-y-3"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <Label>Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, "description", e.target.value)}
                        placeholder="Item description"
                      />
                    </div>
                    {items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700 mt-6"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, "quantity", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Total</Label>
                      <div className="h-10 flex items-center px-3 bg-gray-100 dark:bg-gray-700 rounded-md text-gray-900 dark:text-white font-medium">
                        {formatCurrency(item.quantity * item.unit_price)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Notes (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes for the customer..."
                rows={3}
              />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Summary */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Invoice Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invoice Type */}
              {availableTypes.length > 0 && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Invoice Type</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {availableTypes.find((t) => t.code === selectedType)?.name || "Standard Invoice"}
                  </p>
                </div>
              )}

              {customerName && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Customer</p>
                  <p className="font-medium text-gray-900 dark:text-white">{customerName}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Items</p>
                <p className="font-medium text-gray-900 dark:text-white">{items.length} item(s)</p>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {formatCurrency(calculateSubtotal())}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center text-lg font-bold">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-green-600">{formatCurrency(calculateSubtotal())}</span>
                </div>
              </div>

              <div className="pt-4 space-y-3">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700"
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {loading ? "Creating..." : "Create & Send"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSubmit(false)}
                  disabled={loading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
