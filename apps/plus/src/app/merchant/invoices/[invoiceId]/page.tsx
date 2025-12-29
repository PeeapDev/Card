"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Copy,
  FileText,
  User,
  Calendar,
  DollarSign,
  Trash2,
} from "lucide-react";
import { merchantInvoiceService } from "@/lib/merchant/merchant-invoice.service";
import type { Invoice, InvoiceStatus } from "@/lib/invoices/types";
import { toast } from "sonner";

export default function MerchantInvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);

  const loadInvoice = async () => {
    try {
      const data = await merchantInvoiceService.getInvoice(invoiceId);
      setInvoice(data);
    } catch (error) {
      console.error("Error loading invoice:", error);
      toast.error("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    const success = await merchantInvoiceService.sendInvoice(invoiceId);
    if (success) {
      toast.success("Invoice sent successfully");
      loadInvoice();
    } else {
      toast.error("Failed to send invoice");
    }
  };

  const handleMarkAsPaid = async () => {
    const success = await merchantInvoiceService.markAsPaid(invoiceId);
    if (success) {
      toast.success("Invoice marked as paid");
      loadInvoice();
    } else {
      toast.error("Failed to mark as paid");
    }
  };

  const handleCancel = async () => {
    const success = await merchantInvoiceService.cancelInvoice(invoiceId);
    if (success) {
      toast.success("Invoice cancelled");
      loadInvoice();
    } else {
      toast.error("Failed to cancel invoice");
    }
  };

  const handleDelete = async () => {
    const success = await merchantInvoiceService.deleteInvoice(invoiceId);
    if (success) {
      toast.success("Invoice deleted");
      router.push("/merchant/invoices");
    } else {
      toast.error("Only draft invoices can be deleted");
    }
  };

  const handleCopyPaymentLink = () => {
    const link = merchantInvoiceService.getPaymentLink(invoiceId);
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied to clipboard");
  };

  const formatCurrency = (amount: number) => {
    return `${invoice?.currency || "SLE"} ${amount.toLocaleString()}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: InvoiceStatus) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      sent: { variant: "default", label: "Sent", className: "bg-blue-500" },
      viewed: { variant: "default", label: "Viewed", className: "bg-purple-500" },
      paid: { variant: "default", label: "Paid", className: "bg-green-500" },
      partially_paid: { variant: "default", label: "Partially Paid", className: "bg-yellow-500" },
      overdue: { variant: "destructive", label: "Overdue" },
      cancelled: { variant: "outline", label: "Cancelled" },
      refunded: { variant: "outline", label: "Refunded" },
    };
    const c = config[status] || { variant: "secondary", label: status };
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
          Invoice not found
        </h3>
        <Link href="/merchant/invoices">
          <Button variant="outline">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/merchant/invoices">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                #{invoice.invoice_number}
              </h1>
              {getStatusBadge(invoice.status)}
              {invoice.invoice_type_code && invoice.invoice_type_code !== "standard" && (
                <Badge variant="outline" className="capitalize">
                  {invoice.invoice_type_code.replace(/_/g, " ")}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Created {formatDate(invoice.created_at)}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleCopyPaymentLink}>
            <Copy className="w-4 h-4 mr-2" />
            Copy Payment Link
          </Button>
          {invoice.status === "draft" && (
            <>
              <Button onClick={handleSend} className="bg-blue-600 hover:bg-blue-700">
                <Send className="w-4 h-4 mr-2" />
                Send Invoice
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </>
          )}
          {["sent", "viewed", "overdue"].includes(invoice.status) && (
            <Button onClick={handleMarkAsPaid} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          {invoice.status !== "paid" && invoice.status !== "cancelled" && invoice.status !== "draft" && (
            <Button variant="destructive" onClick={handleCancel}>
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="font-medium text-gray-900 dark:text-white">
                  {invoice.customer_name}
                </p>
                {invoice.customer_email && (
                  <p className="text-gray-600 dark:text-gray-400">{invoice.customer_email}</p>
                )}
                {invoice.customer_phone && (
                  <p className="text-gray-600 dark:text-gray-400">{invoice.customer_phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Description
                      </th>
                      <th className="text-right py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Qty
                      </th>
                      <th className="text-right py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Price
                      </th>
                      <th className="text-right py-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item, index) => (
                      <tr
                        key={item.id || index}
                        className="border-b border-gray-100 dark:border-gray-800"
                      >
                        <td className="py-3 text-gray-900 dark:text-white">
                          {item.description}
                        </td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="py-3 text-right text-gray-900 dark:text-white">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                          {formatCurrency(item.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="text-gray-900 dark:text-white">
                    {formatCurrency(invoice.subtotal)}
                  </span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount</span>
                    <span>-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Tax</span>
                    <span className="text-gray-900 dark:text-white">
                      {formatCurrency(invoice.tax_amount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-gray-900 dark:text-white">Total</span>
                  <span className="text-green-600">{formatCurrency(invoice.total_amount)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {invoice.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {invoice.notes}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Payment Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Amount</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(invoice.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Paid</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoice.amount_paid)}
                </span>
              </div>
              <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-700">
                <span className="text-gray-600 dark:text-gray-400">Balance Due</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {formatCurrency(invoice.balance_due)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Dates Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Issue Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(invoice.issue_date)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Due Date</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatDate(invoice.due_date)}
                </p>
              </div>
              {invoice.sent_at && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sent At</p>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {formatDate(invoice.sent_at)}
                  </p>
                </div>
              )}
              {invoice.paid_date && (
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Paid At</p>
                  <p className="font-medium text-green-600">{formatDate(invoice.paid_date)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Link Card */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Link</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                Share this link with your customer to receive payment
              </p>
              <Button className="w-full" variant="outline" onClick={handleCopyPaymentLink}>
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
