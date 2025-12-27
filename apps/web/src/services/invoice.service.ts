/**
 * Invoice & Mention Service
 *
 * Handles:
 * - @staffname - Add staff to conversation
 * - @product:name - Reference a product
 * - @receipt:id - Reference a receipt/transaction
 * - @invoice - Create and send invoice
 */

import { supabase } from '@/lib/supabase';
import { notificationService } from './notification.service';

// Types
export interface Invoice {
  id: string;
  invoice_number: string;
  business_id?: string;
  merchant_id?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  conversation_id?: string;
  message_id?: string;
  title?: string;
  description?: string;
  currency: string;
  items: InvoiceItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  payment_link_id?: string;
  payment_url?: string;
  payment_status: PaymentStatus;
  amount_paid: number;
  paid_at?: string;
  issue_date: string;
  due_date?: string;
  status: InvoiceStatus;
  sent_at?: string;
  viewed_at?: string;
  notes?: string;
  terms?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Invoice type
  invoice_type: InvoiceType;
  // Recurring fields
  is_recurring?: boolean;
  recurring_frequency?: RecurringFrequency;
  recurring_start_date?: string;
  recurring_end_date?: string;
  recurring_next_date?: string;
  recurring_count?: number;
  recurring_max_count?: number;
  parent_invoice_id?: string;
  // Joined
  business_name?: string;
  merchant_name?: string;
}

export interface InvoiceItem {
  name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total: number;
  product_id?: string;
}

export interface Mention {
  id: string;
  message_id: string;
  conversation_id: string;
  mention_type: MentionType;
  mentioned_user_id?: string;
  mentioned_product_id?: string;
  mentioned_transaction_id?: string;
  mentioned_invoice_id?: string;
  mention_text: string;
  display_name?: string;
  start_position?: number;
  end_position?: number;
  action_taken?: string;
  created_at: string;
}

export interface ParsedMention {
  type: MentionType;
  text: string;
  value?: string;
  startIndex: number;
  endIndex: number;
}

export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'overdue' | 'cancelled';
export type MentionType = 'user' | 'staff' | 'product' | 'receipt' | 'invoice' | 'transaction';
export type InvoiceType = 'standard' | 'proforma' | 'quote' | 'credit_note' | 'debit_note' | 'receipt';
export type RecurringFrequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringInvoiceTemplate {
  id: string;
  business_id: string;
  merchant_id?: string;
  name: string;
  description?: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  invoice_type: InvoiceType;
  title?: string;
  currency: string;
  items: InvoiceItem[];
  tax_rate: number;
  discount_amount: number;
  notes?: string;
  terms?: string;
  frequency: RecurringFrequency;
  start_date: string;
  end_date?: string;
  due_days: number;
  max_occurrences?: number;
  last_generated_at?: string;
  next_generation_date?: string;
  total_generated: number;
  total_amount_billed: number;
  status: 'active' | 'paused' | 'cancelled' | 'completed';
  auto_send: boolean;
  send_days_before: number;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export const INVOICE_TYPE_CONFIG: Record<InvoiceType, { label: string; description: string; color: string }> = {
  standard: { label: 'Standard Invoice', description: 'Regular invoice for goods or services', color: 'blue' },
  proforma: { label: 'Proforma Invoice', description: 'Preliminary invoice before final billing', color: 'purple' },
  quote: { label: 'Quote / Estimate', description: 'Price quote for potential work', color: 'cyan' },
  credit_note: { label: 'Credit Note', description: 'Credit for returned goods or overpayment', color: 'green' },
  debit_note: { label: 'Debit Note', description: 'Additional charges or adjustments', color: 'orange' },
  receipt: { label: 'Receipt', description: 'Proof of payment received', color: 'gray' },
};

export const RECURRING_FREQUENCY_CONFIG: Record<RecurringFrequency, { label: string; days: number }> = {
  weekly: { label: 'Weekly', days: 7 },
  biweekly: { label: 'Every 2 Weeks', days: 14 },
  monthly: { label: 'Monthly', days: 30 },
  quarterly: { label: 'Quarterly', days: 90 },
  yearly: { label: 'Yearly', days: 365 },
};

class InvoiceService {
  // ==========================================
  // INVOICE CRUD
  // ==========================================

  /**
   * Create a new invoice
   */
  async createInvoice(data: {
    businessId?: string;
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    conversationId?: string;
    title?: string;
    description?: string;
    currency?: string;
    items: InvoiceItem[];
    taxRate?: number;
    discountAmount?: number;
    dueDate?: string;
    notes?: string;
    terms?: string;
    invoiceType?: InvoiceType;
    isRecurring?: boolean;
    recurringFrequency?: RecurringFrequency;
    recurringStartDate?: string;
    recurringEndDate?: string;
    recurringMaxCount?: number;
  }): Promise<{ invoice: Invoice | null; error: string | null }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');

      // Calculate totals
      const subtotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      const taxAmount = subtotal * ((data.taxRate || 0) / 100);
      const total = subtotal + taxAmount - (data.discountAmount || 0);

      // Add totals to items
      const itemsWithTotals = data.items.map(item => ({
        ...item,
        total: item.quantity * item.unit_price,
      }));

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          business_id: data.businessId,
          merchant_id: user.user.id,
          customer_id: data.customerId,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone,
          conversation_id: data.conversationId,
          title: data.title,
          description: data.description,
          currency: data.currency || 'SLE',
          items: itemsWithTotals,
          subtotal,
          tax_rate: data.taxRate || 0,
          tax_amount: taxAmount,
          discount_amount: data.discountAmount || 0,
          total_amount: total,
          due_date: data.dueDate,
          notes: data.notes,
          terms: data.terms,
          status: 'draft',
          payment_status: 'unpaid',
          invoice_type: data.invoiceType || 'standard',
          is_recurring: data.isRecurring || false,
          recurring_frequency: data.recurringFrequency,
          recurring_start_date: data.recurringStartDate,
          recurring_end_date: data.recurringEndDate,
          recurring_max_count: data.recurringMaxCount,
          recurring_next_date: data.isRecurring && data.recurringStartDate ? data.recurringStartDate : null,
        })
        .select()
        .single();

      if (error) throw error;

      return { invoice, error: null };
    } catch (err: any) {
      console.error('Failed to create invoice:', err);
      return { invoice: null, error: err.message };
    }
  }

  /**
   * Send invoice (change status to sent)
   */
  async sendInvoice(invoiceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;

      // Get invoice to send notification
      const invoice = await this.getInvoice(invoiceId);
      if (invoice?.customer_id) {
        await notificationService.create({
          userId: invoice.customer_id,
          type: 'payment_received', // Reuse type
          title: 'New Invoice',
          message: `You have a new invoice for ${invoice.currency} ${invoice.total_amount.toLocaleString()}`,
          actionUrl: `/invoices/${invoiceId}`,
          sourceService: 'payment',
          sourceId: invoiceId,
          priority: 'high',
        });
      }

      return true;
    } catch (err) {
      console.error('Failed to send invoice:', err);
      return false;
    }
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          merchant_businesses(name),
          profiles!invoices_merchant_id_fkey(full_name)
        `)
        .eq('id', invoiceId)
        .single();

      if (error) throw error;

      return {
        ...data,
        business_name: data.merchant_businesses?.name,
        merchant_name: data.profiles?.full_name,
      };
    } catch (err) {
      console.error('Failed to get invoice:', err);
      return null;
    }
  }

  /**
   * Get invoices for a business
   */
  async getBusinessInvoices(businessId: string, status?: InvoiceStatus): Promise<Invoice[]> {
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get business invoices:', err);
      return [];
    }
  }

  /**
   * Get invoices for a customer
   */
  async getCustomerInvoices(customerId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          merchant_businesses(name)
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(inv => ({
        ...inv,
        business_name: inv.merchant_businesses?.name,
      }));
    } catch (err) {
      console.error('Failed to get customer invoices:', err);
      return [];
    }
  }

  /**
   * Mark invoice as paid
   */
  async markAsPaid(invoiceId: string, amountPaid?: number): Promise<boolean> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) return false;

      const paidAmount = amountPaid || invoice.total_amount;
      const isPaid = paidAmount >= invoice.total_amount;

      const { error } = await supabase
        .from('invoices')
        .update({
          amount_paid: paidAmount,
          payment_status: isPaid ? 'paid' : 'partial',
          status: isPaid ? 'paid' : 'sent',
          paid_at: isPaid ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to mark invoice as paid:', err);
      return false;
    }
  }

  /**
   * Generate payment link for invoice
   */
  async generatePaymentLink(invoiceId: string): Promise<string | null> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) return null;

      // Generate payment URL (similar to payment links feature)
      const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
      const paymentUrl = `${baseUrl}/pay/invoice/${invoiceId}`;

      await supabase
        .from('invoices')
        .update({ payment_url: paymentUrl })
        .eq('id', invoiceId);

      return paymentUrl;
    } catch (err) {
      console.error('Failed to generate payment link:', err);
      return null;
    }
  }

  // ==========================================
  // @ MENTION PARSING
  // ==========================================

  /**
   * Parse @ mentions from message content
   * Supports:
   * - @username - Mention a user/staff
   * - @product:name or @product:id - Reference a product
   * - @receipt:id - Reference a receipt/transaction
   * - @invoice - Trigger invoice creation modal
   * - @invoice:id - Reference an existing invoice
   */
  parseMentions(content: string): ParsedMention[] {
    const mentions: ParsedMention[] = [];

    // Regex patterns for different mention types
    const patterns = [
      // @invoice:id or just @invoice
      { regex: /@invoice(?::([a-zA-Z0-9-]+))?/g, type: 'invoice' as MentionType },
      // @product:name or @product:id
      { regex: /@product:([a-zA-Z0-9-_]+)/g, type: 'product' as MentionType },
      // @receipt:id or @transaction:id
      { regex: /@(?:receipt|transaction):([a-zA-Z0-9-]+)/g, type: 'receipt' as MentionType },
      // @username (word characters, must not be one of the special types above)
      { regex: /@([a-zA-Z][a-zA-Z0-9_]{2,})/g, type: 'user' as MentionType },
    ];

    for (const { regex, type } of patterns) {
      let match;
      while ((match = regex.exec(content)) !== null) {
        // Skip if this is a special type being caught by user regex
        if (type === 'user' && ['invoice', 'product', 'receipt', 'transaction'].includes(match[1]?.split(':')[0])) {
          continue;
        }

        mentions.push({
          type,
          text: match[0],
          value: match[1] || undefined,
          startIndex: match.index,
          endIndex: match.index + match[0].length,
        });
      }
    }

    // Sort by position
    mentions.sort((a, b) => a.startIndex - b.startIndex);

    return mentions;
  }

  /**
   * Process mentions in a message
   */
  async processMentions(
    messageId: string,
    conversationId: string,
    content: string,
    businessId?: string
  ): Promise<Mention[]> {
    const parsedMentions = this.parseMentions(content);
    const processedMentions: Mention[] = [];

    for (const mention of parsedMentions) {
      try {
        let mentionData: any = {
          message_id: messageId,
          conversation_id: conversationId,
          mention_type: mention.type,
          mention_text: mention.text,
          start_position: mention.startIndex,
          end_position: mention.endIndex,
        };

        // Process based on type
        switch (mention.type) {
          case 'user':
            // Find user by username
            const { data: users } = await supabase
              .from('profiles')
              .select('id, full_name')
              .or(`full_name.ilike.%${mention.value}%,phone.ilike.%${mention.value}%`)
              .limit(1);

            if (users && users.length > 0) {
              mentionData.mentioned_user_id = users[0].id;
              mentionData.display_name = users[0].full_name;
            }
            break;

          case 'product':
            // Find product
            if (businessId && mention.value) {
              const { data: products } = await supabase
                .from('products')
                .select('id, name')
                .eq('business_id', businessId)
                .or(`id.eq.${mention.value},name.ilike.%${mention.value}%`)
                .limit(1);

              if (products && products.length > 0) {
                mentionData.mentioned_product_id = products[0].id;
                mentionData.display_name = products[0].name;
              }
            }
            break;

          case 'receipt':
            // Find transaction
            if (mention.value) {
              mentionData.mentioned_transaction_id = mention.value;
              mentionData.display_name = `Receipt #${mention.value.substring(0, 8)}`;
            }
            break;

          case 'invoice':
            if (mention.value) {
              // Reference existing invoice
              mentionData.mentioned_invoice_id = mention.value;
              mentionData.display_name = `Invoice #${mention.value.substring(0, 8)}`;
            } else {
              // Just @invoice - signals to show invoice creation modal
              mentionData.action_taken = 'show_invoice_modal';
            }
            break;
        }

        // Insert mention record (trigger will handle adding user to chat)
        const { data, error } = await supabase
          .from('message_mentions')
          .insert(mentionData)
          .select()
          .single();

        if (!error && data) {
          processedMentions.push(data);
        }
      } catch (err) {
        console.error('Failed to process mention:', mention, err);
      }
    }

    return processedMentions;
  }

  /**
   * Search for users to mention
   */
  async searchUsersForMention(query: string, businessId?: string): Promise<Array<{
    id: string;
    name: string;
    type: 'user' | 'staff';
    avatar?: string;
  }>> {
    try {
      const results: Array<{ id: string; name: string; type: 'user' | 'staff'; avatar?: string }> = [];

      // If business ID provided, search staff first
      if (businessId) {
        const { data: staff } = await supabase
          .from('pos_staff')
          .select(`
            user_id,
            profiles!pos_staff_user_id_fkey(id, full_name, avatar_url)
          `)
          .eq('business_id', businessId)
          .eq('status', 'active')
          .limit(5);

        if (staff) {
          for (const s of staff) {
            const profile = (s.profiles as unknown) as { id: string; full_name: string; avatar_url?: string } | null;
            if (profile?.full_name?.toLowerCase().includes(query.toLowerCase())) {
              results.push({
                id: profile.id,
                name: profile.full_name,
                type: 'staff',
                avatar: profile.avatar_url,
              });
            }
          }
        }
      }

      // Search all users
      const { data: users } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .limit(10 - results.length);

      if (users) {
        for (const u of users) {
          if (!results.find(r => r.id === u.id)) {
            results.push({
              id: u.id,
              name: u.full_name,
              type: 'user',
              avatar: u.avatar_url,
            });
          }
        }
      }

      return results;
    } catch (err) {
      console.error('Failed to search users:', err);
      return [];
    }
  }

  /**
   * Search for products to mention
   */
  async searchProductsForMention(query: string, businessId: string): Promise<Array<{
    id: string;
    name: string;
    price: number;
    currency: string;
    image_url?: string;
    stock_quantity?: number;
    description?: string;
    category?: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price, currency, image_url, stock_quantity, description, category')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .ilike('name', `%${query}%`)
        .limit(10);

      if (error) throw error;

      return data || [];
    } catch (err) {
      console.error('Failed to search products:', err);
      return [];
    }
  }

  /**
   * Get product details for chat display
   */
  async getProduct(productId: string): Promise<{
    id: string;
    name: string;
    description?: string;
    price: number;
    currency: string;
    image_url?: string;
    stock_quantity?: number;
    is_active?: boolean;
    category?: string;
    sku?: string;
    business_id?: string;
    business_name?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, description, price, currency, image_url,
          stock_quantity, is_active, category, sku, business_id,
          merchant_businesses(name)
        `)
        .eq('id', productId)
        .single();

      if (error || !data) return null;

      const business = (data.merchant_businesses as unknown) as { name: string } | null;
      return {
        ...data,
        business_name: business?.name,
      };
    } catch (err) {
      console.error('Failed to get product:', err);
      return null;
    }
  }

  /**
   * Get mentions for a message
   */
  async getMentions(messageId: string): Promise<Mention[]> {
    try {
      const { data, error } = await supabase
        .from('message_mentions')
        .select('*')
        .eq('message_id', messageId);

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get mentions:', err);
      return [];
    }
  }

  // ==========================================
  // QUICK INVOICE FROM CHAT
  // ==========================================

  /**
   * Create a quick invoice from chat and send it
   */
  async createAndSendInvoice(params: {
    conversationId: string;
    customerId: string;
    customerName?: string;
    businessId: string;
    items: InvoiceItem[];
    dueDate?: string;
    notes?: string;
  }): Promise<{ invoice: Invoice | null; paymentUrl: string | null; error: string | null }> {
    try {
      // Create invoice
      const { invoice, error } = await this.createInvoice({
        businessId: params.businessId,
        customerId: params.customerId,
        customerName: params.customerName,
        conversationId: params.conversationId,
        items: params.items,
        dueDate: params.dueDate,
        notes: params.notes,
      });

      if (!invoice || error) {
        return { invoice: null, paymentUrl: null, error: error || 'Failed to create invoice' };
      }

      // Generate payment link
      const paymentUrl = await this.generatePaymentLink(invoice.id);

      // Send invoice
      await this.sendInvoice(invoice.id);

      return { invoice, paymentUrl, error: null };
    } catch (err: any) {
      console.error('Failed to create and send invoice:', err);
      return { invoice: null, paymentUrl: null, error: err.message };
    }
  }

  // ==========================================
  // RECEIPT / TRANSACTION SEARCH
  // ==========================================

  /**
   * Search for receipts/transactions to reference in chat
   */
  async searchReceiptsForMention(query: string, businessId?: string, userId?: string): Promise<Array<{
    id: string;
    type: 'transaction' | 'pos_sale';
    reference: string;
    amount: number;
    currency: string;
    status: string;
    customer_name?: string;
    date: string;
    description?: string;
  }>> {
    const results: Array<{
      id: string;
      type: 'transaction' | 'pos_sale';
      reference: string;
      amount: number;
      currency: string;
      status: string;
      customer_name?: string;
      date: string;
      description?: string;
    }> = [];

    try {
      // Search transactions
      let txQuery = supabase
        .from('transactions')
        .select('id, reference, amount, currency, status, type, created_at, metadata')
        .order('created_at', { ascending: false })
        .limit(10);

      if (businessId) {
        txQuery = txQuery.or(`from_wallet_id.eq.${businessId},to_wallet_id.eq.${businessId}`);
      }
      if (userId) {
        txQuery = txQuery.eq('user_id', userId);
      }
      if (query && query.length >= 2) {
        txQuery = txQuery.or(`reference.ilike.%${query}%,id.ilike.%${query}%`);
      }

      const { data: transactions } = await txQuery;

      if (transactions) {
        for (const tx of transactions) {
          results.push({
            id: tx.id,
            type: 'transaction',
            reference: tx.reference || tx.id.substring(0, 8),
            amount: tx.amount,
            currency: tx.currency || 'SLE',
            status: tx.status,
            date: tx.created_at,
            description: tx.type,
          });
        }
      }

      // Search POS sales if businessId provided
      if (businessId) {
        let posQuery = supabase
          .from('pos_sales')
          .select('id, sale_number, total_amount, currency, status, customer_name, created_at')
          .eq('business_id', businessId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (query && query.length >= 2) {
          posQuery = posQuery.or(`sale_number.ilike.%${query}%,customer_name.ilike.%${query}%`);
        }

        const { data: posSales } = await posQuery;

        if (posSales) {
          for (const sale of posSales) {
            results.push({
              id: sale.id,
              type: 'pos_sale',
              reference: sale.sale_number,
              amount: sale.total_amount,
              currency: sale.currency || 'SLE',
              status: sale.status,
              customer_name: sale.customer_name,
              date: sale.created_at,
              description: 'POS Sale',
            });
          }
        }
      }

      // Sort by date
      results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return results.slice(0, 15);
    } catch (err) {
      console.error('Failed to search receipts:', err);
      return [];
    }
  }

  /**
   * Get receipt/transaction details
   */
  async getReceipt(receiptId: string, type: 'transaction' | 'pos_sale' = 'transaction'): Promise<{
    id: string;
    type: 'transaction' | 'pos_sale';
    reference: string;
    amount: number;
    currency: string;
    status: string;
    customer_name?: string;
    customer_email?: string;
    date: string;
    items?: Array<{ name: string; quantity: number; price: number; total: number }>;
    subtotal?: number;
    tax?: number;
    discount?: number;
    total: number;
    payment_method?: string;
    merchant_name?: string;
    metadata?: Record<string, any>;
  } | null> {
    try {
      if (type === 'pos_sale') {
        const { data, error } = await supabase
          .from('pos_sales')
          .select(`
            *,
            pos_sale_items(product_name, quantity, unit_price, total_price),
            merchant_businesses(name)
          `)
          .eq('id', receiptId)
          .single();

        if (error || !data) return null;

        return {
          id: data.id,
          type: 'pos_sale',
          reference: data.sale_number,
          amount: data.total_amount,
          currency: data.currency || 'SLE',
          status: data.status,
          customer_name: data.customer_name,
          customer_email: data.customer_email,
          date: data.created_at,
          items: data.pos_sale_items?.map((item: any) => ({
            name: item.product_name,
            quantity: item.quantity,
            price: item.unit_price,
            total: item.total_price,
          })),
          subtotal: data.subtotal,
          tax: data.tax_amount,
          discount: data.discount_amount,
          total: data.total_amount,
          payment_method: data.payment_method,
          merchant_name: data.merchant_businesses?.name,
        };
      } else {
        const { data, error } = await supabase
          .from('transactions')
          .select('*')
          .eq('id', receiptId)
          .single();

        if (error || !data) return null;

        return {
          id: data.id,
          type: 'transaction',
          reference: data.reference || data.id.substring(0, 8),
          amount: data.amount,
          currency: data.currency || 'SLE',
          status: data.status,
          date: data.created_at,
          total: data.amount,
          payment_method: data.type,
          metadata: data.metadata,
        };
      }
    } catch (err) {
      console.error('Failed to get receipt:', err);
      return null;
    }
  }

  // ==========================================
  // FILE UPLOAD
  // ==========================================

  /**
   * Upload a file for chat attachments
   */
  async uploadChatFile(file: File, conversationId: string): Promise<{
    url: string;
    name: string;
    type: string;
    size: number;
  } | null> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');

      // Generate unique filename
      const timestamp = Date.now();
      const ext = file.name.split('.').pop();
      const fileName = `${conversationId}/${timestamp}_${Math.random().toString(36).substring(7)}.${ext}`;

      // Upload to storage
      const { data, error } = await supabase.storage
        .from('chat-attachments')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        name: file.name,
        type: file.type,
        size: file.size,
      };
    } catch (err) {
      console.error('Failed to upload file:', err);
      return null;
    }
  }

  // ==========================================
  // PAYMENT LINKS SEARCH
  // ==========================================

  /**
   * Search for payment links to share in chat
   */
  async searchPaymentLinks(query: string, businessId: string): Promise<Array<{
    id: string;
    name: string;
    amount: number;
    currency: string;
    status: string;
    url?: string;
    image?: string;
    date: string;
  }>> {
    try {
      let dbQuery = supabase
        .from('merchant_payment_links')
        .select('id, name, description, amount, currency, status, short_url, created_at')
        .eq('business_id', businessId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (query && query.length >= 1) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }

      const { data, error } = await dbQuery;

      if (error) throw error;

      return (data || []).map(link => ({
        id: link.id,
        name: link.name || 'Payment Link',
        amount: link.amount,
        currency: link.currency || 'SLE',
        status: link.status,
        url: link.short_url,
        date: link.created_at,
      }));
    } catch (err) {
      console.error('Failed to search payment links:', err);
      return [];
    }
  }

  /**
   * Get payment link details
   */
  async getPaymentLink(linkId: string): Promise<{
    id: string;
    name: string;
    description?: string;
    amount: number;
    currency: string;
    status: string;
    url?: string;
    business_name?: string;
  } | null> {
    try {
      const { data, error } = await supabase
        .from('merchant_payment_links')
        .select(`
          id, name, description, amount, currency, status, short_url,
          merchant_businesses(name)
        `)
        .eq('id', linkId)
        .single();

      if (error || !data) return null;

      const business = (data.merchant_businesses as unknown) as { name: string } | null;
      return {
        id: data.id,
        name: data.name,
        description: data.description,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        url: data.short_url,
        business_name: business?.name,
      };
    } catch (err) {
      console.error('Failed to get payment link:', err);
      return null;
    }
  }

  // ==========================================
  // RECURRING INVOICE TEMPLATES
  // ==========================================

  /**
   * Create a recurring invoice template
   */
  async createRecurringTemplate(data: {
    businessId: string;
    name: string;
    description?: string;
    customerId?: string;
    customerName?: string;
    customerEmail?: string;
    customerPhone?: string;
    invoiceType?: InvoiceType;
    title?: string;
    currency?: string;
    items: InvoiceItem[];
    taxRate?: number;
    discountAmount?: number;
    notes?: string;
    terms?: string;
    frequency: RecurringFrequency;
    startDate: string;
    endDate?: string;
    dueDays?: number;
    maxOccurrences?: number;
    autoSend?: boolean;
    sendDaysBefore?: number;
  }): Promise<{ template: RecurringInvoiceTemplate | null; error: string | null }> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user?.user) throw new Error('Not authenticated');

      const { data: template, error } = await supabase
        .from('recurring_invoice_templates')
        .insert({
          business_id: data.businessId,
          merchant_id: user.user.id,
          name: data.name,
          description: data.description,
          customer_id: data.customerId,
          customer_name: data.customerName,
          customer_email: data.customerEmail,
          customer_phone: data.customerPhone,
          invoice_type: data.invoiceType || 'standard',
          title: data.title,
          currency: data.currency || 'SLE',
          items: data.items,
          tax_rate: data.taxRate || 0,
          discount_amount: data.discountAmount || 0,
          notes: data.notes,
          terms: data.terms,
          frequency: data.frequency,
          start_date: data.startDate,
          end_date: data.endDate,
          due_days: data.dueDays || 14,
          max_occurrences: data.maxOccurrences,
          next_generation_date: data.startDate,
          auto_send: data.autoSend ?? true,
          send_days_before: data.sendDaysBefore || 0,
          status: 'active',
        })
        .select()
        .single();

      if (error) throw error;

      return { template, error: null };
    } catch (err: any) {
      console.error('Failed to create recurring template:', err);
      return { template: null, error: err.message };
    }
  }

  /**
   * Get recurring templates for a business
   */
  async getRecurringTemplates(businessId: string, status?: string): Promise<RecurringInvoiceTemplate[]> {
    try {
      let query = supabase
        .from('recurring_invoice_templates')
        .select('*')
        .eq('business_id', businessId)
        .order('created_at', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get recurring templates:', err);
      return [];
    }
  }

  /**
   * Update recurring template status
   */
  async updateRecurringTemplateStatus(templateId: string, status: 'active' | 'paused' | 'cancelled'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recurring_invoice_templates')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', templateId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to update recurring template status:', err);
      return false;
    }
  }

  /**
   * Delete recurring template
   */
  async deleteRecurringTemplate(templateId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('recurring_invoice_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete recurring template:', err);
      return false;
    }
  }

  /**
   * Get invoices by type
   */
  async getBusinessInvoicesByType(businessId: string, invoiceType: InvoiceType): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('business_id', businessId)
        .eq('invoice_type', invoiceType)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to get invoices by type:', err);
      return [];
    }
  }

  /**
   * Duplicate an invoice
   */
  async duplicateInvoice(invoiceId: string): Promise<{ invoice: Invoice | null; error: string | null }> {
    try {
      const original = await this.getInvoice(invoiceId);
      if (!original) throw new Error('Invoice not found');

      return this.createInvoice({
        businessId: original.business_id,
        customerId: original.customer_id,
        customerName: original.customer_name,
        customerEmail: original.customer_email,
        customerPhone: original.customer_phone,
        title: original.title ? `Copy of ${original.title}` : 'Copy of Invoice',
        description: original.description,
        currency: original.currency,
        items: original.items,
        taxRate: original.tax_rate,
        discountAmount: original.discount_amount,
        notes: original.notes,
        terms: original.terms,
        invoiceType: original.invoice_type,
      });
    } catch (err: any) {
      console.error('Failed to duplicate invoice:', err);
      return { invoice: null, error: err.message };
    }
  }

  /**
   * Convert quote/proforma to standard invoice
   */
  async convertToInvoice(invoiceId: string): Promise<{ invoice: Invoice | null; error: string | null }> {
    try {
      const original = await this.getInvoice(invoiceId);
      if (!original) throw new Error('Invoice not found');

      if (!['quote', 'proforma'].includes(original.invoice_type)) {
        throw new Error('Only quotes and proforma invoices can be converted');
      }

      return this.createInvoice({
        businessId: original.business_id,
        customerId: original.customer_id,
        customerName: original.customer_name,
        customerEmail: original.customer_email,
        customerPhone: original.customer_phone,
        title: original.title,
        description: original.description,
        currency: original.currency,
        items: original.items,
        taxRate: original.tax_rate,
        discountAmount: original.discount_amount,
        dueDate: original.due_date,
        notes: original.notes,
        terms: original.terms,
        invoiceType: 'standard',
      });
    } catch (err: any) {
      console.error('Failed to convert to invoice:', err);
      return { invoice: null, error: err.message };
    }
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'cancelled',
          payment_status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to cancel invoice:', err);
      return false;
    }
  }

  /**
   * Delete an invoice (only drafts)
   */
  async deleteInvoice(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) throw new Error('Invoice not found');
      if (invoice.status !== 'draft') throw new Error('Only draft invoices can be deleted');

      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Failed to delete invoice:', err);
      return false;
    }
  }

  /**
   * Get invoice stats for dashboard
   */
  async getInvoiceStats(businessId: string): Promise<{
    total: number;
    draft: number;
    sent: number;
    paid: number;
    overdue: number;
    cancelled: number;
    totalAmount: number;
    paidAmount: number;
    pendingAmount: number;
    overdueAmount: number;
    byType: Record<InvoiceType, number>;
    recurringActive: number;
  }> {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('status, payment_status, total_amount, amount_paid, invoice_type')
        .eq('business_id', businessId);

      const { data: recurringTemplates } = await supabase
        .from('recurring_invoice_templates')
        .select('id')
        .eq('business_id', businessId)
        .eq('status', 'active');

      const stats = {
        total: 0,
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        byType: {
          standard: 0,
          proforma: 0,
          quote: 0,
          credit_note: 0,
          debit_note: 0,
          receipt: 0,
        } as Record<InvoiceType, number>,
        recurringActive: recurringTemplates?.length || 0,
      };

      if (invoices) {
        for (const inv of invoices) {
          stats.total++;
          stats.totalAmount += inv.total_amount;
          stats.paidAmount += inv.amount_paid || 0;

          if (inv.status === 'draft') stats.draft++;
          else if (inv.status === 'sent' || inv.status === 'viewed') stats.sent++;
          else if (inv.status === 'paid') stats.paid++;
          else if (inv.status === 'overdue') {
            stats.overdue++;
            stats.overdueAmount += inv.total_amount - (inv.amount_paid || 0);
          }
          else if (inv.status === 'cancelled') stats.cancelled++;

          if (inv.payment_status !== 'paid' && inv.status !== 'cancelled') {
            stats.pendingAmount += inv.total_amount - (inv.amount_paid || 0);
          }

          const invType = (inv.invoice_type || 'standard') as InvoiceType;
          if (stats.byType[invType] !== undefined) {
            stats.byType[invType]++;
          }
        }
      }

      return stats;
    } catch (err) {
      console.error('Failed to get invoice stats:', err);
      return {
        total: 0,
        draft: 0,
        sent: 0,
        paid: 0,
        overdue: 0,
        cancelled: 0,
        totalAmount: 0,
        paidAmount: 0,
        pendingAmount: 0,
        overdueAmount: 0,
        byType: { standard: 0, proforma: 0, quote: 0, credit_note: 0, debit_note: 0, receipt: 0 },
        recurringActive: 0,
      };
    }
  }
}

export const invoiceService = new InvoiceService();
