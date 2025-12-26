/**
 * Merchant Setup Wizard
 *
 * A fun, engaging multi-step wizard that helps users become merchants.
 * Pre-fills personal info and creates a business on completion.
 *
 * Steps:
 * 1. Welcome - Introduction to merchant features
 * 2. Personal Info - Pre-filled from user account
 * 3. Business Info - Business name and category
 * 4. Contact & Location - Address and contact details
 * 5. Review - Summary before submission
 * 6. Success - Celebration with confetti
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowRight,
  ArrowLeft,
  Store,
  User,
  Building2,
  MapPin,
  Phone,
  Mail,
  Check,
  Loader2,
  Sparkles,
  CreditCard,
  BarChart3,
  ShoppingBag,
  Globe,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import confetti from 'canvas-confetti';

interface BusinessCategory {
  id: string;
  name: string;
  icon: string;
}

interface MerchantSetupWizardProps {
  onClose: () => void;
  onComplete?: () => void;
}

// Step indicator component
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <motion.div
          key={index}
          className={`w-3 h-3 rounded-full transition-all duration-300 ${
            index === currentStep
              ? 'bg-purple-600 scale-125'
              : index < currentStep
              ? 'bg-purple-400'
              : 'bg-gray-300 dark:bg-gray-600'
          }`}
          initial={{ scale: 0.8 }}
          animate={{ scale: index === currentStep ? 1.25 : 1 }}
        />
      ))}
    </div>
  );
}

// Floating store animation
function FloatingStore({ showSparkles = false }: { showSparkles?: boolean }) {
  return (
    <div className="relative">
      <motion.div
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="relative"
      >
        <div className="w-32 h-32 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl mx-auto">
          <Store className="w-16 h-16 text-white" />
        </div>
        {showSparkles && (
          <>
            <motion.div
              className="absolute -top-4 -right-4 text-yellow-400"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <Sparkles className="w-8 h-8" />
            </motion.div>
            <motion.div
              className="absolute -bottom-2 -left-4 text-yellow-400"
              animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.5 }}
            >
              <Sparkles className="w-6 h-6" />
            </motion.div>
          </>
        )}
      </motion.div>
    </div>
  );
}

// Feature cards animation
function FeatureCards() {
  const features = [
    { icon: CreditCard, label: 'Accept Payments', color: 'from-blue-500 to-cyan-500' },
    { icon: ShoppingBag, label: 'Sell Products', color: 'from-green-500 to-emerald-500' },
    { icon: BarChart3, label: 'Analytics', color: 'from-orange-500 to-amber-500' },
    { icon: Globe, label: 'Online Store', color: 'from-pink-500 to-rose-500' },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 mt-6">
      {features.map((feature, index) => (
        <motion.div
          key={feature.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 + index * 0.1 }}
          className={`bg-gradient-to-br ${feature.color} p-3 rounded-xl text-white text-center`}
        >
          <feature.icon className="w-6 h-6 mx-auto mb-1" />
          <span className="text-xs font-medium">{feature.label}</span>
        </motion.div>
      ))}
    </div>
  );
}

export function MerchantSetupWizard({ onClose, onComplete }: MerchantSetupWizardProps) {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Form state - personal info (pre-filled)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Form state - business info
  const [businessName, setBusinessName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');

  // Form state - contact & location
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  const totalSteps = 6;

  // Pre-fill user info
  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || '');
      setLastName(user.lastName || '');
      setEmail(user.email || '');
      setPhone(user.phone || '');
      // Default business email to user email
      setBusinessEmail(user.email || '');
    }
  }, [user]);

  // Fetch business categories
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data, error } = await supabase
          .from('business_categories')
          .select('id, name, icon')
          .eq('status', 'ACTIVE')
          .order('sort_order');

        if (!error && data) {
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        return;
      }

      confetti({
        particleCount: 4,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#8B5CF6', '#6366F1', '#10B981', '#F59E0B'],
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#8B5CF6', '#6366F1', '#10B981', '#F59E0B'],
      });
    }, 100);
  };

  const handleNext = () => {
    // Validate current step
    if (currentStep === 2 && !businessName.trim()) {
      setError('Please enter your business name');
      return;
    }
    if (currentStep === 2 && !categoryId) {
      setError('Please select a business category');
      return;
    }

    setError(null);
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) return;

    setIsSubmitting(true);
    setError(null);

    try {
      // 1. Create merchant business record
      const { data: business, error: businessError } = await supabase
        .from('merchant_businesses')
        .insert({
          merchant_id: user.id,
          name: businessName,
          description: description || null,
          business_category_id: categoryId || null,
          email: businessEmail || null,
          phone: businessPhone || null,
          address: address || null,
          city: city || null,
          country: 'Sierra Leone',
          approval_status: 'PENDING',
          status: 'ACTIVE',
        })
        .select()
        .single();

      if (businessError) {
        console.error('Business creation error:', businessError);
        throw new Error(businessError.message || 'Failed to create business');
      }

      // 2. Submit role request for admin approval
      const { error: requestError } = await supabase
        .from('user_role_requests')
        .insert({
          user_id: user.id,
          user_name: `${firstName} ${lastName}`,
          user_email: email,
          from_role: 'user',
          to_role: 'merchant',
          business_name: businessName,
          business_type: categories.find(c => c.id === categoryId)?.name || 'Other',
          business_address: address,
          business_phone: businessPhone,
          reason: description,
          status: 'pending',
        });

      if (requestError) {
        console.error('Role request error:', requestError);
        // Don't fail - business was created successfully
      }

      // Move to success step
      setCurrentStep(5);
      triggerConfetti();

      // Refresh user data
      if (refreshUser) {
        await refreshUser();
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = () => {
    onComplete?.();
    onClose();
    // Navigate to merchant dashboard or settings
    navigate('/settings');
  };

  // Trigger confetti when reaching success step
  useEffect(() => {
    if (currentStep === 5) {
      triggerConfetti();
    }
  }, [currentStep]);

  const selectedCategory = categories.find(c => c.id === categoryId);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <Store className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">Become a Merchant</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Step {currentStep + 1} of {totalSteps}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />

          <AnimatePresence mode="wait">
            {/* Step 1: Welcome */}
            {currentStep === 0 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="text-center"
              >
                <FloatingStore showSparkles />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-6">
                  Start Your Business Journey
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mt-3">
                  Turn your passion into profit. Get everything you need to accept payments and grow your business.
                </p>
                <FeatureCards />
              </motion.div>
            )}

            {/* Step 2: Personal Info */}
            {currentStep === 1 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <User className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Confirm Your Details
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    We've pre-filled your information
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+232 XX XXX XXXX"
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 3: Business Info */}
            {currentStep === 2 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Building2 className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Tell Us About Your Business
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    This helps us set up your store
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Name *
                    </label>
                    <input
                      type="text"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g., Sarah's Bakery"
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Category *
                    </label>
                    {loadingCategories ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
                      </div>
                    ) : (
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">Select a category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description (Optional)
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Tell customers what you sell..."
                      rows={3}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 4: Contact & Location */}
            {currentStep === 3 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <MapPin className="w-8 h-8 text-green-600 dark:text-green-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Contact & Location
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Help customers find you
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Phone className="w-4 h-4 inline mr-1" />
                      Business Phone
                    </label>
                    <input
                      type="tel"
                      value={businessPhone}
                      onChange={(e) => setBusinessPhone(e.target.value)}
                      placeholder="+232 XX XXX XXXX"
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      <Mail className="w-4 h-4 inline mr-1" />
                      Business Email
                    </label>
                    <input
                      type="email"
                      value={businessEmail}
                      onChange={(e) => setBusinessEmail(e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Business Address
                    </label>
                    <textarea
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street address"
                      rows={2}
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g., Freetown"
                      className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 5: Review */}
            {currentStep === 4 && (
              <motion.div
                key="step5"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
              >
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    Review Your Details
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Make sure everything looks good
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Personal Info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <User className="w-4 h-4 text-blue-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Personal Info</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-500 dark:text-gray-400">Name:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{firstName} {lastName}</div>
                      <div className="text-gray-500 dark:text-gray-400">Email:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{email}</div>
                      <div className="text-gray-500 dark:text-gray-400">Phone:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{phone || '-'}</div>
                    </div>
                  </div>

                  {/* Business Info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 className="w-4 h-4 text-purple-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Business Info</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-500 dark:text-gray-400">Name:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{businessName}</div>
                      <div className="text-gray-500 dark:text-gray-400">Category:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{selectedCategory?.name || '-'}</div>
                    </div>
                    {description && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {description}
                      </div>
                    )}
                  </div>

                  {/* Contact Info */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm">Contact & Location</h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-gray-500 dark:text-gray-400">Phone:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{businessPhone || '-'}</div>
                      <div className="text-gray-500 dark:text-gray-400">Email:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{businessEmail || '-'}</div>
                      <div className="text-gray-500 dark:text-gray-400">City:</div>
                      <div className="text-gray-900 dark:text-white font-medium">{city || '-'}</div>
                    </div>
                    {address && (
                      <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        {address}
                      </div>
                    )}
                  </div>

                  {/* Info notice */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-400">
                      Your application will be reviewed within 1-2 business days. You'll receive a notification once approved.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 6: Success */}
            {currentStep === 5 && (
              <motion.div
                key="step6"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', delay: 0.2 }}
                  className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6"
                >
                  <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
                </motion.div>

                <motion.h3
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-2xl font-bold text-gray-900 dark:text-white"
                >
                  Congratulations!
                </motion.h3>
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-gray-600 dark:text-gray-400 mt-3"
                >
                  Your merchant application has been submitted.
                  We'll review it and get back to you soon!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-xl"
                >
                  <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">
                    What's Next?
                  </h4>
                  <ul className="text-sm text-purple-700 dark:text-purple-400 space-y-1 text-left">
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      We'll review your application
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      You'll receive a notification when approved
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Start accepting payments immediately!
                    </li>
                  </ul>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl"
            >
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </motion.div>
          )}
        </div>

        {/* Footer with navigation */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          {currentStep < 5 ? (
            <div className="flex items-center justify-between">
              {currentStep > 0 ? (
                <button
                  onClick={handleBack}
                  className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {currentStep === 4 ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Application
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors"
                >
                  {currentStep === 0 ? "Let's Go" : 'Next'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={handleComplete}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-indigo-700 transition-colors"
            >
              <Check className="w-5 h-5" />
              Done
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default MerchantSetupWizard;
