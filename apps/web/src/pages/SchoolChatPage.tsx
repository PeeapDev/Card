import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, Button, Input } from '@/components/ui';
import {
  ArrowLeft,
  Send,
  CheckCheck,
  Check,
  BadgeCheck,
  FileText,
  Receipt,
  Bell,
  Loader2,
  MessageSquare,
  Users,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface ChatMessage {
  id: string;
  sender_type: 'school' | 'parent' | 'system';
  sender_name?: string;
  sender_role?: string;
  message_type: string;
  content?: string;
  rich_content?: any;
  attachments?: any[];
  reply_to_message_id?: string;
  status?: string;
  created_at: string;
  is_verified: boolean;
}

interface ChatThread {
  id: string;
  school_name: string;
  school_logo_url?: string;
  thread_type: string;
  last_message?: string;
  last_message_at?: string;
  unread_count: number;
  children: Array<{ nsi: string; name: string }>;
}

export function SchoolChatPage() {
  const { threadId } = useParams<{ threadId?: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Fetch threads
  useEffect(() => {
    if (!user) return;

    const fetchThreads = async () => {
      setLoading(true);
      try {
        // First, get threads
        const { data: threadsData, error: threadsError } = await supabase
          .from('school_chat_threads')
          .select('*')
          .eq('parent_user_id', user.id)
          .eq('status', 'active')
          .order('last_message_at', { ascending: false, nullsFirst: false });

        if (threadsError) {
          // Table might not exist yet - silently handle
          console.warn('Chat tables not ready:', threadsError.message);
          setThreads([]);
          setLoading(false);
          return;
        }

        if (!threadsData || threadsData.length === 0) {
          setThreads([]);
          setLoading(false);
          return;
        }

        // Then fetch children for each thread's connection
        const formattedThreads: ChatThread[] = [];

        for (const t of threadsData || []) {
          let children: Array<{ nsi: string; name: string }> = [];

          if (t.parent_connection_id) {
            const { data: childrenData } = await supabase
              .from('school_parent_children')
              .select('nsi, student_name')
              .eq('connection_id', t.parent_connection_id);

            children = (childrenData || []).map((c: any) => ({
              nsi: c.nsi,
              name: c.student_name,
            }));
          }

          formattedThreads.push({
            id: t.id,
            school_name: t.school_name,
            school_logo_url: t.school_logo_url,
            thread_type: t.thread_type,
            last_message: t.last_message_preview,
            last_message_at: t.last_message_at,
            unread_count: t.parent_unread_count || 0,
            children,
          });
        }

        setThreads(formattedThreads);

        // If threadId is provided, select that thread
        if (threadId) {
          const thread = formattedThreads.find(t => t.id === threadId);
          if (thread) {
            setSelectedThread(thread);
          }
        }
      } catch (error) {
        console.error('Error fetching threads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchThreads();
  }, [user, threadId]);

  // Fetch messages when thread is selected
  useEffect(() => {
    if (!selectedThread) return;

    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('school_chat_messages')
          .select('*')
          .eq('thread_id', selectedThread.id)
          .order('created_at', { ascending: true });

        if (error) throw error;

        setMessages((data || []).map((m: any) => ({
          ...m,
          is_verified: m.sender_type === 'school',
        })));

        // Mark as read
        await supabase
          .from('school_chat_messages')
          .update({ status: 'read', read_at: new Date().toISOString() })
          .eq('thread_id', selectedThread.id)
          .eq('sender_type', 'school')
          .is('read_at', null);

        // Reset unread count
        await supabase
          .from('school_chat_threads')
          .update({ parent_unread_count: 0 })
          .eq('id', selectedThread.id);

        // Update local state
        setThreads(prev =>
          prev.map(t =>
            t.id === selectedThread.id ? { ...t, unread_count: 0 } : t
          )
        );
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const subscription = supabase
      .channel(`thread-${selectedThread.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'school_chat_messages',
          filter: `thread_id=eq.${selectedThread.id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          setMessages(prev => [...prev, {
            ...newMsg,
            is_verified: newMsg.sender_type === 'school',
          }]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [selectedThread]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedThread || !user) return;

    setSending(true);
    try {
      const { error } = await supabase.from('school_chat_messages').insert({
        thread_id: selectedThread.id,
        sender_type: 'parent',
        sender_id: user.id,
        sender_name: (user as any).full_name || (user as any).first_name || user.email,
        message_type: 'text',
        content: newMessage.trim(),
        status: 'sent',
      });

      if (error) throw error;

      // Update thread
      await supabase
        .from('school_chat_threads')
        .update({
          last_message_preview: newMessage.trim().substring(0, 100),
          last_message_at: new Date().toISOString(),
          last_message_by: 'parent',
        })
        .eq('id', selectedThread.id);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diff < 7 * 24 * 60 * 60 * 1000) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const renderMessageContent = (message: ChatMessage) => {
    switch (message.message_type) {
      case 'invoice':
        return (
          <div className="bg-white border rounded-lg p-4 max-w-sm">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <FileText className="w-5 h-5" />
              <span className="font-semibold">Fee Invoice</span>
            </div>
            {message.rich_content && (
              <>
                <p className="text-sm text-gray-600 mb-1">
                  Student: {message.rich_content.student_name}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Class: {message.rich_content.class_name}
                </p>
                <div className="border-t pt-2 mt-2">
                  {message.rich_content.items?.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span>SLE {item.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold">
                  <span>Total Due</span>
                  <span>SLE {message.rich_content.total_due?.toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Due: {new Date(message.rich_content.due_date).toLocaleDateString()}
                </p>
                <Button
                  className="w-full mt-3"
                  size="sm"
                  onClick={() => navigate(`/pay/invoice/${message.rich_content.invoice_id}`)}
                >
                  Pay Now
                </Button>
              </>
            )}
          </div>
        );

      case 'receipt':
        return (
          <div className="bg-white border border-green-200 rounded-lg p-4 max-w-sm">
            <div className="flex items-center gap-2 text-green-600 mb-2">
              <Receipt className="w-5 h-5" />
              <span className="font-semibold">Payment Receipt</span>
            </div>
            {message.rich_content && (
              <>
                <p className="text-sm text-gray-600 mb-1">
                  Receipt #: {message.rich_content.receipt_number}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  Student: {message.rich_content.student_name}
                </p>
                <div className="border-t pt-2 mt-2 flex justify-between font-semibold text-green-700">
                  <span>Amount Paid</span>
                  <span>
                    {message.rich_content.currency} {message.rich_content.amount_paid?.toLocaleString()}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Paid: {new Date(message.rich_content.paid_at).toLocaleString()}
                </p>
              </>
            )}
          </div>
        );

      case 'announcement':
        return (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 max-w-sm">
            <div className="flex items-center gap-2 text-yellow-700 mb-2">
              <Bell className="w-5 h-5" />
              <span className="font-semibold">
                {message.rich_content?.title || 'Announcement'}
              </span>
            </div>
            <p className="text-sm text-gray-700">{message.content}</p>
            {message.rich_content?.event_date && (
              <p className="text-xs text-gray-500 mt-2">
                Event Date: {new Date(message.rich_content.event_date).toLocaleDateString()}
              </p>
            )}
          </div>
        );

      case 'system':
        return (
          <div className="text-center py-2">
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {message.content}
            </span>
          </div>
        );

      default:
        return <p className="whitespace-pre-wrap">{message.content}</p>;
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MainLayout>
    );
  }

  // No threads - show empty state
  if (threads.length === 0) {
    return (
      <MainLayout>
        <Card className="p-0">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <MessageSquare className="w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No School Connections</h3>
            <p className="text-gray-500 text-center max-w-md mb-6">
              Connect to your child's school from their parent portal to receive
              notifications and chat with the school directly.
            </p>
            <Button onClick={() => navigate('/my-children')}>
              Manage My Children
            </Button>
          </div>
        </Card>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-12rem)] bg-white rounded-lg shadow overflow-hidden">
        {/* Thread List */}
        <div className={`w-80 border-r flex-shrink-0 ${selectedThread ? 'hidden md:flex' : 'flex'} flex-col`}>
          <div className="p-4 border-b">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              School Messages
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => {
                  setSelectedThread(thread);
                  navigate(`/school-chat/${thread.id}`);
                }}
                className={`w-full p-4 text-left hover:bg-gray-50 border-b transition-colors ${
                  selectedThread?.id === thread.id ? 'bg-primary-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {thread.school_logo_url ? (
                    <img
                      src={thread.school_logo_url}
                      alt={thread.school_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium truncate">{thread.school_name}</span>
                      <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    </div>
                    {thread.children.length > 0 && (
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {thread.children.map(c => c.name).join(', ')}
                      </p>
                    )}
                    {thread.last_message && (
                      <p className="text-sm text-gray-600 truncate mt-1">
                        {thread.last_message}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {thread.last_message_at && (
                      <span className="text-xs text-gray-400">
                        {formatTime(thread.last_message_at)}
                      </span>
                    )}
                    {thread.unread_count > 0 && (
                      <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                        {thread.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        {selectedThread ? (
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedThread(null);
                  navigate('/school-chat');
                }}
                className="md:hidden p-1 hover:bg-gray-100 rounded"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              {selectedThread.school_logo_url ? (
                <img
                  src={selectedThread.school_logo_url}
                  alt={selectedThread.school_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <GraduationCap className="w-5 h-5 text-primary-600" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1">
                  <h3 className="font-semibold">{selectedThread.school_name}</h3>
                  <BadgeCheck className="w-4 h-4 text-blue-500" />
                </div>
                {selectedThread.children.length > 0 && (
                  <p className="text-xs text-gray-500">
                    Children: {selectedThread.children.map(c => c.name).join(', ')}
                  </p>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_type === 'parent' ? 'justify-end' : 'justify-start'
                  } ${message.message_type === 'system' ? 'justify-center' : ''}`}
                >
                  {message.message_type === 'system' ? (
                    renderMessageContent(message)
                  ) : (
                    <div
                      className={`max-w-[70%] ${
                        message.sender_type === 'parent'
                          ? 'bg-primary-600 text-white rounded-l-lg rounded-tr-lg'
                          : 'bg-gray-100 rounded-r-lg rounded-tl-lg'
                      } p-3`}
                    >
                      {message.sender_type === 'school' && (
                        <div className="flex items-center gap-1 mb-1">
                          <span className="text-xs font-medium text-gray-600">
                            {message.sender_name}
                          </span>
                          {message.sender_role && (
                            <span className="text-xs text-gray-400">
                              • {message.sender_role}
                            </span>
                          )}
                          {message.is_verified && (
                            <BadgeCheck className="w-3 h-3 text-blue-500" />
                          )}
                        </div>
                      )}
                      {renderMessageContent(message)}
                      <div
                        className={`flex items-center justify-end gap-1 mt-1 ${
                          message.sender_type === 'parent' ? 'text-primary-200' : 'text-gray-400'
                        }`}
                      >
                        <span className="text-xs">{formatTime(message.created_at)}</span>
                        {message.sender_type === 'parent' && (
                          message.status === 'read' ? (
                            <CheckCheck className="w-3 h-3" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex gap-2"
              >
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button type="submit" disabled={sending || !newMessage.trim()}>
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

export default SchoolChatPage;
