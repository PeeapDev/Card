import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, TrendingUp, Send, Users, QrCode, Smartphone, Building2, ShoppingBag } from 'lucide-react';
import { MotionCard, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useWallets } from '@/hooks/useWallets';
import { useCards } from '@/hooks/useCards';
import { useTransactions } from '@/hooks/useTransactions';
import { UserSearch, SearchResult } from '@/components/ui/UserSearch';
import { VerifiedBadge } from '@/components/ui/VerifiedBadge';
import { ScanToPayModal } from '@/components/payment/ScanToPayModal';
import { SendToMobileMoneyModal } from '@/components/payment/SendToMobileMoneyModal';
import { PendingSubscriptionPaymentsCompact } from '@/components/subscriptions/PendingSubscriptionPayments';
import { ProductCarousel } from '@/components/marketplace/ProductCarousel';
import { RecentOrdersCompact } from '@/components/marketplace/RecentOrders';
import { clsx } from 'clsx';
import { currencyService, Currency } from '@/services/currency.service';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' }
  }
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: wallets, isLoading: walletsLoading, error: walletsError } = useWallets();
  const { data: cards, isLoading: cardsLoading, error: cardsError } = useCards();
  const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useTransactions();

  // Currencies for formatting
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [defaultCurrency, setDefaultCurrency] = useState<Currency | null>(null);

  // Modal states
  const [showScanToPay, setShowScanToPay] = useState(false);
  const [showSendToMobileMoney, setShowSendToMobileMoney] = useState(false);

  useEffect(() => {
    const loadCurrencies = async () => {
      const [allCurrencies, defCurrency] = await Promise.all([
        currencyService.getCurrencies(),
        currencyService.getDefaultCurrency()
      ]);
      setCurrencies(allCurrencies);
      setDefaultCurrency(defCurrency);
    };
    loadCurrencies();
  }, []);

  // Get currency symbol by code
  const getCurrencySymbol = (code?: string): string => {
    if (!code) return defaultCurrency?.symbol || '';
    return currencies.find(c => c.code === code)?.symbol || code;
  };

  // Format amount with correct currency symbol
  const formatCurrency = (amount: number, currencyCode?: string): string => {
    const symbol = getCurrencySymbol(currencyCode);
    return `${symbol} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const totalBalance = wallets?.reduce((sum, w) => sum + (w.balance || 0), 0) || 0;
  // Get primary wallet currency (first active wallet)
  const primaryWallet = wallets?.find(w => w.status === 'ACTIVE') || wallets?.[0];
  const primaryCurrency = primaryWallet?.currency || 'SLE';
  const activeCards = cards?.filter((c) => c.status === 'ACTIVE').length || 0;

  // Handle user selection from search - navigate to send money page with pre-selected recipient
  const handleUserSelect = (selectedUser: SearchResult) => {
    // Store selected user in sessionStorage for SendMoneyPage to pick up
    sessionStorage.setItem('sendMoneyRecipient', JSON.stringify(selectedUser));
    navigate('/send');
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header with Welcome + Send Money Search */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              Welcome back, {user?.firstName}!
              <VerifiedBadge verified={user?.kycStatus === 'APPROVED'} size="md" />
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening with your account.</p>
          </div>

          {/* Compact Send Money Search */}
          <div className="w-full md:w-80 lg:w-96">
            <UserSearch
              placeholder="Send money to @user or phone..."
              excludeUserId={user?.id}
              onSelect={handleUserSelect}
              compact
            />
          </div>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants}>
            <MotionCard glowEffect delay={0}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Balance</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {walletsLoading ? '...' : formatCurrency(totalBalance, primaryCurrency)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <Link to="/wallets" className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 block">
                Manage balance →
              </Link>
            </MotionCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <MotionCard glowEffect delay={0.1}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Wallets</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {walletsLoading ? '...' : wallets?.length || 0}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <Link to="/wallets" className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 block">
                View all wallets →
              </Link>
            </MotionCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <MotionCard glowEffect delay={0.2}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Cards</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {cardsLoading ? '...' : activeCards}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <Link to="/cards" className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 block">
                Manage cards →
              </Link>
            </MotionCard>
          </motion.div>

          <motion.div variants={itemVariants}>
            <MotionCard glowEffect delay={0.3}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">KYC Status</p>
                  <p
                    className={clsx(
                      'text-lg font-bold mt-1',
                      user?.kycStatus === 'VERIFIED' && 'text-green-600 dark:text-green-400',
                      user?.kycStatus === 'PENDING' && 'text-yellow-600 dark:text-yellow-400',
                      user?.kycStatus === 'REJECTED' && 'text-red-600 dark:text-red-400',
                      user?.kycStatus === 'SUBMITTED' && 'text-blue-600 dark:text-blue-400'
                    )}
                  >
                    {user?.kycStatus}
                  </p>
                </div>
                <div
                  className={clsx(
                    'w-12 h-12 rounded-full flex items-center justify-center',
                    user?.kycStatus === 'VERIFIED' && 'bg-green-100 dark:bg-green-900/30',
                    user?.kycStatus === 'PENDING' && 'bg-yellow-100 dark:bg-yellow-900/30',
                    user?.kycStatus === 'REJECTED' && 'bg-red-100 dark:bg-red-900/30',
                    user?.kycStatus === 'SUBMITTED' && 'bg-blue-100 dark:bg-blue-900/30'
                  )}
                >
                  <TrendingUp
                    className={clsx(
                      'w-6 h-6',
                      user?.kycStatus === 'VERIFIED' && 'text-green-600 dark:text-green-400',
                      user?.kycStatus === 'PENDING' && 'text-yellow-600 dark:text-yellow-400',
                      user?.kycStatus === 'REJECTED' && 'text-red-600 dark:text-red-400',
                      user?.kycStatus === 'SUBMITTED' && 'text-blue-600 dark:text-blue-400'
                    )}
                  />
                </div>
              </div>
              {user?.kycStatus !== 'VERIFIED' && (
                <Link to="/profile" className="mt-4 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 block">
                  Complete verification →
                </Link>
              )}
            </MotionCard>
          </motion.div>
        </motion.div>

        {/* Product Carousel - Auto-sliding banner */}
        <ProductCarousel />

        {/* Active Orders Status */}
        <RecentOrdersCompact />

        {/* Pending Subscription Payments */}
        <PendingSubscriptionPaymentsCompact />

        {/* Recent activity */}
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Recent transactions */}
          <motion.div variants={itemVariants}>
            <MotionCard delay={0.5}>
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Your latest financial activity</CardDescription>
              </CardHeader>
              <div className="space-y-4">
                {transactionsLoading ? (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">Loading transactions...</div>
                ) : transactions && transactions.length > 0 ? (
                  transactions.slice(0, 5).map((txn, index) => {
                    const isCredit = txn.amount > 0 || ['deposit', 'receive', 'refund'].includes(txn.type.toLowerCase());
                    return (
                      <motion.div
                        key={txn.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className={clsx(
                          "flex items-center justify-between py-3",
                          index < transactions.slice(0, 5).length - 1 && "border-b border-gray-100 dark:border-gray-700"
                        )}
                      >
                        <div className="flex items-center">
                          <div className={clsx(
                            "w-10 h-10 rounded-full flex items-center justify-center",
                            isCredit ? "bg-green-100 dark:bg-green-900/30" : "bg-red-100 dark:bg-red-900/30"
                          )}>
                            {isCredit ? (
                              <ArrowDownRight className="w-5 h-5 text-green-600 dark:text-green-400" />
                            ) : (
                              <ArrowUpRight className="w-5 h-5 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="ml-3">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {txn.description || txn.type}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(txn.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <p className={clsx(
                          "text-sm font-semibold",
                          isCredit ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                        )}>
                          {isCredit ? '+' : ''}{formatCurrency(Math.abs(txn.amount))}
                        </p>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                    <p>No transactions yet</p>
                    <p className="text-xs mt-1">Send money to see your activity here</p>
                  </div>
                )}
              </div>
              <Link
                to="/transactions"
                className="block mt-4 text-center text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                View all transactions
              </Link>
            </MotionCard>
          </motion.div>

          {/* Quick actions */}
          <motion.div variants={itemVariants}>
            <MotionCard delay={0.6}>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks you can perform</CardDescription>
              </CardHeader>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setShowScanToPay(true)}
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-2">
                    <QrCode className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Scan to Pay</span>
                </button>
                <Link
                  to="/wallets?action=deposit"
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                    <ArrowDownRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Deposit</span>
                </Link>
                <button
                  onClick={() => setShowSendToMobileMoney(true)}
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-2">
                    <Smartphone className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white text-center">Send to<br/>Mobile Money</span>
                </button>
                <Link
                  to="/withdraw"
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-2">
                    <Building2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white text-center">Withdraw</span>
                </Link>
                <Link
                  to="/wallets?action=transfer"
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-2">
                    <ArrowUpRight className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Transfer</span>
                </Link>
                <Link
                  to="/cards?action=new"
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mb-2">
                    <CreditCard className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">New Card</span>
                </Link>
                <Link
                  to="/marketplace"
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900/30 rounded-full flex items-center justify-center mb-2">
                    <ShoppingBag className="w-6 h-6 text-pink-600 dark:text-pink-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Shop</span>
                </Link>
              </div>
            </MotionCard>
          </motion.div>
        </motion.div>
      </div>

      {/* Floating Scan to Pay Button - Mobile */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setShowScanToPay(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center md:hidden"
        aria-label="Scan to Pay"
      >
        <QrCode className="w-6 h-6" />
      </motion.button>

      {/* Scan to Pay Modal */}
      <ScanToPayModal
        isOpen={showScanToPay}
        onClose={() => setShowScanToPay(false)}
      />

      {/* Send to Mobile Money Modal */}
      <SendToMobileMoneyModal
        isOpen={showSendToMobileMoney}
        onClose={() => setShowSendToMobileMoney(false)}
      />
    </MainLayout>
  );
}
