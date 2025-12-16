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
import { MultivendorSettings } from '@/components/pos/MultivendorSettings';
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
  CreditCard,
  QrCode,
  Smartphone,
  Wallet,
  Nfc,
  Monitor,
  ExternalLink,
  Palette,
  Type,
  Image,
  Volume2,
  Eye,
  ShoppingCart,
  Clock,
  Globe,
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
  receiptTemplate: 'classic' | 'modern' | 'detailed';
  // Tax settings
  enableTax: boolean;
  defaultTaxRate: number;
  taxLabel: string;
  // Payment methods
  paymentMethods: {
    qrCode: boolean;
    nfcTapToPay: boolean;
    mobileMoney: boolean;
    cash: boolean;
    bankTransfer: boolean;
  };
  // Second screen / Customer display settings
  secondScreen: {
    enabled: boolean;
    theme: 'light' | 'dark' | 'auto';
    fontSize: 'small' | 'medium' | 'large';
    // Header options
    showLogo: boolean;
    showBusinessName: boolean;
    showDateTime: boolean;
    // Welcome screen options
    showWelcomeMessage: boolean;
    welcomeMessage: string;
    showPromotionalBanner: boolean;
    promotionalMessage: string;
    // Cart display options
    showItemImages: boolean;
    showItemDescriptions: boolean;
    showItemPrices: boolean;
    showItemQuantity: boolean;
    showItemsAsAdded: boolean;
    // Totals display options
    showSubtotal: boolean;
    showTaxBreakdown: boolean;
    showDiscounts: boolean;
    showTotalAmount: boolean;
    // Payment options
    showPaymentMethod: boolean;
    showPaymentAnimation: boolean;
    showThankYouMessage: boolean;
    thankYouMessage: string;
    // Effects
    playSound: boolean;
    // Colors
    backgroundColor: string;
    accentColor: string;
  };
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
  receiptTemplate: 'classic',
  enableTax: false,
  defaultTaxRate: 15,
  taxLabel: 'GST',
  paymentMethods: {
    qrCode: true,
    nfcTapToPay: true,
    mobileMoney: true,
    cash: true,
    bankTransfer: false,
  },
  secondScreen: {
    enabled: false,
    theme: 'dark',
    fontSize: 'large',
    // Header options
    showLogo: true,
    showBusinessName: true,
    showDateTime: true,
    // Welcome screen options
    showWelcomeMessage: true,
    welcomeMessage: 'Welcome! Your order will appear here.',
    showPromotionalBanner: false,
    promotionalMessage: '',
    // Cart display options
    showItemImages: true,
    showItemDescriptions: false,
    showItemPrices: true,
    showItemQuantity: true,
    showItemsAsAdded: true,
    // Totals display options
    showSubtotal: true,
    showTaxBreakdown: true,
    showDiscounts: true,
    showTotalAmount: true,
    // Payment options
    showPaymentMethod: true,
    showPaymentAnimation: true,
    showThankYouMessage: true,
    thankYouMessage: 'Thank you for your purchase!',
    // Effects
    playSound: false,
    // Colors
    backgroundColor: '#1a1a2e',
    accentColor: '#4f46e5',
  },
  setupCompleted: false,
};

// Color options for categories
const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

// Category templates by business type
const categoryTemplates = {
  restaurant: {
    name: 'Restaurant',
    icon: '🍽️',
    categories: [
      { name: 'Appetizers', color: '#F59E0B', description: 'Starters and small plates' },
      { name: 'Main Course', color: '#EF4444', description: 'Main dishes' },
      { name: 'Desserts', color: '#EC4899', description: 'Sweet treats' },
      { name: 'Beverages', color: '#06B6D4', description: 'Drinks and refreshments' },
      { name: 'Sides', color: '#84CC16', description: 'Side dishes' },
      { name: 'Specials', color: '#8B5CF6', description: 'Daily specials' },
    ]
  },
  cafe: {
    name: 'Cafe / Coffee Shop',
    icon: '☕',
    categories: [
      { name: 'Hot Drinks', color: '#F97316', description: 'Coffee, tea, hot chocolate' },
      { name: 'Cold Drinks', color: '#06B6D4', description: 'Iced coffee, smoothies, juices' },
      { name: 'Pastries', color: '#F59E0B', description: 'Croissants, muffins, cakes' },
      { name: 'Sandwiches', color: '#84CC16', description: 'Fresh sandwiches and wraps' },
      { name: 'Breakfast', color: '#EF4444', description: 'Morning meals' },
      { name: 'Snacks', color: '#8B5CF6', description: 'Light bites' },
    ]
  },
  retail: {
    name: 'Retail Store',
    icon: '🛒',
    categories: [
      { name: 'Electronics', color: '#3B82F6', description: 'Phones, gadgets, accessories' },
      { name: 'Clothing', color: '#EC4899', description: 'Apparel and fashion' },
      { name: 'Groceries', color: '#84CC16', description: 'Food and household items' },
      { name: 'Home & Garden', color: '#10B981', description: 'Home essentials' },
      { name: 'Health & Beauty', color: '#F59E0B', description: 'Personal care products' },
      { name: 'Accessories', color: '#8B5CF6', description: 'Bags, jewelry, watches' },
    ]
  },
  salon: {
    name: 'Salon / Spa',
    icon: '💇',
    categories: [
      { name: 'Haircuts', color: '#8B5CF6', description: 'Hair cutting services' },
      { name: 'Hair Styling', color: '#EC4899', description: 'Styling and treatments' },
      { name: 'Coloring', color: '#F59E0B', description: 'Hair coloring services' },
      { name: 'Nails', color: '#EF4444', description: 'Manicure and pedicure' },
      { name: 'Skincare', color: '#10B981', description: 'Facials and treatments' },
      { name: 'Products', color: '#3B82F6', description: 'Retail hair products' },
    ]
  },
  bar: {
    name: 'Bar / Nightclub',
    icon: '🍺',
    categories: [
      { name: 'Beer', color: '#F59E0B', description: 'Draft and bottled beers' },
      { name: 'Wine', color: '#EF4444', description: 'Red, white, and sparkling' },
      { name: 'Spirits', color: '#8B5CF6', description: 'Whiskey, vodka, rum, etc.' },
      { name: 'Cocktails', color: '#EC4899', description: 'Mixed drinks' },
      { name: 'Soft Drinks', color: '#06B6D4', description: 'Non-alcoholic options' },
      { name: 'Snacks', color: '#84CC16', description: 'Bar food and nibbles' },
    ]
  },
  pharmacy: {
    name: 'Pharmacy',
    icon: '💊',
    categories: [
      { name: 'Medications', color: '#EF4444', description: 'Over-the-counter drugs' },
      { name: 'Vitamins', color: '#84CC16', description: 'Supplements and vitamins' },
      { name: 'Personal Care', color: '#EC4899', description: 'Hygiene products' },
      { name: 'First Aid', color: '#F59E0B', description: 'Bandages, antiseptics' },
      { name: 'Baby Care', color: '#06B6D4', description: 'Baby products' },
      { name: 'Medical Devices', color: '#3B82F6', description: 'Thermometers, BP monitors' },
    ]
  },
  general: {
    name: 'General / Other',
    icon: '🏪',
    categories: [
      { name: 'Products', color: '#3B82F6', description: 'Physical products' },
      { name: 'Services', color: '#10B981', description: 'Service offerings' },
      { name: 'Packages', color: '#8B5CF6', description: 'Bundled offerings' },
      { name: 'Specials', color: '#F59E0B', description: 'Special items or deals' },
    ]
  },
};

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
  { id: 'multivendor', label: 'Multivendor', icon: Globe },
  { id: 'categories', label: 'Categories', icon: FolderOpen },
  { id: 'staff', label: 'Staff', icon: Users },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'display', label: 'Display', icon: Monitor },
  { id: 'tax', label: 'Tax', icon: Percent },
  { id: 'receipts', label: 'Receipt', icon: Receipt },
];

// Receipt templates
const receiptTemplates = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional centered layout',
    preview: 'classic',
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean minimal design',
    preview: 'modern',
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Full item details with tax breakdown',
    preview: 'detailed',
  },
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
  const [showTemplates, setShowTemplates] = useState(false);
  const [addingTemplates, setAddingTemplates] = useState(false);

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

  // Apply template categories
  const applyTemplateCategories = async (templateKey: keyof typeof categoryTemplates) => {
    if (!merchantId) return;

    const template = categoryTemplates[templateKey];
    if (!template) return;

    setAddingTemplates(true);
    try {
      // Create all categories from the template
      for (const cat of template.categories) {
        await posService.createCategory({
          merchant_id: merchantId,
          name: cat.name,
          description: cat.description,
          color: cat.color,
        });
      }

      // Reload categories
      await loadCategories();
      setShowTemplates(false);
      alert(`Successfully added ${template.categories.length} categories from ${template.name} template!`);
    } catch (error) {
      console.error('Error applying templates:', error);
      alert('Failed to add template categories');
    } finally {
      setAddingTemplates(false);
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
          {(activeTab === 'general' || activeTab === 'tax' || activeTab === 'receipts' || activeTab === 'payments' || activeTab === 'display') && (
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

          {/* Multivendor Tab */}
          {activeTab === 'multivendor' && merchantId && (
            <MultivendorSettings merchantId={merchantId} />
          )}

          {/* Categories Tab */}
          {activeTab === 'categories' && (
            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">Product Categories</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Organize your products into categories</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => setShowTemplates(true)}
                    className="flex-1 sm:flex-initial"
                  >
                    Use Templates
                  </Button>
                  <Button onClick={() => openCategoryModal()} className="flex-1 sm:flex-initial">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Category
                  </Button>
                </div>
              </div>

              {loadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : categories.length === 0 && !showTemplates ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 mb-2">No categories yet</p>
                  <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                    Add categories manually or use templates to get started quickly
                  </p>
                  <Button onClick={() => setShowTemplates(true)} variant="outline">
                    Browse Templates
                  </Button>
                </div>
              ) : showTemplates ? (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-white">Choose a Template</h3>
                    <button
                      onClick={() => setShowTemplates(false)}
                      className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                    Select a business type to add pre-made categories instantly
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {Object.entries(categoryTemplates).map(([key, template]) => (
                      <button
                        key={key}
                        onClick={() => applyTemplateCategories(key as keyof typeof categoryTemplates)}
                        disabled={addingTemplates}
                        className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all text-left group disabled:opacity-50"
                      >
                        <div className="text-3xl mb-2">{template.icon}</div>
                        <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-primary-600">
                          {template.name}
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {template.categories.length} categories
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {template.categories.slice(0, 3).map((cat, i) => (
                            <span
                              key={i}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ backgroundColor: cat.color + '20', color: cat.color }}
                            >
                              {cat.name}
                            </span>
                          ))}
                          {template.categories.length > 3 && (
                            <span className="text-xs text-gray-400">
                              +{template.categories.length - 3} more
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                  {addingTemplates && (
                    <div className="flex items-center justify-center py-4 mt-4">
                      <Loader2 className="w-5 h-5 animate-spin text-primary-500 mr-2" />
                      <span className="text-sm text-gray-500">Adding categories...</span>
                    </div>
                  )}
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

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <Card className="p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Payment Methods</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Choose which payment methods to accept at your POS terminal
              </p>

              <div className="space-y-4">
                {/* QR Code Payment */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                      <QrCode className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">QR Code Payment</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Customers scan QR to pay via mobile banking
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods?.qrCode ?? true}
                      onChange={e => setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, qrCode: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* NFC Tap to Pay */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center">
                      <Nfc className="w-6 h-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Tap to Pay (NFC Card)</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Accept contactless NFC card payments
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods?.nfcTapToPay ?? true}
                      onChange={e => setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, nfcTapToPay: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* Mobile Money */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                      <Smartphone className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Mobile Money</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Accept Orange Money, Africell Money payments
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods?.mobileMoney ?? true}
                      onChange={e => setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, mobileMoney: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* Cash */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                      <Wallet className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Cash</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Accept cash payments with change calculation
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods?.cash ?? true}
                      onChange={e => setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, cash: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {/* Bank Transfer */}
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center">
                      <CreditCard className="w-6 h-6 text-cyan-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">Bank Transfer</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Accept direct bank transfers
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.paymentMethods?.bankTransfer ?? false}
                      onChange={e => setSettings({
                        ...settings,
                        paymentMethods: { ...settings.paymentMethods, bankTransfer: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Tip:</strong> Enabled payment methods will appear in the POS terminal checkout.
                  QR Code, Tap to Pay, and Mobile Money are recommended for faster transactions.
                </p>
              </div>
            </Card>
          )}

          {/* Display / Second Screen Tab */}
          {activeTab === 'display' && (
            <div className="space-y-6">
              {/* Enable Second Screen */}
              <Card className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                      <Monitor className="w-7 h-7 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Customer Display</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Show order details on a second screen facing customers
                      </p>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.secondScreen?.enabled ?? false}
                      onChange={e => setSettings({
                        ...settings,
                        secondScreen: { ...settings.secondScreen, enabled: e.target.checked }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                  </label>
                </div>

                {settings.secondScreen?.enabled && (
                  <>
                    {/* Launch Display Button */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Open Customer Display</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Launch in a new window and drag to second monitor
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            const displayUrl = `/merchant/pos/display?merchantId=${user?.id}`;
                            window.open(
                              displayUrl,
                              'CustomerDisplay',
                              'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no'
                            );
                          }}
                          className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                        >
                          <ExternalLink className="w-4 h-4 mr-2" />
                          Launch Display
                        </Button>
                      </div>
                    </div>

                    {/* Theme Selection - Improved with mini screen previews */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        <Palette className="w-4 h-4 inline mr-2" />
                        Display Theme
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: 'light', label: 'Light', icon: '☀️', bgColor: 'bg-white', textColor: 'text-gray-900', headerBg: 'bg-gray-100' },
                          { id: 'dark', label: 'Dark', icon: '🌙', bgColor: 'bg-gray-900', textColor: 'text-white', headerBg: 'bg-gray-800' },
                          { id: 'auto', label: 'Auto', icon: '🔄', bgColor: 'bg-gradient-to-br from-white to-gray-900', textColor: 'text-gray-600', headerBg: 'bg-gradient-to-r from-gray-100 to-gray-800' },
                        ].map(theme => (
                          <button
                            key={theme.id}
                            onClick={() => setSettings({
                              ...settings,
                              secondScreen: { ...settings.secondScreen, theme: theme.id as 'light' | 'dark' | 'auto' }
                            })}
                            className={`group relative p-3 rounded-xl border-2 transition-all ${
                              settings.secondScreen?.theme === theme.id
                                ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800 shadow-lg'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-md'
                            }`}
                          >
                            {/* Mini screen preview */}
                            <div className={`w-full aspect-video rounded-lg ${theme.bgColor} border border-gray-300 dark:border-gray-600 overflow-hidden shadow-inner`}>
                              {/* Mini header */}
                              <div className={`h-3 ${theme.headerBg} flex items-center justify-center`}>
                                <div className="w-4 h-1 bg-gray-400/50 rounded-full"></div>
                              </div>
                              {/* Mini content */}
                              <div className="p-1.5 space-y-1">
                                <div className={`h-1.5 ${theme.id === 'light' ? 'bg-gray-300' : theme.id === 'dark' ? 'bg-gray-600' : 'bg-gray-400'} rounded-full w-3/4`}></div>
                                <div className={`h-1 ${theme.id === 'light' ? 'bg-gray-200' : theme.id === 'dark' ? 'bg-gray-700' : 'bg-gray-500'} rounded-full w-1/2`}></div>
                                <div className={`h-1 ${theme.id === 'light' ? 'bg-gray-200' : theme.id === 'dark' ? 'bg-gray-700' : 'bg-gray-500'} rounded-full w-2/3`}></div>
                              </div>
                              {/* Mini total bar */}
                              <div className={`absolute bottom-3 left-3 right-3 h-2 ${theme.id === 'light' ? 'bg-green-500' : theme.id === 'dark' ? 'bg-green-400' : 'bg-green-500'} rounded-full opacity-80`}></div>
                            </div>
                            {/* Label with icon */}
                            <div className="flex items-center justify-center gap-2 mt-3">
                              <span className="text-lg">{theme.icon}</span>
                              <p className={`font-semibold ${settings.secondScreen?.theme === theme.id ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}>
                                {theme.label}
                              </p>
                            </div>
                            {/* Selected indicator */}
                            {settings.secondScreen?.theme === theme.id && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size - Improved with visual scale */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        <Type className="w-4 h-4 inline mr-2" />
                        Text Size
                      </label>
                      <div className="grid grid-cols-3 gap-4">
                        {[
                          { id: 'small', label: 'Small', textSize: 'text-lg', previewSize: '16px', scale: 0.85 },
                          { id: 'medium', label: 'Medium', textSize: 'text-xl', previewSize: '18px', scale: 1 },
                          { id: 'large', label: 'Large', textSize: 'text-2xl', previewSize: '22px', scale: 1.2 },
                        ].map(size => (
                          <button
                            key={size.id}
                            onClick={() => setSettings({
                              ...settings,
                              secondScreen: { ...settings.secondScreen, fontSize: size.id as 'small' | 'medium' | 'large' }
                            })}
                            className={`relative p-4 rounded-xl border-2 transition-all ${
                              settings.secondScreen?.fontSize === size.id
                                ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-lg'
                                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 hover:shadow-md'
                            }`}
                          >
                            {/* Preview text with actual scale */}
                            <div className="h-14 flex items-center justify-center">
                              <span
                                className={`font-bold ${settings.secondScreen?.fontSize === size.id ? 'text-primary-600' : 'text-gray-700 dark:text-gray-300'}`}
                                style={{ fontSize: `${24 * size.scale}px` }}
                              >
                                Aa
                              </span>
                            </div>
                            <p className={`text-sm font-medium mt-2 ${settings.secondScreen?.fontSize === size.id ? 'text-primary-600' : 'text-gray-600 dark:text-gray-400'}`}>
                              {size.label}
                            </p>
                            <p className={`text-xs ${settings.secondScreen?.fontSize === size.id ? 'text-primary-400' : 'text-gray-400'}`}>
                              {size.previewSize}
                            </p>
                            {/* Selected indicator */}
                            {settings.secondScreen?.fontSize === size.id && (
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-primary-500 rounded-full flex items-center justify-center shadow-lg">
                                <Check className="w-4 h-4 text-white" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* HEADER OPTIONS - Improved with icons */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Store className="w-4 h-4 text-indigo-500" />
                        Header Display
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {[
                          { key: 'showLogo', label: 'Logo', desc: 'Business logo', icon: '🏪' },
                          { key: 'showBusinessName', label: 'Business Name', desc: 'Store name', icon: '🏷️' },
                          { key: 'showDateTime', label: 'Date & Time', desc: 'Current time', icon: '🕐' },
                        ].map(option => (
                          <label key={option.key} className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                            settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                              settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                ? 'bg-indigo-100 dark:bg-indigo-900/40'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              {option.icon}
                            </div>
                            <div className="flex-1">
                              <p className={`font-medium text-sm ${
                                settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                  ? 'text-indigo-700 dark:text-indigo-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}>{option.label}</p>
                              <p className="text-xs text-gray-500">{option.desc}</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                ? 'border-indigo-500 bg-indigo-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {settings.secondScreen?.[option.key as keyof typeof settings.secondScreen] && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.secondScreen?.[option.key as keyof typeof settings.secondScreen] as boolean ?? true}
                              onChange={e => setSettings({
                                ...settings,
                                secondScreen: { ...settings.secondScreen, [option.key]: e.target.checked }
                              })}
                              className="sr-only"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* CART ITEM OPTIONS - Improved with icons */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-emerald-500" />
                        Cart Items Display
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                          { key: 'showItemImages', label: 'Product Images', desc: 'Item photos', icon: '🖼️' },
                          { key: 'showItemDescriptions', label: 'Descriptions', desc: 'Product details', icon: '📝' },
                          { key: 'showItemPrices', label: 'Unit Prices', desc: 'Price per item', icon: '💰' },
                          { key: 'showItemQuantity', label: 'Quantity', desc: 'Number of items', icon: '🔢' },
                          { key: 'showItemsAsAdded', label: 'Animate Items', desc: 'Highlight new items', icon: '✨' },
                        ].map(option => (
                          <label key={option.key} className={`relative flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                            settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}>
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                              settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              {option.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`font-medium text-sm truncate ${
                                settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}>{option.label}</p>
                              <p className="text-xs text-gray-500 truncate">{option.desc}</p>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                ? 'border-emerald-500 bg-emerald-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {settings.secondScreen?.[option.key as keyof typeof settings.secondScreen] && (
                                <Check className="w-4 h-4 text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.secondScreen?.[option.key as keyof typeof settings.secondScreen] as boolean ?? true}
                              onChange={e => setSettings({
                                ...settings,
                                secondScreen: { ...settings.secondScreen, [option.key]: e.target.checked }
                              })}
                              className="sr-only"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* TOTALS OPTIONS - Improved with icons */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-amber-500" />
                        Totals Display
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { key: 'showSubtotal', label: 'Subtotal', desc: 'Before tax', icon: '📋' },
                          { key: 'showTaxBreakdown', label: 'Tax', desc: 'Tax amount', icon: '🧾' },
                          { key: 'showDiscounts', label: 'Discounts', desc: 'Savings applied', icon: '🏷️' },
                          { key: 'showTotalAmount', label: 'Total', desc: 'Final amount', icon: '💵' },
                        ].map(option => (
                          <label key={option.key} className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                            settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                              ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                              settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                ? 'bg-amber-100 dark:bg-amber-900/40'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              {option.icon}
                            </div>
                            <div className="text-center">
                              <p className={`font-medium text-sm ${
                                settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}>{option.label}</p>
                              <p className="text-xs text-gray-500">{option.desc}</p>
                            </div>
                            <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                ? 'border-amber-500 bg-amber-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {settings.secondScreen?.[option.key as keyof typeof settings.secondScreen] && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.secondScreen?.[option.key as keyof typeof settings.secondScreen] as boolean ?? true}
                              onChange={e => setSettings({
                                ...settings,
                                secondScreen: { ...settings.secondScreen, [option.key]: e.target.checked }
                              })}
                              className="sr-only"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* PAYMENT & COMPLETION OPTIONS - Improved with icons */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-purple-500" />
                        Payment & Completion
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { key: 'showPaymentMethod', label: 'Payment Method', desc: 'How they paid', icon: '💳' },
                          { key: 'showPaymentAnimation', label: 'Success Animation', desc: 'Celebration effect', icon: '🎉' },
                          { key: 'showThankYouMessage', label: 'Thank You', desc: 'Completion message', icon: '🙏' },
                          { key: 'playSound', label: 'Sound Effects', desc: 'Audio feedback', icon: '🔔' },
                        ].map(option => (
                          <label key={option.key} className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                            settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                              ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20 shadow-sm'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                          }`}>
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                              settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                ? 'bg-purple-100 dark:bg-purple-900/40'
                                : 'bg-gray-100 dark:bg-gray-800'
                            }`}>
                              {option.icon}
                            </div>
                            <div className="text-center">
                              <p className={`font-medium text-sm ${
                                settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}>{option.label}</p>
                              <p className="text-xs text-gray-500">{option.desc}</p>
                            </div>
                            <div className={`absolute top-2 right-2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                              settings.secondScreen?.[option.key as keyof typeof settings.secondScreen]
                                ? 'border-purple-500 bg-purple-500'
                                : 'border-gray-300 dark:border-gray-600'
                            }`}>
                              {settings.secondScreen?.[option.key as keyof typeof settings.secondScreen] && (
                                <Check className="w-3 h-3 text-white" />
                              )}
                            </div>
                            <input
                              type="checkbox"
                              checked={settings.secondScreen?.[option.key as keyof typeof settings.secondScreen] as boolean ?? false}
                              onChange={e => setSettings({
                                ...settings,
                                secondScreen: { ...settings.secondScreen, [option.key]: e.target.checked }
                              })}
                              className="sr-only"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* MESSAGES - Improved with visual cards */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-500" />
                        Custom Messages
                      </h3>
                      <div className="space-y-4">
                        {/* Welcome Message */}
                        <div className={`rounded-xl border-2 overflow-hidden transition-all ${
                          settings.secondScreen?.showWelcomeMessage
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                                settings.secondScreen?.showWelcomeMessage
                                  ? 'bg-blue-100 dark:bg-blue-900/40'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                👋
                              </div>
                              <div>
                                <p className={`font-medium text-sm ${
                                  settings.secondScreen?.showWelcomeMessage
                                    ? 'text-blue-700 dark:text-blue-300'
                                    : 'text-gray-900 dark:text-white'
                                }`}>Welcome Message</p>
                                <p className="text-xs text-gray-500">Shown when display is idle</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings.secondScreen?.showWelcomeMessage ?? true}
                                onChange={e => setSettings({
                                  ...settings,
                                  secondScreen: { ...settings.secondScreen, showWelcomeMessage: e.target.checked }
                                })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                            </label>
                          </div>
                          {settings.secondScreen?.showWelcomeMessage && (
                            <div className="px-4 pb-4">
                              <input
                                type="text"
                                value={settings.secondScreen?.welcomeMessage ?? ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  secondScreen: { ...settings.secondScreen, welcomeMessage: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-blue-200 dark:border-blue-800 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Welcome! Your order will appear here."
                              />
                            </div>
                          )}
                        </div>

                        {/* Thank You Message */}
                        <div className={`rounded-xl border-2 overflow-hidden transition-all ${
                          settings.secondScreen?.showThankYouMessage
                            ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                                settings.secondScreen?.showThankYouMessage
                                  ? 'bg-green-100 dark:bg-green-900/40'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                ✅
                              </div>
                              <div>
                                <p className={`font-medium text-sm ${
                                  settings.secondScreen?.showThankYouMessage
                                    ? 'text-green-700 dark:text-green-300'
                                    : 'text-gray-900 dark:text-white'
                                }`}>Thank You Message</p>
                                <p className="text-xs text-gray-500">Shown after successful payment</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings.secondScreen?.showThankYouMessage ?? true}
                                onChange={e => setSettings({
                                  ...settings,
                                  secondScreen: { ...settings.secondScreen, showThankYouMessage: e.target.checked }
                                })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                            </label>
                          </div>
                          {settings.secondScreen?.showThankYouMessage && (
                            <div className="px-4 pb-4">
                              <input
                                type="text"
                                value={settings.secondScreen?.thankYouMessage ?? ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  secondScreen: { ...settings.secondScreen, thankYouMessage: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-green-200 dark:border-green-800 rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Thank you for your purchase!"
                              />
                            </div>
                          )}
                        </div>

                        {/* Promotional Banner */}
                        <div className={`rounded-xl border-2 overflow-hidden transition-all ${
                          settings.secondScreen?.showPromotionalBanner
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex items-center justify-between p-4 bg-white/50 dark:bg-gray-800/50">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                                settings.secondScreen?.showPromotionalBanner
                                  ? 'bg-orange-100 dark:bg-orange-900/40'
                                  : 'bg-gray-100 dark:bg-gray-800'
                              }`}>
                                📢
                              </div>
                              <div>
                                <p className={`font-medium text-sm ${
                                  settings.secondScreen?.showPromotionalBanner
                                    ? 'text-orange-700 dark:text-orange-300'
                                    : 'text-gray-900 dark:text-white'
                                }`}>Promotional Banner</p>
                                <p className="text-xs text-gray-500">Scrolling text at bottom of display</p>
                              </div>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={settings.secondScreen?.showPromotionalBanner ?? false}
                                onChange={e => setSettings({
                                  ...settings,
                                  secondScreen: { ...settings.secondScreen, showPromotionalBanner: e.target.checked }
                                })}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                            </label>
                          </div>
                          {settings.secondScreen?.showPromotionalBanner && (
                            <div className="px-4 pb-4">
                              <input
                                type="text"
                                value={settings.secondScreen?.promotionalMessage ?? ''}
                                onChange={e => setSettings({
                                  ...settings,
                                  secondScreen: { ...settings.secondScreen, promotionalMessage: e.target.value }
                                })}
                                className="w-full px-4 py-3 border border-orange-200 dark:border-orange-800 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="Special offer: 10% off on all items today!"
                              />
                              {/* Preview of scrolling text */}
                              {settings.secondScreen?.promotionalMessage && (
                                <div className="mt-3 overflow-hidden bg-orange-100 dark:bg-orange-900/30 rounded-lg py-2">
                                  <p className="text-sm text-orange-700 dark:text-orange-300 whitespace-nowrap animate-marquee">
                                    {settings.secondScreen.promotionalMessage} &nbsp;&nbsp;&nbsp; • &nbsp;&nbsp;&nbsp; {settings.secondScreen.promotionalMessage}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </Card>

              {/* Setup Instructions */}
              {settings.secondScreen?.enabled && (
                <Card className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-blue-600" />
                    How to Set Up Your Second Screen
                  </h3>
                  <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-xs">1</span>
                      <span>Connect a second monitor or TV to your computer</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-xs">2</span>
                      <span>Extend your display (don't mirror) in system settings</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-xs">3</span>
                      <span>Click "Launch Display" and drag the window to your customer-facing screen</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300 font-medium text-xs">4</span>
                      <span>Press F11 to make it fullscreen, then start selling!</span>
                    </li>
                  </ol>
                </Card>
              )}
            </div>
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
          {activeTab === 'receipts' && (
            <div className="space-y-6">
              {/* Receipt Template Selection */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-2">Receipt Template</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Choose a receipt layout that fits your business style
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {receiptTemplates.map(template => (
                    <button
                      key={template.id}
                      onClick={() => setSettings({ ...settings, receiptTemplate: template.id as 'classic' | 'modern' | 'detailed' })}
                      className={`relative p-4 rounded-xl border-2 transition-all text-left ${
                        settings.receiptTemplate === template.id
                          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      {/* Template Preview */}
                      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600 p-3 mb-3">
                        {template.id === 'classic' && (
                          <div className="text-center font-mono text-[8px] space-y-1">
                            <div className="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded mx-auto mb-1"></div>
                            <p className="font-bold text-gray-700 dark:text-gray-300">BUSINESS NAME</p>
                            <div className="border-t border-dashed border-gray-300 my-1"></div>
                            <p className="text-gray-500">Item x 2 ... Le 5,000</p>
                            <p className="text-gray-500">Item x 1 ... Le 3,000</p>
                            <div className="border-t border-dashed border-gray-300 my-1"></div>
                            <p className="font-bold text-gray-700 dark:text-gray-300">TOTAL Le 8,000</p>
                          </div>
                        )}
                        {template.id === 'modern' && (
                          <div className="font-sans text-[8px] space-y-1">
                            <div className="flex items-center gap-1 mb-2">
                              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded"></div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">Business</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Item x 2</span><span>Le 5,000</span>
                            </div>
                            <div className="flex justify-between text-gray-500">
                              <span>Item x 1</span><span>Le 3,000</span>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <div className="flex justify-between font-bold text-gray-700 dark:text-gray-300">
                              <span>Total</span><span>Le 8,000</span>
                            </div>
                          </div>
                        )}
                        {template.id === 'detailed' && (
                          <div className="font-mono text-[7px] space-y-0.5">
                            <div className="text-center">
                              <p className="font-bold text-gray-700 dark:text-gray-300">BUSINESS NAME</p>
                              <p className="text-gray-400">Address Line</p>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <div className="text-gray-500">
                              <p>Product One</p>
                              <p className="flex justify-between pl-2"><span>2 x Le 2,500</span><span>Le 5,000</span></p>
                              <p>Product Two</p>
                              <p className="flex justify-between pl-2"><span>1 x Le 3,000</span><span>Le 3,000</span></p>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <div className="text-gray-500">
                              <p className="flex justify-between"><span>Subtotal</span><span>Le 8,000</span></p>
                              <p className="flex justify-between"><span>Tax (0%)</span><span>Le 0</span></p>
                            </div>
                            <div className="border-t border-gray-200 dark:border-gray-600 my-1"></div>
                            <p className="flex justify-between font-bold text-gray-700 dark:text-gray-300">
                              <span>TOTAL</span><span>Le 8,000</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Template Info */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{template.description}</p>
                        </div>
                        {settings.receiptTemplate === template.id && (
                          <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Receipt Customization */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Customize Content</h2>

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
                </div>
              </Card>

              {/* Live Receipt Preview */}
              <Card className="p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Live Preview</h2>
                <div className="flex justify-center">
                  <div className="bg-white border border-gray-200 rounded-lg p-6 w-72 shadow-lg font-mono text-sm">
                    {/* Classic Template Preview */}
                    {settings.receiptTemplate === 'classic' && (
                      <>
                        <div className="text-center border-b pb-3 mb-3">
                          {settings.showLogo && (
                            <div className="w-12 h-12 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center">
                              <Store className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <p className="font-bold text-gray-800">{settings.businessName || 'Business Name'}</p>
                          <p className="text-xs text-gray-500">{settings.businessAddress || 'Address'}</p>
                          <p className="text-xs text-gray-500">{settings.businessPhone}</p>
                        </div>
                        {settings.receiptHeader && (
                          <p className="text-center text-gray-600 text-xs mb-3">{settings.receiptHeader}</p>
                        )}
                        <div className="border-t border-dashed pt-2 text-xs text-gray-600">
                          <p>Item 1 x 2 .............. Le 5,000</p>
                          <p>Item 2 x 1 .............. Le 3,000</p>
                        </div>
                        <div className="border-t border-dashed pt-2 mt-2">
                          <p className="flex justify-between font-bold text-gray-800">
                            <span>TOTAL</span>
                            <span>Le 8,000</span>
                          </p>
                        </div>
                        {settings.receiptFooter && (
                          <p className="text-center text-gray-600 text-xs mt-3 pt-3 border-t border-dashed">
                            {settings.receiptFooter}
                          </p>
                        )}
                      </>
                    )}

                    {/* Modern Template Preview */}
                    {settings.receiptTemplate === 'modern' && (
                      <div className="font-sans">
                        <div className="flex items-center gap-3 mb-4">
                          {settings.showLogo && (
                            <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                              <Store className="w-5 h-5 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold text-gray-800">{settings.businessName || 'Business Name'}</p>
                            <p className="text-xs text-gray-400">{settings.businessPhone}</p>
                          </div>
                        </div>
                        {settings.receiptHeader && (
                          <p className="text-xs text-gray-500 mb-3 pb-3 border-b">{settings.receiptHeader}</p>
                        )}
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Item 1 x 2</span>
                            <span className="text-gray-800">Le 5,000</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Item 2 x 1</span>
                            <span className="text-gray-800">Le 3,000</span>
                          </div>
                        </div>
                        <div className="border-t mt-3 pt-3">
                          <div className="flex justify-between font-semibold text-lg">
                            <span className="text-gray-600">Total</span>
                            <span className="text-gray-800">Le 8,000</span>
                          </div>
                        </div>
                        {settings.receiptFooter && (
                          <p className="text-xs text-gray-400 text-center mt-4">{settings.receiptFooter}</p>
                        )}
                      </div>
                    )}

                    {/* Detailed Template Preview */}
                    {settings.receiptTemplate === 'detailed' && (
                      <>
                        <div className="text-center border-b pb-3 mb-3">
                          {settings.showLogo && (
                            <div className="w-12 h-12 bg-gray-200 rounded mx-auto mb-2 flex items-center justify-center">
                              <Store className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <p className="font-bold text-gray-800">{settings.businessName || 'Business Name'}</p>
                          <p className="text-xs text-gray-500">{settings.businessAddress || 'Address'}</p>
                          <p className="text-xs text-gray-500">{settings.businessPhone}</p>
                          {settings.taxNumber && (
                            <p className="text-xs text-gray-400">Tax #: {settings.taxNumber}</p>
                          )}
                        </div>
                        {settings.receiptHeader && (
                          <p className="text-xs text-gray-500 text-center mb-3">{settings.receiptHeader}</p>
                        )}
                        <div className="text-xs space-y-2">
                          <div>
                            <p className="font-medium text-gray-700">Sample Product One</p>
                            <div className="flex justify-between text-gray-500 pl-2">
                              <span>2 x Le 2,500</span>
                              <span>Le 5,000</span>
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-gray-700">Sample Product Two</p>
                            <div className="flex justify-between text-gray-500 pl-2">
                              <span>1 x Le 3,000</span>
                              <span>Le 3,000</span>
                            </div>
                          </div>
                        </div>
                        <div className="border-t border-dashed pt-2 mt-3 text-xs space-y-1">
                          <div className="flex justify-between text-gray-600">
                            <span>Subtotal</span>
                            <span>Le 8,000</span>
                          </div>
                          {settings.enableTax && (
                            <div className="flex justify-between text-gray-600">
                              <span>{settings.taxLabel} ({settings.defaultTaxRate}%)</span>
                              <span>Le {Math.round(8000 * settings.defaultTaxRate / 100).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        <div className="border-t border-double pt-2 mt-2">
                          <div className="flex justify-between font-bold text-gray-800">
                            <span>TOTAL</span>
                            <span>Le {settings.enableTax ? (8000 + Math.round(8000 * settings.defaultTaxRate / 100)).toLocaleString() : '8,000'}</span>
                          </div>
                        </div>
                        {settings.receiptFooter && (
                          <p className="text-center text-gray-500 text-xs mt-3 pt-3 border-t border-dashed">
                            {settings.receiptFooter}
                          </p>
                        )}
                        <div className="text-center text-[10px] text-gray-400 mt-3 pt-2 border-t">
                          <p>{new Date().toLocaleString()}</p>
                          <p>Receipt #001234</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </div>
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
