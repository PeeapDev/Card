import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { clsx } from 'clsx';

interface ThemeToggleProps {
  variant?: 'icon' | 'dropdown';
  className?: string;
}

export function ThemeToggle({ variant = 'icon', className }: ThemeToggleProps) {
  const { theme, setTheme, isDark, toggleTheme } = useTheme();

  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={clsx(
          'p-2 rounded-lg transition-colors',
          'hover:bg-gray-100 dark:hover:bg-gray-800',
          'text-gray-600 dark:text-gray-400',
          className
        )}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {isDark ? (
          <Sun className="w-5 h-5" />
        ) : (
          <Moon className="w-5 h-5" />
        )}
      </button>
    );
  }

  return (
    <div className={clsx('flex items-center gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg', className)}>
      <button
        onClick={() => setTheme('light')}
        className={clsx(
          'p-2 rounded-md transition-colors',
          theme === 'light'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        )}
        aria-label="Light mode"
      >
        <Sun className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('dark')}
        className={clsx(
          'p-2 rounded-md transition-colors',
          theme === 'dark'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        )}
        aria-label="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </button>
      <button
        onClick={() => setTheme('system')}
        className={clsx(
          'p-2 rounded-md transition-colors',
          theme === 'system'
            ? 'bg-white dark:bg-gray-700 shadow-sm text-primary-600'
            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
        )}
        aria-label="System theme"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
