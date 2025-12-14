"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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
  Send,
  Download,
  MoreHorizontal,
  Trash2,
  Edit,
  DollarSign,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  Copy,
  Printer,
} from "lucide-react";
import { invoiceService } from "@/lib/invoices/invoice.service";
import type { Invoice, InvoiceStatus, PaymentMethod } from "@/lib/invoices/types";

const statusColors: Record<InvoiceStatus, string> = {
  draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  viewed: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  partially_paid: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  refunded: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300",
};

const statusIcons: Record<InvoiceStatus, React.ReactNode> = {
  draft: <FileText className="h-4 w-4" />,
  sent: <Send className="h-4 w-4" />,
  viewed: <Clock className="h-4 w-4" />,
  paid: <CheckCircle2 className="h-4 w-4" />,
  partially_paid: <DollarSign className="h-4 w-4" />,
  overdue: <Clock className="h-4 w-4" />,
  cancelled: <XCircle className="h-4 w-4" />,
  refunded: <DollarSign className="h-4 w-4" />,
};

function formatCurrency(amount: number, _currency = "SLE"): string {
  return `NLe ${new Intl.NumberFormat("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  useEffect(() => {
    loadInvoice();
  }, [resolvedParams.invoiceId]);

  const loadInvoice = async () => {
    try {
      const data = await invoiceService.getInvoice(resolvedParams.invoiceId);
      if (data) {
        setInvoice(data);
        setPaymentAmount(data.balance_due.toString());
      } else {
        router.push("/dashboard/invoices");
      }
    } catch (error) {
      console.error("Failed to load invoice:", error);
      router.push("/dashboard/invoices");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!invoice) return;
    setIsSending(true);
    try {
      await invoiceService.sendInvoice(invoice.id);
      loadInvoice();
    } catch (error) {
      console.error("Failed to send invoice:", error);
      alert("Failed to send invoice");
    } finally {
      setIsSending(false);
    }
  };

  const handleRecordPayment = async () => {
    if (!invoice) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid payment amount");
      return;
    }

    setIsRecordingPayment(true);
    try {
      await invoiceService.recordPayment({
        invoice_id: invoice.id,
        amount,
        payment_method: paymentMethod,
        payment_reference: paymentReference || undefined,
        notes: paymentNotes || undefined,
      });
      setShowPaymentDialog(false);
      loadInvoice();
    } catch (error) {
      console.error("Failed to record payment:", error);
      alert("Failed to record payment");
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleCancel = async () => {
    if (!invoice) return;
    if (!confirm("Are you sure you want to cancel this invoice?")) return;

    try {
      await invoiceService.cancelInvoice(invoice.id);
      loadInvoice();
    } catch (error) {
      console.error("Failed to cancel invoice:", error);
      alert("Failed to cancel invoice");
    }
  };

  const handleDelete = async () => {
    if (!invoice) return;
    if (!confirm("Are you sure you want to delete this invoice? This cannot be undone."))
      return;

    try {
      await invoiceService.deleteInvoice(invoice.id);
      router.push("/dashboard/invoices");
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      alert("Failed to delete invoice");
    }
  };

  const copyPaymentLink = () => {
    if (!invoice) return;
    const paymentLink = `${window.location.origin}/pay/${invoice.id}`;
    navigator.clipboard.writeText(paymentLink);
    alert("Payment link copied to clipboard!");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!invoice) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/invoices">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{invoice.invoice_number}</h1>
              <Badge className={statusColors[invoice.status]}>
                {statusIcons[invoice.status]}
                <span className="ml-1 capitalize">
                  {invoice.status.replace("_", " ")}
                </span>
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Created {formatDateTime(invoice.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {invoice.status === "draft" && (
            <Button onClick={handleSend} disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send Invoice
            </Button>
          )}

          {(invoice.status === "sent" ||
            invoice.status === "viewed" ||
            invoice.status === "partially_paid" ||
            invoice.status === "overdue") && (
            <Button onClick={() => setShowPaymentDialog(true)}>
              <DollarSign className="h-4 w-4 mr-2" />
              Record Payment
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={copyPaymentLink}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Payment Link
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Printer className="h-4 w-4 mr-2" />
                Print Invoice
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              {invoice.status === "draft" && (
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/invoices/${invoice.id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Invoice
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {invoice.status !== "cancelled" && invoice.status !== "paid" && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Invoice
                </DropdownMenuItem>
              )}
              <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer & Invoice Info */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Bill To
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{invoice.customer_name}</span>
                </div>
                {invoice.customer_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{invoice.customer_email}</span>
                  </div>
                )}
                {invoice.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{invoice.customer_phone}</span>
                  </div>
                )}
                {invoice.customer_address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{invoice.customer_address}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Invoice Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Invoice Number</span>
                  <span className="font-medium">{invoice.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issue Date</span>
                  <span>{formatDate(invoice.issue_date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Due Date</span>
                  <span
                    className={
                      invoice.status !== "paid" &&
                      new Date(invoice.due_date) < new Date()
                        ? "text-red-600 font-medium"
                        : ""
                    }
                  >
                    {formatDate(invoice.due_date)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Currency</span>
                  <span>{invoice.currency}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b text-sm text-muted-foreground">
                      <th className="text-left py-3">Description</th>
                      <th className="text-right py-3">Qty</th>
                      <th className="text-right py-3">Price</th>
                      <th className="text-right py-3">Tax</th>
                      <th className="text-right py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items?.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="py-4">{item.description}</td>
                        <td className="text-right py-4">{item.quantity}</td>
                        <td className="text-right py-4">
                          {formatCurrency(item.unit_price, invoice.currency)}
                        </td>
                        <td className="text-right py-4">{item.tax_rate}%</td>
                        <td className="text-right py-4 font-medium">
                          {formatCurrency(item.total_amount, invoice.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 space-y-2 ml-auto max-w-xs">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatCurrency(invoice.subtotal, invoice.currency)}</span>
                </div>
                {invoice.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-green-600">
                      -{formatCurrency(invoice.discount_amount, invoice.currency)}
                    </span>
                  </div>
                )}
                {invoice.tax_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span>
                      {formatCurrency(invoice.tax_amount, invoice.currency)}
                    </span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>
                    {formatCurrency(invoice.total_amount, invoice.currency)}
                  </span>
                </div>
                {invoice.amount_paid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Paid</span>
                      <span>
                        -{formatCurrency(invoice.amount_paid, invoice.currency)}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Balance Due</span>
                      <span>
                        {formatCurrency(invoice.balance_due, invoice.currency)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {invoice.notes && (
                  <div>
                    <h4 className="font-medium mb-2">Notes</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {invoice.notes}
                    </p>
                  </div>
                )}
                {invoice.terms && (
                  <div>
                    <h4 className="font-medium mb-2">Payment Terms</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {invoice.terms}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Amount</span>
                <span className="font-medium">
                  {formatCurrency(invoice.total_amount, invoice.currency)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount Paid</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(invoice.amount_paid, invoice.currency)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="font-medium">Balance Due</span>
                <span className="font-bold text-lg">
                  {formatCurrency(invoice.balance_due, invoice.currency)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoice.paid_date && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-green-500" />
                    <div>
                      <p className="font-medium text-sm">Paid in full</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(invoice.paid_date)}
                      </p>
                    </div>
                  </div>
                )}
                {invoice.viewed_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-purple-500" />
                    <div>
                      <p className="font-medium text-sm">Invoice viewed</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(invoice.viewed_at)}
                      </p>
                    </div>
                  </div>
                )}
                {invoice.sent_at && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 mt-2 rounded-full bg-blue-500" />
                    <div>
                      <p className="font-medium text-sm">Invoice sent</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(invoice.sent_at)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <div className="w-2 h-2 mt-2 rounded-full bg-gray-400" />
                  <div>
                    <p className="font-medium text-sm">Invoice created</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(invoice.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoice.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex justify-between items-center p-3 bg-muted/50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-sm">
                          {formatCurrency(payment.amount, invoice.currency)}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {payment.payment_method.replace("_", " ")}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.payment_date)}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Record Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice {invoice.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="paymentAmount">Amount *</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                max={invoice.balance_due}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Balance due: {formatCurrency(invoice.balance_due, invoice.currency)}
              </p>
            </div>
            <div>
              <Label htmlFor="paymentMethod">Payment Method *</Label>
              <Select
                value={paymentMethod}
                onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="peeap_wallet">Peeap Wallet</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="paymentReference">Reference Number</Label>
              <Input
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID or reference"
              />
            </div>
            <div>
              <Label htmlFor="paymentNotes">Notes</Label>
              <Textarea
                id="paymentNotes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowPaymentDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleRecordPayment} disabled={isRecordingPayment}>
              {isRecordingPayment ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Record Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
