/**
 * DisputeThread Component
 *
 * 3-way messaging interface for dispute resolution.
 * Used by: Customer, Merchant, and Admin
 *
 * Features:
 * - Real-time messaging
 * - Evidence upload
 * - AI analysis display (admin only)
 * - Status updates
 * - Read receipts
 */

import { useState, useEffect, useRef } from 'react';
import {
  Send,
  Paperclip,
  User,
  Store,
  Shield,
  Bot,
  Loader2,
  CheckCheck,
  Clock,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { disputeService, Dispute, DisputeMessage, DISPUTE_STATUSES, DISPUTE_REASONS, SenderType, DisputeStatus } from '@/services/dispute.service';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';

interface DisputeThreadProps {
  dispute: Dispute;
  userRole: 'customer' | 'merchant' | 'admin';
  onStatusChange?: () => void;
  showAIAnalysis?: boolean;
}

export function DisputeThread({ dispute, userRole, onStatusChange, showAIAnalysis = false }: DisputeThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DisputeMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showDetails, setShowDetails] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();

    // Subscribe to real-time updates
    const unsubscribe = disputeService.subscribeToMessages(dispute.id, (newMessage) => {
      setMessages(prev => [...prev, newMessage]);
      scrollToBottom();
    });

    return () => unsubscribe();
  }, [dispute.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const msgs = await disputeService.getMessages(dispute.id, userRole === 'admin');
    setMessages(msgs);
    setLoading(false);

    // Mark as read
    if (user?.id) {
      await disputeService.markMessagesRead(dispute.id, user.id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    setSending(true);
    const content = inputValue.trim();
    setInputValue('');

    const senderName = userRole === 'customer'
      ? dispute.customer_name || user?.firstName
      : userRole === 'merchant'
        ? dispute.business_name || 'Merchant'
        : user?.firstName || 'Admin';

    await disputeService.sendMessage({
      dispute_id: dispute.id,
      sender_type: userRole,
      sender_name: senderName,
      content,
      message_type: 'message',
    });

    setSending(false);
    onStatusChange?.();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const uploaderType = userRole === 'admin' ? 'merchant' : userRole;
    await disputeService.uploadEvidence(dispute.id, file, uploaderType as 'customer' | 'merchant');
    setUploading(false);
    onStatusChange?.();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getSenderIcon = (senderType: SenderType) => {
    switch (senderType) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'merchant':
        return <Store className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'ai':
        return <Bot className="w-4 h-4" />;
      case 'system':
        return <Info className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getSenderColor = (senderType: SenderType) => {
    switch (senderType) {
      case 'customer':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'merchant':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'admin':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'ai':
        return 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400';
      case 'system':
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getMessageBubbleStyle = (senderType: SenderType, isOwnMessage: boolean) => {
    if (senderType === 'system') {
      return 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center mx-auto max-w-md';
    }
    if (senderType === 'ai') {
      return 'bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800';
    }
    if (isOwnMessage) {
      return 'bg-primary-600 text-white ml-auto';
    }
    return 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white';
  };

  const isOwnMessage = (msg: DisputeMessage) => {
    return msg.sender_type === userRole;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isDisputeClosed = ['resolved', 'won', 'lost', 'closed'].includes(dispute.status);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Dispute Header/Details */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${getSenderColor('customer')}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {DISPUTE_REASONS[dispute.reason as keyof typeof DISPUTE_REASONS] || dispute.reason}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {dispute.currency} {dispute.amount.toLocaleString()} &bull; {DISPUTE_STATUSES[dispute.status]?.label || dispute.status}
              </p>
            </div>
          </div>
          {showDetails ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </button>

        {showDetails && (
          <div className="px-4 pb-4 space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Customer</span>
                <p className="font-medium text-gray-900 dark:text-white">{dispute.customer_name || dispute.customer_email}</p>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Business</span>
                <p className="font-medium text-gray-900 dark:text-white">{dispute.business_name || 'N/A'}</p>
              </div>
            </div>

            {dispute.description && (
              <div>
                <span className="text-gray-500 dark:text-gray-400">Description</span>
                <p className="text-gray-900 dark:text-white">{dispute.description}</p>
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              <span>Created {formatDistanceToNow(new Date(dispute.created_at))} ago</span>
              {dispute.merchant_deadline && (
                <span>
                  Merchant deadline: {new Date(dispute.merchant_deadline).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* AI Analysis Badge (Admin only) */}
            {showAIAnalysis && dispute.fraud_risk_score !== undefined && (
              <div className="flex items-center gap-2 p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <Bot className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-purple-700 dark:text-purple-300">
                  AI Fraud Risk: <span className={`font-semibold ${
                    dispute.fraud_risk_score > 70 ? 'text-red-600' :
                    dispute.fraud_risk_score > 40 ? 'text-yellow-600' : 'text-green-600'
                  }`}>{dispute.fraud_risk_score}%</span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${isOwnMessage(msg) ? 'justify-end' : 'justify-start'} ${
                msg.sender_type === 'system' ? 'justify-center' : ''
              }`}
            >
              <div className={`max-w-[80%] ${msg.sender_type === 'system' ? 'max-w-md' : ''}`}>
                {/* Sender Label */}
                {msg.sender_type !== 'system' && !isOwnMessage(msg) && (
                  <div className="flex items-center gap-2 mb-1 ml-1">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${getSenderColor(msg.sender_type)}`}>
                      {getSenderIcon(msg.sender_type)}
                    </div>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {msg.sender_name || msg.sender_type}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  className={`px-4 py-2 rounded-2xl ${getMessageBubbleStyle(msg.sender_type, isOwnMessage(msg))} ${
                    isOwnMessage(msg) ? 'rounded-tr-md' : 'rounded-tl-md'
                  }`}
                >
                  {/* AI Analysis Header */}
                  {msg.sender_type === 'ai' && (
                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-200 dark:border-purple-700">
                      <Sparkles className="w-4 h-4 text-purple-600" />
                      <span className="font-semibold text-purple-800 dark:text-purple-300">AI Analysis</span>
                    </div>
                  )}

                  {/* Message Content */}
                  <div className={`text-sm whitespace-pre-wrap ${
                    msg.sender_type === 'system' ? 'text-gray-600 dark:text-gray-400' : ''
                  }`}>
                    {msg.content.split('\n').map((line, i) => {
                      // Handle markdown-style bold
                      const parts = line.split(/\*\*(.*?)\*\*/);
                      return (
                        <span key={i}>
                          {parts.map((part, j) =>
                            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                          )}
                          {i < msg.content.split('\n').length - 1 && <br />}
                        </span>
                      );
                    })}
                  </div>

                  {/* Attachments */}
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600 space-y-2">
                      {msg.attachments.map((attachment, i) => (
                        <a
                          key={i}
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {attachment.type?.startsWith('image/') ? (
                            <ImageIcon className="w-4 h-4" />
                          ) : (
                            <FileText className="w-4 h-4" />
                          )}
                          <span className="truncate">{attachment.name}</span>
                          <Download className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${
                  isOwnMessage(msg) ? 'justify-end mr-1' : 'ml-1'
                }`}>
                  <span>{formatTime(msg.created_at)}</span>
                  {isOwnMessage(msg) && (
                    <CheckCheck className="w-3 h-3" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {!isDisputeClosed ? (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-end gap-2">
            {/* File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg disabled:opacity-50"
              title="Attach file"
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Paperclip className="w-5 h-5" />
              )}
            </button>

            {/* Text Input */}
            <div className="flex-1">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                rows={1}
                className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white resize-none"
                style={{ minHeight: '40px', maxHeight: '120px' }}
              />
            </div>

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!inputValue.trim() || sending}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Role Indicator */}
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
            <div className={`w-4 h-4 rounded-full flex items-center justify-center ${getSenderColor(userRole)}`}>
              {getSenderIcon(userRole)}
            </div>
            <span>Sending as {userRole.charAt(0).toUpperCase() + userRole.slice(1)}</span>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-200 dark:border-gray-700">
          {/* Resolution Outcome Banner */}
          <div className={`p-4 ${
            dispute.status === 'won' ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' :
            dispute.status === 'lost' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
            'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  dispute.status === 'won' ? 'bg-green-100 dark:bg-green-900/50' :
                  dispute.status === 'lost' ? 'bg-red-100 dark:bg-red-900/50' :
                  'bg-gray-100 dark:bg-gray-700'
                }`}>
                  {dispute.status === 'won' ? (
                    <CheckCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : dispute.status === 'lost' ? (
                    <X className="w-5 h-5 text-red-600 dark:text-red-400" />
                  ) : (
                    <CheckCheck className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div>
                  <p className={`font-medium ${
                    dispute.status === 'won' ? 'text-green-800 dark:text-green-300' :
                    dispute.status === 'lost' ? 'text-red-800 dark:text-red-300' :
                    'text-gray-800 dark:text-gray-300'
                  }`}>
                    Dispute {dispute.status === 'won' ? 'Won' :
                            dispute.status === 'lost' ? 'Lost' :
                            dispute.status === 'closed' ? 'Closed' : 'Resolved'}
                  </p>
                  {dispute.resolution && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                      {dispute.resolution === 'full_refund' && 'Full refund issued'}
                      {dispute.resolution === 'partial_refund' && `Partial refund: ${dispute.currency} ${dispute.resolution_amount?.toLocaleString()}`}
                      {dispute.resolution === 'favor_merchant' && 'Resolved in favor of merchant'}
                      {dispute.resolution === 'favor_customer' && 'Resolved in favor of customer'}
                      {dispute.resolution === 'no_action' && 'No action taken'}
                      {dispute.resolution === 'chargeback' && 'Chargeback processed'}
                    </p>
                  )}
                  {dispute.resolved_at && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Resolved {formatDistanceToNow(new Date(dispute.resolved_at))} ago
                    </p>
                  )}
                </div>
              </div>

              {/* Admin: Reopen Button */}
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    const reason = prompt('Reason for reopening this dispute:');
                    if (reason) {
                      disputeService.reopenDispute(dispute.id, reason).then(success => {
                        if (success) onStatusChange?.();
                      });
                    }
                  }}
                  className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Reopen
                </button>
              )}
            </div>

            {/* Resolution Notes */}
            {dispute.resolution_notes && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium">Notes:</span> {dispute.resolution_notes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
