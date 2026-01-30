import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

// Types
interface ParentConnection {
  id: string;
  peeap_user_id: string;
  peeap_wallet_id?: string;
  school_id: string;
  peeap_school_id?: string;
  school_name: string;
  school_logo_url?: string;
  school_domain?: string;
  school_parent_id: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  status: 'active' | 'inactive' | 'blocked';
  is_verified: boolean;
  chat_enabled: boolean;
}

interface ChatThread {
  id: string;
  school_id: string;
  peeap_school_id?: string;
  school_name: string;
  school_logo_url?: string;
  thread_type: 'direct' | 'class_group' | 'school_wide' | 'support';
  parent_connection_id?: string;
  parent_user_id?: string;
  parent_name?: string;
  class_id?: string;
  class_name?: string;
  title?: string;
  status: 'active' | 'archived' | 'closed';
  parent_unread_count: number;
  school_unread_count: number;
  last_message_preview?: string;
  last_message_at?: string;
  last_message_by?: string;
}

interface ChatMessage {
  id: string;
  thread_id: string;
  sender_type: 'school' | 'parent' | 'system';
  sender_id?: string;
  sender_name?: string;
  sender_role?: string;
  sender_avatar_url?: string;
  message_type: string;
  content?: string;
  rich_content?: any;
  attachments?: any[];
  reply_to_message_id?: string;
  status: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  read_at?: string;
  delivered_at?: string;
  created_at: string;
}

interface ChildInfo {
  nsi: string;
  name: string;
  student_id?: string;
  class_id?: string;
  class_name?: string;
  section_name?: string;
  profile_photo_url?: string;
  peeap_wallet_id?: string;
}

@Injectable()
export class SchoolChatService {
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

  // ============================================
  // Parent Connection Management (SSO Flow)
  // ============================================

  /**
   * Create or update a parent connection after SSO from school SaaS
   * This is called during the OAuth callback when a parent connects from school portal
   */
  async createParentConnection(params: {
    peeapUserId: string;
    peeapWalletId?: string;
    schoolId: string;
    peeapSchoolId?: string;
    schoolName: string;
    schoolLogoUrl?: string;
    schoolDomain?: string;
    schoolParentId: string;
    parentName?: string;
    parentEmail?: string;
    parentPhone?: string;
    children: ChildInfo[];
  }): Promise<{
    connection_id: string;
    chat_enabled: boolean;
    thread_id?: string;
    children: Array<{ nsi: string; name: string; wallet_id?: string }>;
  }> {
    // Check if connection already exists
    const { data: existing } = await this.supabase
      .from('school_parent_connections')
      .select('id, chat_enabled')
      .eq('peeap_user_id', params.peeapUserId)
      .eq('school_id', params.schoolId)
      .eq('school_parent_id', params.schoolParentId)
      .single();

    let connectionId: string;

    if (existing) {
      // Update existing connection
      connectionId = existing.id;
      await this.supabase
        .from('school_parent_connections')
        .update({
          peeap_wallet_id: params.peeapWalletId,
          peeap_school_id: params.peeapSchoolId,
          school_name: params.schoolName,
          school_logo_url: params.schoolLogoUrl,
          school_domain: params.schoolDomain,
          parent_name: params.parentName,
          parent_email: params.parentEmail,
          parent_phone: params.parentPhone,
          status: 'active',
          last_activity_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', connectionId);
    } else {
      // Create new connection
      const { data: newConnection, error: createError } = await this.supabase
        .from('school_parent_connections')
        .insert({
          peeap_user_id: params.peeapUserId,
          peeap_wallet_id: params.peeapWalletId,
          school_id: params.schoolId,
          peeap_school_id: params.peeapSchoolId,
          school_name: params.schoolName,
          school_logo_url: params.schoolLogoUrl,
          school_domain: params.schoolDomain,
          school_parent_id: params.schoolParentId,
          parent_name: params.parentName,
          parent_email: params.parentEmail,
          parent_phone: params.parentPhone,
          status: 'active',
          is_verified: true,
          chat_enabled: true,
        })
        .select('id')
        .single();

      if (createError) {
        throw new BadRequestException(`Failed to create connection: ${createError.message}`);
      }

      connectionId = newConnection.id;
    }

    // Create/update children
    const childrenResult: Array<{ nsi: string; name: string; wallet_id?: string }> = [];

    for (const child of params.children) {
      // Check if child already exists
      const { data: existingChild } = await this.supabase
        .from('school_parent_children')
        .select('id, student_wallet_id')
        .eq('connection_id', connectionId)
        .eq('nsi', child.nsi)
        .single();

      if (existingChild) {
        // Update existing child
        await this.supabase
          .from('school_parent_children')
          .update({
            student_name: child.name,
            student_id_in_school: child.student_id,
            class_id: child.class_id,
            class_name: child.class_name,
            section_name: child.section_name,
            profile_photo_url: child.profile_photo_url,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingChild.id);

        childrenResult.push({
          nsi: child.nsi,
          name: child.name,
          wallet_id: existingChild.student_wallet_id || child.peeap_wallet_id,
        });
      } else {
        // Create new child
        const { data: newChild, error: childError } = await this.supabase
          .from('school_parent_children')
          .insert({
            connection_id: connectionId,
            nsi: child.nsi,
            student_name: child.name,
            student_id_in_school: child.student_id,
            class_id: child.class_id,
            class_name: child.class_name,
            section_name: child.section_name,
            profile_photo_url: child.profile_photo_url,
            student_wallet_id: child.peeap_wallet_id,
          })
          .select('id, student_wallet_id')
          .single();

        if (!childError && newChild) {
          childrenResult.push({
            nsi: child.nsi,
            name: child.name,
            wallet_id: newChild.student_wallet_id,
          });
        }
      }
    }

    // Create initial chat thread if doesn't exist
    let threadId: string | undefined;
    const { data: existingThread } = await this.supabase
      .from('school_chat_threads')
      .select('id')
      .eq('parent_connection_id', connectionId)
      .eq('thread_type', 'direct')
      .eq('status', 'active')
      .single();

    if (!existingThread) {
      // Create direct chat thread
      const { data: newThread } = await this.supabase
        .from('school_chat_threads')
        .insert({
          school_id: params.schoolId,
          peeap_school_id: params.peeapSchoolId,
          school_name: params.schoolName,
          school_logo_url: params.schoolLogoUrl,
          thread_type: 'direct',
          parent_connection_id: connectionId,
          parent_user_id: params.peeapUserId,
          parent_name: params.parentName,
          status: 'active',
        })
        .select('id')
        .single();

      if (newThread) {
        threadId = newThread.id;

        // Send welcome message
        await this.sendSystemMessage(threadId, {
          content: `Welcome to ${params.schoolName}'s chat! You can now receive notifications and communicate with the school directly.`,
          messageType: 'system',
        });
      }
    } else {
      threadId = existingThread.id;
    }

    return {
      connection_id: connectionId,
      chat_enabled: true,
      thread_id: threadId,
      children: childrenResult,
    };
  }

  /**
   * Get parent connections for a user
   */
  async getParentConnections(peeapUserId: string): Promise<ParentConnection[]> {
    const { data, error } = await this.supabase
      .from('school_parent_connections')
      .select(`
        *,
        school_parent_children (*)
      `)
      .eq('peeap_user_id', peeapUserId)
      .eq('status', 'active');

    if (error) {
      throw new BadRequestException('Failed to fetch connections');
    }

    return data || [];
  }

  // ============================================
  // Chat Thread Management
  // ============================================

  /**
   * Get all chat threads for a parent user
   */
  async getParentThreads(peeapUserId: string): Promise<{
    threads: Array<ChatThread & { children?: ChildInfo[] }>;
  }> {
    const { data: threads, error } = await this.supabase
      .from('school_chat_threads')
      .select(`
        *,
        school_parent_connections!inner (
          school_parent_children (
            nsi,
            student_name,
            class_name,
            profile_photo_url,
            student_wallet_id
          )
        )
      `)
      .eq('parent_user_id', peeapUserId)
      .eq('status', 'active')
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      throw new BadRequestException('Failed to fetch threads');
    }

    // Format the response
    const formattedThreads = (threads || []).map((thread: any) => {
      const children = thread.school_parent_connections?.school_parent_children || [];
      delete thread.school_parent_connections;

      return {
        ...thread,
        children: children.map((c: any) => ({
          nsi: c.nsi,
          name: c.student_name,
          class_name: c.class_name,
          profile_photo_url: c.profile_photo_url,
          wallet_id: c.student_wallet_id,
        })),
      };
    });

    return { threads: formattedThreads };
  }

  /**
   * Get messages in a thread
   */
  async getThreadMessages(
    threadId: string,
    peeapUserId: string,
    options?: { limit?: number; before?: string; after?: string }
  ): Promise<{
    messages: ChatMessage[];
    has_more: boolean;
  }> {
    // Verify user has access to this thread
    const { data: thread } = await this.supabase
      .from('school_chat_threads')
      .select('id, parent_user_id')
      .eq('id', threadId)
      .eq('parent_user_id', peeapUserId)
      .single();

    if (!thread) {
      throw new ForbiddenException('You do not have access to this thread');
    }

    // Build query
    let query = this.supabase
      .from('school_chat_messages')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: false });

    if (options?.limit) {
      query = query.limit(options.limit + 1); // +1 to check if there are more
    } else {
      query = query.limit(51);
    }

    if (options?.before) {
      query = query.lt('created_at', options.before);
    }

    if (options?.after) {
      query = query.gt('created_at', options.after);
    }

    const { data: messages, error } = await query;

    if (error) {
      throw new BadRequestException('Failed to fetch messages');
    }

    const limit = options?.limit || 50;
    const hasMore = (messages?.length || 0) > limit;
    const returnMessages = messages?.slice(0, limit).reverse() || [];

    return {
      messages: returnMessages,
      has_more: hasMore,
    };
  }

  /**
   * Send a message from parent to school
   */
  async sendParentMessage(
    threadId: string,
    peeapUserId: string,
    params: {
      content: string;
      replyToMessageId?: string;
      attachments?: any[];
    }
  ): Promise<ChatMessage> {
    // Verify user has access to this thread
    const { data: thread } = await this.supabase
      .from('school_chat_threads')
      .select('id, parent_user_id, school_id, parent_name')
      .eq('id', threadId)
      .eq('parent_user_id', peeapUserId)
      .single();

    if (!thread) {
      throw new ForbiddenException('You do not have access to this thread');
    }

    // Get parent name from users table if not in thread
    let senderName = thread.parent_name;
    if (!senderName) {
      const { data: user } = await this.supabase
        .from('users')
        .select('full_name, first_name, last_name')
        .eq('id', peeapUserId)
        .single();

      if (user) {
        senderName = user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim();
      }
    }

    // Insert message
    const { data: message, error } = await this.supabase
      .from('school_chat_messages')
      .insert({
        thread_id: threadId,
        sender_type: 'parent',
        sender_id: peeapUserId,
        sender_name: senderName || 'Parent',
        message_type: 'text',
        content: params.content,
        attachments: params.attachments,
        reply_to_message_id: params.replyToMessageId,
        status: 'sent',
      })
      .select('*')
      .single();

    if (error) {
      throw new BadRequestException(`Failed to send message: ${error.message}`);
    }

    // Update thread
    await this.supabase
      .from('school_chat_threads')
      .update({
        last_message_preview: params.content.substring(0, 100),
        last_message_at: new Date().toISOString(),
        last_message_by: 'parent',
        school_unread_count: this.supabase.rpc('increment', { x: 1 }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', threadId);

    return message;
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(threadId: string, peeapUserId: string): Promise<void> {
    // Verify user has access to this thread
    const { data: thread } = await this.supabase
      .from('school_chat_threads')
      .select('id, parent_user_id')
      .eq('id', threadId)
      .eq('parent_user_id', peeapUserId)
      .single();

    if (!thread) {
      throw new ForbiddenException('You do not have access to this thread');
    }

    const now = new Date().toISOString();

    // Mark all school messages as read
    await this.supabase
      .from('school_chat_messages')
      .update({ status: 'read', read_at: now })
      .eq('thread_id', threadId)
      .eq('sender_type', 'school')
      .is('read_at', null);

    // Reset parent unread count
    await this.supabase
      .from('school_chat_threads')
      .update({ parent_unread_count: 0 })
      .eq('id', threadId);
  }

  // ============================================
  // School API Methods (for School SaaS to call)
  // ============================================

  /**
   * Send a message from school to parent
   * Called by school SaaS via API
   */
  async sendSchoolMessage(params: {
    schoolAccessToken: string;
    parentConnectionId?: string;
    parentNsiList?: string[];
    messageType: string;
    content: string;
    richContent?: any;
    senderName?: string;
    senderRole?: string;
  }): Promise<{
    message_ids: string[];
    sent_to: number;
  }> {
    // Validate school access token
    const school = await this.validateSchoolToken(params.schoolAccessToken);
    if (!school) {
      throw new ForbiddenException('Invalid school access token');
    }

    const messageIds: string[] = [];
    let sentTo = 0;

    // Get target parent connections
    let connections: any[] = [];

    if (params.parentConnectionId) {
      const { data } = await this.supabase
        .from('school_parent_connections')
        .select('*, school_chat_threads!inner(*)')
        .eq('id', params.parentConnectionId)
        .eq('school_id', school.school_id)
        .eq('status', 'active')
        .eq('school_chat_threads.status', 'active');

      connections = data || [];
    } else if (params.parentNsiList && params.parentNsiList.length > 0) {
      // Find parents by their children's NSIs
      const { data } = await this.supabase
        .from('school_parent_children')
        .select(`
          school_parent_connections!inner (
            id,
            peeap_user_id,
            school_id,
            school_chat_threads!inner (id, status)
          )
        `)
        .in('nsi', params.parentNsiList);

      // Extract unique parent connections
      const seen = new Set();
      connections = (data || [])
        .map((c: any) => c.school_parent_connections)
        .filter((c: any) => {
          if (seen.has(c.id)) return false;
          seen.add(c.id);
          return c.school_id === school.school_id &&
                 c.school_chat_threads?.some((t: any) => t.status === 'active');
        });
    }

    // Send message to each connection's thread
    for (const connection of connections) {
      const threads = connection.school_chat_threads || [];
      const activeThread = threads.find((t: any) => t.status === 'active');

      if (activeThread) {
        const { data: message, error } = await this.supabase
          .from('school_chat_messages')
          .insert({
            thread_id: activeThread.id,
            sender_type: 'school',
            sender_id: school.school_id,
            sender_name: params.senderName || school.school_name,
            sender_role: params.senderRole,
            message_type: params.messageType,
            content: params.content,
            rich_content: params.richContent,
            status: 'sent',
          })
          .select('id')
          .single();

        if (!error && message) {
          messageIds.push(message.id);
          sentTo++;

          // Update thread
          await this.supabase
            .from('school_chat_threads')
            .update({
              last_message_preview: params.content.substring(0, 100),
              last_message_at: new Date().toISOString(),
              last_message_by: 'school',
              parent_unread_count: this.supabase.rpc('increment', { x: 1 }),
              updated_at: new Date().toISOString(),
            })
            .eq('id', activeThread.id);
        }
      }
    }

    return {
      message_ids: messageIds,
      sent_to: sentTo,
    };
  }

  /**
   * Send an invoice notification to a parent
   */
  async sendInvoiceNotification(params: {
    schoolAccessToken: string;
    studentNsi: string;
    invoice: {
      invoice_id: string;
      invoice_number?: string;
      items: Array<{ name: string; amount: number }>;
      subtotal?: number;
      total: number;
      due_date: string;
      status?: string;
    };
  }): Promise<{ message_id?: string; sent: boolean }> {
    // Validate school access token
    const school = await this.validateSchoolToken(params.schoolAccessToken);
    if (!school) {
      throw new ForbiddenException('Invalid school access token');
    }

    // Find parent connection by child's NSI
    const { data: child } = await this.supabase
      .from('school_parent_children')
      .select(`
        nsi,
        student_name,
        class_name,
        school_parent_connections!inner (
          id,
          peeap_user_id,
          school_id,
          school_chat_threads!inner (id, status)
        )
      `)
      .eq('nsi', params.studentNsi)
      .single();

    if (!child || !child.school_parent_connections) {
      return { sent: false };
    }

    const connection = child.school_parent_connections as any;
    if (connection.school_id !== school.school_id) {
      throw new ForbiddenException('Student does not belong to this school');
    }

    const threads = connection.school_chat_threads || [];
    const activeThread = threads.find((t: any) => t.status === 'active');

    if (!activeThread) {
      return { sent: false };
    }

    // Build rich content for invoice
    const richContent = {
      invoice_id: params.invoice.invoice_id,
      invoice_number: params.invoice.invoice_number || params.invoice.invoice_id,
      student_nsi: params.studentNsi,
      student_name: child.student_name,
      class_name: child.class_name,
      items: params.invoice.items,
      subtotal: params.invoice.subtotal || params.invoice.total,
      total_due: params.invoice.total,
      currency: 'SLE',
      due_date: params.invoice.due_date,
      status: params.invoice.status || 'unpaid',
      actions: [
        {
          type: 'pay',
          label: 'Pay Now',
          url: `peeap://pay/invoice/${params.invoice.invoice_id}`,
        },
        {
          type: 'view',
          label: 'View Details',
          url: `peeap://invoice/${params.invoice.invoice_id}`,
        },
      ],
    };

    const content = `Fee invoice for ${child.student_name} - Total: SLE ${params.invoice.total.toLocaleString()}`;

    const { data: message, error } = await this.supabase
      .from('school_chat_messages')
      .insert({
        thread_id: activeThread.id,
        sender_type: 'school',
        sender_id: school.school_id,
        sender_name: school.school_name,
        sender_role: 'Finance',
        message_type: 'invoice',
        content,
        rich_content: richContent,
        status: 'sent',
      })
      .select('id')
      .single();

    if (error) {
      return { sent: false };
    }

    // Update thread
    await this.supabase
      .from('school_chat_threads')
      .update({
        last_message_preview: content.substring(0, 100),
        last_message_at: new Date().toISOString(),
        last_message_by: 'school',
        parent_unread_count: this.supabase.rpc('increment', { x: 1 }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeThread.id);

    return {
      message_id: message?.id,
      sent: true,
    };
  }

  /**
   * Send a receipt notification after payment
   */
  async sendReceiptNotification(params: {
    schoolId: string;
    studentNsi: string;
    receipt: {
      receipt_number: string;
      transaction_id: string;
      amount_paid: number;
      currency: string;
      payment_method: string;
      paid_at: string;
      items_paid: Array<{ name: string; amount: number }>;
      balance_remaining?: number;
    };
  }): Promise<{ message_id?: string; sent: boolean }> {
    // Find parent connection by child's NSI
    const { data: child } = await this.supabase
      .from('school_parent_children')
      .select(`
        nsi,
        student_name,
        class_name,
        school_parent_connections!inner (
          id,
          peeap_user_id,
          school_id,
          school_name,
          school_chat_threads!inner (id, status)
        )
      `)
      .eq('nsi', params.studentNsi)
      .single();

    if (!child || !child.school_parent_connections) {
      return { sent: false };
    }

    const connection = child.school_parent_connections as any;
    if (connection.school_id !== params.schoolId) {
      return { sent: false };
    }

    const threads = connection.school_chat_threads || [];
    const activeThread = threads.find((t: any) => t.status === 'active');

    if (!activeThread) {
      return { sent: false };
    }

    // Build rich content for receipt
    const richContent = {
      receipt_number: params.receipt.receipt_number,
      transaction_id: params.receipt.transaction_id,
      student_nsi: params.studentNsi,
      student_name: child.student_name,
      amount_paid: params.receipt.amount_paid,
      currency: params.receipt.currency,
      payment_method: params.receipt.payment_method,
      paid_at: params.receipt.paid_at,
      items_paid: params.receipt.items_paid,
      balance_remaining: params.receipt.balance_remaining || 0,
      actions: [
        {
          type: 'download',
          label: 'Download Receipt',
          url: `https://api.peeap.com/receipts/${params.receipt.receipt_number}.pdf`,
        },
      ],
    };

    const content = `Payment received - Thank you! ${params.receipt.currency} ${params.receipt.amount_paid.toLocaleString()} paid for ${child.student_name}`;

    const { data: message, error } = await this.supabase
      .from('school_chat_messages')
      .insert({
        thread_id: activeThread.id,
        sender_type: 'school',
        sender_id: params.schoolId,
        sender_name: connection.school_name,
        sender_role: 'Finance',
        message_type: 'receipt',
        content,
        rich_content: richContent,
        status: 'sent',
      })
      .select('id')
      .single();

    if (error) {
      return { sent: false };
    }

    // Update thread
    await this.supabase
      .from('school_chat_threads')
      .update({
        last_message_preview: content.substring(0, 100),
        last_message_at: new Date().toISOString(),
        last_message_by: 'school',
        parent_unread_count: this.supabase.rpc('increment', { x: 1 }),
        updated_at: new Date().toISOString(),
      })
      .eq('id', activeThread.id);

    return {
      message_id: message?.id,
      sent: true,
    };
  }

  /**
   * Send an announcement to a class or school-wide
   */
  async sendAnnouncement(params: {
    schoolAccessToken: string;
    classId?: string;
    schoolWide?: boolean;
    title: string;
    content: string;
    eventDate?: string;
    attachments?: any[];
  }): Promise<{
    message_ids: string[];
    sent_to: number;
  }> {
    // Validate school access token
    const school = await this.validateSchoolToken(params.schoolAccessToken);
    if (!school) {
      throw new ForbiddenException('Invalid school access token');
    }

    const messageIds: string[] = [];
    let sentTo = 0;

    // Get target threads
    let query = this.supabase
      .from('school_chat_threads')
      .select('id, parent_user_id')
      .eq('school_id', school.school_id)
      .eq('status', 'active');

    if (params.classId && !params.schoolWide) {
      query = query.eq('class_id', params.classId);
    }

    const { data: threads } = await query;

    // Build rich content
    const richContent = {
      title: params.title,
      event_date: params.eventDate,
      attachments: params.attachments,
    };

    // Send to each thread
    for (const thread of threads || []) {
      const { data: message, error } = await this.supabase
        .from('school_chat_messages')
        .insert({
          thread_id: thread.id,
          sender_type: 'school',
          sender_id: school.school_id,
          sender_name: school.school_name,
          sender_role: 'Administration',
          message_type: 'announcement',
          content: params.content,
          rich_content: richContent,
          attachments: params.attachments,
          status: 'sent',
        })
        .select('id')
        .single();

      if (!error && message) {
        messageIds.push(message.id);
        sentTo++;

        // Update thread
        await this.supabase
          .from('school_chat_threads')
          .update({
            last_message_preview: `📢 ${params.title}`,
            last_message_at: new Date().toISOString(),
            last_message_by: 'school',
            parent_unread_count: this.supabase.rpc('increment', { x: 1 }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', thread.id);
      }
    }

    return {
      message_ids: messageIds,
      sent_to: sentTo,
    };
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Send a system message to a thread
   */
  private async sendSystemMessage(
    threadId: string,
    params: { content: string; messageType?: string; richContent?: any }
  ): Promise<void> {
    await this.supabase.from('school_chat_messages').insert({
      thread_id: threadId,
      sender_type: 'system',
      message_type: params.messageType || 'system',
      content: params.content,
      rich_content: params.richContent,
      status: 'sent',
    });
  }

  /**
   * Validate school access token
   */
  private async validateSchoolToken(accessToken: string): Promise<{
    school_id: string;
    school_name: string;
  } | null> {
    const { data: tokens, error } = await this.supabase
      .from('oauth_access_tokens')
      .select('*')
      .eq('access_token', accessToken)
      .is('revoked_at', null)
      .limit(1);

    if (error || !tokens || tokens.length === 0) {
      return null;
    }

    const token = tokens[0];

    // Check expiration
    if (new Date(token.expires_at) < new Date()) {
      return null;
    }

    // Get school info from the client
    const { data: client } = await this.supabase
      .from('oauth_clients')
      .select('*')
      .eq('client_id', token.client_id)
      .single();

    if (!client || client.client_type !== 'school') {
      return null;
    }

    return {
      school_id: client.metadata?.school_id || client.client_id,
      school_name: client.name || 'School',
    };
  }

  /**
   * Get unread count for a user across all threads
   */
  async getUnreadCount(peeapUserId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('school_chat_threads')
      .select('parent_unread_count')
      .eq('parent_user_id', peeapUserId)
      .eq('status', 'active');

    if (error) {
      return 0;
    }

    return (data || []).reduce((sum, t) => sum + (t.parent_unread_count || 0), 0);
  }
}
