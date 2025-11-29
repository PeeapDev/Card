import { useState } from 'react';
import { Wallet, Plus, ArrowDownRight, ArrowUpRight, MoreVertical, Snowflake } from 'lucide-react';
import { Card, CardHeader, CardTitle, Button } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useWallets, useCreateWallet, useDeposit, useFreezeWallet, useUnfreezeWallet } from '@/hooks/useWallets';
import { clsx } from 'clsx';
import type { Wallet as WalletType } from '@/types';

export function WalletsPage() {
  const { data: wallets, isLoading } = useWallets();
  const createWallet = useCreateWallet();
  const deposit = useDeposit();
  const freezeWallet = useFreezeWallet();
  const unfreezeWallet = useUnfreezeWallet();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState<WalletType | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const handleCreateWallet = async () => {
    try {
      await createWallet.mutateAsync({ currency: 'USD' });
      setShowCreateModal(false);
    } catch (error) {
      console.error('Failed to create wallet:', error);
    }
  };

  const handleDeposit = async () => {
    if (!selectedWallet || !depositAmount) return;
    try {
      await deposit.mutateAsync({
        walletId: selectedWallet.id,
        amount: parseFloat(depositAmount),
      });
      setShowDepositModal(false);
      setDepositAmount('');
      setSelectedWallet(null);
    } catch (error) {
      console.error('Failed to deposit:', error);
    }
  };

  const handleFreeze = async (wallet: WalletType) => {
    try {
      if (wallet.status === 'FROZEN') {
        await unfreezeWallet.mutateAsync(wallet.id);
      } else {
        await freezeWallet.mutateAsync(wallet.id);
      }
    } catch (error) {
      console.error('Failed to update wallet status:', error);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallets</h1>
            <p className="text-gray-500 mt-1">Manage your digital wallets</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Wallet
          </Button>
        </div>

        {/* Wallets grid */}
        {isLoading ? (
          <div className="text-center py-12">Loading wallets...</div>
        ) : wallets && wallets.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {wallets.map((wallet) => (
              <Card key={wallet.id} className="relative">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    <div
                      className={clsx(
                        'w-12 h-12 rounded-full flex items-center justify-center',
                        wallet.status === 'ACTIVE' ? 'bg-primary-100' : 'bg-gray-100'
                      )}
                    >
                      <Wallet
                        className={clsx(
                          'w-6 h-6',
                          wallet.status === 'ACTIVE' ? 'text-primary-600' : 'text-gray-400'
                        )}
                      />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-900">{wallet.currency} Wallet</p>
                      <p
                        className={clsx(
                          'text-xs',
                          wallet.status === 'ACTIVE' ? 'text-green-600' : 'text-gray-500'
                        )}
                      >
                        {wallet.status}
                      </p>
                    </div>
                  </div>
                  <button className="p-1 rounded hover:bg-gray-100">
                    <MoreVertical className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-sm text-gray-500">Balance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    ${wallet.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-xs text-gray-500">
                  <div>
                    <p>Daily Limit</p>
                    <p className="font-medium text-gray-900">
                      ${wallet.dailyLimit.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p>Monthly Limit</p>
                    <p className="font-medium text-gray-900">
                      ${wallet.monthlyLimit.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setSelectedWallet(wallet);
                      setShowDepositModal(true);
                    }}
                    disabled={wallet.status !== 'ACTIVE'}
                  >
                    <ArrowDownRight className="w-4 h-4 mr-1" />
                    Deposit
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1" disabled={wallet.status !== 'ACTIVE'}>
                    <ArrowUpRight className="w-4 h-4 mr-1" />
                    Transfer
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleFreeze(wallet)}
                    title={wallet.status === 'FROZEN' ? 'Unfreeze' : 'Freeze'}
                  >
                    <Snowflake
                      className={clsx(
                        'w-4 h-4',
                        wallet.status === 'FROZEN' ? 'text-blue-500' : 'text-gray-400'
                      )}
                    />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="text-center py-12">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No wallets yet</h3>
            <p className="text-gray-500 mb-4">Create your first wallet to get started</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Wallet
            </Button>
          </Card>
        )}
      </div>

      {/* Create Wallet Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create New Wallet</CardTitle>
            </CardHeader>
            <p className="text-gray-500 mb-6">A new USD wallet will be created for your account.</p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowCreateModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreateWallet} isLoading={createWallet.isPending}>
                Create Wallet
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && selectedWallet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Deposit to Wallet</CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="0.00"
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDepositModal(false);
                    setDepositAmount('');
                    setSelectedWallet(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleDeposit}
                  isLoading={deposit.isPending}
                  disabled={!depositAmount || parseFloat(depositAmount) <= 0}
                >
                  Deposit
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </MainLayout>
  );
}
