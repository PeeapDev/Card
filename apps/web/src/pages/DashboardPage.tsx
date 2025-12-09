import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wallet, CreditCard, ArrowUpRight, ArrowDownRight, TrendingUp, Send, Users } from 'lucide-react';
import { MotionCard, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { MainLayout } from '@/components/layout/MainLayout';
import { useAuth } from '@/context/AuthContext';
import { useWallets } from '@/hooks/useWallets';
import { useCards } from '@/hooks/useCards';
import { useTransactions } from '@/hooks/useTransactions';
import { UserSearch, SearchResult } from '@/components/ui/UserSearch';
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
        {/* Welcome section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user?.firstName}!
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Here's what's happening with your account.</p>
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
                    {walletsLoading ? '...' : formatCurrency(totalBalance)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
              </div>
              <div className="mt-4 flex items-center text-sm text-green-600 dark:text-green-400">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+12.5% from last month</span>
              </div>
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

        {/* Quick Send Money - Global User Search */}
        <MotionCard className="p-6" delay={0.4} glowEffect>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Send className="w-5 h-5 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Send Money</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Search for a user to send money instantly</p>
            </div>
          </div>
          <UserSearch
            placeholder="Search by @username, phone, or name..."
            excludeUserId={user?.id}
            onSelect={handleUserSelect}
          />
          <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              Search by name
            </span>
            <span>•</span>
            <span>@username</span>
            <span>•</span>
            <span>Phone number</span>
          </div>
        </MotionCard>

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
              <div className="grid grid-cols-2 gap-4">
                <Link
                  to="/wallets?action=deposit"
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-2">
                    <ArrowDownRight className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Deposit</span>
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
                  to="/wallets?action=new"
                  className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-2">
                    <Wallet className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">New Wallet</span>
                </Link>
              </div>
            </MotionCard>
          </motion.div>
        </motion.div>
      </div>
    </MainLayout>
  );
}
