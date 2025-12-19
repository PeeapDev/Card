/**
 * Bank Accounts Section
 *
 * Allows users to add, manage, and verify their bank accounts
 * for withdrawals/payouts.
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  Plus,
  Trash2,
  Star,
  StarOff,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  X,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import {
  bankAccountService,
  Bank,
  UserBankAccount,
} from '@/services/bankAccount.service';

interface BankAccountsSectionProps {
  className?: string;
}

export function BankAccountsSection({ className }: BankAccountsSectionProps) {
  const [accounts, setAccounts] = useState<UserBankAccount[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [accountsData, banksData] = await Promise.all([
        bankAccountService.getUserBankAccounts(),
        bankAccountService.getAvailableBanks(),
      ]);
      setAccounts(accountsData);
      setBanks(banksData);
    } catch (error) {
      console.error('Error loading bank data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetDefault = async (accountId: string) => {
    const result = await bankAccountService.setDefaultBankAccount(accountId);
    if (result.success) {
      loadData();
    }
  };

  const handleDelete = async (accountId: string) => {
    const result = await bankAccountService.deleteBankAccount(accountId);
    if (result.success) {
      setDeleteConfirm(null);
      loadData();
    }
  };

  const handleReverify = async (accountId: string) => {
    const result = await bankAccountService.reverifyBankAccount(accountId);
    if (result.success) {
      loadData();
    }
  };

  return (
    <Card className={className}>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Accounts</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage your bank accounts for withdrawals
              </p>
            </div>
          </div>
          {banks.length > 0 && (
            <Button
              onClick={() => setShowAddModal(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Bank
            </Button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : banks.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">Bank payouts not available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Bank payout integration is not configured yet
            </p>
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">No bank accounts added</p>
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Add a bank account to enable bank withdrawals
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`p-4 border rounded-xl transition-colors ${
                  account.isDefault
                    ? 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      account.isDefault
                        ? 'bg-blue-200 dark:bg-blue-800'
                        : 'bg-gray-100 dark:bg-gray-800'
                    }`}>
                      <Building2 className={`w-5 h-5 ${
                        account.isDefault
                          ? 'text-blue-700 dark:text-blue-300'
                          : 'text-gray-600 dark:text-gray-400'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {account.nickname || account.bankName}
                        </h3>
                        {account.isDefault && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
                            Default
                          </span>
                        )}
                        {account.isVerified ? (
                          <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Verified
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3 h-3" />
                            Unverified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {account.bankName}
                      </p>
                      <p className="text-sm font-mono text-gray-600 dark:text-gray-300 mt-1">
                        {bankAccountService.formatAccountNumber(account.accountNumber)}
                      </p>
                      {account.accountName && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {account.accountName}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!account.isVerified && (
                      <button
                        onClick={() => handleReverify(account.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg"
                        title="Verify account"
                      >
                        <ShieldCheck className="w-4 h-4" />
                      </button>
                    )}
                    {!account.isDefault && (
                      <button
                        onClick={() => handleSetDefault(account.id)}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
                        title="Set as default"
                      >
                        <StarOff className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => setDeleteConfirm(account.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg"
                      title="Delete account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Bank Account Modal */}
      <AddBankAccountModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        banks={banks}
        onSuccess={() => {
          setShowAddModal(false);
          loadData();
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Bank Account"
      >
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Are you sure you want to delete this bank account? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}

// Add Bank Account Modal Component
interface AddBankAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  banks: Bank[];
  onSuccess: () => void;
}

function AddBankAccountModal({ isOpen, onClose, banks, onSuccess }: AddBankAccountModalProps) {
  const [selectedBank, setSelectedBank] = useState<Bank | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [nickname, setNickname] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<{ verified: boolean; accountName?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBankDropdown, setShowBankDropdown] = useState(false);

  const resetForm = () => {
    setSelectedBank(null);
    setAccountNumber('');
    setNickname('');
    setIsDefault(false);
    setVerification(null);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleVerify = async () => {
    if (!selectedBank || !accountNumber) return;

    setVerifying(true);
    setError(null);

    try {
      const result = await bankAccountService.verifyBankAccount(selectedBank.providerId, accountNumber);
      setVerification(result);

      if (!result.verified) {
        setError('Could not verify account holder. You can still add the account.');
      }
    } catch (err) {
      setError('Verification failed. You can still add the account.');
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBank || !accountNumber) {
      setError('Please select a bank and enter account number');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await bankAccountService.addBankAccount({
        bankProviderId: selectedBank.providerId,
        bankName: selectedBank.name,
        accountNumber,
        nickname: nickname || undefined,
        isDefault,
      });

      if (result.success) {
        resetForm();
        onSuccess();
      } else {
        setError(result.error || 'Failed to add bank account');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to add bank account');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add Bank Account">
      <div className="p-6 space-y-4">
        {/* Bank Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Bank
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBankDropdown(!showBankDropdown)}
              className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-left"
            >
              {selectedBank ? (
                <span className="text-gray-900 dark:text-white">{selectedBank.name}</span>
              ) : (
                <span className="text-gray-400">Choose a bank...</span>
              )}
              <ChevronDown className="w-5 h-5 text-gray-400" />
            </button>

            {showBankDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {banks.filter(b => (b.status?.active !== false) && (b.featureSet?.payout?.canPayTo !== false)).map((bank) => (
                  <button
                    key={bank.providerId}
                    type="button"
                    onClick={() => {
                      setSelectedBank(bank);
                      setShowBankDropdown(false);
                      setVerification(null);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                  >
                    <Building2 className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-900 dark:text-white">{bank.name}</span>
                  </button>
                ))}
                {banks.length === 0 && (
                  <div className="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm text-center">
                    <p className="font-medium">No banks available</p>
                    <p className="text-xs mt-1">Bank payouts are not configured yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Account Number */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Account Number
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={accountNumber}
              onChange={(e) => {
                setAccountNumber(e.target.value);
                setVerification(null);
              }}
              placeholder="Enter account number"
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleVerify}
              disabled={!selectedBank || !accountNumber || verifying}
              className="shrink-0"
            >
              {verifying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        </div>

        {/* Verification Result */}
        {verification && (
          <div className={`p-3 rounded-lg ${
            verification.verified
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}>
            <div className="flex items-center gap-2">
              {verification.verified ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  verification.verified
                    ? 'text-green-700 dark:text-green-300'
                    : 'text-amber-700 dark:text-amber-300'
                }`}>
                  {verification.verified ? 'Account Verified' : 'Could not verify'}
                </p>
                {verification.accountName && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {verification.accountName}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Nickname */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Nickname (Optional)
          </label>
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g., My Salary Account"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          />
        </div>

        {/* Set as Default */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Set as default withdrawal account
          </span>
        </label>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedBank || !accountNumber || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Bank Account'
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
