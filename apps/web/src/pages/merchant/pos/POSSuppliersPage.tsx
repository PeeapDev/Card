/**
 * POS Suppliers Page
 * Manage suppliers - suppliers must be platform users
 * Creates messaging relationship between merchant and supplier
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Truck,
  Phone,
  Mail,
  MapPin,
  Package,
  DollarSign,
  Calendar,
  FileText,
  Edit2,
  Trash2,
  Eye,
  Building2,
  CreditCard,
  Clock,
  CheckCircle,
  X,
  MessageSquare,
  User,
  Loader2,
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

interface Supplier {
  id: string;
  merchant_id: string;
  user_id: string; // Platform user ID
  name: string;
  business_name?: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  country: string;
  tax_id: string;
  payment_terms: string;
  credit_limit: number;
  current_balance: number;
  bank_name: string;
  bank_account: string;
  notes: string;
  status: 'active' | 'inactive' | 'blocked';
  total_orders: number;
  total_spent: number;
  last_order_date: string;
  created_at: string;
  updated_at: string;
  avatar_url?: string;
}

interface PlatformUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  phone_number?: string;
  avatar_url?: string;
  business_name?: string;
  role?: string;
}

export function POSSuppliersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  // User search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlatformUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    payment_terms: 'NET30',
    credit_limit: 0,
    bank_name: '',
    bank_account: '',
    notes: '',
    tax_id: '',
  });

  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalOwed: 0,
    ordersThisMonth: 0
  });

  const merchantId = user?.id;

  useEffect(() => {
    if (merchantId) {
      loadSuppliers();
    }
  }, [merchantId]);

  useEffect(() => {
    filterSuppliers();
  }, [suppliers, searchQuery, statusFilter]);

  const loadSuppliers = async () => {
    if (!merchantId) return;

    try {
      setLoading(true);

      const { data, error } = await supabaseAdmin
        .from('pos_suppliers')
        .select('*')
        .eq('merchant_id', merchantId)
        .order('name', { ascending: true });

      if (error) throw error;

      const suppliersData = data || [];
      setSuppliers(suppliersData);
      updateStats(suppliersData);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (suppliersData: Supplier[]) => {
    const active = suppliersData.filter(s => s.status === 'active').length;
    const totalOwed = suppliersData.reduce((sum, s) => sum + (s.current_balance || 0), 0);

    setStats({
      total: suppliersData.length,
      active,
      totalOwed,
      ordersThisMonth: 0
    });
  };

  const filterSuppliers = () => {
    let filtered = [...suppliers];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(query) ||
        s.contact_person?.toLowerCase().includes(query) ||
        s.email?.toLowerCase().includes(query) ||
        s.phone?.includes(query) ||
        s.business_name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter);
    }

    setFilteredSuppliers(filtered);
  };

  // Search for platform users
  const searchUsers = useCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearchingUsers(true);

      const { data, error } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, phone_number, avatar_url, business_name, role')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%,business_name.ilike.%${query}%`)
        .neq('id', merchantId) // Exclude self
        .limit(10);

      if (error) throw error;

      // Filter out users who are already suppliers
      const existingSupplierIds = suppliers.map(s => s.user_id);
      const filtered = (data || []).filter(u => !existingSupplierIds.includes(u.id));

      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchingUsers(false);
    }
  }, [merchantId, suppliers]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  const handleAddSupplier = async () => {
    if (!selectedUser || !merchantId) return;

    try {
      const supplierData = {
        merchant_id: merchantId,
        user_id: selectedUser.id,
        name: selectedUser.full_name,
        business_name: selectedUser.business_name,
        contact_person: selectedUser.full_name,
        email: selectedUser.email,
        phone: selectedUser.phone || selectedUser.phone_number || '',
        address: '',
        city: '',
        country: 'Sierra Leone',
        tax_id: formData.tax_id,
        payment_terms: formData.payment_terms,
        credit_limit: formData.credit_limit,
        current_balance: 0,
        bank_name: formData.bank_name,
        bank_account: formData.bank_account,
        notes: formData.notes,
        status: 'active',
        total_orders: 0,
        total_spent: 0,
        avatar_url: selectedUser.avatar_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabaseAdmin
        .from('pos_suppliers')
        .insert(supplierData);

      if (error) throw error;

      // Create messaging relationship
      await createMessagingRelationship(selectedUser.id);

      setShowAddModal(false);
      resetForm();
      loadSuppliers();
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('Failed to add supplier. Please try again.');
    }
  };

  const createMessagingRelationship = async (supplierId: string) => {
    try {
      // Check if conversation already exists
      const { data: existing } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .or(`and(participant_one.eq.${merchantId},participant_two.eq.${supplierId}),and(participant_one.eq.${supplierId},participant_two.eq.${merchantId})`)
        .single();

      if (existing) return; // Conversation already exists

      // Create new conversation
      const { data: convo, error: convoError } = await supabaseAdmin
        .from('conversations')
        .insert({
          participant_one: merchantId,
          participant_two: supplierId,
          conversation_type: 'supplier',
          metadata: {
            relationship: 'merchant_supplier',
            created_from: 'pos_suppliers',
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (convoError) throw convoError;

      // Send welcome message
      if (convo) {
        await supabaseAdmin.from('messages').insert({
          conversation_id: convo.id,
          sender_id: merchantId,
          content: `Hello! I've added you as a supplier in my POS system. Looking forward to doing business with you!`,
          message_type: 'text',
          created_at: new Date().toISOString(),
        });

        await supabaseAdmin
          .from('conversations')
          .update({
            last_message: `Hello! I've added you as a supplier...`,
            last_message_at: new Date().toISOString(),
          })
          .eq('id', convo.id);
      }
    } catch (error) {
      console.error('Error creating messaging relationship:', error);
    }
  };

  const handleDeleteSupplier = async (supplierId: string) => {
    if (!confirm('Are you sure you want to remove this supplier?')) return;

    try {
      const { error } = await supabaseAdmin
        .from('pos_suppliers')
        .update({
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', supplierId);

      if (error) throw error;
      loadSuppliers();
    } catch (error) {
      console.error('Error removing supplier:', error);
      alert('Failed to remove supplier. Please try again.');
    }
  };

  const openChat = async (supplier: Supplier) => {
    try {
      // Find or create conversation
      const { data: existing } = await supabaseAdmin
        .from('conversations')
        .select('id')
        .or(`and(participant_one.eq.${merchantId},participant_two.eq.${supplier.user_id}),and(participant_one.eq.${supplier.user_id},participant_two.eq.${merchantId})`)
        .single();

      if (existing) {
        navigate(`/messages?conversation=${existing.id}`);
      } else {
        await createMessagingRelationship(supplier.user_id);
        navigate('/messages');
      }
    } catch (error) {
      console.error('Error opening chat:', error);
      navigate('/messages');
    }
  };

  const resetForm = () => {
    setSelectedUser(null);
    setUserSearchQuery('');
    setSearchResults([]);
    setFormData({
      payment_terms: 'NET30',
      credit_limit: 0,
      bank_name: '',
      bank_account: '',
      notes: '',
      tax_id: '',
    });
  };

  const formatCurrency = (amount: number) => {
    return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'inactive': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400';
      case 'blocked': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPaymentTermsLabel = (terms: string) => {
    switch (terms) {
      case 'COD': return 'Cash on Delivery';
      case 'NET15': return 'Net 15 Days';
      case 'NET30': return 'Net 30 Days';
      case 'NET60': return 'Net 60 Days';
      case 'NET90': return 'Net 90 Days';
      case 'PREPAID': return 'Prepaid';
      default: return terms;
    }
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
              onClick={() => navigate('/merchant/apps/pos')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Suppliers</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Manage vendors and suppliers
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Supplier
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Suppliers</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.active}</p>
                <p className="text-sm text-gray-500">Active</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <DollarSign className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalOwed)}</p>
                <p className="text-sm text-gray-500">Outstanding</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                <Package className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.ordersThisMonth}</p>
                <p className="text-sm text-gray-500">Orders This Month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
          </div>
        </div>

        {/* Suppliers List */}
        {filteredSuppliers.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No suppliers found</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first supplier to start managing procurement'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {supplier.avatar_url ? (
                      <img
                        src={supplier.avatar_url}
                        alt={supplier.name}
                        className="w-12 h-12 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">
                        {supplier.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{supplier.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(supplier.status)}`}>
                          {supplier.status}
                        </span>
                      </div>
                      {supplier.business_name && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">{supplier.business_name}</p>
                      )}
                      <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                        {supplier.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-4 h-4" />
                            {supplier.phone}
                          </span>
                        )}
                        {supplier.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {supplier.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Outstanding</p>
                      <p className={`text-lg font-bold ${supplier.current_balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        {formatCurrency(supplier.current_balance || 0)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openChat(supplier)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-blue-600"
                        title="Message supplier"
                      >
                        <MessageSquare className="w-5 h-5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === supplier.id ? null : supplier.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <MoreVertical className="w-5 h-5 text-gray-400" />
                        </button>

                        {activeDropdown === supplier.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                            <button
                              onClick={() => {
                                setSelectedSupplier(supplier);
                                setShowViewModal(true);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            <button
                              onClick={() => {
                                openChat(supplier);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Send Message
                            </button>
                            <hr className="my-1 border-gray-200 dark:border-gray-700" />
                            <button
                              onClick={() => {
                                handleDeleteSupplier(supplier.id);
                                setActiveDropdown(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Info */}
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-500">
                    <Clock className="w-4 h-4" />
                    <span>Terms: {getPaymentTermsLabel(supplier.payment_terms)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <Package className="w-4 h-4" />
                    <span>{supplier.total_orders || 0} Orders</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500">
                    <DollarSign className="w-4 h-4" />
                    <span>Total: {formatCurrency(supplier.total_spent || 0)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add Supplier</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* User Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Search Platform Users
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Suppliers must be registered users on the platform
                </p>

                {!selectedUser ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search by name, email, phone, or business..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                      {searchingUsers && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                      )}
                    </div>

                    {/* Search Results */}
                    {searchResults.length > 0 && (
                      <div className="mt-2 border border-gray-200 dark:border-gray-600 rounded-lg divide-y divide-gray-200 dark:divide-gray-600 max-h-60 overflow-y-auto">
                        {searchResults.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => {
                              setSelectedUser(u);
                              setUserSearchQuery('');
                              setSearchResults([]);
                            }}
                            className="w-full p-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left"
                          >
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt={u.full_name} className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center">
                                <User className="w-5 h-5 text-gray-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">{u.full_name}</p>
                              <p className="text-sm text-gray-500 truncate">{u.email}</p>
                              {u.business_name && (
                                <p className="text-xs text-gray-400">{u.business_name}</p>
                              )}
                            </div>
                            {u.role && (
                              <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-600 rounded-full text-gray-600 dark:text-gray-300">
                                {u.role}
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    )}

                    {userSearchQuery.length >= 2 && !searchingUsers && searchResults.length === 0 && (
                      <p className="mt-2 text-sm text-gray-500 text-center py-4">
                        No users found matching "{userSearchQuery}"
                      </p>
                    )}
                  </>
                ) : (
                  <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    {selectedUser.avatar_url ? (
                      <img src={selectedUser.avatar_url} alt={selectedUser.full_name} className="w-12 h-12 rounded-full object-cover" />
                    ) : (
                      <div className="w-12 h-12 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-gray-900 dark:text-white">{selectedUser.full_name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{selectedUser.email}</p>
                      {selectedUser.phone && (
                        <p className="text-xs text-gray-500">{selectedUser.phone}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="p-1 hover:bg-green-100 dark:hover:bg-green-800 rounded"
                    >
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Additional Details */}
              {selectedUser && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Payment Terms
                      </label>
                      <select
                        value={formData.payment_terms}
                        onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="COD">Cash on Delivery</option>
                        <option value="PREPAID">Prepaid</option>
                        <option value="NET15">Net 15 Days</option>
                        <option value="NET30">Net 30 Days</option>
                        <option value="NET60">Net 60 Days</option>
                        <option value="NET90">Net 90 Days</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Credit Limit (NLe)
                      </label>
                      <input
                        type="number"
                        value={formData.credit_limit}
                        onChange={(e) => setFormData({ ...formData, credit_limit: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        min="0"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Notes (optional)
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      rows={3}
                      placeholder="Additional notes about this supplier..."
                    />
                  </div>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900 dark:text-blue-300">Messaging Enabled</p>
                        <p className="text-sm text-blue-700 dark:text-blue-400">
                          A chat conversation will be created with this supplier so you can communicate directly.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                Cancel
              </button>
              <Button
                onClick={handleAddSupplier}
                disabled={!selectedUser}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Supplier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Supplier Modal */}
      {showViewModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {selectedSupplier.avatar_url ? (
                  <img src={selectedSupplier.avatar_url} alt={selectedSupplier.name} className="w-14 h-14 rounded-xl object-cover" />
                ) : (
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                    {selectedSupplier.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white">{selectedSupplier.name}</h2>
                  <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor(selectedSupplier.status)}`}>
                    {selectedSupplier.status}
                  </span>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedSupplier(null);
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {selectedSupplier.phone && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.phone}</p>
                    </div>
                  </div>
                )}
                {selectedSupplier.email && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white truncate">{selectedSupplier.email}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(selectedSupplier.current_balance || 0)}
                  </p>
                  <p className="text-sm text-orange-700 dark:text-orange-400">Outstanding</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(selectedSupplier.credit_limit || 0)}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">Credit Limit</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(selectedSupplier.total_spent || 0)}
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">Total Spent</p>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Payment Terms</p>
                    <p className="font-medium text-gray-900 dark:text-white">{getPaymentTermsLabel(selectedSupplier.payment_terms)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Total Orders</p>
                    <p className="font-medium text-gray-900 dark:text-white">{selectedSupplier.total_orders || 0}</p>
                  </div>
                </div>
              </div>

              {selectedSupplier.notes && (
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notes</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSupplier.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => openChat(selectedSupplier)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Message
              </Button>
              <button
                onClick={() => {
                  setShowViewModal(false);
                  setSelectedSupplier(null);
                }}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Close
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
    </MerchantLayout>
  );
}

export default POSSuppliersPage;
