/**
 * Theme Color Selector Component
 *
 * Allows users to choose their preferred color theme for cards and UI elements.
 */

import { Check, Palette } from 'lucide-react';
import { CardColorTheme, getThemeColors } from '@/components/ui/Card';
import { useThemeColor, themeDisplayNames } from '@/context/ThemeColorContext';
import { clsx } from 'clsx';

interface ThemeColorSelectorProps {
  type: 'user' | 'merchant';
  className?: string;
}

export function ThemeColorSelector({ type, className }: ThemeColorSelectorProps) {
  const {
    colorTheme,
    setColorTheme,
    merchantColorTheme,
    setMerchantColorTheme,
    availableThemes
  } = useThemeColor();

  const currentTheme = type === 'user' ? colorTheme : merchantColorTheme;
  const setTheme = type === 'user' ? setColorTheme : setMerchantColorTheme;

  return (
    <div className={className}>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
        {availableThemes.map((theme) => {
          const colors = getThemeColors(theme);
          const isSelected = currentTheme === theme;

          return (
            <button
              key={theme}
              onClick={() => setTheme(theme)}
              className={clsx(
                'relative flex flex-col items-center p-3 rounded-xl border-2 transition-all duration-200',
                isSelected
                  ? `${colors.cardBorder} ${colors.cardBg}`
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-800'
              )}
            >
              {/* Color Preview */}
              <div className={clsx('w-10 h-10 rounded-lg mb-2', colors.iconBg)}>
                <div className="w-full h-full flex items-center justify-center">
                  {isSelected ? (
                    <Check className={clsx('w-5 h-5', colors.iconColor)} />
                  ) : (
                    <div className={clsx('w-4 h-4 rounded-full', colors.iconColor.replace('text-', 'bg-'))} />
                  )}
                </div>
              </div>

              {/* Theme Name */}
              <span className={clsx(
                'text-xs font-medium',
                isSelected ? colors.textColor : 'text-gray-600 dark:text-gray-400'
              )}>
                {themeDisplayNames[theme]}
              </span>

              {/* Selected Indicator */}
              {isSelected && (
                <div className={clsx(
                  'absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center',
                  colors.badgeBg
                )}>
                  <Check className={clsx('w-3 h-3', colors.badgeText)} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Preview Card */}
      <div className="mt-6">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Preview:</p>
        <ThemePreviewCard theme={currentTheme} type={type} />
      </div>
    </div>
  );
}

// Preview card showing how the theme looks
function ThemePreviewCard({ theme, type }: { theme: CardColorTheme; type: 'user' | 'merchant' }) {
  const colors = getThemeColors(theme);

  const title = type === 'user' ? 'My Savings' : 'Subscriptions';
  const description = type === 'user'
    ? 'Track your savings goals and progress'
    : 'Create recurring billing plans and auto-charge customers';
  const action = type === 'user' ? 'View Savings' : 'Manage Plans';

  return (
    <div className={clsx(
      'p-4 rounded-lg border-2 transition-all duration-200',
      colors.cardBg,
      colors.cardBorder
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className={clsx('p-2 rounded-lg', colors.iconBg)}>
            <Palette className={clsx('w-5 h-5', colors.iconColor)} />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </div>
        <span className={clsx(
          'px-2 py-1 text-xs font-medium rounded-full',
          colors.badgeBg,
          colors.badgeText
        )}>
          Active
        </span>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{description}</p>
      <button className={clsx('text-sm font-medium', colors.linkColor)}>
        {action} →
      </button>
    </div>
  );
}

// Compact version for inline use
interface ThemeColorPickerProps {
  type: 'user' | 'merchant';
  size?: 'sm' | 'md';
  className?: string;
}

export function ThemeColorPicker({ type, size = 'md', className }: ThemeColorPickerProps) {
  const {
    colorTheme,
    setColorTheme,
    merchantColorTheme,
    setMerchantColorTheme,
    availableThemes
  } = useThemeColor();

  const currentTheme = type === 'user' ? colorTheme : merchantColorTheme;
  const setTheme = type === 'user' ? setColorTheme : setMerchantColorTheme;

  const sizeClasses = size === 'sm' ? 'w-6 h-6' : 'w-8 h-8';
  const gapClass = size === 'sm' ? 'gap-1' : 'gap-2';

  return (
    <div className={clsx('flex flex-wrap', gapClass, className)}>
      {availableThemes.map((theme) => {
        const colors = getThemeColors(theme);
        const isSelected = currentTheme === theme;

        return (
          <button
            key={theme}
            onClick={() => setTheme(theme)}
            title={themeDisplayNames[theme]}
            className={clsx(
              'rounded-full transition-all duration-200',
              sizeClasses,
              colors.iconBg,
              isSelected ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-900' : 'hover:scale-110',
              isSelected && colors.cardBorder.replace('border-', 'ring-')
            )}
          >
            {isSelected && (
              <Check className={clsx('w-full h-full p-1', colors.iconColor)} />
            )}
          </button>
        );
      })}
    </div>
  );
}
