import { useState, useRef } from 'react';
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
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { SlideToSend } from '@/components/ui/SlideToSend';
import { useCardTypes, useCreateCardOrder, useCards, useCardOrders } from '@/hooks/useCards';
import { useWallets } from '@/hooks/useWallets';
import { useAuth } from '@/context/AuthContext';
import type { CardType } from '@/services/card.service';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';

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

  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const userKycLevel = user?.kycTier || 1;

  const scrollCards = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 340; // Card width + gap
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleSelectCard = (cardType: CardType) => {
    setSelectedCard(cardType);
    setSelectedWallet(wallets && wallets.length === 1 ? wallets[0].id : null);
    setShowPurchaseModal(true);
    setPurchaseSuccess(false);
  };

  const handlePurchase = async () => {
    if (!selectedCard || !selectedWallet) return;

    setIsPurchasing(true);
    try {
      await createOrder.mutateAsync({
        cardTypeId: selectedCard.id,
        walletId: selectedWallet,
      });
      setPurchaseSuccess(true);
    } catch (error) {
      console.error('Failed to create order:', error);
      alert('Failed to purchase card. Please try again.');
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
                        <div className="absolute top-4 right-4">
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
                                {cardType.price === 0 ? 'FREE' : `$${cardType.price.toFixed(2)}`}
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
                              {cardType.transactionFeePercentage}% + ${cardType.transactionFeeFixed.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p>Daily Limit</p>
                            <p className="font-medium text-gray-700">
                              ${cardType.dailyLimit.toLocaleString()}
                            </p>
                          </div>
                        </div>

                        {/* Action Button */}
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
              // Purchase Flow
              <>
                {/* Card Preview Header */}
                <div
                  className={clsx(
                    'relative p-6 text-white bg-gradient-to-br',
                    selectedCard.colorGradient
                  )}
                >
                  <button
                    onClick={() => setShowPurchaseModal(false)}
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
                      {selectedCard.price === 0 ? 'FREE' : `$${selectedCard.price.toFixed(2)}`}
                    </p>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Features Summary */}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Sparkles className="w-4 h-4 text-yellow-500" />
                    {selectedCard.features.slice(0, 2).join(' • ')}
                  </div>

                  {/* Wallet Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Wallet className="w-4 h-4 inline mr-1" />
                      Pay from Wallet
                    </label>
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
                              disabled={!hasBalance}
                              className={clsx(
                                'w-full p-4 border rounded-xl text-left transition-all',
                                selectedWallet === wallet.id
                                  ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200'
                                  : hasBalance
                                  ? 'border-gray-200 hover:border-gray-300'
                                  : 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
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
                                      Balance: ${wallet.balance.toFixed(2)}
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
                  </div>

                  {/* Insufficient Balance Warning */}
                  {selectedWallet && !hasSufficientBalance && (
                    <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-red-800">Insufficient Balance</p>
                        <p className="text-sm text-red-600">
                          You need ${(selectedCard.price - (selectedWalletData?.balance || 0)).toFixed(2)} more to purchase this card.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Order Summary */}
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Card Price</span>
                      <span className="font-medium">${selectedCard.price.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Transaction Fee</span>
                      <span className="font-medium">
                        {selectedCard.transactionFeePercentage}% + ${selectedCard.transactionFeeFixed.toFixed(2)}
                      </span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-medium">Total</span>
                      <span className="font-bold text-lg">${selectedCard.price.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Slide to Pay */}
                  {selectedWallet && hasSufficientBalance ? (
                    <SlideToSend
                      amount={selectedCard.price.toFixed(2)}
                      recipientName={selectedCard.name}
                      onConfirm={handlePurchase}
                      disabled={!selectedWallet || !hasSufficientBalance}
                      isProcessing={isPurchasing}
                    />
                  ) : (
                    <Button
                      className="w-full"
                      disabled={!selectedWallet || !hasSufficientBalance}
                    >
                      {!selectedWallet ? 'Select a Wallet' : 'Insufficient Balance'}
                    </Button>
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
