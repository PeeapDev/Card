/**
 * MentionInput Component
 *
 * Text input with @ mention autocomplete support.
 * Supports:
 * - @username - Mention users/staff
 * - @product:name - Reference products
 * - @invoice - Create invoice
 *
 * Also includes:
 * - Plus (+) button for WhatsApp-style attachment menu
 * - Help (?) button for instant support
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  User,
  Package,
  FileText,
  Receipt,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { invoiceService } from '@/services/invoice.service';
import { formatDistanceToNow } from 'date-fns';
import { ChatAttachmentMenu } from './ChatAttachmentMenu';

interface MentionSuggestion {
  id: string;
  name: string;
  type: 'user' | 'staff' | 'product' | 'invoice' | 'receipt';
  subtitle?: string;
  avatar?: string;
  price?: number;
  currency?: string;
  date?: string;
  status?: string;
  receiptType?: 'transaction' | 'pos_sale';
}

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onInvoiceCreate?: () => void;
  onFileSelect?: (file: File) => void;
  onSendImages?: (files: File[]) => void;
  onSendProduct?: (productId: string) => void;
  onSendPaymentLink?: (linkId: string) => void;
  onSendTransaction?: (transactionId: string, type: 'transaction' | 'pos_sale') => void;
  onOpenHelp?: () => void;
  placeholder?: string;
  disabled?: boolean;
  sending?: boolean;
  businessId?: string;
  userRole?: 'user' | 'merchant' | 'admin' | 'support';
  maxImages?: number;
}

export function MentionInput({
  value,
  onChange,
  onSubmit,
  onInvoiceCreate,
  onFileSelect,
  onSendImages,
  onSendProduct,
  onSendPaymentLink,
  onSendTransaction,
  onOpenHelp,
  placeholder = 'Type a message... Use @ to mention',
  disabled = false,
  sending = false,
  businessId,
  userRole = 'user',
  maxImages = 2,
}: MentionInputProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionStart, setMentionStart] = useState(-1);
  const [loading, setLoading] = useState(false);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Detect @ mention trigger
  useEffect(() => {
    if (!inputRef.current) return;

    const cursorPos = inputRef.current.selectionStart;
    const textBeforeCursor = value.substring(0, cursorPos);

    // Find @ mention
    const mentionMatch = textBeforeCursor.match(/@([a-zA-Z0-9:_]*)$/);

    if (mentionMatch) {
      const query = mentionMatch[1];
      setMentionQuery(query);
      setMentionStart(mentionMatch.index || 0);
      setShowSuggestions(true);
      setSelectedIndex(0);
      loadSuggestions(query);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  }, [value]);

  const loadSuggestions = useCallback(async (query: string) => {
    setLoading(true);
    const results: MentionSuggestion[] = [];

    // Check for special commands
    if (query.startsWith('invoice') || 'invoice'.startsWith(query)) {
      results.push({
        id: 'invoice',
        name: 'Create Invoice',
        type: 'invoice',
        subtitle: 'Send an invoice with payment link',
      });
    }

    // Receipt search - @receipt or @receipt:query
    if (query.startsWith('receipt') || 'receipt'.startsWith(query)) {
      const receiptQuery = query.replace('receipt:', '').replace('receipt', '');

      // Add help option
      if (receiptQuery.length === 0) {
        results.push({
          id: 'help-receipt',
          name: 'Search receipts',
          type: 'receipt',
          subtitle: 'Type @receipt:search or just @receipt to browse',
        });
      }

      // Search receipts
      const receipts = await invoiceService.searchReceiptsForMention(receiptQuery, businessId);
      receipts.forEach(r => {
        results.push({
          id: r.id,
          name: `#${r.reference}`,
          type: 'receipt',
          subtitle: `${r.currency} ${r.amount.toLocaleString()} • ${formatDistanceToNow(new Date(r.date))} ago`,
          price: r.amount,
          currency: r.currency,
          date: r.date,
          status: r.status,
          receiptType: r.type,
        });
      });
    }

    if (query.startsWith('product:') && businessId) {
      // Search products
      const productQuery = query.replace('product:', '');
      if (productQuery.length >= 1) {
        const products = await invoiceService.searchProductsForMention(productQuery, businessId);
        products.forEach(p => {
          results.push({
            id: p.id,
            name: p.name,
            type: 'product',
            subtitle: `${p.currency} ${p.price.toLocaleString()}`,
            price: p.price,
            currency: p.currency,
          });
        });
      }
    } else if (!query.includes(':') && !query.startsWith('receipt') && !query.startsWith('invoice') && query.length >= 1) {
      // Search users
      const users = await invoiceService.searchUsersForMention(query, businessId);
      users.forEach(u => {
        results.push({
          id: u.id,
          name: u.name,
          type: u.type,
          subtitle: u.type === 'staff' ? 'Staff Member' : 'User',
          avatar: u.avatar,
        });
      });
    }

    // Add helper options if nothing specific
    if (results.length === 0 && query.length < 3) {
      results.push(
        { id: 'help-user', name: 'Mention a person', type: 'user', subtitle: 'Type @username' },
        { id: 'help-product', name: 'Reference a product', type: 'product', subtitle: 'Type @product:name' },
        { id: 'help-receipt', name: 'Reference a receipt', type: 'receipt', subtitle: 'Type @receipt' },
        { id: 'help-invoice', name: 'Create invoice', type: 'invoice', subtitle: 'Type @invoice' },
      );
    }

    setSuggestions(results);
    setLoading(false);
  }, [businessId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        selectSuggestion(suggestions[selectedIndex]);
      } else if (e.key === 'Escape') {
        setShowSuggestions(false);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const selectSuggestion = (suggestion: MentionSuggestion) => {
    if (!suggestion) return;

    // Skip help options
    if (suggestion.id.startsWith('help-')) {
      return;
    }

    // Special handling for invoice
    if (suggestion.type === 'invoice' && suggestion.id === 'invoice') {
      // Replace @mention with @invoice and trigger modal
      const newValue = value.substring(0, mentionStart) + '@invoice ' + value.substring(mentionStart + mentionQuery.length + 1);
      onChange(newValue);
      setShowSuggestions(false);
      onInvoiceCreate?.();
      return;
    }

    // Build mention text
    let mentionText = '';
    switch (suggestion.type) {
      case 'user':
      case 'staff':
        mentionText = `@${suggestion.name.replace(/\s+/g, '_')} `;
        break;
      case 'product':
        mentionText = `@product:${suggestion.id} `;
        break;
      case 'receipt':
        // Include receipt type for proper fetching later
        const receiptTypePrefix = suggestion.receiptType === 'pos_sale' ? 'sale' : 'tx';
        mentionText = `@receipt:${receiptTypePrefix}_${suggestion.id} `;
        break;
      default:
        mentionText = `@${suggestion.name} `;
    }

    // Replace mention with selection
    const newValue = value.substring(0, mentionStart) + mentionText + value.substring(mentionStart + mentionQuery.length + 1);
    onChange(newValue);
    setShowSuggestions(false);

    // Focus input
    inputRef.current?.focus();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'user':
      case 'staff':
        return <User className="w-4 h-4" />;
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'invoice':
        return <FileText className="w-4 h-4" />;
      case 'receipt':
        return <Receipt className="w-4 h-4" />;
      default:
        return <User className="w-4 h-4" />;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'staff':
        return 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400';
      case 'product':
        return 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400';
      case 'invoice':
        return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
      case 'receipt':
        return 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400';
    }
  };

  return (
    <div className="relative">
      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div
          ref={suggestionsRef}
          className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto z-10"
        >
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((suggestion, index) => (
                <button
                  key={suggestion.id}
                  onClick={() => selectSuggestion(suggestion)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    index === selectedIndex ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                  }`}
                >
                  {suggestion.avatar ? (
                    <img
                      src={suggestion.avatar}
                      alt={suggestion.name}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getIconColor(suggestion.type)}`}>
                      {getIcon(suggestion.type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {suggestion.name}
                    </p>
                    {suggestion.subtitle && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {suggestion.subtitle}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 capitalize">{suggestion.type}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
              No results found
            </div>
          )}

          {/* Help text */}
          <div className="px-3 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium">Tip:</span> @name for people, @product:name for products, @invoice for invoices
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="flex items-end gap-2">
        {/* Attachment Menu (+ button) and Help (?) button */}
        <ChatAttachmentMenu
          onSendImages={onSendImages || ((files) => files.forEach(f => onFileSelect?.(f)))}
          onSendProduct={onSendProduct || (() => {})}
          onCreateInvoice={onInvoiceCreate || (() => {})}
          onSendPaymentLink={onSendPaymentLink || (() => {})}
          onSendTransaction={onSendTransaction || (() => {})}
          onOpenHelp={onOpenHelp || (() => {})}
          businessId={businessId}
          userRole={userRole}
          disabled={disabled}
          maxImages={maxImages}
        />

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none dark:text-white resize-none"
            style={{ minHeight: '40px', maxHeight: '120px' }}
          />
        </div>

        {/* Send Button */}
        <button
          onClick={onSubmit}
          disabled={!value.trim() || sending || disabled}
          className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </div>
    </div>
  );
}
