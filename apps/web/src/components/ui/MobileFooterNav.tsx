/**
 * Mobile Footer Navigation
 *
 * Fixed bottom navigation for mobile devices with quick access to
 * key features including scan-to-pay functionality.
 */

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Home,
  Wallet,
  QrCode,
  ArrowLeftRight,
  User,
  Store,
  LayoutDashboard,
  CreditCard,
  Settings,
} from 'lucide-react';
import { ScanToPayModal } from '@/components/payment/ScanToPayModal';

interface NavItem {
  path: string;
  label: string;
  icon: React.ElementType;
}

interface MobileFooterNavProps {
  mode: 'user' | 'merchant';
}

export function MobileFooterNav({ mode }: MobileFooterNavProps) {
  const location = useLocation();
  const [scanModalOpen, setScanModalOpen] = useState(false);

  const userNavItems: NavItem[] = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/wallets', label: 'Wallets', icon: Wallet },
    { path: '/transactions', label: 'History', icon: ArrowLeftRight },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const merchantNavItems: NavItem[] = [
    { path: '/merchant', label: 'Home', icon: LayoutDashboard },
    { path: '/merchant/transactions', label: 'Sales', icon: ArrowLeftRight },
    { path: '/merchant/payment-terminal', label: 'Terminal', icon: CreditCard },
    { path: '/merchant/settings', label: 'Settings', icon: Settings },
  ];

  const navItems = mode === 'user' ? userNavItems : merchantNavItems;

  const isActive = (path: string) => {
    if (path === '/dashboard' || path === '/merchant') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <>
      {/* Footer Navigation - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 md:hidden z-50 safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-2">
          {/* First two nav items */}
          {navItems.slice(0, 2).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}

          {/* Center Scan Button */}
          <button
            onClick={() => setScanModalOpen(true)}
            className="relative -mt-6 flex flex-col items-center justify-center"
          >
            <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-primary-500/30">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] mt-1 font-medium text-primary-600 dark:text-primary-400">Scan</span>
          </button>

          {/* Last two nav items */}
          {navItems.slice(2, 4).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={clsx(
                  'flex flex-col items-center justify-center flex-1 h-full transition-colors',
                  active
                    ? 'text-primary-600 dark:text-primary-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Scan to Pay Modal */}
      <ScanToPayModal
        isOpen={scanModalOpen}
        onClose={() => setScanModalOpen(false)}
      />

      {/* Spacer for content so it doesn't get hidden behind footer */}
      <div className="h-16 md:hidden" />
    </>
  );
}
