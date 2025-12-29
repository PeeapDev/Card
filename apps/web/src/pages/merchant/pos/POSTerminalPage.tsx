/**
 * POS Terminal Page - Main Point of Sale Interface
 *
 * Features:
 * - Full-screen immersive mode
 * - Offline/Online sync support
 * - IndexedDB for local data persistence
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  CreditCard,
  Smartphone,
  Banknote,
  QrCode,
  X,
  Check,
  AlertCircle,
  Package,
  Barcode,
  Receipt,
  Loader2,
  ArrowLeft,
  Grid3X3,
  List,
  Calculator,
  Maximize,
  Minimize,
  Wifi,
  WifiOff,
  RefreshCw,
  Cloud,
  CloudOff,
  Clock,
  Settings,
  Wallet,
  DollarSign,
  LogOut,
  ArrowDownLeft,
  ArrowUpRight,
  MessageSquare,
  Pause,
  Play,
  Users,
  Tag,
  Percent,
  RotateCcw,
  Send,
  Radio,
} from 'lucide-react';
import posService, {
  POSProduct,
  POSCategory,
  CartItem,
  POSSaleItem,
  POSCashSession,
  POSCustomer,
  POSHeldOrder,
  POSDiscount,
  logSaleToWallet,
} from '@/services/pos.service';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { PaymentReceiver } from '@/components/payment/PaymentReceiver';
import { walletService } from '@/services/wallet.service';
import { monimeService, MonimeTransaction } from '@/services/monime.service';
import { notificationService } from '@/services/notification.service';
import { sendReceipt, ReceiptData } from '@/services/receipt.service';
import { POSWallet } from '@/components/pos/POSWallet';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function POSTerminalPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Use user.id as the merchant ID (no separate business needed)
  const merchantId = user?.id;

  // Offline sync hook
  const offlineSync = useOfflineSync(merchantId);

  // State
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<POSCategory[]>([]);
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<POSProduct[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Full-screen mode
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Payment modal state
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'mobile_money' | 'card' | 'qr' | 'credit' | 'nfc'>('cash');
  const [cashReceived, setCashReceived] = useState('');
  const [processing, setProcessing] = useState(false);
  const [saleComplete, setSaleComplete] = useState(false);
  const [lastSale, setLastSale] = useState<any>(null);

  // NFC Tap to Pay
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcReading, setNfcReading] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  const nfcReaderRef = useRef<any>(null);

  // Barcode mode
  const [barcodeMode, setBarcodeMode] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Business info
  const [business, setBusiness] = useState<any>(null);

  // Discount Code
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<POSDiscount | null>(null);
  const [discountError, setDiscountError] = useState('');
  const [applyingDiscount, setApplyingDiscount] = useState(false);

  // Held Orders
  const [showHeldOrders, setShowHeldOrders] = useState(false);
  const [heldOrders, setHeldOrders] = useState<POSHeldOrder[]>([]);
  const [holdingOrder, setHoldingOrder] = useState(false);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [holdCustomerName, setHoldCustomerName] = useState('');
  const [holdCustomerPhone, setHoldCustomerPhone] = useState('');
  const [holdNotes, setHoldNotes] = useState('');

  // Customer Credit
  const [customers, setCustomers] = useState<POSCustomer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', credit_limit: 50000 });

  // Receipt Sharing
  const [receiptPhone, setReceiptPhone] = useState('');
  const [showShareReceipt, setShowShareReceipt] = useState(false);
  const [sendingReceipt, setSendingReceipt] = useState(false);
  const [receiptSent, setReceiptSent] = useState(false);

  // Cash Session / Daily Balance
  const [cashSession, setCashSession] = useState<POSCashSession | null>(null);
  const [showOpeningBalanceModal, setShowOpeningBalanceModal] = useState(false);
  const [showClosingBalanceModal, setShowClosingBalanceModal] = useState(false);
  const [showCashInOutModal, setShowCashInOutModal] = useState(false);
  const [cashInOutType, setCashInOutType] = useState<'in' | 'out'>('in');
  const [openingBalance, setOpeningBalance] = useState('');
  const [closingBalance, setClosingBalance] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [cashReason, setCashReason] = useState('');
  const [sessionProcessing, setSessionProcessing] = useState(false);

  // QR Payment - simplified with PaymentReceiver component
  const [merchantWalletId, setMerchantWalletId] = useState<string | null>(null);
  const [qrPaymentReceived, setQrPaymentReceived] = useState(false);
  const [qrPayerInfo, setQrPayerInfo] = useState<{ payerId?: string; payerName?: string } | null>(null);

  // Deposit Fee (from admin settings)
  const [depositFee, setDepositFee] = useState({ percent: 0, flat: 0 });

  // Mobile Money Payment
  const [mobileMoneyPhone, setMobileMoneyPhone] = useState('');
  const [mobileMoneyTransactionId, setMobileMoneyTransactionId] = useState<string | null>(null);
  const [mobileMoneyStatus, setMobileMoneyStatus] = useState<'idle' | 'pending' | 'processing' | 'completed' | 'failed'>('idle');
  const [mobileMoneyUssdCode, setMobileMoneyUssdCode] = useState<string | null>(null);
  const mobileMoneyPollingRef = useRef<NodeJS.Timeout | null>(null);

  // Customer Display BroadcastChannel
  const displayChannelRef = useRef<BroadcastChannel | null>(null);

  // Full-screen toggle
  const toggleFullScreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullScreen(true);
    } else {
      document.exitFullscreen();
      setIsFullScreen(false);
    }
  }, []);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullScreenChange = () => {
      setIsFullScreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
  }, []);

  // Load and save cart from IndexedDB
  useEffect(() => {
    if (merchantId) {
      offlineSync.loadCart().then(savedCart => {
        if (savedCart && savedCart.length > 0) {
          // Convert saved cart back to CartItem format
          setCart(savedCart);
        }
      });
    }
  }, [merchantId]);

  // Save cart to IndexedDB when it changes and broadcast to customer display
  useEffect(() => {
    if (merchantId && cart.length > 0) {
      offlineSync.saveCart(cart);
    }
    // Broadcast cart update to customer display
    if (displayChannelRef.current) {
      displayChannelRef.current.postMessage({
        type: 'cart_update',
        data: { cart }
      });
    }
  }, [cart, merchantId]);

  // Initialize BroadcastChannel for customer display
  useEffect(() => {
    if (!merchantId) return;

    const channel = new BroadcastChannel(`pos_display_${merchantId}`);
    displayChannelRef.current = channel;

    // Listen for display connection
    channel.onmessage = (event) => {
      if (event.data.type === 'display_connected') {
        // Send current cart state to newly connected display
        channel.postMessage({
          type: 'cart_update',
          data: { cart }
        });
      }
    };

    return () => {
      channel.close();
      displayChannelRef.current = null;
    };
  }, [merchantId]);

  // Load data (with offline support)
  useEffect(() => {
    if (merchantId) {
      loadData();
      loadHeldOrders();
    }
  }, [merchantId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Use user profile as business info
      setBusiness({
        id: merchantId,
        name: user ? `${user.firstName} ${user.lastName}` : 'My Store',
      });

      // Load categories and products (uses offline data if available)
      const [cats, prods] = await Promise.all([
        offlineSync.getCategories(),
        offlineSync.getProducts(),
      ]);

      setCategories(cats);
      setProducts(prods);
      setFilteredProducts(prods);

      // Load merchant wallet for QR payments
      try {
        let wallets = await walletService.getWallets(merchantId!) as any[];
        let primaryWallet = wallets.find(w => w.wallet_type === 'primary' || w.wallet_type === 'merchant') || wallets[0];

        // Auto-create a primary wallet if merchant doesn't have one
        if (!primaryWallet) {
          console.log('[POS] No wallet found, creating primary wallet...');
          primaryWallet = await walletService.createWallet(merchantId!, {
            walletType: 'primary',
            currency: 'SLE',
            name: 'Primary Wallet',
          });
        }

        if (primaryWallet) {
          setMerchantWalletId(primaryWallet.id);
          console.log('[POS] Merchant wallet loaded:', primaryWallet.id);
        }
      } catch (err) {
        console.error('Error loading merchant wallet:', err);
      }

      // Load deposit fee from payment settings
      try {
        const { data: paymentSettings } = await supabase
          .from('payment_settings')
          .select('deposit_fee_percent, deposit_fee_flat')
          .eq('id', '00000000-0000-0000-0000-000000000001')
          .single();

        if (paymentSettings) {
          setDepositFee({
            percent: parseFloat(paymentSettings.deposit_fee_percent?.toString() || '0'),
            flat: parseFloat(paymentSettings.deposit_fee_flat?.toString() || '0'),
          });
          console.log('[POS] Deposit fee loaded:', paymentSettings);
        }
      } catch (err) {
        console.error('Error loading deposit fee:', err);
      }

      // Check for today's cash session
      try {
        const session = await posService.getTodayCashSession(merchantId!);
        setCashSession(session);
        if (!session) {
          // No session for today - show opening balance modal
          setShowOpeningBalanceModal(true);
        }
      } catch (err) {
        console.error('Error checking cash session:', err);
        // If table doesn't exist yet, don't block the POS
        setCashSession(null);
      }
    } catch (error) {
      console.error('Error loading POS data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open cash session (set opening balance)
  const handleOpenSession = async () => {
    if (!merchantId || !openingBalance) return;

    setSessionProcessing(true);
    try {
      const amount = parseFloat(openingBalance) || 0;
      const session = await posService.openCashSession(merchantId, amount, user?.id);
      setCashSession(session);
      setShowOpeningBalanceModal(false);
      setOpeningBalance('');
    } catch (error) {
      console.error('Error opening cash session:', error);
      alert('Failed to open cash session');
    } finally {
      setSessionProcessing(false);
    }
  };

  // Close cash session (end day)
  const handleCloseSession = async () => {
    if (!cashSession?.id || !closingBalance) return;

    setSessionProcessing(true);
    try {
      const amount = parseFloat(closingBalance) || 0;
      const session = await posService.closeCashSession(cashSession.id, amount, user?.id);
      setCashSession(session);
      setShowClosingBalanceModal(false);
      setClosingBalance('');
      // Optionally navigate back to POS app page
      navigate('/merchant/apps/pos');
    } catch (error) {
      console.error('Error closing cash session:', error);
      alert('Failed to close cash session');
    } finally {
      setSessionProcessing(false);
    }
  };

  // Add cash in/out
  const handleCashInOut = async () => {
    if (!cashSession?.id || !cashAmount) return;

    setSessionProcessing(true);
    try {
      const amount = parseFloat(cashAmount) || 0;
      const session = await posService.addCashTransaction(cashSession.id, cashInOutType, amount, cashReason);
      setCashSession(session);
      setShowCashInOutModal(false);
      setCashAmount('');
      setCashReason('');
    } catch (error) {
      console.error('Error adding cash transaction:', error);
      alert('Failed to add cash transaction');
    } finally {
      setSessionProcessing(false);
    }
  };

  // Calculate expected balance
  const calculateExpectedBalance = () => {
    if (!cashSession) return 0;
    // This is a simple calculation - in a real app you'd also account for cash sales today
    return cashSession.opening_balance + (cashSession.cash_in || 0) - (cashSession.cash_out || 0);
  };

  // Manual sync trigger
  const handleSync = async () => {
    try {
      await offlineSync.syncData();
      await loadData();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  // Load held orders
  const loadHeldOrders = async () => {
    if (!merchantId) return;
    try {
      const orders = await posService.getHeldOrders(merchantId);
      setHeldOrders(orders);
    } catch (error) {
      console.error('Error loading held orders:', error);
    }
  };

  // Load customers
  const loadCustomers = async (search?: string) => {
    if (!merchantId) return;
    try {
      const custs = await posService.getCustomers(merchantId, search);
      setCustomers(custs);
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  // Apply discount code
  const handleApplyDiscount = async () => {
    if (!merchantId || !discountCode.trim()) return;

    setApplyingDiscount(true);
    setDiscountError('');

    try {
      const discount = await posService.getDiscountByCode(merchantId, discountCode.trim());
      if (discount) {
        setAppliedDiscount(discount);
        setDiscountCode('');
      } else {
        setDiscountError('Invalid discount code');
      }
    } catch (error: any) {
      setDiscountError(error.message || 'Invalid discount code');
    } finally {
      setApplyingDiscount(false);
    }
  };

  // Remove applied discount
  const removeDiscount = () => {
    setAppliedDiscount(null);
  };

  // Hold current order
  const handleHoldOrder = async () => {
    if (!merchantId || cart.length === 0) return;

    setHoldingOrder(true);
    try {
      await posService.holdOrder(
        merchantId,
        cart,
        subtotal,
        discountAmount,
        holdCustomerName || undefined,
        holdCustomerPhone || undefined,
        holdNotes || undefined,
        user?.id
      );

      clearCart();
      setAppliedDiscount(null);
      setShowHoldModal(false);
      setHoldCustomerName('');
      setHoldCustomerPhone('');
      setHoldNotes('');
      await loadHeldOrders();
    } catch (error) {
      console.error('Error holding order:', error);
      alert('Failed to hold order');
    } finally {
      setHoldingOrder(false);
    }
  };

  // Resume held order
  const handleResumeOrder = async (order: POSHeldOrder) => {
    if (!merchantId) return;

    try {
      // Convert stored items back to CartItem format
      const restoredCart: CartItem[] = [];
      for (const storedItem of order.items as any[]) {
        // Find the product in our loaded products
        const product = products.find(p => p.id === storedItem.product_id);
        if (product) {
          restoredCart.push({
            product,
            quantity: storedItem.quantity,
            discount: storedItem.discount || 0,
            discountType: storedItem.discountType,
          });
        }
      }

      setCart(restoredCart);
      await posService.resumeHeldOrder(order.id!);
      await loadHeldOrders();
      setShowHeldOrders(false);
    } catch (error) {
      console.error('Error resuming order:', error);
      alert('Failed to resume order');
    }
  };

  // Delete held order
  const handleDeleteHeldOrder = async (orderId: string) => {
    if (!confirm('Delete this held order?')) return;

    try {
      await posService.deleteHeldOrder(orderId);
      await loadHeldOrders();
    } catch (error) {
      console.error('Error deleting held order:', error);
    }
  };

  // Create new customer
  const handleCreateCustomer = async () => {
    if (!merchantId || !newCustomer.name.trim()) return;

    try {
      const customer = await posService.createCustomer({
        merchant_id: merchantId,
        name: newCustomer.name,
        phone: newCustomer.phone,
        credit_limit: newCustomer.credit_limit,
        credit_balance: 0,
        total_purchases: 0,
        total_paid: 0,
        is_active: true,
      });

      setSelectedCustomer(customer);
      setShowNewCustomerForm(false);
      setNewCustomer({ name: '', phone: '', credit_limit: 50000 });
      await loadCustomers();
    } catch (error) {
      console.error('Error creating customer:', error);
      alert('Failed to create customer');
    }
  };

  // Share receipt via SMS
  const handleShareSMS = () => {
    if (!lastSale || !receiptPhone) return;
    const receiptText = posService.generateReceiptText(
      lastSale,
      business?.name || 'My Store',
      business?.phone
    );
    posService.shareReceiptViaSMS(receiptPhone, receiptText);
  };

  // Share receipt via WhatsApp
  const handleShareWhatsApp = () => {
    if (!lastSale || !receiptPhone) return;
    const receiptText = posService.generateReceiptText(
      lastSale,
      business?.name || 'My Store',
      business?.phone
    );
    posService.shareReceiptViaWhatsApp(receiptPhone, receiptText);
  };

  // Send receipt notification to customer
  const handleSendReceipt = async () => {
    if (!lastSale || !receiptPhone) return;

    setSendingReceipt(true);
    try {
      const items = (lastSale.items || []).map((item: any) => ({
        name: item.product_name,
        quantity: item.quantity,
        price: item.unit_price,
      }));

      const result = await notificationService.sendReceiptNotification({
        recipientPhone: receiptPhone,
        businessName: business?.name || 'My Store',
        businessPhone: business?.phone,
        saleNumber: lastSale.sale_number,
        totalAmount: lastSale.total_amount,
        currency: 'NLe',
        items,
        paymentMethod: lastSale.payment_method || 'cash',
        saleId: lastSale.id,
        cashierName: lastSale.cashier_name,
      });

      if (result.success) {
        setReceiptSent(true);
        setTimeout(() => setReceiptSent(false), 3000);
      } else {
        alert(result.error || 'Failed to send receipt');
      }
    } catch (error) {
      console.error('Send receipt error:', error);
      alert('Failed to send receipt. Please try again.');
    } finally {
      setSendingReceipt(false);
    }
  };

  // Print receipt
  const handlePrintReceipt = () => {
    if (!lastSale) return;

    const businessName = business?.name || 'My Store';
    const businessPhone = business?.phone || '';
    const businessAddress = business?.address || '';

    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=300,height=600');
    if (!printWindow) {
      alert('Please allow popups to print receipts');
      return;
    }

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt #${lastSale.sale_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 280px;
            margin: 0 auto;
            padding: 10px;
          }
          .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .header h1 { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .header p { font-size: 11px; }
          .info { margin: 10px 0; font-size: 11px; }
          .info-row { display: flex; justify-content: space-between; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin: 10px 0; }
          .item { margin-bottom: 5px; }
          .item-name { font-weight: bold; }
          .item-details { display: flex; justify-content: space-between; font-size: 11px; }
          .totals { margin: 10px 0; }
          .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-row.grand { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
          .footer { text-align: center; margin-top: 15px; padding-top: 10px; border-top: 1px dashed #000; font-size: 11px; }
          @media print {
            body { width: 100%; }
            @page { margin: 0; size: 80mm auto; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${businessName}</h1>
          ${businessAddress ? `<p>${businessAddress}</p>` : ''}
          ${businessPhone ? `<p>Tel: ${businessPhone}</p>` : ''}
        </div>

        <div class="info">
          <div class="info-row">
            <span>Receipt #:</span>
            <span>${lastSale.sale_number}</span>
          </div>
          <div class="info-row">
            <span>Date:</span>
            <span>${new Date(lastSale.created_at || Date.now()).toLocaleString()}</span>
          </div>
          <div class="info-row">
            <span>Cashier:</span>
            <span>${lastSale.cashier_name || 'Staff'}</span>
          </div>
          <div class="info-row">
            <span>Payment:</span>
            <span>${lastSale.payment_method?.replace('_', ' ').toUpperCase() || 'CASH'}</span>
          </div>
        </div>

        <div class="items">
          ${(lastSale.items || []).map((item: any) => `
            <div class="item">
              <div class="item-name">${item.product_name}</div>
              <div class="item-details">
                <span>${item.quantity} x NLe ${item.unit_price.toLocaleString()}</span>
                <span>NLe ${item.total_price.toLocaleString()}</span>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="totals">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>NLe ${(lastSale.subtotal || 0).toLocaleString()}</span>
          </div>
          ${lastSale.discount_amount > 0 ? `
            <div class="total-row">
              <span>Discount:</span>
              <span>-NLe ${lastSale.discount_amount.toLocaleString()}</span>
            </div>
          ` : ''}
          ${lastSale.tax_amount > 0 ? `
            <div class="total-row">
              <span>Tax:</span>
              <span>NLe ${lastSale.tax_amount.toLocaleString()}</span>
            </div>
          ` : ''}
          <div class="total-row grand">
            <span>TOTAL:</span>
            <span>NLe ${(lastSale.total_amount || 0).toLocaleString()}</span>
          </div>
          ${lastSale.payment_details?.received ? `
            <div class="total-row">
              <span>Cash Received:</span>
              <span>NLe ${lastSale.payment_details.received.toLocaleString()}</span>
            </div>
            <div class="total-row">
              <span>Change:</span>
              <span>NLe ${(lastSale.payment_details.change || 0).toLocaleString()}</span>
            </div>
          ` : ''}
        </div>

        <div class="footer">
          <p>Thank you for your purchase!</p>
          <p>Please come again</p>
          ${lastSale.isOffline ? '<p style="margin-top:5px;color:#666;">[Offline Sale]</p>' : ''}
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    // Wait for content to load then print
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      // Close after printing (or if cancelled)
      setTimeout(() => printWindow.close(), 1000);
    };
  };

  // Filter products
  useEffect(() => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  // Cart operations
  const addToCart = (product: POSProduct) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, discount: 0 }];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    offlineSync.clearCart();
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const itemDiscounts = cart.reduce((sum, item) => sum + item.discount, 0);
  // Calculate discount amount from applied discount code
  const discountAmount = appliedDiscount
    ? posService.calculateDiscount(appliedDiscount, subtotal, cart)
    : 0;
  const totalDiscount = itemDiscounts + discountAmount; // Item discounts + code discount
  const taxAmount = 0; // Add tax calculation if needed
  const totalAmount = subtotal - totalDiscount + taxAmount;
  const change = cashReceived ? Math.max(0, parseFloat(cashReceived) - totalAmount) : 0;

  // Barcode handling
  const handleBarcodeSubmit = async () => {
    if (!barcodeInput.trim()) return;

    try {
      const product = await posService.getProductByBarcode(merchantId!, barcodeInput.trim());
      if (product) {
        addToCart(product);
        setBarcodeInput('');
      } else {
        alert('Product not found');
      }
    } catch (error) {
      console.error('Barcode lookup error:', error);
    }
  };

  // Process sale (with offline support)
  const processSale = async () => {
    if (cart.length === 0) return;

    setProcessing(true);

    // Broadcast payment start to customer display
    if (displayChannelRef.current) {
      displayChannelRef.current.postMessage({ type: 'payment_start' });
    }

    try {
      const saleItems: POSSaleItem[] = cart.map(item => ({
        product_id: item.product.id,
        product_name: item.product.name,
        product_sku: item.product.sku,
        quantity: item.quantity,
        unit_price: item.product.price,
        discount_amount: item.discount,
        tax_amount: 0,
        total_price: (item.product.price * item.quantity) - item.discount,
      }));

      // Use offlineSync.createSale which handles both online and offline modes
      const sale = await offlineSync.createSale({
        business_id: merchantId!,
        subtotal,
        tax_amount: taxAmount,
        discount_amount: totalDiscount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        payment_status: 'completed',
        payment_details: paymentMethod === 'cash' ? { received: parseFloat(cashReceived), change } : {},
        cashier_id: user?.id,
        cashier_name: `${user?.firstName} ${user?.lastName}`,
        status: 'completed',
      }, saleItems);

      // Increment discount usage if one was applied
      if (appliedDiscount?.id) {
        try {
          await posService.incrementDiscountUsage(appliedDiscount.id);
        } catch (e) {
          console.error('Failed to increment discount usage:', e);
        }
      }

      // Log digital payment to merchant's wallet (not cash - cash stays physical)
      if (merchantId && paymentMethod !== 'cash') {
        logSaleToWallet(
          merchantId,
          sale.id,
          sale.sale_number,
          totalAmount,
          paymentMethod,
          `POS Sale - ${cart.length} item(s)`
        ).catch(err => console.error('Error logging sale to wallet:', err));
      }

      // Store sale with items for receipt printing
      setLastSale({ ...sale, items: saleItems });
      setSaleComplete(true);

      // Automatically send receipt to customer if they have phone or email
      if (selectedCustomer && (selectedCustomer.phone || selectedCustomer.email)) {
        try {
          const receiptData: ReceiptData = {
            saleId: sale.id,
            saleNumber: sale.sale_number,
            merchantId: merchantId!,
            merchantName: business?.name || `${user?.firstName} ${user?.lastName}`,
            customerName: selectedCustomer.name,
            customerPhone: selectedCustomer.phone,
            customerEmail: selectedCustomer.email,
            items: saleItems.map((item: any) => ({
              name: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              total: item.total_price,
            })),
            subtotal,
            discount: totalDiscount,
            tax: taxAmount,
            total: totalAmount,
            paymentMethod,
            amountPaid: paymentMethod === 'cash' ? parseFloat(cashReceived) : totalAmount,
            change: paymentMethod === 'cash' ? change : 0,
            date: new Date().toISOString(),
          };

          // Send receipt (creates notification and chat message)
          // The service will look up the user by phone/email
          sendReceipt(receiptData, { sendNotification: true, sendToChat: true })
            .then(result => {
              if (result.success) {
                console.log('Receipt sent to customer successfully');
              }
            })
            .catch(err => console.error('Error sending receipt:', err));
        } catch (err) {
          console.error('Error preparing receipt data:', err);
        }
      }

      // For QR payments, send receipt to payer via chat if we have their ID
      if (paymentMethod === 'qr' && qrPayerInfo?.payerId) {
        try {
          const receiptData: ReceiptData = {
            saleId: sale.id,
            saleNumber: sale.sale_number,
            merchantId: merchantId!,
            merchantName: business?.name || `${user?.firstName} ${user?.lastName}`,
            customerId: qrPayerInfo.payerId,
            customerName: qrPayerInfo.payerName || 'Customer',
            items: saleItems.map((item: any) => ({
              name: item.product_name,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              total: item.total_price,
            })),
            subtotal,
            discount: totalDiscount,
            tax: taxAmount,
            total: totalAmount,
            paymentMethod: 'qr',
            amountPaid: totalAmount,
            change: 0,
            date: new Date().toISOString(),
          };

          // Send receipt via chat to the payer
          sendReceipt(receiptData, { sendNotification: true, sendToChat: true })
            .then(result => {
              if (result.success) {
                console.log('Receipt sent to QR payer via chat successfully');
              }
            })
            .catch(err => console.error('Error sending receipt to QR payer:', err));
        } catch (err) {
          console.error('Error preparing QR payer receipt:', err);
        }
        // Clear payer info after sending
        setQrPayerInfo(null);
      }

      setCart([]);
      offlineSync.clearCart();
      setCashReceived('');
      setAppliedDiscount(null);
      setSelectedCustomer(null);
      setReceiptPhone('');

      // Broadcast payment success to customer display
      if (displayChannelRef.current) {
        displayChannelRef.current.postMessage({ type: 'payment_success' });
      }
    } catch (error) {
      console.error('Error processing sale:', error);
      alert('Failed to process sale');
      // Broadcast payment failed to customer display
      if (displayChannelRef.current) {
        displayChannelRef.current.postMessage({ type: 'payment_failed' });
      }
    } finally {
      setProcessing(false);
    }
  };

  // Handle QR payment received - using PaymentReceiver component
  const handleQrPaymentReceived = useCallback((session: any) => {
    console.log('[POS] QR Payment received:', session);
    setQrPaymentReceived(true);
    // Store payer info for receipt sending
    if (session.payerId || session.payerName) {
      setQrPayerInfo({
        payerId: session.payerId,
        payerName: session.payerName,
      });
    }
    // Auto-complete the sale after short delay
    setTimeout(() => processSale(), 500);
  }, [processSale]);

  // Reset QR payment state when switching payment methods
  useEffect(() => {
    if (paymentMethod !== 'qr') {
      setQrPaymentReceived(false);
      setQrPayerInfo(null);
    }
  }, [paymentMethod]);

  // NFC Detection and Support
  useEffect(() => {
    // Check if Web NFC API is available
    if ('NDEFReader' in window) {
      setNfcSupported(true);
      console.log('[POS] NFC is supported on this device');
    } else {
      setNfcSupported(false);
      console.log('[POS] NFC is not supported on this device');
    }

    // Cleanup NFC reader on unmount
    return () => {
      if (nfcReaderRef.current) {
        // Stop reading if active
        nfcReaderRef.current = null;
      }
    };
  }, []);

  // Start NFC reading when NFC payment method is selected
  const startNfcReading = useCallback(async () => {
    if (!nfcSupported) {
      setNfcError('NFC is not supported on this device');
      return;
    }

    setNfcReading(true);
    setNfcError(null);

    try {
      // @ts-ignore - Web NFC API
      const ndef = new window.NDEFReader();
      nfcReaderRef.current = ndef;

      await ndef.scan();
      console.log('[POS] NFC scanning started');

      ndef.addEventListener('reading', ({ serialNumber }: any) => {
        console.log('[POS] NFC tag detected:', serialNumber);
        // For now, simulate a successful payment when a tag is detected
        // In production, this would validate the payment card/device
        setNfcReading(false);
        // Process the payment
        processSale();
      });

      ndef.addEventListener('readingerror', () => {
        console.error('[POS] NFC reading error');
        setNfcError('Error reading NFC. Please try again.');
        setNfcReading(false);
      });

    } catch (error: any) {
      console.error('[POS] NFC error:', error);
      if (error.name === 'NotAllowedError') {
        setNfcError('NFC permission denied. Please enable NFC and try again.');
      } else if (error.name === 'NotSupportedError') {
        setNfcError('NFC is not supported on this device.');
        setNfcSupported(false);
      } else {
        setNfcError(error.message || 'Failed to start NFC reader');
      }
      setNfcReading(false);
    }
  }, [nfcSupported, processSale]);

  // Stop NFC reading
  const stopNfcReading = useCallback(() => {
    setNfcReading(false);
    nfcReaderRef.current = null;
  }, []);

  // Auto-start NFC reading when payment method is NFC
  useEffect(() => {
    if (paymentMethod === 'nfc' && nfcSupported && !nfcReading && showPayment) {
      startNfcReading();
    } else if (paymentMethod !== 'nfc') {
      stopNfcReading();
    }
  }, [paymentMethod, nfcSupported, showPayment, nfcReading, startNfcReading, stopNfcReading]);

  // Mobile Money Payment handlers - Redirect to Monime checkout
  const initiateMobileMoneyPayment = async () => {
    if (!merchantWalletId || !merchantId) {
      return;
    }

    setProcessing(true);

    try {
      // Calculate total with deposit fee
      const feeAmount = Math.round((totalAmount * depositFee.percent / 100) + depositFee.flat);
      const totalWithFee = totalAmount + feeAmount;

      // Generate a unique sale ID for tracking
      const pendingSaleId = `pos_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Build callback URLs
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/merchant/pos/payment/callback?status=success&sale_id=${pendingSaleId}`;
      const cancelUrl = `${baseUrl}/merchant/pos/payment/callback?status=cancel&sale_id=${pendingSaleId}`;

      // Store pending sale data in sessionStorage for retrieval after redirect
      const pendingSaleData = {
        id: pendingSaleId,
        cart: cart,
        totalAmount: totalAmount,
        feeAmount: feeAmount,
        totalWithFee: totalWithFee,
        taxAmount: taxAmount,
        discountAmount: discountAmount,
        paymentMethod: 'mobile_money',
        merchantId: merchantId,
        createdAt: new Date().toISOString(),
      };
      sessionStorage.setItem(`pos_pending_sale_${pendingSaleId}`, JSON.stringify(pendingSaleData));

      // Create checkout session with Monime - send total with fee
      const response = await monimeService.initiateDeposit({
        walletId: merchantWalletId,
        amount: totalWithFee, // Customer pays cart total + fee
        currency: 'SLE',
        method: 'CHECKOUT_SESSION', // Use checkout session for redirect flow
        description: `POS Sale - ${cart.length} item(s) - ${formatCurrency(totalAmount)} + ${formatCurrency(feeAmount)} fee`,
        successUrl: successUrl,
        cancelUrl: cancelUrl,
      });

      setMobileMoneyTransactionId(response.id);

      // Store transaction ID with the pending sale
      const updatedPendingSaleData = { ...pendingSaleData, monimeTransactionId: response.id };
      sessionStorage.setItem(`pos_pending_sale_${pendingSaleId}`, JSON.stringify(updatedPendingSaleData));

      // Redirect to Monime checkout page
      if (response.paymentUrl) {
        window.location.href = response.paymentUrl;
      } else {
        throw new Error('No payment URL received from Monime');
      }
    } catch (error: any) {
      console.error('Mobile money payment error:', error);
      setMobileMoneyStatus('failed');
      setProcessing(false);
    }
  };

  // Fallback polling for USSD payments (when redirect is not available)
  const startMobileMoneyPolling = (transactionId: string, pendingSaleId: string) => {
    if (mobileMoneyPollingRef.current) {
      clearInterval(mobileMoneyPollingRef.current);
    }

    mobileMoneyPollingRef.current = setInterval(async () => {
      try {
        const tx = await monimeService.getTransaction(transactionId);

        if (tx.status === 'completed') {
          setMobileMoneyStatus('completed');
          if (mobileMoneyPollingRef.current) {
            clearInterval(mobileMoneyPollingRef.current);
            mobileMoneyPollingRef.current = null;
          }
          // Clear the pending sale from storage
          sessionStorage.removeItem(`pos_pending_sale_${pendingSaleId}`);
          // Auto-complete the sale when payment is received
          processSale();
        } else if (tx.status === 'failed' || tx.status === 'expired' || tx.status === 'cancelled') {
          setMobileMoneyStatus('failed');
          if (mobileMoneyPollingRef.current) {
            clearInterval(mobileMoneyPollingRef.current);
            mobileMoneyPollingRef.current = null;
          }
          // Clear the pending sale from storage
          sessionStorage.removeItem(`pos_pending_sale_${pendingSaleId}`);
        }
      } catch (error) {
        console.error('Error checking mobile money status:', error);
      }
    }, 5000); // 5 seconds - mobile money typically takes 10-30s to process
  };

  // Cleanup mobile money polling
  useEffect(() => {
    return () => {
      if (mobileMoneyPollingRef.current) {
        clearInterval(mobileMoneyPollingRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (paymentMethod !== 'mobile_money') {
      if (mobileMoneyPollingRef.current) {
        clearInterval(mobileMoneyPollingRef.current);
        mobileMoneyPollingRef.current = null;
      }
      setMobileMoneyStatus('idle');
      setMobileMoneyTransactionId(null);
      setMobileMoneyUssdCode(null);
    }
  }, [paymentMethod]);

  // Quick amount buttons for cash
  const quickAmounts = [1, 2, 5, 10, 20, 50, 100]; // New Leone amounts

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  // Format last sync time
  const formatSyncTime = (isoString: string | null) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  return (
    <div ref={containerRef} className="h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {!isFullScreen && (
            <button
              onClick={() => navigate('/merchant/apps/pos')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white">POS Terminal</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">{business?.name}</p>
          </div>
        </div>

        {/* Center - Online/Offline Status */}
        <div className="flex items-center gap-3">
          {/* Online/Offline indicator */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
            offlineSync.isOnline
              ? 'bg-green-100 text-green-700'
              : 'bg-yellow-100 text-yellow-700'
          }`}>
            {offlineSync.isOnline ? (
              <>
                <Wifi className="w-4 h-4" />
                <span>Online</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline</span>
              </>
            )}
          </div>

          {/* Pending sales indicator */}
          {offlineSync.pendingSalesCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-orange-100 text-orange-700">
              <CloudOff className="w-4 h-4" />
              <span>{offlineSync.pendingSalesCount} pending</span>
            </div>
          )}

          {/* Sync button */}
          {offlineSync.isOnline && (
            <button
              onClick={handleSync}
              disabled={offlineSync.isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                offlineSync.isSyncing
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${offlineSync.isSyncing ? 'animate-spin' : ''}`} />
              <span>{offlineSync.isSyncing ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}

          {/* Last sync time */}
          {offlineSync.lastSyncTime && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="w-3 h-3" />
              <span>{formatSyncTime(offlineSync.lastSyncTime)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Cash Drawer Status */}
          {cashSession && cashSession.status === 'open' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setCashInOutType('in');
                  setShowCashInOutModal(true);
                }}
                className="p-2 hover:bg-green-100 rounded-lg text-green-600"
                title="Cash In"
              >
                <ArrowDownLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => {
                  setCashInOutType('out');
                  setShowCashInOutModal(true);
                }}
                className="p-2 hover:bg-red-100 rounded-lg text-red-600"
                title="Cash Out"
              >
                <ArrowUpRight className="w-5 h-5" />
              </button>
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
                <Wallet className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-700">
                  {formatCurrency(calculateExpectedBalance())}
                </span>
              </div>
              <button
                onClick={() => setShowClosingBalanceModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg text-red-700 transition-colors"
                title="End Day"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden md:inline text-sm font-medium">End Day</span>
              </button>
            </div>
          )}
          <div className="h-6 w-px bg-gray-200 hidden md:block" />
          {/* Held Orders Button */}
          <button
            onClick={() => {
              loadHeldOrders();
              setShowHeldOrders(true);
            }}
            className={`relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 ${heldOrders.length > 0 ? 'text-orange-600' : ''}`}
            title="Held Orders"
          >
            <Pause className="w-5 h-5" />
            {heldOrders.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs rounded-full flex items-center justify-center">
                {heldOrders.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setBarcodeMode(!barcodeMode)}
            className={`p-2 rounded-lg ${barcodeMode ? 'bg-primary-100 text-primary-600' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            title="Barcode Scanner"
          >
            <Barcode className="w-5 h-5" />
          </button>
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title={viewMode === 'grid' ? 'List View' : 'Grid View'}
          >
            {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid3X3 className="w-5 h-5" />}
          </button>
          <button
            onClick={() => navigate('/merchant/pos/products')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title="Manage Products"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={toggleFullScreen}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Mode'}
          >
            {isFullScreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Categories Sidebar - Modern Vertical Design */}
        <div className="w-20 lg:w-24 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col py-2 overflow-y-auto">
          {/* All Products */}
          <button
            onClick={() => setSelectedCategory(null)}
            className={`flex flex-col items-center justify-center py-3 px-2 mx-2 mb-1 rounded-xl transition-all ${
              !selectedCategory
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/30'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            <Grid3X3 className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium text-center leading-tight">All</span>
          </button>

          {/* Category Buttons */}
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex flex-col items-center justify-center py-3 px-2 mx-2 mb-1 rounded-xl transition-all ${
                selectedCategory === cat.id
                  ? 'text-white shadow-lg'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
              }`}
              style={{
                backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
                boxShadow: selectedCategory === cat.id ? `0 10px 15px -3px ${cat.color}40` : undefined,
              }}
            >
              <div
                className={`w-10 h-10 rounded-lg flex items-center justify-center mb-1 ${
                  selectedCategory === cat.id ? 'bg-white/20' : ''
                }`}
                style={{
                  backgroundColor: selectedCategory !== cat.id ? `${cat.color}20` : undefined,
                }}
              >
                <Package
                  className="w-5 h-5"
                  style={{ color: selectedCategory === cat.id ? 'white' : cat.color }}
                />
              </div>
              <span className="text-[10px] font-medium text-center leading-tight line-clamp-2">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Products Panel */}
        <div className="flex-1 flex flex-col overflow-hidden bg-gray-100 dark:bg-gray-900">
          {/* Barcode Input */}
          {barcodeMode && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800 px-4 py-3">
              <div className="flex items-center gap-2">
                <Barcode className="w-5 h-5 text-amber-600" />
                <input
                  ref={barcodeInputRef}
                  type="text"
                  value={barcodeInput}
                  onChange={e => setBarcodeInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleBarcodeSubmit()}
                  placeholder="Scan or enter barcode..."
                  className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 bg-white"
                  autoFocus
                />
                <Button onClick={handleBarcodeSubmit} size="sm">
                  Add
                </Button>
              </div>
            </div>
          )}

          {/* Search Bar - Prominent Design */}
          <div className="bg-white dark:bg-gray-800 px-4 py-4 shadow-sm">
            <div className="relative max-w-xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search products by name, SKU or barcode..."
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white text-base transition-all"
              />
            </div>
          </div>

          {/* Products Grid - Modern Card Design */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <Package className="w-10 h-10" />
                </div>
                <p className="text-lg font-medium mb-1">No products found</p>
                <p className="text-sm text-gray-400 mb-4">Add products to start selling</p>
                <Button
                  onClick={() => navigate('/merchant/pos/products')}
                  className="bg-primary-600 hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Products
                </Button>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                {filteredProducts.map(product => {
                  const cartItem = cart.find(item => item.product.id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`group relative bg-white dark:bg-gray-800 rounded-2xl border-2 ${
                        cartItem ? 'border-primary-500 shadow-lg shadow-primary-500/20' : 'border-transparent'
                      } p-3 text-left hover:shadow-xl hover:scale-[1.02] transition-all duration-200`}
                    >
                      {/* Quantity Badge */}
                      {cartItem && (
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-primary-600 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-lg z-10">
                          {cartItem.quantity}
                        </div>
                      )}

                      {/* Product Image */}
                      <div className="relative aspect-square mb-3 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-700">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-gray-300 dark:text-gray-600" />
                          </div>
                        )}

                        {/* Low Stock Warning */}
                        {product.track_inventory && product.stock_quantity <= product.low_stock_threshold && (
                          <div className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-[10px] font-semibold rounded-full">
                            Low: {product.stock_quantity}
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2 mb-1 min-h-[40px]">
                        {product.name}
                      </h3>
                      <p className="text-primary-600 dark:text-primary-400 font-bold text-lg">
                        {formatCurrency(product.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map(product => {
                  const cartItem = cart.find(item => item.product.id === product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className={`w-full bg-white dark:bg-gray-800 rounded-xl border-2 ${
                        cartItem ? 'border-primary-500' : 'border-transparent'
                      } p-4 flex items-center gap-4 hover:shadow-lg transition-all`}
                    >
                      <div className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-400" />
                          </div>
                        )}
                        {cartItem && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {cartItem.quantity}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                        {product.sku && <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>}
                      </div>
                      <p className="text-primary-600 font-bold text-lg">
                        {formatCurrency(product.price)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cart Panel - Modern Design */}
        <div className="w-80 lg:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col shadow-xl">
          {/* Cart Header */}
          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-primary-600 to-primary-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-bold text-white text-lg">Current Order</h2>
                  <p className="text-primary-100 text-sm">{cart.reduce((sum, item) => sum + item.quantity, 0)} items</p>
                </div>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="p-2 hover:bg-white/20 rounded-lg text-white/80 hover:text-white transition-colors"
                  title="Clear cart"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                  <ShoppingCart className="w-12 h-12" />
                </div>
                <p className="font-medium text-lg mb-1">Cart is empty</p>
                <p className="text-sm text-center">Select products from the left to add them to the cart</p>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map((item, index) => (
                  <div
                    key={item.product.id}
                    className="bg-gradient-to-r from-gray-50 to-white dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl p-3 border border-gray-100 dark:border-gray-600 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-3">
                      {/* Product Image */}
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-600 flex-shrink-0">
                        {item.product.image_url ? (
                          <img
                            src={item.product.image_url}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{item.product.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(item.product.price)} × {item.quantity}</p>
                      </div>

                      {/* Price */}
                      <p className="font-bold text-gray-900 dark:text-white">
                        {formatCurrency(item.product.price * item.quantity)}
                      </p>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-600 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                          className="w-8 h-8 rounded-md bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-10 text-center font-bold text-gray-900 dark:text-white">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                          className="w-8 h-8 rounded-md bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="p-2 text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discount Code Input */}
          {cart.length > 0 && !appliedDiscount && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={discountCode}
                    onChange={e => {
                      setDiscountCode(e.target.value.toUpperCase());
                      setDiscountError('');
                    }}
                    placeholder="Discount code"
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    onKeyDown={e => e.key === 'Enter' && handleApplyDiscount()}
                  />
                </div>
                <button
                  onClick={handleApplyDiscount}
                  disabled={applyingDiscount || !discountCode.trim()}
                  className="px-3 py-1.5 text-sm font-medium bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg disabled:opacity-50 text-gray-700 dark:text-gray-200"
                >
                  {applyingDiscount ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                </button>
              </div>
              {discountError && (
                <p className="text-xs text-red-500 mt-1">{discountError}</p>
              )}
            </div>
          )}

          {/* Applied Discount Badge */}
          {appliedDiscount && (
            <div className="px-4 py-2 border-t bg-green-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-700">
                    {appliedDiscount.name}
                    {appliedDiscount.code && ` (${appliedDiscount.code})`}
                  </span>
                </div>
                <button
                  onClick={removeDiscount}
                  className="text-red-500 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-green-600 mt-0.5">
                {appliedDiscount.type === 'percentage'
                  ? `${appliedDiscount.value}% off`
                  : `${formatCurrency(appliedDiscount.value)} off`}
                {appliedDiscount.min_purchase && ` (min ${formatCurrency(appliedDiscount.min_purchase)})`}
              </p>
            </div>
          )}

          {/* Cart Totals - Modern Design */}
          <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500 dark:text-gray-400">Subtotal</span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{formatCurrency(subtotal)}</span>
              </div>
              {itemDiscounts > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3" />
                    Item Discounts
                  </span>
                  <span>-{formatCurrency(itemDiscounts)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span className="flex items-center gap-1">
                    <Percent className="w-3 h-3" />
                    Code Discount
                  </span>
                  <span>-{formatCurrency(discountAmount)}</span>
                </div>
              )}
              {taxAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Tax</span>
                  <span className="text-gray-700 dark:text-gray-300">{formatCurrency(taxAmount)}</span>
                </div>
              )}
            </div>

            {/* Grand Total */}
            <div className="mx-4 mb-4 p-4 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl">
              <div className="flex justify-between items-center">
                <span className="text-primary-100 font-medium">Total Amount</span>
                <span className="text-white text-2xl font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment Buttons - Modern Grid Layout */}
            <div className="px-4 pb-4 space-y-3">
              {/* Quick Actions Row */}
              <div className="flex gap-2">
                {cart.length > 0 && (
                  <button
                    onClick={() => setShowHoldModal(true)}
                    className="flex-1 py-3 px-4 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border border-amber-200"
                    title="Hold Order"
                  >
                    <Pause className="w-5 h-5" />
                    <span className="hidden lg:inline">Hold</span>
                  </button>
              )}
              </div>

              {/* Main Pay Button */}
              <button
                onClick={() => setShowPayment(true)}
                disabled={cart.length === 0}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                  cart.length === 0
                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-500/30 hover:shadow-green-500/50'
                }`}
              >
                <DollarSign className="w-6 h-6" />
                <span>Pay Now</span>
              </button>

              {/* Payment Method Quick Buttons */}
              {cart.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  <button
                    onClick={() => { setPaymentMethod('cash'); setShowPayment(true); }}
                    className="py-3 px-2 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl flex flex-col items-center gap-1 transition-colors border border-green-200"
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs font-medium">Cash</span>
                  </button>
                  <button
                    onClick={() => { setPaymentMethod('card'); setShowPayment(true); }}
                    className="py-3 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl flex flex-col items-center gap-1 transition-colors border border-blue-200"
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-medium">Card</span>
                  </button>
                  <button
                    onClick={() => { setPaymentMethod('mobile_money'); setShowPayment(true); }}
                    className="py-3 px-2 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl flex flex-col items-center gap-1 transition-colors border border-purple-200"
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs font-medium">Mobile</span>
                  </button>
                  <button
                    onClick={() => { setPaymentMethod('qr'); setShowPayment(true); }}
                    className="py-3 px-2 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl flex flex-col items-center gap-1 transition-colors border border-orange-200"
                  >
                    <QrCode className="w-5 h-5" />
                    <span className="text-xs font-medium">QR</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Opening Balance Modal */}
      {showOpeningBalanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Wallet className="w-5 h-5 text-green-600" />
                Start Your Day
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Enter your cash drawer opening balance
              </p>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Opening Balance (Cash in Drawer)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">SLE</span>
                  <input
                    type="number"
                    value={openingBalance}
                    onChange={e => setOpeningBalance(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-3 text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 text-right"
                    autoFocus
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[0, 5000, 10000, 20000, 50000, 100000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setOpeningBalance(amount.toString())}
                    className="py-2 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    {amount === 0 ? 'Zero' : formatCurrency(amount)}
                  </button>
                ))}
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowOpeningBalanceModal(false);
                    navigate('/merchant/apps/pos');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleOpenSession}
                  disabled={sessionProcessing}
                >
                  {sessionProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Start Day
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Closing Balance Modal (End Day) */}
      {showClosingBalanceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-600" />
                End Day
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Count your cash drawer and enter the closing balance
              </p>
            </div>
            <div className="p-4 space-y-4">
              {/* Session Summary */}
              {cashSession && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Opening Balance</span>
                    <span className="font-medium">{formatCurrency(cashSession.opening_balance)}</span>
                  </div>
                  {(cashSession.cash_in || 0) > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Cash In</span>
                      <span>+{formatCurrency(cashSession.cash_in || 0)}</span>
                    </div>
                  )}
                  {(cashSession.cash_out || 0) > 0 && (
                    <div className="flex justify-between text-sm text-red-600">
                      <span>Cash Out</span>
                      <span>-{formatCurrency(cashSession.cash_out || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-medium pt-2 border-t">
                    <span>Expected Balance</span>
                    <span className="text-primary-600">{formatCurrency(calculateExpectedBalance())}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Actual Closing Balance (Count the Drawer)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">SLE</span>
                  <input
                    type="number"
                    value={closingBalance}
                    onChange={e => setClosingBalance(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-3 text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 text-right"
                    autoFocus
                  />
                </div>
              </div>

              {/* Difference indicator */}
              {closingBalance && (
                <div className={`rounded-lg p-3 text-center ${
                  parseFloat(closingBalance) === calculateExpectedBalance()
                    ? 'bg-green-50 border border-green-200'
                    : parseFloat(closingBalance) > calculateExpectedBalance()
                    ? 'bg-blue-50 border border-blue-200'
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {parseFloat(closingBalance) === calculateExpectedBalance() ? (
                    <>
                      <Check className="w-5 h-5 mx-auto text-green-600 mb-1" />
                      <p className="text-sm font-medium text-green-700">Balance matches!</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Difference</p>
                      <p className={`text-xl font-bold ${
                        parseFloat(closingBalance) > calculateExpectedBalance() ? 'text-blue-700' : 'text-red-700'
                      }`}>
                        {parseFloat(closingBalance) > calculateExpectedBalance() ? '+' : ''}
                        {formatCurrency(parseFloat(closingBalance) - calculateExpectedBalance())}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {parseFloat(closingBalance) > calculateExpectedBalance() ? 'Over' : 'Short'}
                      </p>
                    </>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowClosingBalanceModal(false);
                    setClosingBalance('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700"
                  onClick={handleCloseSession}
                  disabled={sessionProcessing || !closingBalance}
                >
                  {sessionProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Closing...
                    </>
                  ) : (
                    <>
                      <LogOut className="w-4 h-4 mr-2" />
                      End Day
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash In/Out Modal */}
      {showCashInOutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {cashInOutType === 'in' ? (
                  <>
                    <ArrowDownLeft className="w-5 h-5 text-green-600" />
                    <span>Cash In</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight className="w-5 h-5 text-red-600" />
                    <span>Cash Out</span>
                  </>
                )}
              </h2>
              <button
                onClick={() => {
                  setShowCashInOutModal(false);
                  setCashAmount('');
                  setCashReason('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {cashInOutType === 'in'
                  ? 'Add cash to the drawer (e.g., float, petty cash deposit)'
                  : 'Remove cash from the drawer (e.g., expenses, petty cash withdrawal)'}
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">SLE</span>
                  <input
                    type="number"
                    value={cashAmount}
                    onChange={e => setCashAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-12 pr-4 py-3 text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 text-right"
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason (Optional)
                </label>
                <input
                  type="text"
                  value={cashReason}
                  onChange={e => setCashReason(e.target.value)}
                  placeholder={cashInOutType === 'in' ? 'e.g., Additional float' : 'e.g., Office supplies'}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCashInOutModal(false);
                    setCashAmount('');
                    setCashReason('');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className={`flex-1 ${cashInOutType === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                  onClick={handleCashInOut}
                  disabled={sessionProcessing || !cashAmount || parseFloat(cashAmount) <= 0}
                >
                  {sessionProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      {cashInOutType === 'in' ? (
                        <ArrowDownLeft className="w-4 h-4 mr-2" />
                      ) : (
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                      )}
                      {cashInOutType === 'in' ? 'Add Cash' : 'Remove Cash'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPayment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            {saleComplete ? (
              // Sale Complete View
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Payment Complete!</h2>
                <p className="text-gray-600 dark:text-gray-400 mb-1">Sale #{lastSale?.sale_number}</p>
                <p className="text-2xl font-bold text-primary-600 mb-4">
                  {formatCurrency(lastSale?.total_amount || 0)}
                </p>
                {/* Offline sale indicator */}
                {lastSale?.isOffline && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div className="flex items-center justify-center gap-2 text-yellow-700">
                      <CloudOff className="w-5 h-5" />
                      <span className="font-medium">Saved Offline</span>
                    </div>
                    <p className="text-sm text-yellow-600 mt-1">
                      This sale will sync when you're back online
                    </p>
                  </div>
                )}
                {paymentMethod === 'cash' && change > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-yellow-800 font-medium">Change Due</p>
                    <p className="text-2xl font-bold text-yellow-700">{formatCurrency(change)}</p>
                  </div>
                )}

                {/* Receipt Sharing */}
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                    <Send className="w-4 h-4" />
                    Send Receipt to Customer
                  </p>
                  <div className="flex items-center gap-2 mb-3">
                    <input
                      type="tel"
                      value={receiptPhone}
                      onChange={e => setReceiptPhone(e.target.value)}
                      placeholder="Customer phone (e.g., 076123456)"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  {/* Primary Send Button */}
                  <button
                    onClick={handleSendReceipt}
                    disabled={!receiptPhone || sendingReceipt || receiptSent}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors mb-2 ${
                      receiptSent
                        ? 'bg-green-500 text-white'
                        : 'bg-primary-600 hover:bg-primary-700 disabled:bg-gray-300 text-white'
                    }`}
                  >
                    {sendingReceipt ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : receiptSent ? (
                      <>
                        <Check className="w-4 h-4" />
                        Receipt Sent!
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send Receipt
                      </>
                    )}
                  </button>
                  {/* Alternative share options */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleShareSMS}
                      disabled={!receiptPhone}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      SMS App
                    </button>
                    <button
                      onClick={handleShareWhatsApp}
                      disabled={!receiptPhone}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 disabled:opacity-50 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      WhatsApp
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handlePrintReceipt}
                  >
                    <Receipt className="w-4 h-4 mr-2" />
                    Print
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => {
                      setShowPayment(false);
                      setSaleComplete(false);
                      setLastSale(null);
                      setReceiptPhone('');
                      setReceiptSent(false);
                    }}
                  >
                    New Sale
                  </Button>
                </div>
              </div>
            ) : (
              // Payment Method Selection
              <>
                <div className="p-4 border-b flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Payment</h2>
                  <button
                    onClick={() => setShowPayment(false)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-4">
                  {/* Total */}
                  <div className="text-center mb-6">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Amount Due</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalAmount)}</p>
                  </div>

                  {/* Payment Methods */}
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <button
                      onClick={() => setPaymentMethod('cash')}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                        paymentMethod === 'cash'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Banknote className={`w-8 h-8 ${paymentMethod === 'cash' ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'}`} />
                      <span className={`font-medium ${paymentMethod === 'cash' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        Cash
                      </span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('mobile_money')}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                        paymentMethod === 'mobile_money'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Smartphone className={`w-8 h-8 ${paymentMethod === 'mobile_money' ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'}`} />
                      <span className={`font-medium ${paymentMethod === 'mobile_money' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        Mobile Money
                      </span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('card')}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                        paymentMethod === 'card'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <CreditCard className={`w-8 h-8 ${paymentMethod === 'card' ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'}`} />
                      <span className={`font-medium ${paymentMethod === 'card' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        Card
                      </span>
                    </button>
                    <button
                      onClick={() => setPaymentMethod('nfc')}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors relative ${
                        paymentMethod === 'nfc'
                          ? 'border-purple-500 bg-purple-50'
                          : nfcSupported
                            ? 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                            : 'border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed'
                      }`}
                      disabled={!nfcSupported}
                    >
                      <Radio className={`w-8 h-8 ${paymentMethod === 'nfc' ? 'text-purple-600' : 'text-gray-600 dark:text-gray-400'}`} />
                      <span className={`font-medium ${paymentMethod === 'nfc' ? 'text-purple-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        Tap to Pay
                      </span>
                      {!nfcSupported && (
                        <span className="absolute -top-1 -right-1 text-xs bg-red-100 text-red-600 px-1 rounded">N/A</span>
                      )}
                    </button>
                    <button
                      onClick={() => setPaymentMethod('qr')}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors ${
                        paymentMethod === 'qr'
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <QrCode className={`w-8 h-8 ${paymentMethod === 'qr' ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'}`} />
                      <span className={`font-medium ${paymentMethod === 'qr' ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        QR Code
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setPaymentMethod('credit');
                        loadCustomers();
                      }}
                      className={`p-4 rounded-lg border-2 flex flex-col items-center gap-2 transition-colors col-span-2 ${
                        paymentMethod === 'credit'
                          ? 'border-orange-500 bg-orange-50'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Users className={`w-8 h-8 ${paymentMethod === 'credit' ? 'text-orange-600' : 'text-gray-600 dark:text-gray-400'}`} />
                      <span className={`font-medium ${paymentMethod === 'credit' ? 'text-orange-600' : 'text-gray-700 dark:text-gray-300'}`}>
                        Credit / Tab
                      </span>
                    </button>
                  </div>

                  {/* Cash Payment - Amount Received */}
                  {paymentMethod === 'cash' && (
                    <div className="space-y-3 mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Cash Received
                      </label>
                      <input
                        type="number"
                        value={cashReceived}
                        onChange={e => setCashReceived(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full px-4 py-3 text-xl font-semibold border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 text-center"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        {quickAmounts.map(amount => (
                          <button
                            key={amount}
                            onClick={() => setCashReceived(amount.toString())}
                            className="py-2 px-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200"
                          >
                            {formatCurrency(amount)}
                          </button>
                        ))}
                      </div>
                      {parseFloat(cashReceived) >= totalAmount && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
                          <p className="text-sm text-green-600">Change</p>
                          <p className="text-xl font-bold text-green-700">
                            {formatCurrency(parseFloat(cashReceived) - totalAmount)}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mobile Money - Direct to Monime Checkout */}
                  {paymentMethod === 'mobile_money' && (() => {
                    // Calculate deposit fee
                    const feeAmount = Math.round((totalAmount * depositFee.percent / 100) + depositFee.flat);
                    const totalWithFee = totalAmount + feeAmount;

                    return (
                      <div className="space-y-4 mb-6">
                        {mobileMoneyStatus === 'completed' ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                            <Check className="w-16 h-16 mx-auto text-green-500 mb-4" />
                            <p className="text-lg font-semibold text-green-600">Payment Received!</p>
                          </div>
                        ) : mobileMoneyStatus === 'failed' ? (
                          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                            <p className="text-lg font-semibold text-red-600">Payment Failed</p>
                            <button
                              onClick={() => setMobileMoneyStatus('idle')}
                              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium"
                            >
                              Try Again
                            </button>
                          </div>
                        ) : processing ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
                            <div className="relative w-20 h-20 mx-auto mb-4">
                              <Loader2 className="w-20 h-20 text-blue-500 animate-spin" />
                              <Smartphone className="w-8 h-8 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                            </div>
                            <p className="text-lg font-semibold text-blue-700">Redirecting to Mobile Money...</p>
                            <p className="text-sm text-blue-600 mt-2">
                              Please wait while we connect you to the payment page
                            </p>
                          </div>
                        ) : (
                          <>
                            {/* Amount Display with Fee Breakdown */}
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6">
                              <div className="flex items-center justify-center mb-4">
                                <Smartphone className="w-10 h-10 text-orange-600" />
                              </div>

                              {/* Fee Breakdown */}
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                  <span>Cart Total:</span>
                                  <span>{formatCurrency(totalAmount)}</span>
                                </div>
                                {feeAmount > 0 && (
                                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                                    <span>Transaction Fee:</span>
                                    <span>+ {formatCurrency(feeAmount)}</span>
                                  </div>
                                )}
                                <div className="border-t border-orange-200 dark:border-orange-700 pt-2 mt-2">
                                  <div className="flex justify-between font-bold text-orange-800 dark:text-orange-200">
                                    <span>Customer Pays:</span>
                                    <span className="text-xl">{formatCurrency(totalWithFee)}</span>
                                  </div>
                                </div>
                              </div>

                              <p className="text-xs text-orange-500 dark:text-orange-400 mt-4 text-center">
                                Customer will enter their mobile money number on the next screen
                              </p>
                            </div>

                            {/* Pay with Mobile Money Button */}
                            <button
                              onClick={initiateMobileMoneyPayment}
                              disabled={!merchantWalletId || processing}
                              className="w-full py-4 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
                            >
                              <Smartphone className="w-5 h-5" />
                              Pay {formatCurrency(totalWithFee)} with Mobile Money
                            </button>

                            {!merchantWalletId && (
                              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
                                <AlertCircle className="w-5 h-5 inline text-yellow-600 mr-1" />
                                <span className="text-sm text-yellow-700">Wallet not configured for mobile payments</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })()}

                  {/* NFC Tap to Pay */}
                  {paymentMethod === 'nfc' && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-6 mb-6">
                      {nfcSupported ? (
                        <div className="text-center">
                          {nfcReading ? (
                            <>
                              <div className="w-24 h-24 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center animate-pulse">
                                <Radio className="w-12 h-12 text-purple-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 mb-2">
                                Ready for Tap
                              </h3>
                              <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
                                Hold the customer's card or phone near this device
                              </p>
                              <div className="text-2xl font-bold text-purple-800 dark:text-purple-200 mb-4">
                                {formatCurrency(totalAmount)}
                              </div>
                              <Button
                                variant="outline"
                                onClick={stopNfcReading}
                                className="border-purple-300 text-purple-700 hover:bg-purple-100"
                              >
                                Cancel
                              </Button>
                            </>
                          ) : nfcError ? (
                            <>
                              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                                <X className="w-8 h-8 text-red-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-2">
                                NFC Error
                              </h3>
                              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                                {nfcError}
                              </p>
                              <Button onClick={startNfcReading} className="bg-purple-600 hover:bg-purple-700">
                                Try Again
                              </Button>
                            </>
                          ) : (
                            <>
                              <div className="w-16 h-16 mx-auto mb-4 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                                <Radio className="w-8 h-8 text-purple-600" />
                              </div>
                              <h3 className="text-lg font-semibold text-purple-800 dark:text-purple-300 mb-2">
                                Tap to Pay
                              </h3>
                              <p className="text-sm text-purple-600 dark:text-purple-400 mb-4">
                                Accept contactless payments via NFC
                              </p>
                              <Button onClick={startNfcReading} className="bg-purple-600 hover:bg-purple-700">
                                <Radio className="w-4 h-4 mr-2" />
                                Start NFC Reader
                              </Button>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                            <Radio className="w-8 h-8 text-gray-400" />
                          </div>
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            NFC Not Available
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            This device does not support NFC payments.
                            <br />
                            Try using a mobile device with NFC capability.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* QR Code Payment - Using standardized PaymentReceiver component */}
                  {paymentMethod === 'qr' && (
                    <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-6">
                      {merchantId && merchantWalletId && totalAmount > 0 ? (
                        <PaymentReceiver
                          walletId={merchantWalletId}
                          userId={merchantId}
                          amount={totalAmount}
                          currency="SLE"
                          note={`POS Sale - ${cart.length} item(s) - ${formatCurrency(totalAmount)}`}
                          description={`POS Sale - ${cart.length} item(s)`}
                          merchantName={business?.name || 'POS Terminal'}
                          referencePrefix="POS"
                          onPaymentReceived={handleQrPaymentReceived}
                          metadata={{
                            source: 'pos',
                            itemCount: cart.length,
                            businessId: business?.id,
                            businessName: business?.name,
                          }}
                          qrSize={180}
                          showAmount={true}
                          currencySymbol="NLe"
                          strictVerification={true}
                        />
                      ) : (
                        <div className="text-center py-4">
                          <QrCode className="w-16 h-16 mx-auto text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">
                            {totalAmount <= 0
                              ? 'Add items to cart to enable QR payment'
                              : 'Wallet not configured for QR payments'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Credit/Tab Payment */}
                  {paymentMethod === 'credit' && (
                    <div className="space-y-3 mb-6">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Add this sale to a customer's credit tab
                      </p>

                      {/* Customer Selection */}
                      {selectedCustomer ? (
                        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{selectedCustomer.name}</p>
                              {selectedCustomer.phone && (
                                <p className="text-sm text-gray-600 dark:text-gray-400">{selectedCustomer.phone}</p>
                              )}
                            </div>
                            <button
                              onClick={() => setSelectedCustomer(null)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="mt-2 pt-2 border-t border-orange-200 grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Current Balance</p>
                              <p className={`font-medium ${selectedCustomer.credit_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(selectedCustomer.credit_balance)}
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-500 dark:text-gray-400">Credit Limit</p>
                              <p className="font-medium text-gray-900 dark:text-white">{formatCurrency(selectedCustomer.credit_limit)}</p>
                            </div>
                          </div>
                          {/* Check if credit limit exceeded */}
                          {selectedCustomer.credit_balance + totalAmount > selectedCustomer.credit_limit && (
                            <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-sm text-red-700">
                              <AlertCircle className="w-4 h-4 inline mr-1" />
                              Credit limit would be exceeded
                            </div>
                          )}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            loadCustomers();
                            setShowCustomerModal(true);
                          }}
                          className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors"
                        >
                          <Users className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="font-medium text-gray-600 dark:text-gray-400">Select Customer</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Click to choose a customer</p>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Complete Payment Button */}
                  <Button
                    onClick={processSale}
                    disabled={
                      processing ||
                      (paymentMethod === 'cash' && parseFloat(cashReceived) < totalAmount) ||
                      (paymentMethod === 'credit' && (!selectedCustomer || selectedCustomer.credit_balance + totalAmount > selectedCustomer.credit_limit))
                    }
                    className="w-full"
                    size="lg"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5 mr-2" />
                        Complete Payment
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Hold Order Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Pause className="w-5 h-5 text-orange-600" />
                Hold Order
              </h2>
              <button
                onClick={() => setShowHoldModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Park this order for later. You can resume it from the Held Orders list.
              </p>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">Items: {cart.length}</p>
                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatCurrency(subtotal)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customer Name (Optional)
                </label>
                <input
                  type="text"
                  value={holdCustomerName}
                  onChange={e => setHoldCustomerName(e.target.value)}
                  placeholder="e.g., John"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  value={holdCustomerPhone}
                  onChange={e => setHoldCustomerPhone(e.target.value)}
                  placeholder="e.g., 076123456"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notes (Optional)
                </label>
                <input
                  type="text"
                  value={holdNotes}
                  onChange={e => setHoldNotes(e.target.value)}
                  placeholder="e.g., Waiting for payment"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowHoldModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                  onClick={handleHoldOrder}
                  disabled={holdingOrder}
                >
                  {holdingOrder ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Holding...
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      Hold Order
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Held Orders List Modal */}
      {showHeldOrders && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Pause className="w-5 h-5 text-orange-600" />
                Held Orders ({heldOrders.length})
              </h2>
              <button
                onClick={() => setShowHeldOrders(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {heldOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Pause className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No held orders</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {heldOrders.map(order => (
                    <div
                      key={order.id}
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-orange-300 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{order.hold_number}</p>
                          {order.customer_name && (
                            <p className="text-sm text-gray-600 dark:text-gray-400">{order.customer_name}</p>
                          )}
                          {order.customer_phone && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer_phone}</p>
                          )}
                        </div>
                        <p className="font-bold text-gray-900 dark:text-white">{formatCurrency(order.subtotal)}</p>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                        <p>{(order.items as any[]).length} items</p>
                        <p>Held: {new Date(order.held_at!).toLocaleString()}</p>
                        {order.notes && <p className="italic">{order.notes}</p>}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 bg-green-600 hover:bg-green-700"
                          onClick={() => handleResumeOrder(order)}
                        >
                          <Play className="w-4 h-4 mr-1" />
                          Resume
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleDeleteHeldOrder(order.id!)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Select Customer
              </h2>
              <button
                onClick={() => {
                  setShowCustomerModal(false);
                  setShowNewCustomerForm(false);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {showNewCustomerForm ? (
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    value={newCustomer.name}
                    onChange={e => setNewCustomer({ ...newCustomer, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={e => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                    placeholder="e.g., 076123456"
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Credit Limit
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400">SLE</span>
                    <input
                      type="number"
                      value={newCustomer.credit_limit}
                      onChange={e => setNewCustomer({ ...newCustomer, credit_limit: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-12 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowNewCustomerForm(false)}
                  >
                    Back
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateCustomer}
                    disabled={!newCustomer.name.trim()}
                  >
                    Create Customer
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="p-4 border-b">
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={customerSearch}
                        onChange={e => {
                          setCustomerSearch(e.target.value);
                          loadCustomers(e.target.value);
                        }}
                        placeholder="Search customers..."
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        autoFocus
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => setShowNewCustomerForm(true)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {customers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No customers found</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setShowNewCustomerForm(true)}
                      >
                        Add New Customer
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {customers.map(customer => (
                        <button
                          key={customer.id}
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerModal(false);
                          }}
                          className="w-full text-left p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                              {customer.phone && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500 dark:text-gray-400">Credit Balance</p>
                              <p className={`font-medium ${customer.credit_balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(customer.credit_balance)}
                              </p>
                              <p className="text-xs text-gray-400">
                                Limit: {formatCurrency(customer.credit_limit)}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default POSTerminalPage;
