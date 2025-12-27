/**
 * App Setup Wizard
 *
 * Generic setup wizard that appears when a merchant enables an app for the first time.
 * Creates a dedicated wallet and configures the app.
 *
 * If the app was previously set up, shows the existing wallet instead of setup wizard.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Check,
  ArrowRight,
  Loader2,
  ShoppingCart,
  Calendar,
  Nfc,
  Truck,
  FileText,
  Link2,
  LucideIcon,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import { supabase } from '@/lib/supabase';

interface AppConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  color: string;
  walletName: string;
  features: string[];
  path: string;
}

const APP_CONFIGS: Record<string, AppConfig> = {
  terminal: {
    id: 'terminal',
    name: 'Payment Terminal',
    description: 'Accept contactless NFC payments from customers',
    icon: Nfc,
    color: 'indigo',
    walletName: 'Terminal Wallet',
    path: '/merchant/terminal',
    features: [
      'Accept NFC tap-to-pay',
      'Quick checkout experience',
      'Real-time transaction tracking',
      'Automatic receipt generation',
    ],
  },
  driver_wallet: {
    id: 'driver_wallet',
    name: 'Driver Wallet',
    description: 'Collect payments from drivers and manage daily settlements',
    icon: Wallet,
    color: 'teal',
    walletName: 'Driver Collections Wallet',
    path: '/merchant/driver-wallet',
    features: [
      'Collect from drivers',
      'Daily settlement reports',
      'Driver management',
      'Revenue tracking dashboard',
    ],
  },
  payment_links: {
    id: 'payment_links',
    name: 'Payment Links',
    description: 'Create shareable payment links to collect payments from anyone',
    icon: Link2,
    color: 'cyan',
    walletName: 'Payment Links Wallet',
    path: '/merchant/payment-links',
    features: [
      'Generate shareable links',
      'Custom payment amounts',
      'QR code generation',
      'Payment tracking & notifications',
    ],
  },
  invoices: {
    id: 'invoices',
    name: 'Invoices',
    description: 'Create and send professional invoices to your customers',
    icon: FileText,
    color: 'slate',
    walletName: 'Invoice Wallet',
    path: '/merchant/invoices',
    features: [
      'Professional invoice templates',
      'Automatic payment reminders',
      'Payment status tracking',
      'PDF export & email delivery',
    ],
  },
  pos: {
    id: 'pos',
    name: 'Point of Sale',
    description: 'Full POS system with inventory management and sales tracking',
    icon: ShoppingCart,
    color: 'green',
    walletName: 'POS Wallet',
    path: '/merchant/apps/pos',
    features: [
      'Product & inventory management',
      'Quick checkout interface',
      'Sales reports & analytics',
      'Offline mode support',
    ],
  },
  events: {
    id: 'events',
    name: 'Events',
    description: 'Create events, sell tickets, and manage event check-ins',
    icon: Calendar,
    color: 'purple',
    walletName: 'Events Wallet',
    path: '/merchant/apps/events',
    features: [
      'Event creation & management',
      'Ticket sales with QR codes',
      'Staff check-in app',
      'Real-time event analytics',
    ],
  },
  transportation: {
    id: 'transportation',
    name: 'Transportation',
    description: 'Manage transportation services with driver and passenger apps',
    icon: Truck,
    color: 'blue',
    walletName: 'Transportation Wallet',
    path: '/merchant/apps/transportation',
    features: [
      'Driver app integration',
      'Route & trip tracking',
      'Passenger payment collection',
      'Fleet management tools',
    ],
  },
};

interface AppSetupWizardProps {
  appId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingWallet?: {
    id: string;
    balance: number;
  } | null;
  wasSetupBefore?: boolean;
}

export function AppSetupWizard({ appId, isOpen, onClose, onComplete, existingWallet, wasSetupBefore }: AppSetupWizardProps) {
  const { user } = useAuth();
  const { completeAppSetup } = useApps();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdWalletId, setCreatedWalletId] = useState<string | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  const appConfig = APP_CONFIGS[appId];

  // If app was set up before, fetch existing wallet info
  useEffect(() => {
    if (wasSetupBefore && existingWallet) {
      setCreatedWalletId(existingWallet.id);
      setWalletBalance(existingWallet.balance);
    }
  }, [wasSetupBefore, existingWallet]);

  if (!appConfig) {
    return null;
  }

  const Icon = appConfig.icon;

  const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
    indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-200 dark:border-indigo-800' },
    teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-600 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800' },
    cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-600 dark:text-cyan-400', border: 'border-cyan-200 dark:border-cyan-800' },
    slate: { bg: 'bg-slate-100 dark:bg-slate-900/30', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-800' },
    green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
    purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800' },
    blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800' },
  };

  const colors = colorClasses[appConfig.color] || colorClasses.indigo;

  const handleCreateWallet = async () => {
    if (!user?.id) return;

    setIsCreating(true);
    setError(null);

    try {
      // Generate external_id for wallet
      const externalId = `APP_${appId.toUpperCase()}_${user.id.substring(0, 8)}_${Date.now()}`;

      // Create dedicated wallet for this app
      const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .insert({
          external_id: externalId,
          user_id: user.id,
          wallet_type: `app_${appId}`,
          name: appConfig.walletName,
          balance: 0,
          available_balance: 0,
          currency: 'SLE',
          status: 'active',
        })
        .select()
        .single();

      if (walletError) {
        // If wallet already exists, just use existing
        if (walletError.code === '23505') { // Unique constraint violation
          const { data: existingWallet } = await supabase
            .from('wallets')
            .select('id, balance')
            .eq('user_id', user.id)
            .eq('wallet_type', `app_${appId}`)
            .single();

          if (existingWallet) {
            setCreatedWalletId(existingWallet.id);
            setWalletBalance(Number(existingWallet.balance) || 0);
            setStep(2);
            return;
          }
        }
        throw walletError;
      }

      setCreatedWalletId(wallet.id);
      setWalletBalance(0);
      setStep(2);
    } catch (err) {
      console.error('Error creating wallet:', err);
      setError('Failed to create wallet. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCompleteSetup = async () => {
    setIsCreating(true);
    try {
      await completeAppSetup(appId, createdWalletId || undefined, {
        setup_date: new Date().toISOString(),
      });
      setStep(3);
      setTimeout(() => {
        onComplete();
        onClose();
      }, 2000);
    } catch (err) {
      console.error('Error completing setup:', err);
      setError('Failed to complete setup. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleReactivate = async () => {
    setIsCreating(true);
    try {
      // Just re-enable the app without creating new wallet
      await completeAppSetup(appId, existingWallet?.id, {
        reactivated_date: new Date().toISOString(),
      });
      onComplete();
      onClose();
    } catch (err) {
      console.error('Error reactivating app:', err);
      setError('Failed to reactivate. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGoToApp = () => {
    onClose();
    navigate(appConfig.path);
  };

  if (!isOpen) return null;

  // If app was previously set up, show reactivation screen
  if (wasSetupBefore && existingWallet) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <Card className="overflow-hidden">
              {/* Header */}
              <div className={`p-6 ${colors.bg} border-b ${colors.border}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors.bg} border-2 ${colors.border}`}>
                    <Icon className={`w-7 h-7 ${colors.text}`} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                      Welcome Back to {appConfig.name}
                    </h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Your previous setup is still available
                    </p>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Wallet className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Your {appConfig.walletName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Your wallet and all previous data are intact
                  </p>
                </div>

                {/* Wallet Card */}
                <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                        <Wallet className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{appConfig.walletName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Balance: SLE {existingWallet.balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleReactivate}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    {isCreating ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Reactivate'
                    )}
                  </Button>
                  <Button
                    onClick={() => {
                      handleReactivate().then(() => {
                        navigate(appConfig.path);
                      });
                    }}
                    disabled={isCreating}
                    className="flex-1"
                  >
                    Go to {appConfig.name}
                    <ExternalLink className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // First-time setup wizard
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          className="w-full max-w-lg"
        >
          <Card className="overflow-hidden">
            {/* Header - No X button, must complete setup */}
            <div className={`p-6 ${colors.bg} border-b ${colors.border}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${colors.bg} border-2 ${colors.border}`}>
                  <Icon className={`w-7 h-7 ${colors.text}`} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                    Set Up {appConfig.name}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {appConfig.description}
                  </p>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-2 mt-6">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className={`flex-1 h-1.5 rounded-full transition-colors ${
                      s <= step ? colors.text.replace('text-', 'bg-') : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {step === 1 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className={`w-16 h-16 ${colors.bg} rounded-2xl flex items-center justify-center mx-auto mb-4`}>
                      <Wallet className={`w-8 h-8 ${colors.text}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Create {appConfig.walletName}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      We'll create a dedicated wallet for all {appConfig.name.toLowerCase()} transactions.
                      This keeps your finances organized and easy to track.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      What you'll get
                    </p>
                    <ul className="space-y-2">
                      {appConfig.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                          <Check className={`w-4 h-4 ${colors.text} flex-shrink-0`} />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleCreateWallet}
                    disabled={isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating Wallet...
                      </>
                    ) : (
                      <>
                        Create Wallet & Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="space-y-6"
                >
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      Wallet Created Successfully!
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Your {appConfig.walletName} is ready. Complete the setup to start using {appConfig.name}.
                    </p>
                  </div>

                  <div className={`p-4 rounded-xl border ${colors.border} ${colors.bg}`}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm">
                        <Wallet className={`w-6 h-6 ${colors.text}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{appConfig.walletName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Balance: SLE 0.00</p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    onClick={handleCompleteSetup}
                    disabled={isCreating}
                    className="w-full"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Completing Setup...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    You're All Set!
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    {appConfig.name} is now active and ready to use.
                  </p>
                </motion.div>
              )}
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default AppSetupWizard;
