/**
 * ProductCard Component
 *
 * Displays a product within a chat message with purchase option.
 * Features:
 * - Product image, name, price
 * - Stock status
 * - Buy Now button
 * - Quick add to cart
 */

import { useState } from 'react';
import {
  Package,
  ShoppingCart,
  Check,
  Loader2,
  ExternalLink,
  Tag,
  Box,
  ImageOff,
} from 'lucide-react';

interface ProductData {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  image_url?: string;
  stock_quantity?: number;
  is_active?: boolean;
  category?: string;
  sku?: string;
  business_id?: string;
  business_name?: string;
}

interface ProductCardProps {
  product: ProductData;
  onBuyNow?: (product: ProductData) => void;
  onAddToCart?: (product: ProductData) => void;
  compact?: boolean;
  isOwner?: boolean;
}

export function ProductCard({
  product,
  onBuyNow,
  onAddToCart,
  compact = false,
  isOwner = false,
}: ProductCardProps) {
  const [buying, setBuying] = useState(false);
  const [added, setAdded] = useState(false);

  const isInStock = product.stock_quantity === undefined || product.stock_quantity > 0;
  const isActive = product.is_active !== false;

  const handleBuyNow = async () => {
    if (!onBuyNow || !isInStock || !isActive) return;
    setBuying(true);
    try {
      await onBuyNow(product);
    } finally {
      setBuying(false);
    }
  };

  const handleAddToCart = async () => {
    if (!onAddToCart || !isInStock || !isActive) return;
    try {
      await onAddToCart(product);
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
    }
  };

  const formatPrice = (price: number) => {
    return `${product.currency} ${price.toLocaleString()}`;
  };

  if (compact) {
    // Compact view for suggestion list
    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-10 h-10 rounded-lg object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {product.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {product.category || 'Product'}
              {product.sku && ` • SKU: ${product.sku}`}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {formatPrice(product.price)}
          </p>
          {product.stock_quantity !== undefined && (
            <span className={`text-xs ${isInStock ? 'text-green-600' : 'text-red-500'}`}>
              {isInStock ? `${product.stock_quantity} in stock` : 'Out of stock'}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden max-w-sm">
      {/* Product Image */}
      <div className="relative aspect-video bg-gray-100 dark:bg-gray-700">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageOff className="w-12 h-12 text-gray-300 dark:text-gray-600" />
          </div>
        )}
        {/* Stock Badge */}
        {!isInStock && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded">
            Out of Stock
          </div>
        )}
        {!isActive && (
          <div className="absolute top-2 right-2 px-2 py-1 bg-gray-500 text-white text-xs font-medium rounded">
            Unavailable
          </div>
        )}
        {/* Category Tag */}
        {product.category && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 bg-black/50 text-white text-xs rounded">
            <Tag className="w-3 h-3" />
            {product.category}
          </div>
        )}
      </div>

      {/* Product Details */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {product.name}
            </h4>
            {product.business_name && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                by {product.business_name}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-primary-600 dark:text-primary-400">
              {formatPrice(product.price)}
            </p>
          </div>
        </div>

        {product.description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
            {product.description}
          </p>
        )}

        {/* Stock Info */}
        {product.stock_quantity !== undefined && isInStock && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
            <Box className="w-3 h-3" />
            {product.stock_quantity} in stock
          </div>
        )}

        {/* Actions */}
        {!isOwner && isInStock && isActive && (
          <div className="flex gap-2">
            <button
              onClick={handleBuyNow}
              disabled={buying}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {buying ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              Buy Now
            </button>
            {onAddToCart && (
              <button
                onClick={handleAddToCart}
                disabled={added}
                className={`px-3 py-2 rounded-lg border transition-colors ${
                  added
                    ? 'bg-green-50 border-green-200 text-green-600 dark:bg-green-900/20 dark:border-green-800'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                title="Add to cart"
              >
                {added ? <Check className="w-4 h-4" /> : <ShoppingCart className="w-4 h-4" />}
              </button>
            )}
          </div>
        )}

        {/* Owner View */}
        {isOwner && (
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
            <span>Your product</span>
            <a
              href={`/merchant/pos/products/${product.id}`}
              className="flex items-center gap-1 text-primary-600 hover:text-primary-700"
            >
              Edit <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}

        {/* Unavailable State */}
        {(!isInStock || !isActive) && !isOwner && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-2">
            This product is currently unavailable
          </p>
        )}
      </div>
    </div>
  );
}
