import { useState, useEffect } from 'react';
import {
  Briefcase,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Save,
  X,
  Loader2,
  ShoppingCart,
  Utensils,
  Heart,
  GraduationCap,
  Monitor,
  Truck,
  Film,
  Building2,
  Landmark,
  Plane,
  Wheat,
  Factory,
  HardHat,
  Wifi,
  HeartHandshake,
  MoreHorizontal,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

interface BusinessCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  parent_id: string | null;
  status: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
  merchant_count?: number;
}

interface CategoryFormData {
  name: string;
  description: string;
  icon: string;
  parent_id: string;
  sort_order: number;
}

// Map icon names to Lucide components
const iconMap: Record<string, LucideIcon> = {
  ShoppingCart,
  Utensils,
  Briefcase,
  Heart,
  GraduationCap,
  Monitor,
  Truck,
  Film,
  Building2,
  Landmark,
  Plane,
  Wheat,
  Factory,
  HardHat,
  Wifi,
  HeartHandshake,
  HandHeart: HeartHandshake, // Alias for database entries that use HandHeart
  MoreHorizontal,
  Store,
};

const availableIcons = Object.keys(iconMap);

export function BusinessCategoriesPage() {
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<BusinessCategory | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    icon: 'Store',
    parent_id: '',
    sort_order: 0,
  });

  // Quick subcategory add state
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddParent, setQuickAddParent] = useState<BusinessCategory | null>(null);
  const [quickAddNames, setQuickAddNames] = useState('');
  const [quickAddLoading, setQuickAddLoading] = useState(false);

  // Expanded parent categories (to show/hide subcategories)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('business_categories')
        .select('*')
        .order('sort_order', { ascending: true });

      if (categoriesError) {
        console.error('Error fetching categories:', categoriesError);
        setCategories([]);
        return;
      }

      // Fetch merchant counts per category
      const { data: merchantCounts } = await supabase
        .from('users')
        .select('business_category_id')
        .ilike('roles', '%merchant%')
        .not('business_category_id', 'is', null);

      // Count merchants per category
      const countMap = new Map<string, number>();
      merchantCounts?.forEach(m => {
        const catId = m.business_category_id;
        countMap.set(catId, (countMap.get(catId) || 0) + 1);
      });

      // Merge counts with categories
      const categoriesWithCounts = (categoriesData || []).map(cat => ({
        ...cat,
        merchant_count: countMap.get(cat.id) || 0,
      }));

      setCategories(categoriesWithCounts);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(category => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && category.status === 'ACTIVE') ||
      (statusFilter === 'inactive' && category.status === 'INACTIVE');

    return matchesSearch && matchesStatus;
  });

  // Get only parent categories for main table display
  const getParentCategories = () => {
    return filteredCategories.filter(c => !c.parent_id);
  };

  // Get subcategories for a parent
  const getSubcategories = (parentId: string) => {
    return categories.filter(c => c.parent_id === parentId);
  };

  // Toggle expanded state for a category
  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const parentCategories = getParentCategories();

  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = categories.find(c => c.id === parentId);
    return parent?.name || null;
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'Store',
      parent_id: '',
      sort_order: categories.length + 1,
    });
    setFormError('');
    setEditingCategory(null);
  };

  const openAddModal = () => {
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (category: BusinessCategory) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      icon: category.icon || 'Store',
      parent_id: category.parent_id || '',
      sort_order: category.sort_order,
    });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);

    try {
      if (!formData.name.trim()) {
        setFormError('Category name is required');
        setFormLoading(false);
        return;
      }

      const categoryData = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        icon: formData.icon,
        parent_id: formData.parent_id || null,
        sort_order: formData.sort_order,
      };

      if (editingCategory) {
        // Update existing category
        const { error } = await supabase
          .from('business_categories')
          .update(categoryData)
          .eq('id', editingCategory.id);

        if (error) {
          setFormError(error.message);
          setFormLoading(false);
          return;
        }
      } else {
        // Create new category
        const { error } = await supabase
          .from('business_categories')
          .insert({ ...categoryData, status: 'ACTIVE' });

        if (error) {
          setFormError(error.message);
          setFormLoading(false);
          return;
        }
      }

      closeModal();
      fetchCategories();
    } catch (error: any) {
      console.error('Error saving category:', error);
      setFormError(error.message || 'An unexpected error occurred');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleCategoryStatus = async (categoryId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      const { error } = await supabase
        .from('business_categories')
        .update({ status: newStatus })
        .eq('id', categoryId);

      if (error) {
        console.error('Error updating category status:', error);
        return;
      }
      fetchCategories();
    } catch (error) {
      console.error('Error updating category status:', error);
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!confirm('Are you sure you want to delete this category? Merchants using this category will have their category unset.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('business_categories')
        .delete()
        .eq('id', categoryId);

      if (error) {
        console.error('Error deleting category:', error);
        alert('Failed to delete category: ' + error.message);
        return;
      }
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const getIconComponent = (iconName: string | null) => {
    const Icon = iconMap[iconName || 'Store'] || Store;
    return <Icon className="w-5 h-5" />;
  };

  const openQuickAddModal = (parent: BusinessCategory) => {
    setQuickAddParent(parent);
    setQuickAddNames('');
    setShowQuickAddModal(true);
  };

  const handleQuickAdd = async () => {
    if (!quickAddParent || !quickAddNames.trim()) return;

    setQuickAddLoading(true);
    try {
      // Split by comma and clean up names
      const names = quickAddNames
        .split(',')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (names.length === 0) {
        setQuickAddLoading(false);
        return;
      }

      // Get max sort order for this parent's children
      const existingChildren = categories.filter(c => c.parent_id === quickAddParent.id);
      let sortOrder = existingChildren.length > 0
        ? Math.max(...existingChildren.map(c => c.sort_order)) + 1
        : 1;

      // Insert all subcategories
      const subcategories = names.map((name, index) => ({
        name,
        description: null,
        icon: quickAddParent.icon || 'Store',
        parent_id: quickAddParent.id,
        status: 'ACTIVE',
        sort_order: sortOrder + index,
      }));

      const { error } = await supabase
        .from('business_categories')
        .insert(subcategories);

      if (error) {
        console.error('Error adding subcategories:', error);
        alert('Failed to add subcategories: ' + error.message);
        return;
      }

      setShowQuickAddModal(false);
      setQuickAddNames('');
      setQuickAddParent(null);
      fetchCategories();
    } catch (error) {
      console.error('Error adding subcategories:', error);
    } finally {
      setQuickAddLoading(false);
    }
  };


  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Business Categories</h1>
            <p className="text-gray-500">Manage business categories for merchant classification</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Parent Categories</p>
                <p className="text-xl font-semibold">{categories.filter(c => !c.parent_id).length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <ChevronDown className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Subcategories</p>
                <p className="text-xl font-semibold">{categories.filter(c => c.parent_id).length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Active</p>
                <p className="text-xl font-semibold">{categories.filter(c => c.status === 'ACTIVE').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <XCircle className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Inactive</p>
                <p className="text-xl font-semibold">{categories.filter(c => c.status === 'INACTIVE').length}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Store className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Merchants Assigned</p>
                <p className="text-xl font-semibold">{categories.reduce((sum, c) => sum + (c.merchant_count || 0), 0)}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </Card>

        {/* Categories Table */}
        <Card className="overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-2 text-gray-500">Loading categories...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcategories</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Merchants</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {parentCategories.map((category) => {
                  const subcategories = getSubcategories(category.id);
                  const isExpanded = expandedCategories.has(category.id);

                  return (
                    <tr key={category.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-100 text-blue-600">
                            {getIconComponent(category.icon)}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{category.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-600 max-w-xs truncate">
                          {category.description || 'No description'}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {/* Subcategory toggle and count */}
                          <div className="flex items-center gap-2">
                            {subcategories.length > 0 ? (
                              <button
                                onClick={() => toggleExpanded(category.id)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {subcategories.length} subcategories
                              </button>
                            ) : (
                              <span className="text-xs text-gray-400">No subcategories</span>
                            )}
                            <button
                              onClick={() => openQuickAddModal(category)}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 transition-colors"
                              title="Add subcategories"
                            >
                              <Plus className="w-3 h-3" />
                              Add
                            </button>
                          </div>

                          {/* Expanded subcategories dropdown */}
                          {isExpanded && subcategories.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2 p-2 bg-gray-50 rounded-lg max-w-md">
                              {subcategories.map(sub => (
                                <span
                                  key={sub.id}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    sub.status === 'ACTIVE'
                                      ? 'bg-white border border-gray-200 text-gray-700'
                                      : 'bg-gray-200 text-gray-500'
                                  }`}
                                >
                                  {sub.name}
                                  <button
                                    onClick={() => openEditModal(sub)}
                                    className="hover:text-primary-600"
                                    title="Edit"
                                  >
                                    <Edit className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => deleteCategory(sub.id)}
                                    className="hover:text-red-600"
                                    title="Delete"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                          {category.merchant_count || 0} merchants
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          category.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>
                          {category.status === 'ACTIVE' ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(category)}
                            className="p-2 hover:bg-gray-100 rounded-lg"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => toggleCategoryStatus(category.id, category.status)}
                            className={`p-2 hover:bg-gray-100 rounded-lg ${
                              category.status === 'ACTIVE' ? 'text-yellow-500' : 'text-green-500'
                            }`}
                            title={category.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          >
                            {category.status === 'ACTIVE' ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => deleteCategory(category.id)}
                            className="p-2 hover:bg-gray-100 rounded-lg text-red-500"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          {!loading && parentCategories.length === 0 && (
            <div className="p-8 text-center">
              <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No categories found</p>
            </div>
          )}
        </Card>
      </div>

      {/* Add/Edit Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add New Category'}
              </h2>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="e.g., Retail & Shopping"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Brief description of this category"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {availableIcons.map((iconName) => {
                    const Icon = iconMap[iconName];
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormData({ ...formData, icon: iconName })}
                        className={`p-2 rounded-lg border-2 transition-colors ${
                          formData.icon === iconName
                            ? 'border-primary-500 bg-primary-50 text-primary-600'
                            : 'border-gray-200 hover:border-gray-300 text-gray-500'
                        }`}
                        title={iconName}
                      >
                        <Icon className="w-5 h-5 mx-auto" />
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500">Selected: {formData.icon}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Category (Optional - for subcategories)
                </label>
                <select
                  value={formData.parent_id}
                  onChange={(e) => setFormData({ ...formData, parent_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">None (This is a parent category)</option>
                  {categories
                    .filter(c => c.id !== editingCategory?.id && !c.parent_id) // Only show parent categories
                    .map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))
                  }
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Select a parent to create a subcategory, or leave empty for a main category
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  value={formData.sort_order}
                  onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  min={0}
                />
                <p className="text-xs text-gray-500 mt-1">Lower numbers appear first</p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {editingCategory ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      {editingCategory ? 'Update Category' : 'Create Category'}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Add Subcategories Modal */}
      {showQuickAddModal && quickAddParent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Subcategories
                </h2>
                <p className="text-sm text-gray-500">
                  Adding to: <span className="font-medium text-primary-600">{quickAddParent.name}</span>
                </p>
              </div>
              <button
                onClick={() => {
                  setShowQuickAddModal(false);
                  setQuickAddParent(null);
                  setQuickAddNames('');
                }}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Existing subcategories */}
              {getSubcategories(quickAddParent.id).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Existing Subcategories
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {getSubcategories(quickAddParent.id).map(sub => (
                      <span
                        key={sub.id}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs"
                      >
                        {sub.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Subcategories <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={quickAddNames}
                  onChange={(e) => setQuickAddNames(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter subcategory names separated by commas, e.g.: Clothing, Electronics, Home & Garden"
                  rows={3}
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Separate multiple subcategories with commas (,)
                </p>
              </div>

              {/* Preview */}
              {quickAddNames.trim() && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Preview ({quickAddNames.split(',').filter(n => n.trim()).length} subcategories)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {quickAddNames
                      .split(',')
                      .map(name => name.trim())
                      .filter(name => name.length > 0)
                      .map((name, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs"
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          {name}
                        </span>
                      ))
                    }
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickAddModal(false);
                    setQuickAddParent(null);
                    setQuickAddNames('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickAdd}
                  disabled={quickAddLoading || !quickAddNames.trim()}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {quickAddLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Add Subcategories
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
