import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { Button } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import {
  AlertCircle,
  User,
  Loader2,
  BadgeCheck,
  Smartphone,
} from 'lucide-react';

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

export function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });

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
    } catch {
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

  const handleSubmit = async () => {
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

      // Create user directly in Supabase with roles array
      const { error: insertError } = await supabase
        .from('users')
        .insert({
          external_id: externalId,
          email: formData.email,
          phone: normalizedPhone || null,
          password_hash: formData.password,
          first_name: formData.firstName,
          last_name: formData.lastName,
          status: 'ACTIVE',
          kyc_status: 'NOT_STARTED',
          email_verified: false,
          roles: ['user'], // Always start with user role as array
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

      // Auto-login after registration
      try {
        await login({ email: formData.email, password: formData.password });
        navigate('/dashboard');
      } catch {
        // If auto-login fails, redirect to login page
        navigate('/login');
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join Peeap and start managing your money"
    >
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <User className="w-5 h-5" />
          <span className="font-medium">Personal Information</span>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            {error}
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
          onClick={handleSubmit}
          className="w-full"
          isLoading={saving}
        >
          Create Account
        </Button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-600 hover:text-primary-700 font-medium">
            Sign in
          </Link>
        </p>

        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            Want to become a merchant or agent?{' '}
            <span className="font-medium text-gray-800">
              You can apply from your account settings after registration.
            </span>
          </p>
        </div>
      </div>
    </AuthLayout>
  );
}
