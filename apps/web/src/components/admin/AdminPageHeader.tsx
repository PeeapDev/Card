/**
 * Admin Page Header Component
 *
 * Provides consistent header layout across admin pages with:
 * - Breadcrumb navigation
 * - Page title and description
 * - Quick action buttons
 * - Refresh and export options
 */

import { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Home,
  RefreshCw,
  Download,
  Plus,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface QuickAction {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  loading?: boolean;
  disabled?: boolean;
}

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  quickActions?: QuickAction[];
  onRefresh?: () => void;
  onExport?: () => void;
  refreshing?: boolean;
  showBackButton?: boolean;
  children?: ReactNode;
  stats?: ReactNode;
}

export function AdminPageHeader({
  title,
  description,
  icon,
  breadcrumbs = [],
  quickActions = [],
  onRefresh,
  onExport,
  refreshing = false,
  children,
  stats,
}: AdminPageHeaderProps) {
  const location = useLocation();

  // Auto-generate breadcrumbs from path if not provided
  const autoBreadcrumbs: BreadcrumbItem[] = breadcrumbs.length > 0 ? breadcrumbs : (() => {
    const paths = location.pathname.split('/').filter(Boolean);
    return paths.map((path, index) => {
      const href = '/' + paths.slice(0, index + 1).join('/');
      const label = path
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
      return { label, href: index < paths.length - 1 ? href : undefined };
    });
  })();

  return (
    <div className="mb-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <Link
          to="/admin"
          className="flex items-center gap-1 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span className="hidden sm:inline">Dashboard</span>
        </Link>
        {autoBreadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
            {item.href ? (
              <Link
                to={item.href}
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-gray-700 dark:text-gray-300 font-medium">{item.label}</span>
            )}
          </div>
        ))}
      </nav>

      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Title and Description */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3"
        >
          {icon && (
            <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl text-primary-600 dark:text-primary-400">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h1>
            {description && (
              <p className="text-gray-500 dark:text-gray-400 mt-1">{description}</p>
            )}
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 flex-wrap"
        >
          {/* Refresh Button */}
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              onClick={onRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          )}

          {/* Export Button */}
          {onExport && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}

          {/* Custom Quick Actions */}
          {quickActions.map((action, index) => (
            <Button
              key={index}
              variant={action.variant || 'primary'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled || action.loading}
              className="gap-2"
            >
              {action.loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                action.icon
              )}
              <span className="hidden sm:inline">{action.label}</span>
            </Button>
          ))}
        </motion.div>
      </div>

      {/* Stats Row */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          {stats}
        </motion.div>
      )}

      {/* Custom Children */}
      {children && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mt-4"
        >
          {children}
        </motion.div>
      )}
    </div>
  );
}

/**
 * Quick Stats Bar - Shows key metrics in a compact row
 */
export interface StatItem {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' | 'primary';
}

interface QuickStatsBarProps {
  stats: StatItem[];
}

export function QuickStatsBar({ stats }: QuickStatsBarProps) {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    gray: 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700',
    primary: 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800',
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
      {stats.map((stat, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          className={`p-3 rounded-xl border ${colorClasses[stat.color || 'gray']}`}
        >
          <div className="flex items-center gap-2 mb-1">
            {stat.icon && <span className="opacity-60">{stat.icon}</span>}
            <span className="text-xs font-medium opacity-80">{stat.label}</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">{stat.value}</span>
            {stat.trendValue && (
              <span className={`text-xs ${stat.trend === 'up' ? 'text-green-500' : stat.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                {stat.trend === 'up' ? '↑' : stat.trend === 'down' ? '↓' : ''}
                {stat.trendValue}
              </span>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}
