/**
 * Float Overview Modal
 *
 * A large modal that displays float balances, deposits, payouts and activity.
 * Shows SystemFloatSidebar and MobileMoneyFloatCard side by side.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { X, Banknote } from 'lucide-react';
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
        <div className="flex min-h-full items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between p-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 rounded-xl">
                  <Banknote className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">System Float Management</h2>
                  <p className="text-sm text-emerald-100">Monitor balances, deposits, payouts and activity</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content - Two columns */}
            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200 dark:divide-gray-700">
                {/* Left Column - System Float */}
                <div className="p-0">
                  <SystemFloatSidebar
                    key={sidebarKey}
                    onOpenFloat={onOpenFloat}
                    onReplenishFloat={onReplenishFloat}
                    onCloseFloat={onCloseFloat}
                    onViewHistory={onViewHistory}
                  />
                </div>

                {/* Right Column - Float Activity */}
                <div className="p-0">
                  <MobileMoneyFloatCard />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
}
