/**
 * Cash Box Page
 *
 * Main page for viewing and managing cash boxes (savings)
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Loader2,
  Search,
  Filter,
  TrendingUp,
  Target,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui';
import { PotCard, CreatePotModal, ContributePotModal } from '@/components/pots';
import { usePots, usePotSettings } from '@/hooks/usePots';
import { clsx } from 'clsx';
import type { Pot, PotStatus } from '@/types';

type FilterStatus = 'all' | PotStatus;

export function PotsPage() {
  const navigate = useNavigate();
  const { data: pots, isLoading, error } = usePots();
  const { data: settings } = usePotSettings();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedPotForContribute, setSelectedPotForContribute] = useState<Pot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Calculate summary stats
  const totalBalance = pots?.reduce((sum, pot) => sum + pot.currentBalance, 0) || 0;
  const totalGoal = pots?.reduce((sum, pot) => sum + (pot.goalAmount || 0), 0) || 0;
  const activePots = pots?.filter(p => p.status === 'ACTIVE' || p.status === 'LOCKED').length || 0;
  const unlockedPots = pots?.filter(p => p.lockStatus === 'UNLOCKED').length || 0;

  // Filter pots
  const filteredPots = pots?.filter(pot => {
    const matchesSearch = pot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pot.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = filterStatus === 'all' || pot.status === filterStatus;

    return matchesSearch && matchesStatus;
  }) || [];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handlePotClick = (pot: Pot) => {
    navigate(`/pots/${pot.id}`);
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cash Box</h1>
            <p className="text-gray-500 mt-1">
              Create and manage locked savings goals
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Create Cash Box
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Savings</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? '...' : formatCurrency(totalBalance)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Goals</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? '...' : formatCurrency(totalGoal)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Cash Boxes</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? '...' : activePots}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Ready to Withdraw</p>
                <p className="text-xl font-bold text-gray-900">
                  {isLoading ? '...' : unlockedPots}
                </p>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cash boxes..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:border-primary-500 focus:ring-primary-500 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
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

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-6 bg-red-50 rounded-xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Error loading cash boxes</h3>
              <p className="text-red-700 mt-1">{(error as Error).message}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredPots.length === 0 && (
          <Card className="py-16">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {searchQuery || filterStatus !== 'all'
                  ? 'No cash boxes found'
                  : 'No cash boxes yet'}
              </h3>
              <p className="text-gray-500 max-w-md mx-auto mb-6">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start building your savings by creating your first cash box. Set a goal, lock your funds, and watch your savings grow!'}
              </p>
              {!searchQuery && filterStatus === 'all' && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Cash Box
                </button>
              )}
            </div>
          </Card>
        )}

        {/* Cash Box Grid */}
        {!isLoading && !error && filteredPots.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPots.map((pot) => (
              <PotCard
                key={pot.id}
                pot={pot}
                onClick={() => handlePotClick(pot)}
              />
            ))}
          </div>
        )}

        {/* Settings info */}
        {settings && (
          <div className="text-center text-sm text-gray-500">
            <p>
              Max {settings.maxPotsPerUser} cash boxes per user •
              Min lock period: {settings.minLockPeriodDays} days •
              Early withdrawal penalty: {settings.earlyWithdrawalPenaltyPercent}%
            </p>
          </div>
        )}
      </div>

      {/* Create Pot Modal */}
      <CreatePotModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => setShowCreateModal(false)}
      />

      {/* Contribute Modal */}
      {selectedPotForContribute && (
        <ContributePotModal
          isOpen={!!selectedPotForContribute}
          onClose={() => setSelectedPotForContribute(null)}
          pot={selectedPotForContribute}
          onSuccess={() => setSelectedPotForContribute(null)}
        />
      )}
    </MainLayout>
  );
}

export default PotsPage;
