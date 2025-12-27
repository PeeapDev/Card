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
  Wand2,
  Percent,
  Copy,
  Layers,
  ImageIcon,
  Globe,
  Printer,
  Download,
} from 'lucide-react';
import posService, { POSProduct, POSCategory } from '@/services/pos.service';
import storageService from '@/services/storage.service';
import { useLimitCheck } from '@/hooks/useTierLimits';
import { UpgradeLimitPrompt } from '@/components/subscription/UpgradeLimitPrompt';

// Format currency - using Le (Leone) symbol
const formatCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Generate SKU from product name
const generateSKU = (name: string, categoryName?: string): string => {
  const prefix = categoryName
    ? categoryName.substring(0, 3).toUpperCase()
    : 'PRD';
  const namePart = name.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4).toUpperCase();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${namePart}-${random}`;
};

// Generate EAN-13 compatible barcode
const generateBarcode = (): string => {
  // Use prefix 200-299 for in-store products
  const prefix = '2' + Math.floor(Math.random() * 10).toString();
  const productCode = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
  const baseCode = prefix + productCode;

  // Calculate check digit (EAN-13)
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(baseCode[i]) * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return baseCode + checkDigit;
};

export function POSProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Use user.id as the merchant ID (no separate business needed)
  const merchantId = user?.id;

  // Tier limit check for products
  const {
    tier,
    limit: productLimit,
    canAdd: canAddProduct,
    tryAdd: tryAddProduct,
    getRemaining: getRemainingProducts,
    showUpgradePrompt,
    closePrompt: closeUpgradePrompt,
    lastCheckResult,
  } = useLimitCheck('products');

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
    is_on_sale: false,
    sale_price: '',
    is_variant: false,
    parent_product_id: '',
    variant_name: '', // e.g., "Large", "Red", "500ml"
  });

  // Image search state
  const [showImageSearch, setShowImageSearch] = useState(false);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [searchingImages, setSearchingImages] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

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
  const openProductModal = (product?: POSProduct, asVariantOf?: POSProduct) => {
    // If adding new product, check limits first
    if (!product) {
      if (!tryAddProduct(products.length)) {
        // Limit reached - the hook will show the upgrade prompt
        return;
      }
      setEditingProduct(null);

      // If creating as variant of another product, prefill some fields
      if (asVariantOf) {
        setProductForm({
          name: '',
          description: asVariantOf.description || '',
          category_id: asVariantOf.category_id || '',
          sku: '',
          barcode: '',
          price: '', // Price should be different for variant
          cost_price: asVariantOf.cost_price?.toString() || '',
          image_url: '', // Image should be different for variant
          track_inventory: asVariantOf.track_inventory,
          stock_quantity: '0',
          low_stock_threshold: asVariantOf.low_stock_threshold.toString(),
          is_featured: false,
          is_on_sale: false,
          sale_price: '',
          is_variant: true,
          parent_product_id: asVariantOf.id,
          variant_name: '',
        });
        setImagePreview(null);
      } else {
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
          is_on_sale: false,
          sale_price: '',
          is_variant: false,
          parent_product_id: '',
          variant_name: '',
        });
        setImagePreview(null);
      }
    } else {
      // Editing existing product - no limit check needed
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
        is_on_sale: (product as any).is_on_sale || false,
        sale_price: (product as any).sale_price?.toString() || '',
        is_variant: (product as any).is_variant || false,
        parent_product_id: (product as any).parent_product_id || '',
        variant_name: (product as any).variant_name || '',
      });
      setImagePreview(product.image_url || null);
    }
    setShowImageSearch(false);
    setSearchResults([]);
    setShowProductModal(true);
  };

  // Generate SKU and Barcode
  const handleGenerateSKU = () => {
    const categoryName = categories.find(c => c.id === productForm.category_id)?.name;
    const sku = generateSKU(productForm.name || 'Product', categoryName);
    setProductForm(prev => ({ ...prev, sku }));
  };

  const handleGenerateBarcode = () => {
    const barcode = generateBarcode();
    setProductForm(prev => ({ ...prev, barcode }));
  };

  // Search for product images using Lorem Picsum (free, reliable placeholder images)
  const searchProductImages = async () => {
    if (!imageSearchQuery.trim()) return;
    setSearchingImages(true);
    setSearchResults([]);
    setLoadedImages(new Set());
    setFailedImages(new Set());
    try {
      // Generate a hash from search query for consistent results
      const hashCode = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          const char = str.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash;
        }
        return Math.abs(hash);
      };

      const baseSeed = hashCode(imageSearchQuery.toLowerCase());
      const results: string[] = [];

      // Use Lorem Picsum with seeds for consistent, nice product images
      for (let i = 0; i < 8; i++) {
        const seed = baseSeed + i * 100;
        results.push(`https://picsum.photos/seed/${seed}/400/400`);
      }

      setSearchResults(results);
    } catch (error) {
      console.error('Error searching images:', error);
    } finally {
      setSearchingImages(false);
    }
  };

  const selectSearchImage = (url: string) => {
    setProductForm(prev => ({ ...prev, image_url: url }));
    setImagePreview(url);
    setShowImageSearch(false);
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

      // Upload with compression (automatically falls back to base64 if storage fails)
      const result = await storageService.uploadProductImageWithCompression(
        file,
        merchantId,
        editingProduct?.id
      );

      // Update form with uploaded URL
      setProductForm(prev => ({ ...prev, image_url: result.url }));
      setImagePreview(result.url);

      // Inform user if we used fallback
      if (result.path === 'base64') {
        console.log('Image saved as embedded data (storage not available)');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      // Try direct base64 as last resort
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string;
          setProductForm(prev => ({ ...prev, image_url: dataUrl }));
          setImagePreview(dataUrl);
        };
        reader.readAsDataURL(file);
      } catch {
        alert('Failed to upload image. Please try again or enter a URL manually.');
        setImagePreview(productForm.image_url || null);
      }
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

    // Validate sale price if on sale
    if (productForm.is_on_sale && !productForm.sale_price) {
      alert('Please enter a sale price');
      return;
    }

    setSaving(true);
    try {
      const productData: any = {
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
        is_on_sale: productForm.is_on_sale,
        sale_price: productForm.is_on_sale && productForm.sale_price ? parseFloat(productForm.sale_price) : null,
        is_variant: productForm.is_variant,
        parent_product_id: productForm.is_variant && productForm.parent_product_id ? productForm.parent_product_id : null,
        variant_name: productForm.is_variant && productForm.variant_name ? productForm.variant_name : null,
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
          <div className="flex items-center gap-3">
            {/* Product limit indicator */}
            {productLimit !== -1 && (
              <div className={`text-sm px-3 py-1 rounded-full ${
                getRemainingProducts(products.length) <= 2
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {products.length}/{productLimit} products
              </div>
            )}
            {/* Print Labels Button */}
            {products.length > 0 && (
              <Button
                variant="outline"
                onClick={() => navigate('/merchant/pos/labels')}
                className="text-purple-600 border-purple-200 hover:bg-purple-50"
              >
                <Printer className="w-4 h-4 mr-2" />
                Print Labels
              </Button>
            )}
            <Button variant="outline" onClick={() => openCategoryModal()}>
              <Tag className="w-4 h-4 mr-2" />
              Add Category
            </Button>
            <Button
              onClick={() => openProductModal()}
              disabled={productLimit !== -1 && !canAddProduct(products.length)}
            >
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
                <div className="relative">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-40 object-cover"
                      onError={(e) => {
                        // Hide broken image and show placeholder
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        target.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div className={`w-full h-40 bg-gray-100 dark:bg-gray-900 flex items-center justify-center ${product.image_url ? 'hidden' : ''}`}>
                    <Package className="w-12 h-12 text-gray-400" />
                  </div>

                  {/* Sale Badge */}
                  {(product as any).is_on_sale && (
                    <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                      SALE
                    </div>
                  )}

                  {/* Variant Badge */}
                  {(product as any).is_variant && (
                    <div className="absolute top-2 right-2 bg-indigo-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                      <Layers className="w-3 h-3" />
                      {(product as any).variant_name || 'Variant'}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-white">{product.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {product.sku && <span>SKU: {product.sku}</span>}
                        {product.barcode && (
                          <span className="flex items-center gap-1">
                            <Barcode className="w-3 h-3" />
                            {product.barcode.substring(0, 8)}...
                          </span>
                        )}
                      </div>
                    </div>
                    {product.is_featured && (
                      <span className="bg-yellow-100 text-yellow-700 text-xs px-2 py-0.5 rounded-full">
                        Featured
                      </span>
                    )}
                  </div>

                  {/* Price with Sale */}
                  <div className="mb-2">
                    {(product as any).is_on_sale ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-red-600">
                          {formatCurrency((product as any).sale_price)}
                        </span>
                        <span className="text-sm text-gray-400 line-through">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    ) : (
                      <p className="text-xl font-bold text-primary-600">
                        {formatCurrency(product.price)}
                      </p>
                    )}
                  </div>

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
                    {/* Add Variant button - only for non-variants */}
                    {!(product as any).is_variant && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-indigo-600 hover:bg-indigo-50"
                        onClick={() => openProductModal(undefined, product)}
                        title="Add variant"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
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

              {/* SKU & Barcode with Generate buttons */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    SKU
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productForm.sku}
                      onChange={e => setProductForm(prev => ({ ...prev, sku: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., COK-500"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateSKU}
                      className="px-3 py-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                      title="Generate SKU"
                    >
                      <Wand2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Barcode (EAN-13)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={productForm.barcode}
                      onChange={e => setProductForm(prev => ({ ...prev, barcode: e.target.value }))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500"
                      placeholder="Scan or enter"
                    />
                    <button
                      type="button"
                      onClick={handleGenerateBarcode}
                      className="px-3 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                      title="Generate Barcode"
                    >
                      <Barcode className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Display generated barcode visual */}
              {productForm.barcode && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 text-center">
                  <div className="font-mono text-lg tracking-widest mb-1">{productForm.barcode}</div>
                  <div className="flex justify-center gap-0.5">
                    {productForm.barcode.split('').map((digit, i) => (
                      <div key={i} className="flex flex-col items-center">
                        <div
                          className="bg-black dark:bg-white"
                          style={{
                            width: '2px',
                            height: `${20 + (parseInt(digit) * 2)}px`,
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">EAN-13 Barcode</p>
                </div>
              )}

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
                    <div className="grid grid-cols-2 gap-3">
                      {/* Upload Option */}
                      <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-primary-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <div className="flex flex-col items-center justify-center py-4">
                          {uploading ? (
                            <Loader2 className="w-8 h-8 text-gray-400 animate-spin mb-2" />
                          ) : (
                            <>
                              <Upload className="w-8 h-8 text-gray-400 mb-2" />
                              <p className="text-xs text-gray-500 dark:text-gray-400">Upload</p>
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

                      {/* Search Online Option */}
                      <button
                        type="button"
                        onClick={() => {
                          setShowImageSearch(true);
                          setImageSearchQuery(productForm.name || '');
                        }}
                        className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-blue-300 dark:border-blue-600 rounded-lg hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                      >
                        <Globe className="w-8 h-8 text-blue-400 mb-2" />
                        <p className="text-xs text-blue-500 dark:text-blue-400">Search Online</p>
                      </button>
                    </div>
                  )}

                  {/* Image Search Panel */}
                  {showImageSearch && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 space-y-3">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={imageSearchQuery}
                          onChange={e => setImageSearchQuery(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && searchProductImages()}
                          className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800"
                          placeholder="Search for product images..."
                        />
                        <Button
                          size="sm"
                          onClick={searchProductImages}
                          disabled={searchingImages}
                        >
                          {searchingImages ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        </Button>
                        <button
                          type="button"
                          onClick={() => setShowImageSearch(false)}
                          className="p-2 text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {searchResults.length > 0 && (
                        <div className="grid grid-cols-4 gap-2">
                          {searchResults.map((url, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => selectSearchImage(url)}
                              disabled={failedImages.has(i)}
                              className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors relative ${
                                failedImages.has(i)
                                  ? 'border-gray-200 opacity-50 cursor-not-allowed'
                                  : 'border-transparent hover:border-blue-500'
                              }`}
                            >
                              {/* Loading skeleton */}
                              {!loadedImages.has(i) && !failedImages.has(i) && (
                                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
                                  <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                                </div>
                              )}
                              {/* Failed placeholder */}
                              {failedImages.has(i) && (
                                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                </div>
                              )}
                              <img
                                src={url}
                                alt={`Product image option ${i + 1}`}
                                className={`w-full h-full object-cover ${!loadedImages.has(i) ? 'opacity-0' : 'opacity-100'}`}
                                onLoad={() => setLoadedImages(prev => new Set(prev).add(i))}
                                onError={() => setFailedImages(prev => new Set(prev).add(i))}
                              />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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

              {/* On Sale Toggle */}
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_on_sale}
                    onChange={e => setProductForm(prev => ({ ...prev, is_on_sale: e.target.checked }))}
                    className="w-4 h-4 text-orange-600 rounded"
                  />
                  <span className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center gap-2">
                    <Percent className="w-4 h-4" />
                    This product is on sale
                  </span>
                </label>

                {productForm.is_on_sale && (
                  <div>
                    <label className="block text-xs text-orange-600 dark:text-orange-400 mb-1">
                      Sale Price (SLE)
                    </label>
                    <input
                      type="number"
                      value={productForm.sale_price}
                      onChange={e => setProductForm(prev => ({ ...prev, sale_price: e.target.value }))}
                      className="w-full px-3 py-2 border border-orange-300 dark:border-orange-700 rounded-lg focus:ring-2 focus:ring-orange-500 bg-white dark:bg-gray-800"
                      placeholder="Enter sale price"
                    />
                    {productForm.price && productForm.sale_price && (
                      <p className="text-xs text-orange-600 mt-1">
                        {Math.round((1 - parseFloat(productForm.sale_price) / parseFloat(productForm.price)) * 100)}% off
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Product Variant */}
              <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={productForm.is_variant}
                    onChange={e => setProductForm(prev => ({
                      ...prev,
                      is_variant: e.target.checked,
                      parent_product_id: e.target.checked ? prev.parent_product_id : '',
                      variant_name: e.target.checked ? prev.variant_name : '',
                    }))}
                    className="w-4 h-4 text-indigo-600 rounded"
                  />
                  <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    This is a product variant
                  </span>
                </label>

                {productForm.is_variant && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                        Parent Product
                      </label>
                      <select
                        value={productForm.parent_product_id}
                        onChange={e => {
                          const parentProduct = products.find(p => p.id === e.target.value);
                          if (parentProduct) {
                            setProductForm(prev => ({
                              ...prev,
                              parent_product_id: e.target.value,
                              description: parentProduct.description || prev.description,
                              category_id: parentProduct.category_id || prev.category_id,
                              cost_price: parentProduct.cost_price?.toString() || prev.cost_price,
                            }));
                          } else {
                            setProductForm(prev => ({ ...prev, parent_product_id: e.target.value }));
                          }
                        }}
                        className="w-full px-3 py-2 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800"
                      >
                        <option value="">Select parent product</option>
                        {products.filter(p => !(p as any).is_variant && p.id !== editingProduct?.id).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                        Variant Name (e.g., "Large", "Red", "500ml")
                      </label>
                      <input
                        type="text"
                        value={productForm.variant_name}
                        onChange={e => setProductForm(prev => ({ ...prev, variant_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-indigo-300 dark:border-indigo-700 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-800"
                        placeholder="e.g., Large, Small, 500ml"
                      />
                    </div>
                  </div>
                )}
              </div>
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

      {/* Upgrade Prompt Modal */}
      {showUpgradePrompt && lastCheckResult && (
        <UpgradeLimitPrompt
          limitType="products"
          currentCount={lastCheckResult.current}
          limit={lastCheckResult.limit}
          currentTier={tier}
          onClose={closeUpgradePrompt}
          variant="modal"
        />
      )}
    </MerchantLayout>
  );
}

export default POSProductsPage;
