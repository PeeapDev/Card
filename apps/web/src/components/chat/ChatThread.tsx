/**
 * ChatThread Component
 *
 * Reusable messaging interface for general conversations.
 * Used by: Support, Business inquiries, B2B, etc.
 *
 * Features:
 * - Real-time messaging
 * - File attachments
 * - Canned responses (support staff)
 * - AI moderation warnings
 * - Reply to messages
 * - Read receipts
 * - @ Mention support (@staff, @product:name, @invoice)
 * - Inline invoice display
 */

import { useState, useEffect, useRef } from 'react';
import {
  User,
  Store,
  Shield,
  Bot,
  Headphones,
  Loader2,
  CheckCheck,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  Download,
  X,
  Reply,
  MoreVertical,
  Trash2,
  Flag,
  MessageSquare,
  Zap,
  Package,
  Receipt,
} from 'lucide-react';
import {
  conversationService,
  Conversation,
  Message,
  CannedResponse,
  SenderType,
  CONVERSATION_TYPES,
  CONVERSATION_STATUSES,
} from '@/services/conversation.service';
import { invoiceService, Invoice } from '@/services/invoice.service';
import { useAuth } from '@/context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { MentionInput } from './MentionInput';
import { InvoiceCard } from './InvoiceCard';
import { InvoiceModal } from './InvoiceModal';
import { ProductCard } from './ProductCard';
import { ReceiptCard } from './ReceiptCard';

interface ChatThreadProps {
  conversation: Conversation;
  userRole: 'user' | 'merchant' | 'admin' | 'support';
  onConversationUpdate?: () => void;
  showCannedResponses?: boolean;
  businessId?: string;
  enableMentions?: boolean;
}

export function ChatThread({
  conversation,
  userRole,
  onConversationUpdate,
  showCannedResponses = false,
  businessId,
  enableMentions = true,
}: ChatThreadProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [cannedResponses, setCannedResponses] = useState<CannedResponse[]>([]);
  const [showCanned, setShowCanned] = useState(false);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [invoices, setInvoices] = useState<Record<string, Invoice>>({});
  const [receipts, setReceipts] = useState<Record<string, any>>({});
  const [products, setProducts] = useState<Record<string, any>>({});
  const [participants, setParticipants] = useState<Map<string, { id: string; name: string; profilePicture?: string; businessName?: string }>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadMessages();
    loadParticipants();
    if (showCannedResponses) {
      loadCannedResponses();
    }

    // Subscribe to real-time updates
    const unsubscribe = conversationService.subscribeToMessages(conversation.id, (newMessage) => {
      setMessages(prev => {
        // Check if message already exists (avoid duplicates)
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
      scrollToBottom();
    });

    // Polling fallback - check for new messages every 3 seconds
    const pollInterval = setInterval(async () => {
      const msgs = await conversationService.getMessages(conversation.id);
      setMessages(prev => {
        // Only update if there are new messages
        if (msgs.length > prev.length) {
          return msgs;
        }
        return prev;
      });
    }, 3000);

    // Mark as read
    conversationService.markAsRead(conversation.id);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, [conversation.id]);

  const loadParticipants = async () => {
    const participantsData = await conversationService.getParticipants(conversation.id);
    setParticipants(participantsData);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    setLoading(true);
    const msgs = await conversationService.getMessages(conversation.id);
    setMessages(msgs);
    setLoading(false);
  };

  const loadCannedResponses = async () => {
    const responses = await conversationService.getCannedResponses();
    setCannedResponses(responses);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || sending) return;

    setSending(true);
    const content = inputValue.trim();
    const replyToId = replyTo?.id;
    setInputValue('');
    setReplyTo(null);

    // Send the message
    const result = await conversationService.sendMessage({
      conversationId: conversation.id,
      content,
      senderType: userRole,
      senderName: user?.firstName || userRole,
      replyToId,
    });

    // Immediately add the message to local state for instant feedback
    if (result) {
      setMessages(prev => {
        // Check if message already exists (from realtime)
        if (prev.some(m => m.id === result.id)) return prev;
        return [...prev, result];
      });
      scrollToBottom();

      // Process any @ mentions in the message
      if (enableMentions && businessId) {
        const mentions = invoiceService.parseMentions(content);
        if (mentions.length > 0) {
          await invoiceService.processMentions(
            result.id,
            conversation.id,
            content,
            businessId
          );
        }
      }
    }

    setSending(false);
    onConversationUpdate?.();
  };

  const handleInvoiceCreate = () => {
    setShowInvoiceModal(true);
  };

  const handleInvoiceCreated = async (invoiceResult: { invoice: Invoice | null; error: string | null }) => {
    const invoice = invoiceResult.invoice;
    if (!invoice) {
      console.error('Failed to create invoice:', invoiceResult.error);
      return;
    }

    // Add invoice to cache
    setInvoices(prev => ({ ...prev, [invoice.id]: invoice }));

    // Generate payment link
    await invoiceService.generatePaymentLink(invoice.id);

    // Send invoice message
    await conversationService.sendMessage({
      conversationId: conversation.id,
      content: `📄 Invoice #${invoice.invoice_number} for ${invoice.currency} ${invoice.total_amount.toLocaleString()}`,
      senderType: userRole,
      senderName: user?.firstName || userRole,
      messageType: 'invoice',
      metadata: { invoiceId: invoice.id },
    });

    // Send the invoice (change status)
    await invoiceService.sendInvoice(invoice.id);

    setShowInvoiceModal(false);
    onConversationUpdate?.();
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);

    // Upload file to storage
    const uploaded = await invoiceService.uploadChatFile(file, conversation.id);

    if (uploaded) {
      // Send message with attachment
      await conversationService.sendMessage({
        conversationId: conversation.id,
        content: file.type.startsWith('image/') ? '' : `Shared: ${file.name}`,
        senderType: userRole,
        senderName: user?.firstName || userRole,
        messageType: file.type.startsWith('image/') ? 'image' : 'file',
        attachments: [uploaded],
      });
    } else {
      // Fallback if upload fails
      await conversationService.sendMessage({
        conversationId: conversation.id,
        content: `Shared a file: ${file.name}`,
        senderType: userRole,
        messageType: 'file',
      });
    }

    setUploading(false);
    onConversationUpdate?.();
  };

  // Handle sending multiple images
  const handleSendImages = async (files: File[]) => {
    setUploading(true);

    for (const file of files) {
      const uploaded = await invoiceService.uploadChatFile(file, conversation.id);

      if (uploaded) {
        const result = await conversationService.sendMessage({
          conversationId: conversation.id,
          content: '',
          senderType: userRole,
          senderName: user?.firstName || userRole,
          messageType: 'image',
          attachments: [uploaded],
        });

        if (result) {
          setMessages(prev => {
            if (prev.some(m => m.id === result.id)) return prev;
            return [...prev, result];
          });
        }
      }
    }

    setUploading(false);
    scrollToBottom();
    onConversationUpdate?.();
  };

  // Handle sending a product
  const handleSendProduct = async (productId: string) => {
    setSending(true);

    const result = await conversationService.sendMessage({
      conversationId: conversation.id,
      content: `@product:${productId}`,
      senderType: userRole,
      senderName: user?.firstName || userRole,
    });

    if (result) {
      setMessages(prev => {
        if (prev.some(m => m.id === result.id)) return prev;
        return [...prev, result];
      });
      scrollToBottom();
    }

    setSending(false);
    onConversationUpdate?.();
  };

  // Handle sending a payment link
  const handleSendPaymentLink = async (linkId: string) => {
    setSending(true);

    const link = await invoiceService.getPaymentLink(linkId);
    if (link) {
      const result = await conversationService.sendMessage({
        conversationId: conversation.id,
        content: `💳 Payment Link: ${link.name}\n${link.currency} ${link.amount.toLocaleString()}\n${link.url || ''}`,
        senderType: userRole,
        senderName: user?.firstName || userRole,
        metadata: { paymentLinkId: linkId },
      });

      if (result) {
        setMessages(prev => {
          if (prev.some(m => m.id === result.id)) return prev;
          return [...prev, result];
        });
        scrollToBottom();
      }
    }

    setSending(false);
    onConversationUpdate?.();
  };

  // Handle sending a transaction/receipt
  const handleSendTransaction = async (transactionId: string, type: 'transaction' | 'pos_sale') => {
    setSending(true);

    const receiptRef = type === 'pos_sale' ? `sale_${transactionId}` : `tx_${transactionId}`;

    const result = await conversationService.sendMessage({
      conversationId: conversation.id,
      content: `@receipt:${receiptRef}`,
      senderType: userRole,
      senderName: user?.firstName || userRole,
      messageType: 'receipt',
      metadata: { receiptRef },
    });

    if (result) {
      setMessages(prev => {
        if (prev.some(m => m.id === result.id)) return prev;
        return [...prev, result];
      });
      scrollToBottom();
    }

    setSending(false);
    onConversationUpdate?.();
  };

  // Handle opening help/support chat
  const handleOpenHelp = () => {
    // This will trigger the support modal in the parent or navigate to support
    window.dispatchEvent(new CustomEvent('openSupportChat', {
      detail: {
        fromConversation: conversation.id,
        userRole,
      },
    }));
  };

  // Load invoice for message if needed
  const loadInvoiceForMessage = async (invoiceId: string) => {
    if (invoices[invoiceId]) return invoices[invoiceId];

    const invoice = await invoiceService.getInvoice(invoiceId);
    if (invoice) {
      setInvoices(prev => ({ ...prev, [invoiceId]: invoice }));
    }
    return invoice;
  };

  // Load receipt for message if needed
  const loadReceiptForMessage = async (receiptRef: string) => {
    if (receipts[receiptRef]) return receipts[receiptRef];

    // Parse receipt reference: sale_uuid or tx_uuid
    const [typePrefix, ...idParts] = receiptRef.split('_');
    const receiptId = idParts.join('_');
    const receiptType = typePrefix === 'sale' ? 'pos_sale' : 'transaction';

    const receipt = await invoiceService.getReceipt(receiptId, receiptType);
    if (receipt) {
      setReceipts(prev => ({ ...prev, [receiptRef]: receipt }));
    }
    return receipt;
  };

  // Load product for message if needed
  const loadProductForMessage = async (productId: string) => {
    if (products[productId]) return products[productId];

    const product = await invoiceService.getProduct(productId);
    if (product) {
      setProducts(prev => ({ ...prev, [productId]: product }));
    }
    return product;
  };

  // Handle product purchase from chat
  const handleBuyProduct = async (product: any) => {
    // Navigate to checkout or create payment link
    const checkoutUrl = `/checkout?product=${product.id}&business=${product.business_id}`;
    window.open(checkoutUrl, '_blank');
  };

  // Render message content with parsed mentions
  const renderMessageContent = (msg: Message) => {
    // Check for invoice message type
    if (msg.message_type === 'invoice' && msg.metadata?.invoiceId) {
      const invoiceId = msg.metadata.invoiceId;
      const invoice = invoices[invoiceId];

      if (!invoice) {
        // Load invoice
        loadInvoiceForMessage(invoiceId);
        return (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading invoice...
          </div>
        );
      }

      return (
        <InvoiceCard
          invoice={invoice}
          isOwner={userRole === 'merchant'}
          onPay={() => {
            if (invoice.payment_url) {
              window.open(invoice.payment_url, '_blank');
            }
          }}
        />
      );
    }

    // Check for receipt message type
    if (msg.message_type === 'receipt' && msg.metadata?.receiptRef) {
      const receiptRef = msg.metadata.receiptRef;
      const receipt = receipts[receiptRef];

      if (!receipt) {
        loadReceiptForMessage(receiptRef);
        return (
          <div className="flex items-center gap-2 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading receipt...
          </div>
        );
      }

      return <ReceiptCard receipt={receipt} senderName={msg.sender_name} />;
    }

    // Check for image attachments
    if (msg.message_type === 'image' && msg.attachments?.length > 0) {
      return (
        <div className="space-y-2">
          {msg.attachments.map((att, i) => (
            <img
              key={i}
              src={att.url}
              alt={att.name}
              className="max-w-full max-h-64 rounded-lg cursor-pointer hover:opacity-90"
              onClick={() => window.open(att.url, '_blank')}
            />
          ))}
          {msg.content && <p>{msg.content}</p>}
        </div>
      );
    }

    // Parse and highlight mentions in regular messages
    const content = msg.content;

    // Check for @product:xxx mentions and render product cards inline
    const productMentionRegex = /@product:([a-f0-9-]+)/g;
    const productMatches = content.match(productMentionRegex);

    if (productMatches && productMatches.length > 0) {
      const elements: JSX.Element[] = [];
      let remainingContent = content;

      productMatches.forEach((match, i) => {
        const productId = match.replace('@product:', '');
        const product = products[productId];

        // Split content around this match
        const [before, after] = remainingContent.split(match);

        if (before) {
          elements.push(<span key={`text-${i}`}>{renderMentionsInText(before)}</span>);
        }

        if (!product) {
          loadProductForMessage(productId);
          elements.push(
            <div key={`product-loading-${i}`} className="my-2 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading product...
            </div>
          );
        } else {
          elements.push(
            <div key={`product-${i}`} className="my-2">
              <ProductCard
                product={product}
                onBuyNow={handleBuyProduct}
                isOwner={userRole === 'merchant' && product.business_id === businessId}
              />
            </div>
          );
        }

        remainingContent = after || '';
      });

      if (remainingContent) {
        elements.push(<span key="text-final">{renderMentionsInText(remainingContent)}</span>);
      }

      return <div className="space-y-1">{elements}</div>;
    }

    // Check for @receipt:xxx mentions and render receipt cards inline
    const receiptMentionRegex = /@receipt:(sale_[a-f0-9-]+|tx_[a-f0-9-]+)/g;
    const receiptMatches = content.match(receiptMentionRegex);

    if (receiptMatches && receiptMatches.length > 0) {
      const elements: JSX.Element[] = [];
      let remainingContent = content;

      receiptMatches.forEach((match, i) => {
        const receiptRef = match.replace('@receipt:', '');
        const receipt = receipts[receiptRef];

        // Split content around this match
        const [before, after] = remainingContent.split(match);

        if (before) {
          elements.push(<span key={`text-${i}`}>{renderMentionsInText(before)}</span>);
        }

        if (!receipt) {
          loadReceiptForMessage(receiptRef);
          elements.push(
            <div key={`receipt-loading-${i}`} className="my-2 flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading receipt...
            </div>
          );
        } else {
          elements.push(
            <div key={`receipt-${i}`} className="my-2">
              <ReceiptCard receipt={receipt} senderName={msg.sender_name} />
            </div>
          );
        }

        remainingContent = after || '';
      });

      if (remainingContent) {
        elements.push(<span key="text-final">{renderMentionsInText(remainingContent)}</span>);
      }

      return <div className="space-y-1">{elements}</div>;
    }

    return renderMentionsInText(content);
  };

  // Helper to render text with highlighted mentions
  const renderMentionsInText = (content: string) => {
    const mentionRegex = /@(\w+(?::[^\s]+)?)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(content)) !== null) {
      // Add text before mention
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }

      // Add highlighted mention
      const mentionText = match[0];
      const mentionType = match[1].includes(':') ? match[1].split(':')[0] : 'user';

      parts.push(
        <span
          key={match.index}
          className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-xs font-medium ${
            mentionType === 'product'
              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
              : mentionType === 'receipt'
              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              : mentionType === 'invoice'
              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          }`}
        >
          {mentionType === 'product' && <Package className="w-3 h-3" />}
          {mentionType === 'receipt' && <Receipt className="w-3 h-3" />}
          {mentionType === 'invoice' && <FileText className="w-3 h-3" />}
          {mentionType === 'user' && <User className="w-3 h-3" />}
          {mentionText}
        </span>
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : content;
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

    // TODO: Upload to storage and send as attachment
    // For now, just mention the file
    await conversationService.sendMessage({
      conversationId: conversation.id,
      content: `Shared a file: ${file.name}`,
      senderType: userRole,
      messageType: 'file',
    });

    setUploading(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCannedResponse = async (response: CannedResponse) => {
    const content = await conversationService.useCannedResponse(response.id);
    if (content) {
      setInputValue(content);
    }
    setShowCanned(false);
  };

  const handleDeleteMessage = async (messageId: string) => {
    await conversationService.deleteMessage(messageId);
    setMessages(prev => prev.filter(m => m.id !== messageId));
    setMenuOpen(null);
  };

  const getSenderIcon = (senderType: SenderType) => {
    switch (senderType) {
      case 'user':
        return <User className="w-4 h-4" />;
      case 'merchant':
        return <Store className="w-4 h-4" />;
      case 'admin':
        return <Shield className="w-4 h-4" />;
      case 'support':
        return <Headphones className="w-4 h-4" />;
      case 'ai':
        return <Bot className="w-4 h-4" />;
      case 'system':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getSenderColor = (senderType: SenderType) => {
    switch (senderType) {
      case 'user':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'merchant':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'admin':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'support':
        return 'bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400';
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

  const isOwnMessage = (msg: Message) => {
    // Only check sender_id for accurate ownership detection
    return msg.sender_id === user?.id;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isConversationClosed = conversation.status === 'closed' || conversation.status === 'archived';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {conversation.subject || CONVERSATION_TYPES[conversation.type]}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {CONVERSATION_STATUSES[conversation.status]?.label}
              {conversation.ai_flagged && (
                <span className="ml-2 inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                  <Flag className="w-3 h-3" />
                  Flagged
                </span>
              )}
            </p>
          </div>
          <span className={`px-2 py-1 text-xs rounded-full ${
            conversation.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
            conversation.status === 'flagged' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
            'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
          }`}>
            {CONVERSATION_STATUSES[conversation.status]?.label}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-[300px]">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Start the conversation.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const participant = participants.get(msg.sender_id || '');
            const senderName = participant?.name || msg.sender_name || msg.sender_type;
            const profilePic = participant?.profilePicture;
            const isOwn = isOwnMessage(msg);

            return (
            <div
              key={msg.id}
              className={`group flex gap-2 ${isOwn ? 'flex-row-reverse' : 'flex-row'} ${
                msg.sender_type === 'system' ? 'justify-center' : ''
              }`}
            >
              {/* Profile Picture - Only show for non-system messages */}
              {msg.sender_type !== 'system' && (
                <div className="flex-shrink-0 mt-1">
                  {profilePic ? (
                    <img
                      src={profilePic}
                      alt={senderName}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isOwn
                        ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                        : getSenderColor(msg.sender_type)
                    }`}>
                      {participant?.name ? (
                        <span className="text-xs font-bold">
                          {participant.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </span>
                      ) : (
                        getSenderIcon(msg.sender_type)
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className={`max-w-[70%] ${msg.sender_type === 'system' ? 'max-w-md' : ''}`}>
                {/* AI Flag Warning */}
                {msg.ai_flagged && (userRole === 'admin' || userRole === 'support') && (
                  <div className="flex items-center gap-1 mb-1 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Flagged: {msg.ai_flag_reason}</span>
                  </div>
                )}

                {/* Sender Name - Only show for non-own messages */}
                {msg.sender_type !== 'system' && !isOwn && (
                  <div className={`flex items-center gap-2 mb-1 ${isOwn ? 'justify-end mr-1' : 'ml-1'}`}>
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {senderName}
                      {participant?.businessName && (
                        <span className="ml-1 text-primary-600 dark:text-primary-400">
                          • {participant.businessName}
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {/* Reply Preview */}
                {msg.reply_to_id && (
                  <div className={`mb-1 pl-2 border-l-2 border-gray-300 dark:border-gray-600 text-xs text-gray-500 truncate ${isOwn ? 'mr-1' : 'ml-1'}`}>
                    Replying to a message
                  </div>
                )}

                {/* Message Bubble */}
                <div className="relative group">
                  <div
                    className={`px-4 py-2 rounded-2xl ${getMessageBubbleStyle(msg.sender_type, isOwn)} ${
                      isOwn ? 'rounded-tr-md' : 'rounded-tl-md'
                    }`}
                  >
                    {/* Message Content */}
                    <div className={`text-sm whitespace-pre-wrap ${
                      msg.sender_type === 'system' ? 'text-gray-600 dark:text-gray-400' : ''
                    }`}>
                      {renderMessageContent(msg)}
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

                  {/* Message Actions */}
                  {msg.sender_type !== 'system' && (
                    <div className={`absolute top-0 ${isOwn ? 'left-0 -translate-x-full pr-2' : 'right-0 translate-x-full pl-2'} opacity-0 group-hover:opacity-100 transition-opacity`}>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setReplyTo(msg)}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Reply"
                        >
                          <Reply className="w-4 h-4" />
                        </button>
                        {(userRole === 'admin' || userRole === 'support' || isOwn) && (
                          <button
                            onClick={() => setMenuOpen(menuOpen === msg.id ? null : msg.id)}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                      {/* Dropdown Menu */}
                      {menuOpen === msg.id && (
                        <div className="absolute top-6 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10">
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 w-full"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <div className={`flex items-center gap-1 mt-1 text-xs text-gray-400 ${
                  isOwn ? 'justify-end mr-1' : 'ml-1'
                }`}>
                  <span>{formatTime(msg.created_at)}</span>
                  {isOwn && (
                    <CheckCheck className="w-3 h-3" />
                  )}
                </div>
              </div>
            </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview */}
      {replyTo && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <Reply className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Replying to</span>
              <span className="font-medium text-gray-700 dark:text-gray-300 truncate max-w-xs">
                {replyTo.content.substring(0, 50)}...
              </span>
            </div>
            <button onClick={() => setReplyTo(null)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      {!isConversationClosed ? (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4">
          {/* Canned Responses Dropdown */}
          {showCannedResponses && showCanned && (
            <div className="mb-3 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-2 space-y-1">
              {cannedResponses.map(response => (
                <button
                  key={response.id}
                  onClick={() => handleCannedResponse(response)}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600"
                >
                  <span className="font-medium text-gray-700 dark:text-gray-300">{response.title}</span>
                  {response.shortcut && (
                    <span className="ml-2 text-xs text-gray-400">{response.shortcut}</span>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{response.content}</p>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-end gap-2">
            {/* Canned Responses Toggle */}
            {showCannedResponses && (
              <button
                onClick={() => setShowCanned(!showCanned)}
                className={`p-2 rounded-lg ${showCanned ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                title="Canned Responses"
              >
                <Zap className="w-5 h-5" />
              </button>
            )}

            {/* Mention-enabled input or plain input */}
            <div className="flex-1">
              {enableMentions ? (
                <MentionInput
                  value={inputValue}
                  onChange={setInputValue}
                  onSubmit={handleSend}
                  onInvoiceCreate={handleInvoiceCreate}
                  onFileSelect={handleFileUpload}
                  onSendImages={handleSendImages}
                  onSendProduct={handleSendProduct}
                  onSendPaymentLink={handleSendPaymentLink}
                  onSendTransaction={handleSendTransaction}
                  onOpenHelp={handleOpenHelp}
                  placeholder="Type a message... Use @ to mention"
                  disabled={sending || uploading}
                  sending={sending}
                  businessId={businessId}
                  userRole={userRole}
                  maxImages={userRole === 'user' ? 2 : 5}
                />
              ) : (
                <div className="flex items-end gap-2">
                  {/* File Upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
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
                      <FileText className="w-5 h-5" />
                    )}
                  </button>

                  {/* Text Input */}
                  <textarea
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    rows={1}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white resize-none"
                    style={{ minHeight: '40px', maxHeight: '120px' }}
                  />

                  {/* Send Button */}
                  <button
                    onClick={handleSend}
                    disabled={!inputValue.trim() || sending}
                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <MessageSquare className="w-5 h-5" />
                    )}
                  </button>
                </div>
              )}
            </div>
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
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex items-center justify-center gap-2 text-gray-500 dark:text-gray-400">
            <CheckCheck className="w-5 h-5" />
            <span>This conversation is {conversation.status}</span>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && businessId && (
        <InvoiceModal
          isOpen={showInvoiceModal}
          onClose={() => setShowInvoiceModal(false)}
          onSubmit={handleInvoiceCreated}
          businessId={businessId}
          conversationId={conversation.id}
          customerId={conversation.participant_ids?.find(id => id !== user?.id)}
        />
      )}
    </div>
  );
}
