import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  User,
  Store,
  Headphones,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Building2,
  MapPin,
  Loader2,
  Mail,
  Phone,
  Lock,
  Tag,
  ChevronRight,
  BadgeCheck,
  Smartphone,
} from 'lucide-react';

// Account types with descriptions
const ACCOUNT_TYPES = [
  {
    id: 'user',
    label: 'Personal Account',
    description: 'For individuals who want to make payments, hold funds, and manage their money',
    icon: User,
    color: 'border-blue-500 bg-blue-50 text-blue-700',
    selectedColor: 'border-blue-500 bg-blue-500 text-white',
    features: ['Send & receive money', 'Pay bills', 'Get a virtual card', 'Track spending'],
  },
  {
    id: 'merchant',
    label: 'Business Account',
    description: 'For businesses who want to accept payments from customers online or in-store',
    icon: Store,
    color: 'border-green-500 bg-green-50 text-green-700',
    selectedColor: 'border-green-500 bg-green-500 text-white',
    features: ['Accept payments', 'Payment SDK integration', 'Business dashboard', 'Sales analytics'],
  },
  {
    id: 'agent',
    label: 'Agent Account',
    description: 'For agents who facilitate transactions and help users with cash-in/cash-out services',
    icon: Headphones,
    color: 'border-orange-500 bg-orange-50 text-orange-700',
    selectedColor: 'border-orange-500 bg-orange-500 text-white',
    features: ['Process deposits', 'Process withdrawals', 'Earn commissions', 'Agent dashboard'],
  },
];

interface BusinessCategory {
  id: string;
  name: string;
  parent_id: string | null;
  icon: string | null;
}

// Normalize Sierra Leone phone number
const normalizePhoneNumber = (phone: string): string => {
  if (!phone) return '';
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('232')) {
    digits = digits.substring(3);
  }
  if (!digits.startsWith('0') && digits.length === 8) {
    digits = '0' + digits;
  }
  return digits;
};

type AccountType = 'user' | 'merchant' | 'agent';

// Steps for merchant registration (similar to admin flow)
const MERCHANT_STEPS = [
  { id: 1, title: 'Account', description: 'Login credentials' },
  { id: 2, title: 'Business Info', description: 'Business details' },
  { id: 3, title: 'Categories', description: 'What you sell' },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [step, setStep] = useState<'select_type' | 'form'>('select_type');
  const [selectedType, setSelectedType] = useState<AccountType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Merchant multi-step state
  const [merchantStep, setMerchantStep] = useState(1);

  // Form data for all account types
  const [formData, setFormData] = useState({
    // Account info
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Business info (merchant only)
    businessName: '',
    businessType: '',
    businessAddress: '',
    registrationNumber: '',
    taxId: '',
    description: '',
    // Agent info
    nationalId: '',
    agentLocation: '',
  });

  // Category state for merchants
  const [categories, setCategories] = useState<BusinessCategory[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<{ id: string; name: string; is_primary: boolean }[]>([]);

  // Mobile Money verification state
  const [momoVerification, setMomoVerification] = useState<{
    isVerifying: boolean;
    isVerified: boolean;
    accountName: string | null;
    providerName: string | null;
    error: string | null;
  }>({
    isVerifying: false,
    isVerified: false,
    accountName: null,
    providerName: null,
    error: null,
  });

  // Detect mobile money provider from phone number
  const detectMomoProvider = (phone: string): { providerId: string; providerName: string } | null => {
    const digits = phone.replace(/\D/g, '').replace(/^232/, '').replace(/^0/, '');
    if (digits.length < 2) return null;

    const prefix = digits.substring(0, 2);
    // Orange Money prefixes: 072, 073, 075, 076, 077, 078, 079
    if (['72', '73', '75', '76', '77', '78', '79'].includes(prefix)) {
      return { providerId: 'm17', providerName: 'Orange Money' };
    }
    // Africell/Afrimoney prefixes: 030, 031, 032, 033, 034, 088, 099
    if (['30', '31', '32', '33', '34', '88', '99'].includes(prefix)) {
      return { providerId: 'm18', providerName: 'Africell Money' };
    }
    return null;
  };

  // Verify phone number with mobile money KYC
  const verifyMobileMoneyAccount = useCallback(async (phone: string) => {
    const provider = detectMomoProvider(phone);
    if (!provider) {
      setMomoVerification(prev => ({ ...prev, isVerified: false, accountName: null, providerName: null, error: null }));
      return;
    }

    // Normalize phone number
    let digits = phone.replace(/\D/g, '').replace(/^232/, '');
    if (!digits.startsWith('0') && digits.length === 8) {
      digits = '0' + digits;
    }
    if (digits.length < 8) return;

    const fullPhoneNumber = `+232${digits.replace(/^0/, '')}`;

    setMomoVerification(prev => ({ ...prev, isVerifying: true, error: null }));

    try {
      const response = await fetch(`/api/router/mobile-money/lookup?phoneNumber=${encodeURIComponent(digits)}&providerId=${provider.providerId}`);
      const data = await response.json();

      if (data.success && data.accountName) {
        // Parse name into first and last name
        const nameParts = data.accountName.split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setMomoVerification({
          isVerifying: false,
          isVerified: true,
          accountName: data.accountName,
          providerName: provider.providerName,
          error: null,
        });

        // Auto-fill name if fields are empty
        if (!formData.firstName && !formData.lastName) {
          setFormData(prev => ({
            ...prev,
            firstName: firstName,
            lastName: lastName,
          }));
        }
      } else {
        setMomoVerification({
          isVerifying: false,
          isVerified: false,
          accountName: null,
          providerName: provider.providerName,
          error: data.error || 'Account not found on ' + provider.providerName,
        });
      }
    } catch (err) {
      setMomoVerification({
        isVerifying: false,
        isVerified: false,
        accountName: null,
        providerName: provider.providerName,
        error: 'Failed to verify account',
      });
    }
  }, [formData.firstName, formData.lastName]);

  // Debounce phone verification
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.phone && formData.phone.replace(/\D/g, '').length >= 8) {
        verifyMobileMoneyAccount(formData.phone);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [formData.phone, verifyMobileMoneyAccount]);

  useEffect(() => {
    if (selectedType === 'merchant') {
      fetchCategories();
    }
  }, [selectedType]);

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

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validatePassword = () => {
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return false;
    }
    if (!/[A-Z]/.test(formData.password)) {
      setError('Password must contain at least one uppercase letter');
      return false;
    }
    if (!/[a-z]/.test(formData.password)) {
      setError('Password must contain at least one lowercase letter');
      return false;
    }
    if (!/[0-9]/.test(formData.password)) {
      setError('Password must contain at least one number');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return false;
    }
    return true;
  };

  const handleSelectType = (type: AccountType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType) {
      setStep('form');
      setMerchantStep(1);
    }
  };

  const handleBack = () => {
    setStep('select_type');
    setError(null);
    setMerchantStep(1);
  };

  // Direct Supabase registration (like admin does)
  const registerDirectly = async (role: string) => {
    setSaving(true);
    setError(null);

    try {
      // Validate fields
      if (!formData.firstName.trim()) {
        setError('First name is required');
        setSaving(false);
        return;
      }
      if (!formData.lastName.trim()) {
        setError('Last name is required');
        setSaving(false);
        return;
      }
      if (!formData.email.trim()) {
        setError('Email is required');
        setSaving(false);
        return;
      }
      if (!formData.phone.trim()) {
        setError('Phone number is required');
        setSaving(false);
        return;
      }
      if (!validatePassword()) {
        setSaving(false);
        return;
      }

      const normalizedPhone = normalizePhoneNumber(formData.phone);

      // Check if email exists
      const { data: existingByEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', formData.email)
        .limit(1);

      if (existingByEmail && existingByEmail.length > 0) {
        setError('A user with this email already exists');
        setSaving(false);
        return;
      }

      // Check if phone exists
      if (normalizedPhone) {
        const { data: existingByPhone } = await supabase
          .from('users')
          .select('id')
          .eq('phone', normalizedPhone)
          .limit(1);

        if (existingByPhone && existingByPhone.length > 0) {
          setError('A user with this phone number already exists');
          setSaving(false);
          return;
        }
      }

      // Generate external ID
      const externalId = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create user directly in Supabase with correct role
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          external_id: externalId,
          email: formData.email,
          phone: normalizedPhone || null,
          password_hash: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          business_name: role === 'merchant' ? formData.businessName : null,
          business_category_id: role === 'merchant' ? selectedCategories.find(c => c.is_primary)?.id || null : null,
          status: 'ACTIVE',
          kyc_status: 'NOT_STARTED',
          email_verified: false,
          roles: role, // IMPORTANT: This sets the role correctly
          kyc_tier: 0,
        })
        .select()
        .single();

      if (insertError) {
        console.error('Registration error:', insertError);
        setError(insertError.message || 'Failed to create account');
        setSaving(false);
        return;
      }

      console.log('User created successfully with role:', role, newUser);

      // Save merchant business categories
      if (role === 'merchant' && selectedCategories.length > 0 && newUser?.id) {
        const categoriesToInsert = selectedCategories.map(cat => ({
          user_id: newUser.id,
          business_category_id: cat.id,
          is_primary: cat.is_primary,
        }));

        await supabase
          .from('merchant_business_categories')
          .insert(categoriesToInsert);
      }

      // Auto-login after registration
      try {
        await login({ email: formData.email, password: formData.password });

        // Navigate to appropriate dashboard
        const dashboardPath = role === 'merchant'
          ? '/merchant'
          : role === 'agent'
            ? '/agent'
            : '/dashboard';
        navigate(dashboardPath);
      } catch (loginErr) {
        // If auto-login fails, redirect to login page
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  // Handle form submission for personal/agent accounts
  const handleSubmitSimple = async () => {
    if (!selectedType) return;
    await registerDirectly(selectedType);
  };

  // Handle merchant multi-step navigation
  const validateMerchantStep = (step: number): boolean => {
    setError(null);

    switch (step) {
      case 1:
        if (!formData.firstName.trim()) {
          setError('First name is required');
          return false;
        }
        if (!formData.lastName.trim()) {
          setError('Last name is required');
          return false;
        }
        if (!formData.email.trim()) {
          setError('Email is required');
          return false;
        }
        if (!formData.phone.trim()) {
          setError('Phone number is required');
          return false;
        }
        if (!validatePassword()) {
          return false;
        }
        return true;

      case 2:
        if (!formData.businessName.trim()) {
          setError('Business name is required');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const nextMerchantStep = () => {
    if (validateMerchantStep(merchantStep)) {
      if (merchantStep < MERCHANT_STEPS.length) {
        setMerchantStep(prev => prev + 1);
      } else {
        // Final step - submit
        registerDirectly('merchant');
      }
    }
  };

  const prevMerchantStep = () => {
    if (merchantStep > 1) {
      setMerchantStep(prev => prev - 1);
    } else {
      handleBack();
    }
  };

  // Step 1: Account Type Selection
  if (step === 'select_type') {
    return (
      <AuthLayout
        title="Choose your account type"
        subtitle="Select how you want to use Peeap"
      >
        <div className="space-y-4">
          {ACCOUNT_TYPES.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;

            return (
              <button
                key={type.id}
                type="button"
                onClick={() => handleSelectType(type.id as AccountType)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? type.selectedColor + ' shadow-lg scale-[1.02]'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${isSelected ? 'bg-white/20' : type.color.split(' ')[1]}`}>
                    <Icon className={`w-6 h-6 ${isSelected ? 'text-white' : type.color.split(' ')[2]}`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className={`font-semibold text-lg ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {type.label}
                      </h3>
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <p className={`text-sm mt-1 ${isSelected ? 'text-white/80' : 'text-gray-600'}`}>
                      {type.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {type.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className={`text-xs px-2 py-1 rounded-full ${
                            isSelected
                              ? 'bg-white/20 text-white'
                              : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}

          <Button
            type="button"
            className="w-full mt-6"
            onClick={handleContinue}
            disabled={!selectedType}
          >
            Continue
          </Button>

          <p className="text-center text-sm text-gray-600 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  // Get selected type info
  const selectedTypeInfo = ACCOUNT_TYPES.find(t => t.id === selectedType);
  const TypeIcon = selectedTypeInfo?.icon || User;

  // Merchant multi-step form
  if (selectedType === 'merchant') {
    return (
      <AuthLayout
        title="Create Business Account"
        subtitle={`Step ${merchantStep} of ${MERCHANT_STEPS.length}: ${MERCHANT_STEPS[merchantStep - 1].description}`}
      >
        <div className="space-y-6">
          {/* Progress Steps */}
          <div className="flex items-center justify-between mb-6">
            {MERCHANT_STEPS.map((s, index) => (
              <div key={s.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    merchantStep > s.id
                      ? 'bg-green-600 text-white'
                      : merchantStep === s.id
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {merchantStep > s.id ? <CheckCircle className="w-4 h-4" /> : s.id}
                </div>
                {index < MERCHANT_STEPS.length - 1 && (
                  <div
                    className={`w-8 sm:w-16 h-1 mx-1 ${
                      merchantStep > s.id ? 'bg-green-600' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Step 1: Account Info */}
          {merchantStep === 1 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <User className="w-5 h-5" />
                <span className="font-medium">Account Information</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={e => updateFormData('firstName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={e => updateFormData('lastName', e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => updateFormData('email', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="john@business.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
                <div className="relative">
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => updateFormData('phone', e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                      momoVerification.isVerified
                        ? 'border-green-500 bg-green-50'
                        : momoVerification.error
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-gray-300'
                    }`}
                    placeholder="077601707"
                  />
                  {momoVerification.isVerifying && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                    </div>
                  )}
                  {momoVerification.isVerified && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <BadgeCheck className="w-5 h-5 text-green-500" />
                    </div>
                  )}
                </div>
                {momoVerification.isVerified && momoVerification.accountName && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-700">
                      <Smartphone className="w-4 h-4" />
                      <span className="text-sm font-medium">{momoVerification.providerName} Verified</span>
                    </div>
                    <p className="text-sm text-green-600 mt-1">
                      Account holder: <span className="font-semibold">{momoVerification.accountName}</span>
                    </p>
                  </div>
                )}
                {momoVerification.error && momoVerification.providerName && (
                  <p className="mt-1 text-xs text-yellow-600">{momoVerification.error}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={e => updateFormData('password', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Min 8 chars, uppercase, lowercase, number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
                <input
                  type="password"
                  value={formData.confirmPassword}
                  onChange={e => updateFormData('confirmPassword', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          )}

          {/* Step 2: Business Info */}
          {merchantStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <Building2 className="w-5 h-5" />
                <span className="font-medium">Business Information</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  value={formData.businessName}
                  onChange={e => updateFormData('businessName', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Your Business Name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
                <select
                  value={formData.businessType}
                  onChange={e => updateFormData('businessType', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select business type</option>
                  <option value="sole_proprietorship">Sole Proprietorship</option>
                  <option value="partnership">Partnership</option>
                  <option value="llc">LLC</option>
                  <option value="corporation">Corporation</option>
                  <option value="nonprofit">Non-Profit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Address</label>
                <input
                  type="text"
                  value={formData.businessAddress}
                  onChange={e => updateFormData('businessAddress', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="123 Main Street, Freetown"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Registration Number (Optional)</label>
                <input
                  type="text"
                  value={formData.registrationNumber}
                  onChange={e => updateFormData('registrationNumber', e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="REG-XXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => updateFormData('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Describe your business..."
                />
              </div>
            </div>
          )}

          {/* Step 3: Categories */}
          {merchantStep === 3 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
                <Tag className="w-5 h-5" />
                <span className="font-medium">Business Categories</span>
              </div>
              <p className="text-sm text-gray-500">Select categories that describe what you sell.</p>

              {/* Selected Categories */}
              {selectedCategories.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-700 mb-2">Selected ({selectedCategories.length}):</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedCategories.map(cat => (
                      <span
                        key={cat.id}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          cat.is_primary ? 'bg-green-200 text-green-800' : 'bg-white text-gray-700 border'
                        }`}
                      >
                        {cat.name}
                        {cat.is_primary && <span className="text-[10px] bg-green-300 px-1 rounded">Primary</span>}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Selector */}
              <div className="grid grid-cols-2 gap-0 border border-gray-200 rounded-lg overflow-hidden max-h-60">
                <div className="border-r border-gray-200 overflow-y-auto">
                  <div className="bg-gray-50 px-3 py-2 border-b text-xs font-medium text-gray-600">Categories</div>
                  {parentCategories.map(parent => {
                    const isSelected = selectedParentId === parent.id;
                    return (
                      <button
                        key={parent.id}
                        type="button"
                        onClick={() => handleParentSelect(parent.id)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm hover:bg-gray-50 border-b border-gray-100 ${
                          isSelected ? 'bg-green-50 border-l-2 border-l-green-500' : ''
                        }`}
                      >
                        <span className={isSelected ? 'text-green-700 font-medium' : 'text-gray-700'}>{parent.name}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    );
                  })}
                </div>

                <div className="overflow-y-auto">
                  <div className="bg-gray-50 px-3 py-2 border-b text-xs font-medium text-gray-600">Subcategories</div>
                  {selectedParentId ? (
                    getSubcategories(selectedParentId).length > 0 ? (
                      <div className="p-2 space-y-1">
                        {getSubcategories(selectedParentId).map(sub => {
                          const isSelected = selectedCategories.some(c => c.id === sub.id);
                          return (
                            <label
                              key={sub.id}
                              className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${
                                isSelected ? 'bg-green-50 border border-green-200' : 'hover:bg-gray-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSubcategory(sub)}
                                className="w-4 h-4 text-green-600 rounded"
                              />
                              <span className={isSelected ? 'text-green-700' : 'text-gray-700'}>{sub.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-gray-400 text-sm">No subcategories</div>
                    )
                  ) : (
                    <div className="p-4 text-center text-gray-400 text-sm">Select a category</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-4 border-t">
            <button
              type="button"
              onClick={prevMerchantStep}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <Button
              onClick={nextMerchantStep}
              isLoading={saving}
              className="bg-green-600 hover:bg-green-700"
            >
              {merchantStep < MERCHANT_STEPS.length ? (
                <>Continue <ArrowRight className="w-4 h-4 ml-1" /></>
              ) : (
                <>Create Business Account <CheckCircle className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>

          <p className="text-center text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  // Personal and Agent simple forms
  return (
    <AuthLayout
      title={`Create your ${selectedTypeInfo?.label || 'account'}`}
      subtitle="Fill in your details to get started"
    >
      <div className="space-y-4">
        {/* Back button and selected type indicator */}
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Change account type
          </button>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${selectedTypeInfo?.color}`}>
            <TypeIcon className="w-4 h-4" />
            {selectedTypeInfo?.label}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Agent-specific fields */}
        {selectedType === 'agent' && (
          <>
            <div className="flex items-center gap-2 text-orange-700 bg-orange-50 border border-orange-200 rounded-lg p-3 mb-4">
              <Headphones className="w-5 h-5" />
              <span className="font-medium">Agent Information</span>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">National ID Number *</label>
              <input
                type="text"
                value={formData.nationalId}
                onChange={e => updateFormData('nationalId', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="Enter your National ID"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location / Area of Operation *</label>
              <input
                type="text"
                value={formData.agentLocation}
                onChange={e => updateFormData('agentLocation', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                placeholder="e.g., Freetown Central, Lumley"
              />
            </div>

            <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4 mb-4">
              <User className="w-5 h-5" />
              <span className="font-medium">Personal Information</span>
            </div>
          </>
        )}

        {selectedType === 'user' && (
          <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <User className="w-5 h-5" />
            <span className="font-medium">Personal Information</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              value={formData.firstName}
              onChange={e => updateFormData('firstName', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              value={formData.lastName}
              onChange={e => updateFormData('lastName', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
          <input
            type="email"
            value={formData.email}
            onChange={e => updateFormData('email', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="john@example.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
          <div className="relative">
            <input
              type="tel"
              value={formData.phone}
              onChange={e => updateFormData('phone', e.target.value)}
              className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
                momoVerification.isVerified
                  ? 'border-green-500 bg-green-50'
                  : momoVerification.error
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-gray-300'
              }`}
              placeholder="077601707"
            />
            {momoVerification.isVerifying && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
              </div>
            )}
            {momoVerification.isVerified && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <BadgeCheck className="w-5 h-5 text-green-500" />
              </div>
            )}
          </div>
          {/* Mobile Money verification status */}
          {momoVerification.isVerified && momoVerification.accountName && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <Smartphone className="w-4 h-4" />
                <span className="text-sm font-medium">{momoVerification.providerName} Verified</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Account holder: <span className="font-semibold">{momoVerification.accountName}</span>
              </p>
            </div>
          )}
          {momoVerification.error && momoVerification.providerName && (
            <p className="mt-1 text-xs text-yellow-600">
              {momoVerification.error}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
          <input
            type="password"
            value={formData.password}
            onChange={e => updateFormData('password', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Min 8 chars, uppercase, lowercase, number"
          />
          <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters with uppercase, lowercase, and number</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
          <input
            type="password"
            value={formData.confirmPassword}
            onChange={e => updateFormData('confirmPassword', e.target.value)}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Confirm your password"
          />
        </div>

        <Button
          onClick={handleSubmitSimple}
          className="w-full"
          isLoading={saving}
        >
          Create {selectedTypeInfo?.label}
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
