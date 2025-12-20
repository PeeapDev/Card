/**
 * Quick Actions Floater Component
 *
 * Floating action button (FAB) that expands to show quick actions.
 * Positioned at bottom-right corner of the screen.
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  X,
  Users,
  Building2,
  CreditCard,
  ArrowLeftRight,
  Bell,
  Settings,
  RefreshCw,
  Command,
  ChevronUp,
} from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  color?: string;
}

interface QuickActionsFloaterProps {
  onOpenCommandPalette?: () => void;
}

export function QuickActionsFloater({ onOpenCommandPalette }: QuickActionsFloaterProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Handle scroll to show "back to top" button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close menu when navigating
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Context-aware quick actions based on current page
  const getQuickActions = (): QuickAction[] => {
    const baseActions: QuickAction[] = [
      {
        id: 'command',
        label: 'Command Palette',
        icon: <Command className="w-4 h-4" />,
        onClick: () => {
          setIsOpen(false);
          onOpenCommandPalette?.();
        },
        color: 'bg-purple-500',
      },
      {
        id: 'create-user',
        label: 'Create User',
        icon: <Users className="w-4 h-4" />,
        onClick: () => navigate('/admin/users'),
        color: 'bg-blue-500',
      },
      {
        id: 'view-transactions',
        label: 'View Transactions',
        icon: <ArrowLeftRight className="w-4 h-4" />,
        onClick: () => navigate('/admin/transactions'),
        color: 'bg-green-500',
      },
      {
        id: 'businesses',
        label: 'Businesses',
        icon: <Building2 className="w-4 h-4" />,
        onClick: () => navigate('/admin/businesses'),
        color: 'bg-orange-500',
      },
      {
        id: 'settings',
        label: 'Settings',
        icon: <Settings className="w-4 h-4" />,
        onClick: () => navigate('/admin/payment-settings'),
        color: 'bg-gray-500',
      },
    ];

    // Add page-specific actions
    if (location.pathname.includes('/admin/users')) {
      return [
        {
          id: 'refresh',
          label: 'Refresh Users',
          icon: <RefreshCw className="w-4 h-4" />,
          onClick: () => window.location.reload(),
          color: 'bg-cyan-500',
        },
        ...baseActions.filter(a => a.id !== 'create-user'),
      ];
    }

    return baseActions;
  };

  const quickActions = getQuickActions();

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
      {/* Scroll to top button */}
      <AnimatePresence>
        {showScrollTop && !isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="w-10 h-10 bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
          >
            <ChevronUp className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Quick Actions Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="flex flex-col gap-2 mb-2"
          >
            {quickActions.map((action, index) => (
              <motion.button
                key={action.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={action.onClick}
                className="flex items-center gap-3 pl-4 pr-3 py-2 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all group"
              >
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {action.label}
                </span>
                <div className={`w-8 h-8 ${action.color || 'bg-primary-500'} rounded-full flex items-center justify-center text-white`}>
                  {action.icon}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main FAB Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-primary-600 hover:bg-primary-700'
        }`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>

      {/* Keyboard hint */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute -top-8 right-0 flex items-center gap-1 text-xs text-gray-400"
          >
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[10px]">
              Cmd+P
            </kbd>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
