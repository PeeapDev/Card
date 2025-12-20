/**
 * Float Overview Modal
 *
 * A large modal that displays float balances, deposits, payouts and activity.
 * Shows SystemFloatSidebar and MobileMoneyFloatCard side by side.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote, TrendingUp, Wallet, Activity } from 'lucide-react';
import { SystemFloatSidebar } from './SystemFloatSidebar';
import { MobileMoneyFloatCard } from './MobileMoneyFloatCard';

interface FloatOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFloat: () => void;
  onReplenishFloat: (currency: string) => void;
  onCloseFloat: (currency: string) => void;
  onViewHistory: (currency: string) => void;
  sidebarKey?: number;
}

export function FloatOverviewModal({
  isOpen,
  onClose,
  onOpenFloat,
  onReplenishFloat,
  onCloseFloat,
  onViewHistory,
  sidebarKey = 0,
}: FloatOverviewModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gradient-to-br from-gray-900/80 via-gray-900/70 to-emerald-900/50 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="relative bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-gray-200/50 dark:border-gray-700/50"
          >
            {/* Header with animated gradient */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-6 bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-600 text-white relative overflow-hidden">
              {/* Animated background shapes */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse" />
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
              </div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm shadow-lg">
                  <Banknote className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">Float & Earnings</h2>
                  <p className="text-sm text-emerald-100/90">Real-time balances, transactions & platform profit</p>
                </div>
              </div>

              <div className="flex items-center gap-3 relative z-10">
                <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Activity className="w-4 h-4 text-emerald-100" />
                  <span className="text-sm font-medium">Live</span>
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                </div>
                <button
                  onClick={onClose}
                  className="p-3 hover:bg-white/20 rounded-xl transition-all duration-200 hover:scale-105"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Content - Two columns with improved spacing */}
            <div className="overflow-y-auto max-h-[calc(95vh-100px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                {/* Left Column - System Float */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/30 dark:to-blue-900/30 border-b border-gray-200 dark:border-gray-700">
                    <Wallet className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">System Float</h3>
                  </div>
                  <SystemFloatSidebar
                    key={sidebarKey}
                    onOpenFloat={onOpenFloat}
                    onReplenishFloat={onReplenishFloat}
                    onCloseFloat={onCloseFloat}
                    onViewHistory={onViewHistory}
                  />
                </motion.div>

                {/* Right Column - Float Activity & Earnings */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white dark:bg-gray-800/50 rounded-2xl shadow-lg border border-gray-200/50 dark:border-gray-700/50 overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-5 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30 border-b border-gray-200 dark:border-gray-700">
                    <TrendingUp className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    <h3 className="font-semibold text-gray-900 dark:text-white">Activity & Earnings</h3>
                  </div>
                  <MobileMoneyFloatCard />
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
