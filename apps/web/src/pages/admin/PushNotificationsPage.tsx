/**
 * Push Notifications Page
 *
 * Admin page to send push notifications to users via Firebase Cloud Messaging.
 * Allows sending to all users, specific roles, or individual users.
 */

import { useState, useEffect } from 'react';
import {
  Bell,
  Send,
  Users,
  User,
  UserCog,
  Truck,
  Store,
  Shield,
  Search,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
  Smartphone,
  BarChart3,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { clsx } from 'clsx';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, MotionCard } from '@/components/ui/Card';
// Auth is handled by the api interceptor
import { api } from '@/lib/api';

interface UserWithToken {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
}

interface NotificationHistoryItem {
  id: string;
  title: string;
  body: string;
  target_type: string;
  sent_count: number;
  failed_count: number;
  errors?: string[];
  created_at: string;
  sender?: {
    full_name: string;
    email: string;
  };
}

interface TokenStats {
  total: number;
  byPlatform: Record<string, number>;
  byRole: Record<string, number>;
}

const targetOptions = [
  { value: 'all', label: 'All Users', icon: Users, description: 'Send to everyone with notifications enabled' },
  { value: 'user', label: 'Regular Users', icon: User, description: 'Send to users with "user" role' },
  { value: 'merchant', label: 'Merchants', icon: Store, description: 'Send to users with "merchant" role' },
  { value: 'driver', label: 'Drivers', icon: Truck, description: 'Send to users with "driver" role' },
  { value: 'admin', label: 'Admins', icon: Shield, description: 'Send to users with "admin" role' },
  { value: 'specific', label: 'Specific Users', icon: UserCog, description: 'Select individual users' },
];

export function PushNotificationsPage() {
  // Auth is handled by the api interceptor
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('all');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [usersWithTokens, setUsersWithTokens] = useState<UserWithToken[]>([]);
  const [history, setHistory] = useState<NotificationHistoryItem[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showUserPicker, setShowUserPicker] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Define response types
      type UsersResponse = { success: boolean; users?: UserWithToken[] };
      type HistoryResponse = { success: boolean; notifications?: NotificationHistoryItem[] };
      type StatsResponse = { success: boolean; total?: number; byPlatform?: Record<string, number>; byRole?: Record<string, number> };

      // Fetch users with tokens, history, and stats in parallel
      const [usersRes, historyRes, statsRes] = await Promise.all([
        api.get<UsersResponse>('/notifications/users'),
        api.get<HistoryResponse>('/notifications/history?limit=20'),
        api.get<StatsResponse>('/notifications/stats'),
      ]);

      if (usersRes?.success) {
        setUsersWithTokens(usersRes.users || []);
      }
      if (historyRes?.success) {
        setHistory(historyRes.notifications || []);
      }
      if (statsRes?.success) {
        setStats({
          total: statsRes.total || 0,
          byPlatform: statsRes.byPlatform || {},
          byRole: statsRes.byRole || {},
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required');
      return;
    }

    if (targetType === 'specific' && selectedUserIds.length === 0) {
      setError('Please select at least one user');
      return;
    }

    setSending(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await api.post<{ success: boolean; sent?: number; failed?: number; error?: string }>('/notifications/send', {
        title,
        body,
        targetType,
        targetIds: targetType === 'specific' ? selectedUserIds : undefined,
      });

      if (response?.success) {
        const { sent = 0, failed = 0 } = response;
        setSuccess(`Notification sent to ${sent} user(s)${failed > 0 ? `, ${failed} failed` : ''}`);
        setTitle('');
        setBody('');
        setSelectedUserIds([]);
        // Refresh history
        fetchData();
      } else {
        setError(response?.error || 'Failed to send notification');
      }
    } catch (err: unknown) {
      console.error('Error sending notification:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to send notification';
      setError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const filteredUsers = usersWithTokens.filter(user => {
    if (!userSearch) return true;
    const search = userSearch.toLowerCase();
    return (
      user.full_name?.toLowerCase().includes(search) ||
      user.email?.toLowerCase().includes(search) ||
      user.phone?.includes(search)
    );
  });

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const TargetIcon = targetOptions.find(t => t.value === targetType)?.icon || Users;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Push Notifications</h1>
            <p className="text-gray-500 dark:text-gray-400">
              Send push notifications to users via Firebase Cloud Messaging
            </p>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
          >
            <RefreshCw className={clsx('w-4 h-4', loading && 'animate-spin')} />
            Refresh
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MotionCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Smartphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Active Devices</p>
                </div>
              </div>
            </MotionCard>
            <MotionCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <Users className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {usersWithTokens.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Users with Push</p>
                </div>
              </div>
            </MotionCard>
            <MotionCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.byRole?.merchant || 0}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Merchants</p>
                </div>
              </div>
            </MotionCard>
            <MotionCard className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {history.length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Sent Today</p>
                </div>
              </div>
            </MotionCard>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Compose Section */}
          <div className="lg:col-span-2 space-y-6">
            <MotionCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-500" />
                Compose Notification
              </h2>

              {/* Success/Error Messages */}
              {success && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <p className="text-green-700 dark:text-green-400">{success}</p>
                  <button
                    onClick={() => setSuccess(null)}
                    className="ml-auto text-green-500 hover:text-green-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {error && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <p className="text-red-700 dark:text-red-400">{error}</p>
                  <button
                    onClick={() => setError(null)}
                    className="ml-auto text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Title */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter notification title..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {title.length}/100 characters
                </p>
              </div>

              {/* Body */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message *
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter notification message..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {body.length}/500 characters
                </p>
              </div>

              {/* Target Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Send To
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {targetOptions.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTargetType(option.value);
                          if (option.value === 'specific') {
                            setShowUserPicker(true);
                          }
                        }}
                        className={clsx(
                          'p-3 rounded-lg border text-left transition-all',
                          targetType === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={clsx(
                            'w-4 h-4',
                            targetType === option.value
                              ? 'text-primary-500'
                              : 'text-gray-500 dark:text-gray-400'
                          )} />
                          <span className={clsx(
                            'text-sm font-medium',
                            targetType === option.value
                              ? 'text-primary-700 dark:text-primary-400'
                              : 'text-gray-700 dark:text-gray-300'
                          )}>
                            {option.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {option.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Users (for specific target) */}
              {targetType === 'specific' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Selected Users ({selectedUserIds.length})
                    </label>
                    <button
                      onClick={() => setShowUserPicker(!showUserPicker)}
                      className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      {showUserPicker ? 'Hide' : 'Select Users'}
                    </button>
                  </div>

                  {showUserPicker && (
                    <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 mb-4 max-h-64 overflow-y-auto">
                      {/* Search */}
                      <div className="relative mb-3">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          placeholder="Search users..."
                          className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      {/* User List */}
                      {loading ? (
                        <div className="py-4 text-center text-gray-500 dark:text-gray-400">
                          <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                          Loading users...
                        </div>
                      ) : filteredUsers.length === 0 ? (
                        <p className="py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                          No users with push notifications enabled
                        </p>
                      ) : (
                        <div className="space-y-1">
                          {filteredUsers.map((user) => (
                            <label
                              key={user.id}
                              className={clsx(
                                'flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                                selectedUserIds.includes(user.id)
                                  ? 'bg-primary-50 dark:bg-primary-900/20'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={selectedUserIds.includes(user.id)}
                                onChange={() => toggleUserSelection(user.id)}
                                className="rounded border-gray-300 dark:border-gray-600 text-primary-600 focus:ring-primary-500"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {user.full_name || 'Unknown'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {user.email || user.phone}
                                </p>
                              </div>
                              <span className={clsx(
                                'px-2 py-0.5 text-xs rounded-full capitalize',
                                user.role === 'merchant' && 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400',
                                user.role === 'driver' && 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
                                user.role === 'admin' && 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
                                user.role === 'user' && 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                              )}>
                                {user.role}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Selected users chips */}
                  {selectedUserIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedUserIds.map((id) => {
                        const user = usersWithTokens.find(u => u.id === id);
                        return (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 rounded-full text-xs"
                          >
                            {user?.full_name || user?.email || 'Unknown'}
                            <button
                              onClick={() => toggleUserSelection(id)}
                              className="hover:text-primary-900 dark:hover:text-primary-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Send Button */}
              <button
                onClick={handleSend}
                disabled={sending || !title.trim() || !body.trim() || (targetType === 'specific' && selectedUserIds.length === 0)}
                className={clsx(
                  'w-full py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-colors',
                  sending || !title.trim() || !body.trim() || (targetType === 'specific' && selectedUserIds.length === 0)
                    ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 text-white hover:bg-primary-700'
                )}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    Send Notification
                  </>
                )}
              </button>
            </MotionCard>
          </div>

          {/* Preview & History Section */}
          <div className="space-y-6">
            {/* Preview */}
            <MotionCard className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-gray-400" />
                Preview
              </h2>
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900 dark:text-white truncate">
                      {title || 'Notification Title'}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                      {body || 'Your notification message will appear here...'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      now
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <TargetIcon className="w-4 h-4" />
                  <span>
                    Sending to: {targetOptions.find(t => t.value === targetType)?.label}
                    {targetType === 'specific' && selectedUserIds.length > 0 && (
                      <span className="ml-1">({selectedUserIds.length} selected)</span>
                    )}
                  </span>
                </div>
              </div>
            </MotionCard>

            {/* Recent History */}
            <MotionCard className="p-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="w-full flex items-center justify-between text-left"
              >
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-gray-400" />
                  Recent Notifications
                </h2>
                {showHistory ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </button>

              {showHistory && (
                <div className="mt-4 space-y-3">
                  {history.length === 0 ? (
                    <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                      No notifications sent yet
                    </p>
                  ) : (
                    history.slice(0, 5).map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {item.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {item.body}
                            </p>
                          </div>
                          <span className={clsx(
                            'px-2 py-0.5 text-xs rounded-full whitespace-nowrap',
                            item.failed_count === 0
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                          )}>
                            {item.sent_count} sent
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                            {item.target_type}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </MotionCard>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
