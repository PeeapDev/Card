/**
 * School Messages Page - Peeap Chat Interface
 * Real-time chat between schools and parents
 * Similar to WhatsApp/Telegram style messaging
 */

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { SchoolLayout } from '@/components/school';
import {
  MessageSquare,
  Send,
  Search,
  User,
  Users,
  Loader2,
  RefreshCw,
  ChevronLeft,
  Phone,
  MoreVertical,
  Check,
  CheckCheck,
  Image,
  Paperclip,
  Smile,
  BadgeCheck,
  GraduationCap,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { schoolChatService, type ChatMessage } from '@/services/schoolChat.service';

interface Conversation {
  userId: string;
  userName: string;
  userPhone?: string;
  userAvatar?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  studentNames: string[];
}

export function SchoolMessagesPage() {
  const { schoolSlug } = useParams<{ schoolSlug: string }>();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [schoolName, setSchoolName] = useState('School');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const schoolDomain = schoolSlug || '';

  // Load school name from connection
  useEffect(() => {
    const loadSchoolInfo = async () => {
      if (!schoolDomain) return;

      try {
        const { data: connection } = await supabaseAdmin
          .from('school_connections')
          .select('school_name')
          .eq('school_id', schoolDomain)
          .single();

        if (connection?.school_name) {
          setSchoolName(connection.school_name);
        }
      } catch (err) {
        console.error('Error loading school info:', err);
      }
    };

    loadSchoolInfo();
  }, [schoolDomain]);

  useEffect(() => {
    if (schoolDomain) {
      loadConversations();
    }
  }, [schoolDomain]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      // Get all messages sent by this school, grouped by recipient
      const { data: allMessages, error } = await supabaseAdmin
        .from('school_chat_messages')
        .select('*')
        .eq('sender_id', schoolDomain)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by recipient user
      const conversationMap = new Map<string, Conversation>();

      for (const msg of allMessages || []) {
        const userId = msg.recipient_user_id;
        if (!conversationMap.has(userId)) {
          // Get user info
          const { data: userData } = await supabaseAdmin
            .from('users')
            .select('id, first_name, last_name, phone')
            .eq('id', userId)
            .single();

          // Get linked students
          const { data: links } = await supabaseAdmin
            .from('parent_student_links')
            .select('student_name')
            .eq('parent_user_id', userId)
            .eq('is_active', true);

          conversationMap.set(userId, {
            userId,
            userName: userData
              ? `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Unknown'
              : 'Unknown User',
            userPhone: userData?.phone,
            lastMessage: msg.content?.substring(0, 50) + (msg.content?.length > 50 ? '...' : ''),
            lastMessageTime: msg.created_at,
            unreadCount: 0,
            studentNames: links?.map(l => l.student_name) || [],
          });
        }
      }

      // Also get parent replies
      const { data: replies } = await supabaseAdmin
        .from('school_chat_messages')
        .select('*')
        .eq('sender_type', 'parent')
        .order('created_at', { ascending: false });

      for (const reply of replies || []) {
        const senderId = reply.sender_id;
        if (conversationMap.has(senderId)) {
          const conv = conversationMap.get(senderId)!;
          if (reply.status !== 'read') {
            conv.unreadCount++;
          }
          // Update last message if this is more recent
          if (!conv.lastMessageTime || new Date(reply.created_at) > new Date(conv.lastMessageTime)) {
            conv.lastMessage = reply.content?.substring(0, 50);
            conv.lastMessageTime = reply.created_at;
          }
        }
      }

      setConversations(Array.from(conversationMap.values()));
    } catch (err) {
      console.error('Error loading conversations:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (userId: string) => {
    setLoadingMessages(true);
    try {
      // Get all messages between school and this user
      const { data, error } = await supabaseAdmin
        .from('school_chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${schoolDomain},recipient_user_id.eq.${userId}),and(sender_type.eq.parent,sender_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages((data || []).map(msg => ({
        id: msg.id,
        type: msg.type,
        recipientUserId: msg.recipient_user_id,
        senderType: msg.sender_type,
        senderId: msg.sender_id,
        content: msg.content,
        metadata: msg.metadata,
        status: msg.status,
        createdAt: msg.created_at,
      })));

      // Mark parent messages as read
      await supabaseAdmin
        .from('school_chat_messages')
        .update({ status: 'read', read_at: new Date().toISOString() })
        .eq('sender_type', 'parent')
        .eq('sender_id', userId)
        .neq('status', 'read');
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSelectConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    loadMessages(conv.userId);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      const result = await schoolChatService.sendMessage(
        selectedConversation.userId,
        schoolDomain,
        schoolName,
        newMessage.trim()
      );

      if (result.success) {
        setNewMessage('');
        loadMessages(selectedConversation.userId);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  const formatMessageTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const filteredConversations = conversations.filter(conv =>
    conv.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.studentNames.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getMessageStatusIcon = (status: string) => {
    if (status === 'read') {
      return <CheckCheck className="h-4 w-4 text-blue-500" />;
    } else if (status === 'delivered') {
      return <CheckCheck className="h-4 w-4 text-gray-400" />;
    } else {
      return <Check className="h-4 w-4 text-gray-400" />;
    }
  };

  // Mobile: show conversation list or chat, but not both
  const showConversationList = !selectedConversation;

  return (
    <SchoolLayout>
      <div className="h-[calc(100vh-8rem)] flex bg-gray-100 dark:bg-gray-900 -m-6 -mb-6 rounded-xl overflow-hidden">
        {/* Conversation List */}
        <div className={`w-full md:w-96 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h1 className="text-lg font-bold text-white">{schoolName}</h1>
                    <BadgeCheck className="h-4 w-4 text-blue-200" />
                  </div>
                  <p className="text-xs text-blue-100">Parent Messages</p>
                </div>
              </div>
              <button
                onClick={loadConversations}
                disabled={loading}
                className="p-2 text-white/70 hover:text-white"
              >
                <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50" />
              <input
                type="text"
                placeholder="Search parents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/20 border-0 rounded-full text-white placeholder-white/50"
              />
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : filteredConversations.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">No conversations yet</h3>
                <p className="text-sm text-gray-500">
                  Messages will appear here when you communicate with parents
                </p>
              </div>
            ) : (
              filteredConversations.map((conv) => (
                <button
                  key={conv.userId}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left ${
                    selectedConversation?.userId === conv.userId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  {/* Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {conv.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    {conv.unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                        {conv.unreadCount}
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-semibold truncate ${conv.unreadCount > 0 ? 'text-gray-900 dark:text-white' : 'text-gray-700 dark:text-gray-300'}`}>
                        {conv.userName}
                      </p>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {conv.lastMessageTime && formatTime(conv.lastMessageTime)}
                      </span>
                    </div>
                    {conv.studentNames.length > 0 && (
                      <p className="text-xs text-blue-600 truncate">
                        Parent of: {conv.studentNames.join(', ')}
                      </p>
                    )}
                    <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-gray-700 dark:text-gray-200 font-medium' : 'text-gray-500'}`}>
                      {conv.lastMessage || 'No messages'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col bg-[#e5ddd5] dark:bg-gray-900 ${!selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3 shadow-sm">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden p-1 text-gray-600"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>

                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {selectedConversation.userName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 dark:text-white truncate">
                    {selectedConversation.userName}
                  </p>
                  {selectedConversation.userPhone && (
                    <p className="text-xs text-gray-500">{selectedConversation.userPhone}</p>
                  )}
                </div>

                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Phone className="h-5 w-5" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <MoreVertical className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%239C92AC" fill-opacity="0.05"%3E%3Cpath d="m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")' }}>
                {loadingMessages ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <>
                    {messages.map((msg, index) => {
                      const isSchool = msg.senderType === 'school';
                      const showDate = index === 0 || (
                        new Date(messages[index - 1].createdAt).toDateString() !== new Date(msg.createdAt).toDateString()
                      );

                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="flex justify-center my-4">
                              <span className="px-3 py-1 bg-white/80 dark:bg-gray-700 rounded-full text-xs text-gray-500 shadow-sm">
                                {new Date(msg.createdAt).toLocaleDateString('en-US', {
                                  weekday: 'long',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          )}

                          <div className={`flex ${isSchool ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] ${
                              isSchool
                                ? 'bg-[#dcf8c6] dark:bg-green-800'
                                : 'bg-white dark:bg-gray-700'
                            } rounded-lg px-3 py-2 shadow-sm`}>
                              {/* Message type indicator */}
                              {msg.type === 'receipt' && (
                                <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                                  Payment Receipt
                                </div>
                              )}
                              {msg.type === 'fee_notice' && (
                                <div className="text-xs text-orange-600 dark:text-orange-400 font-medium mb-1">
                                  Fee Notice
                                </div>
                              )}
                              {msg.type === 'reminder' && (
                                <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">
                                  Payment Reminder
                                </div>
                              )}

                              {/* Message content */}
                              <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                                {msg.content}
                              </p>

                              {/* Time and status */}
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[10px] text-gray-500">
                                  {formatMessageTime(msg.createdAt)}
                                </span>
                                {isSchool && getMessageStatusIcon(msg.status)}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Message Input */}
              <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center gap-3">
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Smile className="h-6 w-6" />
                </button>
                <button className="p-2 text-gray-400 hover:text-gray-600">
                  <Paperclip className="h-6 w-6" />
                </button>

                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-full text-gray-900 dark:text-white placeholder-gray-500"
                />

                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="p-3 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </div>
            </>
          ) : (
            // Empty state when no conversation selected
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <GraduationCap className="h-12 w-12 text-white" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {schoolName}
                </h2>
                <BadgeCheck className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-sm text-blue-600 dark:text-blue-400 mb-4">
                Verified School Account
              </p>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                Send messages, receipts, and updates to parents. Select a conversation to start chatting.
              </p>
            </div>
          )}
        </div>
      </div>
    </SchoolLayout>
  );
}
