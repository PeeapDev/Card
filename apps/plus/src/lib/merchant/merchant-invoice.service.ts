/**
 * Merchant Invoice Service
 *
 * Simplified invoice service for merchants with admin-controlled limits.
 * - Monthly invoice limit
 * - Basic invoice creation (no recurring)
 * - Simple item list without complex tax/discount calculations
 */

import { supabase } from "@/lib/supabase";
import type { Invoice, InvoiceStatus, CreateInvoiceItemDto } from "@/lib/invoices/types";
import { merchantInvoiceTypesService } from "./merchant-invoice-types.service";

// Merchant Invoice Types
export interface MerchantInvoiceLimits {
  max_invoices_per_month: number;
  current_month_count: number;
  can_create: boolean;
  remaining: number;
}

export interface MerchantInvoiceStats {
  total_invoices: number;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  this_month_count: number;
  this_month_limit: number;
  recent_invoices: Invoice[];
}

export interface CreateMerchantInvoiceDto {
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  due_date: string;
  items: {
    description: string;
    quantity: number;
    unit_price: number;
  }[];
  notes?: string;
  currency?: string;
  invoice_type_code?: string;
}

// Default monthly limit (can be overridden by admin)
const DEFAULT_MONTHLY_LIMIT = 10;

class MerchantInvoiceService {
  /**
   * Get merchant's invoice limits for current month
   */
  async getInvoiceLimits(businessId: string): Promise<MerchantInvoiceLimits> {
    try {
      // Get monthly limit from business settings
      const { data: business } = await supabase
        .from("plus_businesses")
        .select("settings")
        .eq("id", businessId)
        .single();

      const maxLimit = business?.settings?.merchant_invoice_limit ?? DEFAULT_MONTHLY_LIMIT;

      // Count invoices created this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count } = await supabase
        .from("invoices")
        .select("*", { count: "exact", head: true })
        .eq("business_id", businessId)
        .gte("created_at", startOfMonth.toISOString());

      const currentCount = count || 0;
      const remaining = Math.max(0, maxLimit - currentCount);

      return {
        max_invoices_per_month: maxLimit,
        current_month_count: currentCount,
        can_create: currentCount < maxLimit,
        remaining,
      };
    } catch (error) {
      console.error("Error getting invoice limits:", error);
      return {
        max_invoices_per_month: DEFAULT_MONTHLY_LIMIT,
        current_month_count: 0,
        can_create: true,
        remaining: DEFAULT_MONTHLY_LIMIT,
      };
    }
  }

  /**
   * Get merchant invoice statistics
   */
  async getStats(businessId: string): Promise<MerchantInvoiceStats> {
    try {
      const limits = await this.getInvoiceLimits(businessId);

      // Get all invoices for this business
      const { data: invoices } = await supabase
        .from("invoices")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      const allInvoices = invoices || [];

      let totalAmount = 0;
      let paidAmount = 0;
      let pendingAmount = 0;

      for (const inv of allInvoices) {
        totalAmount += inv.total_amount || 0;
        if (inv.status === "paid") {
          paidAmount += inv.total_amount || 0;
        } else if (inv.status !== "cancelled" && inv.status !== "refunded") {
          pendingAmount += inv.balance_due || inv.total_amount || 0;
        }
      }

      return {
        total_invoices: allInvoices.length,
        total_amount: totalAmount,
        paid_amount: paidAmount,
        pending_amount: pendingAmount,
        this_month_count: limits.current_month_count,
        this_month_limit: limits.max_invoices_per_month,
        recent_invoices: allInvoices.slice(0, 5),
      };
    } catch (error) {
      console.error("Error getting stats:", error);
      return {
        total_invoices: 0,
        total_amount: 0,
        paid_amount: 0,
        pending_amount: 0,
        this_month_count: 0,
        this_month_limit: DEFAULT_MONTHLY_LIMIT,
        recent_invoices: [],
      };
    }
  }

  /**
   * Get all invoices for merchant
   */
  async getInvoices(businessId: string, status?: InvoiceStatus): Promise<Invoice[]> {
    try {
      let query = supabase
        .from("invoices")
        .select("*, invoice_items(*)")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error("Error getting invoices:", error);
      return [];
    }
  }

  /**
   * Get single invoice
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*, invoice_items(*), invoice_payments(*)")
        .eq("id", invoiceId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error getting invoice:", error);
      return null;
    }
  }

  /**
   * Create a new merchant invoice (with limit check)
   */
  async createInvoice(
    businessId: string,
    dto: CreateMerchantInvoiceDto
  ): Promise<{ invoice: Invoice | null; error: string | null }> {
    try {
      // Check limits first
      const limits = await this.getInvoiceLimits(businessId);
      if (!limits.can_create) {
        return {
          invoice: null,
          error: `Monthly invoice limit reached (${limits.max_invoices_per_month}). Please upgrade your plan or wait until next month.`,
        };
      }

      // Validate invoice type is allowed for this merchant
      if (dto.invoice_type_code) {
        const canUseType = await merchantInvoiceTypesService.canUseType(
          businessId,
          dto.invoice_type_code
        );
        if (!canUseType) {
          return {
            invoice: null,
            error: `You are not authorized to create ${dto.invoice_type_code.replace(/_/g, " ")} invoices. Please select a different invoice type or contact support.`,
          };
        }
      }

      // Calculate totals (simple - no tax/discount for merchant basic invoices)
      let subtotal = 0;
      const itemsWithTotals = dto.items.map((item, index) => {
        const total = item.quantity * item.unit_price;
        subtotal += total;
        return {
          type: "service" as const,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: 0,
          tax_amount: 0,
          discount_percent: 0,
          discount_amount: 0,
          total_amount: total,
          sort_order: index,
        };
      });

      // Create invoice
      const { data: invoice, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          business_id: businessId,
          customer_name: dto.customer_name,
          customer_email: dto.customer_email,
          customer_phone: dto.customer_phone,
          issue_date: new Date().toISOString().split("T")[0],
          due_date: dto.due_date,
          subtotal,
          discount_amount: 0,
          tax_amount: 0,
          total_amount: subtotal,
          amount_paid: 0,
          balance_due: subtotal,
          currency: dto.currency || "SLE",
          status: "draft",
          notes: dto.notes,
          invoice_type_code: dto.invoice_type_code || "standard",
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      // Create invoice items
      if (invoice && itemsWithTotals.length > 0) {
        const itemsToInsert = itemsWithTotals.map((item) => ({
          ...item,
          invoice_id: invoice.id,
        }));

        await supabase.from("invoice_items").insert(itemsToInsert);
      }

      return { invoice, error: null };
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      return { invoice: null, error: error.message || "Failed to create invoice" };
    }
  }

  /**
   * Send invoice (mark as sent)
   */
  async sendInvoice(invoiceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", invoiceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error sending invoice:", error);
      return false;
    }
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string, paymentMethod?: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) return false;

      const { error } = await supabase
        .from("invoices")
        .update({
          status: "paid",
          amount_paid: invoice.total_amount,
          balance_due: 0,
          paid_date: new Date().toISOString().split("T")[0],
          payment_method: paymentMethod || "other",
        })
        .eq("id", invoiceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error marking as paid:", error);
      return false;
    }
  }

  /**
   * Cancel invoice
   */
  async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "cancelled" })
        .eq("id", invoiceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error cancelling invoice:", error);
      return false;
    }
  }

  /**
   * Delete invoice (only drafts)
   */
  async deleteInvoice(invoiceId: string): Promise<boolean> {
    try {
      // Check if draft
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice || invoice.status !== "draft") {
        return false;
      }

      // Delete items first
      await supabase.from("invoice_items").delete().eq("invoice_id", invoiceId);

      // Delete invoice
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoiceId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting invoice:", error);
      return false;
    }
  }

  /**
   * Generate payment link
   */
  getPaymentLink(invoiceId: string): string {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    return `${baseUrl}/pay/invoice/${invoiceId}`;
  }
}

export const merchantInvoiceService = new MerchantInvoiceService();
