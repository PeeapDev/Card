import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

export interface ChatMessage {
  id: string;
  school_id: string;
  recipient_user_id: string;
  type: 'receipt' | 'fee_notice' | 'salary_slip' | 'message' | 'reminder';
  content: string;
  status: 'sent' | 'delivered' | 'read';
  metadata?: Record<string, any>;
  created_at: string;
  read_at?: string;
}

export interface Webhook {
  id: string;
  school_id: string;
  url: string;
  events: string[];
  secret: string;
  status: 'active' | 'inactive';
  created_at: string;
}

@Injectable()
export class MessagingService {
  private supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseServiceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Send a message to a user
   */
  async sendMessage(params: {
    schoolId: string;
    recipientUserId: string;
    type: ChatMessage['type'];
    content: string;
    metadata?: Record<string, any>;
  }): Promise<ChatMessage> {
    const messageId = `msg_${crypto.randomBytes(12).toString('hex')}`;
    const now = new Date().toISOString();

    const { data: message, error } = await this.supabase
      .from('school_chat_messages')
      .insert({
        id: messageId,
        school_id: params.schoolId,
        recipient_user_id: params.recipientUserId,
        type: params.type,
        content: params.content,
        status: 'sent',
        metadata: params.metadata,
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'MESSAGE_FAILED',
          message: `Failed to send message: ${error.message}`,
        },
      });
    }

    // Trigger push notification (async, don't wait)
    this.sendPushNotification(params.recipientUserId, params.type, params.content).catch(
      (err) => console.error('Push notification failed:', err),
    );

    return message;
  }

  /**
   * Send payment receipt to user
   */
  async sendReceipt(params: {
    schoolId: string;
    recipientUserId: string;
    transactionId: string;
    receiptNumber: string;
    amount: number;
    currency: string;
    description: string;
    studentName?: string;
    feeName?: string;
    paidAt: string;
  }): Promise<ChatMessage> {
    // Format receipt content
    const content = this.formatReceiptContent(params);

    return this.sendMessage({
      schoolId: params.schoolId,
      recipientUserId: params.recipientUserId,
      type: 'receipt',
      content,
      metadata: {
        transaction_id: params.transactionId,
        receipt_number: params.receiptNumber,
        amount: params.amount,
        currency: params.currency,
        student_name: params.studentName,
        fee_name: params.feeName,
        paid_at: params.paidAt,
      },
    });
  }

  /**
   * Send fee notice to user
   */
  async sendFeeNotice(params: {
    schoolId: string;
    recipientUserId: string;
    studentName: string;
    feeName: string;
    amount: number;
    currency: string;
    dueDate: string;
    invoiceId?: string;
  }): Promise<ChatMessage> {
    const content = this.formatFeeNoticeContent(params);

    return this.sendMessage({
      schoolId: params.schoolId,
      recipientUserId: params.recipientUserId,
      type: 'fee_notice',
      content,
      metadata: {
        student_name: params.studentName,
        fee_name: params.feeName,
        amount: params.amount,
        currency: params.currency,
        due_date: params.dueDate,
        invoice_id: params.invoiceId,
      },
    });
  }

  /**
   * Send salary slip to staff
   */
  async sendSalarySlip(params: {
    schoolId: string;
    recipientUserId: string;
    staffName: string;
    month: string;
    year: number;
    grossAmount: number;
    deductions: number;
    netAmount: number;
    currency: string;
    breakdown?: Record<string, number>;
  }): Promise<ChatMessage> {
    const content = this.formatSalarySlipContent(params);

    return this.sendMessage({
      schoolId: params.schoolId,
      recipientUserId: params.recipientUserId,
      type: 'salary_slip',
      content,
      metadata: {
        staff_name: params.staffName,
        month: params.month,
        year: params.year,
        gross_amount: params.grossAmount,
        deductions: params.deductions,
        net_amount: params.netAmount,
        currency: params.currency,
        breakdown: params.breakdown,
      },
    });
  }

  /**
   * Send payment reminder
   */
  async sendReminder(params: {
    schoolId: string;
    recipientUserId: string;
    studentName: string;
    feeName: string;
    outstandingAmount: number;
    currency: string;
    originalDueDate: string;
    invoiceNumber?: string;
  }): Promise<ChatMessage> {
    const content = this.formatReminderContent(params);

    return this.sendMessage({
      schoolId: params.schoolId,
      recipientUserId: params.recipientUserId,
      type: 'reminder',
      content,
      metadata: {
        student_name: params.studentName,
        fee_name: params.feeName,
        outstanding_amount: params.outstandingAmount,
        currency: params.currency,
        original_due_date: params.originalDueDate,
        invoice_number: params.invoiceNumber,
      },
    });
  }

  /**
   * Get messages for a user
   */
  async getMessagesForUser(userId: string, limit = 50, offset = 0): Promise<ChatMessage[]> {
    const { data: messages, error } = await this.supabase
      .from('school_chat_messages')
      .select('*')
      .eq('recipient_user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'FETCH_FAILED',
          message: 'Failed to fetch messages',
        },
      });
    }

    return messages || [];
  }

  /**
   * Mark message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    const now = new Date().toISOString();

    await this.supabase
      .from('school_chat_messages')
      .update({
        status: 'read',
        read_at: now,
      })
      .eq('id', messageId);
  }

  /**
   * Register a webhook
   */
  async registerWebhook(params: {
    schoolId: string;
    url: string;
    events: string[];
    userId: string;
  }): Promise<Webhook> {
    const webhookId = `wh_${crypto.randomBytes(12).toString('hex')}`;
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`;
    const now = new Date().toISOString();

    const { data: webhook, error } = await this.supabase
      .from('school_webhooks')
      .insert({
        id: webhookId,
        school_id: params.schoolId,
        url: params.url,
        events: params.events,
        secret,
        status: 'active',
        created_by: params.userId,
        created_at: now,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'WEBHOOK_FAILED',
          message: `Failed to register webhook: ${error.message}`,
        },
      });
    }

    return webhook;
  }

  /**
   * List webhooks for a school
   */
  async listWebhooks(schoolId: string): Promise<Webhook[]> {
    const { data: webhooks, error } = await this.supabase
      .from('school_webhooks')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });

    if (error) {
      return [];
    }

    return webhooks || [];
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookId: string, schoolId: string): Promise<void> {
    const { error } = await this.supabase
      .from('school_webhooks')
      .delete()
      .eq('id', webhookId)
      .eq('school_id', schoolId);

    if (error) {
      throw new BadRequestException({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: 'Failed to delete webhook',
        },
      });
    }
  }

  /**
   * Trigger webhook for an event
   */
  async triggerWebhooks(schoolId: string, event: string, payload: any): Promise<void> {
    // Get active webhooks for this school and event
    const { data: webhooks } = await this.supabase
      .from('school_webhooks')
      .select('*')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .contains('events', [event]);

    if (!webhooks || webhooks.length === 0) return;

    // Send webhooks in parallel (fire and forget)
    for (const webhook of webhooks) {
      this.sendWebhook(webhook, event, payload).catch((err) =>
        console.error(`Webhook ${webhook.id} failed:`, err),
      );
    }
  }

  private async sendWebhook(webhook: Webhook, event: string, payload: any): Promise<void> {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: `evt_${crypto.randomBytes(12).toString('hex')}`,
      event,
      timestamp,
      data: payload,
    });

    // Create signature
    const signature = crypto
      .createHmac('sha256', webhook.secret)
      .update(`${timestamp}.${body}`)
      .digest('hex');

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Peeap-Signature': `t=${timestamp},v1=${signature}`,
          'X-Peeap-Event': event,
        },
        body,
      });

      // Log webhook delivery
      await this.supabase.from('webhook_deliveries').insert({
        webhook_id: webhook.id,
        event,
        payload,
        response_status: response.status,
        delivered_at: new Date().toISOString(),
      });
    } catch (error: any) {
      // Log failed delivery
      await this.supabase.from('webhook_deliveries').insert({
        webhook_id: webhook.id,
        event,
        payload,
        error: error.message,
        delivered_at: new Date().toISOString(),
      });
    }
  }

  private async sendPushNotification(userId: string, type: string, content: string): Promise<void> {
    // TODO: Implement push notification via FCM/APNS
    // For now, just log
    console.log(`Push notification to ${userId}: [${type}] ${content.substring(0, 50)}...`);
  }

  private formatReceiptContent(params: {
    schoolId: string;
    receiptNumber: string;
    amount: number;
    currency: string;
    description: string;
    studentName?: string;
    feeName?: string;
    paidAt: string;
  }): string {
    return `
================================
       PAYMENT RECEIPT
================================
Receipt No: ${params.receiptNumber}
Date: ${new Date(params.paidAt).toLocaleDateString()}

${params.studentName ? `Student: ${params.studentName}` : ''}
${params.feeName ? `Fee: ${params.feeName}` : ''}
Description: ${params.description}

Amount Paid: ${params.currency} ${(params.amount / 100).toLocaleString()}

================================
  Thank you for your payment!
================================
    `.trim();
  }

  private formatFeeNoticeContent(params: {
    studentName: string;
    feeName: string;
    amount: number;
    currency: string;
    dueDate: string;
  }): string {
    return `
================================
       FEE NOTICE
================================
Student: ${params.studentName}
Fee: ${params.feeName}

Amount Due: ${params.currency} ${(params.amount / 100).toLocaleString()}
Due Date: ${new Date(params.dueDate).toLocaleDateString()}

Please ensure payment is made before
the due date to avoid late fees.
================================
    `.trim();
  }

  private formatSalarySlipContent(params: {
    staffName: string;
    month: string;
    year: number;
    grossAmount: number;
    deductions: number;
    netAmount: number;
    currency: string;
    breakdown?: Record<string, number>;
  }): string {
    let breakdownText = '';
    if (params.breakdown) {
      breakdownText = Object.entries(params.breakdown)
        .map(([key, value]) => `  ${key}: ${params.currency} ${(value / 100).toLocaleString()}`)
        .join('\n');
    }

    return `
================================
       SALARY SLIP
================================
Employee: ${params.staffName}
Period: ${params.month} ${params.year}

Gross Salary: ${params.currency} ${(params.grossAmount / 100).toLocaleString()}
${breakdownText ? `\nBreakdown:\n${breakdownText}` : ''}

Deductions: ${params.currency} ${(params.deductions / 100).toLocaleString()}

--------------------------------
Net Pay: ${params.currency} ${(params.netAmount / 100).toLocaleString()}
================================
    `.trim();
  }

  private formatReminderContent(params: {
    studentName: string;
    feeName: string;
    outstandingAmount: number;
    currency: string;
    originalDueDate: string;
  }): string {
    return `
================================
    PAYMENT REMINDER
================================
Student: ${params.studentName}
Fee: ${params.feeName}

Outstanding: ${params.currency} ${(params.outstandingAmount / 100).toLocaleString()}
Original Due Date: ${new Date(params.originalDueDate).toLocaleDateString()}

This is a friendly reminder that
payment is overdue. Please settle
at your earliest convenience.
================================
    `.trim();
  }
}
