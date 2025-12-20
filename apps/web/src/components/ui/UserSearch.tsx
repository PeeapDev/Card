/**
 * Global User Search Component with Fuse.js
 *
 * Production-grade search using Fuse.js for fuzzy matching
 * Searches users by:
 * - Username (@mohamed)
 * - Phone number
 * - Name (first name, last name)
 * - Email
 *
 * Shows profile picture from KYC (read-only, cannot be changed by user)
 * Avatars are cached in IndexedDB for offline access and fast loading
 * Reusable for: Send Money, Add Contact, Search Users
 */

import { useState, useEffect, useRef, useCallback, useMemo, SyntheticEvent } from 'react';
import { Search, Phone, AtSign, X, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import { useAuth } from '@/context/AuthContext';
import { rbacService } from '@/services/rbac.service';
import {
  saveUserAvatars,
  getAllCachedUserAvatars,
  type CachedUserAvatar,
} from '@/services/indexeddb.service';
import Fuse from 'fuse.js';

export interface SearchResult {
  id: string;
  first_name: string;
  last_name: string;
  username: string | null;
  phone: string | null;
  email: string | null;
  profile_picture: string | null;
  kyc_status?: string;
}

interface UserSearchProps {
  onSelect: (user: SearchResult) => void;
  placeholder?: string;
  className?: string;
  excludeUserId?: string;
  autoFocus?: boolean;
  compact?: boolean;
}

// Fuse.js configuration for fuzzy search
const fuseOptions = {
  keys: [
    { name: 'first_name', weight: 0.3 },
    { name: 'last_name', weight: 0.3 },
    { name: 'phone', weight: 0.2 },
    { name: 'email', weight: 0.15 },
    { name: 'username', weight: 0.05 },
  ],
  threshold: 0.4, // Lower = more strict matching
  distance: 100,
  minMatchCharLength: 2,
  includeScore: true,
  shouldSort: true,
};

export function UserSearch({
  onSelect,
  placeholder = 'Search by @username, phone, or name...',
  className,
  excludeUserId,
  autoFocus = false,
  compact = false,
}: UserSearchProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [allUsers, setAllUsers] = useState<SearchResult[]>([]);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [failedImages, setFailedImages] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Handle image load error - fallback to initials
  const handleImageError = useCallback((userId: string) => {
    setFailedImages(prev => new Set(prev).add(userId));
  }, []);

  // Initialize RBAC when user changes
  useEffect(() => {
    if (user?.id && user?.roles) {
      rbacService.initialize(user.id, user.roles.join(','));
    }
  }, [user?.id, user?.roles]);

  // Load all users on mount for Fuse.js client-side search
  // First loads from IndexedDB cache for instant display, then fetches fresh data
  useEffect(() => {
    const loadUsers = async () => {
      setIsInitialLoading(true);

      try {
        // Step 1: Load cached users from IndexedDB first for instant display
        const cachedAvatars = await getAllCachedUserAvatars();
        if (cachedAvatars.length > 0) {
          const cachedUsers: SearchResult[] = cachedAvatars.map((c: CachedUserAvatar) => ({
            id: c.user_id,
            first_name: c.first_name || '',
            last_name: c.last_name || '',
            username: c.username || null,
            phone: c.phone || null,
            email: c.email || null,
            profile_picture: c.avatar_url || null,
          }));

          // Exclude current user if specified
          const filteredCached = excludeUserId
            ? cachedUsers.filter(u => u.id !== excludeUserId)
            : cachedUsers;

          setAllUsers(filteredCached);
          setIsInitialLoading(false);
        }

        // Step 2: Fetch fresh data from server (includes profile_picture)
        const { data, error } = await supabase
          .from('users')
          .select('id, first_name, last_name, phone, email, username, profile_picture, roles, status, kyc_status')
          .eq('status', 'ACTIVE')
          .limit(500);

        if (error) {
          console.error('Error loading users:', error);
          // If we have cached data, keep using it
          if (cachedAvatars.length === 0) {
            setAllUsers([]);
          }
        } else {
          // Debug: Log users with profile pictures
          const usersWithPics = (data || []).filter((u: any) => u.profile_picture);
          console.log(`[UserSearch] Loaded ${data?.length || 0} users, ${usersWithPics.length} have profile pictures`);
          if (usersWithPics.length > 0) {
            console.log('[UserSearch] Sample profile_picture:', usersWithPics[0]?.profile_picture);
          }
          // Map to SearchResult format
          const mappedUsers: SearchResult[] = (data || []).map((u: any) => ({
            id: u.id,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            username: u.username || null,
            phone: u.phone || null,
            email: u.email || null,
            profile_picture: u.profile_picture || null,
          }));

          // Exclude current user if specified
          const filteredUsers = excludeUserId
            ? mappedUsers.filter(u => u.id !== excludeUserId)
            : mappedUsers;

          setAllUsers(filteredUsers);

          // Step 3: Cache all user avatars to IndexedDB for offline access
          const avatarsToCache = (data || []).map((u: any) => ({
            user_id: u.id,
            avatar_url: u.profile_picture || null,
            first_name: u.first_name || '',
            last_name: u.last_name || '',
            phone: u.phone || null,
            email: u.email || null,
            username: u.username || null,
          }));

          // Save to IndexedDB in background (don't await)
          saveUserAvatars(avatarsToCache).catch(err => {
            console.warn('Failed to cache user avatars:', err);
          });
        }
      } catch (err) {
        console.error('Error in loadUsers:', err);
        setAllUsers([]);
      } finally {
        setIsInitialLoading(false);
      }
    };

    loadUsers();
  }, [excludeUserId]);

  // Create Fuse instance with memoization
  const fuse = useMemo(() => {
    return new Fuse(allUsers, fuseOptions);
  }, [allUsers]);

  // Perform fuzzy search using Fuse.js
  const searchUsers = useCallback((searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setIsLoading(true);

    // Clean up query - remove @ prefix for username search
    const cleanQuery = searchQuery.startsWith('@')
      ? searchQuery.substring(1)
      : searchQuery;

    // Perform Fuse.js search
    const searchResults = fuse.search(cleanQuery);

    // Extract matched items and limit to top 20
    const matchedUsers = searchResults
      .slice(0, 20)
      .map(result => result.item);

    setResults(matchedUsers);
    setIsOpen(matchedUsers.length > 0);
    setIsLoading(false);
  }, [fuse, allUsers.length]);

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
    }, 150); // Faster since it's client-side
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
  const handleSelect = (selectedUser: SearchResult) => {
    onSelect(selectedUser);
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
          {isLoading || isInitialLoading ? (
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
          placeholder={isInitialLoading ? 'Loading users...' : placeholder}
          autoFocus={autoFocus}
          disabled={isInitialLoading}
          className={clsx(
            "w-full pr-10 border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-900 dark:text-white dark:bg-gray-800 disabled:bg-gray-100 dark:disabled:bg-gray-700",
            compact ? "pl-10 py-2 text-sm rounded-lg" : "pl-10 py-3 rounded-xl"
          )}
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
              {results.map((resultUser, index) => (
                <li key={resultUser.id}>
                  <button
                    onClick={() => handleSelect(resultUser)}
                    className={clsx(
                      'w-full px-4 py-3 flex items-center gap-3 text-left transition-colors',
                      selectedIndex === index
                        ? 'bg-primary-50'
                        : 'hover:bg-gray-50'
                    )}
                  >
                    {/* Profile Picture - small round circle with fallback */}
                    {resultUser.profile_picture && !failedImages.has(resultUser.id) ? (
                      <img
                        src={resultUser.profile_picture}
                        alt={`${resultUser.first_name} ${resultUser.last_name}`}
                        className="w-10 h-10 rounded-full object-cover flex-shrink-0 border-2 border-gray-100"
                        onError={() => handleImageError(resultUser.id)}
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-medium text-sm">
                          {resultUser.first_name?.charAt(0)}{resultUser.last_name?.charAt(0)}
                        </span>
                      </div>
                    )}

                    {/* Info - Username and Name */}
                    <div className="flex-1 min-w-0">
                      {/* Username first if available (with @) */}
                      {resultUser.username ? (
                        <>
                          <p className="font-medium text-gray-900 truncate flex items-center gap-1">
                            <AtSign className="w-4 h-4 text-primary-500" />
                            {resultUser.username}
                            {resultUser.kyc_status === 'approved' && (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" stroke="white" strokeWidth={2} />
                            )}
                          </p>
                          <p className="text-sm text-gray-500 truncate">
                            {resultUser.first_name} {resultUser.last_name}
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900 truncate flex items-center gap-1">
                            {resultUser.first_name} {resultUser.last_name}
                            {resultUser.kyc_status === 'approved' && (
                              <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" fill="currentColor" stroke="white" strokeWidth={2} />
                            )}
                          </p>
                          {resultUser.phone && (
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {resultUser.phone}
                            </p>
                          )}
                        </>
                      )}
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
