/**
 * useEventSync Hook
 *
 * Manages online/offline status and data synchronization for Event Management.
 * Follows the IndexedDB-first pattern for offline support.
 *
 * Features:
 * - Events CRUD with offline support
 * - Ticket types management
 * - Ticket purchasing and scanning
 * - Event staff management
 * - Analytics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import indexedDBService, {
  OfflineEvent,
  OfflineEventTicketType,
  OfflineEventTicket,
  OfflineEventStaff,
  OfflineEventScan,
  EventStatus,
  EventTicketStatus,
} from '@/services/indexeddb.service';
import eventService, {
  Event,
  EventTicketType,
  EventTicket,
  EventStaff,
  EventScan,
  EventAnalytics,
} from '@/services/event.service';

interface EventSyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: string | null;
  pendingChangesCount: number;
}

export function useEventSync(merchantId: string | undefined) {
  const [syncStatus, setSyncStatus] = useState<EventSyncStatus>({
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSyncTime: null,
    pendingChangesCount: 0,
  });

  const syncInProgress = useRef(false);

  // Update online status
  useEffect(() => {
    const handleOnline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: true }));
      if (merchantId) {
        syncData();
      }
    };

    const handleOffline = () => {
      setSyncStatus(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [merchantId]);

  // Sync all event data from server to IndexedDB
  const syncFromServer = useCallback(async () => {
    if (!merchantId || !navigator.onLine) return;

    try {
      const events = await eventService.getEvents(merchantId);
      await indexedDBService.saveEvents(events as OfflineEvent[], merchantId);

      // Sync ticket types for each event
      for (const event of events) {
        if (event.id) {
          const ticketTypes = await eventService.getEventTicketTypes(event.id);
          await indexedDBService.saveEventTicketTypes(ticketTypes as OfflineEventTicketType[], event.id);

          const tickets = await eventService.getEventTickets(event.id);
          await indexedDBService.saveEventTickets(tickets as OfflineEventTicket[], event.id);

          const staff = await eventService.getEventStaff(event.id);
          await indexedDBService.saveEventStaffList(staff as OfflineEventStaff[], event.id);

          const scans = await eventService.getEventScans(event.id);
          await indexedDBService.saveEventScans(scans as OfflineEventScan[], event.id);
        }
      }

      await indexedDBService.saveSetting(`events_last_sync_${merchantId}`, new Date().toISOString());

      setSyncStatus(prev => ({
        ...prev,
        lastSyncTime: new Date().toISOString(),
      }));

      return events;
    } catch (error) {
      console.error('Error syncing events from server:', error);
      throw error;
    }
  }, [merchantId]);

  // Sync pending changes to server
  const syncPendingChanges = useCallback(async () => {
    if (!merchantId || !navigator.onLine) return;

    try {
      // Get all events with pending_sync flag
      const events = await indexedDBService.getEvents(merchantId);
      const pendingEvents = events.filter(e => e.pending_sync);

      for (const event of pendingEvents) {
        try {
          if (event.id?.startsWith('offline_')) {
            // New offline event - create on server
            const serverEvent = await eventService.createEvent({
              ...event,
              id: undefined,
            });
            // Update local with server ID
            await indexedDBService.deleteEvent(event.id);
            await indexedDBService.saveEvent({ ...serverEvent as OfflineEvent, pending_sync: false });
          } else {
            // Existing event - update on server
            await eventService.updateEvent(event.id!, event);
            await indexedDBService.saveEvent({ ...event, pending_sync: false });
          }
        } catch (error) {
          console.error(`Failed to sync event ${event.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Error syncing pending changes:', error);
    }
  }, [merchantId]);

  // Full sync
  const syncData = useCallback(async () => {
    if (!merchantId || syncInProgress.current) return;

    syncInProgress.current = true;
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));

    try {
      await syncPendingChanges();
      await syncFromServer();
    } catch (error) {
      console.error('Event sync failed:', error);
    } finally {
      syncInProgress.current = false;
      setSyncStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [merchantId, syncFromServer, syncPendingChanges]);

  // ================== Event Functions (offline-first) ==================

  const getEvents = useCallback(async (): Promise<OfflineEvent[]> => {
    if (!merchantId) return [];

    if (navigator.onLine) {
      try {
        const events = await eventService.getEvents(merchantId);
        await indexedDBService.saveEvents(events as OfflineEvent[], merchantId);
        return events as OfflineEvent[];
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getEvents(merchantId);
  }, [merchantId]);

  const getEventById = useCallback(async (eventId: string): Promise<OfflineEvent | null> => {
    if (navigator.onLine) {
      try {
        const event = await eventService.getEventById(eventId);
        if (event) {
          await indexedDBService.saveEvent(event as OfflineEvent);
        }
        return event as OfflineEvent | null;
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return (await indexedDBService.getEventById(eventId)) || null;
  }, []);

  const getEventsByStatus = useCallback(async (status: EventStatus): Promise<OfflineEvent[]> => {
    if (!merchantId) return [];

    if (navigator.onLine) {
      try {
        const events = await eventService.getEventsByStatus(merchantId, status);
        return events as OfflineEvent[];
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getEventsByStatus(merchantId, status);
  }, [merchantId]);

  const createEvent = useCallback(async (eventData: Partial<Event>): Promise<OfflineEvent> => {
    if (!merchantId) throw new Error('Merchant ID required');

    if (navigator.onLine) {
      try {
        const event = await eventService.createEvent({ ...eventData, merchant_id: merchantId });
        await indexedDBService.saveEvent({ ...event as OfflineEvent, pending_sync: false });
        return event as OfflineEvent;
      } catch (error) {
        console.warn('Server create failed, saving offline:', error);
      }
    }

    // Save offline with temp ID
    const offlineEvent: OfflineEvent = {
      ...eventData as OfflineEvent,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      merchant_id: merchantId,
      status: eventData.status || 'draft',
      is_free: eventData.is_free ?? false,
      tickets_sold: 0,
      total_revenue: 0,
      created_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveEvent(offlineEvent);
    return offlineEvent;
  }, [merchantId]);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>): Promise<OfflineEvent> => {
    if (navigator.onLine) {
      try {
        const event = await eventService.updateEvent(eventId, updates);
        await indexedDBService.saveEvent({ ...event as OfflineEvent, pending_sync: false });
        return event as OfflineEvent;
      } catch (error) {
        console.warn('Server update failed, saving offline:', error);
      }
    }

    const existingEvent = await indexedDBService.getEventById(eventId);
    const updatedEvent: OfflineEvent = {
      ...existingEvent!,
      ...updates,
      updated_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveEvent(updatedEvent);
    return updatedEvent;
  }, []);

  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    if (navigator.onLine) {
      try {
        await eventService.deleteEvent(eventId);
        await indexedDBService.deleteEvent(eventId);
        return;
      } catch (error) {
        console.warn('Server delete failed:', error);
      }
    }

    // Queue for deletion when back online
    await indexedDBService.addToSyncQueue({
      type: 'DELETE_EVENT',
      data: { eventId },
      endpoint: `/api/events/${eventId}`,
      method: 'DELETE',
    });
    await indexedDBService.deleteEvent(eventId);
  }, []);

  // ================== Ticket Type Functions ==================

  const getEventTicketTypes = useCallback(async (eventId: string): Promise<OfflineEventTicketType[]> => {
    if (navigator.onLine) {
      try {
        const types = await eventService.getEventTicketTypes(eventId);
        await indexedDBService.saveEventTicketTypes(types as OfflineEventTicketType[], eventId);
        return types as OfflineEventTicketType[];
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getEventTicketTypes(eventId);
  }, []);

  const createEventTicketType = useCallback(async (ticketType: Partial<EventTicketType>): Promise<OfflineEventTicketType> => {
    if (!merchantId) throw new Error('Merchant ID required');

    if (navigator.onLine) {
      try {
        const type = await eventService.createEventTicketType({ ...ticketType, merchant_id: merchantId });
        await indexedDBService.saveEventTicketType({ ...type as OfflineEventTicketType, pending_sync: false });
        return type as OfflineEventTicketType;
      } catch (error) {
        console.warn('Server create failed, saving offline:', error);
      }
    }

    const offlineType: OfflineEventTicketType = {
      ...ticketType as OfflineEventTicketType,
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      merchant_id: merchantId,
      quantity_sold: 0,
      is_active: ticketType.is_active ?? true,
      currency: ticketType.currency || 'SLE',
      created_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveEventTicketType(offlineType);
    return offlineType;
  }, [merchantId]);

  const updateEventTicketType = useCallback(async (ticketTypeId: string, updates: Partial<EventTicketType>): Promise<OfflineEventTicketType> => {
    if (navigator.onLine) {
      try {
        const type = await eventService.updateEventTicketType(ticketTypeId, updates);
        await indexedDBService.saveEventTicketType({ ...type as OfflineEventTicketType, pending_sync: false });
        return type as OfflineEventTicketType;
      } catch (error) {
        console.warn('Server update failed, saving offline:', error);
      }
    }

    const existingType = await indexedDBService.getEventTicketTypeById(ticketTypeId);
    const updatedType: OfflineEventTicketType = {
      ...existingType!,
      ...updates,
      updated_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveEventTicketType(updatedType);
    return updatedType;
  }, []);

  // ================== Ticket Functions ==================

  const getEventTickets = useCallback(async (eventId: string): Promise<OfflineEventTicket[]> => {
    if (navigator.onLine) {
      try {
        const tickets = await eventService.getEventTickets(eventId);
        await indexedDBService.saveEventTickets(tickets as OfflineEventTicket[], eventId);
        return tickets as OfflineEventTicket[];
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getEventTickets(eventId);
  }, []);

  const getEventTicketByQRCode = useCallback(async (qrCode: string): Promise<OfflineEventTicket | null> => {
    if (navigator.onLine) {
      try {
        const ticket = await eventService.getEventTicketByQRCode(qrCode);
        if (ticket) {
          await indexedDBService.saveEventTicket(ticket as OfflineEventTicket);
        }
        return ticket as OfflineEventTicket | null;
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return (await indexedDBService.getEventTicketByQRCode(qrCode)) || null;
  }, []);

  // ================== Staff Functions ==================

  const getEventStaff = useCallback(async (eventId: string): Promise<OfflineEventStaff[]> => {
    if (navigator.onLine) {
      try {
        const staff = await eventService.getEventStaff(eventId);
        await indexedDBService.saveEventStaffList(staff as OfflineEventStaff[], eventId);
        return staff as OfflineEventStaff[];
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getEventStaff(eventId);
  }, []);

  const getAcceptedEventStaffForUser = useCallback(async (userId: string): Promise<OfflineEventStaff[]> => {
    if (navigator.onLine) {
      try {
        const staff = await eventService.getAcceptedEventStaffForUser(userId);
        return staff as OfflineEventStaff[];
      } catch (error) {
        console.warn('Server fetch failed, using offline data:', error);
      }
    }

    return indexedDBService.getAcceptedEventStaffForUser(userId);
  }, []);

  const inviteEventStaff = useCallback(async (eventId: string, userId: string): Promise<OfflineEventStaff> => {
    if (!merchantId) throw new Error('Merchant ID required');

    if (navigator.onLine) {
      try {
        const staff = await eventService.inviteEventStaff(eventId, merchantId, userId);
        await indexedDBService.saveEventStaffMember({ ...staff as OfflineEventStaff, pending_sync: false });
        return staff as OfflineEventStaff;
      } catch (error) {
        console.warn('Server invite failed, saving offline:', error);
      }
    }

    const offlineStaff: OfflineEventStaff = {
      id: `offline_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      event_id: eventId,
      merchant_id: merchantId,
      user_id: userId,
      invitation_status: 'pending',
      wizard_completed: false,
      is_active: true,
      invited_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveEventStaffMember(offlineStaff);
    return offlineStaff;
  }, [merchantId]);

  const acceptEventStaffInvitation = useCallback(async (staffId: string): Promise<OfflineEventStaff> => {
    if (navigator.onLine) {
      try {
        const staff = await eventService.acceptEventStaffInvitation(staffId);
        await indexedDBService.saveEventStaffMember({ ...staff as OfflineEventStaff, pending_sync: false });
        return staff as OfflineEventStaff;
      } catch (error) {
        console.warn('Server accept failed, saving offline:', error);
      }
    }

    const existingStaff = await indexedDBService.getEventStaffById(staffId);
    const updatedStaff: OfflineEventStaff = {
      ...existingStaff!,
      invitation_status: 'accepted',
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveEventStaffMember(updatedStaff);
    return updatedStaff;
  }, []);

  const declineEventStaffInvitation = useCallback(async (staffId: string): Promise<OfflineEventStaff> => {
    if (navigator.onLine) {
      try {
        const staff = await eventService.declineEventStaffInvitation(staffId);
        await indexedDBService.saveEventStaffMember({ ...staff as OfflineEventStaff, pending_sync: false });
        return staff as OfflineEventStaff;
      } catch (error) {
        console.warn('Server decline failed, saving offline:', error);
      }
    }

    const existingStaff = await indexedDBService.getEventStaffById(staffId);
    const updatedStaff: OfflineEventStaff = {
      ...existingStaff!,
      invitation_status: 'declined',
      declined_at: new Date().toISOString(),
      is_active: false,
      updated_at: new Date().toISOString(),
      pending_sync: true,
    };
    await indexedDBService.saveEventStaffMember(updatedStaff);
    return updatedStaff;
  }, []);

  const updateEventStaffWizardCompleted = useCallback(async (staffId: string): Promise<void> => {
    if (navigator.onLine) {
      try {
        await eventService.updateEventStaffWizardCompleted(staffId);
        await indexedDBService.updateEventStaffWizardCompleted(staffId);
        return;
      } catch (error) {
        console.warn('Server update failed, saving offline:', error);
      }
    }

    await indexedDBService.updateEventStaffWizardCompleted(staffId);
  }, []);

  const removeEventStaff = useCallback(async (staffId: string): Promise<void> => {
    if (navigator.onLine) {
      try {
        await eventService.removeEventStaff(staffId);
        await indexedDBService.deleteEventStaffMember(staffId);
        return;
      } catch (error) {
        console.warn('Server remove failed:', error);
      }
    }

    await indexedDBService.addToSyncQueue({
      type: 'REMOVE_EVENT_STAFF',
      data: { staffId },
      endpoint: `/api/events/staff/${staffId}`,
      method: 'DELETE',
    });
    await indexedDBService.deleteEventStaffMember(staffId);
  }, []);

  // ================== Scan Functions ==================

  const scanTicket = useCallback(async (
    qrCode: string,
    staffId: string,
    eventId: string
  ): Promise<{ success: boolean; ticket?: OfflineEventTicket; message: string }> => {
    if (navigator.onLine) {
      try {
        const result = await eventService.scanTicket(qrCode, staffId, eventId);
        if (result.ticket) {
          await indexedDBService.saveEventTicket(result.ticket as OfflineEventTicket);
        }
        if (result.scan) {
          await indexedDBService.addEventScan(result.scan as OfflineEventScan);
        }
        return {
          success: result.success,
          ticket: result.ticket as OfflineEventTicket | undefined,
          message: result.message,
        };
      } catch (error) {
        console.warn('Server scan failed, processing offline:', error);
      }
    }

    // Offline scanning
    const ticket = await indexedDBService.getEventTicketByQRCode(qrCode);

    if (!ticket) {
      await indexedDBService.addEventScan({
        event_id: eventId,
        ticket_id: '',
        staff_id: staffId,
        scan_result: 'invalid',
      });
      return { success: false, message: 'Invalid ticket - not found' };
    }

    if (ticket.event_id !== eventId) {
      await indexedDBService.addEventScan({
        event_id: eventId,
        ticket_id: ticket.id,
        staff_id: staffId,
        scan_result: 'invalid',
        ticket_number: ticket.ticket_number,
        attendee_name: ticket.attendee_name,
      });
      return { success: false, message: 'Ticket is for a different event' };
    }

    if (ticket.status === 'used') {
      await indexedDBService.addEventScan({
        event_id: eventId,
        ticket_id: ticket.id,
        staff_id: staffId,
        scan_result: 'already_used',
        ticket_number: ticket.ticket_number,
        attendee_name: ticket.attendee_name,
      });
      return {
        success: false,
        ticket,
        message: `Ticket already used at ${ticket.scanned_at}`,
      };
    }

    if (ticket.status === 'cancelled' || ticket.status === 'refunded') {
      await indexedDBService.addEventScan({
        event_id: eventId,
        ticket_id: ticket.id,
        staff_id: staffId,
        scan_result: 'cancelled',
        ticket_number: ticket.ticket_number,
        attendee_name: ticket.attendee_name,
      });
      return { success: false, ticket, message: `Ticket is ${ticket.status}` };
    }

    // Valid ticket - mark as used
    await indexedDBService.updateEventTicketStatus(ticket.id, 'used', staffId);

    await indexedDBService.addEventScan({
      event_id: eventId,
      ticket_id: ticket.id,
      staff_id: staffId,
      scan_result: 'valid',
      ticket_number: ticket.ticket_number,
      attendee_name: ticket.attendee_name,
    });

    const updatedTicket = await indexedDBService.getEventTicketById(ticket.id);

    return {
      success: true,
      ticket: updatedTicket || undefined,
      message: 'Ticket valid - welcome!',
    };
  }, []);

  // ================== Analytics Functions ==================

  const getEventAnalytics = useCallback(async (eventId: string): Promise<EventAnalytics | null> => {
    if (navigator.onLine) {
      try {
        return await eventService.getEventAnalytics(eventId);
      } catch (error) {
        console.warn('Server analytics failed, computing offline:', error);
      }
    }

    // Compute from local data
    const analytics = await indexedDBService.getEventAnalytics(eventId);
    return {
      total_tickets: analytics.totalTickets,
      tickets_scanned: analytics.ticketsScanned,
      total_revenue: 0, // Would need to compute from tickets
      tickets_by_type: Object.fromEntries(
        Object.entries(analytics.ticketsByType).map(([key, value]) => [
          key,
          { ...value, revenue: 0 },
        ])
      ),
      scans_by_staff: Object.fromEntries(
        Object.entries(analytics.scansByStaff).map(([key, count]) => [
          key,
          { name: 'Staff', count },
        ])
      ),
      scans_by_hour: analytics.scansByHour,
      attendance_rate: analytics.totalTickets > 0
        ? (analytics.ticketsScanned / analytics.totalTickets) * 100
        : 0,
    };
  }, []);

  return {
    ...syncStatus,
    syncData,
    syncFromServer,
    // Events
    getEvents,
    getEventById,
    getEventsByStatus,
    createEvent,
    updateEvent,
    deleteEvent,
    // Ticket Types
    getEventTicketTypes,
    createEventTicketType,
    updateEventTicketType,
    // Tickets
    getEventTickets,
    getEventTicketByQRCode,
    // Staff
    getEventStaff,
    getAcceptedEventStaffForUser,
    inviteEventStaff,
    acceptEventStaffInvitation,
    declineEventStaffInvitation,
    updateEventStaffWizardCompleted,
    removeEventStaff,
    // Scanning
    scanTicket,
    // Analytics
    getEventAnalytics,
  };
}

export default useEventSync;
