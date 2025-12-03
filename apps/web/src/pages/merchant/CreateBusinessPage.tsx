import { useState, useEffect } from 'react';
import {
  Store,
  Mail,
  Phone,
  MapPin,
  Globe,
  Building2,
  CreditCard,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Upload,
  Camera,
  Tag,
  ChevronRight,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface BusinessCategory {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
}

interface BusinessFormData {
  business_name: string;
  business_type: string;
  registration_number: string;
  tax_id: string;
  website: string;
  description: string;
  phone: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  bank_name: string;
  account_name: string;
  account_number: string;
  routing_number: string;
}

const STEPS = [
  { id: 1, title: 'Business Info', description: 'Basic business details' },
  { id: 2, title: 'Categories', description: 'What do you sell?' },
  { id: 3, title: 'Contact & Address', description: 'Location details' },
  { id: 4, title: 'Payout Account', description: 'Bank information' },
];

export function CreateBusinessPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<BusinessFormData>({
    business_name: '',
    business_type: '',
    registration_number: '',
    tax_id: '',
    website: '',
    description: '',
    phone: '',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: '',
    bank_name: '',
    account_name: '',
    account_number: '',
    routing_number: '',
  });

  // Category state
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<{ id: string; name: string; is_primary: boolean }[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('business_categories')
      .select('id, name, parent_id, icon')
      .eq('status', 'ACTIVE')
      .order('sort_order', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
  };

  // Category helpers
  const parentCategories = categories.filter(c => !c.parent_id);
  const getSubcategories = (parentId: string) => categories.filter(c => c.parent_id === parentId);

  const handleParentSelect = (parentId: string) => {
    setSelectedParentId(parentId === selectedParentId ? null : parentId);
  };

  const toggleSubcategory = (subcategory: BusinessCategory) => {
    const isSelected = selectedCategories.some(c => c.id === subcategory.id);

    if (isSelected) {
      const remaining = selectedCategories.filter(c => c.id !== subcategory.id);
      if (remaining.length > 0 && !remaining.some(c => c.is_primary)) {
        remaining[0].is_primary = true;
      }
      setSelectedCategories(remaining);
    } else {
      setSelectedCategories([
        ...selectedCategories,
        {
          id: subcategory.id,
          name: subcategory.name,
          is_primary: selectedCategories.length === 0,
        },
      ]);
    }
  };

  const setPrimaryCategory = (categoryId: string) => {
    setSelectedCategories(
      selectedCategories.map(c => ({
        ...c,
        is_primary: c.id === categoryId,
      }))
    );
  };

  const removeCategory = (categoryId: string) => {
    const remaining = selectedCategories.filter(c => c.id !== categoryId);
    if (remaining.length > 0 && !remaining.some(c => c.is_primary)) {
      remaining[0].is_primary = true;
    }
    setSelectedCategories(remaining);
  };

  const updateFormData = (field: keyof BusinessFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: number): boolean => {
    setError('');

    switch (step) {
      case 1:
        if (!formData.business_name.trim()) {
          setError('Business name is required');
          return false;
        }
        if (!formData.business_type) {
          setError('Please select a business type');
          return false;
        }
        return true;

      case 2:
        if (selectedCategories.length === 0) {
          setError('Please select at least one business category');
          return false;
        }
        return true;

      case 3:
        if (!formData.phone.trim()) {
          setError('Phone number is required');
          return false;
        }
        if (!formData.address_line1.trim()) {
          setError('Address is required');
          return false;
        }
        if (!formData.city.trim()) {
          setError('City is required');
          return false;
        }
        if (!formData.country.trim()) {
          setError('Country is required');
          return false;
        }
        return true;

      case 4:
        // Bank info is optional
        return true;

      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setSaving(true);
    setError('');

    try {
      // Update user profile with business info
      const { error: userError } = await supabase
        .from('users')
        .update({
          business_name: formData.business_name,
          phone: formData.phone,
          business_category_id: selectedCategories.find(c => c.is_primary)?.id || null,
        })
        .eq('id', user?.id);

      if (userError) {
        setError(userError.message);
        setSaving(false);
        return;
      }

      // Save merchant business categories
      if (selectedCategories.length > 0 && user?.id) {
        // Delete existing
        await supabase
          .from('merchant_business_categories')
          .delete()
          .eq('user_id', user.id);

        // Insert new
        const categoriesToInsert = selectedCategories.map(cat => ({
          user_id: user.id,
          business_category_id: cat.id,
          is_primary: cat.is_primary,
        }));

        await supabase
          .from('merchant_business_categories')
          .insert(categoriesToInsert);
      }

      // Navigate to merchant dashboard
      navigate('/merchant');
    } catch (err: any) {
      setError(err.message || 'Failed to create business');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Store className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Create Your Business</h1>
          <p className="text-gray-500 mt-1">Set up your merchant account to start accepting payments</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                      currentStep > step.id
                        ? 'bg-green-600 text-white'
                        : currentStep === step.id
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${currentStep >= step.id ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-16 sm:w-24 h-1 mx-2 ${
                      currentStep > step.id ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Step Content */}
        <Card className="p-6">
          {/* Step 1: Business Info */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">Business Information</h2>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={e => updateFormData('business_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Your Business Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.business_type}
                  onChange={e => updateFormData('business_type', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select business type</option>
                  <option value="sole_proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="llc">LLC (Limited Liability Company)</option>
                  <option value="corporation">Corporation</option>
                  <option value="nonprofit">Non-Profit Organization</option>
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Number
                  </label>
                  <input
                    type="text"
                    value={formData.registration_number}
                    onChange={e => updateFormData('registration_number', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Business registration number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tax ID
                  </label>
                  <input
                    type="text"
                    value={formData.tax_id}
                    onChange={e => updateFormData('tax_id', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Tax identification number"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={e => updateFormData('website', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="https://www.yourbusiness.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => updateFormData('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Describe what your business does..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Categories */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">Business Categories</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Select the categories that best describe your business. You can select multiple subcategories.
              </p>

              {/* Selected Categories */}
              {selectedCategories.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <p className="text-sm font-medium text-green-700 mb-2">
                    Selected Categories ({selectedCategories.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map(cat => (
                      <span
                        key={cat.id}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                          cat.is_primary
                            ? 'bg-green-200 text-green-800'
                            : 'bg-white text-gray-700 border border-gray-200'
                        }`}
                      >
                        {cat.name}
                        {cat.is_primary && (
                          <span className="text-xs bg-green-300 px-1.5 py-0.5 rounded">Primary</span>
                        )}
                        {!cat.is_primary && (
                          <button
                            type="button"
                            onClick={() => setPrimaryCategory(cat.id)}
                            className="text-xs text-green-600 hover:text-green-700 underline"
                          >
                            Set Primary
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeCategory(cat.id)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Two-Column Category Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border border-gray-200 rounded-lg overflow-hidden">
                {/* Left Column: Parent Categories */}
                <div className="border-r border-gray-200">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Select a Category</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
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
                          className={`w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0 transition-colors ${
                            isSelected ? 'bg-green-50 border-l-4 border-l-green-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Store className="w-5 h-5 text-gray-400" />
                            <span className={`font-medium ${isSelected ? 'text-green-700' : 'text-gray-900'}`}>
                              {parent.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedSubCount > 0 && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                {selectedSubCount}
                              </span>
                            )}
                            <ChevronRight className={`w-4 h-4 text-gray-400 ${isSelected ? 'text-green-500' : ''}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right Column: Subcategories */}
                <div>
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">
                      {selectedParentId
                        ? `Select Subcategories`
                        : 'Select a category first'}
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {selectedParentId ? (
                      getSubcategories(selectedParentId).length > 0 ? (
                        <div className="p-2 space-y-1">
                          {getSubcategories(selectedParentId).map(sub => {
                            const isSelected = selectedCategories.some(c => c.id === sub.id);
                            return (
                              <label
                                key={sub.id}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-green-50 border border-green-200'
                                    : 'hover:bg-gray-50 border border-transparent'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSubcategory(sub)}
                                  className="w-5 h-5 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                />
                                <span className={`${isSelected ? 'text-green-700 font-medium' : 'text-gray-700'}`}>
                                  {sub.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <p>No subcategories available</p>
                          <p className="text-sm mt-1">You can select the parent category directly</p>
                          <button
                            type="button"
                            onClick={() => {
                              const parent = categories.find(c => c.id === selectedParentId);
                              if (parent) {
                                toggleSubcategory(parent);
                              }
                            }}
                            className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                          >
                            Select "{parentCategories.find(p => p.id === selectedParentId)?.name}"
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Select a category from the left</p>
                        <p className="text-sm mt-1">to see available subcategories</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact & Address */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <MapPin className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">Contact & Address</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => updateFormData('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="+234 800 000 0000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 1 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.address_line1}
                  onChange={e => updateFormData('address_line1', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Street address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address Line 2
                </label>
                <input
                  type="text"
                  value={formData.address_line2}
                  onChange={e => updateFormData('address_line2', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Apt, Suite, Building (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => updateFormData('city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="City"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State/Province
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={e => updateFormData('state', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="State"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Postal Code
                  </label>
                  <input
                    type="text"
                    value={formData.postal_code}
                    onChange={e => updateFormData('postal_code', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Postal code"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Country <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.country}
                    onChange={e => updateFormData('country', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Country"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Payout Account */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <CreditCard className="w-5 h-5 text-green-600" />
                <h2 className="text-lg font-semibold">Payout Account</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Add your bank account to receive payouts. You can skip this and add it later.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_name}
                  onChange={e => updateFormData('bank_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Bank name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={formData.account_name}
                  onChange={e => updateFormData('account_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Name on account"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Account Number
                  </label>
                  <input
                    type="text"
                    value={formData.account_number}
                    onChange={e => updateFormData('account_number', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Account number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Routing Number / Sort Code
                  </label>
                  <input
                    type="text"
                    value={formData.routing_number}
                    onChange={e => updateFormData('routing_number', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Routing number"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Business Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Business Name</p>
                    <p className="font-medium">{formData.business_name || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Business Type</p>
                    <p className="font-medium capitalize">{formData.business_type?.replace('_', ' ') || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Categories</p>
                    <p className="font-medium">{selectedCategories.length} selected</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Location</p>
                    <p className="font-medium">{formData.city ? `${formData.city}, ${formData.country}` : '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating Business...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Create Business
                  </>
                )}
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
