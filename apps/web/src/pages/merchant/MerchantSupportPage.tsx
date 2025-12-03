import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  Plus,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  ChevronRight,
  ArrowLeft,
  Headphones,
  Mail,
  Phone,
  MessageCircle,
} from 'lucide-react';
import { clsx } from 'clsx';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card, CardHeader, CardTitle, CardDescription, Button, Input, Badge } from '@/components/ui';
import {
  supportService,
  SupportTicket,
  TicketStatus,
  TicketCategory,
  CreateTicketDto,
} from '@/services/support.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/NotificationContext';

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

const statusIcons: Record<TicketStatus, typeof Clock> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
};

const categoryLabels: Record<TicketCategory, string> = {
  account: 'Account',
  transaction: 'Transaction',
  card: 'Card',
  payment: 'Payment',
  technical: 'Technical',
  billing: 'Billing',
  security: 'Security',
  other: 'Other',
};

function CreateTicketForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (data: CreateTicketDto) => Promise<void>;
  onCancel: () => void;
}) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('payment');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ subject, description, category });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as TicketCategory)}
          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
        <Input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Brief description of your issue"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Please provide as much detail as possible about your issue..."
          rows={6}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 resize-none"
          required
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting || !subject.trim() || !description.trim()}>
          {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
        </Button>
      </div>
    </form>
  );
}

function TicketList({
  tickets,
  onSelectTicket,
  selectedId,
}: {
  tickets: SupportTicket[];
  onSelectTicket: (ticket: SupportTicket) => void;
  selectedId?: string;
}) {
  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">No support tickets yet</p>
        <p className="text-sm text-gray-400 mt-1">Create a new ticket to get help</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {tickets.map((ticket) => {
        const StatusIcon = statusIcons[ticket.status];
        return (
          <button
            key={ticket.id}
            onClick={() => onSelectTicket(ticket)}
            className={clsx(
              'w-full text-left p-4 hover:bg-gray-50 transition-colors',
              selectedId === ticket.id && 'bg-green-50'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-mono text-gray-400">{ticket.id}</span>
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                      statusColors[ticket.status]
                    )}
                  >
                    <StatusIcon className="w-3 h-3" />
                    {ticket.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="font-medium text-gray-900 truncate">{ticket.subject}</p>
                <p className="text-sm text-gray-500 truncate mt-1">{ticket.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span>{categoryLabels[ticket.category]}</span>
                  <span>
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TicketDetail({
  ticket,
  onBack,
  onSendMessage,
  onClose,
  onReopen,
}: {
  ticket: SupportTicket;
  onBack: () => void;
  onSendMessage: (message: string) => Promise<void>;
  onClose: () => Promise<void>;
  onReopen: () => Promise<void>;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const StatusIcon = statusIcons[ticket.status];

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(newMessage);
      setNewMessage('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 bg-gray-50">
        <button
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-gray-200 transition-colors lg:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-gray-400">{ticket.id}</span>
            <span
              className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                statusColors[ticket.status]
              )}
            >
              <StatusIcon className="w-3 h-3" />
              {ticket.status.replace('_', ' ')}
            </span>
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[ticket.category]}
            </Badge>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
        </div>
        {ticket.status !== 'closed' ? (
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Ticket
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={onReopen}>
            Reopen
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {ticket.messages.map((msg) => {
          const isUser = msg.senderRole === 'user';
          const isSystem = msg.senderRole === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="text-center">
                <span className="inline-block px-3 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                  {msg.message}
                </span>
              </div>
            );
          }

          return (
            <div
              key={msg.id}
              className={clsx('flex', isUser ? 'justify-end' : 'justify-start')}
            >
              <div
                className={clsx(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  isUser
                    ? 'bg-green-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                )}
              >
                <div
                  className={clsx(
                    'text-xs mb-1',
                    isUser ? 'text-green-200' : 'text-gray-500'
                  )}
                >
                  {msg.senderName}
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <div
                  className={clsx(
                    'text-xs mt-2',
                    isUser ? 'text-green-200' : 'text-gray-400'
                  )}
                >
                  {new Date(msg.createdAt).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message Input */}
      {ticket.status !== 'closed' && (
        <form
          onSubmit={handleSendMessage}
          className="p-4 border-t border-gray-200 bg-white"
        >
          <div className="flex gap-3">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || isSending}
              className="p-2.5 bg-green-600 text-white rounded-full hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function MerchantSupportPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const toast = useToast();

  useEffect(() => {
    loadTickets();
  }, []);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setShowCreateForm(true);
      setSelectedTicket(null);
    }
  }, [searchParams]);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await supportService.getTickets();
      setTickets(data);
    } catch (error) {
      toast.error('Error', 'Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateTicket = async (data: CreateTicketDto) => {
    try {
      const newTicket = await supportService.createTicket(data);
      setTickets([newTicket, ...tickets]);
      setShowCreateForm(false);
      setSelectedTicket(newTicket);
      searchParams.delete('action');
      setSearchParams(searchParams);
      toast.success('Success', 'Support ticket created successfully');
    } catch (error) {
      toast.error('Error', 'Failed to create support ticket');
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedTicket) return;

    try {
      const newMessage = await supportService.addMessage(selectedTicket.id, { message });
      setSelectedTicket({
        ...selectedTicket,
        messages: [...selectedTicket.messages, newMessage],
      });
      setTickets(
        tickets.map((t) =>
          t.id === selectedTicket.id
            ? { ...t, messages: [...t.messages, newMessage], updatedAt: new Date().toISOString() }
            : t
        )
      );
    } catch (error) {
      toast.error('Error', 'Failed to send message');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;

    try {
      const updatedTicket = await supportService.closeTicket(selectedTicket.id);
      setSelectedTicket(updatedTicket);
      setTickets(tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
      toast.success('Success', 'Ticket closed successfully');
    } catch (error) {
      toast.error('Error', 'Failed to close ticket');
    }
  };

  const handleReopenTicket = async () => {
    if (!selectedTicket) return;

    try {
      const updatedTicket = await supportService.reopenTicket(selectedTicket.id);
      setSelectedTicket(updatedTicket);
      setTickets(tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
      toast.success('Success', 'Ticket reopened successfully');
    } catch (error) {
      toast.error('Error', 'Failed to reopen ticket');
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Help & Support</h1>
            <p className="text-gray-500 mt-1">Get help with your merchant account</p>
          </div>
          <Button
            onClick={() => {
              setShowCreateForm(true);
              setSelectedTicket(null);
            }}
            className="bg-green-600 hover:bg-green-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Ticket
          </Button>
        </div>

        {/* Quick Help Cards */}
        {!showCreateForm && !selectedTicket && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Merchant Support</p>
                  <p className="text-sm text-gray-500">merchant@peeap.com</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Phone className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Priority Line</p>
                  <p className="text-sm text-gray-500">+232 76 123 456</p>
                </div>
              </div>
            </Card>
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">Live Chat</p>
                  <p className="text-sm text-gray-500">Available 24/7</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <Card className="overflow-hidden">
          {showCreateForm ? (
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <button
                  onClick={() => {
                    setShowCreateForm(false);
                    searchParams.delete('action');
                    setSearchParams(searchParams);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Create Support Ticket</h2>
                  <p className="text-sm text-gray-500">
                    Describe your issue and we'll get back to you
                  </p>
                </div>
              </div>
              <CreateTicketForm
                onSubmit={handleCreateTicket}
                onCancel={() => {
                  setShowCreateForm(false);
                  searchParams.delete('action');
                  setSearchParams(searchParams);
                }}
              />
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row h-[600px]">
              {/* Ticket List */}
              <div
                className={clsx(
                  'lg:w-96 border-r border-gray-200 flex flex-col',
                  selectedTicket ? 'hidden lg:flex' : 'flex'
                )}
              >
                {/* Search & Filter */}
                <div className="p-4 border-b border-gray-200 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tickets..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                    >
                      <option value="all">All Status</option>
                      <option value="open">Open</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto">
                  {isLoading ? (
                    <div className="py-12 text-center text-gray-500">Loading tickets...</div>
                  ) : (
                    <TicketList
                      tickets={filteredTickets}
                      onSelectTicket={setSelectedTicket}
                      selectedId={selectedTicket?.id}
                    />
                  )}
                </div>
              </div>

              {/* Ticket Detail */}
              <div
                className={clsx(
                  'flex-1 flex flex-col',
                  !selectedTicket ? 'hidden lg:flex' : 'flex'
                )}
              >
                {selectedTicket ? (
                  <TicketDetail
                    ticket={selectedTicket}
                    onBack={() => setSelectedTicket(null)}
                    onSendMessage={handleSendMessage}
                    onClose={handleCloseTicket}
                    onReopen={handleReopenTicket}
                  />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                    <Headphones className="w-16 h-16 text-gray-300 mb-4" />
                    <p className="text-lg font-medium text-gray-700">Select a ticket</p>
                    <p className="text-sm">Choose a ticket from the list to view details</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </Card>
      </div>
    </MerchantLayout>
  );
}
