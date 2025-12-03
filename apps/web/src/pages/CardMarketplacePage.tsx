import { useState, useRef, useEffect } from 'react';
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  Shield,
  Check,
  AlertCircle,
  Wallet,
  ArrowRight,
  Sparkles,
  MapPin,
  User,
  Lock,
  Eye,
  EyeOff,
  Gift,
  Search,
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { SlideToSend } from '@/components/ui/SlideToSend';
import { UserSearch } from '@/components/ui/UserSearch';
import { useCardTypes, useCreateCardOrder, useCards, useCardOrders } from '@/hooks/useCards';
import { useWallets } from '@/hooks/useWallets';
import { useAuth } from '@/context/AuthContext';
import type { CardType } from '@/services/card.service';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { currencyService, Currency } from '@/services/currency.service';

const KYC_LEVELS: Record<number, { label: string; description: string }> = {
  1: { label: 'Basic', description: 'Email verification' },
  2: { label: 'Advanced', description: 'ID verification required' },
  3: { label: 'Enhanced', description: 'Full KYC with address proof' },
};

export function CardMarketplacePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cardTypes, isLoading: loadingTypes } = useCardTypes();
  const { data: wallets, isLoading: loadingWallets } = useWallets();
  const { data: existingCards } = useCards();
  const { data: orders } = useCardOrders();
  const createOrder = useCreateCardOrder();

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
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseStep, setPurchaseStep] = useState<'details' | 'wallet' | 'confirm'>('details');

  // Form fields
  const [cardholderName, setCardholderName] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState({
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
  });

  // Gift card option
  const [isGift, setIsGift] = useState(false);
  const [giftRecipient, setGiftRecipient] = useState<{ id: string; firstName: string; lastName: string; email: string } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const userKycLevel = user?.kycTier || 1;

  // Check if user already owns a card of this type (based on pending/active orders)
  const userOwnedCardTypeIds = new Set([
    ...(orders?.filter(o => o.status !== 'REJECTED' && o.status !== 'CANCELLED').map(o => o.cardTypeId) || []),
  ]);

  const scrollCards = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // Card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleSelectCard = (cardType: CardType, forceGift = false) => {
    const alreadyOwns = userOwnedCardTypeIds.has(cardType.id);

    setSelectedCard(cardType);
    setSelectedWallet(wallets && wallets.length === 1 ? wallets[0].id : null);
    setShowPurchaseModal(true);
    setPurchaseSuccess(false);
    setPurchaseStep('details');
    // If user already owns this card type, force gift mode
    setIsGift(alreadyOwns || forceGift);
    setGiftRecipient(null);
    // Pre-fill cardholder name from user profile (only if not a gift)
    setCardholderName(!alreadyOwns && !forceGift && user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '');
    setCardPin('');
    setConfirmPin('');
    setDeliveryAddress({
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    });
  };

  const resetPurchaseForm = () => {
    setPurchaseStep('details');
    setCardholderName('');
    setCardPin('');
    setConfirmPin('');
    setDeliveryAddress({
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    });
    setIsGift(false);
    setGiftRecipient(null);
  };

  const isDetailsValid = () => {
    const nameValid = cardholderName.trim().length >= 3;
    const pinValid = cardPin.length === 4 && /^\d{4}$/.test(cardPin);
    const pinMatch = cardPin === confirmPin;

    // If gift, must have recipient selected
    if (isGift && !giftRecipient) {
      return false;
    }

    if (selectedCard?.cardType === 'PHYSICAL') {
      const addressValid = deliveryAddress.street && deliveryAddress.city &&
                          deliveryAddress.state && deliveryAddress.postalCode && deliveryAddress.country;
      return nameValid && pinValid && pinMatch && addressValid;
    }
    return nameValid && pinValid && pinMatch;
  };

  const handlePurchase = async () => {
    if (!selectedCard || !selectedWallet) return;

    setIsPurchasing(true);
    try {
      await createOrder.mutateAsync({
        cardTypeId: selectedCard.id,
        walletId: selectedWallet,
        cardholderName: cardholderName.trim(),
        cardPin,
        shippingAddress: selectedCard.cardType === 'PHYSICAL' ? deliveryAddress : undefined,
        giftRecipientId: isGift && giftRecipient ? giftRecipient.id : undefined,
      });
      setPurchaseSuccess(true);
      resetPurchaseForm();
    } catch (error: any) {
      console.error('Failed to create order:', error);
      const errorMsg = error?.message || error?.toString() || 'Unknown error';
      alert(`Failed to purchase card: ${errorMsg}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  const selectedWalletData = wallets?.find((w) => w.id === selectedWallet);
  const hasSufficientBalance = selectedWalletData && selectedCard
    ? selectedWalletData.balance >= selectedCard.price
    : false;

  const pendingOrders = orders?.filter((o) => o.status === 'PENDING' || o.status === 'GENERATED') || [];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Card Marketplace</h1>
          <p className="text-gray-500 mt-1">Choose a card that fits your needs</p>
        </div>

        {/* Pending Orders Banner */}
        {pendingOrders.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-full">
                <CreditCard className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium text-yellow-800">
                  You have {pendingOrders.length} card order{pendingOrders.length > 1 ? 's' : ''} pending
                </p>
                <p className="text-sm text-yellow-600">
                  Your card{pendingOrders.length > 1 ? 's are' : ' is'} being processed
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/cards')}>
              View My Cards
            </Button>
          </div>
        )}

        {/* Card Carousel */}
        {loadingTypes ? (
          <div className="text-center py-12">Loading available cards...</div>
        ) : cardTypes && cardTypes.length > 0 ? (
          <div className="relative">
            {/* Scroll Buttons */}
            <button
              onClick={() => scrollCards('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white shadow-lg rounded-full hover:bg-gray-50 -ml-4"
            >
              <ChevronLeft className="w-6 h-6 text-gray-600" />
            </button>
            <button
              onClick={() => scrollCards('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 p-2 bg-white shadow-lg rounded-full hover:bg-gray-50 -mr-4"
            >
              <ChevronRight className="w-6 h-6 text-gray-600" />
            </button>

            {/* Cards Container */}
            <div
              ref={scrollContainerRef}
              className="flex gap-6 overflow-x-auto pb-4 scroll-smooth scrollbar-hide"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              {cardTypes.map((cardType) => {
                const meetsKyc = userKycLevel >= cardType.requiredKycLevel;
                const isPhysical = cardType.cardType === 'PHYSICAL';
                const alreadyOwns = userOwnedCardTypeIds.has(cardType.id);

                return (
                  <div
                    key={cardType.id}
                    className="flex-none w-80"
                  >
                    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Card Visual */}
                      <div
                        className={clsx(
                          'relative aspect-[1.586/1] p-6 text-white bg-gradient-to-br cursor-pointer',
                          cardType.colorGradient
                        )}
                        onClick={() => handleSelectCard(cardType)}
                      >
                        {/* Card Type Badge */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          {alreadyOwns && (
                            <span className="px-2 py-1 bg-green-500/90 backdrop-blur-sm rounded-full text-xs font-medium">
                              Owned
                            </span>
                          )}
                          <span className="px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-medium">
                            {cardType.cardType}
                          </span>
                        </div>

                        <div className="flex flex-col h-full justify-between">
                          <div>
                            <CreditCard className="w-10 h-10 opacity-80" />
                            <p className="font-bold text-lg mt-2">{cardType.name}</p>
                          </div>

                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-xs opacity-70">Starting at</p>
                              <p className="text-2xl font-bold">
                                {cardType.price === 0 ? 'FREE' : formatCurrency(cardType.price)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs opacity-70">Requires</p>
                              <p className="text-sm">{KYC_LEVELS[cardType.requiredKycLevel]?.label} KYC</p>
                            </div>
                          </div>
                        </div>

                        {/* Overlay if KYC not met */}
                        {!meetsKyc && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <div className="text-center">
                              <Shield className="w-10 h-10 mx-auto mb-2" />
                              <p className="font-medium">KYC Level {cardType.requiredKycLevel} Required</p>
                              <Button
                                variant="outline"
                                size="sm"
                                className="mt-2 bg-white/10 border-white/30 hover:bg-white/20"
                              >
                                Upgrade KYC
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card Details */}
                      <div className="p-4 space-y-4">
                        <p className="text-sm text-gray-600 line-clamp-2">{cardType.description}</p>

                        {/* Features */}
                        <div className="space-y-2">
                          {cardType.features.slice(0, 3).map((feature, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                              <span className="text-gray-600">{feature}</span>
                            </div>
                          ))}
                        </div>

                        {/* Fees & Limits */}
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 pt-2 border-t">
                          <div>
                            <p>Transaction Fee</p>
                            <p className="font-medium text-gray-700">
                              {cardType.transactionFeePercentage}% + {formatCurrency(cardType.transactionFeeFixed)}
                            </p>
                          </div>
                          <div>
                            <p>Daily Limit</p>
                            <p className="font-medium text-gray-700">
                              {currencySymbol}{cardType.dailyLimit.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {alreadyOwns ? (
                          <Button
                            className="w-full"
                            variant="outline"
                            onClick={() => handleSelectCard(cardType, true)}
                            disabled={!meetsKyc}
                          >
                            <Gift className="w-4 h-4 mr-2" />
                            Gift This Card
                          </Button>
                        ) : (
                          <Button
                            className="w-full"
                            onClick={() => handleSelectCard(cardType)}
                            disabled={!meetsKyc}
                          >
                            {meetsKyc ? (
                              <>
                                Get This Card
                                <ArrowRight className="w-4 h-4 ml-2" />
                              </>
                            ) : (
                              <>
                                <Shield className="w-4 h-4 mr-2" />
                                Upgrade KYC First
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <Card className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cards available</h3>
            <p className="text-gray-500">Check back later for new card offerings</p>
          </Card>
        )}

        {/* Existing Cards Section */}
        {existingCards && existingCards.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">My Cards</h2>
              <Button variant="outline" size="sm" onClick={() => navigate('/cards')}>
                View All
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {existingCards.slice(0, 3).map((card) => (
                <Card
                  key={card.id}
                  className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate('/cards')}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-medium">{card.maskedNumber}</p>
                      <p className="text-sm text-gray-500">{card.type} Card • {card.status}</p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full sm:max-w-lg sm:mx-4 rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
            {purchaseSuccess ? (
              // Success State
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Order Placed!</h2>
                <p className="text-gray-600 mb-6">
                  Your card order has been submitted for review. You'll be notified once it's approved.
                </p>
                <div className="space-y-3">
                  <Button className="w-full" onClick={() => navigate('/cards')}>
                    View My Cards
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowPurchaseModal(false);
                      setPurchaseSuccess(false);
                    }}
                  >
                    Continue Shopping
                  </Button>
                </div>
              </div>
            ) : (
              // Purchase Flow - Multi-step
              <>
                {/* Card Preview Header */}
                <div
                  className={clsx(
                    'relative p-6 text-white bg-gradient-to-br',
                    selectedCard.colorGradient
                  )}
                >
                  <button
                    onClick={() => {
                      if (purchaseStep === 'details') {
                        setShowPurchaseModal(false);
                      } else if (purchaseStep === 'wallet') {
                        setPurchaseStep('details');
                      } else {
                        setPurchaseStep('wallet');
                      }
                    }}
                    className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <CreditCard className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-bold text-xl">{selectedCard.name}</p>
                      <p className="text-white/80 text-sm">{selectedCard.cardType} Card</p>
                    </div>
                  </div>
                  <div className="mt-6">
                    <p className="text-white/70 text-sm">Card Price</p>
                    <p className="text-3xl font-bold">
                      {selectedCard.price === 0 ? 'FREE' : formatCurrency(selectedCard.price)}
                    </p>
                  </div>
                  {/* Step Indicator */}
                  <div className="flex gap-2 mt-4">
                    {['details', 'wallet', 'confirm'].map((step, idx) => (
                      <div
                        key={step}
                        className={clsx(
                          'flex-1 h-1 rounded-full',
                          purchaseStep === step ? 'bg-white' :
                          ['details', 'wallet', 'confirm'].indexOf(purchaseStep) > idx ? 'bg-white/60' : 'bg-white/30'
                        )}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Step 1: Card Details */}
                  {purchaseStep === 'details' && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        {isGift ? <Gift className="w-4 h-4 text-primary-500" /> : <User className="w-4 h-4 text-primary-500" />}
                        <span className="font-medium">Step 1: {isGift ? 'Gift Card Details' : 'Card Details'}</span>
                      </div>

                      {/* Gift Mode Banner */}
                      {isGift && (
                        <div className="flex items-center gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                          <Gift className="w-5 h-5 text-purple-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-purple-800">Purchasing as a Gift</p>
                            <p className="text-sm text-purple-600">
                              {userOwnedCardTypeIds.has(selectedCard?.id || '')
                                ? 'You already own this card. You can gift it to someone else.'
                                : 'This card will be gifted to another user.'}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Gift Recipient Selection */}
                      {isGift && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <Search className="w-4 h-4 inline mr-1" />
                            Gift Recipient
                          </label>
                          <UserSearch
                            onSelect={(user) => {
                              setGiftRecipient({
                                id: user.id,
                                firstName: user.first_name || '',
                                lastName: user.last_name || '',
                                email: user.email || '',
                              });
                              // Pre-fill cardholder name with recipient's name
                              setCardholderName(`${user.first_name || ''} ${user.last_name || ''}`.trim().toUpperCase());
                            }}
                            placeholder="Search for recipient by name, email, or phone..."
                          />
                          {giftRecipient && (
                            <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                              <div>
                                <p className="font-medium text-green-800">
                                  {giftRecipient.firstName} {giftRecipient.lastName}
                                </p>
                                <p className="text-sm text-green-600">{giftRecipient.email}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setGiftRecipient(null);
                                  setCardholderName('');
                                }}
                                className="text-green-600 hover:text-green-800"
                              >
                                Change
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Cardholder Name */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <User className="w-4 h-4 inline mr-1" />
                          Cardholder Name
                        </label>
                        <input
                          type="text"
                          value={cardholderName}
                          onChange={(e) => setCardholderName(e.target.value.toUpperCase())}
                          placeholder="Enter name as it will appear on card"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 uppercase"
                          maxLength={26}
                          disabled={isGift && giftRecipient !== null}
                        />
                        <p className="text-xs text-gray-500 mt-1">Name will appear on the card (max 26 characters)</p>
                      </div>

                      {/* Card PIN */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Lock className="w-4 h-4 inline mr-1" />
                          Set 4-Digit Card PIN
                        </label>
                        <div className="relative">
                          <input
                            type={showPin ? 'text' : 'password'}
                            value={cardPin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setCardPin(val);
                            }}
                            placeholder="Enter 4-digit PIN"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                            maxLength={4}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      {/* Confirm PIN */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          <Lock className="w-4 h-4 inline mr-1" />
                          Confirm PIN
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPin ? 'text' : 'password'}
                            value={confirmPin}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setConfirmPin(val);
                            }}
                            placeholder="Re-enter PIN"
                            className={clsx(
                              'w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
                              confirmPin && confirmPin !== cardPin ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            )}
                            maxLength={4}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPin(!showConfirmPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                        {confirmPin && confirmPin !== cardPin && (
                          <p className="text-xs text-red-500 mt-1">PINs do not match</p>
                        )}
                      </div>

                      {/* Delivery Address (for Physical Cards) */}
                      {selectedCard.cardType === 'PHYSICAL' && (
                        <div className="space-y-4 pt-4 border-t">
                          <label className="block text-sm font-medium text-gray-700">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Delivery Address
                          </label>
                          <input
                            type="text"
                            value={deliveryAddress.street}
                            onChange={(e) => setDeliveryAddress({ ...deliveryAddress, street: e.target.value })}
                            placeholder="Street Address"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={deliveryAddress.city}
                              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, city: e.target.value })}
                              placeholder="City"
                              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                            />
                            <input
                              type="text"
                              value={deliveryAddress.state}
                              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, state: e.target.value })}
                              placeholder="State/Province"
                              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={deliveryAddress.postalCode}
                              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, postalCode: e.target.value })}
                              placeholder="Postal Code"
                              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                            />
                            <input
                              type="text"
                              value={deliveryAddress.country}
                              onChange={(e) => setDeliveryAddress({ ...deliveryAddress, country: e.target.value })}
                              placeholder="Country"
                              className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500"
                            />
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => setPurchaseStep('wallet')}
                        disabled={!isDetailsValid()}
                      >
                        Continue to Payment
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  )}

                  {/* Step 2: Wallet Selection */}
                  {purchaseStep === 'wallet' && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Wallet className="w-4 h-4 text-primary-500" />
                        <span className="font-medium">Step 2: Select Payment Wallet</span>
                      </div>

                      {loadingWallets ? (
                        <p className="text-gray-500">Loading wallets...</p>
                      ) : wallets && wallets.length > 0 ? (
                        <div className="space-y-2">
                          {wallets.map((wallet) => {
                            const hasBalance = wallet.balance >= selectedCard.price;
                            return (
                              <button
                                key={wallet.id}
                                onClick={() => setSelectedWallet(wallet.id)}
                                className={clsx(
                                  'w-full p-4 border rounded-xl text-left transition-all',
                                  selectedWallet === wallet.id
                                    ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                    : hasBalance
                                    ? 'border-gray-200 hover:border-gray-300'
                                    : 'border-gray-200 bg-gray-50'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div
                                      className={clsx(
                                        'w-10 h-10 rounded-full flex items-center justify-center',
                                        hasBalance ? 'bg-green-100' : 'bg-gray-100'
                                      )}
                                    >
                                      <Wallet
                                        className={clsx(
                                          'w-5 h-5',
                                          hasBalance ? 'text-green-600' : 'text-gray-400'
                                        )}
                                      />
                                    </div>
                                    <div>
                                      <p className="font-medium">{wallet.currency} Wallet</p>
                                      <p className="text-sm text-gray-500">
                                        Balance: {formatCurrency(wallet.balance)}
                                      </p>
                                    </div>
                                  </div>
                                  {selectedWallet === wallet.id && (
                                    <Check className="w-5 h-5 text-primary-600" />
                                  )}
                                  {!hasBalance && (
                                    <span className="text-xs text-red-500">Insufficient</span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-4 border border-dashed border-gray-300 rounded-xl">
                          <Wallet className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500">No wallets available</p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Create Wallet
                          </Button>
                        </div>
                      )}

                      {/* Insufficient Balance Warning */}
                      {selectedWallet && !hasSufficientBalance && (
                        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-red-800">Insufficient Balance</p>
                            <p className="text-sm text-red-600">
                              You need {formatCurrency(selectedCard.price - (selectedWalletData?.balance || 0))} more.
                            </p>
                          </div>
                        </div>
                      )}

                      <Button
                        className="w-full"
                        onClick={() => setPurchaseStep('confirm')}
                        disabled={!selectedWallet || !hasSufficientBalance}
                      >
                        Review Order
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </>
                  )}

                  {/* Step 3: Confirm & Pay */}
                  {purchaseStep === 'confirm' && (
                    <>
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Check className="w-4 h-4 text-primary-500" />
                        <span className="font-medium">Step 3: Review & Confirm</span>
                      </div>

                      {/* Order Summary */}
                      <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                        {isGift && giftRecipient && (
                          <div className="flex items-center gap-2 p-2 bg-purple-100 rounded-lg mb-2">
                            <Gift className="w-4 h-4 text-purple-600" />
                            <span className="text-sm font-medium text-purple-800">
                              Gift for {giftRecipient.firstName} {giftRecipient.lastName}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Card</span>
                          <span className="font-medium">{selectedCard.name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Cardholder</span>
                          <span className="font-medium">{cardholderName}</span>
                        </div>
                        {isGift && giftRecipient && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Recipient</span>
                            <span className="font-medium">{giftRecipient.email}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Pay from</span>
                          <span className="font-medium">{selectedWalletData?.currency} Wallet</span>
                        </div>
                        {selectedCard.cardType === 'PHYSICAL' && (
                          <div className="pt-2 border-t">
                            <span className="text-sm text-gray-600">Delivery Address:</span>
                            <p className="text-sm font-medium mt-1">
                              {deliveryAddress.street}, {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}, {deliveryAddress.country}
                            </p>
                          </div>
                        )}
                        <div className="border-t pt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Card Price</span>
                            <span className="font-medium">{formatCurrency(selectedCard.price)}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Transaction Fee</span>
                            <span className="font-medium">
                              {selectedCard.transactionFeePercentage}% + {formatCurrency(selectedCard.transactionFeeFixed)}
                            </span>
                          </div>
                          <div className="border-t pt-2 flex justify-between">
                            <span className="font-bold">Total</span>
                            <span className="font-bold text-lg">{formatCurrency(selectedCard.price)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Slide to Pay */}
                      <SlideToSend
                        amount={selectedCard.price.toFixed(2)}
                        recipientName={selectedCard.name}
                        onConfirm={handlePurchase}
                        disabled={!selectedWallet || !hasSufficientBalance}
                        isProcessing={isPurchasing}
                      />
                    </>
                  )}

                  {/* Cancel */}
                  <button
                    onClick={() => setShowPurchaseModal(false)}
                    className="w-full text-center text-gray-500 text-sm hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
