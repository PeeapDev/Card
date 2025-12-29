/**
 * POS Customer Display Page
 *
 * A dedicated page for customer-facing second screens.
 * Shows cart items, totals, and payment status in real-time.
 *
 * Features:
 * - Real-time cart synchronization via BroadcastChannel
 * - Payment status animations
 * - Fully customizable display options
 * - Fullscreen optimized
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, Check, Loader2, CreditCard, Clock, Tag, Percent } from 'lucide-react';
import indexedDBService from '@/services/indexeddb.service';

// Cart item type matching POS terminal
interface CartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image_url?: string;
}

// Display settings type - matching the expanded settings
interface DisplaySettings {
  enabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  fontSize: 'small' | 'medium' | 'large';
  // Header options
  showLogo: boolean;
  showBusinessName: boolean;
  showDateTime: boolean;
  // Welcome screen options
  showWelcomeMessage: boolean;
  welcomeMessage: string;
  showPromotionalBanner: boolean;
  promotionalMessage: string;
  // Cart display options
  showItemImages: boolean;
  showItemDescriptions: boolean;
  showItemPrices: boolean;
  showItemQuantity: boolean;
  showItemsAsAdded: boolean;
  // Totals display options
  showSubtotal: boolean;
  showTaxBreakdown: boolean;
  showDiscounts: boolean;
  showTotalAmount: boolean;
  // Payment options
  showPaymentMethod: boolean;
  showPaymentAnimation: boolean;
  showThankYouMessage: boolean;
  thankYouMessage: string;
  // Effects
  playSound: boolean;
  // Colors
  backgroundColor: string;
  accentColor: string;
}

interface POSSettings {
  businessName: string;
  showLogo: boolean;
  secondScreen: DisplaySettings;
}

// Format currency
const formatCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Payment status type
type PaymentStatus = 'idle' | 'processing' | 'success' | 'failed';

export function POSCustomerDisplayPage() {
  const [searchParams] = useSearchParams();
  const merchantId = searchParams.get('merchantId');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [settings, setSettings] = useState<POSSettings | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [taxAmount, setTaxAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = subtotal + taxAmount - discountAmount;

  // Default settings fallback
  const displaySettings = settings?.secondScreen || {
    showLogo: true,
    showBusinessName: true,
    showDateTime: true,
    showWelcomeMessage: true,
    welcomeMessage: 'Welcome! Your order will appear here.',
    showPromotionalBanner: false,
    promotionalMessage: '',
    showItemImages: true,
    showItemDescriptions: false,
    showItemPrices: true,
    showItemQuantity: true,
    showItemsAsAdded: true,
    showSubtotal: true,
    showTaxBreakdown: true,
    showDiscounts: true,
    showTotalAmount: true,
    showPaymentMethod: true,
    showPaymentAnimation: true,
    showThankYouMessage: true,
    thankYouMessage: 'Thank you for your purchase!',
    playSound: false,
    fontSize: 'large' as const,
    theme: 'dark' as const,
  };

  // Font size classes based on settings
  const fontSizeClasses = {
    small: {
      title: 'text-2xl',
      itemName: 'text-base',
      itemPrice: 'text-base',
      total: 'text-3xl',
      welcome: 'text-xl',
      time: 'text-sm',
    },
    medium: {
      title: 'text-3xl',
      itemName: 'text-lg',
      itemPrice: 'text-lg',
      total: 'text-4xl',
      welcome: 'text-2xl',
      time: 'text-base',
    },
    large: {
      title: 'text-4xl',
      itemName: 'text-xl',
      itemPrice: 'text-xl',
      total: 'text-5xl',
      welcome: 'text-3xl',
      time: 'text-lg',
    },
  };

  const fontSize = displaySettings.fontSize || 'large';
  const fonts = fontSizeClasses[fontSize];

  // Theme colors
  const isDark = displaySettings.theme === 'dark' ||
    (displaySettings.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  const themeClasses = isDark
    ? 'bg-gray-900 text-white'
    : 'bg-gray-50 text-gray-900';

  const cardClasses = isDark
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200';

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (merchantId) {
        try {
          const savedSettings = await indexedDBService.getSetting<POSSettings>(`pos_settings_${merchantId}`, undefined);
          if (savedSettings) {
            setSettings(savedSettings);
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        }
      }
    };
    loadSettings();

    // Reload settings periodically (60s - settings rarely change)
    const interval = setInterval(loadSettings, 60000);
    return () => clearInterval(interval);
  }, [merchantId]);

  // Set up BroadcastChannel for real-time updates
  useEffect(() => {
    if (!merchantId) return;

    const channel = new BroadcastChannel(`pos_display_${merchantId}`);
    broadcastChannelRef.current = channel;

    channel.onmessage = (event) => {
      const { type, data } = event.data;

      switch (type) {
        case 'cart_update':
          if (data.cart && data.cart.length > cart.length && displaySettings.showItemsAsAdded) {
            const newItem = data.cart[data.cart.length - 1];
            setLastAddedItemId(newItem.id);
            setTimeout(() => setLastAddedItemId(null), 2000);
          }
          setCart(data.cart || []);
          if (data.taxAmount !== undefined) setTaxAmount(data.taxAmount);
          if (data.discountAmount !== undefined) setDiscountAmount(data.discountAmount);
          break;

        case 'payment_start':
          setPaymentStatus('processing');
          if (data.method) setPaymentMethod(data.method);
          break;

        case 'payment_success':
          setPaymentStatus('success');
          if (displaySettings.playSound) {
            // Play success sound
            try {
              const audio = new Audio('/sounds/success.mp3');
              audio.play().catch(() => {});
            } catch {}
          }
          setTimeout(() => {
            setPaymentStatus('idle');
            setCart([]);
            setTaxAmount(0);
            setDiscountAmount(0);
          }, 4000);
          break;

        case 'payment_failed':
          setPaymentStatus('failed');
          setTimeout(() => setPaymentStatus('idle'), 3000);
          break;

        case 'cart_clear':
          setCart([]);
          setPaymentStatus('idle');
          setTaxAmount(0);
          setDiscountAmount(0);
          break;

        case 'ping':
          channel.postMessage({ type: 'pong' });
          break;
      }
    };

    channel.postMessage({ type: 'display_connected' });
    setConnected(true);

    return () => {
      channel.close();
    };
  }, [merchantId, cart.length, displaySettings.showItemsAsAdded, displaySettings.playSound]);

  // Idle/Welcome state
  if (cart.length === 0 && paymentStatus === 'idle') {
    return (
      <div className={`min-h-screen ${themeClasses} flex flex-col`}>
        {/* Header with DateTime */}
        {displaySettings.showDateTime && (
          <div className={`p-4 flex justify-between items-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              <span className={fonts.time}>
                {currentTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </span>
            </div>
            <span className={`${fonts.time} font-mono`}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {displaySettings.showBusinessName && settings?.businessName && (
            <h1 className={`${fonts.title} font-bold mb-8 text-center`}>
              {settings.businessName}
            </h1>
          )}

          {displaySettings.showWelcomeMessage && (
            <div className="text-center">
              <ShoppingCart className="w-24 h-24 mx-auto mb-6 text-primary-500 opacity-50" />
              <p className={`${fonts.welcome} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {displaySettings.welcomeMessage || 'Welcome! Your order will appear here.'}
              </p>
            </div>
          )}
        </div>

        {/* Promotional Banner */}
        {displaySettings.showPromotionalBanner && displaySettings.promotionalMessage && (
          <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-3 overflow-hidden">
            <div className="animate-marquee whitespace-nowrap">
              <span className="mx-8 text-lg font-medium">{displaySettings.promotionalMessage}</span>
              <span className="mx-8 text-lg font-medium">{displaySettings.promotionalMessage}</span>
            </div>
          </div>
        )}

        {/* Connection status */}
        <div className={`absolute bottom-4 right-4 flex items-center gap-2 text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span>{connected ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>
    );
  }

  // Payment Success Animation
  if (paymentStatus === 'success' && displaySettings.showPaymentAnimation) {
    return (
      <div className={`min-h-screen ${themeClasses} flex flex-col items-center justify-center p-8`}>
        <div className="animate-bounce">
          <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center mb-8 shadow-2xl shadow-green-500/50">
            <Check className="w-20 h-20 text-white" />
          </div>
        </div>
        <h2 className={`${fonts.title} font-bold text-green-500 mb-4`}>Payment Successful!</h2>
        {displaySettings.showThankYouMessage && (
          <p className={`${fonts.welcome} ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            {displaySettings.thankYouMessage || 'Thank you for your purchase!'}
          </p>
        )}
        {displaySettings.showPaymentMethod && paymentMethod && (
          <p className={`mt-4 text-lg ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Paid via {paymentMethod.replace(/_/g, ' ').toUpperCase()}
          </p>
        )}
      </div>
    );
  }

  // Payment Processing Animation
  if (paymentStatus === 'processing' && displaySettings.showPaymentAnimation) {
    return (
      <div className={`min-h-screen ${themeClasses} flex flex-col items-center justify-center p-8`}>
        <div className="relative">
          <Loader2 className="w-32 h-32 text-primary-500 animate-spin" />
          <CreditCard className="w-12 h-12 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary-600" />
        </div>
        <h2 className={`${fonts.title} font-bold text-primary-500 mt-8`}>Processing Payment...</h2>
        <p className={`${fonts.welcome} ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-2`}>
          Please wait
        </p>
        {displaySettings.showTotalAmount && (
          <p className={`mt-6 ${fonts.total} font-bold text-primary-400`}>
            {formatCurrency(totalAmount)}
          </p>
        )}
      </div>
    );
  }

  // Cart Display
  return (
    <div className={`min-h-screen ${themeClasses} flex flex-col`}>
      {/* Header */}
      <div className={`p-4 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'} flex justify-between items-center`}>
        <div className="flex items-center gap-4">
          {displaySettings.showBusinessName && settings?.businessName && (
            <h1 className={`${fonts.title} font-bold`}>
              {settings.businessName}
            </h1>
          )}
        </div>
        {displaySettings.showDateTime && (
          <div className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <Clock className="w-5 h-5" />
            <span className={fonts.time}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-4xl mx-auto space-y-3">
          {cart.map((item, index) => (
            <div
              key={`${item.id}-${index}`}
              className={`flex items-center gap-4 p-4 rounded-xl border ${cardClasses} transition-all duration-500 ${
                lastAddedItemId === item.id && displaySettings.showItemsAsAdded
                  ? 'ring-2 ring-primary-500 scale-[1.02] shadow-lg shadow-primary-500/20'
                  : ''
              }`}
            >
              {/* Item Image */}
              {displaySettings.showItemImages && (
                item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className={`w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <ShoppingCart className={`w-8 h-8 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  </div>
                )
              )}

              {/* Item Details */}
              <div className="flex-1 min-w-0">
                <h3 className={`${fonts.itemName} font-medium truncate`}>{item.name}</h3>
                {displaySettings.showItemDescriptions && item.description && (
                  <p className={`text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'} truncate`}>
                    {item.description}
                  </p>
                )}
                {(displaySettings.showItemPrices || displaySettings.showItemQuantity) && (
                  <p className={`text-base ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {displaySettings.showItemPrices && formatCurrency(item.price)}
                    {displaySettings.showItemPrices && displaySettings.showItemQuantity && ' x '}
                    {displaySettings.showItemQuantity && `${item.quantity}`}
                  </p>
                )}
              </div>

              {/* Item Total */}
              {displaySettings.showItemPrices && (
                <div className="text-right">
                  <p className={`${fonts.itemPrice} font-bold text-primary-500`}>
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer - Totals */}
      <div className={`p-6 border-t ${isDark ? 'border-gray-800 bg-gray-800/50' : 'border-gray-200 bg-white'}`}>
        <div className="max-w-4xl mx-auto">
          {/* Breakdown */}
          <div className="space-y-2 mb-4">
            {displaySettings.showSubtotal && (
              <div className="flex justify-between text-lg">
                <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>
                  Subtotal ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                </span>
                <span className="font-medium">{formatCurrency(subtotal)}</span>
              </div>
            )}
            {displaySettings.showTaxBreakdown && taxAmount > 0 && (
              <div className="flex justify-between text-lg">
                <span className={`flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Percent className="w-4 h-4" /> Tax
                </span>
                <span className="font-medium">{formatCurrency(taxAmount)}</span>
              </div>
            )}
            {displaySettings.showDiscounts && discountAmount > 0 && (
              <div className="flex justify-between text-lg text-green-500">
                <span className="flex items-center gap-2">
                  <Tag className="w-4 h-4" /> Discount
                </span>
                <span className="font-medium">-{formatCurrency(discountAmount)}</span>
              </div>
            )}
          </div>

          {/* Total */}
          {displaySettings.showTotalAmount && (
            <div className="flex items-center justify-between pt-4 border-t border-dashed border-gray-600">
              <span className={`text-xl font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>TOTAL</span>
              <span className={`${fonts.total} font-bold text-primary-500`}>
                {formatCurrency(totalAmount)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Promotional Banner */}
      {displaySettings.showPromotionalBanner && displaySettings.promotionalMessage && (
        <div className="bg-gradient-to-r from-primary-600 to-primary-500 text-white py-2 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap">
            <span className="mx-8 text-base font-medium">{displaySettings.promotionalMessage}</span>
            <span className="mx-8 text-base font-medium">{displaySettings.promotionalMessage}</span>
          </div>
        </div>
      )}

      {/* Connection status */}
      <div className={`absolute bottom-4 right-4 flex items-center gap-2 text-sm ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
        <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>

      {/* CSS for marquee animation */}
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
      `}</style>
    </div>
  );
}

export default POSCustomerDisplayPage;
