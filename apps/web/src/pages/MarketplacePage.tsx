/**
 * Marketplace Homepage
 *
 * User-facing marketplace where consumers can browse vendor stores
 * and place orders directly
 */

import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import marketplaceService, { MarketplaceStore, StoreCategory } from '@/services/marketplace.service';
import {
  Search,
  MapPin,
  Clock,
  Star,
  BadgeCheck,
  Filter,
  ChevronRight,
  ShoppingBag,
  Truck,
  Store,
  Loader2,
  Package,
  Heart,
  Grid3X3,
  List,
  X,
  Utensils,
  ShoppingCart,
  Pill,
  Smartphone,
  Shirt,
  Wrench,
} from 'lucide-react';

// Format currency
const formatCurrency = (amount: number) => {
  return `NLe ${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

// Category icon mapping
const categoryIcons: Record<string, React.ElementType> = {
  food: Utensils,
  grocery: ShoppingCart,
  retail: ShoppingBag,
  pharmacy: Pill,
  electronics: Smartphone,
  fashion: Shirt,
  services: Wrench,
  other: Grid3X3,
};

export function MarketplacePage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, [selectedCategory, selectedCity, searchQuery]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load categories
      if (categories.length === 0) {
        const cats = await marketplaceService.getStoreCategories();
        setCategories(cats);
      }

      // Load stores with filters
      const storeList = await marketplaceService.getListedStores({
        category: selectedCategory || undefined,
        city: selectedCity || undefined,
        search: searchQuery || undefined,
      });
      setStores(storeList);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique cities from stores
  const cities = [...new Set(stores.filter(s => s.city).map(s => s.city as string))];

  // Featured stores
  const featuredStores = stores.filter(s => s.is_featured);

  // Clear filters
  const clearFilters = () => {
    setSelectedCategory(null);
    setSelectedCity(null);
    setSearchQuery('');
  };

  const hasActiveFilters = selectedCategory || selectedCity || searchQuery;

  return (
    <MainLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Hero Section */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-8 sm:py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-6">
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Peeap Marketplace</h1>
              <p className="text-primary-100 text-lg">
                Discover local businesses and order directly to your doorstep
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search stores, products, or categories..."
                  className="w-full pl-12 pr-4 py-3.5 rounded-xl text-gray-900 placeholder-gray-500 bg-white shadow-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {/* Categories */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Categories</h2>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap font-medium transition-colors ${
                  !selectedCategory
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                }`}
              >
                <Grid3X3 className="w-4 h-4" />
                All
              </button>
              {categories.map(category => {
                const Icon = categoryIcons[category.slug] || Grid3X3;
                return (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap font-medium transition-colors ${
                      selectedCategory === category.slug
                        ? 'text-white'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                    }`}
                    style={{
                      backgroundColor: selectedCategory === category.slug ? category.color : undefined,
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {category.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Featured Stores */}
          {featuredStores.length > 0 && !hasActiveFilters && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  Featured Stores
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredStores.slice(0, 3).map(store => (
                  <StoreCard key={store.id} store={store} featured />
                ))}
              </div>
            </div>
          )}

          {/* Store Listings */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedCategory
                  ? categories.find(c => c.slug === selectedCategory)?.name || 'Stores'
                  : 'All Stores'}
                <span className="text-gray-500 dark:text-gray-400 font-normal ml-2">
                  ({stores.length})
                </span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowFilters(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <Filter className="w-4 h-4" />
                  Filters
                </button>
                <div className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 ${viewMode === 'grid' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-500'}`}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600' : 'text-gray-500'}`}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
              </div>
            ) : stores.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No stores found</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">
                  {hasActiveFilters
                    ? 'Try adjusting your filters or search query'
                    : 'No stores are available at the moment'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {stores.map(store => (
                  <StoreCard key={store.id} store={store} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {stores.map(store => (
                  <StoreListCard key={store.id} store={store} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Filter Modal */}
        {showFilters && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
            <div className="bg-white dark:bg-gray-800 w-full sm:max-w-md sm:rounded-xl p-6 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                <button
                  onClick={() => setShowFilters(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* City Filter */}
              {cities.length > 0 && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    City
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {cities.map(city => (
                      <button
                        key={city}
                        onClick={() => setSelectedCity(selectedCity === city ? null : city)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          selectedCity === city
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                        }`}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    clearFilters();
                    setShowFilters(false);
                  }}
                  className="flex-1 py-2.5 text-gray-700 dark:text-gray-300 font-medium border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700"
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}

// Store Card Component (Grid View)
function StoreCard({ store, featured = false }: { store: MarketplaceStore; featured?: boolean }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/marketplace/store/${store.store_slug || store.id}`)}
      className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all text-left w-full ${
        featured ? 'ring-2 ring-yellow-400' : ''
      }`}
    >
      {/* Banner */}
      <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-600 relative">
        {store.banner_url ? (
          <img src={store.banner_url} alt="" className="w-full h-full object-cover" />
        ) : null}
        {featured && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" />
            Featured
          </div>
        )}
        {/* Logo */}
        <div className="absolute -bottom-6 left-4">
          <div className="w-16 h-16 rounded-xl bg-white dark:bg-gray-700 border-4 border-white dark:border-gray-800 shadow-md flex items-center justify-center overflow-hidden">
            {store.logo_url ? (
              <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-8 h-8 text-gray-400" />
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pt-8 pb-4 px-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
            {store.store_name}
            {store.is_verified && (
              <BadgeCheck className="w-4 h-4 text-blue-500" />
            )}
          </h3>
          {store.average_rating > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
              <span className="font-medium text-gray-900 dark:text-white">{store.average_rating.toFixed(1)}</span>
            </div>
          )}
        </div>

        {store.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
            {store.description}
          </p>
        )}

        <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
          {store.city && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {store.city}
            </span>
          )}
          {store.offers_delivery && (
            <span className="flex items-center gap-1 text-green-600">
              <Truck className="w-3 h-3" />
              Delivery
            </span>
          )}
          {store.offers_pickup && (
            <span className="flex items-center gap-1">
              <Package className="w-3 h-3" />
              Pickup
            </span>
          )}
        </div>

        {store.minimum_order > 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
            Min. order: {formatCurrency(store.minimum_order)}
          </p>
        )}
      </div>
    </button>
  );
}

// Store List Card Component (List View)
function StoreListCard({ store }: { store: MarketplaceStore }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(`/marketplace/store/${store.store_slug || store.id}`)}
      className="w-full bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all"
    >
      <div className="flex gap-4 p-4">
        {/* Logo */}
        <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-700 flex-shrink-0 flex items-center justify-center overflow-hidden">
          {store.logo_url ? (
            <img src={store.logo_url} alt={store.store_name} className="w-full h-full object-cover" />
          ) : (
            <Store className="w-8 h-8 text-gray-400" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
              {store.store_name}
              {store.is_verified && (
                <BadgeCheck className="w-4 h-4 text-blue-500" />
              )}
            </h3>
            {store.average_rating > 0 && (
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                <span className="font-medium">{store.average_rating.toFixed(1)}</span>
                <span className="text-gray-400">({store.total_ratings})</span>
              </div>
            )}
          </div>

          {store.description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mb-2">
              {store.description}
            </p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400">
            {store.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {store.city}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {store.preparation_time_minutes} min
            </span>
            {store.offers_delivery && (
              <span className="flex items-center gap-1 text-green-600">
                <Truck className="w-3 h-3" />
                {store.delivery_fee > 0 ? formatCurrency(store.delivery_fee) : 'Free'} delivery
              </span>
            )}
          </div>
        </div>

        <ChevronRight className="w-5 h-5 text-gray-400 self-center flex-shrink-0" />
      </div>
    </button>
  );
}

export default MarketplacePage;
