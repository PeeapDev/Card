import { useState, useEffect } from 'react';
import {
  DollarSign,
  Percent,
  CreditCard,
  ArrowLeftRight,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Edit,
  ArrowUpRight,
  ArrowDownRight,
  Store,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { Card, MotionCard } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { currencyService, Currency } from '@/services/currency.service';

interface FeeSettings {
  // Withdrawal
  withdrawalFeePercent: number;
  withdrawalFeeFlat: number;
  // P2P
  p2pFeePercent: number;
  p2pFeeFlat: number;
  // Card
  cardTxnFeePercent: number;
  cardTxnFeeFlat: number;
  virtualCardFee: number;
  physicalCardFee: number;
  // Checkout/Merchant
  checkoutFeePercent: number;
  checkoutFeeFlat: number;
  merchantPayoutFeePercent: number;
  merchantPayoutFeeFlat: number;
}

interface LimitSettings {
  minWithdrawalAmount: number;
  maxWithdrawalAmount: number;
  dailyWithdrawalLimit: number;
  minDepositAmount: number;
  maxDepositAmount: number;
  withdrawalAutoApproveUnder: number;
}

const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
    return `${window.location.origin}/api`;
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
};

export function FeesPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  const [fees, setFees] = useState<FeeSettings>({
    withdrawalFeePercent: 2,
    withdrawalFeeFlat: 0,
    p2pFeePercent: 0,
    p2pFeeFlat: 0,
    cardTxnFeePercent: 1.5,
    cardTxnFeeFlat: 0,
    virtualCardFee: 1,
    physicalCardFee: 10,
    checkoutFeePercent: 2.9,
    checkoutFeeFlat: 0.30,
    merchantPayoutFeePercent: 0.25,
    merchantPayoutFeeFlat: 0,
  });

  const [limits, setLimits] = useState<LimitSettings>({
    minWithdrawalAmount: 1,
    maxWithdrawalAmount: 50000,
    dailyWithdrawalLimit: 100000,
    minDepositAmount: 1,
    maxDepositAmount: 100000,
    withdrawalAutoApproveUnder: 1000,
  });

  useEffect(() => {
    currencyService.getDefaultCurrency().then(setDefaultCurrency);
    fetchSettings();
  }, []);

  const currencySymbol = defaultCurrency?.symbol || 'NLe';

  const formatCurrency = (amount: number): string => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();

      if (data.feeSettings) {
        setFees({
          withdrawalFeePercent: data.feeSettings.withdrawalFeePercent || 2,
          withdrawalFeeFlat: data.feeSettings.withdrawalFeeFlat || 0,
          p2pFeePercent: data.feeSettings.p2pFeePercent || 0,
          p2pFeeFlat: data.feeSettings.p2pFeeFlat || 0,
          cardTxnFeePercent: data.feeSettings.cardTxnFeePercent || 1.5,
          cardTxnFeeFlat: data.feeSettings.cardTxnFeeFlat || 0,
          virtualCardFee: data.feeSettings.virtualCardFee || 1,
          physicalCardFee: data.feeSettings.physicalCardFee || 10,
          checkoutFeePercent: data.feeSettings.checkoutFeePercent || 2.9,
          checkoutFeeFlat: data.feeSettings.checkoutFeeFlat || 0.30,
          merchantPayoutFeePercent: data.feeSettings.merchantPayoutFeePercent || 0.25,
          merchantPayoutFeeFlat: data.feeSettings.merchantPayoutFeeFlat || 0,
        });
      }

      if (data.withdrawalSettings) {
        setLimits({
          minWithdrawalAmount: data.withdrawalSettings.minWithdrawalAmount || 1,
          maxWithdrawalAmount: data.withdrawalSettings.maxWithdrawalAmount || 50000,
          dailyWithdrawalLimit: data.withdrawalSettings.dailyWithdrawalLimit || 100000,
          minDepositAmount: data.depositSettings?.minDepositAmount || 1,
          maxDepositAmount: data.depositSettings?.maxDepositAmount || 100000,
          withdrawalAutoApproveUnder: data.withdrawalSettings.autoApproveUnder || 1000,
        });
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('Failed to load fee settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${getApiUrl()}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Fees
          withdrawalFeePercent: fees.withdrawalFeePercent,
          withdrawalFeeFlat: fees.withdrawalFeeFlat,
          p2pFeePercent: fees.p2pFeePercent,
          p2pFeeFlat: fees.p2pFeeFlat,
          cardTxnFeePercent: fees.cardTxnFeePercent,
          cardTxnFeeFlat: fees.cardTxnFeeFlat,
          virtualCardFee: fees.virtualCardFee,
          physicalCardFee: fees.physicalCardFee,
          checkoutFeePercent: fees.checkoutFeePercent,
          checkoutFeeFlat: fees.checkoutFeeFlat,
          merchantPayoutFeePercent: fees.merchantPayoutFeePercent,
          merchantPayoutFeeFlat: fees.merchantPayoutFeeFlat,
          // Limits
          minWithdrawalAmount: limits.minWithdrawalAmount,
          maxWithdrawalAmount: limits.maxWithdrawalAmount,
          dailyWithdrawalLimit: limits.dailyWithdrawalLimit,
          minDepositAmount: limits.minDepositAmount,
          maxDepositAmount: limits.maxDepositAmount,
          withdrawalAutoApproveUnder: limits.withdrawalAutoApproveUnder,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setSaved(true);
      setIsEditing(false);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('Failed to save fee settings');
    } finally {
      setSaving(false);
    }
  };

  const FeeCard = ({
    title,
    description,
    icon: Icon,
    color,
    percentValue,
    flatValue,
    onPercentChange,
    onFlatChange,
    showFlat = true,
  }: {
    title: string;
    description: string;
    icon: any;
    color: string;
    percentValue: number;
    flatValue: number;
    onPercentChange: (v: number) => void;
    onFlatChange: (v: number) => void;
    showFlat?: boolean;
  }) => (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </div>
      <div className={`grid ${showFlat ? 'grid-cols-2' : 'grid-cols-1'} gap-4 mt-4`}>
        <div>
          <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Percentage Fee</label>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="number"
                step="0.1"
                value={percentValue}
                onChange={(e) => onPercentChange(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold"
              />
              <span className="text-gray-500">%</span>
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{percentValue}%</p>
          )}
        </div>
        {showFlat && (
          <div>
            <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Flat Fee</label>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-500">{currencySymbol}</span>
                <input
                  type="number"
                  step="0.01"
                  value={flatValue}
                  onChange={(e) => onFlatChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold"
                />
              </div>
            ) : (
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(flatValue)}</p>
            )}
          </div>
        )}
      </div>
    </Card>
  );

  const FixedFeeCard = ({
    title,
    description,
    icon: Icon,
    color,
    value,
    onChange,
  }: {
    title: string;
    description: string;
    icon: any;
    color: string;
    value: number;
    onChange: (v: number) => void;
  }) => (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
        <div className="text-right">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{currencySymbol}</span>
              <input
                type="number"
                step="0.01"
                value={value}
                onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
                className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg font-bold text-right"
              />
            </div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(value)}</p>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Fees & Pricing</h1>
            <p className="text-gray-500 dark:text-gray-400">Configure transaction fees for all services</p>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Changes saved
              </span>
            )}
            {error && (
              <span className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </span>
            )}
            <button
              onClick={fetchSettings}
              disabled={loading}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                isEditing
                  ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  : 'bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Edit className="w-4 h-4" />
              {isEditing ? 'Cancel' : 'Edit All Fees'}
            </button>
            {isEditing && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2 disabled:opacity-50"
              >
                <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
                {saving ? 'Saving...' : 'Save All'}
              </button>
            )}
          </div>
        </div>

        {/* Withdrawal Fees - Main Revenue */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowUpRight className="w-5 h-5 text-red-500" />
            Withdrawal / Cashout Fees
            <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full">Main Revenue</span>
          </h2>
          <FeeCard
            title="User Withdrawal Fee"
            description="Charged when users cash out to mobile money"
            icon={Wallet}
            color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
            percentValue={fees.withdrawalFeePercent}
            flatValue={fees.withdrawalFeeFlat}
            onPercentChange={(v) => setFees({ ...fees, withdrawalFeePercent: v })}
            onFlatChange={(v) => setFees({ ...fees, withdrawalFeeFlat: v })}
          />
        </section>

        {/* P2P Transfer Fees */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-500" />
            P2P Transfer Fees
          </h2>
          <FeeCard
            title="P2P Transfer Fee"
            description="Charged on peer-to-peer transfers between users"
            icon={ArrowLeftRight}
            color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            percentValue={fees.p2pFeePercent}
            flatValue={fees.p2pFeeFlat}
            onPercentChange={(v) => setFees({ ...fees, p2pFeePercent: v })}
            onFlatChange={(v) => setFees({ ...fees, p2pFeeFlat: v })}
          />
        </section>

        {/* Card Fees */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-purple-500" />
            Card Fees
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeeCard
              title="Card Transaction Fee"
              description="Charged on every card transaction"
              icon={CreditCard}
              color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
              percentValue={fees.cardTxnFeePercent}
              flatValue={fees.cardTxnFeeFlat}
              onPercentChange={(v) => setFees({ ...fees, cardTxnFeePercent: v })}
              onFlatChange={(v) => setFees({ ...fees, cardTxnFeeFlat: v })}
            />
            <div className="space-y-4">
              <FixedFeeCard
                title="Virtual Card Creation"
                description="One-time fee for new virtual cards"
                icon={CreditCard}
                color="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400"
                value={fees.virtualCardFee}
                onChange={(v) => setFees({ ...fees, virtualCardFee: v })}
              />
              <FixedFeeCard
                title="Physical Card Creation"
                description="One-time fee for physical cards"
                icon={CreditCard}
                color="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
                value={fees.physicalCardFee}
                onChange={(v) => setFees({ ...fees, physicalCardFee: v })}
              />
            </div>
          </div>
        </section>

        {/* Merchant/Checkout Fees */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Store className="w-5 h-5 text-orange-500" />
            Merchant & Checkout Fees
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FeeCard
              title="Checkout Fee"
              description="Charged on customer payments via checkout"
              icon={Store}
              color="bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"
              percentValue={fees.checkoutFeePercent}
              flatValue={fees.checkoutFeeFlat}
              onPercentChange={(v) => setFees({ ...fees, checkoutFeePercent: v })}
              onFlatChange={(v) => setFees({ ...fees, checkoutFeeFlat: v })}
            />
            <FeeCard
              title="Merchant Payout Fee"
              description="Charged when merchants withdraw earnings"
              icon={TrendingUp}
              color="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400"
              percentValue={fees.merchantPayoutFeePercent}
              flatValue={fees.merchantPayoutFeeFlat}
              onPercentChange={(v) => setFees({ ...fees, merchantPayoutFeePercent: v })}
              onFlatChange={(v) => setFees({ ...fees, merchantPayoutFeeFlat: v })}
            />
          </div>
        </section>

        {/* Transaction Limits */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-green-500" />
            Transaction Limits
          </h2>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Withdrawal</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={limits.minWithdrawalAmount}
                    onChange={(e) => setLimits({ ...limits, minWithdrawalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(limits.minWithdrawalAmount)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Withdrawal</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={limits.maxWithdrawalAmount}
                    onChange={(e) => setLimits({ ...limits, maxWithdrawalAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(limits.maxWithdrawalAmount)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Daily Limit</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={limits.dailyWithdrawalLimit}
                    onChange={(e) => setLimits({ ...limits, dailyWithdrawalLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(limits.dailyWithdrawalLimit)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Deposit</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={limits.minDepositAmount}
                    onChange={(e) => setLimits({ ...limits, minDepositAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(limits.minDepositAmount)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Deposit</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={limits.maxDepositAmount}
                    onChange={(e) => setLimits({ ...limits, maxDepositAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(limits.maxDepositAmount)}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Auto-Approve Under</label>
                {isEditing ? (
                  <input
                    type="number"
                    value={limits.withdrawalAutoApproveUnder}
                    onChange={(e) => setLimits({ ...limits, withdrawalAutoApproveUnder: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(limits.withdrawalAutoApproveUnder)}</p>
                )}
              </div>
            </div>
          </Card>
        </section>

        {/* Fee Calculator */}
        <section>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fee Calculator</h2>
          <Card className="p-6 bg-gray-50 dark:bg-gray-800/50">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[10, 50, 100, 500, 1000, 5000, 10000, 50000].map((amount) => {
                const percentFee = amount * (fees.withdrawalFeePercent / 100);
                const totalFee = percentFee + fees.withdrawalFeeFlat;
                return (
                  <div key={amount} className="p-4 bg-white dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Withdraw {formatCurrency(amount)}</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                      Fee: {formatCurrency(totalFee)}
                    </p>
                    <p className="text-xs text-gray-400">User gets: {formatCurrency(amount - totalFee)}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </section>
      </div>
    </AdminLayout>
  );
}
