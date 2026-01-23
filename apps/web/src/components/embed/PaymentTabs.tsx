/**
 * Payment Method Tabs
 *
 * Tab navigation for selecting payment method in embedded checkout
 */

import { QrCode, CreditCard, Smartphone } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PaymentMethod = 'qr' | 'card' | 'orange';

interface PaymentTabsProps {
  selectedMethod: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  enabledMethods?: {
    qr?: boolean;
    card?: boolean;
    orange?: boolean;
  };
}

const TABS = [
  { id: 'qr' as const, label: 'Scan to Pay', icon: QrCode },
  { id: 'card' as const, label: 'Peeap Card', icon: CreditCard },
  { id: 'orange' as const, label: 'Orange Money', icon: Smartphone },
];

export function PaymentTabs({
  selectedMethod,
  onMethodChange,
  enabledMethods = { qr: true, card: true, orange: true },
}: PaymentTabsProps) {
  const availableTabs = TABS.filter(tab => enabledMethods[tab.id] !== false);

  return (
    <div className="border-b border-gray-200">
      <nav className="flex" aria-label="Payment methods">
        {availableTabs.map((tab) => {
          const Icon = tab.icon;
          const isSelected = selectedMethod === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onMethodChange(tab.id)}
              className={cn(
                'flex-1 flex flex-col items-center gap-1 py-3 px-2 text-sm font-medium transition-colors',
                'border-b-2 -mb-px',
                isSelected
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              )}
              aria-selected={isSelected}
              role="tab"
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
