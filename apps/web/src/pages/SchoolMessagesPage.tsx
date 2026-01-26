/**
 * School Messages Page
 * Parents view receipts, invoices, and messages from schools
 * Similar to POS receipt viewing - this is where receipts are sent when fees are paid
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  MessageSquare,
  Receipt,
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  ChevronRight,
  GraduationCap,
  CreditCard,
  X,
  Download,
  Printer,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { MainLayout } from '@/components/layout/MainLayout';
import { schoolChatService, type ChatMessage } from '@/services/schoolChat.service';

export function SchoolMessagesPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<ChatMessage | null>(null);

  useEffect(() => {
    if (user?.id) {
      loadMessages();
    }
  }, [user?.id]);

  const loadMessages = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const data = await schoolChatService.getMessagesForUser(user.id);
      setMessages(data);
    } catch (err) {
      console.error('Error loading messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMessage = async (message: ChatMessage) => {
    setSelectedMessage(message);
    // Mark as read
    if (message.status !== 'read') {
      await schoolChatService.markAsRead(message.id);
      setMessages(prev =>
        prev.map(m => m.id === message.id ? { ...m, status: 'read' } : m)
      );
    }
  };

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'receipt': return <Receipt className="h-5 w-5 text-green-600" />;
      case 'invoice': return <FileText className="h-5 w-5 text-blue-600" />;
      case 'fee_notice': return <AlertCircle className="h-5 w-5 text-orange-600" />;
      case 'salary_slip': return <CreditCard className="h-5 w-5 text-purple-600" />;
      case 'reminder': return <Clock className="h-5 w-5 text-red-600" />;
      default: return <MessageSquare className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMessageTitle = (message: ChatMessage) => {
    const metadata = message.metadata || {};
    switch (message.type) {
      case 'receipt':
        return `Payment Receipt #${metadata.receipt_number || 'N/A'}`;
      case 'fee_notice':
        return `Fee Notice - ${metadata.student_name || 'Student'}`;
      case 'salary_slip':
        return `Salary Slip - ${metadata.month || 'N/A'}`;
      case 'reminder':
        return `Payment Reminder #${metadata.invoice_number || 'N/A'}`;
      default:
        return 'School Message';
    }
  };

  const getMessageSubtitle = (message: ChatMessage) => {
    const metadata = message.metadata || {};
    if (metadata.school_name) return metadata.school_name;
    if (metadata.amount) return `SLE ${(metadata.amount / 100).toLocaleString()}`;
    return '';
  };

  const formatDate = (dateStr: string) => {
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

  const unreadCount = messages.filter(m => m.status !== 'read').length;

  // Group messages by date
  const groupedMessages = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups[date]) groups[date] = [];
    groups[date].push(message);
    return groups;
  }, {} as Record<string, ChatMessage[]>);

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <MessageSquare className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">School Messages</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                Receipts, invoices, and updates from schools
              </p>
            </div>
          </div>
          <button
            onClick={loadMessages}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
              {unreadCount}
            </div>
            <span className="text-blue-700 dark:text-blue-300 text-sm">
              unread message{unreadCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading messages...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <GraduationCap className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              No messages yet
            </h2>
            <p className="text-gray-500 mb-6 max-w-sm mx-auto">
              When you receive receipts, invoices, or messages from schools, they will appear here.
            </p>
            <Link
              to="/my-children"
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Link your children to receive school updates
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMessages).map(([date, dateMessages]) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2 px-2">
                  {date}
                </h3>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm divide-y divide-gray-100 dark:divide-gray-700">
                  {dateMessages.map((message) => (
                    <button
                      key={message.id}
                      onClick={() => handleOpenMessage(message)}
                      className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
                    >
                      {/* Icon */}
                      <div className={`p-3 rounded-xl ${
                        message.status !== 'read' ? 'bg-blue-100 dark:bg-blue-900/50' : 'bg-gray-100 dark:bg-gray-700'
                      }`}>
                        {getMessageIcon(message.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-medium truncate ${
                            message.status !== 'read' ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'
                          }`}>
                            {getMessageTitle(message)}
                          </p>
                          {message.status !== 'read' && (
                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {getMessageSubtitle(message)}
                        </p>
                      </div>

                      {/* Time & arrow */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(message.createdAt)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Message Detail Modal */}
        {selectedMessage && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getMessageIcon(selectedMessage.type)}
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {getMessageTitle(selectedMessage)}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {new Date(selectedMessage.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {/* Message content */}
                <div className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 text-sm leading-relaxed font-mono bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  {selectedMessage.content}
                </div>

                {/* Action button for fee notices */}
                {selectedMessage.type === 'fee_notice' && selectedMessage.metadata?.invoice_id && (
                  <Link
                    to={`/my-children`}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                  >
                    <CreditCard className="h-5 w-5" />
                    Pay Fee
                  </Link>
                )}

                {/* Receipt success indicator */}
                {selectedMessage.type === 'receipt' && (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">Payment Confirmed</p>
                      <p className="text-sm text-green-600 dark:text-green-400">
                        Transaction: {selectedMessage.metadata?.transaction_id}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => window.print()}
                  className="flex-1 flex items-center justify-center gap-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                >
                  <Printer className="h-4 w-4" />
                  Print
                </button>
                <button
                  onClick={() => setSelectedMessage(null)}
                  className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
