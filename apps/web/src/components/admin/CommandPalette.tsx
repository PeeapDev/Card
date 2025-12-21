/**
 * Command Palette Component
 *
 * Global keyboard-driven navigation for admin dashboard.
 * Triggered with Cmd/Ctrl + P or /
 *
 * Features:
 * - Quick navigation to any page
 * - Quick actions (create user, view transactions, etc.)
 * - Recent items
 * - Fuzzy search
 */

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Command,
  ArrowRight,
  Users,
  CreditCard,
  ArrowLeftRight,
  Building2,
  Settings,
  BarChart3,
  Shield,
  Bell,
  Wallet,
  Store,
  FileText,
  HelpCircle,
  Plus,
  Eye,
  Download,
  RefreshCw,
  Ticket,
  Globe,
  Mail,
  Key,
  Layers,
  Clock,
  TrendingUp,
} from 'lucide-react';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: React.ReactNode;
  category: 'navigation' | 'action' | 'recent';
  shortcut?: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Define all available commands
  const allCommands: CommandItem[] = useMemo(() => [
    // Navigation
    { id: 'nav-dashboard', title: 'Dashboard', description: 'Go to admin dashboard', icon: <BarChart3 className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin') },
    { id: 'nav-users', title: 'Users', description: 'Manage all users', icon: <Users className="w-4 h-4" />, category: 'navigation', shortcut: 'U', action: () => navigate('/admin/users') },
    { id: 'nav-transactions', title: 'Transactions', description: 'View all transactions', icon: <ArrowLeftRight className="w-4 h-4" />, category: 'navigation', shortcut: 'T', action: () => navigate('/admin/transactions') },
    { id: 'nav-businesses', title: 'Businesses', description: 'Manage businesses', icon: <Building2 className="w-4 h-4" />, category: 'navigation', shortcut: 'B', action: () => navigate('/admin/businesses') },
    { id: 'nav-merchants', title: 'Merchants', description: 'Manage merchants', icon: <Store className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/merchants') },
    { id: 'nav-cards', title: 'Cards', description: 'Manage issued cards', icon: <CreditCard className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/cards') },
    { id: 'nav-deposits', title: 'Deposits', description: 'View deposits', icon: <Wallet className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/deposits') },
    { id: 'nav-disputes', title: 'Disputes', description: 'Handle disputes', icon: <Shield className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/disputes') },
    { id: 'nav-tickets', title: 'Support Tickets', description: 'Customer support', icon: <Ticket className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/support-tickets') },
    { id: 'nav-notifications', title: 'Notifications', description: 'Admin notifications', icon: <Bell className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/notifications') },
    { id: 'nav-analytics', title: 'Website Analytics', description: 'View site analytics', icon: <TrendingUp className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/website-analytics') },

    // Settings
    { id: 'nav-fees', title: 'Fees & Pricing', description: 'Configure transaction fees', icon: <Layers className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/fee-settings') },
    { id: 'nav-payment-settings', title: 'Payment Settings', description: 'Payment configuration', icon: <Settings className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/payment-settings') },
    { id: 'nav-smtp', title: 'SMTP Settings', description: 'Email configuration', icon: <Mail className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/smtp-settings') },
    { id: 'nav-sso', title: 'SSO Settings', description: 'Single sign-on', icon: <Key className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/sso-settings') },
    { id: 'nav-modules', title: 'Modules', description: 'Enable/disable features', icon: <Layers className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/modules') },
    { id: 'nav-webhooks', title: 'Webhooks', description: 'API webhooks', icon: <Globe className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/webhooks') },
    { id: 'nav-roles', title: 'Roles & Permissions', description: 'User roles', icon: <Shield className="w-4 h-4" />, category: 'navigation', action: () => navigate('/admin/roles') },

    // Quick Actions
    { id: 'action-create-user', title: 'Create New User', description: 'Add a new user account', icon: <Plus className="w-4 h-4" />, category: 'action', action: () => { navigate('/admin/users'); setTimeout(() => (document.querySelector('[data-action="create-user"]') as HTMLElement)?.click(), 100); } },
    { id: 'action-export-transactions', title: 'Export Transactions', description: 'Download transaction data', icon: <Download className="w-4 h-4" />, category: 'action', action: () => navigate('/admin/transactions') },
    { id: 'action-view-recent', title: 'View Recent Activity', description: 'Check recent system activity', icon: <Clock className="w-4 h-4" />, category: 'action', action: () => navigate('/admin') },
  ], [navigate]);

  // Filter commands based on query
  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      return allCommands.slice(0, 10);
    }

    const lowerQuery = query.toLowerCase();
    return allCommands.filter(cmd =>
      cmd.title.toLowerCase().includes(lowerQuery) ||
      cmd.description?.toLowerCase().includes(lowerQuery)
    ).slice(0, 10);
  }, [allCommands, query]);

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = [];
      }
      groups[cmd.category].push(cmd);
    });
    return groups;
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return Object.values(groupedCommands).flat();
  }, [groupedCommands]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, flatCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && flatCommands[selectedIndex]) {
      e.preventDefault();
      flatCommands[selectedIndex].action();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [flatCommands, selectedIndex, onClose]);

  // Reset selected index when filtered results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigate to',
    action: 'Quick Actions',
    recent: 'Recent',
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search commands, pages, or actions..."
              className="flex-1 bg-transparent border-none outline-none text-gray-900 dark:text-white placeholder-gray-400"
            />
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-2 py-1 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div className="max-h-[400px] overflow-y-auto p-2">
            {flatCommands.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No results found</p>
              </div>
            ) : (
              Object.entries(groupedCommands).map(([category, commands]) => (
                <div key={category} className="mb-2">
                  <div className="px-3 py-1.5 text-xs font-medium text-gray-400 uppercase tracking-wide">
                    {categoryLabels[category] || category}
                  </div>
                  {commands.map((cmd, cmdIndex) => {
                    const globalIndex = flatCommands.indexOf(cmd);
                    const isSelected = globalIndex === selectedIndex;

                    return (
                      <button
                        key={cmd.id}
                        onClick={() => {
                          cmd.action();
                          onClose();
                        }}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          isSelected
                            ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-primary-100 dark:bg-primary-900/50' : 'bg-gray-100 dark:bg-gray-800'}`}>
                          {cmd.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium">{cmd.title}</div>
                          {cmd.description && (
                            <div className="text-xs text-gray-500 dark:text-gray-400">{cmd.description}</div>
                          )}
                        </div>
                        {cmd.shortcut && (
                          <kbd className="px-2 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-800 rounded">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        <ArrowRight className={`w-4 h-4 ${isSelected ? 'text-primary-500' : 'text-gray-300'}`} />
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">↵</kbd>
                Select
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Command className="w-3 h-3" />
              <span>P to open</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to manage command palette state
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + P or Cmd/Ctrl + K
      if ((e.metaKey || e.ctrlKey) && (e.key === 'p' || e.key === 'k')) {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
