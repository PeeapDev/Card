import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Search,
  Filter,
  MoreVertical,
  FileText,
  Truck,
  Package,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Eye,
  Edit2,
  Trash2,
  Printer,
  Download,
  X,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { supabaseAdmin } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  getPurchaseOrders as getOfflinePurchaseOrders,
  savePurchaseOrders as saveOfflinePurchaseOrders,
  savePurchaseOrder as saveOfflinePurchaseOrder,
  deletePurchaseOrder as deleteOfflinePurchaseOrder,
  type OfflinePurchaseOrder
} from '@/services/indexeddb.service';

interface PurchaseOrder {
  id: string;
  business_id: string;
  supplier_id: string;
  supplier_name: string;
  order_number: string;
  order_date: string;
  expected_date: string;
  received_date: string | null;
  status: 'draft' | 'sent' | 'confirmed' | 'partial' | 'received' | 'cancelled';
  subtotal: number;
  tax_amount: number;
  shipping_cost: number;
  total_amount: number;
  notes: string;
  items: PurchaseOrderItem[];
  created_at: string;
  updated_at: string;
}

interface PurchaseOrderItem {
  id: string;
  product_id: string;
  product_name: string;
  sku: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost: number;
  total: number;
}

interface Supplier {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  cost_price: number;
  stock_quantity: number;
}

export function POSPurchaseOrdersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    totalValue: 0,
    dueThisWeek: 0
  });

  // Form state
  const [formData, setFormData] = useState({
    supplier_id: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_date: '',
    notes: '',
    shipping_cost: 0,
    items: [] as { product_id: string; product_name: string; sku: string; quantity: number; unit_cost: number }[]
  });

  useEffect(() => {
    if (user?.id) {
      loadOrders();
      loadSuppliers();
      loadProducts();
    }
  }, [user?.id]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, statusFilter]);

  const loadOrders = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // First, try to load from IndexedDB with timeout (non-blocking)
      const cachePromise = getOfflinePurchaseOrders(user.id)
        .then(cached => {
          if (cached.length > 0) {
            setOrders(cached as unknown as PurchaseOrder[]);
            updateStats(cached as unknown as PurchaseOrder[]);
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
        .from('pos_purchase_orders')
        .select('*')
        .eq('merchant_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const ordersData = data || [];
      setOrders(ordersData);
      updateStats(ordersData);

      // Save to IndexedDB in background (non-blocking)
      if (ordersData.length > 0) {
        saveOfflinePurchaseOrders(ordersData as unknown as OfflinePurchaseOrder[], user.id).catch(() => {});
      }

    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = (ordersData: PurchaseOrder[]) => {
    const pending = ordersData.filter(o => ['draft', 'sent', 'confirmed', 'partial'].includes(o.status)).length;
    const totalValue = ordersData.reduce((sum, o) => sum + (o.total_amount || 0), 0);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const dueThisWeek = ordersData.filter(o => {
      const expected = new Date(o.expected_date);
      return expected >= now && expected <= weekFromNow && !['received', 'cancelled'].includes(o.status);
    }).length;

    setStats({
      total: ordersData.length,
      pending,
      totalValue,
      dueThisWeek
    });
  };

  const loadSuppliers = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabaseAdmin
        .from('pos_suppliers')
        .select('id, name, contact_person, email, phone')
        .eq('merchant_id', user.id)
        .eq('status', 'active');

      setSuppliers(data || []);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadProducts = async () => {
    if (!user?.id) return;

    try {
      const { data } = await supabaseAdmin
        .from('pos_products')
        .select('id, name, sku, cost_price, stock_quantity')
        .eq('merchant_id', user.id)
        .eq('is_active', true);

      setProducts(data || []);
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const filterOrders = () => {
    let filtered = [...orders];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(o =>
        o.order_number?.toLowerCase().includes(query) ||
        o.supplier_name?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(o => o.status === statusFilter);
    }

    setFilteredOrders(filtered);
  };

  const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${year}${month}-${random}`;
  };

  const handleCreateOrder = async () => {
    try {
      const supplier = suppliers.find(s => s.id === formData.supplier_id);
      const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
      const taxAmount = subtotal * 0.15; // 15% GST
      const totalAmount = subtotal + taxAmount + formData.shipping_cost;

      const orderData = {
        merchant_id: user?.id,
        supplier_id: formData.supplier_id,
        supplier_name: supplier?.name || '',
        order_number: generateOrderNumber(),
        order_date: formData.order_date,
        expected_date: formData.expected_date,
        status: 'draft',
        subtotal,
        tax_amount: taxAmount,
        shipping_cost: formData.shipping_cost,
        total_amount: totalAmount,
        notes: formData.notes,
        items: formData.items.map(item => ({
          ...item,
          quantity_ordered: item.quantity,
          quantity_received: 0,
          total: item.quantity * item.unit_cost
        })),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabaseAdmin
        .from('pos_purchase_orders')
        .insert(orderData)
        .select()
        .single();

      if (error) throw error;

      // Save to IndexedDB for offline access
      if (data) {
        await saveOfflinePurchaseOrder(data as unknown as OfflinePurchaseOrder);
      }

      setShowAddModal(false);
      resetForm();
      loadOrders();
    } catch (error) {
      console.error('Error creating order:', error);
      alert('Failed to create purchase order. Please try again.');
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (newStatus === 'received') {
        updateData.received_date = new Date().toISOString();
      }

      const { data, error } = await supabaseAdmin
        .from('pos_purchase_orders')
        .update(updateData)
        .eq('id', orderId)
        .select()
        .single();

      if (error) throw error;

      // Update in IndexedDB
      if (data) {
        await saveOfflinePurchaseOrder(data as unknown as OfflinePurchaseOrder);
      }

      loadOrders();
    } catch (error) {
      console.error('Error updating order status:', error);
    }
    setActiveDropdown(null);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to delete this purchase order?')) return;

    try {
      const { error } = await supabaseAdmin
        .from('pos_purchase_orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      // Delete from IndexedDB
      await deleteOfflinePurchaseOrder(orderId);

      loadOrders();
    } catch (error) {
      console.error('Error deleting order:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
      expected_date: '',
      notes: '',
      shipping_cost: 0,
      items: []
    });
  };

  const addItemToOrder = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product_id: '', product_name: '', sku: '', quantity: 1, unit_cost: 0 }]
    });
  };

  const updateOrderItem = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    if (field === 'product_id') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          product_id: value,
          product_name: product.name,
          sku: product.sku || '',
          unit_cost: product.cost_price || 0
        };
      }
    } else {
      (newItems[index] as any)[field] = value;
    }
    setFormData({ ...formData, items: newItems });
  };

  const removeOrderItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const toggleOrderExpand = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-SL', {
      style: 'currency',
      currency: 'SLE',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'draft': return { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText };
      case 'sent': return { label: 'Sent', color: 'bg-blue-100 text-blue-700', icon: Send };
      case 'confirmed': return { label: 'Confirmed', color: 'bg-purple-100 text-purple-700', icon: CheckCircle };
      case 'partial': return { label: 'Partial', color: 'bg-yellow-100 text-yellow-700', icon: AlertCircle };
      case 'received': return { label: 'Received', color: 'bg-green-100 text-green-700', icon: Package };
      case 'cancelled': return { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle };
      default: return { label: status, color: 'bg-gray-100 text-gray-700', icon: FileText };
    }
  };

  const calculateFormTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    const tax = subtotal * 0.15;
    return {
      subtotal,
      tax,
      total: subtotal + tax + formData.shipping_cost
    };
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
                <h1 className="text-xl font-bold text-gray-900">Purchase Orders</h1>
                <p className="text-sm text-gray-500">Manage procurement and stock orders</p>
              </div>
            </div>
            <button
              onClick={() => {
                resetForm();
                setSelectedOrder(null);
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Order
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
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Total Orders</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalValue)}</p>
                <p className="text-sm text-gray-500">Total Value</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Truck className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.dueThisWeek}</p>
                <p className="text-sm text-gray-500">Due This Week</p>
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
                placeholder="Search by order number or supplier..."
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
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="confirmed">Confirmed</option>
                <option value="partial">Partial</option>
                <option value="received">Received</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Orders List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
            <p className="text-gray-500 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Create your first purchase order to track inventory procurement'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={() => {
                  resetForm();
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Purchase Order
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const statusConfig = getStatusConfig(order.status);
              const StatusIcon = statusConfig.icon;
              const isExpanded = expandedOrders.has(order.id);

              return (
                <div
                  key={order.id}
                  className="bg-white rounded-xl border border-gray-200 overflow-hidden"
                >
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                          <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{order.order_number}</h3>
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center gap-1 ${statusConfig.color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            <Truck className="w-4 h-4 inline mr-1" />
                            {order.supplier_name}
                          </p>
                          <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              Ordered: {new Date(order.order_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              Expected: {new Date(order.expected_date).toLocaleDateString()}
                            </span>
                            <span className="flex items-center gap-1">
                              <Package className="w-4 h-4" />
                              {order.items?.length || 0} items
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-start gap-4">
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            {formatCurrency(order.total_amount)}
                          </p>
                          <p className="text-xs text-gray-500">Total Amount</p>
                        </div>

                        <div className="relative">
                          <button
                            onClick={() => setActiveDropdown(activeDropdown === order.id ? null : order.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                          >
                            <MoreVertical className="w-5 h-5 text-gray-400" />
                          </button>

                          {activeDropdown === order.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                              <button
                                onClick={() => {
                                  setSelectedOrder(order);
                                  setShowViewModal(true);
                                  setActiveDropdown(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              {order.status === 'draft' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'sent')}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Send className="w-4 h-4" />
                                  Send to Supplier
                                </button>
                              )}
                              {order.status === 'sent' && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'confirmed')}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Confirmed
                                </button>
                              )}
                              {['confirmed', 'partial'].includes(order.status) && (
                                <button
                                  onClick={() => handleUpdateStatus(order.id, 'received')}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                >
                                  <Package className="w-4 h-4" />
                                  Mark Received
                                </button>
                              )}
                              <button
                                onClick={() => {}}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <Printer className="w-4 h-4" />
                                Print Order
                              </button>
                              {order.status === 'draft' && (
                                <>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => {
                                      handleDeleteOrder(order.id);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                  </button>
                                </>
                              )}
                              {!['received', 'cancelled', 'draft'].includes(order.status) && (
                                <>
                                  <hr className="my-1" />
                                  <button
                                    onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                  >
                                    <XCircle className="w-4 h-4" />
                                    Cancel Order
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expand/Collapse Items */}
                    <button
                      onClick={() => toggleOrderExpand(order.id)}
                      className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Hide Items
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Show {order.items?.length || 0} Items
                        </>
                      )}
                    </button>
                  </div>

                  {/* Expanded Items List */}
                  {isExpanded && order.items && (
                    <div className="border-t border-gray-100 bg-gray-50 p-4">
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase">
                            <th className="text-left py-2">Product</th>
                            <th className="text-center py-2">Ordered</th>
                            <th className="text-center py-2">Received</th>
                            <th className="text-right py-2">Unit Cost</th>
                            <th className="text-right py-2">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map((item, idx) => (
                            <tr key={idx} className="border-t border-gray-200">
                              <td className="py-2">
                                <p className="font-medium text-gray-900">{item.product_name}</p>
                                {item.sku && <p className="text-xs text-gray-500">SKU: {item.sku}</p>}
                              </td>
                              <td className="py-2 text-center">{item.quantity_ordered}</td>
                              <td className="py-2 text-center">{item.quantity_received}</td>
                              <td className="py-2 text-right">{formatCurrency(item.unit_cost)}</td>
                              <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="border-t border-gray-300">
                          <tr>
                            <td colSpan={4} className="py-2 text-right text-sm text-gray-500">Subtotal:</td>
                            <td className="py-2 text-right font-medium">{formatCurrency(order.subtotal)}</td>
                          </tr>
                          <tr>
                            <td colSpan={4} className="py-1 text-right text-sm text-gray-500">Tax (15%):</td>
                            <td className="py-1 text-right">{formatCurrency(order.tax_amount)}</td>
                          </tr>
                          <tr>
                            <td colSpan={4} className="py-1 text-right text-sm text-gray-500">Shipping:</td>
                            <td className="py-1 text-right">{formatCurrency(order.shipping_cost)}</td>
                          </tr>
                          <tr>
                            <td colSpan={4} className="py-2 text-right font-medium">Total:</td>
                            <td className="py-2 text-right text-lg font-bold text-blue-600">{formatCurrency(order.total_amount)}</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-bold text-gray-900">Create Purchase Order</h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Supplier Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Supplier *</label>
                <select
                  value={formData.supplier_id}
                  onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a supplier</option>
                  {suppliers.map(supplier => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name} {supplier.contact_person ? `(${supplier.contact_person})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Order Date</label>
                  <input
                    type="date"
                    value={formData.order_date}
                    onChange={(e) => setFormData({ ...formData, order_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Expected Delivery *</label>
                  <input
                    type="date"
                    value={formData.expected_date}
                    onChange={(e) => setFormData({ ...formData, expected_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">Order Items</label>
                  <button
                    type="button"
                    onClick={addItemToOrder}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {formData.items.length === 0 ? (
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                    <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 mb-2">No items added yet</p>
                    <button
                      type="button"
                      onClick={addItemToOrder}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Add your first item
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.items.map((item, index) => (
                      <div key={index} className="p-4 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-12 gap-3">
                          <div className="col-span-5">
                            <label className="block text-xs text-gray-500 mb-1">Product</label>
                            <select
                              value={item.product_id}
                              onChange={(e) => updateOrderItem(index, 'product_id', e.target.value)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Select product</option>
                              {products.map(product => (
                                <option key={product.id} value={product.id}>
                                  {product.name} (Stock: {product.stock_quantity})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateOrderItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="1"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Unit Cost</label>
                            <input
                              type="number"
                              value={item.unit_cost}
                              onChange={(e) => updateOrderItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              min="0"
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs text-gray-500 mb-1">Total</label>
                            <div className="px-2 py-1.5 text-sm bg-gray-100 rounded-lg font-medium">
                              {formatCurrency(item.quantity * item.unit_cost)}
                            </div>
                          </div>
                          <div className="col-span-1 flex items-end">
                            <button
                              type="button"
                              onClick={() => removeOrderItem(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Shipping Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shipping Cost (SLE)</label>
                <input
                  type="number"
                  value={formData.shipping_cost}
                  onChange={(e) => setFormData({ ...formData, shipping_cost: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={3}
                  placeholder="Additional notes for this order..."
                />
              </div>

              {/* Order Summary */}
              {formData.items.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-xl">
                  <h4 className="font-medium text-gray-900 mb-3">Order Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Subtotal:</span>
                      <span>{formatCurrency(calculateFormTotal().subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Tax (15%):</span>
                      <span>{formatCurrency(calculateFormTotal().tax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Shipping:</span>
                      <span>{formatCurrency(formData.shipping_cost)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-gray-200 font-medium text-lg">
                      <span>Total:</span>
                      <span className="text-blue-600">{formatCurrency(calculateFormTotal().total)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-end gap-3 sticky bottom-0 bg-white">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrder}
                disabled={!formData.supplier_id || !formData.expected_date || formData.items.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Order
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
