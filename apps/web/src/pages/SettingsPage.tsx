/**
 * Settings Page
 *
 * Comprehensive settings hub for user preferences:
 * - Apps (Cash Box, Events)
 * - Bank Accounts
 * - Payment Preferences
 * - Notifications
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Settings,
  Package,
  Calendar,
  Bell,
  CreditCard,
  Wallet,
  Check,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Sparkles,
  Palette,
  ArrowUpCircle,
  GraduationCap,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { MainLayout } from '@/components/layout/MainLayout';
import { BankAccountsSection } from '@/components/profile/BankAccountsSection';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { ThemeColorSelector } from '@/components/settings/ThemeColorSelector';
import { BecomeMerchantCard } from '@/components/settings/BecomeMerchantCard';
import { BecomeAgentCard } from '@/components/settings/BecomeAgentCard';
import { useAuth } from '@/context/AuthContext';
import { useUserApps } from '@/context/UserAppsContext';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
};

interface UserWallet {
  id: string;
  currency: string;
  balance: number;
  wallet_type: string;
  status: string;
}

export function SettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    enabledApps,
    toggleApp,
    isAppEnabled,
    isCashBoxSetupCompleted,
    isLoading: appsLoading,
    cashBoxSettings,
  } = useUserApps();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [defaultWalletId, setDefaultWalletId] = useState<string | undefined>();

  // Wallet state
  const [wallets, setWallets] = useState<UserWallet[]>([]);
  const [savingDefaultWallet, setSavingDefaultWallet] = useState(false);

  // Load wallets on mount
  useEffect(() => {
    if (user?.id) {
      loadWallets();
    }
  }, [user?.id]);

  const loadWallets = async () => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('id, currency, balance, wallet_type, status')
        .eq('user_id', user.id)
        .eq('status', 'ACTIVE')
        .order('wallet_type', { ascending: true });

      if (!error && data) {
        setWallets(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefaultWallet = async (walletId: string) => {
    if (!user?.id) return;

    setSavingDefaultWallet(true);
    try {
      setDefaultWalletId(walletId);
      setMessage({ type: 'success', text: 'Wallet preference saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update wallet preference' });
    } finally {
      setSavingDefaultWallet(false);
    }
  };

  // Handle Cash Box toggle
  const handleCashBoxToggle = async () => {
    try {
      if (isAppEnabled('cashbox')) {
        // Disabling - just toggle off
        await toggleApp('cashbox');
        setMessage({ type: 'success', text: 'Cash Box disabled' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        // Enabling - redirect to setup wizard
        navigate('/cashbox/setup');
      }
    } catch (error: any) {
      console.error('Error toggling Cash Box:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update Cash Box. Please try again.' });
    }
  };

  // Handle Events toggle
  const handleEventsToggle = async () => {
    try {
      await toggleApp('events');
      setMessage({
        type: 'success',
        text: enabledApps.events ? 'Events app disabled' : 'Events app enabled!'
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error toggling Events:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update Events app. Please try again.' });
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <motion.div
        className="space-y-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <Settings className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage your apps, preferences, and security</p>
            </div>
          </div>
        </motion.div>

        {/* Message */}
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className={clsx(
              'p-4 rounded-xl flex items-center gap-3',
              message.type === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800'
            )}
          >
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="ml-auto">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Apps Section */}
        <motion.div variants={itemVariants}>
          <MotionCard className="p-6" glowEffect>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Apps</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enable features and apps for your account</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Cash Box App */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
                      <Package className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Cash Box</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Lock away savings and earn interest
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleCashBoxToggle}
                    disabled={appsLoading}
                    className="flex items-center gap-2"
                  >
                    {isAppEnabled('cashbox') ? (
                      <ToggleRight className="w-10 h-10 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                </div>

                {isAppEnabled('cashbox') && isCashBoxSetupCompleted() && cashBoxSettings && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Auto-deposit:</span>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {cashBoxSettings.autoDepositEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {cashBoxSettings.autoDepositEnabled && cashBoxSettings.autoDepositAmount && (
                      <div className="flex items-center justify-between text-sm mt-1">
                        <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          SLE {cashBoxSettings.autoDepositAmount.toFixed(2)} / {cashBoxSettings.autoDepositFrequency}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => navigate('/pots')}
                      className="mt-3 text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium"
                    >
                      Go to Cash Box →
                    </button>
                  </motion.div>
                )}

                {!isAppEnabled('cashbox') && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-sm text-gray-500 dark:text-gray-400"
                  >
                    Toggle on to start the setup wizard and create your first savings box
                  </motion.p>
                )}
              </div>

              {/* Events App */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Events</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Browse events, buy tickets, and manage bookings
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleEventsToggle}
                    disabled={appsLoading}
                    className="flex items-center gap-2"
                  >
                    {enabledApps.events ? (
                      <ToggleRight className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                </div>

                {enabledApps.events && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Events app is enabled! Browse and purchase tickets from the{' '}
                      <a href="/events" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
                        Events page
                      </a>
                      .
                    </p>
                  </motion.div>
                )}
              </div>

              {/* School Utilities App */}
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">School Utilities</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Manage your children's school finances
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await toggleApp('school_utilities');
                        setMessage({
                          type: 'success',
                          text: enabledApps.school_utilities ? 'School Utilities disabled' : 'School Utilities enabled!'
                        });
                        setTimeout(() => setMessage(null), 3000);
                      } catch (error: any) {
                        setMessage({ type: 'error', text: error.message || 'Failed to update. Please try again.' });
                      }
                    }}
                    disabled={appsLoading}
                    className="flex items-center gap-2"
                  >
                    {enabledApps.school_utilities ? (
                      <ToggleRight className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-gray-400" />
                    )}
                  </button>
                </div>

                {enabledApps.school_utilities && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mt-3"
                  >
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      School Utilities is enabled! Manage your children's school finances from the{' '}
                      <a href="/school-utilities" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">
                        School Utilities page
                      </a>
                      .
                    </p>
                    <button
                      onClick={() => navigate('/school-utilities')}
                      className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                    >
                      Go to School Utilities →
                    </button>
                  </motion.div>
                )}

                {!enabledApps.school_utilities && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-3 text-sm text-gray-500 dark:text-gray-400"
                  >
                    Link your children's schools to view fees, wallet balances, lunch credits, and more
                  </motion.p>
                )}
              </div>
            </div>
          </MotionCard>
        </motion.div>

        {/* Upgrade Your Account Section */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-100 to-orange-100 dark:from-purple-900/30 dark:to-orange-900/30 rounded-lg">
              <ArrowUpCircle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">Upgrade Your Account</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Unlock more features by becoming a merchant or agent</p>
            </div>
          </div>
          <div className="space-y-4">
            <BecomeMerchantCard />
            <BecomeAgentCard />
          </div>
        </motion.div>

        {/* Bank Accounts Section */}
        <motion.div variants={itemVariants}>
          <BankAccountsSection />
        </motion.div>

        {/* Two Column Layout for Preferences and Security */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Payment Preferences */}
          <motion.div variants={itemVariants}>
            <MotionCard className="p-6 h-full" glowEffect>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                  <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Payment Preferences</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Set your default wallet</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Default Wallet for Transactions
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    This wallet will be selected by default when sending money
                  </p>

                  {wallets.length > 0 ? (
                    <div className="space-y-2">
                      {wallets.map((wallet) => {
                        const isDefault = defaultWalletId === wallet.id ||
                          (!defaultWalletId && wallet.wallet_type === 'primary');

                        return (
                          <motion.button
                            key={wallet.id}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleSetDefaultWallet(wallet.id)}
                            disabled={savingDefaultWallet}
                            className={clsx(
                              'w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all',
                              isDefault
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={clsx(
                                'w-10 h-10 rounded-lg flex items-center justify-center',
                                wallet.currency === 'SLE' ? 'bg-green-100 dark:bg-green-900/30' :
                                wallet.currency === 'USD' ? 'bg-blue-100 dark:bg-blue-900/30' :
                                'bg-gray-100 dark:bg-gray-700'
                              )}>
                                <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                  {wallet.currency === 'SLE' ? 'Le' : '$'}
                                </span>
                              </div>
                              <div className="text-left">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">
                                  {wallet.currency} Wallet
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {wallet.currency === 'SLE' ? 'Le ' : '$ '}
                                  {wallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                            <div className={clsx(
                              'w-5 h-5 rounded-full border-2 flex items-center justify-center',
                              isDefault
                                ? 'border-primary-500 bg-primary-500'
                                : 'border-gray-300 dark:border-gray-600'
                            )}>
                              {isDefault && <Check className="w-3 h-3 text-white" />}
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                      <Wallet className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">No wallets found</p>
                    </div>
                  )}
                </div>
              </div>
            </MotionCard>
          </motion.div>
        </div>

        {/* Notifications Section */}
        <motion.div variants={itemVariants}>
          <MotionCard className="p-6" glowEffect>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your notification preferences</p>
              </div>
            </div>

            <NotificationSettings />
          </MotionCard>
        </motion.div>

        {/* Theme Color Section */}
        <motion.div variants={itemVariants}>
          <MotionCard className="p-6" glowEffect>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                <Palette className="w-5 h-5 text-pink-600 dark:text-pink-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Color Theme</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred color theme for cards and UI elements</p>
              </div>
            </div>

            <ThemeColorSelector type="user" />
          </MotionCard>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}
