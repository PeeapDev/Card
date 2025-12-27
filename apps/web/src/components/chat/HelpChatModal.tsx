/**
 * HelpChatModal Component
 *
 * Instant help/support chat with AI-powered first response.
 * Features:
 * - AI responds first to understand user's issue
 * - Escalates to human support if needed
 * - Appears from the ? button in chat
 */

import { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Bot,
  Headphones,
  Loader2,
  ArrowRight,
  Sparkles,
  User,
} from 'lucide-react';
import { conversationService } from '@/services/conversation.service';
import { aiService } from '@/services/ai.service';
import { useAuth } from '@/context/AuthContext';

interface HelpMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai' | 'support';
  timestamp: Date;
}

interface HelpChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEscalate?: (conversationId: string) => void;
}

// Quick help topics
const QUICK_TOPICS = [
  { label: 'Payment Issue', value: 'payment_issue' },
  { label: 'Account Help', value: 'account_help' },
  { label: 'Transaction Failed', value: 'transaction_failed' },
  { label: 'Refund Request', value: 'refund_request' },
];

export function HelpChatModal({ isOpen, onClose, onEscalate }: HelpChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<HelpMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [escalated, setEscalated] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Add initial AI greeting
      setMessages([{
        id: 'greeting',
        content: `Hi${user?.firstName ? ` ${user.firstName}` : ''}! I'm your AI assistant. How can I help you today? You can describe your issue or choose a topic below.`,
        sender: 'ai',
        timestamp: new Date(),
      }]);
    }
  }, [isOpen, user?.firstName]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || loading) return;

    const userMessage: HelpMessage = {
      id: `user-${Date.now()}`,
      content: inputValue.trim(),
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setLoading(true);

    try {
      // Get AI response
      const aiResponse = await getAIResponse(userMessage.content, messages);

      const aiMessage: HelpMessage = {
        id: `ai-${Date.now()}`,
        content: aiResponse.message,
        sender: 'ai',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);

      // Check if AI suggests escalation
      if (aiResponse.shouldEscalate) {
        // Show escalation option after AI response
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: `escalate-prompt-${Date.now()}`,
            content: 'Would you like me to connect you with a human support agent for further assistance?',
            sender: 'ai',
            timestamp: new Date(),
          }]);
        }, 1000);
      }
    } catch (err) {
      console.error('AI response failed:', err);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: 'I apologize, but I encountered an issue. Would you like to speak with a human support agent?',
        sender: 'ai',
        timestamp: new Date(),
      }]);
    }

    setLoading(false);
  };

  const handleQuickTopic = (topic: string) => {
    const topicLabel = QUICK_TOPICS.find(t => t.value === topic)?.label || topic;
    setInputValue(`I need help with: ${topicLabel}`);
  };

  const handleEscalate = async () => {
    setLoading(true);

    try {
      // Create a support conversation with the chat history
      const chatHistory = messages
        .filter(m => m.sender === 'user')
        .map(m => m.content)
        .join('\n');

      const { conversation, error } = await conversationService.startSupportConversation({
        subject: 'Support Request (From AI Chat)',
        message: `User's initial inquiry:\n\n${chatHistory}\n\n---\nPrevious AI assistance was provided but user requested human support.`,
        department: 'support',
      });

      if (conversation) {
        setConversationId(conversation.id);
        setEscalated(true);
        setMessages(prev => [...prev, {
          id: `escalated-${Date.now()}`,
          content: 'You\'re now connected with our support team. A team member will respond shortly.',
          sender: 'support',
          timestamp: new Date(),
        }]);
        onEscalate?.(conversation.id);
      } else {
        throw new Error(error || 'Failed to connect');
      }
    } catch (err) {
      console.error('Escalation failed:', err);
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        content: 'Sorry, I couldn\'t connect you to support. Please try again or visit the Support page.',
        sender: 'ai',
        timestamp: new Date(),
      }]);
    }

    setLoading(false);
  };

  const handleClose = () => {
    // Reset state when closing
    setMessages([]);
    setEscalated(false);
    setConversationId(null);
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 w-96 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            {escalated ? (
              <Headphones className="w-4 h-4 text-white" />
            ) : (
              <Sparkles className="w-4 h-4 text-white" />
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">
              {escalated ? 'Support Team' : 'AI Assistant'}
            </h3>
            <p className="text-xs text-white/80">
              {escalated ? 'Connected to human support' : 'Quick help powered by AI'}
            </p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="p-1 hover:bg-white/20 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-900/50">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ${
              msg.sender === 'user'
                ? 'bg-primary-100 dark:bg-primary-900/30'
                : msg.sender === 'ai'
                ? 'bg-purple-100 dark:bg-purple-900/30'
                : 'bg-teal-100 dark:bg-teal-900/30'
            }`}>
              {msg.sender === 'user' ? (
                <User className="w-3.5 h-3.5 text-primary-600 dark:text-primary-400" />
              ) : msg.sender === 'ai' ? (
                <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              ) : (
                <Headphones className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              )}
            </div>

            {/* Message */}
            <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
              msg.sender === 'user'
                ? 'bg-primary-600 text-white rounded-tr-md'
                : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-md shadow-sm'
            }`}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="bg-white dark:bg-gray-800 px-3 py-2 rounded-2xl rounded-tl-md shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Topics */}
      {messages.length <= 1 && !escalated && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex flex-wrap gap-2">
            {QUICK_TOPICS.map(topic => (
              <button
                key={topic.value}
                onClick={() => handleQuickTopic(topic.value)}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {topic.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Escalate Button */}
      {!escalated && messages.length > 2 && (
        <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            onClick={handleEscalate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2 text-sm text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded-lg transition-colors disabled:opacity-50"
          >
            <Headphones className="w-4 h-4" />
            Talk to Human Support
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-end gap-2">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={escalated ? 'Message support...' : 'Describe your issue...'}
            rows={1}
            className="flex-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-none rounded-lg focus:ring-2 focus:ring-primary-500 outline-none dark:text-white resize-none"
            style={{ minHeight: '38px', maxHeight: '80px' }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || loading}
            className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// AI Response helper function
async function getAIResponse(
  userMessage: string,
  chatHistory: HelpMessage[]
): Promise<{ message: string; shouldEscalate: boolean }> {
  try {
    // Build user context from chat history if available
    const sessionId = `help-${Date.now()}`;

    // Use the AI service to get a response
    const response = await aiService.getSupportResponse(userMessage, undefined, sessionId);

    // Check if response suggests escalation
    const shouldEscalate =
      response.toLowerCase().includes('human support') ||
      response.toLowerCase().includes('support team') ||
      response.toLowerCase().includes('contact support') ||
      chatHistory.length > 4;

    return {
      message: response,
      shouldEscalate,
    };
  } catch (err) {
    console.error('AI response error:', err);
    // Fallback response
    return {
      message: getLocalFallbackResponse(userMessage),
      shouldEscalate: true,
    };
  }
}

// Local fallback responses when AI service is unavailable
function getLocalFallbackResponse(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('payment') || lowerMessage.includes('transaction')) {
    return 'I understand you\'re having a payment-related issue. Common solutions include:\n\n1. Check your wallet balance\n2. Ensure the recipient details are correct\n3. Try refreshing and attempting again\n\nIf this doesn\'t resolve your issue, I can connect you with our support team.';
  }

  if (lowerMessage.includes('account') || lowerMessage.includes('login') || lowerMessage.includes('password')) {
    return 'For account-related issues:\n\n1. Try resetting your password using "Forgot Password"\n2. Ensure you\'re using the correct email/phone\n3. Clear your browser cache and try again\n\nWould you like to speak with a support agent?';
  }

  if (lowerMessage.includes('refund') || lowerMessage.includes('money back')) {
    return 'I\'ll help you with your refund request. To process this:\n\n1. Please provide your transaction ID\n2. Explain the reason for the refund\n\nRefunds are typically processed within 3-5 business days. For immediate assistance, I can connect you with our support team.';
  }

  return 'Thank you for reaching out. I\'m here to help! Could you please provide more details about your issue so I can better assist you? Or if you prefer, I can connect you directly with our support team.';
}
