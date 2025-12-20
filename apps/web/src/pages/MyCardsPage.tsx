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
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Radio,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { BrandedQRCode } from '@/components/ui/BrandedQRCode';
import { MainLayout } from '@/components/layout/MainLayout';
import {
  useCards,
  useBlockCard,
  useUnblockCard,
  useActivateCard,
  useActivateCardByQR,
  useCardOrders,
  useCardWithType,
  useTopUpCard,
} from '@/hooks/useCards';
import { useWallets } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import type { Card as CardType } from '@/types';
import { useNavigate } from 'react-router-dom';
import { currencyService, Currency } from '@/services/currency.service';
import { NFCLinkGenerator } from '@/components/payment/NFCLinkGenerator';
import { useAuth } from '@/context/AuthContext';
import { useNFCPaymentLinks, NFCPaymentLink } from '@/hooks/useNFCPayments';
import { supabase } from '@/lib/supabase';
import { cardService, IssuedCard } from '@/services/card.service';

export function MyCardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cards, isLoading } = useCards();
  const { data: orders } = useCardOrders();
  const { data: wallets } = useWallets();
  const { data: nfcPaymentLinks, isLoading: nfcLinksLoading, refetch: refetchNFCLinks } = useNFCPaymentLinks();
  const blockCard = useBlockCard();
  const unblockCard = useUnblockCard();
  const activateCard = useActivateCard();
  const activateByQR = useActivateCardByQR();
  const topUpCardMutation = useTopUpCard();

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || '';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [showCardDetails, setShowCardDetails] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [showFlipCard, setShowFlipCard] = useState<string | null>(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState<string>('');
  const [topUpCard, setTopUpCard] = useState<CardType | null>(null);
  const [showNFCSetup, setShowNFCSetup] = useState(false);
  const [nfcSetupCard, setNfcSetupCard] = useState<CardType | null>(null);
  const [copiedNFCLink, setCopiedNFCLink] = useState<string | null>(null);
  const [sourceWalletId, setSourceWalletId] = useState<string>('');
  const [topUpError, setTopUpError] = useState<string>('');
  const [topUpSuccess, setTopUpSuccess] = useState<boolean>(false);

  // Virtual Cards state
  const [virtualCards, setVirtualCards] = useState<IssuedCard[]>([]);
  const [virtualCardsLoading, setVirtualCardsLoading] = useState(false);
  const [showVirtualCardModal, setShowVirtualCardModal] = useState(false);
  const [selectedVirtualCard, setSelectedVirtualCard] = useState<IssuedCard | null>(null);
  const [showVirtualCardDetails, setShowVirtualCardDetails] = useState<string | null>(null);

  // Fetch virtual cards
  useEffect(() => {
    const fetchVirtualCards = async () => {
      if (!user?.id) return;
      setVirtualCardsLoading(true);
      try {
        const cards = await cardService.getIssuedCards(user.id);
        setVirtualCards(cards);
      } catch (error) {
        console.error('Failed to fetch virtual cards:', error);
      } finally {
        setVirtualCardsLoading(false);
      }
    };
    fetchVirtualCards();
  }, [user?.id]);

  // Handle virtual card freeze/unfreeze
  const handleToggleVirtualCardFreeze = async (card: IssuedCard) => {
    try {
      await cardService.toggleCardFreeze(card.id, user!.id, !card.isFrozen);
      // Refresh virtual cards
      const cards = await cardService.getIssuedCards(user!.id);
      setVirtualCards(cards);
    } catch (error: any) {
      alert(error.message || 'Failed to update card');
    }
  };

  // Get connected wallet for a card
  const getConnectedWallet = (walletId: string) => {
    return wallets?.find(w => w.id === walletId) || null;
  };

  // Handle top up
  const handleTopUp = (card: CardType) => {
    setTopUpCard(card);
    setTopUpAmount('');
    setTopUpError('');
    setTopUpSuccess(false);
    // Default to first wallet that's not the card's wallet, or the card's wallet if only one exists
    const availableWallets = wallets?.filter(w => w.id !== card.walletId) || [];
    setSourceWalletId(availableWallets.length > 0 ? availableWallets[0].id : (wallets?.[0]?.id || ''));
    setShowTopUpModal(true);
  };

  // Handle NFC setup
  const handleNFCSetup = (card: CardType) => {
    setNfcSetupCard(card);
    setShowNFCSetup(true);
  };

  // Copy NFC link to clipboard
  const handleCopyNFCLink = async (shortCode: string, linkId: string) => {
    try {
      const paymentUrl = `${window.location.origin}/pay/nfc/${shortCode}`;
      await navigator.clipboard.writeText(paymentUrl);
      setCopiedNFCLink(linkId);
      setTimeout(() => setCopiedNFCLink(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Deactivate NFC payment link
  const handleDeactivateNFCLink = async (linkId: string) => {
    if (!confirm('Are you sure you want to deactivate this payment link? It will no longer accept payments.')) {
      return;
    }
    try {
      await supabase
        .from('nfc_payment_links')
        .update({ status: 'inactive' })
        .eq('id', linkId);
      refetchNFCLinks();
    } catch (err) {
      console.error('Failed to deactivate link:', err);
    }
  };

  // Get card for an NFC payment link
  const getCardForNFCLink = (cardId?: string) => {
    if (!cardId) return null;
    return cards?.find(c => c.id === cardId);
  };

  const handleTopUpSubmit = async () => {
    if (!topUpCard || !topUpAmount || !sourceWalletId) return;

    setTopUpError('');
    setTopUpSuccess(false);

    try {
      const amount = Number(topUpAmount);

      if (amount <= 0) {
        setTopUpError('Please enter a valid amount');
        return;
      }

      await topUpCardMutation.mutateAsync({
        cardId: topUpCard.id,
        sourceWalletId: sourceWalletId,
        amount: amount,
      });

      setTopUpSuccess(true);

      // Close modal after short delay to show success
      setTimeout(() => {
        setShowTopUpModal(false);
        setTopUpCard(null);
        setTopUpAmount('');
        setTopUpSuccess(false);
      }, 1500);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to top up card. Please try again.';
      setTopUpError(errorMessage);
    }
  };

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

        {/* NFC Payment Links Section */}
        {nfcPaymentLinks && nfcPaymentLinks.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">NFC Payment Links</h2>
              </div>
              <span className="text-sm text-gray-500">{nfcPaymentLinks.filter(l => l.status === 'active').length} active</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nfcPaymentLinks.filter(l => l.status === 'active').map((link) => {
                const linkedCard = getCardForNFCLink(link.card_id);
                const paymentUrl = `${window.location.origin}/pay/nfc/${link.short_code}`;
                return (
                  <Card key={link.id} className="p-4">
                    <div className="flex items-start gap-4">
                      {/* NFC Icon */}
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Wifi className="w-6 h-6 text-white" />
                      </div>

                      {/* Link Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-900 truncate">{link.name}</p>
                          <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                            Secure
                          </span>
                        </div>
                        {linkedCard && (
                          <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                            <CreditCard className="w-3 h-3" />
                            Card ****{linkedCard.cardNumber.slice(-4)}
                          </p>
                        )}

                        {/* Short Code Display */}
                        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 rounded-lg">
                          <span className="text-xs text-indigo-600">Code:</span>
                          <span className="font-mono font-bold text-indigo-900 tracking-wider">{link.short_code}</span>
                        </div>

                        {/* Payment URL - Copyable */}
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2 font-mono text-xs text-gray-600 truncate border border-gray-200">
                            {paymentUrl}
                          </div>
                          <button
                            onClick={() => handleCopyNFCLink(link.short_code, link.id)}
                            className={clsx(
                              'p-2 rounded-lg transition-colors flex-shrink-0',
                              copiedNFCLink === link.id
                                ? 'bg-green-100 text-green-600'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            )}
                            title="Copy payment link"
                          >
                            {copiedNFCLink === link.id ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Stats */}
                        <div className="mt-3 flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Transactions: </span>
                            <span className="font-medium text-gray-900">{link.total_transactions}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Received: </span>
                            <span className="font-medium text-gray-900">{currencySymbol}{link.total_amount_received?.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</span>
                          </div>
                        </div>

                        {/* Limits */}
                        <div className="mt-2 text-xs text-gray-500">
                          Limit: {currencySymbol}{link.single_transaction_limit?.toLocaleString()} per txn / {currencySymbol}{link.daily_limit?.toLocaleString()} daily
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => window.open(paymentUrl, '_blank')}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Open payment page"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeactivateNFCLink(link.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Deactivate link"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
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
                      onTopUp={() => handleTopUp(card)}
                      onNFCSetup={() => handleNFCSetup(card)}
                      isBlocking={blockCard.isPending || unblockCard.isPending}
                      currencySymbol={currencySymbol}
                      connectedWallet={getConnectedWallet(card.walletId)}
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
                      onTopUp={() => handleTopUp(card)}
                      onNFCSetup={() => handleNFCSetup(card)}
                      isBlocking={blockCard.isPending || unblockCard.isPending}
                      isActivating={activateCard.isPending}
                      currencySymbol={currencySymbol}
                      connectedWallet={getConnectedWallet(card.walletId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}

        {/* Empty States - 50/50 Grid Layout */}
        {(!cards || cards.length === 0 || virtualCards.length === 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* Browse Physical Cards */}
            {(!cards || cards.length === 0) && (
              <Card className="text-center py-8">
                <CreditCard className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">Physical Cards</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Get a card from the marketplace</p>
                <Button onClick={() => navigate('/cards/marketplace')} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Browse Cards
                </Button>
              </Card>
            )}

            {/* Virtual Cards Empty State */}
            {virtualCards.length === 0 && !virtualCardsLoading && (
              <Card className="text-center py-8 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-emerald-200 dark:border-emerald-800">
                <CreditCard className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">Virtual Cards</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Cards with spending limits and controls
                </p>
                <Button onClick={() => navigate('/cards/virtual')} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Request Virtual Card
                </Button>
              </Card>
            )}
          </div>
        )}

        {/* Virtual Cards Grid - when cards exist */}
        {virtualCards.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Virtual Cards</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Peeap closed-loop cards with spending controls</p>
              </div>
              <Button onClick={() => navigate('/cards/virtual')} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Request Card
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {virtualCards.map((card) => (
                <div
                  key={card.id}
                  className="relative bg-gradient-to-br from-emerald-600 to-teal-800 rounded-2xl p-6 text-white shadow-lg overflow-hidden"
                  style={{ backgroundColor: card.cardColor }}
                >
                  {/* Card Pattern */}
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
                  </div>

                  {/* Card Status Badge */}
                  <div className="absolute top-4 right-4">
                    <span className={clsx(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      card.cardStatus === 'active' && 'bg-green-500/20 text-green-100',
                      card.cardStatus === 'frozen' && 'bg-blue-500/20 text-blue-100',
                      card.cardStatus === 'pending' && 'bg-yellow-500/20 text-yellow-100',
                      card.cardStatus === 'blocked' && 'bg-red-500/20 text-red-100'
                    )}>
                      {card.cardStatus.charAt(0).toUpperCase() + card.cardStatus.slice(1)}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-6">
                      <CreditCard className="w-8 h-8" />
                      <span className="text-sm font-medium opacity-80">Peeap Virtual</span>
                    </div>

                    {/* Card Number */}
                    <div className="mb-4">
                      <p className="font-mono text-xl tracking-widest">
                        •••• •••• •••• {card.cardLastFour}
                      </p>
                    </div>

                    {/* Card Name & Expiry */}
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs opacity-70 mb-1">Card Name</p>
                        <p className="font-medium">{card.cardName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs opacity-70 mb-1">Expires</p>
                        <p className="font-medium">{String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}</p>
                      </div>
                    </div>

                    {/* Balance */}
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <p className="text-xs opacity-70 mb-1">Available Balance</p>
                      <p className="text-lg font-bold">
                        {currencySymbol} {(card.wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={() => handleToggleVirtualCardFreeze(card)}
                        className={clsx(
                          'flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
                          card.cardStatus === 'frozen'
                            ? 'bg-white/20 hover:bg-white/30'
                            : 'bg-white/10 hover:bg-white/20'
                        )}
                        disabled={card.cardStatus === 'blocked' || card.cardStatus === 'pending'}
                      >
                        {card.cardStatus === 'frozen' ? (
                          <><Unlock className="w-4 h-4 inline mr-1" /> Unfreeze</>
                        ) : (
                          <><Lock className="w-4 h-4 inline mr-1" /> Freeze</>
                        )}
                      </button>
                      <button
                        onClick={() => navigate('/cards/virtual')}
                        className="flex-1 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 transition-colors"
                      >
                        <Settings className="w-4 h-4 inline mr-1" /> Manage
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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

      {/* Top Up Modal */}
      {showTopUpModal && topUpCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  Top Up Card
                </CardTitle>
                <button onClick={() => setShowTopUpModal(false)} disabled={topUpCardMutation.isPending}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <div className="p-6 space-y-6">
              {/* Success State */}
              {topUpSuccess && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Top Up Successful!</h3>
                  <p className="text-gray-500">
                    {currencySymbol}{Number(topUpAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })} has been added to your card.
                  </p>
                </div>
              )}

              {!topUpSuccess && (
                <>
                  {/* Card Preview */}
                  <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4 text-white">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-xs opacity-70">{topUpCard.type} Card</p>
                        <p className="font-medium">{topUpCard.cardholderName}</p>
                      </div>
                      <CreditCard className="w-6 h-6 opacity-70" />
                    </div>
                    <p className="text-sm font-mono tracking-wider">
                      •••• •••• •••• {topUpCard.cardNumber.slice(-4)}
                    </p>
                  </div>

                  {/* Source Wallet Selector */}
                  {wallets && wallets.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        From Wallet
                      </label>
                      <select
                        value={sourceWalletId}
                        onChange={(e) => setSourceWalletId(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        disabled={topUpCardMutation.isPending}
                      >
                        {wallets.map((wallet) => (
                          <option key={wallet.id} value={wallet.id}>
                            {wallet.currency} Wallet - {currencySymbol}{wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </option>
                        ))}
                      </select>
                      {sourceWalletId && (
                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mt-2">
                          <div className="flex items-center gap-2">
                            <Wallet className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm text-gray-600">Available Balance:</span>
                          </div>
                          <span className="font-semibold text-gray-900">
                            {currencySymbol}{(wallets.find(w => w.id === sourceWalletId)?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount to Top Up
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                        {currencySymbol}
                      </span>
                      <input
                        type="number"
                        value={topUpAmount}
                        onChange={(e) => {
                          setTopUpAmount(e.target.value);
                          setTopUpError('');
                        }}
                        placeholder="0.00"
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-xl font-semibold"
                        disabled={topUpCardMutation.isPending}
                      />
                    </div>
                    {/* Quick amounts - New Leone (SLE) after redenomination */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {[1, 5, 10, 50, 100].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => {
                            setTopUpAmount(String(amount));
                            setTopUpError('');
                          }}
                          disabled={topUpCardMutation.isPending}
                          className={clsx(
                            'px-3 py-1 text-sm rounded-lg border transition-colors',
                            topUpAmount === String(amount)
                              ? 'bg-green-100 border-green-300 text-green-700'
                              : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100',
                            topUpCardMutation.isPending && 'opacity-50 cursor-not-allowed'
                          )}
                        >
                          {currencySymbol}{amount.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Error Message */}
                  {topUpError && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{topUpError}</p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowTopUpModal(false)}
                      disabled={topUpCardMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                      onClick={handleTopUpSubmit}
                      disabled={!topUpAmount || Number(topUpAmount) <= 0 || !sourceWalletId || topUpCardMutation.isPending}
                      isLoading={topUpCardMutation.isPending}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Top Up {topUpAmount && `${currencySymbol} ${Number(topUpAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* NFC Setup Modal */}
      {showNFCSetup && nfcSetupCard && user && (
        <NFCLinkGenerator
          cardId={nfcSetupCard.id}
          userId={user.id}
          walletId={nfcSetupCard.walletId}
          cardholderName={nfcSetupCard.cardholderName}
          cardLastFour={nfcSetupCard.cardNumber.slice(-4)}
          onClose={() => {
            setShowNFCSetup(false);
            setNfcSetupCard(null);
            refetchNFCLinks(); // Refresh the NFC payment links list
          }}
        />
      )}
    </MainLayout>
  );
}

// Helper function to format card number in groups of 4
function formatCardNumber(cardNumber: string): string {
  return cardNumber.replace(/(.{4})/g, '$1 ').trim();
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
  onTopUp: () => void;
  onNFCSetup: () => void;
  isBlocking: boolean;
  isActivating?: boolean;
  currencySymbol: string;
  connectedWallet?: { id: string; balance: number; currency: string } | null;
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
  onTopUp,
  onNFCSetup,
  isBlocking,
  isActivating,
  currencySymbol,
  connectedWallet,
}: CardItemProps) {
  const [showControls, setShowControls] = useState(false);
  const [cardControls, setCardControls] = useState({
    nfcPayment: true,
    onlinePayment: true,
    international: false,
    atmWithdrawal: true,
  });
  const [cvv, setCvv] = useState<string | null>(null);

  // Fetch CVV when card is flipped or details are shown
  useEffect(() => {
    if ((showFlip || showDetails) && !cvv) {
      supabase
        .from('cards')
        .select('cvv')
        .eq('id', card.id)
        .single()
        .then(({ data }) => {
          if (data?.cvv) {
            setCvv(data.cvv);
          }
        });
    }
  }, [showFlip, showDetails, card.id, cvv]);

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

  // Format card number with spaces every 4 digits
  const displayCardNumber = showDetails
    ? formatCardNumber(card.cardNumber)
    : card.maskedNumber
      ? formatCardNumber(card.maskedNumber.replace(/[•]/g, '•'))
      : '•••• •••• •••• ••••';

  return (
    <div className="space-y-4">
      {/* Connected Wallet Info */}
      {connectedWallet && (
        <div className="flex items-center justify-between bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg px-4 py-2 border border-indigo-100">
          <div className="flex items-center gap-2">
            <Wallet className="w-4 h-4 text-indigo-600" />
            <span className="text-sm text-gray-600">Linked Wallet</span>
          </div>
          <span className="font-semibold text-indigo-700">
            {currencySymbol}{connectedWallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Card Visual with Flip - Fixed positioning */}
      <div className="card-flip-container">
        <div
          className={clsx('card-flip-inner', showFlip && 'flipped')}
          onClick={onToggleFlip}
        >
          {/* Front */}
          <div
            className={clsx(
              'card-front bg-gradient-to-br p-6 text-white shadow-xl cursor-pointer card-shine',
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
              <div className="flex items-center gap-2">
                {card.type === 'PHYSICAL' && <Wifi className="w-5 h-5 opacity-70" />}
                <CreditCard className="w-8 h-8" />
              </div>
            </div>
            <div className="absolute bottom-6 left-6 right-6">
              {/* Card number grouped in 4 */}
              <p className="text-xl tracking-[0.2em] font-mono">
                {displayCardNumber}
              </p>
              <div className="flex justify-between mt-3">
                <div>
                  <p className="text-[10px] uppercase opacity-60 tracking-wider">Valid Thru</p>
                  <p className="text-sm font-medium">
                    {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase opacity-60 tracking-wider">Status</p>
                  <p className={clsx(
                    'text-sm font-medium',
                    card.status === 'ACTIVE' && 'text-green-300',
                    card.status === 'BLOCKED' && 'text-red-300',
                    card.status === 'INACTIVE' && 'text-yellow-300'
                  )}>
                    {card.status}
                  </p>
                </div>
              </div>
            </div>
            {/* Tap hint */}
            <div className="absolute top-2 right-2 opacity-40 flex items-center gap-1">
              <span className="text-[10px]">Tap to flip</span>
              <RefreshCw className="w-3 h-3" />
            </div>
          </div>

          {/* Back */}
          <div className="card-back bg-gradient-to-br from-gray-800 to-gray-900 shadow-xl overflow-hidden cursor-pointer">
            {/* Magnetic Strip */}
            <div className="absolute top-8 left-0 right-0 h-12 bg-gray-950" />

            {/* Signature Strip with CVV */}
            <div className="absolute top-24 left-4 right-4 flex items-end gap-2">
              <div className="flex-1 h-10 bg-gray-200 rounded flex items-center px-3">
                <p className="text-gray-700 text-xs font-mono tracking-wider truncate italic">
                  {card.cardholderName}
                </p>
              </div>
              <div className="bg-white rounded px-3 py-1 text-center">
                <p className="text-[8px] text-gray-500 uppercase">CVV</p>
                <p className="text-sm font-mono font-bold text-gray-800">
                  {cvv || '•••'}
                </p>
              </div>
            </div>

            {/* QR Code for payment */}
            <div className="absolute bottom-4 right-4 bg-white p-1 rounded-lg shadow-lg">
              <BrandedQRCode value={qrCodeData} size={70} logoSizePercent={25} />
            </div>

            {/* Card info */}
            <div className="absolute bottom-4 left-4 max-w-[140px] text-white">
              <p className="text-xs font-semibold mb-1 flex items-center gap-1">
                <QrCode className="w-3 h-3" />
                Scan to Pay
              </p>
              <p className="text-[9px] opacity-60 leading-tight">
                Instant payments via Peeap app
              </p>
            </div>

            {/* Brand logo area */}
            <div className="absolute top-2 right-2 opacity-40 flex items-center gap-1 text-white">
              <span className="text-[10px]">Tap to flip</span>
              <RefreshCw className="w-3 h-3" />
            </div>
          </div>
        </div>
      </div>

      {/* Card Actions - Redesigned */}
      <Card padding="sm">
        <div className="space-y-3">
          {/* Balance & Limit Row */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-gray-500">Daily Limit</p>
              <p className="font-semibold text-gray-900">{currencySymbol}{card.dailyLimit.toLocaleString()}</p>
            </div>
            {card.status === 'ACTIVE' && (
              <Button
                size="sm"
                onClick={(e) => { e.stopPropagation(); onTopUp(); }}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                Top Up
              </Button>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100">
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggleDetails(); }} title="Toggle card number">
                {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onToggleFlip(); }} title="Flip card">
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setShowControls(!showControls); }} title="Card controls">
                <Settings className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-1">
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

            {/* NFC Tag Setup */}
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Radio className="w-5 h-5 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium">NFC Tag Setup</p>
                  <p className="text-xs text-gray-500">Generate link for physical NFC tag</p>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onNFCSetup(); }}
                className="px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 transition-colors"
              >
                Setup
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
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6 text-white shadow-xl">
            <div className="flex justify-between items-start mb-8">
              <div>
                <p className="text-xs uppercase tracking-wider opacity-80">{card.type} Card</p>
                <p className="font-bold mt-1">{cardWithType?.cardType?.name || 'Peeap Card'}</p>
              </div>
              <div className="flex items-center gap-2">
                {card.type === 'PHYSICAL' && <Wifi className="w-5 h-5 opacity-70" />}
                <CreditCard className="w-8 h-8 opacity-80" />
              </div>
            </div>
            {/* Card number formatted in groups of 4 */}
            <p className="text-xl tracking-[0.2em] font-mono mb-4">
              {showSensitive
                ? formatCardNumber(card.cardNumber)
                : '•••• •••• •••• ' + card.cardNumber.slice(-4)}
            </p>
            <div className="flex justify-between">
              <div>
                <p className="text-[10px] uppercase opacity-60 tracking-wider">Valid Thru</p>
                <p className="font-medium">
                  {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase opacity-60 tracking-wider">Cardholder</p>
                <p className="font-medium">{card.cardholderName.toUpperCase()}</p>
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
