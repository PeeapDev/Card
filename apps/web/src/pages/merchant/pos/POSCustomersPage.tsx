/**
 * POS Customers Page - Customer Management (CRM)
 *
 * Features:
 * - Customer profiles with contact details
 * - Purchase history tracking
 * - Credit limits and balances
 * - Customer-specific pricing
 * - Search and filtering
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  Search,
  Plus,
  Edit2,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  ShoppingBag,
  X,
  Check,
  Loader2,
  ArrowLeft,
  DollarSign,
  Calendar,
  AlertCircle,
  UserPlus,
  History,
  Ban,
  CheckCircle,
  ChevronRight,
  Filter,
  Download,
  Upload,
} from 'lucide-react';

interface Customer {
  id: string;
  merchant_id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  credit_limit: number;
  credit_balance: number;
  total_purchases: number;
  total_spent: number;
  last_purchase_date?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CustomerFormData {
  name: string;
  phone: string;
  email: string;
  address: string;
  credit_limit: number;
  notes: string;
}

const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function POSCustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'with_credit'>('all');

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    phone: '',
    email: '',
    address: '',
    credit_limit: 0,
    notes: '',
  });

  // Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    totalCredit: 0,
    totalSpent: 0,
  });

  useEffect(() => {
    if (user?.id) {
      loadCustomers();
    }
  }, [user]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchQuery, filterStatus]);

  const loadCustomers = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabaseAdmin
        .from('pos_customers')
        .select('*')
        .eq('merchant_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;

      setCustomers(data || []);

      // Calculate stats
      const active = data?.filter(c => c.is_active) || [];
      setStats({
        totalCustomers: data?.length || 0,
        activeCustomers: active.length,
        totalCredit: data?.reduce((sum, c) => sum + (c.credit_balance || 0), 0) || 0,
        totalSpent: data?.reduce((sum, c) => sum + (c.total_spent || 0), 0) || 0,
      });
    } catch (error) {
      console.error('Error loading customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(query) ||
        c.phone?.toLowerCase().includes(query) ||
        c.email?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus === 'active') {
      filtered = filtered.filter(c => c.is_active);
    } else if (filterStatus === 'inactive') {
      filtered = filtered.filter(c => !c.is_active);
    } else if (filterStatus === 'with_credit') {
      filtered = filtered.filter(c => c.credit_balance > 0);
    }

    setFilteredCustomers(filtered);
  };

  const handleAddCustomer = async () => {
    if (!user?.id || !formData.name.trim()) return;

    try {
      setSaving(true);
      const { data, error } = await supabaseAdmin
        .from('pos_customers')
        .insert({
          merchant_id: user.id,
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          credit_limit: formData.credit_limit || 0,
          credit_balance: 0,
          total_purchases: 0,
          total_spent: 0,
          notes: formData.notes.trim() || null,
          is_active: true,
        })
        .select()
        .single();

      if (error) throw error;

      setCustomers([...customers, data]);
      setShowAddModal(false);
      resetForm();
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Failed to add customer');
    } finally {
      setSaving(false);
    }
  };

  const handleEditCustomer = async () => {
    if (!selectedCustomer || !formData.name.trim()) return;

    try {
      setSaving(true);
      const { data, error } = await supabaseAdmin
        .from('pos_customers')
        .update({
          name: formData.name.trim(),
          phone: formData.phone.trim() || null,
          email: formData.email.trim() || null,
          address: formData.address.trim() || null,
          credit_limit: formData.credit_limit || 0,
          notes: formData.notes.trim() || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', selectedCustomer.id)
        .select()
        .single();

      if (error) throw error;

      setCustomers(customers.map(c => c.id === selectedCustomer.id ? data : c));
      setShowEditModal(false);
      resetForm();
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Failed to update customer');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;

    try {
      setSaving(true);
      // Soft delete - just mark as inactive
      const { error } = await supabaseAdmin
        .from('pos_customers')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', selectedCustomer.id);

      if (error) throw error;

      setCustomers(customers.map(c =>
        c.id === selectedCustomer.id ? { ...c, is_active: false } : c
      ));
      setShowDeleteModal(false);
      setSelectedCustomer(null);
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Failed to delete customer');
    } finally {
      setSaving(false);
    }
  };

  const handleReactivateCustomer = async (customer: Customer) => {
    try {
      const { error } = await supabaseAdmin
        .from('pos_customers')
        .update({ is_active: true, updated_at: new Date().toISOString() })
        .eq('id', customer.id);

      if (error) throw error;

      setCustomers(customers.map(c =>
        c.id === customer.id ? { ...c, is_active: true } : c
      ));
    } catch (error) {
      console.error('Error reactivating customer:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      credit_limit: 0,
      notes: '',
    });
    setSelectedCustomer(null);
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      credit_limit: customer.credit_limit,
      notes: customer.notes || '',
    });
    setShowEditModal(true);
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/merchant/apps/pos')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customers</h1>
              <p className="text-gray-500 dark:text-gray-400">Manage your customer base</p>
            </div>
          </div>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalCustomers}</p>
                <p className="text-sm text-gray-500">Total Customers</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeCustomers}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalCredit)}</p>
                <p className="text-sm text-gray-500">Outstanding Credit</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalSpent)}</p>
                <p className="text-sm text-gray-500">Total Revenue</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search customers..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800"
              >
                <option value="all">All Customers</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive</option>
                <option value="with_credit">With Credit</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Customer List */}
        <Card className="overflow-hidden">
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                {searchQuery ? 'No customers found matching your search' : 'No customers yet'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setShowAddModal(true)}>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Your First Customer
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Purchases</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Total Spent</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Credit</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredCustomers.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                            <span className="text-primary-600 font-semibold">
                              {customer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                            {customer.last_purchase_date && (
                              <p className="text-xs text-gray-500">
                                Last: {new Date(customer.last_purchase_date).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {customer.phone && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {customer.phone}
                            </p>
                          )}
                          {customer.email && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1">
                              <Mail className="w-3 h-3" /> {customer.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">{customer.total_purchases}</p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(customer.total_spent)}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {customer.credit_balance > 0 ? (
                          <p className="font-medium text-orange-600">{formatCurrency(customer.credit_balance)}</p>
                        ) : (
                          <p className="text-gray-400">-</p>
                        )}
                        <p className="text-xs text-gray-500">Limit: {formatCurrency(customer.credit_limit)}</p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {customer.is_active ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                            <CheckCircle className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                            <Ban className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEditModal(customer)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          {customer.is_active ? (
                            <button
                              onClick={() => {
                                setSelectedCustomer(customer);
                                setShowDeleteModal(true);
                              }}
                              className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-600"
                              title="Deactivate"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivateCustomer(customer)}
                              className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg text-green-600"
                              title="Reactivate"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Add Customer Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Add New Customer</h2>
                <button onClick={() => { setShowAddModal(false); resetForm(); }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Customer name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="+232..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Street address"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credit Limit (Le)</label>
                  <input
                    type="number"
                    value={formData.credit_limit}
                    onChange={e => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowAddModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleAddCustomer} disabled={saving || !formData.name.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Add Customer
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Edit Customer Modal */}
        {showEditModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Edit Customer</h2>
                <button onClick={() => { setShowEditModal(false); resetForm(); }} className="p-1 hover:bg-gray-100 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Credit Limit (Le)</label>
                  <input
                    type="number"
                    value={formData.credit_limit}
                    onChange={e => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500"
                    rows={2}
                  />
                </div>
              </div>
              <div className="p-4 border-t flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowEditModal(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button onClick={handleEditCustomer} disabled={saving || !formData.name.trim()}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                  Save Changes
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedCustomer && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md">
              <div className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Deactivate Customer?</h3>
                <p className="text-gray-500 mb-6">
                  Are you sure you want to deactivate <strong>{selectedCustomer.name}</strong>?
                  They won't appear in the POS terminal but their history will be preserved.
                </p>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => { setShowDeleteModal(false); setSelectedCustomer(null); }}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteCustomer}
                    disabled={saving}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Ban className="w-4 h-4 mr-2" />}
                    Deactivate
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

export default POSCustomersPage;
