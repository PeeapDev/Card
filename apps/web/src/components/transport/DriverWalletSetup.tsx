/**
 * Driver Wallet Setup Wizard
 *
 * Shows wallet creation process for drivers using Collect Payment
 * This is shown before they can start collecting payments
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Shield,
  Zap,
  ChevronRight,
  CheckCircle,
  Loader2,
  CreditCard,
  Banknote,
  ArrowLeft,
} from 'lucide-react';
import { walletService, ExtendedWallet } from '@/services/wallet.service';
import { clsx } from 'clsx';

interface DriverWalletSetupProps {
  userId: string;
  userName?: string;
  onComplete: (wallet: ExtendedWallet) => void;
  onBack?: () => void;
}

type SetupStep = 'intro' | 'creating' | 'success';

export function DriverWalletSetup({ userId, userName, onComplete, onBack }: DriverWalletSetupProps) {
  const [step, setStep] = useState<SetupStep>('intro');
  const [error, setError] = useState('');

  const handleCreateWallet = async () => {
    setStep('creating');
    setError('');

    try {
      // Create driver wallet
      const wallet = await walletService.createWallet(userId, {
        walletType: 'driver',
        currency: 'SLE',
        name: 'Driver Collection Wallet',
        dailyLimit: 10000000, // 10 million SLE
        monthlyLimit: 100000000, // 100 million SLE
      });

      setStep('success');

      // Wait briefly then complete
      setTimeout(() => {
        onComplete(wallet);
      }, 1500);
    } catch (err: any) {
      console.error('Error creating driver wallet:', err);
      setError(err.message || 'Failed to create wallet');
      setStep('intro');
    }
  };

  // Features list for intro screen
  const features = [
    {
      icon: <Zap className="w-5 h-5" />,
      title: 'Instant Payments',
      description: 'Receive payments instantly from customers',
    },
    {
      icon: <Shield className="w-5 h-5" />,
      title: 'Secure & Protected',
      description: 'Your money is safe with bank-level security',
    },
    {
      icon: <Banknote className="w-5 h-5" />,
      title: 'Easy Withdrawals',
      description: 'Transfer to bank or mobile money anytime',
    },
  ];

  return (
    <div className="h-full bg-gray-900 text-white flex flex-col">
      <AnimatePresence mode="wait">
        {/* Intro Screen */}
        {step === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center p-4 border-b border-gray-800">
              {onBack && (
                <button
                  onClick={onBack}
                  className="p-2 rounded-full hover:bg-gray-800 transition-colors mr-2"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-400" />
                </button>
              )}
              <div className="flex-1 text-center">
                <p className="text-sm font-medium">Wallet Setup</p>
              </div>
              <div className="w-9" />
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-primary-600 rounded-full flex items-center justify-center mb-6"
                style={{
                  boxShadow: '0 0 40px rgba(34, 211, 238, 0.3)',
                }}
              >
                <Wallet className="w-10 h-10 text-white" />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center mb-8"
              >
                <h2 className="text-2xl font-bold mb-2">
                  {userName ? `Hey ${userName}!` : 'Welcome!'}
                </h2>
                <p className="text-gray-400 text-sm">
                  Create your Driver Wallet to start collecting payments from customers
                </p>
              </motion.div>

              {/* Features */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="w-full space-y-3 mb-8"
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.1 }}
                    className="flex items-center gap-4 p-3 bg-gray-800/50 rounded-xl"
                  >
                    <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{feature.title}</p>
                      <p className="text-gray-500 text-xs">{feature.description}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full p-3 bg-red-500/20 border border-red-500/50 rounded-xl mb-4 text-red-400 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </div>

            {/* Action Button */}
            <div className="p-4 border-t border-gray-800">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateWallet}
                className="w-full py-4 bg-cyan-500 text-black rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors"
                style={{
                  boxShadow: '0 0 20px rgba(34, 211, 238, 0.4), 0 0 40px rgba(34, 211, 238, 0.2)',
                }}
              >
                Create Driver Wallet
                <ChevronRight className="w-5 h-5" />
              </motion.button>
              <p className="text-center text-gray-500 text-xs mt-3">
                By creating a wallet, you agree to our Terms of Service
              </p>
            </div>
          </motion.div>
        )}

        {/* Creating Screen */}
        {step === 'creating' && (
          <motion.div
            key="creating"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6"
          >
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              }}
              className="w-20 h-20 bg-cyan-500/20 rounded-full flex items-center justify-center mb-6"
            >
              <Wallet className="w-10 h-10 text-cyan-400" />
            </motion.div>

            <div className="flex items-center gap-3 mb-4">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <p className="text-lg font-medium">Creating your wallet...</p>
            </div>

            <p className="text-gray-500 text-sm text-center">
              Setting up your secure driver wallet
            </p>
          </motion.div>
        )}

        {/* Success Screen */}
        {step === 'success' && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-b from-green-600/20 to-gray-900"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
              className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6"
            >
              <CheckCircle className="w-14 h-14 text-white" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <h2 className="text-2xl font-bold text-white mb-2">Wallet Created!</h2>
              <p className="text-green-300 text-sm">
                Your driver wallet is ready. You can now start collecting payments.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
