/**
 * POS Settings Page
 *
 * Centralized settings management for POS:
 * - General/Business settings
 * - Categories management
 * - Staff management
 * - Tax settings
 * - Receipt customization
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import indexedDBService from '@/services/indexeddb.service';
import posService, { POSCategory, POSStaff } from '@/services/pos.service';
import { notificationService } from '@/services/notification.service';
import { supabase } from '@/lib/supabase';
import {
  Store,
  FolderOpen,
  Users,
  Percent,
  Receipt,
  ArrowLeft,
  Loader2,
  Save,
  Plus,
  Trash2,
  Edit2,
  X,
  Check,
  Phone,
  Mail,
  MapPin,
  FileText,
  UserPlus,
  ShieldCheck,
  Search,
  User,
} from 'lucide-react';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `Le ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

interface POSSettings {
  // Invoice/Receipt settings
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail: string;
  taxNumber: string;
  // Receipt preferences
  showLogo: boolean;
  receiptHeader: string;
  receiptFooter: string;
  // Tax settings
  enableTax: boolean;
  defaultTaxRate: number;
  taxLabel: string;
  // Setup complete flag
  setupCompleted: boolean;
}

const defaultSettings: POSSettings = {
  businessName: '',
  businessAddress: '',
  businessPhone: '',
  businessEmail: '',
  taxNumber: '',
  showLogo: true,
  receiptHeader: 'Thank you for your purchase!',
  receiptFooter: 'Please come again!',
  enableTax: false,
  defaultTaxRate: 15,
  taxLabel: 'GST',
  setupCompleted: false,
};

// Color options for categories
const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// Searched user type
interface SearchedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  fullName: string;
  phone?: string;
  avatarUrl?: string;
}

// Generate random PIN
const generatePin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

const tabs = [
  { id: 'general', label: 'General', icon: Store },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'tax', label: 'Tax', icon: Percent },
  { id: 'receipt', label: 'Receipt', icon: Receipt },
];

export function POSSettingsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [settings, setSettings] = useState<POSSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Categories state
  const [categories, setCategories] = useState<POSCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<POSCategory | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });
  const [deletingCategory, setDeletingCategory] = useState<string | null>(null);

  // Staff state
  const [staff, setStaff] = useState<POSStaff[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<POSStaff | null>(null);
  const [staffForm, setStaffForm] = useState({
    name: '',
    pin: '',
    role: 'cashier' as 'cashier' | 'manager' | 'admin',
    userId: '', // Link to user account
    phone: '',
    email: '',
  });
  const [deletingStaff, setDeletingStaff] = useState<string | null>(null);

  // User search state for staff
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [showSearchResults, setShowSearchResults] = useState(false);

  const merchantId = user?.id;

  // Load settings
  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        setLoading(true);
        try {
          const savedSettings = await indexedDBService.getSetting<POSSettings>(`pos_settings_${user.id}`, defaultSettings);
          if (savedSettings) {
            setSettings({ ...defaultSettings, ...savedSettings });
          }
        } catch (error) {
          console.error('Error loading settings:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadSettings();
  }, [user]);

  // Load categories when tab is active
  useEffect(() => {
    if (merchantId && activeTab === 'categories') {
      loadCategories();
    }
  }, [merchantId, activeTab]);

  // Load staff when tab is active
  useEffect(() => {
    if (merchantId && activeTab === 'staff') {
      loadStaff();
    }
  }, [merchantId, activeTab]);

  // Update URL when tab changes
  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  const loadCategories = async () => {
    if (!merchantId) return;
    setLoadingCategories(true);
    try {
      const cats = await posService.getCategories(merchantId);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

  const loadStaff = async () => {
    if (!merchantId) return;
    setLoadingStaff(true);
    try {
      const staffList = await posService.getStaff(merchantId);
      setStaff(staffList);
    } catch (error) {
      console.error('Error loading staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };

  const saveSettings = async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      await indexedDBService.saveSetting(`pos_settings_${user.id}`, settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  // Category handlers
  const openCategoryModal = (category?: POSCategory) => {
    if (category) {
      setEditingCategory(category);
      setCategoryForm({
        name: category.name,
        description: category.description || '',
        color: category.color,
      });
    } else {
      setEditingCategory(null);
      setCategoryForm({
        name: '',
        description: '',
        color: '#3B82F6',
      });
    }
    setShowCategoryModal(true);
  };

  const saveCategory = async () => {
    if (!categoryForm.name || !merchantId) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const categoryData = {
        merchant_id: merchantId,
        name: categoryForm.name,
        description: categoryForm.description || undefined,
        color: categoryForm.color,
      };

      if (editingCategory) {
        await posService.updateCategory(editingCategory.id, categoryData);
      } else {
        await posService.createCategory(categoryData);
      }

      setShowCategoryModal(false);
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!merchantId) return;

    setDeletingCategory(id);
    try {
      // Check if any products are using this category
      const productsInCategory = await posService.getProducts(merchantId, id);

      if (productsInCategory.length > 0) {
        alert(`Cannot delete this category. ${productsInCategory.length} product(s) are using it. Please move or delete those products first.`);
        setDeletingCategory(null);
        return;
      }

      if (!confirm('Are you sure you want to delete this category?')) {
        setDeletingCategory(null);
        return;
      }

      await posService.deleteCategory(id);
      // Update local state immediately
      setCategories(prev => prev.filter(cat => cat.id !== id));
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    } finally {
      setDeletingCategory(null);
    }
  };

  // User search with debounce - direct Supabase query
  const searchUsers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchingUsers(true);
    try {
      // Search users in Supabase by name, email, or phone
      const searchTerm = `%${query}%`;
      const { data: users, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, phone')
        .or(`email.ilike.${searchTerm},phone.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      // Map to SearchedUser format
      const mappedUsers: SearchedUser[] = (users || []).map(u => ({
        id: u.id,
        email: u.email || '',
        firstName: u.first_name || undefined,
        lastName: u.last_name || undefined,
        fullName: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || 'Unknown',
        phone: u.phone || undefined,
        avatarUrl: undefined,
      }));

      setSearchResults(mappedUsers);
      setShowSearchResults(mappedUsers.length > 0 || query.length >= 2);
    } catch (error) {
      console.error('Error searching users:', error);
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  }, []);

  // Debounce user search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (userSearchQuery) {
        searchUsers(userSearchQuery);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  // Select user from search results
  const selectUser = (user: SearchedUser) => {
    setSelectedUser(user);
    setStaffForm({
      ...staffForm,
      name: user.fullName,
      userId: user.id,
      phone: user.phone || '',
      email: user.email,
      pin: '', // PIN will be auto-generated on save
    });
    setUserSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
  };

  // Staff handlers
  const openStaffModal = (staffMember?: POSStaff) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      setStaffForm({
        name: staffMember.name,
        pin: staffMember.pin || '',
        role: staffMember.role,
        userId: (staffMember as any).userId || '',
        phone: (staffMember as any).phone || '',
        email: (staffMember as any).email || '',
      });
      setSelectedUser(null);
    } else {
      setEditingStaff(null);
      setStaffForm({
        name: '',
        pin: '',
        role: 'cashier',
        userId: '',
        phone: '',
        email: '',
      });
      setSelectedUser(null);
    }
    setUserSearchQuery('');
    setSearchResults([]);
    setShowSearchResults(false);
    setShowStaffModal(true);
  };

  const saveStaff = async () => {
    if (!merchantId) {
      alert('Merchant ID required');
      return;
    }

    // For new staff, must have a selected user
    if (!editingStaff && !selectedUser) {
      alert('Please search and select a user first');
      return;
    }

    setSaving(true);
    try {
      if (editingStaff && editingStaff.id) {
        // Only update role when editing
        await posService.updateStaff(editingStaff.id, {
          role: staffForm.role,
        });
      } else {
        // Create staff without PIN - they will set it themselves
        const staffData: Record<string, any> = {
          merchant_id: merchantId,
          name: staffForm.name,
          role: staffForm.role,
          invitation_status: 'pending',
        };

        // Only include optional fields if they have values
        if (staffForm.userId) staffData.user_id = staffForm.userId;
        if (staffForm.phone) staffData.phone = staffForm.phone;
        if (staffForm.email) staffData.email = staffForm.email;

        const createdStaff = await posService.createStaff(staffData);

        // Send notification to staff member's dashboard
        if (staffForm.userId && createdStaff?.id) {
          try {
            await notificationService.sendStaffInvitation({
              userId: staffForm.userId,
              merchantId: merchantId,
              merchantName: settings.businessName || 'A business',
              role: staffForm.role,
              staffId: createdStaff.id,
            });
          } catch (notifError) {
            console.error('Failed to send notification:', notifError);
            // Don't fail the whole operation if notification fails
          }
        }
      }

      setShowStaffModal(false);
      setSelectedUser(null);
      setStaffForm({
        name: '',
        pin: '',
        role: 'cashier',
        userId: '',
        phone: '',
        email: '',
      });
      loadStaff();
    } catch (error) {
      console.error('Error saving staff:', error);
      alert('Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = async (id: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return;
    setDeletingStaff(id);
    try {
      await posService.deleteStaff(id);
      // Update local state immediately
      setStaff(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting staff:', error);
      alert('Failed to delete staff');
    } finally {
      setDeletingStaff(null);
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
      <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => navigate('/merchant/apps/pos')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </button>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white truncate">POS Settings</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">Configure your point of sale system</p>
            </div>
          </div>
          {(activeTab === 'general' || activeTab === 'tax' || activeTab === 'receipt') && (
            <Button onClick={saveSettings} disabled={saving} className="w-full sm:w-auto">
              {saving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : saveSuccess ? (
                <Check className="w-4 h-4 mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {saveSuccess ? 'Saved!' : 'Save Changes'}
            </Button>
          )}
        </div>

        {/* Tabs - Scrollable on mobile */}
        <div className="border-b border-gray-200 dark:border-gray-700 -mx-2 sm:mx-0 px-2 sm:px-0">
          <nav className="flex gap-1 sm:gap-4 overflow-x-auto scrollbar-hide pb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 sm:py-3 border-b-2 transition-colors whitespace-nowrap text-sm sm:text-base ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Name
                  </label>
                  <div className="relative">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={settings.businessName}
                      onChange={e => setSettings({ ...settings, businessName: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Your Business Name"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={settings.businessPhone}
                      onChange={e => setSettings({ ...settings, businessPhone: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="+232 XX XXX XXXX"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={settings.businessEmail}
                      onChange={e => setSettings({ ...settings, businessEmail: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="email@business.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tax/Registration Number
                  </label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={settings.taxNumber}
                      onChange={e => setSettings({ ...settings, taxNumber: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Address
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                    <textarea
                      value={settings.businessAddress}
                      onChange={e => setSettings({ ...settings, businessAddress: e.target.value })}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Street address, City, Country"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Product Categories</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Organize your products into categories</p>
                </div>
                <Button onClick={() => openCategoryModal()} className="w-full sm:w-auto">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              {loadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No categories yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Add categories to organize your products</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {categories.map(category => (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: category.color + '20' }}
                        >
                          <FolderOpen className="w-5 h-5" style={{ color: category.color }} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-white truncate">{category.name}</p>
                          {category.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{category.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                        <button
                          onClick={() => openCategoryModal(category)}
                          className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                        >
                          <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => deleteCategory(category.id)}
                          disabled={deletingCategory === category.id}
                          className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500"
                        >
                          {deletingCategory === category.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {/* Staff Tab */}
          {activeTab === 'staff' && (
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Staff Members</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Manage POS staff and access permissions</p>
                </div>
                <Button onClick={() => openStaffModal()} className="w-full sm:w-auto">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Staff
                </Button>
              </div>

              {loadingStaff ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : staff.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">No staff members yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500">Add staff to track sales by employee</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {staff.map(member => {
                    // Staff is pending if they haven't set up their PIN yet
                    const isPending = !member.pin;
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between p-3 sm:p-4 rounded-lg border ${
                          isPending
                            ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            isPending ? 'bg-yellow-100 dark:bg-yellow-900/30' :
                            member.role === 'admin' ? 'bg-purple-100 dark:bg-purple-900/30' :
                            member.role === 'manager' ? 'bg-blue-100 dark:bg-blue-900/30' :
                            'bg-green-100 dark:bg-green-900/30'
                          }`}>
                            <Users className={`w-5 h-5 ${
                              isPending ? 'text-yellow-600 dark:text-yellow-400' :
                              member.role === 'admin' ? 'text-purple-600 dark:text-purple-400' :
                              member.role === 'manager' ? 'text-blue-600 dark:text-blue-400' :
                              'text-green-600 dark:text-green-400'
                            }`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">{member.name}</p>
                              {isPending && (
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded">
                                  Pending
                                </span>
                              )}
                            </div>
                            <p className={`text-xs capitalize ${
                              member.role === 'admin' ? 'text-purple-600 dark:text-purple-400' :
                              member.role === 'manager' ? 'text-blue-600 dark:text-blue-400' :
                              'text-green-600 dark:text-green-400'
                            }`}>
                              {member.role}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openStaffModal(member)}
                            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                          </button>
                          <button
                            onClick={() => member.id && deleteStaff(member.id)}
                            disabled={!member.id || deletingStaff === member.id}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg text-red-500"
                          >
                            {deletingStaff === member.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Trash2 className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          )}

          {/* Tax Tab */}
          {activeTab === 'tax' && (
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Tax Settings</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Enable Tax</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Add tax to all sales</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enableTax}
                      onChange={e => setSettings({ ...settings, enableTax: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {settings.enableTax && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tax Rate (%)
                      </label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={settings.defaultTaxRate}
                          onChange={e => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          min="0"
                          max="100"
                          step="0.5"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tax Label
                      </label>
                      <input
                        type="text"
                        value={settings.taxLabel}
                        onChange={e => setSettings({ ...settings, taxLabel: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="e.g., GST, VAT, Tax"
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Receipt Tab */}
          {activeTab === 'receipt' && (
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Receipt Customization</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Show Logo on Receipt</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Display your business logo</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.showLogo}
                      onChange={e => setSettings({ ...settings, showLogo: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receipt Header Message
                  </label>
                  <textarea
                    value={settings.receiptHeader}
                    onChange={e => setSettings({ ...settings, receiptHeader: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Thank you for your purchase!"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receipt Footer Message
                  </label>
                  <textarea
                    value={settings.receiptFooter}
                    onChange={e => setSettings({ ...settings, receiptFooter: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Please come again!"
                    rows={2}
                  />
                </div>

                {/* Receipt Preview */}
                <div className="mt-6">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</p>
                  <div className="bg-white border border-gray-200 rounded-lg p-6 max-w-xs mx-auto font-mono text-sm">
                    <div className="text-center border-b pb-3 mb-3">
                      {settings.showLogo && (
                        <div className="w-12 h-12 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center">
                          <Store className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <p className="font-bold">{settings.businessName || 'Business Name'}</p>
                      <p className="text-xs text-gray-500">{settings.businessAddress || 'Address'}</p>
                      <p className="text-xs text-gray-500">{settings.businessPhone}</p>
                    </div>
                    <p className="text-center text-gray-600 text-xs mb-3">{settings.receiptHeader}</p>
                    <div className="border-t border-dashed pt-2 text-xs text-gray-400">
                      <p>Item 1 x 2 .............. Le 5,000</p>
                      <p>Item 2 x 1 .............. Le 3,000</p>
                    </div>
                    <div className="border-t border-dashed pt-2 mt-2">
                      <p className="flex justify-between font-bold">
                        <span>TOTAL</span>
                        <span>Le 8,000</span>
                      </p>
                    </div>
                    <p className="text-center text-gray-600 text-xs mt-3 pt-3 border-t border-dashed">
                      {settings.receiptFooter}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                <button
                  onClick={() => setShowCategoryModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="e.g., Beverages"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={categoryForm.description}
                    onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Brief description"
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
                        onClick={() => setCategoryForm({ ...categoryForm, color })}
                        className={`w-8 h-8 rounded-lg transition-transform ${
                          categoryForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCategoryModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={saveCategory} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Staff Modal */}
        {showStaffModal && (
          <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-xl w-full sm:max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {editingStaff ? 'Edit Staff Role' : 'Add Staff'}
                </h3>
                <button
                  onClick={() => setShowStaffModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                {/* User Search - Only show when adding new staff */}
                {!editingStaff && !selectedUser && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search User
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={e => setUserSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Search by name, phone or email..."
                        autoFocus
                      />
                      {searchingUsers && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-gray-400" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Find existing users to add as POS staff
                    </p>

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                      <div className="mt-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map(searchUser => (
                          <button
                            key={searchUser.id}
                            onClick={() => selectUser(searchUser)}
                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 text-left border-b border-gray-100 dark:border-gray-700 last:border-0"
                          >
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
                              {searchUser.avatarUrl ? (
                                <img src={searchUser.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900 dark:text-white truncate">
                                {searchUser.fullName}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {searchUser.phone || searchUser.email}
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                    {showSearchResults && searchResults.length === 0 && userSearchQuery.length >= 2 && !searchingUsers && (
                      <div className="mt-2 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-center">
                        <User className="w-8 h-8 mx-auto text-gray-300 dark:text-gray-600 mb-2" />
                        <p className="text-sm text-gray-500 dark:text-gray-400">No users found</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">User must have a Peeap account first</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected User Display */}
                {selectedUser && !editingStaff && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          {selectedUser.avatarUrl ? (
                            <img src={selectedUser.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            <User className="w-6 h-6 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{selectedUser.fullName}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {selectedUser.phone || selectedUser.email}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedUser(null);
                          setStaffForm({
                            name: '',
                            pin: '',
                            role: 'cashier',
                            userId: '',
                            phone: '',
                            email: '',
                          });
                        }}
                        className="p-2 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                      >
                        <X className="w-4 h-4 text-gray-500" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Editing existing staff - show their info */}
                {editingStaff && (
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                        <User className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{editingStaff.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {editingStaff.phone || editingStaff.email || 'Staff member'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Role Selection - Only show when user is selected or editing */}
                {(selectedUser || editingStaff) && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Assign Role
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(['cashier', 'manager', 'admin'] as const).map(role => (
                          <button
                            key={role}
                            onClick={() => setStaffForm({ ...staffForm, role })}
                            className={`p-4 rounded-lg border text-center transition-colors ${
                              staffForm.role === role
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                          >
                            <ShieldCheck className={`w-5 h-5 mx-auto mb-1 ${
                              staffForm.role === role
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-400'
                            }`} />
                            <p className={`font-medium capitalize ${
                              staffForm.role === role
                                ? 'text-primary-600 dark:text-primary-400'
                                : 'text-gray-900 dark:text-white'
                            }`}>{role}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {role === 'cashier' && 'Process sales'}
                              {role === 'manager' && 'Sales + reports'}
                              {role === 'admin' && 'Full access'}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Staff Setup Info - Only for new staff */}
                    {!editingStaff && (
                      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">Secure PIN Setup</p>
                            <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                              {selectedUser?.fullName} will receive a notification to set up their own PIN.
                              For security, only they will create and know their PIN.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3 pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setShowStaffModal(false)}
                      >
                        Cancel
                      </Button>
                      <Button className="flex-1" onClick={saveStaff} disabled={saving}>
                        {saving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : editingStaff ? (
                          'Update Role'
                        ) : (
                          'Send Invitation'
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {/* Initial state - no user selected yet */}
                {!selectedUser && !editingStaff && (
                  <div className="text-center py-6 text-gray-500 dark:text-gray-400">
                    <Search className="w-10 h-10 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                    <p className="text-sm">Search for a user above to add them as staff</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

export default POSSettingsPage;
