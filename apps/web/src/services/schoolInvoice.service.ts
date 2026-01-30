/**
 * School Invoice Service
 * Handles invoice creation, management, and chat-based delivery
 */

import { supabaseAdmin } from '@/lib/supabase';
import { schoolChatService } from './schoolChat.service';

// Invoice Types
export type InvoiceType = 'proforma' | 'invoice' | 'receipt' | 'fee_notice';
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceRecipient {
  type: 'student' | 'parent' | 'vendor' | 'other';
  studentId?: string;
  nsi?: string;  // National Student Identifier
  parentUserId?: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface CreateInvoiceRequest {
  schoolId: string;
  type: InvoiceType;
  recipient: InvoiceRecipient;
  items: InvoiceItem[];
  dueDate: string;
  notes?: string;
  sendViaChat?: boolean;
  termId?: string;
  academicYear?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  schoolId: string;
  type: InvoiceType;
  recipient: InvoiceRecipient;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  paidDate?: string;
  paidAmount: number;
  notes?: string;
  chatMessageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  receiptNumber?: string;
  error?: string;
}

class SchoolInvoiceService {
  private apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';

  /**
   * Generate a unique invoice number
   */
  private generateInvoiceNumber(type: InvoiceType): string {
    const prefix = {
      proforma: 'PRO',
      invoice: 'INV',
      receipt: 'RCP',
      fee_notice: 'FEE',
    }[type];
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  /**
   * Create a new invoice
   * Can create invoices for students even without Peeap accounts
   * If parent is linked, invoice can be sent via chat
   */
  async createInvoice(request: CreateInvoiceRequest): Promise<Invoice> {
    const subtotal = request.items.reduce((sum, item) => sum + item.total, 0);
    const tax = 0; // No tax for school fees typically
    const total = subtotal + tax;

    // Determine initial status based on whether we can send via chat
    const canSendViaChat = request.sendViaChat && request.recipient.parentUserId;
    const initialStatus = canSendViaChat ? 'draft' : 'draft'; // Will be updated to 'sent' after chat

    const invoiceData = {
      invoice_number: this.generateInvoiceNumber(request.type),
      school_id: request.schoolId,
      type: request.type,
      recipient_type: request.recipient.type,
      recipient_name: request.recipient.name,
      recipient_email: request.recipient.email,
      recipient_phone: request.recipient.phone,
      student_id: request.recipient.studentId,
      parent_user_id: request.recipient.parentUserId || null, // Can be null for unlinked students
      items: request.items,
      subtotal,
      tax,
      total,
      status: initialStatus,
      issue_date: new Date().toISOString(),
      due_date: request.dueDate,
      paid_amount: 0,
      notes: request.notes,
      term_id: request.termId,
      academic_year: request.academicYear,
    };

    const { data, error } = await supabaseAdmin
      .from('school_invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      throw new Error('Failed to create invoice');
    }

    const invoice = this.mapToInvoice(data);

    // Send via chat if parent is linked and sendViaChat is requested
    // Students without linked parents will have invoices created but not sent via chat
    if (canSendViaChat) {
      await this.sendInvoiceViaChat(invoice, request.recipient.parentUserId!);
    } else if (!request.recipient.parentUserId) {
      // No parent linked - invoice stays as draft, can be printed/emailed manually
      console.log(`Invoice ${invoice.invoiceNumber} created for unlinked student ${request.recipient.name}`);
    }

    return invoice;
  }

  /**
   * Send invoice via Peeap Chat
   */
  async sendInvoiceViaChat(invoice: Invoice, recipientUserId: string): Promise<void> {
    try {
      const schoolId = localStorage.getItem('school_id') || localStorage.getItem('school_domain') || invoice.schoolId;
      const schoolName = localStorage.getItem('schoolName') || 'School';

      // Use the chat service to send the invoice
      const result = await schoolChatService.sendInvoice({
        recipientUserId,
        schoolId,
        schoolName,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        invoiceType: invoice.type,
        amount: invoice.total,
        dueDate: invoice.dueDate,
        studentName: invoice.recipient.name,
        studentId: invoice.recipient.studentId,
        items: invoice.items,
      });

      if (result.success) {
        // Update invoice with chat message ID
        await supabaseAdmin
          .from('school_invoices')
          .update({
            status: 'sent',
            chat_message_id: result.messageId,
            sent_at: new Date().toISOString(),
          })
          .eq('id', invoice.id);
      }
    } catch (err) {
      console.error('Failed to send invoice via chat:', err);
    }
  }

  /**
   * Format invoice message for chat
   */
  private formatInvoiceMessage(invoice: Invoice, schoolName: string): string {
    const typeLabel = {
      proforma: 'Proforma Invoice',
      invoice: 'Invoice',
      receipt: 'Payment Receipt',
      fee_notice: 'Fee Notice',
    }[invoice.type];

    const itemsList = invoice.items
      .map(item => `• ${item.description}: SLE ${(item.total / 100).toLocaleString()}`)
      .join('\n');

    return `📄 *${typeLabel} from ${schoolName}*

Invoice #: ${invoice.invoiceNumber}
Student: ${invoice.recipient.name}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

*Items:*
${itemsList}

*Total Amount: SLE ${(invoice.total / 100).toLocaleString()}*

Tap below to pay securely via Peeap.`;
  }

  /**
   * Get invoices for a school
   */
  async getInvoices(schoolId: string, filters?: {
    status?: InvoiceStatus;
    type?: InvoiceType;
    studentId?: string;
  }): Promise<Invoice[]> {
    let query = supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.type) {
      query = query.eq('type', filters.type);
    }
    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }

    return (data || []).map(this.mapToInvoice);
  }

  /**
   * Get invoices for a parent (their children's invoices)
   */
  async getParentInvoices(parentUserId: string): Promise<Invoice[]> {
    const { data, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('parent_user_id', parentUserId)
      .in('status', ['sent', 'viewed', 'overdue'])
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching parent invoices:', error);
      return [];
    }

    return (data || []).map(this.mapToInvoice);
  }

  /**
   * Pay an invoice
   */
  async payInvoice(invoiceId: string, payerWalletId: string): Promise<PaymentResult> {
    try {
      // Get invoice details
      const { data: invoice, error: fetchError } = await supabaseAdmin
        .from('school_invoices')
        .select('*')
        .eq('id', invoiceId)
        .single();

      if (fetchError || !invoice) {
        return { success: false, error: 'Invoice not found' };
      }

      if (invoice.status === 'paid') {
        return { success: false, error: 'Invoice already paid' };
      }

      const amountDue = invoice.total - invoice.paid_amount;

      // Get school wallet
      const { data: schoolConnection } = await supabaseAdmin
        .from('school_connections')
        .select('wallet_id')
        .eq('school_id', invoice.school_id)
        .single();

      if (!schoolConnection?.wallet_id) {
        return { success: false, error: 'School wallet not found' };
      }

      // Process payment via wallet transfer
      const response = await fetch(`${this.apiBaseUrl}/api/wallet/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          fromWalletId: payerWalletId,
          toWalletId: schoolConnection.wallet_id,
          amount: amountDue,
          description: `Fee payment - ${invoice.invoice_number}`,
          metadata: {
            type: 'school_fee_payment',
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number,
            schoolId: invoice.school_id,
            studentId: invoice.student_id,
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return { success: false, error: error.message || 'Payment failed' };
      }

      const paymentResult = await response.json();

      // Update invoice status
      const receiptNumber = this.generateInvoiceNumber('receipt');
      await supabaseAdmin
        .from('school_invoices')
        .update({
          status: 'paid',
          paid_amount: invoice.total,
          paid_date: new Date().toISOString(),
          payment_transaction_id: paymentResult.transactionId,
          receipt_number: receiptNumber,
        })
        .eq('id', invoiceId);

      // Send receipt via chat
      await this.sendReceiptViaChat(invoice, receiptNumber, paymentResult.transactionId);

      return {
        success: true,
        transactionId: paymentResult.transactionId,
        receiptNumber,
      };
    } catch (err) {
      console.error('Payment error:', err);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * Send payment receipt via chat (like POS receipts)
   * Initiates a conversation with the parent when payment is made
   */
  private async sendReceiptViaChat(invoice: any, receiptNumber: string, transactionId: string): Promise<void> {
    if (!invoice.parent_user_id) return;

    try {
      const schoolId = localStorage.getItem('school_id') || localStorage.getItem('school_domain') || invoice.school_id;
      const schoolName = localStorage.getItem('schoolName') || 'School';

      // Use the chat service to send receipt (similar to POS receipts)
      await schoolChatService.sendFeeReceipt({
        recipientUserId: invoice.parent_user_id,
        schoolId,
        schoolName,
        receiptNumber,
        transactionId,
        amount: invoice.total,
        description: `School fee payment - ${invoice.invoice_number}`,
        studentName: invoice.recipient_name,
        studentId: invoice.student_id,
        items: invoice.items,
        paidAt: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Failed to send receipt via chat:', err);
    }
  }

  /**
   * Mark invoice as viewed (when parent opens it)
   */
  async markAsViewed(invoiceId: string): Promise<void> {
    await supabaseAdmin
      .from('school_invoices')
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('status', 'sent');
  }

  /**
   * Cancel an invoice
   */
  async cancelInvoice(invoiceId: string): Promise<void> {
    await supabaseAdmin
      .from('school_invoices')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .in('status', ['draft', 'sent']);
  }

  /**
   * Send reminder for overdue invoice
   */
  async sendReminder(invoiceId: string): Promise<void> {
    const { data: invoice } = await supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (!invoice || !invoice.parent_user_id) return;

    const schoolId = localStorage.getItem('school_id') || localStorage.getItem('school_domain') || invoice.school_id;
    const schoolName = localStorage.getItem('schoolName') || 'School';
    const daysOverdue = Math.floor(
      (Date.now() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Use chat service to send reminder
    await schoolChatService.sendReminder(
      invoice.parent_user_id,
      schoolId,
      schoolName,
      invoice.invoice_number,
      invoice.total,
      invoice.due_date,
      invoice.recipient_name,
      daysOverdue
    );

    // Update reminder count
    await supabaseAdmin
      .from('school_invoices')
      .update({
        reminder_count: (invoice.reminder_count || 0) + 1,
        last_reminder_at: new Date().toISOString(),
      })
      .eq('id', invoiceId);
  }

  /**
   * Get all pending invoices for a parent user
   * This is used on my.peeap.com for parents to view and pay fees
   */
  async getPendingInvoicesForParent(parentUserId: string): Promise<Invoice[]> {
    const { data, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('parent_user_id', parentUserId)
      .in('status', ['sent', 'viewed', 'overdue'])
      .order('due_date', { ascending: true });

    if (error) {
      console.error('Error fetching parent invoices:', error);
      return [];
    }

    return (data || []).map(this.mapToInvoice);
  }

  /**
   * Get all invoices for a parent (including paid ones)
   */
  async getAllInvoicesForParent(parentUserId: string): Promise<Invoice[]> {
    const { data, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('parent_user_id', parentUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching parent invoices:', error);
      return [];
    }

    return (data || []).map(this.mapToInvoice);
  }

  /**
   * Get invoices for a specific student (for parent view)
   */
  async getInvoicesForStudent(studentId: string, parentUserId?: string): Promise<Invoice[]> {
    let query = supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false });

    if (parentUserId) {
      query = query.eq('parent_user_id', parentUserId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching student invoices:', error);
      return [];
    }

    return (data || []).map(this.mapToInvoice);
  }

  /**
   * Get single invoice by ID (for viewing details)
   */
  async getInvoiceById(invoiceId: string): Promise<Invoice | null> {
    const { data, error } = await supabaseAdmin
      .from('school_invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }

    // Mark as viewed if status is 'sent'
    if (data.status === 'sent') {
      await this.markAsViewed(invoiceId);
    }

    return this.mapToInvoice(data);
  }

  /**
   * Pay invoice from parent's wallet
   * Returns payment result with transaction ID and receipt
   */
  async payInvoiceFromParentWallet(
    invoiceId: string,
    parentUserId: string,
    parentWalletId: string
  ): Promise<PaymentResult> {
    try {
      // Get invoice details
      const { data: invoice, error: fetchError } = await supabaseAdmin
        .from('school_invoices')
        .select('*')
        .eq('id', invoiceId)
        .eq('parent_user_id', parentUserId)
        .single();

      if (fetchError || !invoice) {
        return { success: false, error: 'Invoice not found or not authorized' };
      }

      if (invoice.status === 'paid') {
        return { success: false, error: 'Invoice already paid' };
      }

      if (invoice.status === 'cancelled') {
        return { success: false, error: 'Invoice has been cancelled' };
      }

      const amountDue = invoice.total - invoice.paid_amount;

      // Get parent wallet balance
      const { data: parentWallet, error: walletError } = await supabaseAdmin
        .from('wallets')
        .select('id, balance, status')
        .eq('id', parentWalletId)
        .eq('user_id', parentUserId)
        .single();

      if (walletError || !parentWallet) {
        return { success: false, error: 'Wallet not found' };
      }

      if (parentWallet.status !== 'ACTIVE') {
        return { success: false, error: 'Wallet is not active' };
      }

      const balance = parseFloat(parentWallet.balance) || 0;
      if (balance < amountDue / 100) { // Convert from cents
        return { success: false, error: `Insufficient balance. You need SLE ${(amountDue / 100).toLocaleString()}` };
      }

      // Get school wallet
      const { data: schoolConnection } = await supabaseAdmin
        .from('school_connections')
        .select('wallet_id, school_name')
        .eq('school_id', invoice.school_id)
        .single();

      if (!schoolConnection?.wallet_id) {
        return { success: false, error: 'School wallet not configured. Please contact the school.' };
      }

      // Generate receipt number
      const receiptNumber = this.generateInvoiceNumber('receipt');
      const transactionId = `FEE-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      // Deduct from parent wallet (amount in cents, wallet in base units)
      const amountInBase = amountDue / 100;
      const newParentBalance = balance - amountInBase;

      const { error: deductError } = await supabaseAdmin
        .from('wallets')
        .update({ balance: newParentBalance, updated_at: new Date().toISOString() })
        .eq('id', parentWalletId);

      if (deductError) {
        console.error('Error deducting from parent wallet:', deductError);
        return { success: false, error: 'Payment failed. Please try again.' };
      }

      // Credit school wallet
      const { data: schoolWallet } = await supabaseAdmin
        .from('wallets')
        .select('balance')
        .eq('id', schoolConnection.wallet_id)
        .single();

      const schoolBalance = parseFloat(schoolWallet?.balance) || 0;
      await supabaseAdmin
        .from('wallets')
        .update({ balance: schoolBalance + amountInBase, updated_at: new Date().toISOString() })
        .eq('id', schoolConnection.wallet_id);

      // Create transaction records
      await supabaseAdmin.from('transactions').insert({
        wallet_id: parentWalletId,
        type: 'SCHOOL_FEE',
        amount: -amountInBase,
        currency: 'SLE',
        status: 'COMPLETED',
        description: `School fee payment - Invoice #${invoice.invoice_number}`,
        reference: transactionId,
        merchant_name: schoolConnection.school_name || 'School',
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          student_id: invoice.student_id,
          school_id: invoice.school_id,
        },
      });

      await supabaseAdmin.from('transactions').insert({
        wallet_id: schoolConnection.wallet_id,
        type: 'FEE_RECEIVED',
        amount: amountInBase,
        currency: 'SLE',
        status: 'COMPLETED',
        description: `Fee received - Invoice #${invoice.invoice_number}`,
        reference: transactionId,
        metadata: {
          invoice_id: invoice.id,
          invoice_number: invoice.invoice_number,
          student_id: invoice.student_id,
          parent_user_id: parentUserId,
        },
      });

      // Record fee payment
      await supabaseAdmin.from('school_fee_payments').insert({
        invoice_id: invoice.id,
        school_id: invoice.school_id,
        student_id: invoice.student_id,
        payer_user_id: parentUserId,
        payer_wallet_id: parentWalletId,
        school_wallet_id: schoolConnection.wallet_id,
        amount: amountDue,
        payment_method: 'wallet',
        transaction_id: transactionId,
        status: 'completed',
        receipt_number: receiptNumber,
        completed_at: new Date().toISOString(),
      });

      // Update invoice status
      await supabaseAdmin
        .from('school_invoices')
        .update({
          status: 'paid',
          paid_amount: invoice.total,
          paid_date: new Date().toISOString(),
          payment_transaction_id: transactionId,
          receipt_number: receiptNumber,
        })
        .eq('id', invoiceId);

      // Send receipt via chat
      await this.sendReceiptViaChat(invoice, receiptNumber, transactionId);

      return {
        success: true,
        transactionId,
        receiptNumber,
      };
    } catch (err) {
      console.error('Payment error:', err);
      return { success: false, error: 'Payment processing failed' };
    }
  }

  /**
   * Get invoice summary for a parent
   */
  async getParentInvoiceSummary(parentUserId: string): Promise<{
    totalPending: number;
    totalOverdue: number;
    pendingCount: number;
    overdueCount: number;
  }> {
    const { data, error } = await supabaseAdmin
      .from('school_invoices')
      .select('status, total, paid_amount')
      .eq('parent_user_id', parentUserId)
      .in('status', ['sent', 'viewed', 'overdue']);

    if (error || !data) {
      return { totalPending: 0, totalOverdue: 0, pendingCount: 0, overdueCount: 0 };
    }

    let totalPending = 0;
    let totalOverdue = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    for (const inv of data) {
      const due = inv.total - inv.paid_amount;
      if (inv.status === 'overdue') {
        totalOverdue += due;
        overdueCount++;
      } else {
        totalPending += due;
        pendingCount++;
      }
    }

    return { totalPending, totalOverdue, pendingCount, overdueCount };
  }

  /**
   * Map database record to Invoice type
   */
  private mapToInvoice(data: any): Invoice {
    return {
      id: data.id,
      invoiceNumber: data.invoice_number,
      schoolId: data.school_id,
      type: data.type,
      recipient: {
        type: data.recipient_type,
        studentId: data.student_id,
        parentUserId: data.parent_user_id,
        name: data.recipient_name,
        email: data.recipient_email,
        phone: data.recipient_phone,
      },
      items: data.items || [],
      subtotal: data.subtotal,
      tax: data.tax,
      total: data.total,
      status: data.status,
      issueDate: data.issue_date,
      dueDate: data.due_date,
      paidDate: data.paid_date,
      paidAmount: data.paid_amount,
      notes: data.notes,
      chatMessageId: data.chat_message_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const schoolInvoiceService = new SchoolInvoiceService();
