/**
 * Shop Settings Page
 * Settings and configuration for a specific business/shop
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Store,
  ArrowLeft,
  Settings,
  Save,
  Loader2,
  Upload,
  Globe,
  Mail,
  Phone,
  MapPin,
  Image,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Eye,
  EyeOff,
  Link2,
  Bell,
  Shield,
  Key,
  RefreshCw,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { Card } from '@/components/ui/Card';
import { MerchantBusiness } from '@/services/business.service';
import { supabase } from '@/lib/supabase';

export function ShopSettingsPage() {
  const { businessId } = useParams<{ businessId: string }>();
  const navigate = useNavigate();
  const [business, setBusiness] = useState<MerchantBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    website_url: '',
    contact_email: '',
    contact_phone: '',
    address: '',
    logo_url: '',
    callback_url: '',
    webhook_url: '',
    is_live_mode: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (businessId) {
      fetchBusiness();
    }
  }, [businessId]);

  const fetchBusiness = async () => {
    if (!businessId) return;

    try {
      const { data, error } = await supabase
        .from('merchant_businesses')
        .select('*')
        .eq('id', businessId)
        .single();

      if (error) throw error;
      setBusiness(data);
      setFormData({
        name: data.name || '',
        slug: data.slug || '',
        description: data.description || '',
        website_url: data.website_url || '',
        contact_email: data.contact_email || '',
        contact_phone: data.contact_phone || '',
        address: data.address || '',
        logo_url: data.logo_url || '',
        callback_url: data.callback_url || '',
        webhook_url: data.webhook_url || '',
        is_live_mode: data.is_live_mode || false,
      });
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!businessId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('merchant_businesses')
        .update({
          name: formData.name,
          description: formData.description,
          website_url: formData.website_url,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          address: formData.address,
          logo_url: formData.logo_url,
          callback_url: formData.callback_url,
          webhook_url: formData.webhook_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (error) throw error;

      setSuccessMessage('Settings saved successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!businessId || !deleteConfirm) return;

    try {
      const { error } = await supabase
        .from('merchant_businesses')
        .delete()
        .eq('id', businessId);

      if (error) throw error;

      navigate('/merchant/shops');
    } catch (error) {
      console.error('Error deleting business:', error);
      alert('Failed to delete business. Please try again.');
    }
  };

  const regenerateApiKey = async () => {
    if (!businessId) return;

    const newKey = `pk_${business?.is_live_mode ? 'live' : 'test'}_${crypto.randomUUID().replace(/-/g, '')}`;

    try {
      const { error } = await supabase
        .from('merchant_businesses')
        .update({
          api_key: newKey,
          updated_at: new Date().toISOString(),
        })
        .eq('id', businessId);

      if (error) throw error;

      setBusiness(prev => prev ? { ...prev, api_key: newKey } : null);
      setSuccessMessage('API key regenerated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error regenerating API key:', error);
      alert('Failed to regenerate API key. Please try again.');
    }
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: React.ReactNode; label: string }> = {
      PENDING: { color: 'bg-yellow-100 text-yellow-700', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Pending Approval' },
      APPROVED: { color: 'bg-green-100 text-green-700', icon: <CheckCircle className="w-3.5 h-3.5" />, label: 'Approved' },
      REJECTED: { color: 'bg-red-100 text-red-700', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Rejected' },
      SUSPENDED: { color: 'bg-gray-100 text-gray-700', icon: <AlertTriangle className="w-3.5 h-3.5" />, label: 'Suspended' },
    };
    const badge = badges[status] || badges.PENDING;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-green-600" />
        </div>
      </MerchantLayout>
    );
  }

  if (!business) {
    return (
      <MerchantLayout>
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-lg font-medium text-gray-900 mb-2">Business not found</h2>
          <button
            onClick={() => navigate('/merchant/shops')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to My Shops
          </button>
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/merchant/shops/${businessId}`)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                <Link to="/merchant/shops" className="hover:text-green-600">My Shops</Link>
                <span>/</span>
                <Link to={`/merchant/shops/${businessId}`} className="hover:text-green-600">{business.name}</Link>
                <span>/</span>
                <span className="text-gray-900">Settings</span>
              </div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Shop Settings</h1>
                {getStatusBadge(business.approval_status)}
              </div>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {successMessage}
          </div>
        )}

        {/* Basic Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Store className="w-5 h-5" />
            Basic Information
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL identifier)</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500">pay.peeap.com/</span>
                <input
                  type="text"
                  value={formData.slug}
                  disabled
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-500"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Slug cannot be changed after creation</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <div className="flex items-center gap-4">
                {formData.logo_url && (
                  <img
                    src={formData.logo_url}
                    alt="Logo"
                    className="w-16 h-16 rounded-lg object-cover border border-gray-200"
                  />
                )}
                <input
                  type="url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Contact Information */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Contact Information
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="w-4 h-4 inline mr-1" />
                Website
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Mail className="w-4 h-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="contact@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="+232 76 123456"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, Freetown"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </Card>

        {/* API & Integration */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            API & Integration
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business ID</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={business.id}
                  disabled
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
              <div className="flex items-center gap-2">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={business.api_key || 'Not generated'}
                  disabled
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-sm"
                />
                <button
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title={showApiKey ? 'Hide' : 'Show'}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={regenerateApiKey}
                  className="p-2 hover:bg-gray-100 rounded-lg text-yellow-600"
                  title="Regenerate API Key"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Keep your API key secret. Regenerating will invalidate the old key.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Link2 className="w-4 h-4 inline mr-1" />
                Callback URL
              </label>
              <input
                type="url"
                value={formData.callback_url}
                onChange={(e) => setFormData({ ...formData, callback_url: e.target.value })}
                placeholder="https://yoursite.com/payment/callback"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">Users will be redirected here after payment</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Bell className="w-4 h-4 inline mr-1" />
                Webhook URL
              </label>
              <input
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://yoursite.com/webhooks/peeap"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-500 mt-1">We'll send payment notifications to this URL</p>
            </div>
          </div>
        </Card>

        {/* Mode Settings */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Environment Mode
          </h2>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">
                {formData.is_live_mode ? 'Live Mode' : 'Test Mode'}
              </h3>
              <p className="text-sm text-gray-500">
                {formData.is_live_mode
                  ? 'Processing real transactions with real money.'
                  : 'Testing mode - no real transactions are processed.'}
              </p>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              formData.is_live_mode
                ? 'bg-green-100 text-green-700'
                : 'bg-orange-100 text-orange-700'
            }`}>
              {formData.is_live_mode ? 'Live' : 'Test'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Mode can only be changed from the Developer Portal when your business is approved.
          </p>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-red-200">
          <h2 className="text-lg font-semibold text-red-600 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Danger Zone
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-red-50 rounded-lg">
              <div>
                <h3 className="font-medium text-red-900">Delete Business</h3>
                <p className="text-sm text-red-700">
                  This action cannot be undone. All transactions and data will be permanently deleted.
                </p>
              </div>
              {!deleteConfirm ? (
                <button
                  onClick={() => setDeleteConfirm(true)}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDeleteConfirm(false)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Confirm Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </MerchantLayout>
  );
}
