/**
 * Invoice Module - TypeScript Type Definitions
 */

// =============================================
// ENUMS / TYPES
// =============================================

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled' | 'refunded';
export type PaymentMethod = 'bank_transfer' | 'mobile_money' | 'card' | 'cash' | 'peeap_wallet' | 'other';
export type InvoiceItemType = 'product' | 'service' | 'discount' | 'tax' | 'shipping';

// =============================================
// CORE ENTITIES
// =============================================

export interface InvoiceCustomer {
  id: string;
  business_id: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  type: InvoiceItemType;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  discount_percent: number;
  discount_amount: number;
  total_amount: number;
  sort_order: number;
}

export interface Invoice {
  id: string;
  business_id: string;
  invoice_number: string;
  customer_id?: string;

  // Customer details (can be inline or from customer record)
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;

  // Dates
  issue_date: string;
  due_date: string;
  paid_date?: string;

  // Amounts
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  currency: string;

  // Status
  status: InvoiceStatus;

  // Invoice Type
  invoice_type_code?: string;

  // Payment
  payment_method?: PaymentMethod;
  payment_reference?: string;
  payment_notes?: string;

  // Content
  notes?: string;
  terms?: string;
  footer?: string;

  // Tracking
  sent_at?: string;
  viewed_at?: string;
  reminder_sent_at?: string;

  // Metadata
  created_by?: string;
  created_at: string;
  updated_at: string;

  // Relations
  customer?: InvoiceCustomer;
  items?: InvoiceItem[];
  payments?: InvoicePayment[];
}

export interface InvoicePayment {
  id: string;
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  payment_date: string;
  notes?: string;
  recorded_by?: string;
  created_at: string;
}

// =============================================
// DTOs
// =============================================

export interface CreateInvoiceDto {
  customer_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  customer_address?: string;
  issue_date?: string;
  due_date: string;
  currency?: string;
  notes?: string;
  terms?: string;
  items: CreateInvoiceItemDto[];
}

export interface CreateInvoiceItemDto {
  type?: InvoiceItemType;
  description: string;
  quantity: number;
  unit_price: number;
  tax_rate?: number;
  discount_percent?: number;
}

export interface UpdateInvoiceDto extends Partial<CreateInvoiceDto> {
  status?: InvoiceStatus;
}

export interface RecordPaymentDto {
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_reference?: string;
  payment_date?: string;
  notes?: string;
}

export interface CreateCustomerDto {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  notes?: string;
}

// =============================================
// DASHBOARD / REPORTING
// =============================================

export interface InvoiceDashboardStats {
  total_invoices: number;
  total_amount: number;
  total_paid: number;
  total_outstanding: number;
  overdue_count: number;
  overdue_amount: number;
  draft_count: number;
  sent_count: number;
  paid_count: number;
  this_month_invoiced: number;
  this_month_collected: number;
  recent_invoices: Invoice[];
}

export interface InvoiceFilters {
  status?: InvoiceStatus;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
}
