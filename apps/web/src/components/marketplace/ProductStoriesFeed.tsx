/**
 * Product Stories Feed - Horizontal scrolling product feed like WhatsApp/Facebook stories
 */

import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Store,
  Star,
  X,
  ShoppingCart,
  ExternalLink
} from 'lucide-react';
import { marketplaceService } from '@/services/marketplace.service';
import { formatCurrency } from '@/lib/currency';

interface FeaturedProduct {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  store_name: string;
  store_slug: string | null;
  store_logo: string | null;
  store_id: string;
  is_featured: boolean;
}

export function ProductStoriesFeed() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<FeaturedProduct | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  // Auto-advance story when viewing
  useEffect(() => {
    if (selectedProduct) {
      const timer = setTimeout(() => {
        const currentIdx = products.findIndex(p => p.id === selectedProduct.id);
        if (currentIdx < products.length - 1) {
          setSelectedProduct(products[currentIdx + 1]);
        } else {
          setSelectedProduct(null);
        }
      }, 5000); // 5 seconds per story
      return () => clearTimeout(timer);
    }
  }, [selectedProduct, products]);

  const loadProducts = async () => {
    try {
      const data = await marketplaceService.getFeaturedProducts(20);
      setProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 200;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleProductClick = (product: FeaturedProduct) => {
    setSelectedProduct(product);
  };

  const handleOrderNow = (product: FeaturedProduct) => {
    // Navigate to store page
    if (product.store_slug) {
      navigate(`/marketplace/store/${product.store_slug}`);
    } else {
      navigate(`/marketplace`);
    }
  };

  const goToPrevStory = () => {
    if (selectedProduct) {
      const currentIdx = products.findIndex(p => p.id === selectedProduct.id);
      if (currentIdx > 0) {
        setSelectedProduct(products[currentIdx - 1]);
      }
    }
  };

  const goToNextStory = () => {
    if (selectedProduct) {
      const currentIdx = products.findIndex(p => p.id === selectedProduct.id);
      if (currentIdx < products.length - 1) {
        setSelectedProduct(products[currentIdx + 1]);
      } else {
        setSelectedProduct(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <ShoppingBag className="w-5 h-5 text-pink-500" />
          <h2 className="font-semibold text-gray-900 dark:text-white">Shop Now</h2>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-20 animate-pulse">
              <div className="w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">Shop Now</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Tap to explore products</p>
            </div>
          </div>
          <Link
            to="/marketplace"
            className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-700 dark:hover:text-pink-300 font-medium"
          >
            See All
          </Link>
        </div>

        {/* Horizontal Scrolling Feed */}
        <div className="relative group">
          {/* Left scroll button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -ml-2"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>

          {/* Products container */}
          <div
            ref={scrollContainerRef}
            className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 px-1"
            style={{ scrollSnapType: 'x mandatory' }}
          >
            {products.map((product, index) => (
              <motion.button
                key={product.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => handleProductClick(product)}
                className="flex-shrink-0 flex flex-col items-center group/item"
                style={{ scrollSnapAlign: 'start' }}
              >
                {/* Product image with gradient ring */}
                <div className={`relative p-0.5 rounded-full ${
                  product.is_featured
                    ? 'bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600'
                    : 'bg-gradient-to-tr from-pink-400 to-purple-500'
                }`}>
                  <div className="w-[72px] h-[72px] rounded-full bg-white dark:bg-gray-800 p-0.5">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center">
                        <ShoppingBag className="w-6 h-6 text-pink-500" />
                      </div>
                    )}
                  </div>
                  {/* Featured badge */}
                  {product.is_featured && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      <Star className="w-2.5 h-2.5 inline mr-0.5" />
                      HOT
                    </div>
                  )}
                </div>
                {/* Product name */}
                <span className="mt-2 text-xs text-gray-700 dark:text-gray-300 max-w-[72px] truncate text-center">
                  {product.name}
                </span>
                {/* Price */}
                <span className="text-[10px] font-semibold text-pink-600 dark:text-pink-400">
                  {formatCurrency(product.price, 'SLE')}
                </span>
              </motion.button>
            ))}

            {/* Browse more button */}
            <Link
              to="/marketplace"
              className="flex-shrink-0 flex flex-col items-center justify-center"
              style={{ scrollSnapAlign: 'start' }}
            >
              <div className="w-[72px] h-[72px] rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">
                <ExternalLink className="w-6 h-6 text-gray-400" />
              </div>
              <span className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Browse All
              </span>
            </Link>
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity -mr-2"
          >
            <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
      </div>

      {/* Full-screen Story Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
          >
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-20 flex gap-1 p-2">
              {products.map((p, i) => {
                const currentIdx = products.findIndex(pr => pr.id === selectedProduct.id);
                return (
                  <div key={p.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: i < currentIdx ? '100%' : '0%' }}
                      animate={{
                        width: i < currentIdx ? '100%' : i === currentIdx ? '100%' : '0%'
                      }}
                      transition={{
                        duration: i === currentIdx ? 5 : 0,
                        ease: 'linear'
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Header */}
            <div className="absolute top-6 left-0 right-0 z-20 flex items-center justify-between px-4">
              <div className="flex items-center gap-3">
                {selectedProduct.store_logo ? (
                  <img
                    src={selectedProduct.store_logo}
                    alt={selectedProduct.store_name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-white"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <Store className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <p className="text-white font-medium text-sm">{selectedProduct.store_name}</p>
                  <p className="text-white/70 text-xs">{selectedProduct.name}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Navigation areas */}
            <button
              onClick={goToPrevStory}
              className="absolute left-0 top-20 bottom-32 w-1/3 z-10"
              aria-label="Previous"
            />
            <button
              onClick={goToNextStory}
              className="absolute right-0 top-20 bottom-32 w-1/3 z-10"
              aria-label="Next"
            />

            {/* Product Image */}
            <div className="h-full flex items-center justify-center p-4 pt-20 pb-40">
              {selectedProduct.image_url ? (
                <img
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="max-h-full max-w-full object-contain rounded-2xl"
                />
              ) : (
                <div className="w-64 h-64 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                  <ShoppingBag className="w-24 h-24 text-white/50" />
                </div>
              )}
            </div>

            {/* Bottom CTA */}
            <div className="absolute bottom-0 left-0 right-0 z-20 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-white font-bold text-xl">{selectedProduct.name}</h3>
                  <p className="text-pink-400 font-bold text-2xl mt-1">
                    {formatCurrency(selectedProduct.price, 'SLE')}
                  </p>
                </div>
                {selectedProduct.is_featured && (
                  <span className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Featured
                  </span>
                )}
              </div>
              <button
                onClick={() => handleOrderNow(selectedProduct)}
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-pink-600 hover:to-purple-700 transition-all"
              >
                <ShoppingCart className="w-5 h-5" />
                Order Now
              </button>
              <p className="text-center text-white/50 text-xs mt-2">
                Swipe up or tap to visit store
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
