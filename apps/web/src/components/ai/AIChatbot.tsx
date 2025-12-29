/**
 * AI Support Chatbot
 *
 * Floating chat widget for AI-powered customer support.
 * Uses Groq for fast, intelligent responses.
 */

import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Bot, User, Minimize2, Maximize2, Sparkles, AlertTriangle } from 'lucide-react';
import { aiService, ChatMessage, ChatSession } from '@/services/ai.service';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ActiveDispute {
  id: string;
  status: string;
  reason: string;
  amount: number;
}

const SUGGESTED_QUESTIONS = [
  'How do I make a payment?',
  'What are the transaction fees?',
  'How do I add money to my wallet?',
  'How do I become a merchant?',
];

const DISPUTE_QUESTIONS = [
  'What is the status of my dispute?',
  'How long does a dispute take?',
  'What happens next with my dispute?',
  'Can I add more evidence?',
];

// Routes where AI chatbot should be hidden (POS pages need full screen space)
const HIDDEN_ROUTES = [
  '/dashboard/pos',
  '/merchant/pos',
  '/pos/',
  '/collect-payment',
];

export function AIChatbot() {
  const { user } = useAuth();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<ChatSession | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if we should hide on current route (POS pages)
  const shouldHide = HIDDEN_ROUTES.some(route => location.pathname.startsWith(route));

  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkConfiguration = async () => {
    await aiService.initialize();
    setIsConfigured(aiService.isConfigured());
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleOpen = async () => {
    setIsOpen(true);
    setIsMinimized(false);

    // Create welcome message if no messages yet
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello${user?.firstName ? ` ${user.firstName}` : ''}! I'm your AI assistant. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);

      // Create a chat session if user is logged in
      if (user?.id) {
        const newSession = await aiService.createChatSession(user.id, 'support');
        setSession(newSession);
      }
    }
  };

  const handleSend = async (messageText?: string) => {
    const text = messageText || inputValue.trim();
    if (!text || isLoading) return;

    setInputValue('');
    setError(null);

    // Add user message
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);

    // Save to database if session exists
    if (session) {
      await aiService.saveChatMessage(session.id, 'user', text);
    }

    setIsLoading(true);

    try {
      // Get AI response with full user context
      const userRoles = user?.roles || [];
      const response = await aiService.getSupportResponse(text, {
        userName: user?.firstName,
        userEmail: user?.email,
        userRole: userRoles[0] || 'user',
        isMerchant: userRoles.includes('merchant') || userRoles.includes('admin'),
        isVerified: user?.kycStatus === 'VERIFIED' || user?.kycStatus === 'APPROVED',
      });

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Save to database if session exists
      if (session) {
        await aiService.saveChatMessage(session.id, 'assistant', response);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Don't render if AI is not configured or on hidden routes (POS pages)
  if (!isConfigured || shouldHide) {
    return null;
  }

  return (
    <>
      {/* Chat Button - Higher on mobile to not block footer nav */}
      {!isOpen && (
        <button
          onClick={handleOpen}
          className="fixed bottom-24 md:bottom-6 right-4 md:right-6 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full shadow-lg flex items-center justify-center text-white hover:from-purple-700 hover:to-indigo-700 transition-all z-40 group"
        >
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          <span className="absolute -top-10 right-0 bg-gray-900 text-white text-xs px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
            AI Support
          </span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed right-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col z-50 transition-all duration-300 ${
            isMinimized ? 'bottom-6 w-72 h-14' : 'bottom-6 w-96 h-[500px]'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">AI Support</h3>
                {!isMinimized && (
                  <p className="text-white/70 text-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Powered by Groq
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                {isMinimized ? (
                  <Maximize2 className="w-4 h-4 text-white" />
                ) : (
                  <Minimize2 className="w-4 h-4 text-white" />
                )}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user'
                          ? 'bg-primary-100 dark:bg-primary-900/30'
                          : 'bg-purple-100 dark:bg-purple-900/30'
                      }`}
                    >
                      {message.role === 'user' ? (
                        <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                      ) : (
                        <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                    <div
                      className={`max-w-[75%] p-3 rounded-2xl ${
                        message.role === 'user'
                          ? 'bg-primary-600 text-white rounded-tr-md'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-md'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          message.role === 'user' ? 'text-white/70' : 'text-gray-400'
                        }`}
                      >
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-2">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-md p-3">
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                        <span className="text-sm text-gray-500">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 text-sm text-red-600 dark:text-red-400">
                    {error}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Suggested Questions (only show at start) */}
              {messages.length === 1 && !isLoading && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {SUGGESTED_QUESTIONS.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => handleSend(question)}
                        className="text-xs px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    disabled={isLoading}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full text-sm focus:ring-2 focus:ring-purple-500 outline-none dark:text-white disabled:opacity-50"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!inputValue.trim() || isLoading}
                    className="p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
