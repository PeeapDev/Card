/**
 * Settings Page
 *
 * Comprehensive settings hub for user preferences:
 * - Apps (Cash Box, Events, Fees)
 * - Bank Accounts
 * - Payment Preferences
 * - Notifications
 * - Theme
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Building2,
  Shield,
  ChevronRight,
  User,
  Landmark,
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

// Settings section card component
function SettingCard({
  icon: Icon,
  iconBg,
  iconColor,
  title,
  description,
  onClick,
  href,
  badge,
  children,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  title: string;
  description: string;
  onClick?: () => void;
  href?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
}) {
  const content = (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group h-full">
      <div className="flex items-start gap-4">
        <div className={clsx('w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon className={clsx('w-6 h-6', iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
              {title}
            </h3>
            {badge}
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
        </div>
        {!children && <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );

  if (href) {
    return <Link to={href}>{content}</Link>;
  }

  if (onClick) {
    return <button onClick={onClick} className="w-full text-left">{content}</button>;
  }

  return content;
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
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

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

  // Handle app toggles
  const handleAppToggle = async (appId: string, redirectOnEnable?: string) => {
    try {
      if (isAppEnabled(appId)) {
        await toggleApp(appId);
        setMessage({ type: 'success', text: `App disabled` });
      } else {
        if (redirectOnEnable) {
          navigate(redirectOnEnable);
        } else {
          await toggleApp(appId);
          setMessage({ type: 'success', text: `App enabled!` });
        }
      }
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      console.error('Error toggling app:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to update. Please try again.' });
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

  // Count enabled apps
  const enabledAppsCount = [
    isAppEnabled('cashbox'),
    isAppEnabled('events'),
    isAppEnabled('cards'),
    isAppEnabled('school_utilities'),
  ].filter(Boolean).length;

  return (
    <MainLayout>
      <motion.div
        className="max-w-5xl mx-auto space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl shadow-lg">
              <Settings className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage your account, apps, and preferences</p>
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
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Apps</h2>
            {enabledAppsCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 rounded-full">
                {enabledAppsCount} enabled
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cash Box App */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Cash Box</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Savings & interest</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAppToggle('cashbox', '/cashbox/setup')}
                  disabled={appsLoading}
                  className="flex-shrink-0"
                >
                  {isAppEnabled('cashbox') ? (
                    <ToggleRight className="w-10 h-10 text-amber-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Lock away savings and earn interest on your money
              </p>
              {isAppEnabled('cashbox') && (
                <Link
                  to="/pots"
                  className="inline-flex items-center text-sm text-amber-600 dark:text-amber-400 hover:underline font-medium"
                >
                  Open Cash Box <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Events App */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Events</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Tickets & bookings</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAppToggle('events')}
                  disabled={appsLoading}
                  className="flex-shrink-0"
                >
                  {isAppEnabled('events') ? (
                    <ToggleRight className="w-10 h-10 text-purple-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Browse events, buy tickets, and manage bookings
              </p>
              {isAppEnabled('events') && (
                <Link
                  to="/events"
                  className="inline-flex items-center text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium"
                >
                  Browse Events <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Cards App */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Cards</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Virtual & physical</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAppToggle('cards')}
                  disabled={appsLoading}
                  className="flex-shrink-0"
                >
                  {isAppEnabled('cards') ? (
                    <ToggleRight className="w-10 h-10 text-indigo-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Manage virtual and physical payment cards
              </p>
              {isAppEnabled('cards') && (
                <Link
                  to="/cards"
                  className="inline-flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  Manage Cards <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>

            {/* Fees App */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Fees</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">School finances</p>
                  </div>
                </div>
                <button
                  onClick={() => handleAppToggle('school_utilities')}
                  disabled={appsLoading}
                  className="flex-shrink-0"
                >
                  {isAppEnabled('school_utilities') ? (
                    <ToggleRight className="w-10 h-10 text-blue-500" />
                  ) : (
                    <ToggleLeft className="w-10 h-10 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                Manage your children's school fees, lunch, and transport
              </p>
              {isAppEnabled('school_utilities') && (
                <Link
                  to="/school-utilities"
                  className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  Open Fees <ChevronRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </motion.div>

        {/* Account & Preferences Section */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account & Preferences</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <SettingCard
              icon={CreditCard}
              iconBg="bg-indigo-100 dark:bg-indigo-900/30"
              iconColor="text-indigo-600 dark:text-indigo-400"
              title="Payment Preferences"
              description="Set default wallet and payment methods"
              onClick={() => setExpandedSection(expandedSection === 'payment' ? null : 'payment')}
            />

            <SettingCard
              icon={Landmark}
              iconBg="bg-emerald-100 dark:bg-emerald-900/30"
              iconColor="text-emerald-600 dark:text-emerald-400"
              title="Bank Accounts"
              description="Manage linked bank accounts"
              onClick={() => setExpandedSection(expandedSection === 'bank' ? null : 'bank')}
            />

            <SettingCard
              icon={Bell}
              iconBg="bg-blue-100 dark:bg-blue-900/30"
              iconColor="text-blue-600 dark:text-blue-400"
              title="Notifications"
              description="Push, email, and SMS preferences"
              onClick={() => setExpandedSection(expandedSection === 'notifications' ? null : 'notifications')}
            />

            <SettingCard
              icon={Palette}
              iconBg="bg-pink-100 dark:bg-pink-900/30"
              iconColor="text-pink-600 dark:text-pink-400"
              title="Theme & Colors"
              description="Customize your dashboard appearance"
              onClick={() => setExpandedSection(expandedSection === 'theme' ? null : 'theme')}
            />

            <SettingCard
              icon={Shield}
              iconBg="bg-red-100 dark:bg-red-900/30"
              iconColor="text-red-600 dark:text-red-400"
              title="Security"
              description="Password, PIN, and 2FA settings"
              href="/profile"
            />

            <SettingCard
              icon={User}
              iconBg="bg-gray-100 dark:bg-gray-700"
              iconColor="text-gray-600 dark:text-gray-400"
              title="Profile"
              description="Edit your personal information"
              href="/profile"
            />
          </div>
        </motion.div>

        {/* Expanded Sections */}
        {expandedSection === 'payment' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            variants={itemVariants}
          >
            <MotionCard className="p-6" glowEffect>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                    <CreditCard className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Payment Preferences</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Set your default wallet</p>
                  </div>
                </div>
                <button onClick={() => setExpandedSection(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
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
        )}

        {expandedSection === 'bank' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            variants={itemVariants}
          >
            <div className="relative">
              <button
                onClick={() => setExpandedSection(null)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
              >
                <X className="w-5 h-5" />
              </button>
              <BankAccountsSection />
            </div>
          </motion.div>
        )}

        {expandedSection === 'notifications' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            variants={itemVariants}
          >
            <MotionCard className="p-6" glowEffect>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Manage your notification preferences</p>
                  </div>
                </div>
                <button onClick={() => setExpandedSection(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <NotificationSettings />
            </MotionCard>
          </motion.div>
        )}

        {expandedSection === 'theme' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            variants={itemVariants}
          >
            <MotionCard className="p-6" glowEffect>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-lg">
                    <Palette className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">Color Theme</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Choose your preferred color theme</p>
                  </div>
                </div>
                <button onClick={() => setExpandedSection(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ThemeColorSelector type="user" />
            </MotionCard>
          </motion.div>
        )}

        {/* Upgrade Your Account Section */}
        <motion.div variants={itemVariants}>
          <div className="flex items-center gap-3 mb-4">
            <ArrowUpCircle className="w-5 h-5 text-gradient-to-r from-purple-600 to-orange-600" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Upgrade Your Account</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BecomeMerchantCard />
            <BecomeAgentCard />
          </div>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}
