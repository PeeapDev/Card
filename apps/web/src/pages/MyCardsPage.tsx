import { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  MoreVertical,
  QrCode,
  Scan,
  RefreshCw,
  ChevronRight,
  CheckCircle,
  Clock,
  X,
  AlertCircle,
  Smartphone,
  Wifi,
  Globe,
  ShoppingCart,
  Landmark,
  Settings,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import QRCode from 'react-qr-code';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useCards,
  useBlockCard,
  useUnblockCard,
  useActivateCard,
  useActivateCardByQR,
  useCardOrders,
  useCardWithType,
} from '@/hooks/useCards';
import { useWallets } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import type { Card as CardType } from '@/types';
import { useNavigate } from 'react-router-dom';
import { currencyService, Currency } from '@/services/currency.service';

export function MyCardsPage() {
  const navigate = useNavigate();
  const { data: cards, isLoading } = useCards();
  const { data: orders } = useCardOrders();
  const { data: wallets } = useWallets();
  const blockCard = useBlockCard();
  const unblockCard = useUnblockCard();
  const activateCard = useActivateCard();
  const activateByQR = useActivateCardByQR();

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || '';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol}${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [showCardDetails, setShowCardDetails] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [showFlipCard, setShowFlipCard] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);

  const handleToggleBlock = async (card: CardType) => {
    try {
      if (card.status === 'BLOCKED') {
        await unblockCard.mutateAsync(card.id);
      } else {
        await blockCard.mutateAsync(card.id);
      }
    } catch (error) {
      console.error('Failed to update card status:', error);
    }
  };

  const handleActivate = async (cardId: string) => {
    try {
      await activateCard.mutateAsync(cardId);
    } catch (error) {
      console.error('Failed to activate card:', error);
    }
  };

  const handleQRActivation = async () => {
    if (!qrInput.trim()) return;
    try {
      await activateByQR.mutateAsync(qrInput.trim());
      setShowQRScanner(false);
      setQrInput('');
      alert('Card activated successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to activate card');
    }
  };

  const getCardGradient = (type: string, index: number) => {
    const gradients = [
      'from-blue-600 to-blue-800',
      'from-purple-600 to-purple-800',
      'from-indigo-600 to-indigo-800',
      'from-teal-600 to-teal-800',
    ];
    return type === 'PHYSICAL' ? 'from-gray-700 to-gray-900' : gradients[index % gradients.length];
  };

  const pendingOrders = orders?.filter((o) => ['PENDING', 'GENERATED'].includes(o.status)) || [];
  const activeCards = cards?.filter((c) => c.status === 'ACTIVE') || [];
  const inactiveCards = cards?.filter((c) => c.status !== 'ACTIVE') || [];

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Cards</h1>
            <p className="text-gray-500 mt-1">Manage your virtual and physical cards</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowQRScanner(true)}>
              <Scan className="w-4 h-4 mr-2" />
              Scan QR
            </Button>
            <Button onClick={() => navigate('/cards/marketplace')}>
              <Plus className="w-4 h-4 mr-2" />
              Get New Card
            </Button>
          </div>
        </div>

        {/* Pending Orders */}
        {pendingOrders.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Orders</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingOrders.map((order) => (
                <Card key={order.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <div
                      className={clsx(
                        'w-16 h-10 rounded bg-gradient-to-br flex items-center justify-center',
                        order.cardType?.colorGradient || 'from-gray-400 to-gray-600'
                      )}
                    >
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{order.cardType?.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {order.status === 'PENDING' ? (
                          <span className="flex items-center gap-1 text-xs text-yellow-600">
                            <Clock className="w-3 h-3" />
                            Under Review
                          </span>
                        ) : order.status === 'GENERATED' ? (
                          <span className="flex items-center gap-1 text-xs text-purple-600">
                            <CheckCircle className="w-3 h-3" />
                            Ready for Activation
                          </span>
                        ) : null}
                      </div>
                    </div>
                    {order.status === 'GENERATED' && order.cardType?.cardType === 'PHYSICAL' && (
                      <Button size="sm" variant="outline" onClick={() => setShowQRScanner(true)}>
                        Activate
                      </Button>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Active Cards */}
        {isLoading ? (
          <div className="text-center py-12">Loading cards...</div>
        ) : cards && cards.length > 0 ? (
          <div className="space-y-6">
            {/* Active Cards Section */}
            {activeCards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Cards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeCards.map((card, index) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      index={index}
                      showDetails={showCardDetails === card.id}
                      showFlip={showFlipCard === card.id}
                      onToggleDetails={() =>
                        setShowCardDetails(showCardDetails === card.id ? null : card.id)
                      }
                      onToggleFlip={() =>
                        setShowFlipCard(showFlipCard === card.id ? null : card.id)
                      }
                      onBlock={() => handleToggleBlock(card)}
                      onViewDetails={() => {
                        setSelectedCard(card);
                        setShowCardModal(true);
                      }}
                      isBlocking={blockCard.isPending || unblockCard.isPending}
                      currencySymbol={currencySymbol}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Inactive/Blocked Cards */}
            {inactiveCards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Inactive Cards</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inactiveCards.map((card, index) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      index={index}
                      showDetails={showCardDetails === card.id}
                      showFlip={showFlipCard === card.id}
                      onToggleDetails={() =>
                        setShowCardDetails(showCardDetails === card.id ? null : card.id)
                      }
                      onToggleFlip={() =>
                        setShowFlipCard(showFlipCard === card.id ? null : card.id)
                      }
                      onBlock={() => handleToggleBlock(card)}
                      onActivate={() => handleActivate(card.id)}
                      onViewDetails={() => {
                        setSelectedCard(card);
                        setShowCardModal(true);
                      }}
                      isBlocking={blockCard.isPending || unblockCard.isPending}
                      isActivating={activateCard.isPending}
                      currencySymbol={currencySymbol}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cards yet</h3>
            <p className="text-gray-500 mb-4">Get your first card from the marketplace</p>
            <Button onClick={() => navigate('/cards/marketplace')}>
              <Plus className="w-4 h-4 mr-2" />
              Browse Cards
            </Button>
          </Card>
        )}
      </div>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Activate Physical Card</CardTitle>
                <button onClick={() => setShowQRScanner(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Smartphone className="w-8 h-8 text-primary-600" />
                </div>
                <p className="text-gray-600">
                  Scan the QR code on the back of your physical card or enter it manually below.
                </p>
              </div>

              {/* Manual QR Input */}
              <div>
                <Input
                  label="QR Code"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Enter QR code from your card"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">
                    The QR code is printed on the back of your physical card. Make sure you have received your card before activating.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQRScanner(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleQRActivation}
                  isLoading={activateByQR.isPending}
                  disabled={!qrInput.trim()}
                >
                  Activate Card
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Card Details Modal */}
      {showCardModal && selectedCard && (
        <CardDetailsModal
          card={selectedCard}
          onClose={() => {
            setShowCardModal(false);
            setSelectedCard(null);
          }}
          currencySymbol={currencySymbol}
        />
      )}
    </MainLayout>
  );
}

// Card Item Component
interface CardItemProps {
  card: CardType;
  index: number;
  showDetails: boolean;
  showFlip: boolean;
  onToggleDetails: () => void;
  onToggleFlip: () => void;
  onBlock: () => void;
  onActivate?: () => void;
  onViewDetails: () => void;
  isBlocking: boolean;
  isActivating?: boolean;
  currencySymbol: string;
}

function CardItem({
  card,
  index,
  showDetails,
  showFlip,
  onToggleDetails,
  onToggleFlip,
  onBlock,
  onActivate,
  onViewDetails,
  isBlocking,
  isActivating,
  currencySymbol,
}: CardItemProps) {
  const [showControls, setShowControls] = useState(false);
  const [cardControls, setCardControls] = useState({
    nfcPayment: true,
    onlinePayment: true,
    international: false,
    atmWithdrawal: true,
  });

  const getCardGradient = (type: string, idx: number) => {
    const gradients = [
      'from-blue-600 to-blue-800',
      'from-purple-600 to-purple-800',
      'from-indigo-600 to-indigo-800',
      'from-teal-600 to-teal-800',
    ];
    return type === 'PHYSICAL' ? 'from-gray-700 to-gray-900' : gradients[idx % gradients.length];
  };

  // Generate QR code data for payment
  const qrCodeData = `peeappay://pay?card=${card.id}&wallet=${card.walletId}&name=${encodeURIComponent(card.cardholderName)}`;

  const handleToggleControl = (control: keyof typeof cardControls) => {
    setCardControls(prev => ({ ...prev, [control]: !prev[control] }));
    // TODO: API call to persist control setting
  };

  return (
    <div className="space-y-4">
      {/* Card Visual with Flip */}
      <div className="card-flip-container" style={{ aspectRatio: '1.586/1' }}>
        <div
          className={clsx('card-flip-inner', showFlip && 'flipped')}
          onClick={onToggleFlip}
        >
          {/* Front */}
          <div
            className={clsx(
              'card-front bg-gradient-to-br p-6 text-white shadow-lg cursor-pointer card-shine',
              getCardGradient(card.type, index),
              card.status !== 'ACTIVE' && 'opacity-60'
            )}
          >
            {card.status === 'BLOCKED' && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center z-10">
                <Lock className="w-12 h-12" />
              </div>
            )}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs uppercase tracking-wider opacity-80">{card.type} Card</p>
                <p className="text-sm mt-1 opacity-90">{card.cardholderName}</p>
              </div>
              <CreditCard className="w-8 h-8" />
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              <p className="text-lg tracking-widest font-mono">
                {showDetails ? card.cardNumber : card.maskedNumber || '•••• •••• •••• ••••'}
              </p>
              <div className="flex justify-between mt-2">
                <div>
                  <p className="text-xs opacity-70">Expires</p>
                  <p className="text-sm">
                    {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs opacity-70">Status</p>
                  <p className="text-sm">{card.status}</p>
                </div>
              </div>
            </div>
            {/* Tap hint */}
            <div className="absolute top-2 right-2 opacity-50">
              <RefreshCw className="w-4 h-4" />
            </div>
          </div>

          {/* Back */}
          <div className="card-back bg-gradient-to-br from-gray-700 to-gray-900 shadow-lg overflow-hidden cursor-pointer">
            {/* Magnetic Strip */}
            <div className="absolute top-6 left-0 right-0 h-10 bg-gray-800" />

            {/* Signature Strip */}
            <div className="absolute top-20 left-4 right-20 h-8 bg-gray-200 rounded flex items-center px-2">
              <p className="text-gray-600 text-xs font-mono tracking-wider truncate">
                {card.cardholderName}
              </p>
            </div>

            {/* QR Code for payment */}
            <div className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-md">
              <QRCode value={qrCodeData} size={80} level="M" />
            </div>

            {/* Card info */}
            <div className="absolute bottom-4 left-4 max-w-[140px] text-white">
              <p className="text-xs font-semibold mb-1">Scan to Pay</p>
              <p className="text-[10px] opacity-70">Use this QR code to make instant payments without NFC</p>
            </div>

            {/* Card number last 4 */}
            <div className="absolute top-20 right-4 text-white">
              <p className="text-xs opacity-70">CVV</p>
              <p className="text-sm font-mono">•••</p>
            </div>

            {/* Tap hint */}
            <div className="absolute top-2 right-2 opacity-50">
              <RefreshCw className="w-4 h-4 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <Card padding="sm">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="text-gray-500">Daily Limit</p>
            <p className="font-medium">{currencySymbol}{card.dailyLimit.toLocaleString()}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggleDetails(); }} title="Toggle card number">
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggleFlip(); }} title="Flip card">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowControls(!showControls); }} title="Card controls">
              <Settings className="w-4 h-4" />
            </Button>
            {card.status === 'INACTIVE' && onActivate ? (
              <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onActivate(); }} isLoading={isActivating}>
                Activate
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); onBlock(); }}
                title={card.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                isLoading={isBlocking}
              >
                {card.status === 'BLOCKED' ? (
                  <Unlock className="w-4 h-4 text-green-500" />
                ) : (
                  <Lock className="w-4 h-4 text-red-500" />
                )}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onViewDetails(); }}>
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Card Controls Panel */}
      {showControls && (
        <Card padding="sm" className="animate-slide-up">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <p className="font-medium text-gray-900">Card Controls</p>
              <button onClick={() => setShowControls(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* NFC Payment Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Wifi className="w-5 h-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">NFC Payment</p>
                  <p className="text-xs text-gray-500">Tap to pay with contactless</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleControl('nfcPayment')}
                className={clsx('transition-colors', cardControls.nfcPayment ? 'text-green-500' : 'text-gray-300')}
              >
                {cardControls.nfcPayment ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>

            {/* Online Payment Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-5 h-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Online Payment</p>
                  <p className="text-xs text-gray-500">E-commerce transactions</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleControl('onlinePayment')}
                className={clsx('transition-colors', cardControls.onlinePayment ? 'text-green-500' : 'text-gray-300')}
              >
                {cardControls.onlinePayment ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>

            {/* International Toggle */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Globe className="w-5 h-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">International</p>
                  <p className="text-xs text-gray-500">Foreign currency transactions</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleControl('international')}
                className={clsx('transition-colors', cardControls.international ? 'text-green-500' : 'text-gray-300')}
              >
                {cardControls.international ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>

            {/* ATM Withdrawal Toggle */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <Landmark className="w-5 h-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">ATM Withdrawal</p>
                  <p className="text-xs text-gray-500">Cash withdrawals at ATMs</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleControl('atmWithdrawal')}
                className={clsx('transition-colors', cardControls.atmWithdrawal ? 'text-green-500' : 'text-gray-300')}
              >
                {cardControls.atmWithdrawal ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
              </button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}

// Card Details Modal
interface CardDetailsModalProps {
  card: CardType;
  onClose: () => void;
  currencySymbol: string;
}

function CardDetailsModal({ card, onClose, currencySymbol }: CardDetailsModalProps) {
  const { data: cardWithType } = useCardWithType(card.id);
  const [showSensitive, setShowSensitive] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Card Details</CardTitle>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </CardHeader>
        <div className="p-6 space-y-6">
          {/* Card Preview */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs uppercase tracking-wider opacity-80">{card.type} Card</p>
                <p className="font-bold mt-1">{cardWithType?.cardType?.name || 'Card'}</p>
              </div>
              <CreditCard className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-xl tracking-widest font-mono mb-4">
              {showSensitive
                ? card.cardNumber.replace(/(.{4})/g, '$1 ').trim()
                : '•••• •••• •••• ' + card.cardNumber.slice(-4)}
            </p>
            <div className="flex justify-between">
              <div>
                <p className="text-xs opacity-70">EXPIRES</p>
                <p>
                  {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs opacity-70">CARDHOLDER</p>
                <p>{card.cardholderName.toUpperCase()}</p>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-500">Status</span>
              <span
                className={clsx(
                  'font-medium',
                  card.status === 'ACTIVE' && 'text-green-600',
                  card.status === 'BLOCKED' && 'text-red-600',
                  card.status === 'INACTIVE' && 'text-yellow-600'
                )}
              >
                {card.status}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-500">Card Type</span>
              <span className="font-medium">{card.type}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-500">Daily Limit</span>
              <span className="font-medium">{currencySymbol}{card.dailyLimit.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-500">Monthly Limit</span>
              <span className="font-medium">{currencySymbol}{card.monthlyLimit.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-gray-500">Created</span>
              <span className="font-medium">{new Date(card.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          {/* Toggle Sensitive Data */}
          <Button variant="outline" className="w-full" onClick={() => setShowSensitive(!showSensitive)}>
            {showSensitive ? (
              <>
                <EyeOff className="w-4 h-4 mr-2" />
                Hide Card Details
              </>
            ) : (
              <>
                <Eye className="w-4 h-4 mr-2" />
                Show Full Card Number
              </>
            )}
          </Button>

          <Button variant="outline" className="w-full" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default MyCardsPage;
