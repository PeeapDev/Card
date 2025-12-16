/**
 * POS Products Management Page
 * Uses merchant's user profile directly - no separate business needed
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Package,
  ArrowLeft,
  Loader2,
  X,
  Tag,
  AlertCircle,
  Image,
  Barcode,
  Check,
  Upload,
  Camera,
} from 'lucide-react';
import posService, { POSProduct, POSCategory } from '@/services/pos.service';
import storageService from '@/services/storage.service';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export function POSProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use user.id as the merchant ID (no separate business needed)
  const merchantId = user?.id;

  // State
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<POSCategory[]>([]);
  const [products, setProducts] = useState<POSProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<POSProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [business, setBusiness] = useState<any>(null);

  // Modal state
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<POSProduct | null>(null);
  const [editingCategory, setEditingCategory] = useState<POSCategory | null>(null);

  // Image preview
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Form state
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category_id: '',
    sku: '',
    barcode: '',
    price: '',
    cost_price: '',
    image_url: '',
    track_inventory: false,
    stock_quantity: '0',
    low_stock_threshold: '10',
    is_featured: false,
  });

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
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

      // Use user profile as business info
      setBusiness({
        id: merchantId,
        name: user ? `${user.firstName} ${user.lastName}` : 'My Store',
      });

      // Load categories
      const cats = await posService.getCategories(merchantId!);
      setCategories(cats);

      // Load products
      const prods = await posService.getProducts(merchantId!);
      setProducts(prods);
      setFilteredProducts(prods);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter products
  useEffect(() => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter(p => p.category_id === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku?.toLowerCase().includes(query) ||
        p.barcode?.toLowerCase().includes(query)
      );
    }

    setFilteredProducts(filtered);
  }, [products, selectedCategory, searchQuery]);

  // Product form handlers
  const openProductModal = (product?: POSProduct) => {
    if (product) {
      setEditingProduct(product);
      setProductForm({
        name: product.name,
        description: product.description || '',
        category_id: product.category_id || '',
        sku: product.sku || '',
        barcode: product.barcode || '',
        price: product.price.toString(),
        cost_price: product.cost_price?.toString() || '',
        image_url: product.image_url || '',
        track_inventory: product.track_inventory,
        stock_quantity: product.stock_quantity.toString(),
        low_stock_threshold: product.low_stock_threshold.toString(),
        is_featured: product.is_featured,
      });
      setImagePreview(product.image_url || null);
    } else {
      setEditingProduct(null);
      setProductForm({
        name: '',
        description: '',
        category_id: '',
        sku: '',
        barcode: '',
        price: '',
        cost_price: '',
        image_url: '',
        track_inventory: false,
        stock_quantity: '0',
        low_stock_threshold: '10',
        is_featured: false,
      });
      setImagePreview(null);
    }
    setShowProductModal(true);
  };

  // Handle image upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !merchantId) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      // Show local preview immediately
      const localPreview = URL.createObjectURL(file);
      setImagePreview(localPreview);

      // Upload with compression
      const result = await storageService.uploadProductImageWithCompression(
        file,
        merchantId,
        editingProduct?.id
      );

      // Update form with uploaded URL
      setProductForm(prev => ({ ...prev, image_url: result.url }));
      setImagePreview(result.url);
    } catch (error) {
      console.error('Error uploading image:', error);
      alert('Failed to upload image. Please try again.');
      setImagePreview(productForm.image_url || null);
    } finally {
      setUploading(false);
    }
  };

  // Remove image
  const handleRemoveImage = () => {
    setProductForm(prev => ({ ...prev, image_url: '' }));
    setImagePreview(null);
  };

  const saveProduct = async () => {
    if (!productForm.name || !productForm.price) {
      alert('Name and price are required');
      return;
    }

    setSaving(true);
    try {
      const productData = {
        merchant_id: merchantId!,
        name: productForm.name,
        description: productForm.description || undefined,
        category_id: productForm.category_id || undefined,
        sku: productForm.sku || undefined,
        barcode: productForm.barcode || undefined,
        price: parseFloat(productForm.price),
        cost_price: productForm.cost_price ? parseFloat(productForm.cost_price) : 0,
        image_url: productForm.image_url || undefined,
        track_inventory: productForm.track_inventory,
        stock_quantity: parseInt(productForm.stock_quantity) || 0,
        low_stock_threshold: parseInt(productForm.low_stock_threshold) || 10,
        is_featured: productForm.is_featured,
      };

      if (editingProduct) {
        await posService.updateProduct(editingProduct.id, productData);
      } else {
        await posService.createProduct(productData);
      }

      setShowProductModal(false);
      loadData();
    } catch (error) {
      console.error('Error saving product:', error);
      alert('Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (product: POSProduct) => {
    if (!confirm(`Delete "${product.name}"?`)) return;

    try {
      await posService.deleteProduct(product.id);
      loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product');
    }
  };

  // Category form handlers
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
    if (!categoryForm.name) {
      alert('Name is required');
      return;
    }

    setSaving(true);
    try {
      const categoryData = {
        merchant_id: merchantId!,
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
      loadData();
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const deleteCategory = async (category: POSCategory) => {
    if (!confirm(`Delete category "${category.name}"? Products in this category will be uncategorized.`)) return;

    try {
      await posService.deleteCategory(category.id);
      loadData();
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  // Color options for categories
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
              onClick={() => navigate('/merchant/apps/pos')}
              className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Products</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">{business?.name}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => openCategoryModal()}>
              <Tag className="w-4 h-4 mr-2" />
              Add Category
            </Button>
            <Button onClick={() => openProductModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Categories</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !selectedCategory
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              All ({products.length})
            </button>
            {categories.map(cat => {
              const count = products.filter(p => p.category_id === cat.id).length;
              return (
                <div key={cat.id} className="flex items-center">
                  <button
                    onClick={() => setSelectedCategory(cat.id === selectedCategory ? null : cat.id)}
                    className={`px-3 py-1.5 rounded-l-full text-sm font-medium transition-colors ${
                      selectedCategory === cat.id
                        ? 'text-white'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === cat.id ? cat.color : undefined,
                    }}
                  >
                    {cat.name} ({count})
                  </button>
                  <button
                    onClick={() => openCategoryModal(cat)}
                    className="px-2 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-gray-200 text-gray-600 dark:text-gray-400"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="px-2 py-1.5 bg-gray-100 dark:bg-gray-900 hover:bg-red-100 text-gray-600 dark:text-gray-400 hover:text-red-600 rounded-r-full"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search products by name, SKU, or barcode..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No products yet</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Add your first product to start selling</p>
            <Button onClick={() => openProductModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Add Product
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map(product => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Product Image */}
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-40 object-cover"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>
                )}

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
                      {product.sku && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku}</p>
                      )}
                    </div>
                    {product.is_featured && (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                        Featured
                      </span>
                    )}
                  </div>

                  <p className="text-xl font-bold text-primary-600 mb-2">
                    {formatCurrency(product.price)}
                  </p>

                  {product.category && (
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-xs text-white mb-2"
                      style={{ backgroundColor: product.category.color }}
                    >
                      {product.category.name}
                    </span>
                  )}

                  {product.track_inventory && (
                    <div className={`text-sm ${
                      product.stock_quantity <= product.low_stock_threshold
                        ? 'text-red-600'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      Stock: {product.stock_quantity}
                      {product.stock_quantity <= product.low_stock_threshold && (
                        <span className="ml-1 text-red-500">(Low)</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-3 pt-3 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openProductModal(product)}
                    >
                      <Edit2 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:bg-red-50"
                      onClick={() => deleteProduct(product)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800">
              <h2 className="text-lg font-semibold">
                {editingProduct ? 'Edit Product' : 'Add Product'}
              </h2>
              <button
                onClick={() => setShowProductModal(false)}
                className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={productForm.name}
                  onChange={e => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Coca Cola 500ml"
                />
              </div>

              {/* Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Category
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowProductModal(false);
                      openCategoryModal();
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    Add Category
                  </button>
                </div>
                <select
                  value={productForm.category_id}
                  onChange={e => setProductForm(prev => ({ ...prev, category_id: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Price & Cost */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Selling Price (SLE) *
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={e => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Cost Price (SLE)
                  </label>
                  <input
                    type="number"
                    value={productForm.cost_price}
                    onChange={e => setProductForm(prev => ({ ...prev, cost_price: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* SKU & Barcode */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU
                  </label>
                  <input
                    type="text"
                    value={productForm.sku}
                    onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., COK-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={productForm.barcode}
                    onChange={e => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                    placeholder="Scan or enter"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={productForm.description}
                  onChange={e => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional description"
                />
              </div>

              {/* Product Image */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Image
                </label>
                <div className="space-y-3">
                  {/* Image Preview */}
                  {imagePreview ? (
                    <div className="relative">
                      <img
                        src={imagePreview}
                        alt="Product preview"
                        className="w-full h-40 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      {uploading && (
                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                          <Loader2 className="w-8 h-8 text-white animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-gray-50 dark:bg-gray-700 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {uploading ? (
                          <Loader2 className="w-10 h-10 text-gray-400 animate-spin mb-2" />
                        ) : (
                          <>
                            <Upload className="w-10 h-10 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500 dark:text-gray-400">Click to upload image</p>
                            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploading}
                      />
                    </label>
                  )}

                  {/* Or enter URL manually */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                    <span className="text-xs text-gray-400">or enter URL</span>
                    <div className="flex-1 border-t border-gray-200 dark:border-gray-700"></div>
                  </div>
                  <input
                    type="text"
                    value={productForm.image_url}
                    onChange={e => {
                      setProductForm(prev => ({ ...prev, image_url: e.target.value }));
                      setImagePreview(e.target.value || null);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 text-sm"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              {/* Inventory Tracking */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.track_inventory}
                    onChange={e => setProductForm(prev => ({ ...prev, track_inventory: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Track inventory</span>
                </label>

                {productForm.track_inventory && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Current Stock
                      </label>
                      <input
                        type="number"
                        value={productForm.stock_quantity}
                        onChange={e => setProductForm(prev => ({ ...prev, stock_quantity: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Low Stock Alert
                      </label>
                      <input
                        type="number"
                        value={productForm.low_stock_threshold}
                        onChange={e => setProductForm(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Featured */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={productForm.is_featured}
                  onChange={e => setProductForm(prev => ({ ...prev, is_featured: e.target.checked }))}
                  className="w-4 h-4 text-primary-600 rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Featured product</span>
              </label>
            </div>

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowProductModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={saveProduct}
                isLoading={saving}
              >
                {editingProduct ? 'Update' : 'Create'} Product
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl w-full max-w-md">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="p-2 hover:bg-gray-100 dark:bg-gray-900 rounded-lg"
              >
                <X className="w-5 h-5" />
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
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
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional"
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
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        categoryForm.color === color ? 'ring-2 ring-offset-2 ring-gray-400' : ''
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

            <div className="p-4 border-t bg-gray-50 dark:bg-gray-700 flex gap-3">
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
                isLoading={saving}
              >
                {editingCategory ? 'Update' : 'Create'} Category
              </Button>
            </div>
          </div>
        </div>
      )}
    </MerchantLayout>
  );
}

export default POSProductsPage;
