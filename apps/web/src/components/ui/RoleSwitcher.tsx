/**
 * Role Switcher Component
 *
 * Dropdown component that allows users with multiple roles to switch between
 * their available dashboards (User, Merchant, Agent, etc.)
 *
 * Only renders if user has 2+ roles.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Store,
  Headphones,
  Shield,
  Code,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import type { UserRole } from '@/types';
import { clsx } from 'clsx';

// Role configuration with icons, labels, and colors
const ROLE_CONFIG: Record<UserRole, {
  icon: typeof User;
  label: string;
  color: string;
  bgColor: string;
}> = {
  user: {
    icon: User,
    label: 'Personal',
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  merchant: {
    icon: Store,
    label: 'Merchant',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  agent: {
    icon: Headphones,
    label: 'Agent',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  admin: {
    icon: Shield,
    label: 'Admin',
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  superadmin: {
    icon: Shield,
    label: 'Super Admin',
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  developer: {
    icon: Code,
    label: 'Developer',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-900/30',
  },
};

interface RoleSwitcherProps {
  className?: string;
  compact?: boolean;
}

export function RoleSwitcher({ className, compact = false }: RoleSwitcherProps) {
  const navigate = useNavigate();
  const { availableRoles, activeRole, switchRole, getRoleDashboard } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Don't render if user has only one role
  if (availableRoles.length <= 1) {
    return null;
  }

  const currentConfig = ROLE_CONFIG[activeRole];
  const CurrentIcon = currentConfig.icon;

  const handleRoleSwitch = (role: UserRole) => {
    switchRole(role);
    setIsOpen(false);
    // Navigate to the role's dashboard
    navigate(getRoleDashboard(role));
  };

  return (
    <div ref={dropdownRef} className={clsx('relative', className)}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
          'border border-gray-200 dark:border-gray-700',
          'hover:bg-gray-50 dark:hover:bg-gray-800',
          'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
          isOpen && 'bg-gray-50 dark:bg-gray-800'
        )}
      >
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', currentConfig.bgColor)}>
          <CurrentIcon className={clsx('w-4 h-4', currentConfig.color)} />
        </div>
        {!compact && (
          <>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              {currentConfig.label}
            </span>
            <ChevronDown
              className={clsx(
                'w-4 h-4 text-gray-400 transition-transform',
                isOpen && 'rotate-180'
              )}
            />
          </>
        )}
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={clsx(
              'absolute right-0 top-full mt-2 z-50',
              'min-w-[200px] py-2',
              'bg-white dark:bg-gray-800 rounded-xl shadow-lg',
              'border border-gray-200 dark:border-gray-700'
            )}
          >
            <div className="px-3 py-2 border-b border-gray-100 dark:border-gray-700">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Switch Account
              </p>
            </div>

            <div className="py-1">
              {availableRoles.map((role) => {
                const config = ROLE_CONFIG[role];
                const Icon = config.icon;
                const isActive = role === activeRole;

                return (
                  <button
                    key={role}
                    onClick={() => handleRoleSwitch(role)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 text-left',
                      'transition-colors',
                      isActive
                        ? 'bg-primary-50 dark:bg-primary-900/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    )}
                  >
                    <div className={clsx('w-9 h-9 rounded-lg flex items-center justify-center', config.bgColor)}>
                      <Icon className={clsx('w-5 h-5', config.color)} />
                    </div>
                    <div className="flex-1">
                      <p className={clsx(
                        'text-sm font-medium',
                        isActive
                          ? 'text-primary-700 dark:text-primary-300'
                          : 'text-gray-700 dark:text-gray-200'
                      )}>
                        {config.label}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {role === 'user' && 'Personal account'}
                        {role === 'merchant' && 'Business dashboard'}
                        {role === 'agent' && 'Agent dashboard'}
                        {role === 'admin' && 'Admin panel'}
                        {role === 'superadmin' && 'Full access'}
                        {role === 'developer' && 'API & integrations'}
                      </p>
                    </div>
                    {isActive && (
                      <Check className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default RoleSwitcher;
