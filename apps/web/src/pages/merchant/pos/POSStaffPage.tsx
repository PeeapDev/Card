/**
 * POS Staff Management Page
 * Manage staff members, roles, permissions, and PIN access
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
  Users,
  Plus,
  Edit2,
  Trash2,
  Shield,
  Key,
  Search,
  UserCheck,
  UserX,
  X,
  Save,
  Eye,
  EyeOff,
  AlertTriangle,
  Wifi,
  WifiOff,
  Cloud,
  CloudOff,
} from 'lucide-react';
import posService, { POSStaff } from '@/services/pos.service';

// Role badges
const RoleBadge = ({ role }: { role: string }) => {
  const colors = {
    admin: 'bg-purple-100 text-purple-700',
    manager: 'bg-blue-100 text-blue-700',
    cashier: 'bg-green-100 text-green-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'}`}>
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
};

// Permission groups
const PERMISSION_GROUPS = {
  'Sales': [
    { key: 'make_sales', label: 'Process Sales' },
    { key: 'apply_discounts', label: 'Apply Discounts' },
    { key: 'void_sales', label: 'Void Sales' },
    { key: 'process_refunds', label: 'Process Refunds' },
  ],
  'Inventory': [
    { key: 'view_products', label: 'View Products' },
    { key: 'edit_products', label: 'Edit Products' },
    { key: 'manage_stock', label: 'Manage Stock' },
  ],
  'Customers': [
    { key: 'view_customers', label: 'View Customers' },
    { key: 'edit_customers', label: 'Edit Customers' },
    { key: 'manage_credit', label: 'Manage Credit/Tabs' },
  ],
  'Reports': [
    { key: 'view_reports', label: 'View Reports' },
    { key: 'view_cash_drawer', label: 'View Cash Drawer' },
    { key: 'close_register', label: 'Close Register' },
  ],
  'Settings': [
    { key: 'manage_staff', label: 'Manage Staff' },
    { key: 'manage_settings', label: 'Manage Settings' },
  ],
};

export function POSStaffPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const merchantId = user?.id;

  // Use offline sync hook for offline-first data access
  const offlineSync = useOfflineSync(merchantId);

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<POSStaff[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<POSStaff | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    pin: '',
    role: 'cashier' as 'admin' | 'manager' | 'cashier',
    permissions: [] as string[],
    is_active: true,
  });

  useEffect(() => {
    if (merchantId) {
      loadStaff();
    }
  }, [merchantId]);

  const loadStaff = async () => {
    try {
      setLoading(true);
      // Use offline sync hook - works offline with IndexedDB
      const data = await offlineSync.getStaff();
      setStaff(data);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (staffMember?: POSStaff) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setForm({
        name: staffMember.name,
        email: staffMember.email || '',
        phone: staffMember.phone || '',
        pin: staffMember.pin || '',
        role: staffMember.role,
        permissions: staffMember.permissions || [],
        is_active: staffMember.is_active,
      });
    } else {
      setEditingStaff(null);
      const defaultPerms = posService.DEFAULT_PERMISSIONS['cashier'];
      setForm({
        name: '',
        email: '',
        phone: '',
        pin: '',
        role: 'cashier',
        permissions: defaultPerms,
        is_active: true,
      });
    }
    setShowModal(true);
    setShowPin(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setForm({
      name: '',
      email: '',
      phone: '',
      pin: '',
      role: 'cashier',
      permissions: [],
      is_active: true,
    });
  };

  const handleRoleChange = (role: 'admin' | 'manager' | 'cashier') => {
    setForm({
      ...form,
      role,
      permissions: posService.DEFAULT_PERMISSIONS[role],
    });
  };

  const togglePermission = (permission: string) => {
    const perms = new Set(form.permissions);
    if (perms.has(permission)) {
      perms.delete(permission);
    } else {
      perms.add(permission);
    }
    setForm({ ...form, permissions: Array.from(perms) });
  };

  const generatePin = () => {
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setForm({ ...form, pin });
    setShowPin(true);
  };

  const saveStaff = async () => {
    if (!form.name.trim()) {
      alert('Please enter staff name');
      return;
    }

    try {
      setSaving(true);

      const staffData: Partial<POSStaff> = {
        merchant_id: merchantId!,
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        pin: form.pin || undefined,
        role: form.role,
        permissions: form.permissions,
        is_active: form.is_active,
      };

      // Use offline sync - works offline with IndexedDB
      if (editingStaff) {
        await offlineSync.updateStaff(editingStaff.id!, staffData);
      } else {
        await offlineSync.createStaff(staffData as POSStaff);
      }

      await loadStaff();
      closeModal();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Failed to save staff member');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    try {
      // Use offline sync - works offline with IndexedDB
      await offlineSync.deleteStaff(id);
      await loadStaff();
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff member');
    }
  };

  const toggleActive = async (staffMember: POSStaff) => {
    try {
      // Use offline sync - works offline with IndexedDB
      await offlineSync.updateStaff(staffMember.id!, {
        is_active: !staffMember.is_active,
      });
      await loadStaff();
    } catch (error) {
      console.error('Error updating staff:', error);
    }
  };

  // Filter staff
  const filteredStaff = staff.filter(s => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(query) ||
      s.email?.toLowerCase().includes(query) ||
      s.phone?.includes(query) ||
      s.role.includes(query)
    );
  });

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
              className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Management</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Manage team members and permissions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Offline Status Indicator */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${
              offlineSync.isOnline
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {offlineSync.isOnline ? (
                <>
                  <Wifi className="w-3 h-3" />
                  Online
                </>
              ) : (
                <>
                  <WifiOff className="w-3 h-3" />
                  Offline Mode
                </>
              )}
            </div>
            <Button onClick={() => openModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Staff
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Staff</p>
                <p className="text-2xl font-bold">{staff.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Active</p>
                <p className="text-2xl font-bold">{staff.filter(s => s.is_active).length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Admins</p>
                <p className="text-2xl font-bold">{staff.filter(s => s.role === 'admin').length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Key className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">With PIN</p>
                <p className="text-2xl font-bold">{staff.filter(s => s.pin).length}</p>
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
            placeholder="Search staff by name, email, phone..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Staff List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Staff</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Role</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">PIN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                      <Users className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p>No staff members found</p>
                      <Button variant="outline" className="mt-4" onClick={() => openModal()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Staff
                      </Button>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map(member => (
                    <tr key={member.id} className="hover:bg-gray-50 dark:bg-gray-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 dark:text-gray-400 font-medium">
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {member.permissions?.length || 0} permissions
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          {member.email && <p>{member.email}</p>}
                          {member.phone && <p className="text-gray-500 dark:text-gray-400">{member.phone}</p>}
                          {!member.email && !member.phone && <p className="text-gray-400">-</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="px-4 py-3">
                        {member.pin ? (
                          <span className="inline-flex items-center gap-1 text-sm text-green-600">
                            <Key className="w-3 h-3" />
                            ****
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">No PIN</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleActive(member)}
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            member.is_active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          {member.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openModal(member)}
                            className="p-1 hover:bg-gray-100 dark:bg-gray-900 rounded"
                          >
                            <Edit2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(member.id!)}
                            className="p-1 hover:bg-red-100 rounded"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 z-10">
              <h2 className="text-lg font-semibold">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Staff name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={e => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="staff@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={e => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="+232 xx xxx xxxx"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      PIN Code
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPin ? 'text' : 'password'}
                          value={form.pin}
                          onChange={e => setForm({ ...form, pin: e.target.value.slice(0, 6) })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                          placeholder="4-6 digits"
                          maxLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 dark:text-gray-400"
                        >
                          {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <Button variant="outline" onClick={generatePin}>
                        Generate
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Role */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Role</h3>
                <div className="flex gap-3">
                  {(['admin', 'manager', 'cashier'] as const).map(role => (
                    <button
                      key={role}
                      onClick={() => handleRoleChange(role)}
                      className={`flex-1 p-4 border rounded-lg text-center transition-all ${
                        form.role === role
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      <Shield className={`w-6 h-6 mx-auto mb-2 ${
                        form.role === role ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                      <p className="font-medium capitalize">{role}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {role === 'admin' && 'Full access'}
                        {role === 'manager' && 'Most features'}
                        {role === 'cashier' && 'Sales only'}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">Permissions</h3>
                <div className="space-y-4">
                  {Object.entries(PERMISSION_GROUPS).map(([group, permissions]) => (
                    <div key={group} className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">{group}</h4>
                      <div className="flex flex-wrap gap-2">
                        {permissions.map(perm => (
                          <button
                            key={perm.key}
                            onClick={() => togglePermission(perm.key)}
                            className={`px-3 py-1 text-sm rounded-full transition-colors ${
                              form.permissions.includes(perm.key)
                                ? 'bg-primary-100 text-primary-700'
                                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                            }`}
                          >
                            {perm.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium">Active Status</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Inactive staff cannot log in</p>
                </div>
                <button
                  onClick={() => setForm({ ...form, is_active: !form.is_active })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    form.is_active ? 'bg-primary-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-800 transition-transform ${
                      form.is_active ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={closeModal}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveStaff} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingStaff ? 'Update' : 'Create'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Delete Staff Member?</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={() => handleDeleteStaff(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}

export default POSStaffPage;
