/**
 * ChatAttachmentMenu Component
 *
 * WhatsApp-style plus (+) button that opens a menu for sending:
 * - Images (limited to 2 per message for users)
 * - Products
 * - Invoices
 * - Payment Links
 * - Transactions/Receipts
 */

import { useState, useRef, useEffect } from 'react';
import {
  Plus,
  X,
  Image,
  Package,
  FileText,
  Receipt,
  Link,
  Loader2,
  Search,
} from 'lucide-react';
import { invoiceService } from '@/services/invoice.service';
import { formatDistanceToNow } from 'date-fns';

interface ChatAttachmentMenuProps {
  onSendImages: (files: File[]) => void;
  onSendProduct: (productId: string) => void;
  onCreateInvoice: () => void;
  onSendPaymentLink: (linkId: string) => void;
  onSendTransaction: (transactionId: string, type: 'transaction' | 'pos_sale') => void;
  onOpenHelp: () => void;
  businessId?: string;
  userRole: 'user' | 'merchant' | 'admin' | 'support';
  disabled?: boolean;
  maxImages?: number;
}

type MenuView = 'main' | 'products' | 'payment-links' | 'transactions';

export function ChatAttachmentMenu({
  onSendImages,
  onSendProduct,
  onCreateInvoice,
  onSendPaymentLink,
  onSendTransaction,
  onOpenHelp,
  businessId,
  userRole,
  disabled = false,
  maxImages = 2,
}: ChatAttachmentMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuView, setMenuView] = useState<MenuView>('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setMenuView('main');
    setSearchQuery('');
    setItems([]);
    setSelectedImages([]);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const imageFiles = files.filter(f => f.type.startsWith('image/')).slice(0, maxImages);

    if (imageFiles.length > 0) {
      setSelectedImages(imageFiles);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendImages = () => {
    if (selectedImages.length > 0) {
      onSendImages(selectedImages);
      handleClose();
    }
  };

  const loadProducts = async (query: string = '') => {
    if (!businessId) return;
    setLoading(true);
    try {
      const products = await invoiceService.searchProductsForMention(query || '', businessId);
      setItems(products);
    } catch (err) {
      console.error('Failed to load products:', err);
    }
    setLoading(false);
  };

  const loadPaymentLinks = async (query: string = '') => {
    if (!businessId) return;
    setLoading(true);
    try {
      const links = await invoiceService.searchPaymentLinks(query, businessId);
      setItems(links);
    } catch (err) {
      console.error('Failed to load payment links:', err);
    }
    setLoading(false);
  };

  const loadTransactions = async (query: string = '') => {
    setLoading(true);
    try {
      const receipts = await invoiceService.searchReceiptsForMention(query, businessId);
      setItems(receipts);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
    setLoading(false);
  };

  const handleMenuItemClick = (view: MenuView) => {
    setMenuView(view);
    setSearchQuery('');

    if (view === 'products') {
      loadProducts();
    } else if (view === 'payment-links') {
      loadPaymentLinks();
    } else if (view === 'transactions') {
      loadTransactions();
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (menuView === 'products') {
      loadProducts(query);
    } else if (menuView === 'payment-links') {
      loadPaymentLinks(query);
    } else if (menuView === 'transactions') {
      loadTransactions(query);
    }
  };

  const handleSelectItem = (item: any) => {
    if (menuView === 'products') {
      onSendProduct(item.id);
    } else if (menuView === 'payment-links') {
      onSendPaymentLink(item.id);
    } else if (menuView === 'transactions') {
      onSendTransaction(item.id, item.type);
    }
    handleClose();
  };

  const mainMenuItems = [
    {
      id: 'image',
      icon: Image,
      label: 'Photo',
      sublabel: `Up to ${maxImages} image${maxImages > 1 ? 's' : ''}`,
      color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
      onClick: () => fileInputRef.current?.click(),
    },
    {
      id: 'product',
      icon: Package,
      label: 'Product',
      sublabel: 'Share a product',
      color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
      onClick: () => handleMenuItemClick('products'),
      requiresBusiness: true,
    },
    {
      id: 'invoice',
      icon: FileText,
      label: 'Invoice',
      sublabel: 'Create & send invoice',
      color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
      onClick: () => {
        onCreateInvoice();
        handleClose();
      },
      requiresBusiness: true,
    },
    {
      id: 'payment-link',
      icon: Link,
      label: 'Payment Link',
      sublabel: 'Share payment link',
      color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
      onClick: () => handleMenuItemClick('payment-links'),
      requiresBusiness: true,
    },
    {
      id: 'transaction',
      icon: Receipt,
      label: 'Transaction',
      sublabel: 'Share receipt/transaction',
      color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
      onClick: () => handleMenuItemClick('transactions'),
    },
  ];

  // Filter items based on role
  const filteredMenuItems = mainMenuItems.filter(item => {
    if (item.requiresBusiness && !businessId && userRole !== 'merchant') {
      return false;
    }
    return true;
  });

  return (
    <div className="relative" ref={menuRef}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Plus Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`p-2 rounded-lg transition-all ${
          isOpen
            ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400 rotate-45'
            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
        } disabled:opacity-50`}
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Menu Popup */}
      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2">
              {menuView !== 'main' && (
                <button
                  onClick={() => setMenuView('main')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
              <h3 className="font-medium text-gray-900 dark:text-white">
                {menuView === 'main' && 'Attach'}
                {menuView === 'products' && 'Select Product'}
                {menuView === 'payment-links' && 'Select Payment Link'}
                {menuView === 'transactions' && 'Select Transaction'}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {/* Image Preview */}
          {selectedImages.length > 0 && menuView === 'main' && (
            <div className="p-3 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                {selectedImages.map((file, i) => (
                  <div key={i} className="relative w-16 h-16">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`Preview ${i + 1}`}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-1 -right-1 p-0.5 bg-red-500 text-white rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {selectedImages.length < maxImages && (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-16 h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                )}
              </div>
              <button
                onClick={handleSendImages}
                className="w-full py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium"
              >
                Send {selectedImages.length} Photo{selectedImages.length > 1 ? 's' : ''}
              </button>
            </div>
          )}

          {/* Main Menu */}
          {menuView === 'main' && (
            <div className="p-2 grid grid-cols-3 gap-2">
              {filteredMenuItems.map(item => (
                <button
                  key={item.id}
                  onClick={item.onClick}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">{item.label}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* List Views (Products, Payment Links, Transactions) */}
          {menuView !== 'main' && (
            <div>
              {/* Search */}
              <div className="p-3 border-b border-gray-100 dark:border-gray-700">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    placeholder={`Search ${menuView.replace('-', ' ')}...`}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 border-none rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="max-h-60 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No {menuView.replace('-', ' ')} found
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 text-left"
                      >
                        {/* Icon/Image */}
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            menuView === 'products' ? 'bg-purple-100 dark:bg-purple-900/30' :
                            menuView === 'payment-links' ? 'bg-indigo-100 dark:bg-indigo-900/30' :
                            'bg-orange-100 dark:bg-orange-900/30'
                          }`}>
                            {menuView === 'products' && <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                            {menuView === 'payment-links' && <Link className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                            {menuView === 'transactions' && <Receipt className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                          </div>
                        )}

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {item.name || item.reference || `#${item.id.slice(0, 8)}`}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {item.currency} {(item.price || item.amount)?.toLocaleString()}
                            {item.date && (
                              <span className="ml-1">
                                • {formatDistanceToNow(new Date(item.date))} ago
                              </span>
                            )}
                          </p>
                        </div>

                        {/* Status badge */}
                        {item.status && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            item.status === 'completed' || item.status === 'active'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {item.status}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
