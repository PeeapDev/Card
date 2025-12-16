import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Percent,
  Tag,
  Calendar,
  Clock,
  DollarSign,
  Package,
  Users,
  Gift,
  Edit2,
  Trash2,
  Copy,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  Zap,
  X,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  getDiscounts as getOfflineDiscounts,
  saveDiscounts as saveOfflineDiscounts,
  saveDiscount as saveOfflineDiscount,
  deleteDiscount as deleteOfflineDiscount,
  type OfflineDiscount
} from '@/services/indexeddb.service';

interface Discount {
  id: string;
  business_id: string;
  name: string;
  code: string;
  description: string;
  type: 'percentage' | 'fixed' | 'bogo' | 'bundle';
  value: number;
  min_purchase: number;
  max_discount: number;
  usage_limit: number;
  usage_count: number;
  per_customer_limit: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
  applies_to: 'all' | 'category' | 'product' | 'customer';
  target_ids: string[];
  conditions: {
    days_of_week?: number[];
    time_start?: string;
    time_end?: string;
    customer_type?: string;
  };
  created_at: string;
  updated_at: string;
}

export function POSDiscountsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [filteredDiscounts, setFilteredDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState<Discount | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalRedeemed: 0,
    totalSavings: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    type: 'percentage' as 'percentage' | 'fixed' | 'bogo' | 'bundle',
    value: 0,
    min_purchase: 0,
    max_discount: 0,
    usage_limit: 0,
    per_customer_limit: 0,
    start_date: '',
    end_date: '',
    is_active: true,
    applies_to: 'all' as 'all' | 'category' | 'product' | 'customer',
    target_ids: [] as string[],
    conditions: {}
  });

  useEffect(() => {
    if (user?.id) {
      loadDiscounts();
    }
  }, [user?.id]);

  useEffect(() => {
    filterDiscounts();
  }, [discounts, searchQuery, statusFilter, typeFilter]);

  const loadDiscounts = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // First, try to load from IndexedDB with timeout (non-blocking)
      const cachePromise = getOfflineDiscounts(user.id)
        .then(cached => {
          if (cached.length > 0) {
            setDiscounts(cached as unknown as Discount[]);
            updateStats(cached as unknown as Discount[]);
          }
        })
        .catch(() => console.log('Cache not available'));

      // Race with a short timeout - don't wait for cache if it's slow
      await Promise.race([
        cachePromise,
        new Promise(resolve => setTimeout(resolve, 500))
      ]);

      // Fetch fresh data from server
      const { data, error } = await supabaseAdmin
        .from('pos_discounts')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const discountsData = data || [];
      setDiscounts(discountsData);
      updateStats(discountsData);

      // Save to IndexedDB in background (non-blocking)
      if (discountsData.length > 0) {
        saveOfflineDiscounts(discountsData as unknown as OfflineDiscount[], user.id).catch(() => {});
      }

    } catch (error) {
      console.error('Error loading discounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (discountsData: Discount[]) => {
    const now = new Date();
    const active = discountsData.filter(d => {
      const startDate = new Date(d.start_date);
      const endDate = new Date(d.end_date);
      return d.is_active && startDate <= now && endDate >= now;
    }).length;
    const totalRedeemed = discountsData.reduce((sum, d) => sum + (d.usage_count || 0), 0);

    setStats({
      total: discountsData.length,
      active,
      totalRedeemed,
      totalSavings: 0
    });
  };

  const filterDiscounts = () => {
    let filtered = [...discounts];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(d =>
        d.name.toLowerCase().includes(query) ||
        d.code?.toLowerCase().includes(query) ||
        d.description?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(d => {
        const startDate = new Date(d.start_date);
        const endDate = new Date(d.end_date);
        const isActive = d.is_active && startDate <= now && endDate >= now;
        const isScheduled = d.is_active && startDate > now;
        const isExpired = endDate < now;

        if (statusFilter === 'active') return isActive;
        if (statusFilter === 'scheduled') return isScheduled;
        if (statusFilter === 'expired') return isExpired;
        if (statusFilter === 'disabled') return !d.is_active;
        return true;
      });
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(d => d.type === typeFilter);
    }

    setFilteredDiscounts(filtered);
  };

  const handleAddDiscount = async () => {
    try {
      const discountData = {
        ...formData,
        merchant_id: user?.id,
        usage_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('pos_discounts')
        .insert(discountData)
        .select()
        .single();

      if (error) throw error;

      // Save to IndexedDB for offline access
      if (data) {
        await saveOfflineDiscount(data as unknown as OfflineDiscount);
      }

      setShowAddModal(false);
      resetForm();
      loadDiscounts();
    } catch (error) {
      console.error('Error adding discount:', error);
      alert('Failed to add discount. Please try again.');
    }
  };

  const handleUpdateDiscount = async () => {
    if (!selectedDiscount) return;

    try {
      const { data, error } = await supabaseAdmin
        .from('pos_discounts')
        .update({
          ...formData,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDiscount.id)
        .select()
        .single();

      if (error) throw error;

      // Update in IndexedDB
      if (data) {
        await saveOfflineDiscount(data as unknown as OfflineDiscount);
      }

      setShowAddModal(false);
      setSelectedDiscount(null);
      resetForm();
      loadDiscounts();
    } catch (error) {
      console.error('Error updating discount:', error);
      alert('Failed to update discount. Please try again.');
    }
  };

  const handleToggleActive = async (discount: Discount) => {
    try {
      const { data, error } = await supabaseAdmin
        .from('pos_discounts')
        .update({
          is_active: !discount.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', discount.id)
        .select()
        .single();

      if (error) throw error;

      // Update in IndexedDB
      if (data) {
        await saveOfflineDiscount(data as unknown as OfflineDiscount);
      }

      loadDiscounts();
    } catch (error) {
      console.error('Error toggling discount:', error);
    }
    setActiveDropdown(null);
  };

  const handleDeleteDiscount = async (discountId: string) => {
    if (!confirm('Are you sure you want to delete this discount?')) return;

    try {
      const { error } = await supabaseAdmin
        .from('pos_discounts')
        .delete()
        .eq('id', discountId);

      if (error) throw error;

      // Delete from IndexedDB
      await deleteOfflineDiscount(discountId);

      loadDiscounts();
    } catch (error) {
      console.error('Error deleting discount:', error);
      alert('Failed to delete discount. Please try again.');
    }
  };

  const handleDuplicateDiscount = async (discount: Discount) => {
    try {
      const newDiscount = {
        ...discount,
        id: undefined,
        name: `${discount.name} (Copy)`,
        code: `${discount.code}_COPY`,
        usage_count: 0,
        is_active: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      delete (newDiscount as any).id;

      const { data, error } = await supabaseAdmin
        .from('pos_discounts')
        .insert(newDiscount)
        .select()
        .single();

      if (error) throw error;

      // Save to IndexedDB for offline access
      if (data) {
        await saveOfflineDiscount(data as unknown as OfflineDiscount);
      }

      loadDiscounts();
    } catch (error) {
      console.error('Error duplicating discount:', error);
    }
    setActiveDropdown(null);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      description: '',
      type: 'percentage',
      value: 0,
      min_purchase: 0,
      max_discount: 0,
      usage_limit: 0,
      per_customer_limit: 0,
      start_date: '',
      end_date: '',
      is_active: true,
      applies_to: 'all',
      target_ids: [],
      conditions: {}
    });
  };

  const openEditModal = (discount: Discount) => {
    setSelectedDiscount(discount);
    setFormData({
      name: discount.name,
      code: discount.code || '',
      description: discount.description || '',
      type: discount.type,
      value: discount.value,
      min_purchase: discount.min_purchase || 0,
      max_discount: discount.max_discount || 0,
      usage_limit: discount.usage_limit || 0,
      per_customer_limit: discount.per_customer_limit || 0,
      start_date: discount.start_date?.split('T')[0] || '',
      end_date: discount.end_date?.split('T')[0] || '',
      is_active: discount.is_active,
      applies_to: discount.applies_to || 'all',
      target_ids: discount.target_ids || [],
      conditions: discount.conditions || {}
    });
    setShowAddModal(true);
    setActiveDropdown(null);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, code });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getDiscountStatus = (discount: Discount) => {
    const now = new Date();
    const startDate = new Date(discount.start_date);
    const endDate = new Date(discount.end_date);

    if (!discount.is_active) return { label: 'Disabled', color: 'bg-gray-100 text-gray-700' };
    if (endDate < now) return { label: 'Expired', color: 'bg-red-100 text-red-700' };
    if (startDate > now) return { label: 'Scheduled', color: 'bg-yellow-100 text-yellow-700' };
    if (discount.usage_limit && discount.usage_count >= discount.usage_limit) {
      return { label: 'Exhausted', color: 'bg-orange-100 text-orange-700' };
    }
    return { label: 'Active', color: 'bg-green-100 text-green-700' };
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'percentage': return <Percent className="w-4 h-4" />;
      case 'fixed': return <DollarSign className="w-4 h-4" />;
      case 'bogo': return <Gift className="w-4 h-4" />;
      case 'bundle': return <Package className="w-4 h-4" />;
      default: return <Tag className="w-4 h-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage': return 'Percentage Off';
      case 'fixed': return 'Fixed Amount';
      case 'bogo': return 'Buy One Get One';
      case 'bundle': return 'Bundle Deal';
      default: return type;
    }
  };

  const formatDiscountValue = (discount: Discount) => {
    switch (discount.type) {
      case 'percentage':
        return `${discount.value}% OFF`;
      case 'fixed':
        return `${formatCurrency(discount.value)} OFF`;
      case 'bogo':
        return 'Buy 1 Get 1 Free';
      case 'bundle':
        return `Bundle: ${formatCurrency(discount.value)}`;
      default:
        return discount.value.toString();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/merchant/apps/pos')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Discounts & Promotions</h1>
                <p className="text-sm text-gray-500">Create and manage discount codes</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setSelectedDiscount(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Discount
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Tag className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Discounts</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
                <p className="text-sm text-gray-500">Active Now</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalRedeemed}</p>
                <p className="text-sm text-gray-500">Times Redeemed</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSavings)}</p>
                <p className="text-sm text-gray-500">Total Savings</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search discounts by name or code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="expired">Expired</option>
                <option value="disabled">Disabled</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Types</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed Amount</option>
                <option value="bogo">BOGO</option>
                <option value="bundle">Bundle</option>
              </select>
            </div>
          </div>
        </div>

        {/* Discounts List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredDiscounts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Percent className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No discounts found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first discount to attract more customers'}
            </p>
            {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Discount
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredDiscounts.map((discount) => {
              const status = getDiscountStatus(discount);
              return (
                <div
                  key={discount.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        discount.type === 'percentage' ? 'bg-blue-100 text-blue-600' :
                        discount.type === 'fixed' ? 'bg-green-100 text-green-600' :
                        discount.type === 'bogo' ? 'bg-purple-100 text-purple-600' :
                        'bg-orange-100 text-orange-600'
                      }`}>
                        {getTypeIcon(discount.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{discount.name}</h3>
                          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color}`}>
                            {status.label}
                          </span>
                        </div>
                        {discount.code && (
                          <div className="flex items-center gap-2 mt-1">
                            <code className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-sm font-mono">
                              {discount.code}
                            </code>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(discount.code);
                              }}
                              className="p-1 hover:bg-gray-100 rounded"
                              title="Copy code"
                            >
                              <Copy className="w-3 h-3 text-gray-400" />
                            </button>
                          </div>
                        )}
                        {discount.description && (
                          <p className="text-sm text-gray-500 mt-1">{discount.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(discount.start_date).toLocaleDateString()} - {new Date(discount.end_date).toLocaleDateString()}
                          </span>
                          {discount.usage_limit > 0 && (
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              {discount.usage_count}/{discount.usage_limit} used
                            </span>
                          )}
                          {discount.min_purchase > 0 && (
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              Min: {formatCurrency(discount.min_purchase)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">
                          {formatDiscountValue(discount)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {getTypeLabel(discount.type)}
                        </p>
                      </div>

                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === discount.id ? null : discount.id)}
                          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>

                        {activeDropdown === discount.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={() => openEditModal(discount)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Edit2 className="w-4 h-4" />
                              Edit Discount
                            </button>
                            <button
                              onClick={() => handleDuplicateDiscount(discount)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <Copy className="w-4 h-4" />
                              Duplicate
                            </button>
                            <button
                              onClick={() => handleToggleActive(discount)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              {discount.is_active ? (
                                <>
                                  <ToggleLeft className="w-4 h-4" />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <ToggleRight className="w-4 h-4" />
                                  Enable
                                </>
                              )}
                            </button>
                            <hr className="my-1" />
                            <button
                              onClick={() => {
                                handleDeleteDiscount(discount.id);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar for Limited Discounts */}
                  {discount.usage_limit > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-500">Usage Progress</span>
                        <span className="text-gray-700 font-medium">
                          {Math.round((discount.usage_count / discount.usage_limit) * 100)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min((discount.usage_count / discount.usage_limit) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Discount Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">
                {selectedDiscount ? 'Edit Discount' : 'Create New Discount'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedDiscount(null);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  Basic Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Discount Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Summer Sale 20% Off"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Discount Code</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        placeholder="SUMMER20"
                      />
                      <button
                        type="button"
                        onClick={generateCode}
                        className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-sm"
                      >
                        Generate
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Discount Type *</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="percentage">Percentage Off</option>
                      <option value="fixed">Fixed Amount Off</option>
                      <option value="bogo">Buy One Get One</option>
                      <option value="bundle">Bundle Deal</option>
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                      placeholder="Brief description of this discount..."
                    />
                  </div>
                </div>
              </div>

              {/* Discount Value */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Percent className="w-4 h-4" />
                  Discount Value
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      {formData.type === 'percentage' ? 'Percentage (%)' : 'Amount (SLE)'} *
                    </label>
                    <input
                      type="number"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.type === 'percentage' ? '20' : '5000'}
                      min="0"
                      max={formData.type === 'percentage' ? 100 : undefined}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Minimum Purchase (SLE)</label>
                    <input
                      type="number"
                      value={formData.min_purchase}
                      onChange={(e) => setFormData({ ...formData, min_purchase: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                  {formData.type === 'percentage' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Maximum Discount (SLE)</label>
                      <input
                        type="number"
                        value={formData.max_discount}
                        onChange={(e) => setFormData({ ...formData, max_discount: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0 for no limit"
                        min="0"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Validity Period */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Validity Period
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Start Date *</label>
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">End Date *</label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Usage Limits */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Usage Limits
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Total Usage Limit</label>
                    <input
                      type="number"
                      value={formData.usage_limit}
                      onChange={(e) => setFormData({ ...formData, usage_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0 for unlimited"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Per Customer Limit</label>
                    <input
                      type="number"
                      value={formData.per_customer_limit}
                      onChange={(e) => setFormData({ ...formData, per_customer_limit: parseInt(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0 for unlimited"
                      min="0"
                    />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-900">Active Status</p>
                  <p className="text-sm text-gray-500">Enable or disable this discount</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.is_active ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedDiscount(null);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={selectedDiscount ? handleUpdateDiscount : handleAddDiscount}
                disabled={!formData.name || !formData.start_date || !formData.end_date}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedDiscount ? 'Update Discount' : 'Create Discount'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-10"
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
}
