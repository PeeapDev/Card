/**
 * Data Table Toolbar Component
 *
 * Provides consistent toolbar for data tables with:
 * - Search input with keyboard shortcut hint
 * - Filter dropdowns
 * - Bulk action buttons
 * - Selected count display
 * - View options (table/grid)
 */

import { ReactNode, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Filter,
  ChevronDown,
  Check,
  LayoutGrid,
  LayoutList,
  Download,
  Trash2,
  Mail,
  Ban,
  CheckCircle,
  MoreHorizontal,
  Command,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

interface BulkAction {
  label: string;
  icon: ReactNode;
  onClick: (selectedIds: string[]) => void;
  variant?: 'default' | 'danger';
  requireConfirm?: boolean;
}

interface DataTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  bulkActions?: BulkAction[];
  selectedCount?: number;
  selectedIds?: string[];
  onClearSelection?: () => void;
  viewMode?: 'table' | 'grid';
  onViewModeChange?: (mode: 'table' | 'grid') => void;
  showViewToggle?: boolean;
  totalCount?: number;
  onExport?: () => void;
  children?: ReactNode;
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  bulkActions = [],
  selectedCount = 0,
  selectedIds = [],
  onClearSelection,
  viewMode = 'table',
  onViewModeChange,
  showViewToggle = false,
  totalCount,
  onExport,
  children,
}: DataTableToolbarProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setActiveFilter(null);
        searchRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="space-y-3">
      {/* Main Toolbar Row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        {/* Search and Filters */}
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={searchRef}
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full pl-10 pr-20 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchValue && (
                <button
                  onClick={() => onSearchChange('')}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              )}
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs font-medium text-gray-400 bg-gray-100 dark:bg-gray-700 rounded">
                <Command className="w-3 h-3" />K
              </kbd>
            </div>
          </div>

          {/* Filter Dropdowns */}
          {filters.map((filter) => (
            <div key={filter.key} className="relative">
              <button
                onClick={() => setActiveFilter(activeFilter === filter.key ? null : filter.key)}
                className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-all ${
                  filter.value !== 'all'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span>{filter.label}</span>
                {filter.value !== 'all' && (
                  <span className="px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-800 rounded">
                    {filter.options.find(o => o.value === filter.value)?.label}
                  </span>
                )}
                <ChevronDown className={`w-4 h-4 transition-transform ${activeFilter === filter.key ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {activeFilter === filter.key && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-1 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
                  >
                    {filter.options.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          filter.onChange(option.value);
                          setActiveFilter(null);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                      >
                        <span className={filter.value === option.value ? 'font-medium text-primary-600 dark:text-primary-400' : 'text-gray-600 dark:text-gray-400'}>
                          {option.label}
                        </span>
                        <div className="flex items-center gap-2">
                          {option.count !== undefined && (
                            <span className="text-xs text-gray-400">{option.count}</span>
                          )}
                          {filter.value === option.value && (
                            <Check className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                          )}
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2">
          {/* Total Count */}
          {totalCount !== undefined && (
            <span className="text-sm text-gray-500 dark:text-gray-400 hidden sm:inline">
              {totalCount.toLocaleString()} total
            </span>
          )}

          {/* View Toggle */}
          {showViewToggle && onViewModeChange && (
            <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <button
                onClick={() => onViewModeChange('table')}
                className={`p-2 ${viewMode === 'table' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => onViewModeChange('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100 dark:bg-gray-700' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Export Button */}
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="gap-2">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          )}

          {/* Custom Children */}
          {children}
        </div>
      </div>

      {/* Bulk Actions Bar - Shows when items are selected */}
      <AnimatePresence>
        {selectedCount > 0 && bulkActions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
                {selectedCount} selected
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 flex-wrap">
              {bulkActions.map((action, index) => (
                <Button
                  key={index}
                  variant={action.variant === 'danger' ? 'outline' : 'ghost'}
                  size="sm"
                  onClick={() => action.onClick(selectedIds)}
                  className={`gap-2 ${action.variant === 'danger' ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20' : ''}`}
                >
                  {action.icon}
                  <span>{action.label}</span>
                </Button>
              ))}
            </div>

            {onClearSelection && (
              <button
                onClick={onClearSelection}
                className="p-2 hover:bg-primary-100 dark:hover:bg-primary-800/30 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Empty State Component
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-4"
    >
      {icon && (
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <span className="text-gray-400 dark:text-gray-500">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-md mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </motion.div>
  );
}

/**
 * Loading Skeleton for Tables
 */
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 5 }: TableSkeletonProps) {
  return (
    <div className="animate-pulse">
      <div className="grid gap-4">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="h-4 bg-gray-200 dark:bg-gray-700 rounded" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
