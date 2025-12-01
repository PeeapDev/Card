/**
 * Global User Search Component
 *
 * AJAX-powered search that finds users by:
 * - Username (@mohamed)
 * - Phone number
 * - Name (first name, last name)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, User, Phone, AtSign, X, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';

export interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  username: string | null;
  phone: string | null;
  email: string | null;
}

interface UserSearchProps {
  onSelect: (user: SearchResult) => void;
  placeholder?: string;
  className?: string;
  excludeUserId?: string;
  autoFocus?: boolean;
}

export function UserSearch({
  onSelect,
  placeholder = 'Search by @username, phone, or name...',
  className,
  excludeUserId,
  autoFocus = false,
}: UserSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const searchUsers = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    try {
      // Clean up query - remove @ prefix for username search
      const cleanQuery = searchQuery.startsWith('@')
        ? searchQuery.substring(1)
        : searchQuery;

      // Try RPC function first (requires migration to be run)
      const { data: rpcData, error: rpcError } = await supabase.rpc('search_users', {
        p_query: cleanQuery,
        p_limit: 10,
      });

      if (!rpcError && rpcData && rpcData.length > 0) {
        const filteredResults = excludeUserId
          ? rpcData.filter((u: SearchResult) => u.id !== excludeUserId)
          : rpcData;
        setResults(filteredResults);
        setIsOpen(filteredResults.length > 0);
        setIsLoading(false);
        return;
      }

      // Fallback to direct query - works without username column
      // Search by phone, first_name, last_name only (username might not exist)
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, phone, email')
        .eq('status', 'ACTIVE')
        .or(`phone.ilike.%${cleanQuery}%,first_name.ilike.%${cleanQuery}%,last_name.ilike.%${cleanQuery}%,email.ilike.%${cleanQuery}%`)
        .limit(10);

      if (error) {
        console.error('Search error:', error);
        setResults([]);
      } else {
        // Map to SearchResult format (username will be null if column doesn't exist)
        const mappedResults: SearchResult[] = (data || []).map(u => ({
          id: u.id,
          first_name: u.first_name,
          last_name: u.last_name,
          username: null, // Username column might not exist yet
          phone: u.phone,
          email: u.email,
        }));
        const filteredResults = excludeUserId
          ? mappedResults.filter(u => u.id !== excludeUserId)
          : mappedResults;
        setResults(filteredResults);
        setIsOpen(filteredResults.length > 0);
      }
    } catch (err) {
      console.error('Search error:', err);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, [excludeUserId]);

  // Handle input change with debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setSelectedIndex(-1);

    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Set new timeout for debounced search
    debounceRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  // Handle selection
  const handleSelect = (user: SearchResult) => {
    onSelect(user);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setSelectedIndex(-1);
  };

  // Clear search
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className={clsx('relative', className)}>
      {/* Input */}
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(results.length > 0)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-80 overflow-y-auto"
        >
          {results.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              No users found
            </div>
          ) : (
            <ul className="py-2">
              {results.map((user, index) => (
                <li key={user.id}>
                  <button
                    onClick={() => handleSelect(user)}
                    className={clsx(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                      selectedIndex === index
                        ? 'bg-primary-50'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {user.first_name} {user.last_name}
                      </p>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        {user.username && (
                          <span className="flex items-center gap-1">
                            <AtSign className="w-3 h-3" />
                            {user.username}
                          </span>
                        )}
                        {user.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {user.phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Help Text */}
      {!isOpen && query.length > 0 && query.length < 2 && (
        <p className="absolute mt-1 text-xs text-gray-500">
          Type at least 2 characters to search
        </p>
      )}
    </div>
  );
}

export default UserSearch;
