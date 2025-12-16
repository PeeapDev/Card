/**
 * POS Setup Wizard
 *
 * Guides merchants through initial POS configuration:
 * - Business/Invoice details
 * - Categories setup
 * - Product limit check (15 products for free tier)
 * - Receipt preferences
 * - Tax settings
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui';
import { useAuth } from '@/context/AuthContext';
import { useApps } from '@/context/AppsContext';
import posService, { POSCategory, POSSettings as DBPOSSettings } from '@/services/pos.service';
import {
  ShoppingCart,
  FileText,
  Package,
  Settings,
  Check,
  ChevronRight,
  ChevronLeft,
  Store,
  Receipt,
  Percent,
  Crown,
  AlertCircle,
  Loader2,
  Tag,
  Plus,
  Trash2,
  Edit2,
  X,
  FolderOpen,
} from 'lucide-react';

const FREE_PRODUCT_LIMIT = 15;

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
  // Product settings
  expectedProducts: number;
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
  expectedProducts: 10,
  setupCompleted: false,
};

const steps = [
  { id: 'welcome', title: 'Welcome', icon: ShoppingCart },
  { id: 'business', title: 'Business Info', icon: Store },
  { id: 'categories', title: 'Categories', icon: FolderOpen },
  { id: 'products', title: 'Products', icon: Package },
  { id: 'receipt', title: 'Receipt', icon: Receipt },
  { id: 'tax', title: 'Tax Settings', icon: Percent },
  { id: 'complete', title: 'Complete', icon: Check },
];

// Color options for categories
const colorOptions = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
];

export function POSSetupWizard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshApps } = useApps();
  const [currentStep, setCurrentStep] = useState(0);
  const [settings, setSettings] = useState<POSSettings>(defaultSettings);
  const [saving, setSaving] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

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

  // Load existing settings if any
  useEffect(() => {
    const loadSettings = async () => {
      if (user?.id) {
        // Load from database
        const dbSettings = await posService.getPOSSettings(user.id);
        if (dbSettings) {
          setSettings({
            businessName: dbSettings.business_name || '',
            businessAddress: dbSettings.business_address || '',
            businessPhone: dbSettings.business_phone || '',
            businessEmail: dbSettings.business_email || '',
            taxNumber: dbSettings.tax_number || '',
            showLogo: dbSettings.show_logo ?? true,
            receiptHeader: dbSettings.receipt_header || 'Thank you for your purchase!',
            receiptFooter: dbSettings.receipt_footer || 'Please come again!',
            enableTax: dbSettings.enable_tax ?? false,
            defaultTaxRate: dbSettings.default_tax_rate ?? 15,
            taxLabel: dbSettings.tax_label || 'GST',
            expectedProducts: dbSettings.expected_products ?? 10,
            setupCompleted: dbSettings.setup_completed ?? false,
          });
        } else {
          // Pre-fill with user data if no settings exist
          setSettings(prev => ({
            ...prev,
            businessName: `${user.firstName} ${user.lastName}`,
            businessEmail: user.email || '',
            businessPhone: user.phone || '',
          }));
        }
      }
    };
    loadSettings();
  }, [user]);

  // Load categories when on categories step
  useEffect(() => {
    if (user?.id && steps[currentStep].id === 'categories') {
      loadCategories();
    }
  }, [user, currentStep]);

  const loadCategories = async () => {
    if (!user?.id) return;
    setLoadingCategories(true);
    try {
      const cats = await posService.getCategories(user.id);
      setCategories(cats);
    } catch (error) {
      console.error('Error loading categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

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
    if (!categoryForm.name || !user?.id) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const categoryData = {
        merchant_id: user.id,
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

  const deleteCategory = async (category: POSCategory) => {
    if (!confirm(`Delete category "${category.name}"?`)) return;

    try {
      await posService.deleteCategory(category.id);
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  const updateSettings = (updates: Partial<POSSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    // Check product limit before proceeding from products step
    if (steps[currentStep].id === 'products') {
      if (settings.expectedProducts > FREE_PRODUCT_LIMIT) {
        setShowUpgradePrompt(true);
        return;
      }
    }
    setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const completeSetup = async () => {
    if (!user?.id) return;

    setSaving(true);
    try {
      // Save to database
      const dbSettings: Partial<DBPOSSettings> & { merchant_id: string } = {
        merchant_id: user.id,
        business_name: settings.businessName,
        business_address: settings.businessAddress,
        business_phone: settings.businessPhone,
        business_email: settings.businessEmail,
        tax_number: settings.taxNumber,
        show_logo: settings.showLogo,
        receipt_header: settings.receiptHeader,
        receipt_footer: settings.receiptFooter,
        enable_tax: settings.enableTax,
        default_tax_rate: settings.defaultTaxRate,
        tax_label: settings.taxLabel,
        expected_products: settings.expectedProducts,
        setup_completed: true,
      };

      const result = await posService.savePOSSettings(dbSettings);

      if (result) {
        // Refresh apps context to update sidebar
        await refreshApps();
        navigate('/merchant/apps/pos');
      } else {
        alert('Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving POS settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/merchant/upgrade');
  };

  const continueWithLimit = () => {
    setShowUpgradePrompt(false);
    updateSettings({ expectedProducts: FREE_PRODUCT_LIMIT });
    setCurrentStep(prev => prev + 1);
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'welcome':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingCart className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Welcome to POS Setup
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
              Let's set up your Point of Sale system. This wizard will help you configure
              your invoice details, product settings, and receipt preferences.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <FileText className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">Custom Invoices</p>
                <p className="text-xs text-gray-500">Your branding on receipts</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Package className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">Product Management</p>
                <p className="text-xs text-gray-500">Up to {FREE_PRODUCT_LIMIT} products free</p>
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Settings className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-900 dark:text-white">Tax Settings</p>
                <p className="text-xs text-gray-500">Automatic tax calculation</p>
              </div>
            </div>
          </div>
        );

      case 'business':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Business Information</h2>
              <p className="text-gray-500 dark:text-gray-400">This will appear on your invoices and receipts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name *
                </label>
                <input
                  type="text"
                  value={settings.businessName}
                  onChange={(e) => updateSettings({ businessName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  placeholder="Your Business Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={settings.businessPhone}
                  onChange={(e) => updateSettings({ businessPhone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  placeholder="+232 XX XXX XXXX"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Address
                </label>
                <textarea
                  value={settings.businessAddress}
                  onChange={(e) => updateSettings({ businessAddress: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  placeholder="Street address, City"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={settings.businessEmail}
                  onChange={(e) => updateSettings({ businessEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  placeholder="business@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Tax ID / TIN (Optional)
                </label>
                <input
                  type="text"
                  value={settings.taxNumber}
                  onChange={(e) => updateSettings({ taxNumber: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                  placeholder="Tax Identification Number"
                />
              </div>
            </div>
          </div>
        );

      case 'categories':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product Categories</h2>
              <p className="text-gray-500 dark:text-gray-400">Organize your products into categories for easier management</p>
            </div>

            <div className="max-w-2xl mx-auto">
              {/* Add Category Button */}
              <div className="flex justify-end mb-4">
                <Button onClick={() => openCategoryModal()}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Category
                </Button>
              </div>

              {/* Categories List */}
              {loadingCategories ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-green-600" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
                  <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No categories yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Create categories to organize your products
                  </p>
                  <Button onClick={() => openCategoryModal()}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Category
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {categories.map(cat => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{cat.name}</p>
                          {cat.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">{cat.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openCategoryModal(cat)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500 hover:text-gray-700"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteCategory(cat)}
                          className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-gray-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Tag className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Categories help organize products
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Examples: Beverages, Snacks, Electronics, Groceries, etc.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'products':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Product Inventory</h2>
              <p className="text-gray-500 dark:text-gray-400">How many products do you plan to sell?</p>
            </div>

            <div className="max-w-md mx-auto">
              <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Expected number of products
                </label>
                <input
                  type="number"
                  min="1"
                  max="1000"
                  value={settings.expectedProducts}
                  onChange={(e) => updateSettings({ expectedProducts: parseInt(e.target.value) || 1 })}
                  className="w-full px-4 py-3 text-2xl text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <Package className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300">
                      Free Tier: Up to {FREE_PRODUCT_LIMIT} products
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                      Need more? Upgrade to Merchant+ for unlimited products.
                    </p>
                  </div>
                </div>
              </div>

              {settings.expectedProducts > FREE_PRODUCT_LIMIT && (
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900 dark:text-amber-300">
                        You've selected more than {FREE_PRODUCT_LIMIT} products
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                        You'll need to upgrade to Merchant+ to add more than {FREE_PRODUCT_LIMIT} products.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 'receipt':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Receipt Preferences</h2>
              <p className="text-gray-500 dark:text-gray-400">Customize what appears on customer receipts</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receipt Header Message
                  </label>
                  <input
                    type="text"
                    value={settings.receiptHeader}
                    onChange={(e) => updateSettings({ receiptHeader: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    placeholder="Thank you for your purchase!"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Receipt Footer Message
                  </label>
                  <input
                    type="text"
                    value={settings.receiptFooter}
                    onChange={(e) => updateSettings({ receiptFooter: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    placeholder="Please come again!"
                  />
                </div>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Show Logo on Receipt</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Display your business logo</p>
                  </div>
                  <button
                    onClick={() => updateSettings({ showLogo: !settings.showLogo })}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      settings.showLogo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.showLogo ? 'translate-x-7' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Receipt Preview</p>
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded font-mono text-xs space-y-2">
                  <div className="text-center border-b border-dashed border-gray-300 dark:border-gray-600 pb-2">
                    <p className="font-bold">{settings.businessName || 'Your Business'}</p>
                    <p className="text-gray-500">{settings.businessAddress || 'Address'}</p>
                    <p className="text-gray-500">{settings.businessPhone || 'Phone'}</p>
                  </div>
                  <p className="text-center text-gray-600 dark:text-gray-400 italic">
                    {settings.receiptHeader}
                  </p>
                  <div className="border-t border-b border-dashed border-gray-300 dark:border-gray-600 py-2">
                    <p>Item 1 ................ SLE 100</p>
                    <p>Item 2 ................ SLE 200</p>
                    <p className="font-bold mt-2">TOTAL: SLE 300</p>
                  </div>
                  <p className="text-center text-gray-600 dark:text-gray-400 italic">
                    {settings.receiptFooter}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'tax':
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Tax Settings</h2>
              <p className="text-gray-500 dark:text-gray-400">Configure tax calculation for your sales</p>
            </div>

            <div className="max-w-md mx-auto space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable Tax</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add tax to product prices</p>
                </div>
                <button
                  onClick={() => updateSettings({ enableTax: !settings.enableTax })}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    settings.enableTax ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      settings.enableTax ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.enableTax && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tax Label
                    </label>
                    <input
                      type="text"
                      value={settings.taxLabel}
                      onChange={(e) => updateSettings({ taxLabel: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                      placeholder="GST, VAT, Tax, etc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={settings.defaultTaxRate}
                      onChange={(e) => updateSettings({ defaultTaxRate: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <p className="text-sm text-green-800 dark:text-green-300">
                      Example: A SLE 100 item will be charged SLE {(100 * (1 + settings.defaultTaxRate / 100)).toFixed(0)} ({settings.taxLabel} {settings.defaultTaxRate}%)
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        );

      case 'complete':
        return (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Setup Complete!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto mb-8">
              Your POS system is ready to use. You can start adding products and making sales.
            </p>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 max-w-md mx-auto text-left space-y-3">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Business info configured</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  {categories.length} {categories.length === 1 ? 'category' : 'categories'} created
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Product limit: {Math.min(settings.expectedProducts, FREE_PRODUCT_LIMIT)} products
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">Receipt customized</span>
              </div>
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-500" />
                <span className="text-gray-700 dark:text-gray-300">
                  Tax: {settings.enableTax ? `${settings.defaultTaxRate}% ${settings.taxLabel}` : 'Disabled'}
                </span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <MerchantLayout>
      <div className="max-w-4xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;

              return (
                <div key={step.id} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${
                      isCompleted
                        ? 'bg-green-500 text-white'
                        : isActive
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 ring-2 ring-green-500'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-400'
                    }`}
                  >
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-5 h-5" />}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`hidden sm:block w-12 md:w-24 h-1 mx-2 rounded ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="hidden sm:flex justify-between mt-2">
            {steps.map((step, index) => (
              <p
                key={step.id}
                className={`text-xs ${
                  index === currentStep
                    ? 'text-green-600 dark:text-green-400 font-medium'
                    : 'text-gray-400'
                }`}
              >
                {step.title}
              </p>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <Card className="p-6 md:p-8">
          {renderStepContent()}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Button
              variant="outline"
              onClick={prevStep}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Back
            </Button>

            {currentStep === steps.length - 1 ? (
              <Button onClick={completeSetup} disabled={saving}>
                {saving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Start Using POS
              </Button>
            ) : (
              <Button onClick={nextStep} disabled={!settings.businessName && currentStep === 1}>
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </Card>

        {/* Upgrade Modal */}
        {showUpgradePrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4 shadow-xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Crown className="w-8 h-8 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Upgrade to Merchant+
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  You've selected {settings.expectedProducts} products. The free tier supports up to {FREE_PRODUCT_LIMIT} products.
                  Upgrade to Merchant+ for unlimited products and more features!
                </p>
                <div className="space-y-3">
                  <Button onClick={handleUpgrade} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
                    <Crown className="w-4 h-4 mr-2" />
                    Upgrade to Merchant+
                  </Button>
                  <Button variant="outline" onClick={continueWithLimit} className="w-full">
                    Continue with {FREE_PRODUCT_LIMIT} products
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Category Modal */}
        {showCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md shadow-xl">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
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

              <div className="p-4 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={e => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Beverages"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={categoryForm.description}
                    onChange={e => setCategoryForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-green-500"
                    placeholder="Optional description"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Color
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {colorOptions.map(color => (
                      <button
                        key={color}
                        onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform ${
                          categoryForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: color }}
                      >
                        {categoryForm.color === color && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex gap-3 rounded-b-xl">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowCategoryModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={saveCategory}
                  disabled={saving || !categoryForm.name}
                >
                  {saving ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  {editingCategory ? 'Update' : 'Create'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MerchantLayout>
  );
}

export default POSSetupWizard;
