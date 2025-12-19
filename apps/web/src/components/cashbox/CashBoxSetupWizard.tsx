/**
 * Cash Box Setup Wizard
 *
 * A fun, engaging 6-step wizard that educates users about Cash Box
 * and configures auto-deposit and PIN lock settings.
 *
 * Steps:
 * 1. Welcome - Meet your Cash Box
 * 2. Add Money - Learn about deposits
 * 3. Lock It Up - Learn about locking
 * 4. Auto-Save - Configure auto-deposit
 * 5. Security - PIN lock option
 * 6. Ready - Completion with celebration
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Lock,
  Calendar,
  Sparkles,
  Check,
  Loader2,
  Wallet,
  Clock,
  PiggyBank,
  Shield,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useUserApps } from '@/context/UserAppsContext';
import { useWallets } from '@/hooks/useWallets';
import type { CashBoxSetupData } from '@/services/userSettings.service';
import confetti from 'canvas-confetti';

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <motion.div
          key={index}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            index === currentStep
              ? 'bg-primary-600 scale-125'
              : index < currentStep
              ? 'bg-primary-400'
              : 'bg-gray-300'
          }`}
          initial={{ scale: 0.8 }}
          animate={{ scale: index === currentStep ? 1.25 : 1 }}
        />
      ))}
    </div>
  );
}

// Floating animation for the cash box
function FloatingCashBox({ showSparkles = false }: { showSparkles?: boolean }) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        <img
          src="/images/cashbox-wooden.png"
          alt="Wooden Cash Box"
          className="w-48 h-48 object-contain mx-auto drop-shadow-2xl"
        />
        {showSparkles && (
          <>
            <motion.div
              className="absolute -top-4 -right-4 text-yellow-400"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Sparkles className="w-8 h-8" />
            </motion.div>
            <motion.div
              className="absolute -bottom-2 -left-4 text-yellow-400"
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
            <motion.div
              className="absolute top-1/2 -right-8 text-yellow-400"
              animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity, delay: 1 }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// Coin drop animation
function CoinDropAnimation() {
  return (
    <div className="relative h-48 flex items-center justify-center">
      <FloatingCashBox />
      {/* Animated coins */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute text-yellow-500"
          initial={{ y: -60, x: -20 + i * 20, opacity: 0, scale: 0.5 }}
          animate={{
            y: [null, 20],
            opacity: [0, 1, 1, 0],
            scale: [0.5, 1, 1, 0.8],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeIn',
          }}
        >
          <div className="w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-700 font-bold text-sm shadow-lg">
            $
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// Lock animation
function LockAnimation() {
  return (
    <div className="relative h-48 flex items-center justify-center">
      <FloatingCashBox />
      {/* Padlock overlay */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <div className="bg-amber-100 rounded-full p-4 shadow-lg">
          <Lock className="w-12 h-12 text-amber-600" />
        </div>
      </motion.div>
      {/* Timer animation */}
      <motion.div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white px-3 py-1 rounded-full shadow-md"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
      >
        <Clock className="w-4 h-4 text-gray-500" />
        <span className="text-sm font-medium text-gray-700">30 days</span>
      </motion.div>
    </div>
  );
}

// Calendar/Auto-save animation
function AutoSaveAnimation() {
  return (
    <div className="relative h-32 flex items-center justify-center">
      <motion.div
        className="flex items-center gap-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="bg-blue-100 rounded-xl p-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Calendar className="w-12 h-12 text-blue-600" />
        </motion.div>
        <motion.div
          className="flex items-center gap-2"
          animate={{ x: [0, 10, 0] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <ArrowRight className="w-6 h-6 text-gray-400" />
        </motion.div>
        <motion.div
          className="bg-green-100 rounded-xl p-4"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        >
          <PiggyBank className="w-12 h-12 text-green-600" />
        </motion.div>
      </motion.div>
    </div>
  );
}

export function CashBoxSetupWizard() {
  const navigate = useNavigate();
  const { completeCashBoxSetup } = useUserApps();
  const { data: wallets } = useWallets();

  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);

  // Auto-deposit settings
  const [autoDepositEnabled, setAutoDepositEnabled] = useState(false);
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [amount, setAmount] = useState<string>('100');
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>('monthly');

  // PIN Lock settings
  const [pinLockEnabled, setPinLockEnabled] = useState(false);
  const [pinCode, setPinCode] = useState<string>('');
  const [confirmPinCode, setConfirmPinCode] = useState<string>('');
  const [showPin, setShowPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // Set default wallet when wallets load
  useEffect(() => {
    if (wallets && wallets.length > 0 && !selectedWalletId) {
      setSelectedWalletId(wallets[0].id);
    }
  }, [wallets, selectedWalletId]);

  const totalSteps = 6;

  const handleNext = () => {
    // Validate PIN on step 5 (index 4)
    if (currentStep === 4 && pinLockEnabled) {
      if (pinCode.length !== 4) {
        setPinError('PIN must be 4 digits');
        return;
      }
      if (pinCode !== confirmPinCode) {
        setPinError('PINs do not match');
        return;
      }
      setPinError(null);
    }

    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#4F46E5', '#10B981', '#F59E0B'],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#4F46E5', '#10B981', '#F59E0B'],
      });
    }, 100);
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      // Simple hash for PIN (in production, use proper hashing)
      const pinHash = pinLockEnabled && pinCode ? btoa(pinCode) : null;

      const setupData: CashBoxSetupData = {
        auto_deposit_enabled: autoDepositEnabled,
        auto_deposit_wallet_id: autoDepositEnabled ? selectedWalletId : null,
        auto_deposit_amount: autoDepositEnabled ? parseFloat(amount) || null : null,
        auto_deposit_frequency: frequency,
        pin_lock_enabled: pinLockEnabled,
        pin_hash: pinHash,
      };

      await completeCashBoxSetup(setupData);

      // Trigger confetti
      triggerConfetti();
    } catch (error) {
      console.error('Error completing setup:', error);
    } finally {
      setIsCompleting(false);
    }
  };

  // When reaching step 6 (Ready), trigger confetti
  useEffect(() => {
    if (currentStep === 5) {
      triggerConfetti();
    }
  }, [currentStep]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const activeWallets = wallets?.filter(w => w.status === 'ACTIVE') || [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        <div className="p-8">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <FloatingCashBox showSparkles />
                <h2 className="text-2xl font-bold text-gray-900 mt-6">
                  Your Personal Savings Vault
                </h2>
                <p className="text-gray-600 mt-3">
                  Lock away money and watch your savings grow. Your Cash Box keeps your money safe until you need it.
                </p>
              </motion.div>
            )}

            {/* Step 2: Add Money */}
            {currentStep === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <CoinDropAnimation />
                <h2 className="text-2xl font-bold text-gray-900 mt-6">
                  Drop Money Into Your Box
                </h2>
                <p className="text-gray-600 mt-3">
                  Transfer from any of your wallets anytime. Add money whenever you want to save.
                </p>
                <div className="mt-6 p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-green-700">
                    Tip: Start small and build your savings habit!
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step 3: Lock It Up */}
            {currentStep === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <LockAnimation />
                <h2 className="text-2xl font-bold text-gray-900 mt-6">
                  Lock Your Savings
                </h2>
                <p className="text-gray-600 mt-3">
                  Choose how long to lock your money: 7 days, 30 days, 90 days, or even a year.
                </p>
                <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800 text-left">
                      <strong>Important:</strong> Once locked, NO ONE can access your money - not even you! Your savings stay 100% safe until the timer ends.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Auto-Save */}
            {currentStep === 3 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <AutoSaveAnimation />
                <h2 className="text-2xl font-bold text-gray-900 mt-6 text-center">
                  Set & Forget Savings
                </h2>
                <p className="text-gray-600 mt-3 text-center">
                  Automatically save without thinking about it. Set up auto-deposit now or skip for later.
                </p>

                {/* Auto-deposit toggle */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Enable Auto-Deposit</span>
                    <button
                      onClick={() => setAutoDepositEnabled(!autoDepositEnabled)}
                      className={`relative w-14 h-7 rounded-full transition-colors ${
                        autoDepositEnabled ? 'bg-primary-600' : 'bg-gray-300'
                      }`}
                    >
                      <motion.div
                        className="absolute top-1 w-5 h-5 bg-white rounded-full shadow"
                        animate={{ x: autoDepositEnabled ? 28 : 4 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>

                  {autoDepositEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4"
                    >
                      {/* Source Wallet */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Source Wallet
                        </label>
                        <div className="relative">
                          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                          <select
                            value={selectedWalletId}
                            onChange={(e) => setSelectedWalletId(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                          >
                            {activeWallets.map((wallet) => (
                              <option key={wallet.id} value={wallet.id}>
                                {wallet.currency} Wallet - {formatCurrency(wallet.balance)}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Amount */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Amount per deposit
                        </label>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          min="1"
                          step="0.01"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
                          placeholder="100.00"
                        />
                      </div>

                      {/* Frequency */}
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                          Frequency
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['daily', 'weekly', 'monthly'] as const).map((freq) => (
                            <button
                              key={freq}
                              onClick={() => setFrequency(freq)}
                              className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                                frequency === freq
                                  ? 'bg-primary-600 text-white'
                                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              }`}
                            >
                              {freq.charAt(0).toUpperCase() + freq.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 5: Security / PIN Lock */}
            {currentStep === 4 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Shield className="w-10 h-10 text-orange-600" />
                </motion.div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Secure Your Cash Box
                </h2>
                <p className="text-gray-600">
                  Add an extra layer of protection with a PIN code
                </p>

                <div className="mt-8 max-w-sm mx-auto">
                  {/* PIN Lock Toggle */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-4">
                    <div className="flex items-center gap-3">
                      <KeyRound className="w-5 h-5 text-orange-600" />
                      <div className="text-left">
                        <p className="font-medium text-gray-900">PIN Lock</p>
                        <p className="text-xs text-gray-500">Require PIN to unlock Cash Box</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPinLockEnabled(!pinLockEnabled);
                        if (!pinLockEnabled) {
                          setPinCode('');
                          setConfirmPinCode('');
                          setPinError(null);
                        }
                      }}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        pinLockEnabled ? 'bg-orange-600' : 'bg-gray-300'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          pinLockEnabled ? 'translate-x-7' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* PIN Input Fields */}
                  {pinLockEnabled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                    >
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <p className="text-sm text-orange-800">
                          Your PIN will be required every time you want to unlock your Cash Box
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-left">
                          Create 4-digit PIN
                        </label>
                        <div className="relative">
                          <input
                            type={showPin ? 'text' : 'password'}
                            value={pinCode}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setPinCode(value);
                              setPinError(null);
                            }}
                            placeholder="••••"
                            maxLength={4}
                            inputMode="numeric"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPin(!showPin)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-left">
                          Confirm PIN
                        </label>
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={confirmPinCode}
                          onChange={(e) => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                            setConfirmPinCode(value);
                            setPinError(null);
                          }}
                          placeholder="••••"
                          maxLength={4}
                          inputMode="numeric"
                          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        />
                      </div>

                      {pinError && (
                        <p className="text-sm text-red-600 text-left">{pinError}</p>
                      )}
                    </motion.div>
                  )}

                  {!pinLockEnabled && (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                      <p className="text-sm text-gray-600">
                        Without PIN lock, your Cash Box will open immediately when time is up
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 6: Ready */}
            {currentStep === 5 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <div className="relative">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', delay: 0.2 }}
                    className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
                  >
                    <Check className="w-12 h-12 text-green-600" />
                  </motion.div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900">
                  You're All Set!
                </h2>
                <p className="text-gray-600 mt-3">
                  Your Cash Box is ready. Start saving towards your goals today!
                </p>

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-xl text-left">
                  <h3 className="font-semibold text-gray-900 mb-3">Your Setup Summary</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Auto-deposit:</span>
                      <span className="font-medium text-gray-900">
                        {autoDepositEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    {autoDepositEnabled && (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Amount:</span>
                          <span className="font-medium text-gray-900">
                            {formatCurrency(parseFloat(amount) || 0)} / {frequency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">From:</span>
                          <span className="font-medium text-gray-900">
                            {activeWallets.find(w => w.id === selectedWalletId)?.currency || 'Selected'} Wallet
                          </span>
                        </div>
                      </>
                    )}
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600">PIN Lock:</span>
                      <span className="font-medium text-gray-900">
                        {pinLockEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Complete and Go to Cash Box */}
                <div className="mt-8 space-y-3">
                  <button
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCompleting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Complete Setup
                      </>
                    )}
                  </button>

                  <Link
                    to="/pots"
                    className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors"
                  >
                    Take me to Cash Box
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation buttons - Hide on final step */}
          {currentStep < 5 && (
            <div className="flex items-center justify-between mt-8">
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
              >
                {currentStep === 0 ? 'Get Started' : 'Next'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default CashBoxSetupWizard;
