import api from '@/lib/api';

export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TicketCategory =
  | 'account'
  | 'transaction'
  | 'card'
  | 'payment'
  | 'technical'
  | 'billing'
  | 'security'
  | 'other';

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderName: string;
  senderRole: 'user' | 'support' | 'system';
  message: string;
  attachments?: string[];
  createdAt: string;
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  category: TicketCategory;
  priority?: TicketPriority;
}

export interface AddMessageDto {
  message: string;
  attachments?: string[];
}

// Mock data for development - will be replaced with real API calls
const mockTickets: SupportTicket[] = [];

class SupportService {
  private generateId(): string {
    return `TKT-${Date.now().toString(36).toUpperCase()}`;
  }

  async getTickets(): Promise<SupportTicket[]> {
    try {
      const response = await api.get('/support/tickets');
      return response.data;
    } catch (error) {
      // Return mock data if API not available
      return mockTickets;
    }
  }

  async getTicket(id: string): Promise<SupportTicket | null> {
    try {
      const response = await api.get(`/support/tickets/${id}`);
      return response.data;
    } catch (error) {
      // Return from mock data if API not available
      return mockTickets.find(t => t.id === id) || null;
    }
  }

  async createTicket(data: CreateTicketDto): Promise<SupportTicket> {
    try {
      const response = await api.post('/support/tickets', data);
      return response.data;
    } catch (error) {
      // Create mock ticket if API not available
      const newTicket: SupportTicket = {
        id: this.generateId(),
        userId: 'current-user',
        subject: data.subject,
        description: data.description,
        category: data.category,
        priority: data.priority || 'medium',
        status: 'open',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: [
          {
            id: `MSG-${Date.now()}`,
            ticketId: '',
            senderId: 'current-user',
            senderName: 'You',
            senderRole: 'user',
            message: data.description,
            createdAt: new Date().toISOString(),
          },
        ],
      };
      newTicket.messages[0].ticketId = newTicket.id;
      mockTickets.unshift(newTicket);
      return newTicket;
    }
  }

  async addMessage(ticketId: string, data: AddMessageDto): Promise<TicketMessage> {
    try {
      const response = await api.post(`/support/tickets/${ticketId}/messages`, data);
      return response.data;
    } catch (error) {
      // Add to mock data if API not available
      const ticket = mockTickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      const newMessage: TicketMessage = {
        id: `MSG-${Date.now()}`,
        ticketId,
        senderId: 'current-user',
        senderName: 'You',
        senderRole: 'user',
        message: data.message,
        attachments: data.attachments,
        createdAt: new Date().toISOString(),
      };
      ticket.messages.push(newMessage);
      ticket.updatedAt = new Date().toISOString();
      return newMessage;
    }
  }

  async closeTicket(ticketId: string): Promise<SupportTicket> {
    try {
      const response = await api.patch(`/support/tickets/${ticketId}/close`);
      return response.data;
    } catch (error) {
      // Update mock data if API not available
      const ticket = mockTickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = 'closed';
      ticket.updatedAt = new Date().toISOString();
      return ticket;
    }
  }

  async reopenTicket(ticketId: string): Promise<SupportTicket> {
    try {
      const response = await api.patch(`/support/tickets/${ticketId}/reopen`);
      return response.data;
    } catch (error) {
      // Update mock data if API not available
      const ticket = mockTickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = 'open';
      ticket.updatedAt = new Date().toISOString();
      return ticket;
    }
  }

  // Admin functions
  async getAllTickets(filters?: {
    status?: TicketStatus;
    priority?: TicketPriority;
    category?: TicketCategory;
  }): Promise<SupportTicket[]> {
    try {
      const response = await api.get('/support/admin/tickets', { params: filters });
      return response.data;
    } catch (error) {
      // Return filtered mock data
      let filtered = [...mockTickets];
      if (filters?.status) filtered = filtered.filter(t => t.status === filters.status);
      if (filters?.priority) filtered = filtered.filter(t => t.priority === filters.priority);
      if (filters?.category) filtered = filtered.filter(t => t.category === filters.category);
      return filtered;
    }
  }

  async assignTicket(ticketId: string, assigneeId: string): Promise<SupportTicket> {
    try {
      const response = await api.patch(`/support/admin/tickets/${ticketId}/assign`, { assigneeId });
      return response.data;
    } catch (error) {
      const ticket = mockTickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      ticket.assignedTo = assigneeId;
      ticket.status = 'in_progress';
      ticket.updatedAt = new Date().toISOString();
      return ticket;
    }
  }

  async updateTicketStatus(ticketId: string, status: TicketStatus): Promise<SupportTicket> {
    try {
      const response = await api.patch(`/support/admin/tickets/${ticketId}/status`, { status });
      return response.data;
    } catch (error) {
      const ticket = mockTickets.find(t => t.id === ticketId);
      if (!ticket) throw new Error('Ticket not found');

      ticket.status = status;
      ticket.updatedAt = new Date().toISOString();
      if (status === 'resolved') {
        ticket.resolvedAt = new Date().toISOString();
      }
      return ticket;
    }
  }
}

export const supportService = new SupportService();
