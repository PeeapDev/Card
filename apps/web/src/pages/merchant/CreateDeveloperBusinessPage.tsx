import { useState, useEffect, useRef } from 'react';
import {
  Store,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Loader2,
  Tag,
  ChevronRight,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Upload,
  Image,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { StandaloneDeveloperLayout } from '@/components/layout/StandaloneDeveloperLayout';
import { businessService, CreateBusinessDto } from '@/services/business.service';
import { uploadService } from '@/services/upload.service';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface BusinessCategory {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
}

const STEPS = [
  { id: 1, title: 'Business Info', description: 'Basic details' },
  { id: 2, title: 'Categories', description: 'What you sell' },
  { id: 3, title: 'Contact', description: 'How to reach you' },
];

export function CreateDeveloperBusinessPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Logo upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [formData, setFormData] = useState<CreateBusinessDto>({
    name: '',
    description: '',
    business_category_id: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    website_url: '',
    logo_url: '',
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

  const updateFormData = (field: keyof CreateBusinessDto, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Logo handling functions
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Logo must be less than 5MB');
        return;
      }
      setLogoFile(file);
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    setFormData(prev => ({ ...prev, logo_url: '' }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (): Promise<string | null> => {
    if (!logoFile) return formData.logo_url || null;

    setUploadingLogo(true);
    try {
      const result = await uploadService.uploadImage(logoFile, 'business-logos');
      return result.url;
    } catch (err: any) {
      console.error('Logo upload failed:', err);
      setError('Failed to upload logo: ' + err.message);
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const validateStep = (step: number): boolean => {
    setError('');

    switch (step) {
      case 1:
        if (!formData.name.trim()) {
          setError('Business name is required');
          return false;
        }
        return true;

      case 2:
        // Categories optional
        return true;

      case 3:
        // Contact info optional
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
      // Upload logo first if there's a file
      let logoUrl = formData.logo_url;
      if (logoFile) {
        const uploadedUrl = await uploadLogo();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
        }
      }

      // Set the primary category
      const primaryCat = selectedCategories.find(c => c.is_primary);
      const submitData = {
        ...formData,
        logo_url: logoUrl,
        business_category_id: primaryCat?.id || '',
      };

      await businessService.createBusiness(submitData);

      // Navigate back to developer page
      navigate('/merchant/developer');
    } catch (err: any) {
      setError(err.message || 'Failed to create business');
    } finally {
      setSaving(false);
    }
  };

  return (
    <StandaloneDeveloperLayout
      homeRoute="/merchant"
      homeLabel="Merchant Portal"
      basePath="/merchant/developer"
    >
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/merchant/developer')}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Businesses
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Create New Business</h1>
          <p className="text-gray-500">Set up a new business to get API keys and start accepting payments</p>
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
                        ? 'bg-primary-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
                  </div>
                  <div className="mt-2 text-center">
                    <p className={`text-xs font-medium ${currentStep >= step.id ? 'text-primary-600' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {index < STEPS.length - 1 && (
                  <div
                    className={`w-20 sm:w-32 h-1 mx-2 ${
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
                <Building2 className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold">Business Information</h2>
              </div>

              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Business Logo
                </label>
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {logoPreview ? (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Logo preview"
                          className="w-24 h-24 rounded-lg object-cover border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={removeLogo}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-primary-500 hover:bg-gray-50 transition-colors"
                      >
                        <Image className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Upload Button & Info */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      {logoPreview ? 'Change Logo' : 'Upload Logo'}
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPG up to 5MB. Recommended: 256x256px or higher.
                    </p>
                    <p className="text-xs text-gray-400">
                      Your logo will appear on checkout pages.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={e => updateFormData('name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="My Awesome Shop"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={e => updateFormData('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Describe what your business does..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website_url}
                  onChange={e => updateFormData('website_url', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="https://myshop.com"
                />
              </div>
            </div>
          )}

          {/* Step 2: Categories */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Tag className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold">Business Categories</h2>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Select the categories that describe what your business sells.
              </p>

              {/* Selected Categories */}
              {selectedCategories.length > 0 && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-4">
                  <p className="text-sm font-medium text-green-700 mb-2">
                    Selected ({selectedCategories.length}):
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-200 rounded-lg overflow-hidden">
                {/* Left: Parent Categories */}
                <div className="border-r border-gray-200">
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">Select a Category</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
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
                            isSelected ? 'bg-primary-50 border-l-4 border-l-primary-500' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Store className="w-5 h-5 text-gray-400" />
                            <span className={`font-medium ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                              {parent.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedSubCount > 0 && (
                              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                {selectedSubCount}
                              </span>
                            )}
                            <ChevronRight className={`w-4 h-4 text-gray-400 ${isSelected ? 'text-primary-500' : ''}`} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Right: Subcategories */}
                <div>
                  <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">
                      {selectedParentId ? 'Select Subcategories' : 'Select a category first'}
                    </p>
                  </div>
                  <div className="max-h-72 overflow-y-auto">
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
                                <span className={isSelected ? 'text-green-700 font-medium' : 'text-gray-700'}>
                                  {sub.name}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="p-8 text-center text-gray-500">
                          <p>No subcategories</p>
                          <button
                            type="button"
                            onClick={() => {
                              const parent = categories.find(c => c.id === selectedParentId);
                              if (parent) toggleSubcategory(parent);
                            }}
                            className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
                          >
                            Select "{parentCategories.find(p => p.id === selectedParentId)?.name}"
                          </button>
                        </div>
                      )
                    ) : (
                      <div className="p-8 text-center text-gray-400">
                        <Store className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Select a category from the left</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Contact */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <Mail className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-semibold">Contact Information</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => updateFormData('email', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="shop@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => updateFormData('phone', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="077123456"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={e => updateFormData('city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Freetown"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => updateFormData('address', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="123 Main Street"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Summary</h3>
                <div className="flex items-start gap-4">
                  {/* Logo Preview in Summary */}
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="Business logo"
                      className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                  <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Business Name</p>
                      <p className="font-medium">{formData.name || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Categories</p>
                      <p className="font-medium">{selectedCategories.length} selected</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Email</p>
                      <p className="font-medium">{formData.email || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Location</p>
                      <p className="font-medium">{formData.city || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How it works - on last step */}
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>1. Your business is created and you get API keys instantly</li>
                  <li>2. Complete 2 test transactions in sandbox mode</li>
                  <li>3. Admin reviews and approves your business for live payments</li>
                  <li>4. Switch to live mode and start accepting real payments</li>
                </ul>
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
              <button
                type="button"
                onClick={() => navigate('/merchant/developer')}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
            )}

            {currentStep < STEPS.length ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
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
                    Creating...
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
    </StandaloneDeveloperLayout>
  );
}
