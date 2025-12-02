/**
 * Admin Pots Management Page
 *
 * Administrative interface for managing all user pots
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiggyBank,
  Search,
  Lock,
  Unlock,
  AlertCircle,
  Loader2,
  Eye,
  Filter,
  Download,
  Settings,
  Users,
  TrendingUp,
  Calendar,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { useAllPots, useAdminTogglePotLock, useAdminForceUnlock, usePotSettings, useUpdatePotSetting } from '@/hooks/usePots';
import { supabase } from '@/lib/supabase';
import { clsx } from 'clsx';
import type { Pot, PotStatus, PotSettings } from '@/types';

interface PotWithUser extends Pot {
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone?: string;
  };
}

export function PotsManagementPage() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | PotStatus>('all');
  const [page, setPage] = useState(1);
  const [selectedPot, setSelectedPot] = useState<PotWithUser | null>(null);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockReason, setLockReason] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const { data: potsData, isLoading, refetch } = useAllPots({
    page,
    limit: 20,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const { data: settings } = usePotSettings();
  const toggleLock = useAdminTogglePotLock();
  const forceUnlock = useAdminForceUnlock();
  const updateSetting = useUpdatePotSetting();

  // Enhanced pots with user data
  const [potsWithUsers, setPotsWithUsers] = useState<PotWithUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch user data for pots
  useEffect(() => {
    const fetchUserData = async () => {
      if (!potsData?.data || potsData.data.length === 0) {
        setPotsWithUsers([]);
        return;
      }

      setLoadingUsers(true);
      const userIds = [...new Set(potsData.data.map(p => p.userId))];

      const { data: users, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, phone')
        .in('id', userIds);

      if (error) {
        console.error('Error fetching users:', error);
        setPotsWithUsers(potsData.data.map(p => ({ ...p })));
      } else {
        const userMap = new Map(users?.map(u => [u.id, u]) || []);
        setPotsWithUsers(
          potsData.data.map(pot => ({
            ...pot,
            user: userMap.get(pot.userId),
          }))
        );
      }
      setLoadingUsers(false);
    };

    fetchUserData();
  }, [potsData?.data]);

  // Filter pots by search term
  const filteredPots = potsWithUsers.filter(pot => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      pot.name.toLowerCase().includes(search) ||
      pot.user?.first_name?.toLowerCase().includes(search) ||
      pot.user?.last_name?.toLowerCase().includes(search) ||
      pot.user?.email?.toLowerCase().includes(search) ||
      pot.id.toLowerCase().includes(search)
    );
  });

  // Summary stats
  const totalPots = potsData?.total || 0;
  const totalBalance = filteredPots.reduce((sum, pot) => sum + pot.currentBalance, 0);
  const lockedPots = filteredPots.filter(p => p.lockStatus === 'LOCKED' || p.adminLocked).length;
  const adminLockedPots = filteredPots.filter(p => p.adminLocked).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleToggleLock = async () => {
    if (!selectedPot) return;

    try {
      await toggleLock.mutateAsync({
        potId: selectedPot.id,
        lock: !selectedPot.adminLocked,
        reason: lockReason,
      });
      refetch();
      setShowLockModal(false);
      setSelectedPot(null);
      setLockReason('');
    } catch (error) {
      console.error('Failed to toggle lock:', error);
    }
  };

  const handleForceUnlock = async (pot: PotWithUser) => {
    if (!confirm(`Force unlock pot "${pot.name}"? This will allow the user to withdraw immediately.`)) {
      return;
    }

    try {
      await forceUnlock.mutateAsync(pot.id);
      refetch();
    } catch (error) {
      console.error('Failed to force unlock:', error);
    }
  };

  const getStatusBadge = (pot: PotWithUser) => {
    if (pot.adminLocked) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          Admin Locked
        </span>
      );
    }

    switch (pot.status) {
      case 'ACTIVE':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
            Active
          </span>
        );
      case 'LOCKED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
            Locked
          </span>
        );
      case 'UNLOCKED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
            Unlocked
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            Closed
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
            {pot.status}
          </span>
        );
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pots Management</h1>
            <p className="text-gray-500 mt-1">Manage all user savings pots</p>
          </div>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
          >
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <PiggyBank className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Pots</p>
                <p className="text-xl font-bold text-gray-900">{totalPots}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Savings</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Lock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Locked Pots</p>
                <p className="text-xl font-bold text-gray-900">{lockedPots}</p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Admin Locked</p>
                <p className="text-xl font-bold text-gray-900">{adminLockedPots}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, user, email, or ID..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as 'all' | PotStatus);
                setPage(1);
              }}
              className="px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="LOCKED">Locked</option>
              <option value="UNLOCKED">Unlocked</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Pots Table */}
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Pot
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Balance
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Maturity
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading || loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <Loader2 className="w-8 h-8 text-primary-600 animate-spin mx-auto" />
                    </td>
                  </tr>
                ) : filteredPots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No pots found
                    </td>
                  </tr>
                ) : (
                  filteredPots.map((pot) => (
                    <tr key={pot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${pot.color || '#4F46E5'}15` }}
                          >
                            <PiggyBank
                              className="w-5 h-5"
                              style={{ color: pot.color || '#4F46E5' }}
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{pot.name}</p>
                            <p className="text-xs text-gray-500 font-mono">
                              {pot.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {pot.user ? (
                          <div>
                            <p className="font-medium text-gray-900">
                              {pot.user.first_name} {pot.user.last_name}
                            </p>
                            <p className="text-sm text-gray-500">{pot.user.email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">
                          {formatCurrency(pot.currentBalance)}
                        </p>
                        {pot.goalAmount && (
                          <p className="text-sm text-gray-500">
                            of {formatCurrency(pot.goalAmount)}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(pot)}
                        {pot.adminLocked && pot.adminLockReason && (
                          <p className="text-xs text-red-600 mt-1">{pot.adminLockReason}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {pot.lockEndDate ? (
                          <div>
                            <p className="text-sm text-gray-900">{formatDate(pot.lockEndDate)}</p>
                            {new Date(pot.lockEndDate) > new Date() && (
                              <p className="text-xs text-gray-500">
                                {Math.ceil(
                                  (new Date(pot.lockEndDate).getTime() - Date.now()) /
                                    (1000 * 60 * 60 * 24)
                                )}{' '}
                                days left
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => navigate(`/pots/${pot.id}`)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="View"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedPot(pot);
                              setShowLockModal(true);
                            }}
                            className={clsx(
                              'p-2 rounded-lg transition-colors',
                              pot.adminLocked
                                ? 'text-green-600 hover:bg-green-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            )}
                            title={pot.adminLocked ? 'Unlock' : 'Lock'}
                          >
                            {pot.adminLocked ? (
                              <Unlock className="w-4 h-4" />
                            ) : (
                              <Lock className="w-4 h-4" />
                            )}
                          </button>
                          {pot.lockStatus === 'LOCKED' && !pot.adminLocked && (
                            <button
                              onClick={() => handleForceUnlock(pot)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Force Unlock"
                            >
                              <Calendar className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {potsData && potsData.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Page {page} of {potsData.totalPages} ({potsData.total} total)
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(potsData.totalPages, p + 1))}
                  disabled={page === potsData.totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Lock/Unlock Modal */}
      {showLockModal && selectedPot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowLockModal(false);
              setSelectedPot(null);
              setLockReason('');
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {selectedPot.adminLocked ? 'Unlock Pot' : 'Lock Pot'}
            </h2>
            <p className="text-gray-600 mb-4">
              {selectedPot.adminLocked
                ? `Remove admin lock from "${selectedPot.name}"?`
                : `Add admin lock to "${selectedPot.name}"? The user will not be able to withdraw funds.`}
            </p>

            {!selectedPot.adminLocked && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason (Required)
                </label>
                <textarea
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="e.g., Fraud investigation, Compliance review"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors resize-none"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowLockModal(false);
                  setSelectedPot(null);
                  setLockReason('');
                }}
                className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleLock}
                disabled={toggleLock.isPending || (!selectedPot.adminLocked && !lockReason)}
                className={clsx(
                  'flex-1 py-2.5 px-4 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                  selectedPot.adminLocked
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-600 text-white hover:bg-red-700',
                  (toggleLock.isPending || (!selectedPot.adminLocked && !lockReason)) &&
                    'opacity-50 cursor-not-allowed'
                )}
              >
                {toggleLock.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : selectedPot.adminLocked ? (
                  'Unlock Pot'
                ) : (
                  'Lock Pot'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && settings && (
        <PotSettingsModal
          settings={settings}
          onClose={() => setShowSettingsModal(false)}
          onUpdate={async (key, value) => {
            await updateSetting.mutateAsync({ key, value });
          }}
          isUpdating={updateSetting.isPending}
        />
      )}
    </AdminLayout>
  );
}

interface PotSettingsModalProps {
  settings: PotSettings;
  onClose: () => void;
  onUpdate: (key: string, value: any) => Promise<void>;
  isUpdating: boolean;
}

function PotSettingsModal({ settings, onClose, onUpdate, isUpdating }: PotSettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);

  const handleSave = async () => {
    // Update changed settings
    if (localSettings.maxPotsPerUser !== settings.maxPotsPerUser) {
      await onUpdate('max_pots_per_user', localSettings.maxPotsPerUser);
    }
    if (localSettings.minContributionAmount !== settings.minContributionAmount) {
      await onUpdate('min_contribution_amount', localSettings.minContributionAmount);
    }
    if (localSettings.maxContributionAmount !== settings.maxContributionAmount) {
      await onUpdate('max_contribution_amount', localSettings.maxContributionAmount);
    }
    if (localSettings.minLockPeriodDays !== settings.minLockPeriodDays) {
      await onUpdate('min_lock_period_days', localSettings.minLockPeriodDays);
    }
    if (localSettings.maxLockPeriodDays !== settings.maxLockPeriodDays) {
      await onUpdate('max_lock_period_days', localSettings.maxLockPeriodDays);
    }
    if (localSettings.earlyWithdrawalPenaltyPercent !== settings.earlyWithdrawalPenaltyPercent) {
      await onUpdate('early_withdrawal_penalty_percent', localSettings.earlyWithdrawalPenaltyPercent);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Pot Settings</h2>
          <p className="text-sm text-gray-500 mt-1">Configure global pot settings</p>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max Pots Per User
            </label>
            <input
              type="number"
              value={localSettings.maxPotsPerUser}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  maxPotsPerUser: parseInt(e.target.value) || 0,
                })
              }
              min="1"
              max="100"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Contribution (SLE)
              </label>
              <input
                type="number"
                value={localSettings.minContributionAmount}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    minContributionAmount: parseFloat(e.target.value) || 0,
                  })
                }
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Contribution (SLE)
              </label>
              <input
                type="number"
                value={localSettings.maxContributionAmount}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    maxContributionAmount: parseFloat(e.target.value) || 0,
                  })
                }
                min="0"
                step="0.01"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Lock Period (Days)
              </label>
              <input
                type="number"
                value={localSettings.minLockPeriodDays}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    minLockPeriodDays: parseInt(e.target.value) || 0,
                  })
                }
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Max Lock Period (Days)
              </label>
              <input
                type="number"
                value={localSettings.maxLockPeriodDays}
                onChange={(e) =>
                  setLocalSettings({
                    ...localSettings,
                    maxLockPeriodDays: parseInt(e.target.value) || 0,
                  })
                }
                min="1"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Early Withdrawal Penalty (%)
            </label>
            <input
              type="number"
              value={localSettings.earlyWithdrawalPenaltyPercent}
              onChange={(e) =>
                setLocalSettings({
                  ...localSettings,
                  earlyWithdrawalPenaltyPercent: parseFloat(e.target.value) || 0,
                })
              }
              min="0"
              max="100"
              step="0.1"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isUpdating}
              className="flex-1 py-2.5 px-4 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PotsManagementPage;
