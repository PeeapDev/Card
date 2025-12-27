/**
 * ConversationList Component
 *
 * Displays a list of conversations with search, filters, and real-time updates.
 */

import { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  MessageSquare,
  AlertTriangle,
  Clock,
  ChevronRight,
  Plus,
  Loader2,
  Flag,
  User,
  Store,
  Headphones,
} from 'lucide-react';
import {
  conversationService,
  Conversation,
  ConversationType,
  ConversationStatus,
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES,
} from '@/services/conversation.service';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

interface ConversationListProps {
  onSelectConversation: (conversation: Conversation) => void;
  selectedId?: string;
  mode?: 'user' | 'support';
  onNewConversation?: () => void;
}

export function ConversationList({
  onSelectConversation,
  selectedId,
  mode = 'user',
  onNewConversation,
}: ConversationListProps) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConversationStatus | ''>('');
  const [showFilters, setShowFilters] = useState(false);

  // Get the other participant in a conversation (not the current user)
  const getOtherParticipant = (conv: Conversation) => {
    if (!conv.participants || conv.participants.length === 0) return null;
    // Find participant that is not the current user
    const other = conv.participants.find(p => p.user_id !== user?.id);
    return other || conv.participants[0];
  };

  useEffect(() => {
    loadConversations();
  }, [mode, statusFilter]);

  const loadConversations = async () => {
    setLoading(true);

    if (mode === 'support') {
      const result = await conversationService.getSupportConversations({
        status: statusFilter || undefined,
      });
      setConversations(result.conversations);
    } else {
      const result = await conversationService.getMyConversations({
        status: statusFilter || undefined,
      });
      setConversations(result.conversations);
    }

    setLoading(false);
  };

  const filteredConversations = conversations.filter(conv => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      conv.subject?.toLowerCase().includes(searchLower) ||
      conv.last_message_preview?.toLowerCase().includes(searchLower)
    );
  });

  const getTypeIcon = (type: ConversationType) => {
    switch (type) {
      case 'support':
        return <Headphones className="w-4 h-4" />;
      case 'business_inquiry':
      case 'b2b':
        return <Store className="w-4 h-4" />;
      default:
        return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500';
      case 'high':
        return 'bg-orange-500';
      case 'normal':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            {mode === 'support' ? 'Support Inbox' : 'Messages'}
          </h2>
          {onNewConversation && (
            <button
              onClick={onNewConversation}
              className="p-2 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg"
              title="New Conversation"
            >
              <Plus className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-10 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
          />
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`absolute right-3 top-1/2 -translate-y-1/2 ${showFilters ? 'text-primary-600' : 'text-gray-400'}`}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 flex flex-wrap gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as ConversationStatus | '')}
              className="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 border-none rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
            >
              <option value="">All Status</option>
              {Object.entries(CONVERSATION_STATUSES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No conversations found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedId === conv.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar or Type Icon */}
                  {(() => {
                    const participant = getOtherParticipant(conv);
                    const isDirectMessage = conv.type === 'general' || conv.type === 'b2b';

                    if (isDirectMessage && participant) {
                      // Show avatar for direct messages
                      const initials = participant.display_name
                        ? participant.display_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                        : participant.user_name
                          ? participant.user_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
                          : '?';

                      return participant.user_avatar ? (
                        <img
                          src={participant.user_avatar}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                            {initials}
                          </span>
                        </div>
                      );
                    } else {
                      // Show type icon for support/business conversations
                      return (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                          conv.type === 'support'
                            ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}>
                          {getTypeIcon(conv.type)}
                        </div>
                      );
                    }
                  })()}

                  <div className="flex-1 min-w-0">
                    {/* Subject & Flags */}
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {conv.subject || CONVERSATION_TYPES[conv.type]}
                      </span>
                      {conv.ai_flagged && (
                        <Flag className="w-4 h-4 text-red-500 flex-shrink-0" />
                      )}
                      {/* Priority dot */}
                      {(conv.priority === 'urgent' || conv.priority === 'high') && (
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityColor(conv.priority)}`} />
                      )}
                    </div>

                    {/* Preview */}
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mb-1">
                      {conv.last_message_preview || 'No messages yet'}
                    </p>

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                      {conv.last_message_at && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(conv.last_message_at))} ago
                        </span>
                      )}
                      {conv.unread_count && conv.unread_count > 0 && (
                        <span className="px-1.5 py-0.5 bg-primary-600 text-white rounded-full font-medium">
                          {conv.unread_count}
                        </span>
                      )}
                      {mode === 'support' && conv.assigned_to_name && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {conv.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Stats Footer (Support Mode) */}
      {mode === 'support' && (
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-around text-xs">
            <div className="text-center">
              <p className="font-semibold text-gray-900 dark:text-white">
                {conversations.filter(c => c.status === 'open').length}
              </p>
              <p className="text-gray-500">Open</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-red-600">
                {conversations.filter(c => c.ai_flagged).length}
              </p>
              <p className="text-gray-500">Flagged</p>
            </div>
            <div className="text-center">
              <p className="font-semibold text-orange-600">
                {conversations.filter(c => c.priority === 'urgent' || c.priority === 'high').length}
              </p>
              <p className="text-gray-500">Priority</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
