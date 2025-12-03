import { useState, useEffect } from 'react';
import { CreditCard, Plus, Eye, EyeOff, Lock, Unlock, MoreVertical } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button, Input } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useCards, useCreateCard, useBlockCard, useUnblockCard, useActivateCard } from '@/hooks/useCards';
import { useWallets } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import type { Card as CardType } from '@/types';
import { currencyService, Currency } from '@/services/currency.service';

export function CardsPage() {
  const { data: cards, isLoading } = useCards();
  const { data: wallets } = useWallets();

  // Currency state
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
  }, []);

  const currencySymbol = defaultCurrency?.symbol || '';
  const createCard = useCreateCard();
  const blockCard = useBlockCard();
  const unblockCard = useUnblockCard();
  const activateCard = useActivateCard();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState<string | null>(null);
  const [newCardForm, setNewCardForm] = useState({
    walletId: '',
    type: 'VIRTUAL' as 'VIRTUAL' | 'PHYSICAL',
    cardholderName: '',
  });

  const handleCreateCard = async () => {
    try {
      await createCard.mutateAsync(newCardForm);
      setShowCreateModal(false);
      setNewCardForm({ walletId: '', type: 'VIRTUAL', cardholderName: '' });
    } catch (error) {
      console.error('Failed to create card:', error);
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

  const getCardGradient = (type: string, index: number) => {
    const gradients = [
      'from-blue-600 to-blue-800',
      'from-purple-600 to-purple-800',
      'from-indigo-600 to-indigo-800',
      'from-teal-600 to-teal-800',
    ];
    return type === 'PHYSICAL' ? 'from-gray-700 to-gray-900' : gradients[index % gradients.length];
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cards</h1>
            <p className="text-gray-500 mt-1">Manage your virtual and physical cards</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Card
          </Button>
        </div>

        {/* Cards grid */}
        {isLoading ? (
          <div className="text-center py-12">Loading cards...</div>
        ) : cards && cards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card, index) => (
              <div key={card.id} className="space-y-4">
                {/* Card visual */}
                <div
                  className={clsx(
                    'relative aspect-[1.586/1] rounded-xl p-6 text-white bg-gradient-to-br shadow-lg',
                    getCardGradient(card.type, index),
                    card.status !== 'ACTIVE' && 'opacity-60'
                  )}
                >
                  {card.status === 'BLOCKED' && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded-xl flex items-center justify-center">
                      <Lock className="w-12 h-12" />
                    </div>
                  )}
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs uppercase tracking-wider opacity-80">
                        {card.type} Card
                      </p>
                      <p className="text-sm mt-1 opacity-90">{card.cardholderName}</p>
                    </div>
                    <CreditCard className="w-8 h-8" />
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                    <p className="text-lg tracking-widest font-mono">
                      {showCardDetails === card.id
                        ? card.cardNumber
                        : card.maskedNumber || '•••• •••• •••• ••••'}
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
                </div>

                {/* Card actions */}
                <Card padding="sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <p className="text-gray-500">Daily Limit</p>
                      <p className="font-medium">{currencySymbol}{card.dailyLimit.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowCardDetails(showCardDetails === card.id ? null : card.id)
                        }
                        title={showCardDetails === card.id ? 'Hide details' : 'Show details'}
                      >
                        {showCardDetails === card.id ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      {card.status === 'INACTIVE' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleActivate(card.id)}
                          isLoading={activateCard.isPending}
                        >
                          Activate
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleBlock(card)}
                          title={card.status === 'BLOCKED' ? 'Unblock' : 'Block'}
                        >
                          {card.status === 'BLOCKED' ? (
                            <Unlock className="w-4 h-4 text-green-500" />
                          ) : (
                            <Lock className="w-4 h-4 text-red-500" />
                          )}
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No cards yet</h3>
            <p className="text-gray-500 mb-4">Create your first card to start making payments</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Card
            </Button>
          </Card>
        )}
      </div>

      {/* Create Card Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Card</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wallet</label>
                <select
                  value={newCardForm.walletId}
                  onChange={(e) => setNewCardForm({ ...newCardForm, walletId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select a wallet</option>
                  {wallets?.map((wallet) => (
                    <option key={wallet.id} value={wallet.id}>
                      {wallet.currency} Wallet - {currencySymbol}{wallet.balance.toLocaleString()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Card Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="cardType"
                      value="VIRTUAL"
                      checked={newCardForm.type === 'VIRTUAL'}
                      onChange={() => setNewCardForm({ ...newCardForm, type: 'VIRTUAL' })}
                      className="mr-2"
                    />
                    Virtual
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="cardType"
                      value="PHYSICAL"
                      checked={newCardForm.type === 'PHYSICAL'}
                      onChange={() => setNewCardForm({ ...newCardForm, type: 'PHYSICAL' })}
                      className="mr-2"
                    />
                    Physical
                  </label>
                </div>
              </div>

              <Input
                label="Cardholder Name"
                value={newCardForm.cardholderName}
                onChange={(e) => setNewCardForm({ ...newCardForm, cardholderName: e.target.value })}
                placeholder="Name as it appears on card"
              />

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewCardForm({ walletId: '', type: 'VIRTUAL', cardholderName: '' });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreateCard}
                  isLoading={createCard.isPending}
                  disabled={!newCardForm.walletId || !newCardForm.cardholderName}
                >
                  Create Card
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
