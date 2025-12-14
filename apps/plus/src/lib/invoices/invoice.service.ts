/**
 * Invoice Service - CRUD operations for invoices
 */

import { supabase } from '../supabase';
import type {
  Invoice,
  InvoiceItem,
  InvoiceCustomer,
  InvoicePayment,
  InvoiceDashboardStats,
  CreateInvoiceDto,
  UpdateInvoiceDto,
  RecordPaymentDto,
  CreateCustomerDto,
  InvoiceFilters,
  InvoiceStatus,
} from './types';

// =============================================
// INVOICES
// =============================================

export async function getInvoices(businessId: string, filters?: InvoiceFilters): Promise<Invoice[]> {
  let query = supabase
    .from('invoices')
    .select(`
      *,
      customer:invoice_customers(*),
      items:invoice_items(*),
      payments:invoice_payments(*)
    `)
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }
  if (filters?.customer_id) {
    query = query.eq('customer_id', filters.customer_id);
  }
  if (filters?.date_from) {
    query = query.gte('issue_date', filters.date_from);
  }
  if (filters?.date_to) {
    query = query.lte('issue_date', filters.date_to);
  }
  if (filters?.search) {
    query = query.or(`invoice_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`);
  }

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data || [];
}

export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      *,
      customer:invoice_customers(*),
      items:invoice_items(*),
      payments:invoice_payments(*)
    `)
    .eq('id', invoiceId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createInvoice(businessId: string, dto: CreateInvoiceDto): Promise<Invoice> {
  // Generate invoice number
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (lastInvoice?.invoice_number) {
    const match = lastInvoice.invoice_number.match(/(\d+)$/);
    if (match) {
      nextNumber = parseInt(match[1]) + 1;
    }
  }
  const invoiceNumber = `INV-${String(nextNumber).padStart(5, '0')}`;

  // Calculate totals
  let subtotal = 0;
  let totalTax = 0;
  let totalDiscount = 0;

  const items = dto.items.map((item, index) => {
    const itemSubtotal = item.quantity * item.unit_price;
    const discountAmount = itemSubtotal * ((item.discount_percent || 0) / 100);
    const afterDiscount = itemSubtotal - discountAmount;
    const taxAmount = afterDiscount * ((item.tax_rate || 0) / 100);
    const itemTotal = afterDiscount + taxAmount;

    subtotal += itemSubtotal;
    totalDiscount += discountAmount;
    totalTax += taxAmount;

    return {
      type: item.type || 'service',
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
      tax_rate: item.tax_rate || 0,
      tax_amount: taxAmount,
      discount_percent: item.discount_percent || 0,
      discount_amount: discountAmount,
      total_amount: itemTotal,
      sort_order: index,
    };
  });

  const totalAmount = subtotal - totalDiscount + totalTax;

  // Create invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      business_id: businessId,
      invoice_number: invoiceNumber,
      customer_id: dto.customer_id,
      customer_name: dto.customer_name,
      customer_email: dto.customer_email,
      customer_phone: dto.customer_phone,
      customer_address: dto.customer_address,
      issue_date: dto.issue_date || new Date().toISOString().split('T')[0],
      due_date: dto.due_date,
      subtotal,
      discount_amount: totalDiscount,
      tax_amount: totalTax,
      total_amount: totalAmount,
      amount_paid: 0,
      balance_due: totalAmount,
      currency: dto.currency || 'NLE',
      status: 'draft',
      notes: dto.notes,
      terms: dto.terms,
    })
    .select()
    .single();

  if (invoiceError) throw invoiceError;

  // Create invoice items
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from('invoice_items')
      .insert(items.map(item => ({
        ...item,
        invoice_id: invoice.id,
      })));

    if (itemsError) throw itemsError;
  }

  return getInvoice(invoice.id) as Promise<Invoice>;
}

export async function updateInvoice(invoiceId: string, dto: UpdateInvoiceDto): Promise<Invoice> {
  const updates: Record<string, unknown> = {};

  if (dto.customer_name !== undefined) updates.customer_name = dto.customer_name;
  if (dto.customer_email !== undefined) updates.customer_email = dto.customer_email;
  if (dto.customer_phone !== undefined) updates.customer_phone = dto.customer_phone;
  if (dto.customer_address !== undefined) updates.customer_address = dto.customer_address;
  if (dto.due_date !== undefined) updates.due_date = dto.due_date;
  if (dto.notes !== undefined) updates.notes = dto.notes;
  if (dto.terms !== undefined) updates.terms = dto.terms;
  if (dto.status !== undefined) updates.status = dto.status;

  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('invoices')
    .update(updates)
    .eq('id', invoiceId);

  if (error) throw error;
  return getInvoice(invoiceId) as Promise<Invoice>;
}

export async function sendInvoice(invoiceId: string): Promise<Invoice> {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (error) throw error;
  return getInvoice(invoiceId) as Promise<Invoice>;
}

export async function markAsViewed(invoiceId: string): Promise<void> {
  await supabase
    .from('invoices')
    .update({
      viewed_at: new Date().toISOString(),
      status: 'viewed',
    })
    .eq('id', invoiceId)
    .in('status', ['sent']);
}

export async function recordPayment(dto: RecordPaymentDto): Promise<Invoice> {
  // Get current invoice
  const invoice = await getInvoice(dto.invoice_id);
  if (!invoice) throw new Error('Invoice not found');

  // Record payment
  const { error: paymentError } = await supabase
    .from('invoice_payments')
    .insert({
      invoice_id: dto.invoice_id,
      amount: dto.amount,
      payment_method: dto.payment_method,
      payment_reference: dto.payment_reference,
      payment_date: dto.payment_date || new Date().toISOString(),
      notes: dto.notes,
    });

  if (paymentError) throw paymentError;

  // Update invoice
  const newAmountPaid = invoice.amount_paid + dto.amount;
  const newBalanceDue = invoice.total_amount - newAmountPaid;
  let newStatus: InvoiceStatus = invoice.status;

  if (newBalanceDue <= 0) {
    newStatus = 'paid';
  } else if (newAmountPaid > 0) {
    newStatus = 'partially_paid';
  }

  const { error: updateError } = await supabase
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      balance_due: Math.max(0, newBalanceDue),
      status: newStatus,
      paid_date: newStatus === 'paid' ? new Date().toISOString() : null,
      payment_method: dto.payment_method,
      payment_reference: dto.payment_reference,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dto.invoice_id);

  if (updateError) throw updateError;

  return getInvoice(dto.invoice_id) as Promise<Invoice>;
}

export async function cancelInvoice(invoiceId: string): Promise<Invoice> {
  const { error } = await supabase
    .from('invoices')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', invoiceId);

  if (error) throw error;
  return getInvoice(invoiceId) as Promise<Invoice>;
}

export async function deleteInvoice(invoiceId: string): Promise<void> {
  // Delete items first
  await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
  await supabase.from('invoice_payments').delete().eq('invoice_id', invoiceId);

  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId);

  if (error) throw error;
}

// =============================================
// CUSTOMERS
// =============================================

export async function getCustomers(businessId: string): Promise<InvoiceCustomer[]> {
  const { data, error } = await supabase
    .from('invoice_customers')
    .select('*')
    .eq('business_id', businessId)
    .order('name');

  if (error) throw error;
  return data || [];
}

export async function getCustomer(customerId: string): Promise<InvoiceCustomer | null> {
  const { data, error } = await supabase
    .from('invoice_customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

export async function createCustomer(businessId: string, dto: CreateCustomerDto): Promise<InvoiceCustomer> {
  const { data, error } = await supabase
    .from('invoice_customers')
    .insert({
      business_id: businessId,
      ...dto,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(customerId: string, dto: Partial<CreateCustomerDto>): Promise<InvoiceCustomer> {
  const { data, error } = await supabase
    .from('invoice_customers')
    .update({
      ...dto,
      updated_at: new Date().toISOString(),
    })
    .eq('id', customerId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// =============================================
// DASHBOARD
// =============================================

export async function getInvoiceDashboard(businessId: string): Promise<InvoiceDashboardStats> {
  // Get all invoices
  const { data: invoices } = await supabase
    .from('invoices')
    .select('*')
    .eq('business_id', businessId)
    .neq('status', 'cancelled');

  const allInvoices = invoices || [];

  // Calculate stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  let totalAmount = 0;
  let totalPaid = 0;
  let totalOutstanding = 0;
  let overdueCount = 0;
  let overdueAmount = 0;
  let draftCount = 0;
  let sentCount = 0;
  let paidCount = 0;
  let thisMonthInvoiced = 0;
  let thisMonthCollected = 0;

  allInvoices.forEach(inv => {
    totalAmount += inv.total_amount || 0;
    totalPaid += inv.amount_paid || 0;
    totalOutstanding += inv.balance_due || 0;

    if (inv.status === 'draft') draftCount++;
    if (inv.status === 'sent' || inv.status === 'viewed') sentCount++;
    if (inv.status === 'paid') paidCount++;

    if (inv.status === 'overdue' || (inv.balance_due > 0 && new Date(inv.due_date) < now && inv.status !== 'paid')) {
      overdueCount++;
      overdueAmount += inv.balance_due || 0;
    }

    if (inv.issue_date >= startOfMonth) {
      thisMonthInvoiced += inv.total_amount || 0;
    }
    if (inv.paid_date && inv.paid_date >= startOfMonth) {
      thisMonthCollected += inv.amount_paid || 0;
    }
  });

  // Get recent invoices
  const recentInvoices = allInvoices.slice(0, 5);

  return {
    total_invoices: allInvoices.length,
    total_amount: totalAmount,
    total_paid: totalPaid,
    total_outstanding: totalOutstanding,
    overdue_count: overdueCount,
    overdue_amount: overdueAmount,
    draft_count: draftCount,
    sent_count: sentCount,
    paid_count: paidCount,
    this_month_invoiced: thisMonthInvoiced,
    this_month_collected: thisMonthCollected,
    recent_invoices: recentInvoices,
  };
}

// =============================================
// HELPER
// =============================================

function getBusinessId(): string {
  if (typeof window === 'undefined') {
    // Return empty string for server-side rendering
    return '';
  }
  const businessId = localStorage.getItem('plusBusinessId');
  if (!businessId) {
    // Try to get from user object
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.businessId) {
          localStorage.setItem('plusBusinessId', user.businessId);
          return user.businessId;
        }
      } catch {}
    }
    // Return empty string instead of throwing - pages will handle this
    console.warn('No business ID found in localStorage. Invoice operations may not work correctly.');
    return '';
  }
  return businessId;
}

// Wrapper to handle empty businessId gracefully
async function withBusinessId<T>(fn: (businessId: string) => Promise<T>, defaultValue: T): Promise<T> {
  const businessId = getBusinessId();
  if (!businessId) {
    console.warn('No business ID available - returning empty result');
    return defaultValue;
  }
  return fn(businessId);
}

// Default dashboard stats for empty state
const emptyDashboardStats: InvoiceDashboardStats = {
  total_invoices: 0,
  total_amount: 0,
  total_paid: 0,
  total_outstanding: 0,
  overdue_count: 0,
  overdue_amount: 0,
  draft_count: 0,
  sent_count: 0,
  paid_count: 0,
  this_month_invoiced: 0,
  this_month_collected: 0,
  recent_invoices: [],
};

// =============================================
// FACADE EXPORT
// =============================================

export const invoiceService = {
  // Invoices
  getInvoices: (filters?: InvoiceFilters) => withBusinessId((bid) => getInvoices(bid, filters), []),
  getInvoice,
  createInvoice: (dto: CreateInvoiceDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to create invoice');
    return createInvoice(businessId, dto);
  },
  updateInvoice,
  sendInvoice,
  markAsViewed,
  recordPayment,
  cancelInvoice,
  deleteInvoice,

  // Customers
  getCustomers: () => withBusinessId(getCustomers, []),
  getCustomer,
  createCustomer: (dto: CreateCustomerDto) => {
    const businessId = getBusinessId();
    if (!businessId) throw new Error('Business ID required to create customer');
    return createCustomer(businessId, dto);
  },
  updateCustomer,

  // Dashboard
  getDashboard: () => withBusinessId(getInvoiceDashboard, emptyDashboardStats),
};
