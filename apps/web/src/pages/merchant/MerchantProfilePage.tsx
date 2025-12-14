import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Store,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  CreditCard,
  Shield,
  Edit,
  Save,
  X,
  CheckCircle,
  Clock,
  AlertCircle,
  Upload,
  Camera,
  Loader2,
  ChevronDown,
  Plus,
  Tag,
} from 'lucide-react';
import { MotionCard } from '@/components/ui/Card';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { SkeletonForm, SkeletonCard } from '@/components/ui/Skeleton';

interface BusinessProfile {
  id: string;
  business_name: string;
  business_type: string;
  business_category_id: string | null;
  business_category_name?: string;
  registration_number: string;
  tax_id: string;
  website: string;
  description: string;
  email: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  logo_url: string | null;
  kyc_status: string;
  is_active: boolean;
  created_at: string;
}

interface BankAccount {
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
}

export function MerchantProfilePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [profile, setProfile] = useState<BusinessProfile>({
    id: '',
    business_name: '',
    business_type: '',
    business_category_id: null,
    registration_number: '',
    tax_id: '',
    website: '',
    description: '',
    email: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    logo_url: null,
    kyc_status: 'pending',
    is_active: true,
    created_at: '',
  });

  const [bankAccount, setBankAccount] = useState<BankAccount>({
    bank_name: '',
    account_name: '',
    account_number: '',
    routing_number: '',
  });

  const [businessCategories, setBusinessCategories] = useState<{id: string; name: string; parent_id: string | null}[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<{id: string; name: string; is_primary: boolean}[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchBusinessCategories();
    fetchMerchantCategories();
  }, [user]);

  const fetchProfile = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select(`
          id,
          email,
          phone,
          business_name,
          kyc_status,
          is_active,
          created_at,
          business_category_id,
          business_categories (
            id,
            name
          )
        `)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (data) {
        setProfile(prev => ({
          ...prev,
          id: data.id,
          business_name: data.business_name || '',
          email: data.email || '',
          phone: data.phone || '',
          kyc_status: data.kyc_status || 'pending',
          is_active: data.is_active ?? true,
          created_at: data.created_at,
          business_category_id: data.business_category_id,
          business_category_name: (data.business_categories as any)?.name || '',
        }));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinessCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('business_categories')
        .select('id, name, parent_id')
        .eq('status', 'ACTIVE')
        .order('sort_order', { ascending: true });

      if (!error && data) {
        setBusinessCategories(data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchMerchantCategories = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('merchant_business_categories')
        .select(`
          id,
          is_primary,
          business_category_id,
          business_categories (
            id,
            name
          )
        `)
        .eq('user_id', user.id);

      if (!error && data) {
        const cats = data.map(d => ({
          id: (d.business_categories as any)?.id || d.business_category_id,
          name: (d.business_categories as any)?.name || '',
          is_primary: d.is_primary,
        }));
        setSelectedCategories(cats);
      }
    } catch (error) {
      console.error('Error fetching merchant categories:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Update basic profile info
      const { error } = await supabase
        .from('users')
        .update({
          business_name: profile.business_name,
          phone: profile.phone,
          business_category_id: selectedCategories.find(c => c.is_primary)?.id || null,
        })
        .eq('id', user?.id);

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      // Update merchant business categories (delete all and re-insert)
      if (user?.id) {
        // Delete existing
        await supabase
          .from('merchant_business_categories')
          .delete()
          .eq('user_id', user.id);

        // Insert new categories
        if (selectedCategories.length > 0) {
          const categoriesToInsert = selectedCategories.map(cat => ({
            user_id: user.id,
            business_category_id: cat.id,
            is_primary: cat.is_primary,
          }));

          const { error: insertError } = await supabase
            .from('merchant_business_categories')
            .insert(categoriesToInsert);

          if (insertError) {
            console.error('Error saving categories:', insertError);
          }
        }
      }

      setSuccessMessage('Profile updated successfully');
      setIsEditing(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const toggleCategory = (categoryId: string) => {
    const category = businessCategories.find(c => c.id === categoryId);
    if (!category) return;

    const isSelected = selectedCategories.some(c => c.id === categoryId);

    if (isSelected) {
      // Remove category
      const remaining = selectedCategories.filter(c => c.id !== categoryId);
      // If we removed the primary, make the first remaining one primary
      if (remaining.length > 0 && !remaining.some(c => c.is_primary)) {
        remaining[0].is_primary = true;
      }
      setSelectedCategories(remaining);
    } else {
      // Add category
      const newCategory = {
        id: category.id,
        name: category.name,
        is_primary: selectedCategories.length === 0, // First one is primary
      };
      setSelectedCategories([...selectedCategories, newCategory]);
    }
  };

  const setPrimaryCategory = (categoryId: string) => {
    setSelectedCategories(selectedCategories.map(c => ({
      ...c,
      is_primary: c.id === categoryId,
    })));
  };

  const removeCategory = (categoryId: string) => {
    const remaining = selectedCategories.filter(c => c.id !== categoryId);
    if (remaining.length > 0 && !remaining.some(c => c.is_primary)) {
      remaining[0].is_primary = true;
    }
    setSelectedCategories(remaining);
  };

  const handleParentSelect = (parentId: string) => {
    setSelectedParentId(parentId === selectedParentId ? null : parentId);
  };

  // Group categories by parent
  const parentCategories = businessCategories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) => businessCategories.filter(c => c.parent_id === parentId);

  const getKYCStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <CheckCircle className="w-4 h-4" /> Verified
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            <Clock className="w-4 h-4" /> Pending Verification
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <AlertCircle className="w-4 h-4" /> Verification Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
            <Clock className="w-4 h-4" /> {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
            <div className="space-y-6">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
      >
        {/* Header */}
        <motion.div
          className="flex justify-between items-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business Profile</h1>
            <p className="text-gray-500 dark:text-gray-400">Manage your business information</p>
          </div>
          {!isEditing ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit Profile
            </motion.button>
          ) : (
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setIsEditing(false);
                  fetchProfile();
                }}
                className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Cancel
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </motion.button>
            </div>
          )}
        </motion.div>

        {/* Success/Error Messages */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-400 flex items-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </motion.div>
        )}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5" />
            {errorMessage}
          </motion.div>
        )}

        {/* Profile Header Card */}
        <MotionCard className="p-6" delay={0.1} glowEffect>
          <div className="flex items-start gap-6">
            {/* Logo */}
            <div className="relative">
              <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                {profile.logo_url ? (
                  <img
                    src={profile.logo_url}
                    alt="Business Logo"
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  <Store className="w-12 h-12 text-green-600 dark:text-green-400" />
                )}
              </div>
              {isEditing && (
                <button className="absolute -bottom-2 -right-2 p-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">
                  <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                </button>
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.business_name}
                    onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                    className="text-2xl font-bold text-gray-900 dark:text-white bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 focus:ring-2 focus:ring-green-500"
                    placeholder="Business Name"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {profile.business_name || 'Your Business Name'}
                  </h2>
                )}
                {getKYCStatusBadge(profile.kyc_status)}
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-3">
                {profile.business_category_name || 'No category selected'}
              </p>
              <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  {profile.email}
                </div>
                {profile.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    {profile.phone}
                  </div>
                )}
              </div>
            </div>

            {/* Account Status */}
            <div className="text-right">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Account Status</p>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                profile.is_active ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              }`}>
                {profile.is_active ? 'Active' : 'Inactive'}
              </span>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                Member since {new Date(profile.created_at).toLocaleDateString()}
              </p>
            </div>
          </div>
        </MotionCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Information */}
          <MotionCard className="p-6" delay={0.2}>
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.business_name}
                    onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.business_name || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Categories
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">(Select all that apply)</span>
                </label>
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Selected Categories Summary */}
                    {selectedCategories.length > 0 && (
                      <div className="p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                        <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-2">
                          Selected Categories ({selectedCategories.length}):
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {selectedCategories.map((cat) => (
                            <span
                              key={cat.id}
                              className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs ${
                                cat.is_primary
                                  ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                              }`}
                            >
                              {cat.name}
                              {cat.is_primary && <span className="text-[10px] font-medium">(Primary)</span>}
                              {!cat.is_primary && (
                                <button
                                  type="button"
                                  onClick={() => setPrimaryCategory(cat.id)}
                                  className="text-[10px] text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 underline"
                                >
                                  Set Primary
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => removeCategory(cat.id)}
                                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400"
                              >
                                &times;
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Two-Column Category Selector */}
                    <div className="grid grid-cols-2 gap-0 border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                      {/* Left Column: Parent Categories */}
                      <div className="border-r border-gray-200 dark:border-gray-600">
                        <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Categories</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto bg-white dark:bg-gray-800">
                          {parentCategories.map(parent => {
                            const subcategories = getSubcategories(parent.id);
                            const selectedSubCount = subcategories.filter(sub =>
                              selectedCategories.some(c => c.id === sub.id)
                            ).length;
                            const isSelected = selectedParentId === parent.id;

                            return (
                              <button
                                key={parent.id}
                                type="button"
                                onClick={() => handleParentSelect(parent.id)}
                                className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-0 ${
                                  isSelected ? 'bg-green-50 dark:bg-green-900/30 border-l-2 border-l-green-500' : ''
                                }`}
                              >
                                <span className={`${isSelected ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                                  {parent.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  {selectedSubCount > 0 && (
                                    <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-800 text-green-700 dark:text-green-300 text-[10px] rounded-full">
                                      {selectedSubCount}
                                    </span>
                                  )}
                                  <ChevronDown className={`w-3 h-3 text-gray-400 -rotate-90 ${isSelected ? 'text-green-500' : ''}`} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Right Column: Subcategories */}
                      <div className="bg-white dark:bg-gray-800">
                        <div className="bg-gray-50 dark:bg-gray-700 px-3 py-2 border-b border-gray-200 dark:border-gray-600">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Subcategories</p>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {selectedParentId ? (
                            getSubcategories(selectedParentId).length > 0 ? (
                              <div className="p-2 space-y-1">
                                {getSubcategories(selectedParentId).map(sub => {
                                  const isSubSelected = selectedCategories.some(c => c.id === sub.id);
                                  return (
                                    <label
                                      key={sub.id}
                                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                                        isSubSelected ? 'bg-green-50 dark:bg-green-900/30' : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSubSelected}
                                        onChange={() => toggleCategory(sub.id)}
                                        className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 bg-white dark:bg-gray-700"
                                      />
                                      <span className={isSubSelected ? 'text-green-700 dark:text-green-400 font-medium' : 'text-gray-600 dark:text-gray-400'}>
                                        {sub.name}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                                <p>No subcategories</p>
                                <label className="flex items-center justify-center gap-2 mt-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedCategories.some(c => c.id === selectedParentId)}
                                    onChange={() => toggleCategory(selectedParentId)}
                                    className="w-4 h-4 text-green-600 border-gray-300 dark:border-gray-600 rounded focus:ring-green-500 bg-white dark:bg-gray-700"
                                  />
                                  <span className="text-sm text-gray-600 dark:text-gray-400">Select parent</span>
                                </label>
                              </div>
                            )
                          ) : (
                            <div className="p-4 text-center text-gray-400 dark:text-gray-500 text-xs">
                              Select a category
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Select a category on the left to see subcategories. First selected becomes primary.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.length > 0 ? (
                      selectedCategories.map((cat) => (
                        <span
                          key={cat.id}
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                            cat.is_primary
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <Tag className="w-3 h-3" />
                          {cat.name}
                          {cat.is_primary && <span className="text-[10px]">(Primary)</span>}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">No categories selected</p>
                    )}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Type</label>
                {isEditing ? (
                  <select
                    value={profile.business_type}
                    onChange={(e) => setProfile({ ...profile, business_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                  >
                    <option value="">Select type</option>
                    <option value="sole_proprietorship">Sole Proprietorship</option>
                    <option value="partnership">Partnership</option>
                    <option value="llc">LLC</option>
                    <option value="corporation">Corporation</option>
                    <option value="nonprofit">Non-Profit</option>
                  </select>
                ) : (
                  <p className="text-gray-900 dark:text-white capitalize">{profile.business_type?.replace('_', ' ') || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Number</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.registration_number}
                    onChange={(e) => setProfile({ ...profile, registration_number: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    placeholder="Business registration number"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.registration_number || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax ID</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.tax_id}
                    onChange={(e) => setProfile({ ...profile, tax_id: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    placeholder="Tax identification number"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.tax_id || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                {isEditing ? (
                  <input
                    type="url"
                    value={profile.website}
                    onChange={(e) => setProfile({ ...profile, website: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    placeholder="https://example.com"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">
                    {profile.website ? (
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-green-600 dark:text-green-400 hover:underline">
                        {profile.website}
                      </a>
                    ) : '-'}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Description</label>
                {isEditing ? (
                  <textarea
                    value={profile.description}
                    onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    placeholder="Describe your business..."
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.description || '-'}</p>
                )}
              </div>
            </div>
          </MotionCard>

          {/* Contact & Address */}
          <MotionCard className="p-6" delay={0.3}>
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contact & Address</h3>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <p className="text-gray-900 dark:text-white">{profile.email}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Contact support to change email</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                {isEditing ? (
                  <input
                    type="tel"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    placeholder="+1 (555) 000-0000"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.phone || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 1</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.address_line1}
                    onChange={(e) => setProfile({ ...profile, address_line1: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    placeholder="Street address"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.address_line1 || '-'}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address Line 2</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={profile.address_line2}
                    onChange={(e) => setProfile({ ...profile, address_line2: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    placeholder="Apt, Suite, Building (optional)"
                  />
                ) : (
                  <p className="text-gray-900 dark:text-white">{profile.address_line2 || '-'}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.city}
                      onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{profile.city || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State/Province</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.state}
                      onChange={(e) => setProfile({ ...profile, state: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{profile.state || '-'}</p>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.postal_code}
                      onChange={(e) => setProfile({ ...profile, postal_code: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{profile.postal_code || '-'}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Country</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profile.country}
                      onChange={(e) => setProfile({ ...profile, country: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                    />
                  ) : (
                    <p className="text-gray-900 dark:text-white">{profile.country || '-'}</p>
                  )}
                </div>
              </div>
            </div>
          </MotionCard>
        </div>

        {/* Bank Account Information */}
        <MotionCard className="p-6" delay={0.4}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payout Account</h3>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">For receiving payouts</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={bankAccount.bank_name}
                  onChange={(e) => setBankAccount({ ...bankAccount, bank_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                  placeholder="Bank name"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{bankAccount.bank_name || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label>
              {isEditing ? (
                <input
                  type="text"
                  value={bankAccount.account_name}
                  onChange={(e) => setBankAccount({ ...bankAccount, account_name: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                  placeholder="Account holder name"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{bankAccount.account_name || '-'}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={bankAccount.account_number}
                  onChange={(e) => setBankAccount({ ...bankAccount, account_number: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                  placeholder="Account number"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">
                  {bankAccount.account_number ? `****${bankAccount.account_number.slice(-4)}` : '-'}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Routing Number</label>
              {isEditing ? (
                <input
                  type="text"
                  value={bankAccount.routing_number}
                  onChange={(e) => setBankAccount({ ...bankAccount, routing_number: e.target.value })}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-gray-900 dark:text-white"
                  placeholder="Routing number"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{bankAccount.routing_number || '-'}</p>
              )}
            </div>
          </div>
        </MotionCard>

        {/* Verification Status */}
        <MotionCard className="p-6" delay={0.5} glowEffect>
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Verification Status</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className={`p-2 rounded-full ${profile.kyc_status === 'approved' || profile.kyc_status === 'verified' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                {profile.kyc_status === 'approved' || profile.kyc_status === 'verified' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Identity Verification</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{profile.kyc_status || 'Pending'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className={`p-2 rounded-full ${profile.business_name ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                {profile.business_name ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Business Information</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{profile.business_name ? 'Complete' : 'Incomplete'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div className={`p-2 rounded-full ${bankAccount.account_number ? 'bg-green-100 dark:bg-green-900/30' : 'bg-yellow-100 dark:bg-yellow-900/30'}`}>
                {bankAccount.account_number ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Payout Account</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{bankAccount.account_number ? 'Connected' : 'Not connected'}</p>
              </div>
            </div>
          </div>
        </MotionCard>
      </motion.div>
    </MerchantLayout>
  );
}
