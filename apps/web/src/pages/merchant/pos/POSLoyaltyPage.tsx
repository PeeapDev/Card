/**
 * POS Loyalty Program Page
 * Manage customer loyalty program, points, and rewards
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import {
  ArrowLeft,
  Loader2,
  Gift,
  Star,
  Users,
  Coins,
  TrendingUp,
  Settings,
  Search,
  Plus,
  Edit2,
  X,
  Save,
  Award,
  Percent,
  Calculator,
  RefreshCw,
  Check,
  Wifi,
  WifiOff,
} from 'lucide-react';
import posService, { POSLoyaltyProgram, POSLoyaltyPoints, POSCustomer } from '@/services/pos.service';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function POSLoyaltyPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  // Use offline sync hook for offline-first data access
  const offlineSync = useOfflineSync(merchantId);

  const [loading, setLoading] = useState(true);
  const [program, setProgram] = useState<POSLoyaltyProgram | null>(null);
  const [customers, setCustomers] = useState<(POSCustomer & { loyalty?: POSLoyaltyPoints })[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<POSCustomer | null>(null);
  const [pointsAction, setPointsAction] = useState({ type: 'add' as 'add' | 'redeem', points: 0, reason: '' });
  const [saving, setSaving] = useState(false);

  // Program settings form
  const [programForm, setProgramForm] = useState({
    name: 'Loyalty Rewards',
    points_per_currency: 1,
    points_value: 0.01,
    min_redeem_points: 100,
    max_redeem_percent: 50,
    is_active: true,
  });

  useEffect(() => {
    if (merchantId) {
      loadData();
    }
  }, [merchantId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Use offline sync - works offline with IndexedDB
      const programData = await offlineSync.getLoyaltyProgram();
      setProgram(programData);
      if (programData) {
        setProgramForm({
          name: programData.name,
          points_per_currency: programData.points_per_currency,
          points_value: programData.points_value,
          min_redeem_points: programData.min_redeem_points,
          max_redeem_percent: programData.max_redeem_percent || 50,
          is_active: programData.is_active,
        });
      }

      // Load customers with their loyalty points (offline-first)
      const customersData = await offlineSync.getCustomers();
      setCustomers(customersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProgram = async () => {
    try {
      setSaving(true);

      // Use offline sync - works offline with IndexedDB
      if (program) {
        await offlineSync.updateLoyaltyProgram(program.id!, {
          ...programForm,
          merchant_id: merchantId!,
        });
      } else {
        await posService.createLoyaltyProgram({
          ...programForm,
          merchant_id: merchantId!,
        } as POSLoyaltyProgram);
      }

      await loadData();
      setShowSettingsModal(false);
    } catch (error) {
      console.error('Error saving program:', error);
      alert('Failed to save loyalty program');
    } finally {
      setSaving(false);
    }
  };

  const openPointsModal = (customer: POSCustomer) => {
    setSelectedCustomer(customer);
    setPointsAction({ type: 'add', points: 0, reason: '' });
    setShowPointsModal(true);
  };

  const handlePointsAction = async () => {
    if (!selectedCustomer || pointsAction.points <= 0) return;

    try {
      setSaving(true);

      // Use offline sync - works offline with IndexedDB
      if (pointsAction.type === 'add') {
        await offlineSync.addLoyaltyPoints(
          selectedCustomer.id!,
          pointsAction.points,
          pointsAction.reason || 'Manual points add'
        );
      } else {
        await offlineSync.redeemLoyaltyPoints(
          selectedCustomer.id!,
          pointsAction.points,
          pointsAction.reason || 'Manual redemption'
        );
      }

      await loadData();
      setShowPointsModal(false);
    } catch (error) {
      console.error('Error managing points:', error);
      alert('Failed to manage points');
    } finally {
      setSaving(false);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.phone?.includes(query) ||
      customer.email?.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    totalCustomers: customers.length,
    activeMembers: customers.filter(c => c.loyalty && c.loyalty.points_balance > 0).length,
    totalPointsIssued: customers.reduce((sum, c) => sum + (c.loyalty?.total_earned || 0), 0),
    totalPointsRedeemed: customers.reduce((sum, c) => sum + (c.loyalty?.total_redeemed || 0), 0),
    pendingPoints: customers.reduce((sum, c) => sum + (c.loyalty?.points_balance || 0), 0),
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/pos/terminal')}
              className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Loyalty Program</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage customer rewards and points</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={() => setShowSettingsModal(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Program Settings
            </Button>
          </div>
        </div>

        {/* Program Status Card */}
        {program ? (
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white dark:bg-gray-800/20 rounded-xl flex items-center justify-center">
                  <Gift className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{program.name}</h2>
                  <p className="text-purple-100">
                    Earn {program.points_per_currency} point{program.points_per_currency !== 1 ? 's' : ''} per SLE 1 spent
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-purple-100 text-sm">Points Value</p>
                <p className="text-2xl font-bold">{formatCurrency(program.points_value)} per point</p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-6">
              <div>
                <p className="text-purple-100 text-sm">Min. Redeem</p>
                <p className="font-bold">{program.min_redeem_points} points</p>
              </div>
              <div>
                <p className="text-purple-100 text-sm">Max. Discount</p>
                <p className="font-bold">{program.max_redeem_percent || 50}%</p>
              </div>
              <div className="ml-auto">
                {program.is_active ? (
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-800/20 rounded-full text-sm">
                    <Check className="w-4 h-4" />
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-white dark:bg-gray-800/10 rounded-full text-sm">Inactive</span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center">
            <Gift className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">No Loyalty Program Yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Set up a loyalty program to reward your customers</p>
            <Button onClick={() => setShowSettingsModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Loyalty Program
            </Button>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Customers</p>
                <p className="text-xl font-bold">{stats.totalCustomers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Star className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Active Members</p>
                <p className="text-xl font-bold text-green-600">{stats.activeMembers}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Coins className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Points Issued</p>
                <p className="text-xl font-bold text-purple-600">{stats.totalPointsIssued.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Award className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Points Redeemed</p>
                <p className="text-xl font-bold text-orange-600">{stats.totalPointsRedeemed.toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-pink-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pending Points</p>
                <p className="text-xl font-bold text-pink-600">{stats.pendingPoints.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search customers by name, phone, email..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Customer List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Points Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Earned</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Redeemed</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p>No customers found</p>
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-medium">
                            {customer.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{customer.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {formatCurrency(Number(customer.total_purchases || 0))} total purchases
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {customer.phone && <p>{customer.phone}</p>}
                          {customer.email && <p className="text-gray-500 dark:text-gray-400">{customer.email}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-lg font-bold text-purple-600">
                          {(customer.loyalty?.points_balance || 0).toLocaleString()}
                        </span>
                        {program && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            = {formatCurrency((customer.loyalty?.points_balance || 0) * program.points_value)}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-green-600">
                        +{(customer.loyalty?.total_earned || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-orange-600">
                        -{(customer.loyalty?.total_redeemed || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center">
                          <button
                            onClick={() => openPointsModal(customer)}
                            className="p-1.5 bg-purple-50 text-purple-600 rounded hover:bg-purple-100"
                            title="Manage Points"
                          >
                            <Coins className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Program Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Loyalty Program Settings</h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Program Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Program Name
                </label>
                <input
                  type="text"
                  value={programForm.name}
                  onChange={e => setProgramForm({ ...programForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Loyalty Rewards"
                />
              </div>

              {/* Points Per Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Points Per SLE 1 Spent
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={programForm.points_per_currency}
                  onChange={e => setProgramForm({ ...programForm, points_per_currency: parseFloat(e.target.value) || 1 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Customer spends SLE 100 = {100 * programForm.points_per_currency} points
                </p>
              </div>

              {/* Points Value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Point Value (SLE per point)
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="0.001"
                  value={programForm.points_value}
                  onChange={e => setProgramForm({ ...programForm, points_value: parseFloat(e.target.value) || 0.01 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  100 points = {formatCurrency(100 * programForm.points_value)} discount
                </p>
              </div>

              {/* Min Redeem Points */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Minimum Points to Redeem
                </label>
                <input
                  type="number"
                  min="1"
                  value={programForm.min_redeem_points}
                  onChange={e => setProgramForm({ ...programForm, min_redeem_points: parseInt(e.target.value) || 100 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Max Redeem Percent */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Max Discount % Per Transaction
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={programForm.max_redeem_percent}
                  onChange={e => setProgramForm({ ...programForm, max_redeem_percent: parseInt(e.target.value) || 50 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Maximum {programForm.max_redeem_percent}% of transaction can be paid with points
                </p>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium">Program Active</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Enable points earning and redemption</p>
                </div>
                <button
                  onClick={() => setProgramForm({ ...programForm, is_active: !programForm.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    programForm.is_active ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-800 transition-transform ${
                      programForm.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowSettingsModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveProgram} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Points Modal */}
      {showPointsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Manage Points</h2>
              <button
                onClick={() => setShowPointsModal(false)}
                className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Customer Info */}
              <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center text-purple-700 font-bold text-lg">
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-sm text-purple-600">
                    Current Balance: <strong>{((customers.find(c => c.id === selectedCustomer.id) as any)?.loyalty?.points_balance || 0).toLocaleString()}</strong> points
                  </p>
                </div>
              </div>

              {/* Action Type */}
              <div className="flex gap-2">
                <button
                  onClick={() => setPointsAction({ ...pointsAction, type: 'add' })}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    pointsAction.type === 'add'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Plus className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-sm font-medium">Add Points</p>
                </button>
                <button
                  onClick={() => setPointsAction({ ...pointsAction, type: 'redeem' })}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                    pointsAction.type === 'redeem'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <Award className="w-5 h-5 mx-auto mb-1" />
                  <p className="text-sm font-medium">Redeem Points</p>
                </button>
              </div>

              {/* Points Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Points
                </label>
                <input
                  type="number"
                  min="1"
                  value={pointsAction.points || ''}
                  onChange={e => setPointsAction({ ...pointsAction, points: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 text-lg"
                  placeholder="Enter points"
                />
                {program && pointsAction.points > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    = {formatCurrency(pointsAction.points * program.points_value)} value
                  </p>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reason
                </label>
                <input
                  type="text"
                  value={pointsAction.reason}
                  onChange={e => setPointsAction({ ...pointsAction, reason: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Birthday bonus, Manual adjustment..."
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPointsModal(false)}>
                Cancel
              </Button>
              <Button
                className={`flex-1 ${pointsAction.type === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}`}
                onClick={handlePointsAction}
                disabled={saving || pointsAction.points <= 0}
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : pointsAction.type === 'add' ? (
                  <Plus className="w-4 h-4 mr-2" />
                ) : (
                  <Award className="w-4 h-4 mr-2" />
                )}
                {pointsAction.type === 'add' ? 'Add' : 'Redeem'} Points
              </Button>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}

export default POSLoyaltyPage;
