/**
 * Messages Page
 *
 * User/Merchant view for all conversations.
 * Features:
 * - View all conversations
 * - Start new support conversation
 * - Real-time messaging
 * - File attachments
 */

import { useState, useEffect, ReactNode } from 'react';
import {
  MessageSquare,
  Plus,
  HelpCircle,
  X,
  Send,
  Users,
  Bot,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ConversationList, ChatThread } from '@/components/chat';
import { conversationService, Conversation } from '@/services/conversation.service';
import { useAuth } from '@/context/AuthContext';
import { UserSearch, SearchResult } from '@/components/ui/UserSearch';

export default function MessagesPage() {
  const { user, activeRole } = useAuth();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [newMessage, setNewMessage] = useState({ recipient: null as SearchResult | null, message: '' });
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleStartDirectMessage = async () => {
    if (!newMessage.recipient || !newMessage.message) return;

    setCreating(true);
    const recipientName = `${newMessage.recipient.first_name} ${newMessage.recipient.last_name}`.trim();

    const { conversation, error } = await conversationService.startConversation({
      type: 'general',
      subject: recipientName,
      participantIds: [newMessage.recipient.id],
      initialMessage: newMessage.message,
    });

    if (conversation) {
      setSelectedConversation(conversation);
      setShowNewMessage(false);
      setNewMessage({ recipient: null, message: '' });
      setRefreshKey(prev => prev + 1);
    } else {
      alert(error || 'Failed to start conversation');
    }
    setCreating(false);
  };

  // Start a support conversation with AI as first responder
  const handleStartAISupport = async () => {
    setCreating(true);

    // Create support conversation - AI will be the first responder
    const { conversation, error } = await conversationService.startSupportConversation({
      subject: 'Help & Support',
      message: 'Hi, I need some help.',
      department: 'support',
    });

    if (conversation) {
      // AI sends initial greeting
      await conversationService.sendMessage({
        conversationId: conversation.id,
        content: `Hi${user?.firstName ? ` ${user.firstName}` : ''}! 👋 I'm your AI assistant. How can I help you today?\n\nYou can ask me about:\n• Payments & Transactions\n• Account Settings\n• Business Features\n• Technical Issues\n\nIf I can't resolve your issue, I'll connect you with a human support agent.`,
        senderType: 'support',
        senderName: 'AI Assistant',
        messageType: 'text',
      });

      setSelectedConversation(conversation);
      setRefreshKey(prev => prev + 1);
    } else {
      alert(error || 'Failed to start support conversation');
    }
    setCreating(false);
  };

  const userRole = user?.roles?.some(r => r === 'merchant' || r === 'admin') ? 'merchant' : 'user';

  // Choose layout based on active role
  const Layout = activeRole === 'merchant' ? MerchantLayout
               : activeRole === 'admin' || activeRole === 'superadmin' ? AdminLayout
               : MainLayout;

  return (
    <Layout>
      <div className="h-[calc(100vh-4rem)]">
        {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Messages</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your conversations and support requests
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewMessage(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              <Plus className="w-4 h-4" />
              New Message
            </button>
            <button
              onClick={handleStartAISupport}
              disabled={creating}
              className="p-2.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors disabled:opacity-50"
              title="Get Help"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100%-5rem)]">
        {/* Conversation List */}
        <div className="w-96 border-r border-gray-200 dark:border-gray-700">
          <ConversationList
            key={refreshKey}
            mode="user"
            selectedId={selectedConversation?.id}
            onSelectConversation={setSelectedConversation}
            onNewConversation={() => setShowNewMessage(true)}
          />
        </div>

        {/* Chat Thread */}
        <div className="flex-1">
          {selectedConversation ? (
            <ChatThread
              conversation={selectedConversation}
              userRole={userRole}
              onConversationUpdate={() => {
                conversationService.getConversation(selectedConversation.id)
                  .then(conv => conv && setSelectedConversation(conv));
              }}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="mb-4">Select a conversation or start a new one</p>
                <div className="flex items-center gap-2 justify-center">
                  <button
                    onClick={() => setShowNewMessage(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                    New Message
                  </button>
                  <button
                    onClick={handleStartAISupport}
                    disabled={creating}
                    className="p-2.5 bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 rounded-lg hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-colors disabled:opacity-50"
                    title="Get Help"
                  >
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* New Direct Message Modal */}
      {showNewMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">New Message</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Start a conversation with someone</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowNewMessage(false);
                  setNewMessage({ recipient: null, message: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Recipient Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To
                </label>
                {newMessage.recipient ? (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    {newMessage.recipient.profile_picture ? (
                      <img
                        src={newMessage.recipient.profile_picture}
                        alt=""
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 dark:text-primary-300 font-medium">
                          {newMessage.recipient.first_name?.charAt(0)}{newMessage.recipient.last_name?.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {newMessage.recipient.first_name} {newMessage.recipient.last_name}
                      </p>
                      {newMessage.recipient.username && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">@{newMessage.recipient.username}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setNewMessage({ ...newMessage, recipient: null })}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <UserSearch
                    onSelect={(selectedUser) => setNewMessage({ ...newMessage, recipient: selectedUser })}
                    placeholder="Search by name, @username, or phone..."
                    excludeUserId={user?.id}
                    autoFocus
                  />
                )}
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message
                </label>
                <textarea
                  value={newMessage.message}
                  onChange={(e) => setNewMessage({ ...newMessage, message: e.target.value })}
                  placeholder="Type your message..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleStartDirectMessage}
                disabled={!newMessage.recipient || !newMessage.message || creating}
                className="w-full flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>Sending...</>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </Layout>
  );
}
