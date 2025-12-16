/**
 * Product Carousel - Horizontal scrolling product cards
 * Shows multiple small product cards that auto-scroll continuously
 * Responsive: 3 on mobile, 5 on tablet, 8-10 on desktop
 *
 * Features:
 * - Click to open full-screen product viewer
 * - WhatsApp-style swipeable stories for mobile
 * - Touch-hold to pause on mobile
 * - Hover to pause on desktop
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  Star,
  Sparkles,
  Play,
  Pause,
  X,
  Store,
  ShoppingCart
} from 'lucide-react';
import { marketplaceService } from '@/services/marketplace.service';
import { formatCurrency } from '@/lib/currency';
import { useAuth } from '@/context/AuthContext';

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

// Demo products with real images for showcase
const DEMO_PRODUCTS: FeaturedProduct[] = [
  {
    id: 'demo-1',
    name: 'Fresh Vegetables',
    price: 45.00,
    image_url: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=400&h=400&fit=crop',
    store_name: 'Farm Fresh',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: true,
  },
  {
    id: 'demo-2',
    name: 'Coffee Beans',
    price: 35.00,
    image_url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&h=400&fit=crop',
    store_name: 'Bean & Brew',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: true,
  },
  {
    id: 'demo-3',
    name: 'Leather Bag',
    price: 120.00,
    image_url: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&h=400&fit=crop',
    store_name: 'Craft Style',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: false,
  },
  {
    id: 'demo-4',
    name: 'Wireless Earbuds',
    price: 89.00,
    image_url: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400&h=400&fit=crop',
    store_name: 'Tech Galaxy',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: true,
  },
  {
    id: 'demo-5',
    name: 'Chocolate Box',
    price: 55.00,
    image_url: 'https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=400&h=400&fit=crop',
    store_name: 'Sweet Delights',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: false,
  },
  {
    id: 'demo-6',
    name: 'Yoga Mat',
    price: 65.00,
    image_url: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=400&h=400&fit=crop',
    store_name: 'Fitness Zone',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: true,
  },
  {
    id: 'demo-7',
    name: 'Smart Watch',
    price: 199.00,
    image_url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop',
    store_name: 'Tech Hub',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: true,
  },
  {
    id: 'demo-8',
    name: 'Sneakers',
    price: 85.00,
    image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop',
    store_name: 'Shoe Palace',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: false,
  },
  {
    id: 'demo-9',
    name: 'Sunglasses',
    price: 45.00,
    image_url: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&h=400&fit=crop',
    store_name: 'Style Co',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: false,
  },
  {
    id: 'demo-10',
    name: 'Perfume',
    price: 75.00,
    image_url: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=400&h=400&fit=crop',
    store_name: 'Fragrance',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: true,
  },
  {
    id: 'demo-11',
    name: 'Headphones',
    price: 150.00,
    image_url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
    store_name: 'Audio World',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: true,
  },
  {
    id: 'demo-12',
    name: 'Plant Pot',
    price: 25.00,
    image_url: 'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=400&h=400&fit=crop',
    store_name: 'Green Life',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: false,
  },
  {
    id: 'demo-13',
    name: 'Backpack',
    price: 65.00,
    image_url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&h=400&fit=crop',
    store_name: 'Travel Gear',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: false,
  },
  {
    id: 'demo-14',
    name: 'Camera',
    price: 450.00,
    image_url: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&h=400&fit=crop',
    store_name: 'Photo Pro',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: true,
  },
  {
    id: 'demo-15',
    name: 'Candles Set',
    price: 30.00,
    image_url: 'https://images.unsplash.com/photo-1602607847679-99aa9e327c40?w=400&h=400&fit=crop',
    store_name: 'Home Decor',
    store_slug: null,
    store_logo: null,
    store_id: 'demo',
    is_featured: false,
  },
];

export function ProductCarousel() {
  const [products, setProducts] = useState<FeaturedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<FeaturedProduct | null>(null);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const storyTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Story duration in milliseconds
  const STORY_DURATION = 5000;

  useEffect(() => {
    loadProducts();
  }, [user?.id]);

  // Continuous auto-scroll animation
  useEffect(() => {
    if (!scrollContainerRef.current || !isAutoScrolling || isPaused || products.length === 0) return;

    const container = scrollContainerRef.current;
    let scrollPosition = container.scrollLeft;
    const scrollSpeed = 0.5; // pixels per frame

    const animate = () => {
      if (!container || isPaused) return;

      scrollPosition += scrollSpeed;

      // Reset to start when reaching end (seamless loop)
      if (scrollPosition >= container.scrollWidth - container.clientWidth) {
        scrollPosition = 0;
      }

      container.scrollLeft = scrollPosition;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isAutoScrolling, isPaused, products.length]);

  const loadProducts = async () => {
    try {
      const data = await marketplaceService.getFeaturedProducts(15);
      if (data && data.length > 0) {
        setProducts(data);
      } else {
        setProducts(DEMO_PRODUCTS);
      }
    } catch (error) {
      console.error('Error loading products:', error);
      setProducts(DEMO_PRODUCTS);
    } finally {
      setLoading(false);
    }
  };

  // Story auto-advance timer
  useEffect(() => {
    if (selectedProduct && !isHolding) {
      // Clear any existing timers
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);

      // Reset progress
      setStoryProgress(0);

      // Progress animation
      const startTime = Date.now();
      progressIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min((elapsed / STORY_DURATION) * 100, 100);
        setStoryProgress(progress);
      }, 50);

      // Auto-advance to next story
      storyTimerRef.current = setTimeout(() => {
        goToNextStory();
      }, STORY_DURATION);

      return () => {
        if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      };
    }
  }, [selectedProduct, currentStoryIndex, isHolding]);

  // Pause story on hold
  useEffect(() => {
    if (isHolding) {
      if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    }
  }, [isHolding]);

  // Open full-screen story view
  const openStoryView = useCallback((product: FeaturedProduct) => {
    const index = products.findIndex(p => p.id === product.id);
    setCurrentStoryIndex(index >= 0 ? index : 0);
    setSelectedProduct(product);
    setStoryProgress(0);
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }, [products]);

  // Close story view
  const closeStoryView = useCallback(() => {
    setSelectedProduct(null);
    setStoryProgress(0);
    document.body.style.overflow = '';
    if (storyTimerRef.current) clearTimeout(storyTimerRef.current);
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
  }, []);

  // Navigate to previous story
  const goToPrevStory = useCallback(() => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1;
      setCurrentStoryIndex(prevIndex);
      setSelectedProduct(products[prevIndex]);
      setStoryProgress(0);
    }
  }, [currentStoryIndex, products]);

  // Navigate to next story
  const goToNextStory = useCallback(() => {
    if (currentStoryIndex < products.length - 1) {
      const nextIndex = currentStoryIndex + 1;
      setCurrentStoryIndex(nextIndex);
      setSelectedProduct(products[nextIndex]);
      setStoryProgress(0);
    } else {
      closeStoryView();
    }
  }, [currentStoryIndex, products, closeStoryView]);

  // Handle swipe gesture for mobile
  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const threshold = 50;
    if (info.offset.x > threshold) {
      goToPrevStory();
    } else if (info.offset.x < -threshold) {
      goToNextStory();
    }
  };

  // Touch hold handlers for mobile
  const handleTouchStart = useCallback(() => {
    holdTimerRef.current = setTimeout(() => {
      setIsHolding(true);
    }, 150); // Short delay to detect hold vs tap
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
    }
    setIsHolding(false);
  }, []);

  // Handle tap navigation in story (left 1/3 = prev, right 1/3 = next)
  const handleStoryTap = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isHolding) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0]?.clientX || 0 : e.clientX;
    const relativeX = x - rect.left;
    const width = rect.width;

    if (relativeX < width / 3) {
      goToPrevStory();
    } else if (relativeX > (width * 2) / 3) {
      goToNextStory();
    }
  }, [isHolding, goToPrevStory, goToNextStory]);

  // Navigate to store
  const handleOrderNow = useCallback((product: FeaturedProduct) => {
    closeStoryView();
    if (product.store_id === 'demo') {
      navigate('/marketplace');
    } else if (product.store_slug) {
      navigate(`/marketplace/store/${product.store_slug}`);
    } else {
      navigate('/marketplace');
    }
  }, [navigate, closeStoryView]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const handleProductClick = (product: FeaturedProduct) => {
    // Open full-screen story view instead of navigating
    openStoryView(product);
  };

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (scrollContainerRef.current) {
      // Save current position when pausing
      scrollContainerRef.current.style.scrollBehavior = 'auto';
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex-shrink-0 w-28 sm:w-32 animate-pulse">
              <div className="aspect-square rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div className="mt-2 h-3 bg-gray-200 dark:bg-gray-700 rounded w-20" />
              <div className="mt-1 h-3 bg-gray-200 dark:bg-gray-700 rounded w-14" />
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">Discover Products</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">From local vendors near you</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-scroll toggle */}
          <button
            onClick={() => setIsAutoScrolling(!isAutoScrolling)}
            className={`p-1.5 rounded-full transition-colors ${
              isAutoScrolling
                ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
            }`}
            title={isAutoScrolling ? 'Pause auto-scroll' : 'Start auto-scroll'}
          >
            {isAutoScrolling ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
          <Link
            to="/marketplace"
            className="text-sm text-pink-600 dark:text-pink-400 hover:text-pink-700 font-medium"
          >
            View All →
          </Link>
        </div>
      </div>

      {/* Products Scroll Container */}
      <div
        className="relative group"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {/* Left scroll button */}
        <button
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 -ml-2 border border-gray-200 dark:border-gray-700"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Products container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => handleProductClick(product)}
              className="flex-shrink-0 w-28 sm:w-32 md:w-36 cursor-pointer group/item"
            >
              {/* Product Image */}
              <div className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 group-hover/item:scale-[1.02]">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover/item:scale-110"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-pink-100 to-purple-100 dark:from-pink-900/30 dark:to-purple-900/30 flex items-center justify-center">
                    <ShoppingBag className="w-8 h-8 text-pink-400" />
                  </div>
                )}

                {/* Gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity duration-300" />

                {/* Featured badge */}
                {product.is_featured && (
                  <div className="absolute top-1.5 left-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                    <Star className="w-2.5 h-2.5 fill-current" />
                  </div>
                )}

                {/* Price tag on hover */}
                <div className="absolute bottom-1.5 right-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm text-gray-900 dark:text-white text-xs font-bold px-2 py-1 rounded-lg opacity-0 group-hover/item:opacity-100 transition-opacity duration-300 shadow-sm">
                  {formatCurrency(product.price, 'SLE')}
                </div>

                {/* Order button on hover */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-opacity duration-300">
                  <span className="bg-white text-gray-900 text-xs font-semibold px-3 py-1.5 rounded-full shadow-lg">
                    Order
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="mt-2 px-0.5">
                <h3 className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                  {product.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {product.store_name}
                </p>
                <p className="text-xs sm:text-sm font-bold text-pink-600 dark:text-pink-400 mt-0.5">
                  {formatCurrency(product.price, 'SLE')}
                </p>
              </div>
            </motion.div>
          ))}

          {/* View All Card */}
          <Link
            to="/marketplace"
            className="flex-shrink-0 w-28 sm:w-32 md:w-36"
          >
            <div className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center gap-2 hover:border-pink-400 hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-all cursor-pointer group/view">
              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center group-hover/view:bg-pink-100 dark:group-hover/view:bg-pink-900/30 transition-colors">
                <ShoppingBag className="w-5 h-5 text-gray-400 group-hover/view:text-pink-500 transition-colors" />
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 group-hover/view:text-pink-600 dark:group-hover/view:text-pink-400 transition-colors">
                View All
              </span>
            </div>
          </Link>
        </div>

        {/* Right scroll button */}
        <button
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white dark:bg-gray-800 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:scale-110 -mr-2 border border-gray-200 dark:border-gray-700"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        {/* Scroll fade indicators */}
        <div className="absolute left-0 top-0 bottom-2 w-8 bg-gradient-to-r from-white dark:from-gray-900 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-white dark:from-gray-900 to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Full-screen Story Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleTouchStart}
            onMouseUp={handleTouchEnd}
            onMouseLeave={handleTouchEnd}
          >
            {/* Progress bars */}
            <div className="absolute top-0 left-0 right-0 z-30 flex gap-1 p-2 pt-3">
              {products.map((p, i) => (
                <div key={p.id} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-white transition-all duration-75 ease-linear"
                    style={{
                      width: i < currentStoryIndex ? '100%' :
                             i === currentStoryIndex ? `${storyProgress}%` : '0%'
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-0 right-0 z-30 flex items-center justify-between px-4">
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
                onClick={closeStoryView}
                className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Swipeable Product Image */}
            <motion.div
              className="h-full flex items-center justify-center p-4 pt-24 pb-44 cursor-pointer"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              onClick={handleStoryTap}
            >
              {selectedProduct.image_url ? (
                <motion.img
                  key={selectedProduct.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  src={selectedProduct.image_url}
                  alt={selectedProduct.name}
                  className="max-h-full max-w-full object-contain rounded-2xl select-none"
                  draggable={false}
                />
              ) : (
                <div className="w-72 h-72 bg-gradient-to-br from-pink-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center">
                  <ShoppingBag className="w-24 h-24 text-white/50" />
                </div>
              )}
            </motion.div>

            {/* Navigation hint */}
            <div className="absolute top-1/2 -translate-y-1/2 left-4 right-4 flex justify-between pointer-events-none z-20">
              <div className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center ${currentStoryIndex === 0 ? 'opacity-30' : 'opacity-70'}`}>
                <ChevronLeft className="w-6 h-6 text-white" />
              </div>
              <div className={`w-12 h-12 rounded-full bg-white/10 flex items-center justify-center ${currentStoryIndex === products.length - 1 ? 'opacity-30' : 'opacity-70'}`}>
                <ChevronRight className="w-6 h-6 text-white" />
              </div>
            </div>

            {/* Hold indicator */}
            {isHolding && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40">
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                  Paused
                </div>
              </div>
            )}

            {/* Bottom CTA */}
            <div className="absolute bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-black via-black/80 to-transparent">
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
                className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-pink-600 hover:to-purple-700 transition-all active:scale-[0.98]"
              >
                <ShoppingCart className="w-5 h-5" />
                Order Now
              </button>
              <p className="text-center text-white/50 text-xs mt-2">
                Tap left/right or swipe to navigate
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
