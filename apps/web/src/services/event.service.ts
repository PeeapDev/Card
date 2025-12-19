/**
 * Event Management Service
 *
 * Handles all event-related operations with Supabase.
 * Works with IndexedDB for offline-first support.
 *
 * Features:
 * - Event CRUD operations
 * - Ticket types management
 * - Ticket purchasing and validation
 * - Event staff management (invitation-based)
 * - Ticket scanning and analytics
 */

import { supabase, supabaseAdmin } from '@/lib/supabase';

// ================== Types ==================

export type EventStatus = 'draft' | 'published' | 'cancelled' | 'completed';
export type EventStaffInvitationStatus = 'pending' | 'accepted' | 'declined';
export type EventTicketStatus = 'valid' | 'used' | 'cancelled' | 'refunded';
export type WalletTransactionType = 'ticket_sale' | 'transfer_to_staff' | 'transfer_to_main' | 'refund' | 'adjustment';
export type StaffPaymentType = 'bonus' | 'salary' | 'commission' | 'reimbursement';
export type StaffPaymentStatus = 'pending' | 'approved' | 'completed' | 'rejected';

export interface Event {
  id?: string;
  merchant_id: string;
  title: string;
  description?: string;
  category?: string;
  location?: string;
  venue_name?: string;
  address?: string;
  city?: string;
  country?: string;
  start_date: string;
  end_date: string;
  timezone?: string;
  cover_image?: string;
  status: EventStatus;
  is_free: boolean;
  capacity?: number;
  tickets_sold?: number;
  total_revenue?: number;
  min_price?: number;
  settings?: {
    require_approval?: boolean;
    allow_refunds?: boolean;
    refund_deadline_hours?: number;
    max_tickets_per_order?: number;
    show_remaining_tickets?: boolean;
  };
  created_at?: string;
  updated_at?: string;
}

export interface EventTicketType {
  id?: string;
  event_id: string;
  merchant_id: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  quantity_available: number;
  quantity_sold?: number;
  max_per_order?: number;
  sale_start_date?: string;
  sale_end_date?: string;
  is_active: boolean;
  sort_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface EventTicket {
  id?: string;
  event_id: string;
  ticket_type_id: string;
  user_id?: string;
  merchant_id: string;
  ticket_number: string;
  qr_code: string;
  status: EventTicketStatus;
  purchaser_name?: string;
  purchaser_email?: string;
  purchaser_phone?: string;
  attendee_name?: string;
  price_paid: number;
  currency?: string;
  payment_reference?: string;
  scanned_at?: string;
  scanned_by?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventStaff {
  id?: string;
  event_id: string;
  merchant_id: string;
  user_id: string;
  invitation_status: EventStaffInvitationStatus;
  wizard_completed: boolean;
  invited_at?: string;
  accepted_at?: string;
  declined_at?: string;
  scan_count?: number;
  last_scan_at?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface EventScan {
  id?: string;
  event_id: string;
  ticket_id: string;
  staff_id: string;
  scanned_at: string;
  scan_result: 'valid' | 'invalid' | 'already_used' | 'cancelled';
  ticket_number?: string;
  attendee_name?: string;
  notes?: string;
}

export interface EventAnalytics {
  total_tickets: number;
  tickets_scanned: number;
  total_revenue: number;
  tickets_by_type: Record<string, { sold: number; scanned: number; revenue: number }>;
  scans_by_staff: Record<string, { name: string; count: number }>;
  scans_by_hour: Record<string, number>;
  attendance_rate: number;
}

export interface EventWallet {
  id?: string;
  event_id: string;
  merchant_id: string;
  balance: number;
  currency: string;
  created_at?: string;
  updated_at?: string;
}

export interface EventWalletTransaction {
  id?: string;
  wallet_id: string;
  event_id: string;
  type: WalletTransactionType;
  amount: number;
  fee: number;
  net_amount: number;
  direction: 'credit' | 'debit';
  recipient_id?: string;
  recipient_wallet_id?: string;
  reference?: string;
  description?: string;
  ticket_id?: string;
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  metadata?: Record<string, any>;
  created_at?: string;
  // Joined data
  recipient?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface EventStaffPayment {
  id?: string;
  event_id: string;
  wallet_id: string;
  staff_id: string;
  amount: number;
  currency: string;
  payment_type: StaffPaymentType;
  description?: string;
  status: StaffPaymentStatus;
  approved_by?: string;
  approved_at?: string;
  transaction_id?: string;
  created_at?: string;
  updated_at?: string;
  // Joined data
  staff?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
  };
}

// ================== Event Functions ==================

export const getEvents = async (merchantId: string): Promise<Event[]> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('merchant_id', merchantId)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getEventById = async (eventId: string): Promise<Event | null> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getEventsByStatus = async (merchantId: string, status: EventStatus): Promise<Event[]> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', status)
    .order('start_date', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getUpcomingEvents = async (merchantId: string): Promise<Event[]> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('merchant_id', merchantId)
    .eq('status', 'published')
    .gte('start_date', new Date().toISOString())
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const createEvent = async (event: Partial<Event>): Promise<Event> => {
  // Use supabaseAdmin to bypass RLS - authorization is handled by the app
  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      ...event,
      status: event.status || 'draft',
      is_free: event.is_free ?? false,
      tickets_sold: 0,
      total_revenue: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEvent = async (eventId: string, updates: Partial<Event>): Promise<Event> => {
  const { data, error } = await supabaseAdmin
    .from('events')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', eventId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  // Use supabaseAdmin to bypass RLS
  const { error } = await supabaseAdmin
    .from('events')
    .delete()
    .eq('id', eventId);

  if (error) throw error;
};

export const publishEvent = async (eventId: string): Promise<Event> => {
  return updateEvent(eventId, { status: 'published' });
};

export const cancelEvent = async (eventId: string): Promise<Event> => {
  return updateEvent(eventId, { status: 'cancelled' });
};

export const completeEvent = async (eventId: string): Promise<Event> => {
  return updateEvent(eventId, { status: 'completed' });
};

export const getPublishedEvents = async (): Promise<Event[]> => {
  // Use supabaseAdmin to bypass RLS for public event discovery
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('status', 'published')
    .gte('end_date', new Date().toISOString())
    .order('start_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getPublishedEventById = async (eventId: string): Promise<Event | null> => {
  // Use supabaseAdmin to bypass RLS for public event viewing
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', eventId)
    .eq('status', 'published')
    .maybeSingle();

  if (error) throw error;
  return data;
};

// ================== Ticket Type Functions ==================

export const getEventTicketTypes = async (eventId: string): Promise<EventTicketType[]> => {
  // Use supabaseAdmin to bypass RLS - needed for public ticket purchasing
  const { data, error } = await supabaseAdmin
    .from('event_ticket_types')
    .select('*')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
};

export const getEventTicketTypeById = async (ticketTypeId: string): Promise<EventTicketType | null> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_ticket_types')
    .select('*')
    .eq('id', ticketTypeId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const createEventTicketType = async (ticketType: Partial<EventTicketType>): Promise<EventTicketType> => {
  const { data, error } = await supabaseAdmin
    .from('event_ticket_types')
    .insert({
      ...ticketType,
      quantity_sold: 0,
      is_active: ticketType.is_active ?? true,
      currency: ticketType.currency || 'SLE',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEventTicketType = async (ticketTypeId: string, updates: Partial<EventTicketType>): Promise<EventTicketType> => {
  const { data, error } = await supabaseAdmin
    .from('event_ticket_types')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', ticketTypeId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const deleteEventTicketType = async (ticketTypeId: string): Promise<void> => {
  // Use supabaseAdmin to bypass RLS
  const { error } = await supabaseAdmin
    .from('event_ticket_types')
    .delete()
    .eq('id', ticketTypeId);

  if (error) throw error;
};

// ================== Ticket Functions ==================

export const getEventTickets = async (eventId: string): Promise<EventTicket[]> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_tickets')
    .select('*')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getEventTicketById = async (ticketId: string): Promise<EventTicket | null> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_tickets')
    .select('*')
    .eq('id', ticketId)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getEventTicketByQRCode = async (qrCode: string): Promise<EventTicket | null> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_tickets')
    .select('*')
    .eq('qr_code', qrCode)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getEventTicketByNumber = async (ticketNumber: string): Promise<EventTicket | null> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_tickets')
    .select('*')
    .eq('ticket_number', ticketNumber)
    .maybeSingle();

  if (error) throw error;
  return data;
};

export const getUserEventTickets = async (userId: string): Promise<EventTicket[]> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_tickets')
    .select('*, events(*), event_ticket_types(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createEventTicket = async (ticket: Partial<EventTicket>): Promise<EventTicket> => {
  // Generate unique ticket number and QR code
  const ticketNumber = `TKT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const qrCode = `PEEAP-EVT-${ticket.event_id}-${ticketNumber}`;

  const { data, error } = await supabaseAdmin
    .from('event_tickets')
    .insert({
      ...ticket,
      ticket_number: ticketNumber,
      qr_code: qrCode,
      status: 'valid',
      currency: ticket.currency || 'SLE',
    })
    .select()
    .single();

  if (error) throw error;

  // Update ticket type quantity sold
  if (ticket.ticket_type_id) {
    await supabaseAdmin.rpc('increment_ticket_type_sold', { ticket_type_id: ticket.ticket_type_id });
  }

  // Update event tickets sold and revenue
  if (ticket.event_id) {
    await supabaseAdmin.rpc('update_event_ticket_stats', {
      p_event_id: ticket.event_id,
      p_price: ticket.price_paid || 0,
    });
  }

  return data;
};

export const updateEventTicketStatus = async (
  ticketId: string,
  status: EventTicketStatus,
  scannedBy?: string
): Promise<EventTicket> => {
  const updates: Partial<EventTicket> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'used' && scannedBy) {
    updates.scanned_at = new Date().toISOString();
    updates.scanned_by = scannedBy;
  }

  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_tickets')
    .update(updates)
    .eq('id', ticketId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ================== Event Staff Functions ==================

export const getEventStaff = async (eventId: string): Promise<EventStaff[]> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .select('*, users!user_id(id, first_name, last_name, email, phone)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getEventStaffById = async (staffId: string): Promise<EventStaff | null> => {
  // Use supabaseAdmin to bypass RLS
  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .select('*, users!user_id(id, first_name, last_name, email, phone), events(*)')
    .eq('id', staffId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

export const getEventStaffByUserId = async (userId: string): Promise<EventStaff[]> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .select('*, events(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getAcceptedEventStaffForUser = async (userId: string): Promise<EventStaff[]> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .select('*, events(*)')
    .eq('user_id', userId)
    .eq('invitation_status', 'accepted')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getActiveEventStaffForUser = async (userId: string): Promise<EventStaff[]> => {
  // Get accepted staff for events that are happening now or today
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .select('*, events!inner(*)')
    .eq('user_id', userId)
    .eq('invitation_status', 'accepted')
    .eq('is_active', true)
    .gte('events.end_date', startOfDay)
    .lte('events.start_date', endOfDay);

  if (error) throw error;
  return data || [];
};

export const inviteEventStaff = async (
  eventId: string,
  merchantId: string,
  userId: string
): Promise<EventStaff> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .insert({
      event_id: eventId,
      merchant_id: merchantId,
      user_id: userId,
      invitation_status: 'pending',
      wizard_completed: false,
      is_active: true,
      invited_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const acceptEventStaffInvitation = async (staffId: string): Promise<EventStaff> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .update({
      invitation_status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const declineEventStaffInvitation = async (staffId: string): Promise<EventStaff> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .update({
      invitation_status: 'declined',
      declined_at: new Date().toISOString(),
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const updateEventStaffWizardCompleted = async (staffId: string): Promise<EventStaff> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff')
    .update({
      wizard_completed: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const removeEventStaff = async (staffId: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('event_staff')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', staffId);

  if (error) throw error;
};

export const deleteEventStaff = async (staffId: string): Promise<void> => {
  const { error } = await supabaseAdmin
    .from('event_staff')
    .delete()
    .eq('id', staffId);

  if (error) throw error;
};

// ================== Scan Functions ==================

export const scanTicket = async (
  qrCode: string,
  staffId: string,
  eventId: string
): Promise<{ success: boolean; ticket?: EventTicket; scan?: EventScan; message: string }> => {
  // Find the ticket
  const ticket = await getEventTicketByQRCode(qrCode);

  if (!ticket) {
    // Log invalid scan
    await createEventScan({
      event_id: eventId,
      ticket_id: '',
      staff_id: staffId,
      scan_result: 'invalid',
      scanned_at: new Date().toISOString(),
    });
    return { success: false, message: 'Invalid ticket - not found' };
  }

  // Check if ticket belongs to this event
  if (ticket.event_id !== eventId) {
    await createEventScan({
      event_id: eventId,
      ticket_id: ticket.id!,
      staff_id: staffId,
      scan_result: 'invalid',
      ticket_number: ticket.ticket_number,
      attendee_name: ticket.attendee_name,
      scanned_at: new Date().toISOString(),
    });
    return { success: false, message: 'Ticket is for a different event' };
  }

  // Check ticket status
  if (ticket.status === 'used') {
    await createEventScan({
      event_id: eventId,
      ticket_id: ticket.id!,
      staff_id: staffId,
      scan_result: 'already_used',
      ticket_number: ticket.ticket_number,
      attendee_name: ticket.attendee_name,
      scanned_at: new Date().toISOString(),
    });
    return {
      success: false,
      ticket,
      message: `Ticket already used at ${ticket.scanned_at}`,
    };
  }

  if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
    await createEventScan({
      event_id: eventId,
      ticket_id: ticket.id!,
      staff_id: staffId,
      scan_result: 'cancelled',
      ticket_number: ticket.ticket_number,
      attendee_name: ticket.attendee_name,
      scanned_at: new Date().toISOString(),
    });
    return { success: false, ticket, message: `Ticket is ${ticket.status}` };
  }

  // Valid ticket - mark as used
  const updatedTicket = await updateEventTicketStatus(ticket.id!, 'used', staffId);

  // Log successful scan
  const scan = await createEventScan({
    event_id: eventId,
    ticket_id: ticket.id!,
    staff_id: staffId,
    scan_result: 'valid',
    ticket_number: ticket.ticket_number,
    attendee_name: ticket.attendee_name,
    scanned_at: new Date().toISOString(),
  });

  // Update staff scan count
  await incrementStaffScanCount(staffId);

  return {
    success: true,
    ticket: updatedTicket,
    scan,
    message: 'Ticket valid - welcome!',
  };
};

export const createEventScan = async (scan: Partial<EventScan>): Promise<EventScan> => {
  const { data, error } = await supabaseAdmin
    .from('event_scans')
    .insert({
      ...scan,
      scanned_at: scan.scanned_at || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const getEventScans = async (eventId: string): Promise<EventScan[]> => {
  const { data, error } = await supabaseAdmin
    .from('event_scans')
    .select('*, event_staff(*, users!user_id(first_name, last_name))')
    .eq('event_id', eventId)
    .order('scanned_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getEventScansByStaff = async (staffId: string): Promise<EventScan[]> => {
  const { data, error } = await supabaseAdmin
    .from('event_scans')
    .select('*')
    .eq('staff_id', staffId)
    .order('scanned_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const incrementStaffScanCount = async (staffId: string): Promise<void> => {
  const { error } = await supabaseAdmin.rpc('increment_event_staff_scan_count', { staff_id: staffId });
  if (error) {
    // Fallback to manual update if RPC doesn't exist
    const staff = await getEventStaffById(staffId);
    if (staff) {
      await supabaseAdmin
        .from('event_staff')
        .update({
          scan_count: (staff.scan_count || 0) + 1,
          last_scan_at: new Date().toISOString(),
        })
        .eq('id', staffId);
    }
  }
};

// ================== Analytics Functions ==================

export const getEventAnalytics = async (eventId: string): Promise<EventAnalytics> => {
  const [tickets, scans, ticketTypes, staff] = await Promise.all([
    getEventTickets(eventId),
    getEventScans(eventId),
    getEventTicketTypes(eventId),
    getEventStaff(eventId),
  ]);

  const ticketsByType: Record<string, { sold: number; scanned: number; revenue: number }> = {};
  ticketTypes.forEach(type => {
    ticketsByType[type.id!] = { sold: 0, scanned: 0, revenue: 0 };
  });

  let totalRevenue = 0;
  tickets.forEach(ticket => {
    if (ticketsByType[ticket.ticket_type_id]) {
      ticketsByType[ticket.ticket_type_id].sold++;
      ticketsByType[ticket.ticket_type_id].revenue += ticket.price_paid;
      if (ticket.status === 'used') {
        ticketsByType[ticket.ticket_type_id].scanned++;
      }
    }
    totalRevenue += ticket.price_paid;
  });

  const scansByStaff: Record<string, { name: string; count: number }> = {};
  staff.forEach(s => {
    const userData = (s as any).users;
    const name = userData ? `${userData.first_name} ${userData.last_name}` : 'Unknown';
    scansByStaff[s.id!] = { name, count: s.scan_count || 0 };
  });

  const scansByHour: Record<string, number> = {};
  scans.forEach(scan => {
    const hour = new Date(scan.scanned_at).toISOString().slice(0, 13);
    scansByHour[hour] = (scansByHour[hour] || 0) + 1;
  });

  const totalTickets = tickets.length;
  const ticketsScanned = tickets.filter(t => t.status === 'used').length;

  return {
    total_tickets: totalTickets,
    tickets_scanned: ticketsScanned,
    total_revenue: totalRevenue,
    tickets_by_type: ticketsByType,
    scans_by_staff: scansByStaff,
    scans_by_hour: scansByHour,
    attendance_rate: totalTickets > 0 ? (ticketsScanned / totalTickets) * 100 : 0,
  };
};

// ================== Wallet Functions ==================

export const getEventWallet = async (eventId: string): Promise<EventWallet | null> => {
  const { data, error } = await supabaseAdmin
    .from('event_wallets')
    .select('*')
    .eq('event_id', eventId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
};

export const getEventWalletTransactions = async (
  walletId: string,
  limit: number = 50
): Promise<EventWalletTransaction[]> => {
  const { data, error } = await supabaseAdmin
    .from('event_wallet_transactions')
    .select('*, recipient:users!recipient_id(id, first_name, last_name, email)')
    .eq('wallet_id', walletId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data || [];
};

export const getEventWalletTransactionsByType = async (
  walletId: string,
  type: WalletTransactionType
): Promise<EventWalletTransaction[]> => {
  const { data, error } = await supabaseAdmin
    .from('event_wallet_transactions')
    .select('*, recipient:users!recipient_id(id, first_name, last_name, email)')
    .eq('wallet_id', walletId)
    .eq('type', type)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const transferToStaff = async (
  walletId: string,
  eventId: string,
  staffUserId: string,
  amount: number,
  description?: string
): Promise<{ success: boolean; transaction?: EventWalletTransaction; message: string }> => {
  // Get wallet to check balance
  const { data: wallet, error: walletError } = await supabaseAdmin
    .from('event_wallets')
    .select('*')
    .eq('id', walletId)
    .single();

  if (walletError || !wallet) {
    return { success: false, message: 'Wallet not found' };
  }

  if (wallet.balance < amount) {
    return { success: false, message: 'Insufficient balance' };
  }

  // Get staff user details
  const { data: staffUser, error: staffError } = await supabaseAdmin
    .from('users')
    .select('id, first_name, last_name, email')
    .eq('id', staffUserId)
    .single();

  if (staffError || !staffUser) {
    return { success: false, message: 'Staff user not found' };
  }

  // Deduct from wallet
  const { error: updateError } = await supabaseAdmin
    .from('event_wallets')
    .update({
      balance: wallet.balance - amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId);

  if (updateError) {
    return { success: false, message: 'Failed to update wallet balance' };
  }

  // Create transaction record
  const reference = `STAFF-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('event_wallet_transactions')
    .insert({
      wallet_id: walletId,
      event_id: eventId,
      type: 'transfer_to_staff',
      amount: amount,
      fee: 0,
      net_amount: amount,
      direction: 'debit',
      recipient_id: staffUserId,
      reference,
      description: description || `Payment to ${staffUser.first_name} ${staffUser.last_name}`,
      status: 'completed',
    })
    .select()
    .single();

  if (txError) {
    // Rollback wallet balance
    await supabaseAdmin
      .from('event_wallets')
      .update({ balance: wallet.balance })
      .eq('id', walletId);
    return { success: false, message: 'Failed to create transaction' };
  }

  // Credit to user's main wallet
  const { error: creditError } = await supabaseAdmin.rpc('credit_user_wallet', {
    p_user_id: staffUserId,
    p_amount: amount,
    p_currency: wallet.currency,
    p_description: `Event payment: ${description || 'Staff payment'}`,
    p_reference: reference,
  });

  // Note: If RPC doesn't exist, the funds are still deducted from event wallet
  // but staff would need to claim them manually or admin would handle it
  if (creditError) {
    console.warn('Could not auto-credit staff wallet:', creditError);
  }

  return {
    success: true,
    transaction,
    message: `Successfully transferred ${amount} ${wallet.currency} to ${staffUser.first_name}`,
  };
};

export const transferToMainWallet = async (
  walletId: string,
  eventId: string,
  merchantId: string,
  amount: number,
  description?: string
): Promise<{ success: boolean; transaction?: EventWalletTransaction; message: string }> => {
  // Get wallet to check balance
  const { data: wallet, error: walletError } = await supabaseAdmin
    .from('event_wallets')
    .select('*')
    .eq('id', walletId)
    .single();

  if (walletError || !wallet) {
    return { success: false, message: 'Wallet not found' };
  }

  if (wallet.balance < amount) {
    return { success: false, message: 'Insufficient balance' };
  }

  // Deduct from event wallet
  const { error: updateError } = await supabaseAdmin
    .from('event_wallets')
    .update({
      balance: wallet.balance - amount,
      updated_at: new Date().toISOString(),
    })
    .eq('id', walletId);

  if (updateError) {
    return { success: false, message: 'Failed to update wallet balance' };
  }

  // Create transaction record
  const reference = `MAIN-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const { data: transaction, error: txError } = await supabaseAdmin
    .from('event_wallet_transactions')
    .insert({
      wallet_id: walletId,
      event_id: eventId,
      type: 'transfer_to_main',
      amount: amount,
      fee: 0,
      net_amount: amount,
      direction: 'debit',
      recipient_id: merchantId,
      reference,
      description: description || 'Transfer to main wallet',
      status: 'completed',
    })
    .select()
    .single();

  if (txError) {
    // Rollback wallet balance
    await supabaseAdmin
      .from('event_wallets')
      .update({ balance: wallet.balance })
      .eq('id', walletId);
    return { success: false, message: 'Failed to create transaction' };
  }

  // Credit to merchant's main wallet
  const { error: creditError } = await supabaseAdmin.rpc('credit_user_wallet', {
    p_user_id: merchantId,
    p_amount: amount,
    p_currency: wallet.currency,
    p_description: description || 'Event revenue withdrawal',
    p_reference: reference,
  });

  if (creditError) {
    console.warn('Could not auto-credit main wallet:', creditError);
  }

  return {
    success: true,
    transaction,
    message: `Successfully transferred ${amount} ${wallet.currency} to main wallet`,
  };
};

// ================== Staff Payment Request Functions ==================

export const getStaffPayments = async (eventId: string): Promise<EventStaffPayment[]> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff_payments')
    .select('*, staff:users!staff_id(id, first_name, last_name, email, phone)')
    .eq('event_id', eventId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const getStaffPaymentsByStatus = async (
  eventId: string,
  status: StaffPaymentStatus
): Promise<EventStaffPayment[]> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff_payments')
    .select('*, staff:users!staff_id(id, first_name, last_name, email, phone)')
    .eq('event_id', eventId)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

export const createStaffPaymentRequest = async (
  payment: Partial<EventStaffPayment>
): Promise<EventStaffPayment> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff_payments')
    .insert({
      ...payment,
      status: 'pending',
      currency: payment.currency || 'SLE',
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

export const approveStaffPayment = async (
  paymentId: string,
  approverId: string
): Promise<{ success: boolean; payment?: EventStaffPayment; message: string }> => {
  // Get payment details
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('event_staff_payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (paymentError || !payment) {
    return { success: false, message: 'Payment request not found' };
  }

  if (payment.status !== 'pending') {
    return { success: false, message: 'Payment is not pending' };
  }

  // Process the transfer
  const transferResult = await transferToStaff(
    payment.wallet_id,
    payment.event_id,
    payment.staff_id,
    payment.amount,
    payment.description
  );

  if (!transferResult.success) {
    return { success: false, message: transferResult.message };
  }

  // Update payment status
  const { data: updatedPayment, error: updateError } = await supabaseAdmin
    .from('event_staff_payments')
    .update({
      status: 'completed',
      approved_by: approverId,
      approved_at: new Date().toISOString(),
      transaction_id: transferResult.transaction?.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (updateError) {
    return { success: false, message: 'Failed to update payment status' };
  }

  return {
    success: true,
    payment: updatedPayment,
    message: 'Payment approved and processed successfully',
  };
};

export const rejectStaffPayment = async (
  paymentId: string,
  rejectedBy: string
): Promise<EventStaffPayment> => {
  const { data, error } = await supabaseAdmin
    .from('event_staff_payments')
    .update({
      status: 'rejected',
      approved_by: rejectedBy,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', paymentId)
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ================== Settings Types & Functions ==================

export interface EventsSettings {
  id?: string;
  merchant_id: string;
  business_name?: string;
  default_currency?: string;
  allow_refunds?: boolean;
  refund_deadline_hours?: number;
  max_tickets_per_order?: number;
  setup_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export const isEventsSetupCompleted = async (merchantId: string): Promise<boolean> => {
  const { data, error } = await supabaseAdmin
    .from('events_settings')
    .select('setup_completed')
    .eq('merchant_id', merchantId)
    .single();

  if (error || !data) return false;
  return data.setup_completed === true;
};

export const getEventsSettings = async (merchantId: string): Promise<EventsSettings | null> => {
  const { data, error } = await supabaseAdmin
    .from('events_settings')
    .select('*')
    .eq('merchant_id', merchantId)
    .single();

  if (error) return null;
  return data;
};

export const saveEventsSettings = async (
  settings: Partial<EventsSettings> & { merchant_id: string }
): Promise<EventsSettings | null> => {
  const { data, error } = await supabaseAdmin
    .from('events_settings')
    .upsert(
      { ...settings, updated_at: new Date().toISOString() },
      { onConflict: 'merchant_id' }
    )
    .select()
    .single();

  if (error) throw error;
  return data;
};

// ================== Export Service ==================

export const eventService = {
  // Events
  getEvents,
  getEventById,
  getEventsByStatus,
  getUpcomingEvents,
  getPublishedEvents,
  getPublishedEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  publishEvent,
  cancelEvent,
  completeEvent,
  // Ticket Types
  getEventTicketTypes,
  getEventTicketTypeById,
  createEventTicketType,
  updateEventTicketType,
  deleteEventTicketType,
  // Tickets
  getEventTickets,
  getEventTicketById,
  getEventTicketByQRCode,
  getEventTicketByNumber,
  getUserEventTickets,
  createEventTicket,
  updateEventTicketStatus,
  // Staff
  getEventStaff,
  getEventStaffById,
  getEventStaffByUserId,
  getAcceptedEventStaffForUser,
  getActiveEventStaffForUser,
  inviteEventStaff,
  acceptEventStaffInvitation,
  declineEventStaffInvitation,
  updateEventStaffWizardCompleted,
  removeEventStaff,
  deleteEventStaff,
  // Scanning
  scanTicket,
  createEventScan,
  getEventScans,
  getEventScansByStaff,
  // Analytics
  getEventAnalytics,
  // Wallet
  getEventWallet,
  getEventWalletTransactions,
  getEventWalletTransactionsByType,
  transferToStaff,
  transferToMainWallet,
  // Staff Payments
  getStaffPayments,
  getStaffPaymentsByStatus,
  createStaffPaymentRequest,
  approveStaffPayment,
  rejectStaffPayment,
  // Settings
  isEventsSetupCompleted,
  getEventsSettings,
  saveEventsSettings,
};

export default eventService;
