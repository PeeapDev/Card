/**
 * POS Table Management Page
 * Manage restaurant tables, sections, and orders
 * Business Plus tier feature
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import {
  ArrowLeft,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Users,
  Clock,
  DollarSign,
  LayoutGrid,
  Settings,
  X,
  Check,
  RefreshCw,
  Utensils,
  Coffee,
  ChefHat,
  Receipt,
  UserPlus,
  ArrowRight,
  Merge,
  Split,
  QrCode,
  Printer,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

// Format currency
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Format time
const formatTime = (date: string) => {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format duration
const formatDuration = (startTime: string) => {
  const start = new Date(startTime);
  const now = new Date();
  const diffMs = now.getTime() - start.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return `${hours}h ${mins}m`;
};

// Table status type
type TableStatus = 'available' | 'occupied' | 'reserved' | 'cleaning' | 'blocked';

// Table shape type
type TableShape = 'square' | 'round' | 'rectangle' | 'bar';

// Table interface
interface RestaurantTable {
  id: string;
  merchant_id: string;
  section_id?: string;
  table_number: string;
  name?: string;
  capacity: number;
  shape: TableShape;
  status: TableStatus;
  position_x?: number;
  position_y?: number;
  current_order_id?: string;
  current_guests?: number;
  occupied_at?: string;
  reserved_at?: string;
  reserved_name?: string;
  reserved_phone?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  current_order?: {
    id: string;
    sale_number: string;
    total_amount: number;
    items_count: number;
  };
}

// Section interface
interface TableSection {
  id: string;
  merchant_id: string;
  name: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

// Status colors
const STATUS_COLORS: Record<TableStatus, { bg: string; border: string; text: string }> = {
  available: { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-700' },
  occupied: { bg: 'bg-blue-100', border: 'border-blue-400', text: 'text-blue-700' },
  reserved: { bg: 'bg-purple-100', border: 'border-purple-400', text: 'text-purple-700' },
  cleaning: { bg: 'bg-yellow-100', border: 'border-yellow-400', text: 'text-yellow-700' },
  blocked: { bg: 'bg-gray-100', border: 'border-gray-400', text: 'text-gray-700' },
};

// Table shape icons
const SHAPE_ICONS: Record<TableShape, string> = {
  square: 'rounded-lg',
  round: 'rounded-full',
  rectangle: 'rounded-lg',
  bar: 'rounded-lg',
};

export function POSTableManagementPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  // State
  const [loading, setLoading] = useState(true);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [sections, setSections] = useState<TableSection[]>([]);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'floor'>('grid');

  // Modal states
  const [showTableModal, setShowTableModal] = useState(false);
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showTableActionModal, setShowTableActionModal] = useState(false);
  const [editingTable, setEditingTable] = useState<RestaurantTable | null>(null);
  const [editingSection, setEditingSection] = useState<TableSection | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [tableForm, setTableForm] = useState({
    table_number: '',
    name: '',
    capacity: 4,
    shape: 'square' as TableShape,
    section_id: '',
    notes: '',
  });

  const [sectionForm, setSectionForm] = useState({
    name: '',
    color: '#3B82F6',
  });

  const [reservationForm, setReservationForm] = useState({
    reserved_name: '',
    reserved_phone: '',
    reserved_at: '',
    guests: 2,
    notes: '',
  });

  // Load data
  useEffect(() => {
    if (merchantId) {
      loadData();
    }
  }, [merchantId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load sections
      const { data: sectionsData, error: sectionsError } = await supabase
        .from('pos_table_sections')
        .select('*')
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .order('sort_order');

      if (!sectionsError && sectionsData) {
        setSections(sectionsData);
      }

      // Load tables with current orders
      const { data: tablesData, error: tablesError } = await supabase
        .from('pos_tables')
        .select(`
          *,
          current_order:pos_sales(id, sale_number, total_amount)
        `)
        .eq('merchant_id', merchantId)
        .eq('is_active', true)
        .order('table_number');

      if (!tablesError && tablesData) {
        setTables(tablesData as RestaurantTable[]);
      }
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter tables by section
  const filteredTables = selectedSection
    ? tables.filter(t => t.section_id === selectedSection)
    : tables;

  // Stats
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    totalGuests: tables.reduce((sum, t) => sum + (t.current_guests || 0), 0),
    totalRevenue: tables.reduce((sum, t) => sum + (t.current_order?.total_amount || 0), 0),
  };

  // Open table modal
  const openTableModal = (table?: RestaurantTable) => {
    if (table) {
      setEditingTable(table);
      setTableForm({
        table_number: table.table_number,
        name: table.name || '',
        capacity: table.capacity,
        shape: table.shape,
        section_id: table.section_id || '',
        notes: table.notes || '',
      });
    } else {
      setEditingTable(null);
      setTableForm({
        table_number: '',
        name: '',
        capacity: 4,
        shape: 'square',
        section_id: selectedSection || '',
        notes: '',
      });
    }
    setShowTableModal(true);
  };

  // Save table
  const saveTable = async () => {
    if (!merchantId || !tableForm.table_number) return;

    setSaving(true);
    try {
      const tableData = {
        merchant_id: merchantId,
        table_number: tableForm.table_number,
        name: tableForm.name || null,
        capacity: tableForm.capacity,
        shape: tableForm.shape,
        section_id: tableForm.section_id || null,
        notes: tableForm.notes || null,
        status: 'available' as TableStatus,
        is_active: true,
      };

      if (editingTable) {
        await supabase
          .from('pos_tables')
          .update(tableData)
          .eq('id', editingTable.id);
      } else {
        await supabase
          .from('pos_tables')
          .insert(tableData);
      }

      setShowTableModal(false);
      await loadData();
    } catch (error) {
      console.error('Error saving table:', error);
      alert('Failed to save table');
    } finally {
      setSaving(false);
    }
  };

  // Delete table
  const deleteTable = async (table: RestaurantTable) => {
    if (!confirm(`Delete table ${table.table_number}?`)) return;

    try {
      await supabase
        .from('pos_tables')
        .update({ is_active: false })
        .eq('id', table.id);

      await loadData();
    } catch (error) {
      console.error('Error deleting table:', error);
    }
  };

  // Open section modal
  const openSectionModal = (section?: TableSection) => {
    if (section) {
      setEditingSection(section);
      setSectionForm({
        name: section.name,
        color: section.color,
      });
    } else {
      setEditingSection(null);
      setSectionForm({
        name: '',
        color: '#3B82F6',
      });
    }
    setShowSectionModal(true);
  };

  // Save section
  const saveSection = async () => {
    if (!merchantId || !sectionForm.name) return;

    setSaving(true);
    try {
      const sectionData = {
        merchant_id: merchantId,
        name: sectionForm.name,
        color: sectionForm.color,
        sort_order: sections.length,
        is_active: true,
      };

      if (editingSection) {
        await supabase
          .from('pos_table_sections')
          .update(sectionData)
          .eq('id', editingSection.id);
      } else {
        await supabase
          .from('pos_table_sections')
          .insert(sectionData);
      }

      setShowSectionModal(false);
      await loadData();
    } catch (error) {
      console.error('Error saving section:', error);
      alert('Failed to save section');
    } finally {
      setSaving(false);
    }
  };

  // Update table status
  const updateTableStatus = async (table: RestaurantTable, newStatus: TableStatus) => {
    try {
      const updateData: any = { status: newStatus };

      if (newStatus === 'available') {
        updateData.current_order_id = null;
        updateData.current_guests = null;
        updateData.occupied_at = null;
        updateData.reserved_at = null;
        updateData.reserved_name = null;
        updateData.reserved_phone = null;
      }

      if (newStatus === 'occupied' && !table.occupied_at) {
        updateData.occupied_at = new Date().toISOString();
      }

      await supabase
        .from('pos_tables')
        .update(updateData)
        .eq('id', table.id);

      await loadData();
      setShowTableActionModal(false);
    } catch (error) {
      console.error('Error updating table status:', error);
    }
  };

  // Start new order for table
  const startNewOrder = (table: RestaurantTable) => {
    navigate(`/merchant/pos/terminal?table=${table.table_number}`);
  };

  // View table order
  const viewTableOrder = (table: RestaurantTable) => {
    if (table.current_order?.id) {
      navigate(`/merchant/pos/sales?order=${table.current_order.id}`);
    }
  };

  // Make reservation
  const makeReservation = async () => {
    if (!selectedTable) return;

    setSaving(true);
    try {
      await supabase
        .from('pos_tables')
        .update({
          status: 'reserved',
          reserved_name: reservationForm.reserved_name,
          reserved_phone: reservationForm.reserved_phone,
          reserved_at: reservationForm.reserved_at || new Date().toISOString(),
          current_guests: reservationForm.guests,
          notes: reservationForm.notes,
        })
        .eq('id', selectedTable.id);

      setShowReservationModal(false);
      setReservationForm({ reserved_name: '', reserved_phone: '', reserved_at: '', guests: 2, notes: '' });
      await loadData();
    } catch (error) {
      console.error('Error making reservation:', error);
    } finally {
      setSaving(false);
    }
  };

  // Seat guests at reserved table
  const seatGuests = async (table: RestaurantTable, guests: number) => {
    try {
      await supabase
        .from('pos_tables')
        .update({
          status: 'occupied',
          current_guests: guests,
          occupied_at: new Date().toISOString(),
        })
        .eq('id', table.id);

      await loadData();
      setShowTableActionModal(false);
    } catch (error) {
      console.error('Error seating guests:', error);
    }
  };

  // Color options for sections
  const colorOptions = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  ];

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
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Table Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage restaurant tables and reservations</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => openSectionModal()}>
              <LayoutGrid className="w-4 h-4 mr-2" />
              Add Section
            </Button>
            <Button onClick={() => openTableModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <LayoutGrid className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Tables</p>
                <p className="text-xl font-bold">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Check className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Available</p>
                <p className="text-xl font-bold text-green-600">{stats.available}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Utensils className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Occupied</p>
                <p className="text-xl font-bold text-blue-600">{stats.occupied}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Reserved</p>
                <p className="text-xl font-bold text-purple-600">{stats.reserved}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Guests</p>
                <p className="text-xl font-bold text-orange-600">{stats.totalGuests}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Open Orders</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(stats.totalRevenue)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sections Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-900 dark:text-white">Sections</h2>
            <button
              onClick={() => openSectionModal()}
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add Section
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSection(null)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                !selectedSection
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              All Tables ({tables.length})
            </button>
            {sections.map(section => {
              const sectionTables = tables.filter(t => t.section_id === section.id);
              return (
                <div key={section.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedSection(section.id === selectedSection ? null : section.id)}
                    className={`px-4 py-2 rounded-l-lg text-sm font-medium transition-colors ${
                      selectedSection === section.id
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedSection === section.id ? section.color : undefined,
                    }}
                  >
                    {section.name} ({sectionTables.length})
                  </button>
                  <button
                    onClick={() => openSectionModal(section)}
                    className="px-2 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-600 dark:text-gray-400 rounded-r-lg"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tables Grid */}
        {filteredTables.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <LayoutGrid className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No tables yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Add your first table to start managing your floor</p>
            <Button onClick={() => openTableModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Table
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredTables.map(table => {
              const colors = STATUS_COLORS[table.status];
              const section = sections.find(s => s.id === table.section_id);

              return (
                <div
                  key={table.id}
                  onClick={() => {
                    setSelectedTable(table);
                    setShowTableActionModal(true);
                  }}
                  className={`
                    relative rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-lg
                    ${colors.bg} ${colors.border}
                    ${table.shape === 'round' ? 'aspect-square' : ''}
                  `}
                >
                  {/* Table Number */}
                  <div className="text-center">
                    <span className="text-2xl font-bold text-gray-900 dark:text-gray-900">{table.table_number}</span>
                    {table.name && (
                      <p className="text-xs text-gray-600 truncate">{table.name}</p>
                    )}
                  </div>

                  {/* Capacity */}
                  <div className="flex items-center justify-center gap-1 mt-2">
                    <Users className="w-4 h-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {table.current_guests || 0}/{table.capacity}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className={`mt-2 text-center`}>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${colors.text}`}>
                      {table.status.charAt(0).toUpperCase() + table.status.slice(1)}
                    </span>
                  </div>

                  {/* Occupied Info */}
                  {table.status === 'occupied' && table.occupied_at && (
                    <div className="mt-2 text-center">
                      <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDuration(table.occupied_at)}
                      </div>
                      {table.current_order && (
                        <p className="text-xs font-medium text-green-600 mt-1">
                          {formatCurrency(table.current_order.total_amount)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Reserved Info */}
                  {table.status === 'reserved' && table.reserved_name && (
                    <div className="mt-2 text-center">
                      <p className="text-xs text-gray-600 truncate">{table.reserved_name}</p>
                      {table.reserved_at && (
                        <p className="text-xs text-gray-500">{formatTime(table.reserved_at)}</p>
                      )}
                    </div>
                  )}

                  {/* Section indicator */}
                  {section && (
                    <div
                      className="absolute top-2 right-2 w-3 h-3 rounded-full"
                      style={{ backgroundColor: section.color }}
                      title={section.name}
                    />
                  )}

                  {/* Edit button */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      openTableModal(table);
                    }}
                    className="absolute top-2 left-2 p-1 bg-white/80 hover:bg-white rounded text-gray-600 hover:text-gray-900"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Table Modal */}
      {showTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingTable ? 'Edit Table' : 'Add Table'}
              </h2>
              <button
                onClick={() => setShowTableModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Table Number *
                  </label>
                  <input
                    type="text"
                    value={tableForm.table_number}
                    onChange={e => setTableForm({ ...tableForm, table_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    placeholder="e.g., 1, A1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Capacity
                  </label>
                  <input
                    type="number"
                    value={tableForm.capacity}
                    onChange={e => setTableForm({ ...tableForm, capacity: parseInt(e.target.value) || 4 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    min="1"
                    max="20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name (Optional)
                </label>
                <input
                  type="text"
                  value={tableForm.name}
                  onChange={e => setTableForm({ ...tableForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  placeholder="e.g., Window Booth"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Section
                </label>
                <select
                  value={tableForm.section_id}
                  onChange={e => setTableForm({ ...tableForm, section_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  <option value="">No section</option>
                  {sections.map(section => (
                    <option key={section.id} value={section.id}>{section.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Shape
                </label>
                <div className="flex gap-2">
                  {(['square', 'round', 'rectangle', 'bar'] as TableShape[]).map(shape => (
                    <button
                      key={shape}
                      onClick={() => setTableForm({ ...tableForm, shape })}
                      className={`flex-1 py-2 px-3 border rounded-lg text-sm font-medium transition-colors ${
                        tableForm.shape === shape
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {shape.charAt(0).toUpperCase() + shape.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={tableForm.notes}
                  onChange={e => setTableForm({ ...tableForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  placeholder="Special notes about this table"
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              {editingTable && (
                <Button
                  variant="outline"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => {
                    deleteTable(editingTable);
                    setShowTableModal(false);
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button variant="outline" className="flex-1" onClick={() => setShowTableModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveTable} isLoading={saving}>
                {editingTable ? 'Update' : 'Create'} Table
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Section Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingSection ? 'Edit Section' : 'Add Section'}
              </h2>
              <button
                onClick={() => setShowSectionModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Section Name *
                </label>
                <input
                  type="text"
                  value={sectionForm.name}
                  onChange={e => setSectionForm({ ...sectionForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  placeholder="e.g., Main Floor, Patio, Bar"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Color
                </label>
                <div className="flex flex-wrap gap-2">
                  {colorOptions.map(color => (
                    <button
                      key={color}
                      onClick={() => setSectionForm({ ...sectionForm, color })}
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        sectionForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    >
                      {sectionForm.color === color && <Check className="w-4 h-4 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowSectionModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveSection} isLoading={saving}>
                {editingSection ? 'Update' : 'Create'} Section
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table Action Modal */}
      {showTableActionModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Table {selectedTable.table_number}</h2>
                <p className={`text-sm ${STATUS_COLORS[selectedTable.status].text}`}>
                  {selectedTable.status.charAt(0).toUpperCase() + selectedTable.status.slice(1)}
                </p>
              </div>
              <button
                onClick={() => setShowTableActionModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3">
              {/* Table Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Capacity</span>
                  <span className="font-medium">{selectedTable.capacity} guests</span>
                </div>
                {selectedTable.current_guests && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Current Guests</span>
                    <span className="font-medium">{selectedTable.current_guests}</span>
                  </div>
                )}
                {selectedTable.occupied_at && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Occupied Since</span>
                    <span className="font-medium">{formatTime(selectedTable.occupied_at)}</span>
                  </div>
                )}
                {selectedTable.current_order && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600 dark:text-gray-400">Order Total</span>
                    <span className="font-medium text-green-600">
                      {formatCurrency(selectedTable.current_order.total_amount)}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions based on status */}
              {selectedTable.status === 'available' && (
                <>
                  <Button
                    className="w-full"
                    onClick={() => {
                      setShowTableActionModal(false);
                      startNewOrder(selectedTable);
                    }}
                  >
                    <Utensils className="w-4 h-4 mr-2" />
                    Start New Order
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setShowTableActionModal(false);
                      setShowReservationModal(true);
                    }}
                  >
                    <Clock className="w-4 h-4 mr-2" />
                    Make Reservation
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => updateTableStatus(selectedTable, 'blocked')}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Block Table
                  </Button>
                </>
              )}

              {selectedTable.status === 'occupied' && (
                <>
                  {selectedTable.current_order ? (
                    <Button
                      className="w-full"
                      onClick={() => viewTableOrder(selectedTable)}
                    >
                      <Receipt className="w-4 h-4 mr-2" />
                      View Order ({selectedTable.current_order.sale_number})
                    </Button>
                  ) : (
                    <Button
                      className="w-full"
                      onClick={() => {
                        setShowTableActionModal(false);
                        startNewOrder(selectedTable);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Order
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => updateTableStatus(selectedTable, 'cleaning')}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Mark as Cleaning
                  </Button>
                </>
              )}

              {selectedTable.status === 'reserved' && (
                <>
                  <div className="bg-purple-50 rounded-lg p-3 text-sm">
                    <p className="font-medium text-purple-900">{selectedTable.reserved_name}</p>
                    {selectedTable.reserved_phone && (
                      <p className="text-purple-700">{selectedTable.reserved_phone}</p>
                    )}
                    {selectedTable.reserved_at && (
                      <p className="text-purple-600">Reserved for {formatTime(selectedTable.reserved_at)}</p>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => {
                      const guests = prompt('Number of guests?', String(selectedTable.current_guests || 2));
                      if (guests) {
                        seatGuests(selectedTable, parseInt(guests));
                      }
                    }}
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Seat Guests
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-red-600"
                    onClick={() => updateTableStatus(selectedTable, 'available')}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Reservation
                  </Button>
                </>
              )}

              {selectedTable.status === 'cleaning' && (
                <Button
                  className="w-full"
                  onClick={() => updateTableStatus(selectedTable, 'available')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Available
                </Button>
              )}

              {selectedTable.status === 'blocked' && (
                <Button
                  className="w-full"
                  onClick={() => updateTableStatus(selectedTable, 'available')}
                >
                  <Check className="w-4 h-4 mr-2" />
                  Unblock Table
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reservation Modal */}
      {showReservationModal && selectedTable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">Reserve Table {selectedTable.table_number}</h2>
              <button
                onClick={() => setShowReservationModal(false)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Guest Name *
                </label>
                <input
                  type="text"
                  value={reservationForm.reserved_name}
                  onChange={e => setReservationForm({ ...reservationForm, reserved_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  placeholder="Guest name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={reservationForm.reserved_phone}
                  onChange={e => setReservationForm({ ...reservationForm, reserved_phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  placeholder="+232..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Time
                  </label>
                  <input
                    type="datetime-local"
                    value={reservationForm.reserved_at}
                    onChange={e => setReservationForm({ ...reservationForm, reserved_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Guests
                  </label>
                  <input
                    type="number"
                    value={reservationForm.guests}
                    onChange={e => setReservationForm({ ...reservationForm, guests: parseInt(e.target.value) || 2 })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                    min="1"
                    max={selectedTable.capacity}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Notes
                </label>
                <textarea
                  value={reservationForm.notes}
                  onChange={e => setReservationForm({ ...reservationForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
                  placeholder="Special requests..."
                />
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowReservationModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={makeReservation} isLoading={saving}>
                Make Reservation
              </Button>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}

export default POSTableManagementPage;
