import { useState, useEffect } from 'react';
import {
  MessageSquare,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Send,
  ChevronRight,
  ArrowLeft,
  Headphones,
  User,
  Calendar,
  Tag,
  MoreVertical,
  UserPlus,
  RefreshCw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, Button, Badge } from '@/components/ui';
import {
  supportService,
  SupportTicket,
  TicketStatus,
  TicketPriority,
  TicketCategory,
} from '@/services/support.service';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/NotificationContext';

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-700',
};

const priorityColors: Record<TicketPriority, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
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
        <p className="text-gray-500">No support tickets found</p>
        <p className="text-sm text-gray-400 mt-1">Tickets will appear here when users submit them</p>
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
              selectedId === ticket.id && 'bg-primary-50'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                  <span
                    className={clsx(
                      'px-2 py-0.5 rounded-full text-xs font-medium',
                      priorityColors[ticket.priority]
                    )}
                  >
                    {ticket.priority}
                  </span>
                </div>
                <p className="font-medium text-gray-900 truncate">{ticket.subject}</p>
                <p className="text-sm text-gray-500 truncate mt-1">{ticket.description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    {categoryLabels[ticket.category]}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(ticket.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    {ticket.messages.length}
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
  onUpdateStatus,
  onAssign,
}: {
  ticket: SupportTicket;
  onBack: () => void;
  onSendMessage: (message: string) => Promise<void>;
  onUpdateStatus: (status: TicketStatus) => Promise<void>;
  onAssign: (assigneeId: string) => Promise<void>;
}) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const { user } = useAuth();
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
          <div className="flex items-center gap-2 mb-1 flex-wrap">
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
            <span
              className={clsx(
                'px-2 py-0.5 rounded-full text-xs font-medium',
                priorityColors[ticket.priority]
              )}
            >
              {ticket.priority}
            </span>
            <Badge variant="secondary" className="text-xs">
              {categoryLabels[ticket.category]}
            </Badge>
          </div>
          <h3 className="font-semibold text-gray-900 truncate">{ticket.subject}</h3>
        </div>
        <div className="flex items-center gap-2">
          {/* Status Dropdown */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Status
            </Button>
            {showStatusMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                {(['open', 'in_progress', 'resolved', 'closed'] as TicketStatus[]).map((status) => (
                  <button
                    key={status}
                    onClick={() => {
                      onUpdateStatus(status);
                      setShowStatusMenu(false);
                    }}
                    className={clsx(
                      'w-full text-left px-4 py-2 text-sm hover:bg-gray-50',
                      ticket.status === status && 'bg-gray-100 font-medium'
                    )}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
            )}
          </div>
          {!ticket.assignedTo && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onAssign(user?.id || '')}
            >
              <UserPlus className="w-4 h-4 mr-1" />
              Assign to me
            </Button>
          )}
        </div>
      </div>

      {/* Ticket Info */}
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-gray-500">User ID:</span>
            <span className="ml-1 font-medium">{ticket.userId}</span>
          </div>
          <div>
            <span className="text-gray-500">Created:</span>
            <span className="ml-1 font-medium">
              {new Date(ticket.createdAt).toLocaleString()}
            </span>
          </div>
          {ticket.assignedTo && (
            <div>
              <span className="text-gray-500">Assigned to:</span>
              <span className="ml-1 font-medium">{ticket.assignedTo}</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {ticket.messages.map((msg) => {
          const isSupport = msg.senderRole === 'support';
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
              className={clsx('flex', isSupport ? 'justify-end' : 'justify-start')}
            >
              <div
                className={clsx(
                  'max-w-[80%] rounded-2xl px-4 py-3',
                  isSupport
                    ? 'bg-primary-600 text-white rounded-br-md'
                    : 'bg-gray-100 text-gray-900 rounded-bl-md'
                )}
              >
                <div
                  className={clsx(
                    'text-xs mb-1 flex items-center gap-2',
                    isSupport ? 'text-primary-200' : 'text-gray-500'
                  )}
                >
                  <User className="w-3 h-3" />
                  {msg.senderName}
                  {isSupport && <Badge className="text-[10px] py-0 px-1">Support</Badge>}
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                <div
                  className={clsx(
                    'text-xs mt-2',
                    isSupport ? 'text-primary-200' : 'text-gray-400'
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
      <form
        onSubmit={handleSendMessage}
        className="p-4 border-t border-gray-200 bg-white"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your reply..."
            className="flex-1 px-4 py-2.5 border border-gray-300 rounded-full focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="p-2.5 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </form>
    </div>
  );
}

export function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TicketPriority | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<TicketCategory | 'all'>('all');
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    setIsLoading(true);
    try {
      const data = await supportService.getAllTickets();
      setTickets(data);
    } catch (error) {
      toast.error('Error', 'Failed to load support tickets');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!selectedTicket) return;

    try {
      // For admin, the message is sent as 'support' role
      const newMessage = await supportService.addMessage(selectedTicket.id, { message });
      // Override the sender info for display
      newMessage.senderRole = 'support';
      newMessage.senderName = `${user?.firstName} ${user?.lastName}`;

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
      toast.success('Success', 'Reply sent');
    } catch (error) {
      toast.error('Error', 'Failed to send message');
    }
  };

  const handleUpdateStatus = async (status: TicketStatus) => {
    if (!selectedTicket) return;

    try {
      const updatedTicket = await supportService.updateTicketStatus(selectedTicket.id, status);
      setSelectedTicket(updatedTicket);
      setTickets(tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
      toast.success('Success', `Ticket status updated to ${status}`);
    } catch (error) {
      toast.error('Error', 'Failed to update ticket status');
    }
  };

  const handleAssign = async (assigneeId: string) => {
    if (!selectedTicket) return;

    try {
      const updatedTicket = await supportService.assignTicket(selectedTicket.id, assigneeId);
      setSelectedTicket(updatedTicket);
      setTickets(tickets.map((t) => (t.id === updatedTicket.id ? updatedTicket : t)));
      toast.success('Success', 'Ticket assigned successfully');
    } catch (error) {
      toast.error('Error', 'Failed to assign ticket');
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesSearch =
      ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.userId.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || ticket.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory;
  });

  // Stats
  const openCount = tickets.filter((t) => t.status === 'open').length;
  const inProgressCount = tickets.filter((t) => t.status === 'in_progress').length;
  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const urgentCount = tickets.filter((t) => t.priority === 'urgent' && t.status !== 'closed').length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
          <p className="text-gray-500 mt-1">Manage and respond to customer support requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{openCount}</p>
                <p className="text-sm text-gray-500">Open</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{inProgressCount}</p>
                <p className="text-sm text-gray-500">In Progress</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{resolvedCount}</p>
                <p className="text-sm text-gray-500">Resolved</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{urgentCount}</p>
                <p className="text-sm text-gray-500">Urgent</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="overflow-hidden">
          <div className="flex flex-col lg:flex-row h-[600px]">
            {/* Ticket List */}
            <div
              className={clsx(
                'lg:w-[400px] border-r border-gray-200 flex flex-col',
                selectedTicket ? 'hidden lg:flex' : 'flex'
              )}
            >
              {/* Search & Filters */}
              <div className="p-4 border-b border-gray-200 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search tickets..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as TicketStatus | 'all')}
                    className="flex-1 min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as TicketPriority | 'all')}
                    className="flex-1 min-w-[100px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  >
                    <option value="all">All Priority</option>
                    <option value="urgent">Urgent</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
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
                  onUpdateStatus={handleUpdateStatus}
                  onAssign={handleAssign}
                />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-500">
                  <Headphones className="w-16 h-16 text-gray-300 mb-4" />
                  <p className="text-lg font-medium text-gray-700">Select a ticket</p>
                  <p className="text-sm">Choose a ticket from the list to view and respond</p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
