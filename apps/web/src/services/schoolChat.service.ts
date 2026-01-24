/**
 * School Chat Service
 * Handles chat-based communication between schools and parents
 * Similar to POS receipts - sends payment receipts, invoices, and messages via Peeap Chat
 */

import { supabaseAdmin } from '@/lib/supabase';

export interface ChatMessage {
  id: string;
  type: 'receipt' | 'fee_notice' | 'salary_slip' | 'message' | 'reminder';
  recipientUserId: string;
  senderType: 'school' | 'parent';
  senderId: string;
  content: string;
  metadata?: Record<string, any>;
  status: 'sent' | 'delivered' | 'read';
  createdAt: string;
}

export interface SendReceiptRequest {
  recipientUserId: string;
  schoolId: string;
  schoolName: string;
  receiptNumber: string;
  transactionId: string;
  amount: number;
  description: string;
  studentName?: string;
  studentId?: string;
  items?: Array<{ description: string; amount: number }>;
  paidAt: string;
}

export interface SendInvoiceRequest {
  recipientUserId: string;
  schoolId: string;
  schoolName: string;
  invoiceId: string;
  invoiceNumber: string;
  invoiceType: 'proforma' | 'invoice' | 'receipt' | 'fee_notice';
  amount: number;
  dueDate: string;
  studentName: string;
  studentId?: string;
  items: Array<{ description: string; quantity: number; total: number }>;
}

export interface SendSalarySlipRequest {
  recipientUserId: string;
  staffId: string;
  staffName: string;
  schoolId: string;
  schoolName: string;
  month: string;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  transactionId: string;
  paidAt: string;
}

class SchoolChatService {
  private apiBaseUrl = import.meta.env.VITE_API_URL || 'https://api.peeap.com';

  /**
   * Get auth token from session storage or cookie
   * NOTE: In production, this should use proper session management
   */
  private getAuthToken(): string | null {
    // Try to get from Supabase session
    const supabaseAuth = sessionStorage.getItem('sb-auth-token');
    if (supabaseAuth) {
      try {
        const parsed = JSON.parse(supabaseAuth);
        return parsed.access_token;
      } catch {
        // Continue to next method
      }
    }
    return null;
  }

  /**
   * Send a fee payment receipt to parent via Peeap Chat
   * Similar to POS receipt functionality
   */
  async sendFeeReceipt(request: SendReceiptRequest): Promise<{ success: boolean; messageId?: string }> {
    try {
      const messageContent = this.formatFeeReceiptMessage(request);

      // Store the message in school_chat_messages table
      const { data: message, error } = await supabaseAdmin
        .from('school_chat_messages')
        .insert({
          type: 'receipt',
          recipient_user_id: request.recipientUserId,
          sender_type: 'school',
          sender_id: request.schoolId,
          content: messageContent,
          metadata: {
            receipt_number: request.receiptNumber,
            transaction_id: request.transactionId,
            amount: request.amount,
            student_name: request.studentName,
            student_id: request.studentId,
            school_name: request.schoolName,
            items: request.items,
          },
          status: 'sent',
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing chat message:', error);
        // Continue even if storage fails - try to send via API
      }

      // Send via Peeap Chat API
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken() || ''}`,
          },
          body: JSON.stringify({
            recipientUserId: request.recipientUserId,
            messageType: 'receipt',
            content: messageContent,
            metadata: {
              type: 'school_fee_receipt',
              receiptNumber: request.receiptNumber,
              transactionId: request.transactionId,
              amount: request.amount,
              schoolId: request.schoolId,
              schoolName: request.schoolName,
              studentId: request.studentId,
            },
            actionButton: {
              label: 'View Receipt',
              action: 'view_receipt',
              data: { receiptNumber: request.receiptNumber },
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return { success: true, messageId: result.messageId || message?.id };
        }
      } catch (apiErr) {
        console.log('Chat API not available, message stored locally:', apiErr);
      }

      return { success: true, messageId: message?.id };
    } catch (err) {
      console.error('Error sending fee receipt:', err);
      return { success: false };
    }
  }

  /**
   * Send an invoice to parent via Peeap Chat
   */
  async sendInvoice(request: SendInvoiceRequest): Promise<{ success: boolean; messageId?: string }> {
    try {
      const messageContent = this.formatInvoiceMessage(request);

      // Store the message
      const { data: message, error } = await supabaseAdmin
        .from('school_chat_messages')
        .insert({
          type: request.invoiceType === 'receipt' ? 'receipt' : 'invoice',
          recipient_user_id: request.recipientUserId,
          sender_type: 'school',
          sender_id: request.schoolId,
          content: messageContent,
          metadata: {
            invoice_id: request.invoiceId,
            invoice_number: request.invoiceNumber,
            invoice_type: request.invoiceType,
            amount: request.amount,
            due_date: request.dueDate,
            student_name: request.studentName,
            student_id: request.studentId,
            school_name: request.schoolName,
            items: request.items,
          },
          status: 'sent',
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing invoice message:', error);
      }

      // Send via API
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken() || ''}`,
          },
          body: JSON.stringify({
            recipientUserId: request.recipientUserId,
            messageType: 'invoice',
            content: messageContent,
            metadata: {
              type: 'school_invoice',
              invoiceId: request.invoiceId,
              invoiceNumber: request.invoiceNumber,
              invoiceType: request.invoiceType,
              amount: request.amount,
              dueDate: request.dueDate,
              schoolId: request.schoolId,
            },
            actionButton: {
              label: 'Pay Now',
              action: 'pay_invoice',
              data: { invoiceId: request.invoiceId },
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return { success: true, messageId: result.messageId || message?.id };
        }
      } catch (apiErr) {
        console.log('Chat API not available:', apiErr);
      }

      return { success: true, messageId: message?.id };
    } catch (err) {
      console.error('Error sending invoice:', err);
      return { success: false };
    }
  }

  /**
   * Send a salary slip to staff via Peeap Chat
   */
  async sendSalarySlip(request: SendSalarySlipRequest): Promise<{ success: boolean; messageId?: string }> {
    try {
      const messageContent = this.formatSalarySlipMessage(request);

      // Store the message
      const { data: message, error } = await supabaseAdmin
        .from('school_chat_messages')
        .insert({
          type: 'salary_slip',
          recipient_user_id: request.recipientUserId,
          sender_type: 'school',
          sender_id: request.schoolId,
          content: messageContent,
          metadata: {
            staff_id: request.staffId,
            staff_name: request.staffName,
            month: request.month,
            base_salary: request.baseSalary,
            allowances: request.allowances,
            deductions: request.deductions,
            net_salary: request.netSalary,
            transaction_id: request.transactionId,
            school_name: request.schoolName,
          },
          status: 'sent',
        })
        .select()
        .single();

      if (error) {
        console.error('Error storing salary slip message:', error);
      }

      // Send via API
      try {
        const response = await fetch(`${this.apiBaseUrl}/api/chat/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken() || ''}`,
          },
          body: JSON.stringify({
            recipientUserId: request.recipientUserId,
            messageType: 'salary_slip',
            content: messageContent,
            metadata: {
              type: 'salary_payment',
              staffId: request.staffId,
              month: request.month,
              netSalary: request.netSalary,
              transactionId: request.transactionId,
              schoolId: request.schoolId,
            },
          }),
        });

        if (response.ok) {
          const result = await response.json();
          return { success: true, messageId: result.messageId || message?.id };
        }
      } catch (apiErr) {
        console.log('Chat API not available:', apiErr);
      }

      return { success: true, messageId: message?.id };
    } catch (err) {
      console.error('Error sending salary slip:', err);
      return { success: false };
    }
  }

  /**
   * Send a payment reminder
   */
  async sendReminder(
    recipientUserId: string,
    schoolId: string,
    schoolName: string,
    invoiceNumber: string,
    amount: number,
    dueDate: string,
    studentName: string,
    daysOverdue: number
  ): Promise<{ success: boolean }> {
    const messageContent = `⚠️ *Payment Reminder from ${schoolName}*

Invoice #: ${invoiceNumber}
Student: ${studentName}
Amount Due: SLE ${(amount / 100).toLocaleString()}
Due Date: ${new Date(dueDate).toLocaleDateString()}
${daysOverdue > 0 ? `Days Overdue: ${daysOverdue}` : ''}

Please make payment at your earliest convenience to avoid any late fees.

Tap below to pay now.`;

    try {
      await supabaseAdmin
        .from('school_chat_messages')
        .insert({
          type: 'reminder',
          recipient_user_id: recipientUserId,
          sender_type: 'school',
          sender_id: schoolId,
          content: messageContent,
          metadata: {
            invoice_number: invoiceNumber,
            amount,
            due_date: dueDate,
            student_name: studentName,
            days_overdue: daysOverdue,
          },
          status: 'sent',
        });

      return { success: true };
    } catch (err) {
      console.error('Error sending reminder:', err);
      return { success: false };
    }
  }

  /**
   * Send a general message to parent
   */
  async sendMessage(
    recipientUserId: string,
    schoolId: string,
    schoolName: string,
    message: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; messageId?: string }> {
    try {
      const { data, error } = await supabaseAdmin
        .from('school_chat_messages')
        .insert({
          type: 'message',
          recipient_user_id: recipientUserId,
          sender_type: 'school',
          sender_id: schoolId,
          content: `📢 *Message from ${schoolName}*\n\n${message}`,
          metadata: { ...metadata, school_name: schoolName },
          status: 'sent',
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending message:', error);
        return { success: false };
      }

      return { success: true, messageId: data?.id };
    } catch (err) {
      console.error('Error sending message:', err);
      return { success: false };
    }
  }

  /**
   * Get chat messages for a user (parent view)
   */
  async getMessagesForUser(userId: string, limit = 50): Promise<ChatMessage[]> {
    const { data, error } = await supabaseAdmin
      .from('school_chat_messages')
      .select('*')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching messages:', error);
      return [];
    }

    return (data || []).map(this.mapToChatMessage);
  }

  /**
   * Get chat messages sent by a school
   */
  async getMessagesForSchool(schoolId: string, limit = 100): Promise<ChatMessage[]> {
    const { data, error } = await supabaseAdmin
      .from('school_chat_messages')
      .select('*')
      .eq('sender_id', schoolId)
      .eq('sender_type', 'school')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching school messages:', error);
      return [];
    }

    return (data || []).map(this.mapToChatMessage);
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await supabaseAdmin
      .from('school_chat_messages')
      .update({ status: 'read', read_at: new Date().toISOString() })
      .eq('id', messageId);
  }

  /**
   * Format fee receipt message
   */
  private formatFeeReceiptMessage(request: SendReceiptRequest): string {
    const itemsList = request.items
      ? request.items.map(item => `• ${item.description}: SLE ${(item.amount / 100).toLocaleString()}`).join('\n')
      : '';

    return `✅ *Payment Received - Thank You!*

Receipt #: ${request.receiptNumber}
${request.studentName ? `Student: ${request.studentName}` : ''}
Amount Paid: SLE ${(request.amount / 100).toLocaleString()}
Date: ${new Date(request.paidAt).toLocaleDateString()}

${itemsList ? `*Items:*\n${itemsList}\n\n` : ''}Transaction ID: ${request.transactionId}

Thank you for your payment to ${request.schoolName}. This receipt serves as confirmation of your payment.`;
  }

  /**
   * Format invoice message
   */
  private formatInvoiceMessage(request: SendInvoiceRequest): string {
    const typeLabel = {
      proforma: 'Proforma Invoice',
      invoice: 'Invoice',
      receipt: 'Payment Receipt',
      fee_notice: 'Fee Notice',
    }[request.invoiceType];

    const itemsList = request.items
      .map(item => `• ${item.description}: SLE ${(item.total / 100).toLocaleString()}`)
      .join('\n');

    return `📄 *${typeLabel} from ${request.schoolName}*

Invoice #: ${request.invoiceNumber}
Student: ${request.studentName}
Due Date: ${new Date(request.dueDate).toLocaleDateString()}

*Items:*
${itemsList}

*Total Amount: SLE ${(request.amount / 100).toLocaleString()}*

Tap below to pay securely via Peeap.`;
  }

  /**
   * Format salary slip message
   */
  private formatSalarySlipMessage(request: SendSalarySlipRequest): string {
    const monthDate = new Date(request.month + '-01');
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return `💰 *Salary Payment from ${request.schoolName}*

Pay Slip for: ${monthName}
Staff: ${request.staffName}
Staff ID: ${request.staffId}

*Earnings:*
Base Salary: SLE ${request.baseSalary.toLocaleString()}
Allowances: SLE ${request.allowances.toLocaleString()}

*Deductions:*
Total Deductions: SLE ${request.deductions.toLocaleString()}

━━━━━━━━━━━━━━━━
*Net Salary: SLE ${request.netSalary.toLocaleString()}*
━━━━━━━━━━━━━━━━

Payment Date: ${new Date(request.paidAt).toLocaleDateString()}
Transaction ID: ${request.transactionId}

Your salary has been credited to your Peeap wallet.`;
  }

  /**
   * Map database record to ChatMessage
   */
  private mapToChatMessage(data: any): ChatMessage {
    return {
      id: data.id,
      type: data.type,
      recipientUserId: data.recipient_user_id,
      senderType: data.sender_type,
      senderId: data.sender_id,
      content: data.content,
      metadata: data.metadata,
      status: data.status,
      createdAt: data.created_at,
    };
  }
}

export const schoolChatService = new SchoolChatService();
