"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  FileText,
  Plus,
  Search,
  MoreVertical,
  Send,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { merchantInvoiceService, type MerchantInvoiceLimits } from "@/lib/merchant/merchant-invoice.service";
import type { Invoice, InvoiceStatus } from "@/lib/invoices/types";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function MerchantInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [limits, setLimits] = useState<MerchantInvoiceLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: business } = await supabase
        .from("plus_businesses")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (business) {
        setBusinessId(business.id);
        const [invoicesData, limitsData] = await Promise.all([
          merchantInvoiceService.getInvoices(business.id),
          merchantInvoiceService.getInvoiceLimits(business.id),
        ]);
        setInvoices(invoicesData);
        setLimits(limitsData);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvoice = async (invoiceId: string) => {
    const success = await merchantInvoiceService.sendInvoice(invoiceId);
    if (success) {
      toast.success("Invoice sent successfully");
      loadData();
    } else {
      toast.error("Failed to send invoice");
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    const success = await merchantInvoiceService.markAsPaid(invoiceId);
    if (success) {
      toast.success("Invoice marked as paid");
      loadData();
    } else {
      toast.error("Failed to mark as paid");
    }
  };

  const handleCancelInvoice = async (invoiceId: string) => {
    const success = await merchantInvoiceService.cancelInvoice(invoiceId);
    if (success) {
      toast.success("Invoice cancelled");
      loadData();
    } else {
      toast.error("Failed to cancel invoice");
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    const success = await merchantInvoiceService.deleteInvoice(invoiceId);
    if (success) {
      toast.success("Invoice deleted");
      loadData();
    } else {
      toast.error("Only draft invoices can be deleted");
    }
  };

  const handleCopyPaymentLink = (invoiceId: string) => {
    const link = merchantInvoiceService.getPaymentLink(invoiceId);
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied to clipboard");
  };

  const formatCurrency = (amount: number) => `SLE ${amount.toLocaleString()}`;

  const formatDate = (date: string) => new Date(date).toLocaleDateString();

  const getStatusBadge = (status: InvoiceStatus) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; className?: string }> = {
      draft: { variant: "secondary", label: "Draft" },
      sent: { variant: "default", label: "Sent", className: "bg-blue-500" },
      viewed: { variant: "default", label: "Viewed", className: "bg-purple-500" },
      paid: { variant: "default", label: "Paid", className: "bg-green-500" },
      partially_paid: { variant: "default", label: "Partial", className: "bg-yellow-500" },
      overdue: { variant: "destructive", label: "Overdue" },
      cancelled: { variant: "outline", label: "Cancelled" },
      refunded: { variant: "outline", label: "Refunded" },
    };
    const c = config[status] || { variant: "secondary", label: status };
    return <Badge variant={c.variant} className={c.className}>{c.label}</Badge>;
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter !== "all" && inv.status !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.customer_name?.toLowerCase().includes(q) ||
        inv.customer_email?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Create and manage your invoices
          </p>
        </div>
        {limits?.can_create ? (
          <Link href="/merchant/invoices/new">
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              New Invoice
            </Button>
          </Link>
        ) : (
          <Button disabled className="bg-gray-400">
            <AlertTriangle className="w-4 h-4 mr-2" />
            Monthly Limit Reached
          </Button>
        )}
      </div>

      {/* Limit Warning */}
      {limits && !limits.can_create && (
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800 dark:text-amber-200">
                  Monthly Invoice Limit Reached
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  You've created {limits.current_month_count} of {limits.max_invoices_per_month} invoices this month.
                  Contact your administrator to increase your limit or wait until next month.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Limit Info */}
      {limits && limits.can_create && (
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <FileText className="w-4 h-4" />
          <span>
            {limits.remaining} of {limits.max_invoices_per_month} invoices remaining this month
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoices..."
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoice List */}
      <Card>
        <CardContent className="p-0">
          {filteredInvoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No invoices found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6">
                {searchQuery ? "Try a different search" : "Create your first invoice to get started"}
              </p>
              {limits?.can_create && (
                <Link href="/merchant/invoices/new">
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Invoice
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Due Date
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
                    >
                      <td className="px-4 py-4">
                        <Link
                          href={`/merchant/invoices/${invoice.id}`}
                          className="font-medium text-gray-900 dark:text-white hover:text-green-600"
                        >
                          #{invoice.invoice_number}
                        </Link>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(invoice.created_at)}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-gray-900 dark:text-white">
                          {invoice.customer_name}
                        </p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {invoice.customer_email}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(invoice.total_amount)}
                        </p>
                      </td>
                      <td className="px-4 py-4">{getStatusBadge(invoice.status)}</td>
                      <td className="px-4 py-4 text-gray-900 dark:text-white">
                        {invoice.due_date ? formatDate(invoice.due_date) : "-"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/merchant/invoices/${invoice.id}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopyPaymentLink(invoice.id)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Payment Link
                            </DropdownMenuItem>
                            {invoice.status === "draft" && (
                              <DropdownMenuItem onClick={() => handleSendInvoice(invoice.id)}>
                                <Send className="w-4 h-4 mr-2" />
                                Send Invoice
                              </DropdownMenuItem>
                            )}
                            {["sent", "viewed", "overdue"].includes(invoice.status) && (
                              <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice.id)}>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Mark as Paid
                              </DropdownMenuItem>
                            )}
                            {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleCancelInvoice(invoice.id)}
                                className="text-red-600"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancel Invoice
                              </DropdownMenuItem>
                            )}
                            {invoice.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
