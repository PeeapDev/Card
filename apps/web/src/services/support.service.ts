/**
 * Support Tickets Service
 *
 * Handles support ticket CRUD operations with Supabase
 */

import { supabase } from '@/lib/supabase';

export interface SupportTicket {
  id: string;
  user_id: string;
  merchant_id?: string;
  subject: string;
  message: string;
  category: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  assigned_to?: string;
  // Joined fields
  user_email?: string;
  user_name?: string;
  merchant_name?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff_reply: boolean;
  created_at: string;
  // Joined fields
  user_name?: string;
}

export interface CreateTicketRequest {
  subject: string;
  message: string;
  category: string;
  priority?: 'low' | 'medium' | 'high';
}

class SupportService {
  /**
   * Create a new support ticket
   */
  async createTicket(data: CreateTicketRequest, userId: string, merchantId?: string): Promise<SupportTicket> {
    const { data: ticket, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        merchant_id: merchantId,
        subject: data.subject,
        message: data.message,
        category: data.category,
        priority: data.priority || 'medium',
        status: 'open',
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return ticket;
  }

  /**
   * Get tickets for a user (merchant view)
   */
  async getUserTickets(userId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Get tickets for a merchant
   */
  async getMerchantTickets(merchantId: string): Promise<SupportTicket[]> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('merchant_id', merchantId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return data || [];
  }

  /**
   * Get all tickets (admin view)
   */
  async getAllTickets(filters?: {
    status?: string;
    priority?: string;
    search?: string;
  }): Promise<SupportTicket[]> {
    let query = supabase
      .from('support_tickets')
      .select(`
        *,
        users:user_id (email, first_name, last_name),
        merchant_businesses:merchant_id (business_name)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.priority) {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    // Transform the data to flatten joined fields
    return (data || []).map((ticket: Record<string, unknown>) => ({
      ...ticket,
      user_email: (ticket.users as Record<string, string>)?.email,
      user_name: `${(ticket.users as Record<string, string>)?.first_name || ''} ${(ticket.users as Record<string, string>)?.last_name || ''}`.trim(),
      merchant_name: (ticket.merchant_businesses as Record<string, string>)?.business_name,
    })) as SupportTicket[];
  }

  /**
   * Get a single ticket by ID
   */
  async getTicket(ticketId: string): Promise<SupportTicket | null> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select(`
        *,
        users:user_id (email, first_name, last_name),
        merchant_businesses:merchant_id (business_name)
      `)
      .eq('id', ticketId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }

    return data as SupportTicket;
  }

  /**
   * Update ticket status
   */
  async updateTicketStatus(ticketId: string, status: SupportTicket['status']): Promise<SupportTicket> {
    const updateData: Record<string, unknown> = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'resolved') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .update(updateData)
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Update ticket priority
   */
  async updateTicketPriority(ticketId: string, priority: SupportTicket['priority']): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        priority,
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Assign ticket to admin
   */
  async assignTicket(ticketId: string, adminId: string): Promise<SupportTicket> {
    const { data, error } = await supabase
      .from('support_tickets')
      .update({
        assigned_to: adminId,
        status: 'in_progress',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * Get messages for a ticket
   */
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .select(`
        *,
        users:user_id (first_name, last_name)
      `)
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return (data || []).map((msg: Record<string, unknown>) => ({
      ...msg,
      user_name: `${(msg.users as Record<string, string>)?.first_name || ''} ${(msg.users as Record<string, string>)?.last_name || ''}`.trim() || 'Support',
    })) as TicketMessage[];
  }

  /**
   * Add a message to a ticket
   */
  async addMessage(ticketId: string, userId: string, message: string, isStaffReply: boolean = false): Promise<TicketMessage> {
    const { data, error } = await supabase
      .from('support_ticket_messages')
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        message,
        is_staff_reply: isStaffReply,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    // Update ticket's updated_at
    await supabase
      .from('support_tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', ticketId);

    return data;
  }

  /**
   * Get ticket statistics (admin)
   */
  async getTicketStats(): Promise<{
    total: number;
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
    high_priority: number;
  }> {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('status, priority');

    if (error) {
      throw new Error(error.message);
    }

    const tickets = data || [];
    return {
      total: tickets.length,
      open: tickets.filter(t => t.status === 'open').length,
      in_progress: tickets.filter(t => t.status === 'in_progress').length,
      resolved: tickets.filter(t => t.status === 'resolved').length,
      closed: tickets.filter(t => t.status === 'closed').length,
      high_priority: tickets.filter(t => t.priority === 'high').length,
    };
  }
}

export const supportService = new SupportService();
