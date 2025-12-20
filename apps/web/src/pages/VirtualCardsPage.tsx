import { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Settings,
  X,
  AlertCircle,
  ShoppingCart,
  Globe,
  Landmark,
  ToggleLeft,
  ToggleRight,
  Wallet,
  Copy,
  CheckCircle,
  Clock,
  Snowflake,
  Ban,
  ChevronRight,
  Sliders,
  History,
  Shield,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useWallets } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import { useNavigate } from 'react-router-dom';
import { currencyService, Currency } from '@/services/currency.service';
import {
  cardService,
  IssuedCard,
  CardTransaction,
} from '@/services/card.service';
import { formatDistanceToNow } from 'date-fns';

export function VirtualCardsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: wallets } = useWallets();

  // State
  const [cards, setCards] = useState<IssuedCard[]>([]);
  const [selectedCard, setSelectedCard] = useState<IssuedCard | null>(null);
  const [transactions, setTransactions] = useState<CardTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // Modal states
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState(false);
  const [showLimitsModal, setShowLimitsModal] = useState(false);
  const [showControlsModal, setShowControlsModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showActivationModal, setShowActivationModal] = useState(false);

  // Form states
  const [requestForm, setRequestForm] = useState({
    walletId: '',
    cardName: '',
    cardLabel: '',
    cardColor: '#1a1a2e',
  });
  const [activationCode, setActivationCode] = useState('');
  const [newCardResult, setNewCardResult] = useState<{
    cardId?: string;
    cardLastFour?: string;
    activationCode?: string;
    cvv?: string;
  } | null>(null);

  // Limits form
  const [limitsForm, setLimitsForm] = useState({
    dailyLimit: 0,
    weeklyLimit: 0,
    monthlyLimit: 0,
    perTransactionLimit: 0,
  });

  // Action states
  const [isRequesting, setIsRequesting] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [isFreezing, setIsFreezing] = useState(false);
  const [isUpdatingLimits, setIsUpdatingLimits] = useState(false);
  const [isUpdatingControls, setIsUpdatingControls] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Card number visibility
  const [showFullNumber, setShowFullNumber] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadCards();
    }
  }, [user?.id]);

  const currencySymbol = defaultCurrency?.symbol || 'Le';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${(amount / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const loadCards = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const userCards = await cardService.getIssuedCards(user.id);
      setCards(userCards);
    } catch (err: any) {
      console.error('Failed to load cards:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTransactions = async (cardId: string) => {
    setIsLoadingTransactions(true);
    try {
      const txs = await cardService.getCardTransactions(cardId, { limit: 50 });
      setTransactions(txs);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const handleRequestCard = async () => {
    if (!user?.id || !requestForm.walletId || !requestForm.cardName) return;

    setIsRequesting(true);
    setError('');
    try {
      const result = await cardService.requestVirtualCard(user.id, {
        walletId: requestForm.walletId,
        cardName: requestForm.cardName,
        cardLabel: requestForm.cardLabel || undefined,
        cardColor: requestForm.cardColor,
      });

      if (result.success) {
        setNewCardResult({
          cardId: result.cardId,
          cardLastFour: result.cardLastFour,
          activationCode: result.activationCode,
          cvv: result.cvv,
        });
        loadCards();
      } else {
        setError(result.error || 'Failed to request card');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to request card');
    } finally {
      setIsRequesting(false);
    }
  };

  const handleActivateCard = async () => {
    if (!user?.id || !selectedCard || !activationCode) return;

    setIsActivating(true);
    setError('');
    try {
      const result = await cardService.activateVirtualCard(selectedCard.id, user.id, activationCode);
      if (result.success) {
        setSuccess('Card activated successfully!');
        setShowActivationModal(false);
        setActivationCode('');
        loadCards();
      } else {
        setError(result.error || 'Invalid activation code');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to activate card');
    } finally {
      setIsActivating(false);
    }
  };

  const handleToggleFreeze = async (card: IssuedCard) => {
    if (!user?.id) return;

    setIsFreezing(true);
    try {
      const freeze = card.cardStatus !== 'frozen';
      const result = await cardService.toggleCardFreeze(card.id, user.id, freeze);
      if (result.success) {
        loadCards();
      }
    } catch (err: any) {
      console.error('Failed to toggle freeze:', err);
    } finally {
      setIsFreezing(false);
    }
  };

  const handleUpdateLimits = async () => {
    if (!user?.id || !selectedCard) return;

    setIsUpdatingLimits(true);
    setError('');
    try {
      const result = await cardService.updateCardSpendingLimits(selectedCard.id, user.id, {
        dailyLimit: limitsForm.dailyLimit * 100,
        weeklyLimit: limitsForm.weeklyLimit * 100,
        monthlyLimit: limitsForm.monthlyLimit * 100,
        perTransactionLimit: limitsForm.perTransactionLimit * 100,
      });
      if (result.success) {
        setSuccess('Limits updated successfully!');
        setShowLimitsModal(false);
        loadCards();
      } else {
        setError(result.error || 'Failed to update limits');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update limits');
    } finally {
      setIsUpdatingLimits(false);
    }
  };

  const handleUpdateControls = async (control: string, value: boolean) => {
    if (!user?.id || !selectedCard) return;

    setIsUpdatingControls(true);
    try {
      await cardService.updateCardControls(selectedCard.id, user.id, {
        [control]: value,
      });
      loadCards();
      // Update selected card
      const updated = await cardService.getIssuedCard(selectedCard.id, user.id);
      if (updated) setSelectedCard(updated);
    } catch (err: any) {
      console.error('Failed to update controls:', err);
    } finally {
      setIsUpdatingControls(false);
    }
  };

  const openLimitsModal = (card: IssuedCard) => {
    setSelectedCard(card);
    setLimitsForm({
      dailyLimit: card.dailyLimit / 100,
      weeklyLimit: card.weeklyLimit / 100,
      monthlyLimit: card.monthlyLimit / 100,
      perTransactionLimit: card.perTransactionLimit / 100,
    });
    setShowLimitsModal(true);
  };

  const openControlsModal = (card: IssuedCard) => {
    setSelectedCard(card);
    setShowControlsModal(true);
  };

  const openTransactionsModal = (card: IssuedCard) => {
    setSelectedCard(card);
    loadTransactions(card.id);
    setShowTransactionsModal(true);
  };

  const openActivationModal = (card: IssuedCard) => {
    setSelectedCard(card);
    setActivationCode('');
    setError('');
    setShowActivationModal(true);
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'frozen':
        return 'bg-blue-100 text-blue-700';
      case 'blocked':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />;
      case 'frozen':
        return <Snowflake className="w-4 h-4" />;
      case 'blocked':
        return <Ban className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const activeCards = cards.filter(c => c.cardStatus === 'active');
  const pendingCards = cards.filter(c => c.cardStatus === 'pending');
  const otherCards = cards.filter(c => !['active', 'pending'].includes(c.cardStatus));

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Virtual Cards</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">
              Manage your Peeap virtual cards for secure payments
            </p>
          </div>
          <Button onClick={() => {
            setShowRequestModal(true);
            setNewCardResult(null);
            setError('');
            if (wallets && wallets.length > 0) {
              setRequestForm(prev => ({ ...prev, walletId: wallets[0].id }));
            }
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Request New Card
          </Button>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-700 dark:text-green-400">{success}</p>
            <button onClick={() => setSuccess('')} className="ml-auto">
              <X className="w-4 h-4 text-green-600" />
            </button>
          </div>
        )}

        {/* Cards List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : cards.length === 0 ? (
          <Card className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No virtual cards yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Request your first virtual card to start making payments
            </p>
            <Button onClick={() => setShowRequestModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Request Your First Card
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Pending Cards */}
            {pendingCards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-yellow-500" />
                  Pending Activation
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingCards.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      currencySymbol={currencySymbol}
                      formatCurrency={formatCurrency}
                      showFullNumber={showFullNumber === card.id}
                      onToggleNumber={() => setShowFullNumber(showFullNumber === card.id ? null : card.id)}
                      onActivate={() => openActivationModal(card)}
                      onViewTransactions={() => openTransactionsModal(card)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Active Cards */}
            {activeCards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  Active Cards
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeCards.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      currencySymbol={currencySymbol}
                      formatCurrency={formatCurrency}
                      showFullNumber={showFullNumber === card.id}
                      onToggleNumber={() => setShowFullNumber(showFullNumber === card.id ? null : card.id)}
                      onFreeze={() => handleToggleFreeze(card)}
                      onLimits={() => openLimitsModal(card)}
                      onControls={() => openControlsModal(card)}
                      onViewTransactions={() => openTransactionsModal(card)}
                      isFreezing={isFreezing}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Frozen/Blocked Cards */}
            {otherCards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Snowflake className="w-5 h-5 text-blue-500" />
                  Frozen/Inactive Cards
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {otherCards.map((card) => (
                    <CardItem
                      key={card.id}
                      card={card}
                      currencySymbol={currencySymbol}
                      formatCurrency={formatCurrency}
                      showFullNumber={showFullNumber === card.id}
                      onToggleNumber={() => setShowFullNumber(showFullNumber === card.id ? null : card.id)}
                      onFreeze={() => handleToggleFreeze(card)}
                      onViewTransactions={() => openTransactionsModal(card)}
                      isFreezing={isFreezing}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Request New Card Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Request Virtual Card</CardTitle>
                <button onClick={() => setShowRequestModal(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <div className="p-6 space-y-6">
              {newCardResult ? (
                // Success state - show card details
                <div className="text-center space-y-6">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Card Requested Successfully!</h3>
                    <p className="text-gray-500 text-sm">
                      Your card is pending activation. Save your activation code and CVV securely.
                    </p>
                  </div>

                  {/* Card Details */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Card Number</span>
                      <span className="font-mono font-semibold">**** **** **** {newCardResult.cardLastFour}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Activation Code</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-lg text-primary-600">{newCardResult.activationCode}</span>
                        <button
                          onClick={() => copyToClipboard(newCardResult.activationCode || '')}
                          className="p-1 hover:bg-gray-200 rounded"
                        >
                          {copiedCode ? <CheckCircle className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">CVV</span>
                      <span className="font-mono font-bold text-lg text-red-600">{newCardResult.cvv}</span>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-yellow-800">
                        <strong>Important:</strong> Save your CVV now! It will not be shown again. Use the activation code to activate your card.
                      </p>
                    </div>
                  </div>

                  <Button onClick={() => setShowRequestModal(false)} className="w-full">
                    Done
                  </Button>
                </div>
              ) : (
                // Request form
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Linked Wallet
                    </label>
                    <select
                      value={requestForm.walletId}
                      onChange={(e) => setRequestForm(prev => ({ ...prev, walletId: e.target.value }))}
                      className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-gray-800"
                    >
                      <option value="">Select a wallet</option>
                      {wallets?.map((wallet) => (
                        <option key={wallet.id} value={wallet.id}>
                          {wallet.currency} Wallet - {currencySymbol}{wallet.balance.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Input
                    label="Card Name"
                    placeholder="e.g., John Doe"
                    value={requestForm.cardName}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, cardName: e.target.value }))}
                  />

                  <Input
                    label="Card Label (Optional)"
                    placeholder="e.g., Shopping Card"
                    value={requestForm.cardLabel}
                    onChange={(e) => setRequestForm(prev => ({ ...prev, cardLabel: e.target.value }))}
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Card Color
                    </label>
                    <div className="flex gap-3">
                      {['#1a1a2e', '#0f4c75', '#3c096c', '#0d7377', '#14213d'].map((color) => (
                        <button
                          key={color}
                          onClick={() => setRequestForm(prev => ({ ...prev, cardColor: color }))}
                          className={clsx(
                            'w-10 h-10 rounded-lg border-2 transition-all',
                            requestForm.cardColor === color ? 'border-primary-500 scale-110' : 'border-transparent'
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <p className="text-sm text-red-600">{error}</p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowRequestModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleRequestCard}
                      disabled={!requestForm.walletId || !requestForm.cardName}
                      isLoading={isRequesting}
                    >
                      Request Card
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Activation Modal */}
      {showActivationModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Activate Card</CardTitle>
                <button onClick={() => setShowActivationModal(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <div className="p-6 space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary-600" />
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Enter the 6-digit activation code that was provided when you requested this card.
                </p>
              </div>

              <Input
                label="Activation Code"
                placeholder="Enter 6-digit code"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="text-center text-2xl font-mono tracking-widest"
              />

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowActivationModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleActivateCard}
                  disabled={activationCode.length !== 6}
                  isLoading={isActivating}
                >
                  Activate
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Limits Modal */}
      {showLimitsModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sliders className="w-5 h-5" />
                  Spending Limits
                </CardTitle>
                <button onClick={() => setShowLimitsModal(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Daily Limit"
                  type="number"
                  value={limitsForm.dailyLimit}
                  onChange={(e) => setLimitsForm(prev => ({ ...prev, dailyLimit: Number(e.target.value) }))}
                />
                <Input
                  label="Weekly Limit"
                  type="number"
                  value={limitsForm.weeklyLimit}
                  onChange={(e) => setLimitsForm(prev => ({ ...prev, weeklyLimit: Number(e.target.value) }))}
                />
                <Input
                  label="Monthly Limit"
                  type="number"
                  value={limitsForm.monthlyLimit}
                  onChange={(e) => setLimitsForm(prev => ({ ...prev, monthlyLimit: Number(e.target.value) }))}
                />
                <Input
                  label="Per Transaction"
                  type="number"
                  value={limitsForm.perTransactionLimit}
                  onChange={(e) => setLimitsForm(prev => ({ ...prev, perTransactionLimit: Number(e.target.value) }))}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowLimitsModal(false)}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleUpdateLimits} isLoading={isUpdatingLimits}>
                  Save Limits
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Controls Modal */}
      {showControlsModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Card Controls
                </CardTitle>
                <button onClick={() => setShowControlsModal(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <div className="p-6 space-y-4">
              {/* Online Payments */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <ShoppingCart className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Online Payments</p>
                    <p className="text-xs text-gray-500">E-commerce transactions</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUpdateControls('onlinePaymentsEnabled', !selectedCard.onlinePaymentsEnabled)}
                  disabled={isUpdatingControls}
                >
                  {selectedCard.onlinePaymentsEnabled ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              </div>

              {/* Contactless */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Contactless</p>
                    <p className="text-xs text-gray-500">Tap to pay</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUpdateControls('contactlessEnabled', !selectedCard.contactlessEnabled)}
                  disabled={isUpdatingControls}
                >
                  {selectedCard.contactlessEnabled ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              </div>

              {/* International */}
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-3">
                  <Globe className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">International</p>
                    <p className="text-xs text-gray-500">Foreign currency transactions</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUpdateControls('internationalEnabled', !selectedCard.internationalEnabled)}
                  disabled={isUpdatingControls}
                >
                  {selectedCard.internationalEnabled ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              </div>

              {/* ATM */}
              <div className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <Landmark className="w-5 h-5 text-orange-500" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">ATM Withdrawals</p>
                    <p className="text-xs text-gray-500">Cash withdrawals (future)</p>
                  </div>
                </div>
                <button
                  onClick={() => handleUpdateControls('atmWithdrawalsEnabled', !selectedCard.atmWithdrawalsEnabled)}
                  disabled={isUpdatingControls}
                >
                  {selectedCard.atmWithdrawalsEnabled ? (
                    <ToggleRight className="w-8 h-8 text-green-500" />
                  ) : (
                    <ToggleLeft className="w-8 h-8 text-gray-300" />
                  )}
                </button>
              </div>

              <Button variant="outline" className="w-full mt-4" onClick={() => setShowControlsModal(false)}>
                Done
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Transactions Modal */}
      {showTransactionsModal && selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <History className="w-5 h-5" />
                  Card Transactions
                </CardTitle>
                <button onClick={() => setShowTransactionsModal(false)}>
                  <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-6">
              {isLoadingTransactions ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-12">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No transactions yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          'w-10 h-10 rounded-full flex items-center justify-center',
                          tx.transactionType === 'purchase' ? 'bg-red-100' : 'bg-green-100'
                        )}>
                          {tx.transactionType === 'purchase' ? (
                            <ShoppingCart className="w-5 h-5 text-red-600" />
                          ) : (
                            <Wallet className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {tx.merchantName || tx.description || tx.transactionType}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(tx.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={clsx(
                          'font-semibold',
                          tx.transactionType === 'purchase' ? 'text-red-600' : 'text-green-600'
                        )}>
                          {tx.transactionType === 'purchase' ? '-' : '+'}{formatCurrency(tx.amount)}
                        </p>
                        <p className={clsx(
                          'text-xs',
                          tx.status === 'completed' ? 'text-green-600' : 'text-gray-500'
                        )}>
                          {tx.status}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}

// Card Item Component
interface CardItemProps {
  card: IssuedCard;
  currencySymbol: string;
  formatCurrency: (amount: number) => string;
  showFullNumber: boolean;
  onToggleNumber: () => void;
  onActivate?: () => void;
  onFreeze?: () => void;
  onLimits?: () => void;
  onControls?: () => void;
  onViewTransactions: () => void;
  isFreezing?: boolean;
}

function CardItem({
  card,
  currencySymbol,
  formatCurrency,
  showFullNumber,
  onToggleNumber,
  onActivate,
  onFreeze,
  onLimits,
  onControls,
  onViewTransactions,
  isFreezing,
}: CardItemProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'frozen': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'blocked': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'pending': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const formatCardNumber = (last4: string, full?: string) => {
    if (showFullNumber && full) {
      return full.replace(/(.{4})/g, '$1 ').trim();
    }
    return `•••• •••• •••• ${last4}`;
  };

  return (
    <div className="space-y-3">
      {/* Card Visual */}
      <div
        className="relative h-48 rounded-xl p-6 text-white shadow-lg cursor-pointer overflow-hidden"
        style={{ backgroundColor: card.cardColor }}
        onClick={onToggleNumber}
      >
        {/* Overlay for frozen/blocked */}
        {(card.cardStatus === 'frozen' || card.cardStatus === 'blocked') && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
            {card.cardStatus === 'frozen' ? (
              <Snowflake className="w-12 h-12" />
            ) : (
              <Lock className="w-12 h-12" />
            )}
          </div>
        )}

        {/* Card Content */}
        <div className="relative h-full flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs uppercase tracking-wider opacity-70">Virtual Card</p>
              <p className="text-sm font-medium mt-1">{card.cardLabel || card.cardName}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={clsx('px-2 py-0.5 text-xs rounded-full', getStatusColor(card.cardStatus))}>
                {card.cardStatus}
              </span>
              <CreditCard className="w-8 h-8 opacity-70" />
            </div>
          </div>

          <div>
            <p className="font-mono text-lg tracking-widest mb-4">
              {formatCardNumber(card.cardLastFour, card.cardNumber)}
            </p>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase opacity-60">Valid Thru</p>
                <p className="text-sm">
                  {String(card.expiryMonth).padStart(2, '0')}/{String(card.expiryYear).slice(-2)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase opacity-60">Balance</p>
                <p className="text-sm font-semibold">
                  {card.wallet ? formatCurrency(card.wallet.balance * 100) : '-'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Eye icon hint */}
        <div className="absolute top-2 right-2 opacity-50">
          {showFullNumber ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </div>
      </div>

      {/* Card Actions */}
      <Card padding="sm">
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <p className="text-gray-500 dark:text-gray-400">Daily Spent</p>
            <p className="font-semibold text-gray-900 dark:text-white">
              {formatCurrency(card.dailySpent)} / {formatCurrency(card.dailyLimit)}
            </p>
          </div>
          <div className="flex gap-1">
            {card.cardStatus === 'pending' && onActivate && (
              <Button size="sm" onClick={onActivate}>
                Activate
              </Button>
            )}
            {card.cardStatus !== 'pending' && onFreeze && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onFreeze}
                disabled={isFreezing}
                title={card.cardStatus === 'frozen' ? 'Unfreeze' : 'Freeze'}
              >
                {card.cardStatus === 'frozen' ? (
                  <Unlock className="w-4 h-4 text-green-500" />
                ) : (
                  <Snowflake className="w-4 h-4 text-blue-500" />
                )}
              </Button>
            )}
            {onLimits && card.cardStatus === 'active' && (
              <Button variant="ghost" size="sm" onClick={onLimits} title="Spending Limits">
                <Sliders className="w-4 h-4" />
              </Button>
            )}
            {onControls && card.cardStatus === 'active' && (
              <Button variant="ghost" size="sm" onClick={onControls} title="Controls">
                <Settings className="w-4 h-4" />
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={onViewTransactions} title="Transactions">
              <History className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default VirtualCardsPage;
