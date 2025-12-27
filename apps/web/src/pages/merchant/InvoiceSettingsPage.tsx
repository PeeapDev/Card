/**
 * Invoice Settings Page
 *
 * Configure invoice defaults, templates, and branding
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Save,
  Loader2,
  Calculator,
  Calendar,
  DollarSign,
  Palette,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  Image,
  Upload,
  CheckCircle,
} from 'lucide-react';
import { MerchantLayout } from '@/components/layout/MerchantLayout';
import { useBusiness } from '@/context/BusinessContext';
import { supabase } from '@/lib/supabase';

interface InvoiceSettings {
  default_tax_rate: number;
  default_due_days: number;
  default_currency: string;
  default_terms: string;
  default_notes: string;
  invoice_prefix: string;
  auto_send_reminders: boolean;
  reminder_days_before: number;
  show_business_logo: boolean;
  show_payment_qr: boolean;
  primary_color: string;
  // Business info override for invoices
  invoice_business_name: string;
  invoice_address: string;
  invoice_email: string;
  invoice_phone: string;
  invoice_website: string;
  invoice_footer: string;
}

const DEFAULT_SETTINGS: InvoiceSettings = {
  default_tax_rate: 0,
  default_due_days: 14,
  default_currency: 'SLE',
  default_terms: 'Payment is due within the specified due date.',
  default_notes: 'Thank you for your business!',
  invoice_prefix: 'INV',
  auto_send_reminders: true,
  reminder_days_before: 3,
  show_business_logo: true,
  show_payment_qr: true,
  primary_color: '#4F46E5',
  invoice_business_name: '',
  invoice_address: '',
  invoice_email: '',
  invoice_phone: '',
  invoice_website: '',
  invoice_footer: '',
};

export default function InvoiceSettingsPage() {
  const navigate = useNavigate();
  const { business: currentBusiness } = useBusiness();
  const [settings, setSettings] = useState<InvoiceSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (currentBusiness?.id) {
      loadSettings();
    }
  }, [currentBusiness?.id]);

  const loadSettings = async () => {
    if (!currentBusiness?.id) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('merchant_businesses')
        .select('invoice_settings, name, address, contact_email, contact_phone, website_url')
        .eq('id', currentBusiness.id)
        .single();

      if (!error && data) {
        const savedSettings = data.invoice_settings || {};
        setSettings({
          ...DEFAULT_SETTINGS,
          ...savedSettings,
          // Pre-populate business info if not set
          invoice_business_name: savedSettings.invoice_business_name || data.name || '',
          invoice_address: savedSettings.invoice_address || data.address || '',
          invoice_email: savedSettings.invoice_email || data.contact_email || '',
          invoice_phone: savedSettings.invoice_phone || data.contact_phone || '',
          invoice_website: savedSettings.invoice_website || data.website_url || '',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!currentBusiness?.id) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('merchant_businesses')
        .update({ invoice_settings: settings })
        .eq('id', currentBusiness.id);

      if (error) throw error;

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings');
    }
    setSaving(false);
  };

  const updateSetting = (key: keyof InvoiceSettings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <MerchantLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
        </div>
      </MerchantLayout>
    );
  }

  return (
    <MerchantLayout>
      <div className="p-6 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/merchant/invoices')}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoice Settings</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Configure default settings for your invoices
              </p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>

        <div className="space-y-6">
          {/* Default Values */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Default Values
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.default_tax_rate}
                  onChange={(e) => updateSetting('default_tax_rate', parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Due Days (from issue)
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={settings.default_due_days}
                  onChange={(e) => updateSetting('default_due_days', parseInt(e.target.value) || 14)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Currency
                </label>
                <select
                  value={settings.default_currency}
                  onChange={(e) => updateSetting('default_currency', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="SLE">SLE - Sierra Leone Leone</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                  <option value="GBP">GBP - British Pound</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={settings.invoice_prefix}
                  onChange={(e) => updateSetting('invoice_prefix', e.target.value.toUpperCase())}
                  placeholder="INV"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  e.g., {settings.invoice_prefix || 'INV'}-202501-0001
                </p>
              </div>
            </div>
          </div>

          {/* Default Terms & Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Default Text
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Terms & Conditions
                </label>
                <textarea
                  value={settings.default_terms}
                  onChange={(e) => updateSetting('default_terms', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Payment terms, late fees policy..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Default Notes
                </label>
                <textarea
                  value={settings.default_notes}
                  onChange={(e) => updateSetting('default_notes', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Thank you message, additional info..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Invoice Footer
                </label>
                <textarea
                  value={settings.invoice_footer}
                  onChange={(e) => updateSetting('invoice_footer', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  placeholder="Footer text for all invoices..."
                />
              </div>
            </div>
          </div>

          {/* Business Info for Invoices */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Building className="w-5 h-5" />
              Business Info on Invoices
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={settings.invoice_business_name}
                  onChange={(e) => updateSetting('invoice_business_name', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={settings.invoice_email}
                    onChange={(e) => updateSetting('invoice_email', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Phone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={settings.invoice_phone}
                    onChange={(e) => updateSetting('invoice_phone', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={settings.invoice_website}
                    onChange={(e) => updateSetting('invoice_website', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={settings.invoice_address}
                    onChange={(e) => updateSetting('invoice_address', e.target.value)}
                    rows={2}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Branding & Display */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Palette className="w-5 h-5" />
              Branding & Display
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Accent Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.primary_color}
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={settings.primary_color}
                    onChange={(e) => updateSetting('primary_color', e.target.value)}
                    className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white uppercase"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Show Business Logo</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Display your logo on invoices</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.show_business_logo}
                    onChange={(e) => updateSetting('show_business_logo', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Show Payment QR Code</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Add a QR code that links to the payment page</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.show_payment_qr}
                    onChange={(e) => updateSetting('show_payment_qr', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Reminders */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Payment Reminders
            </h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Auto-send Reminders</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Automatically remind customers before due date</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.auto_send_reminders}
                    onChange={(e) => updateSetting('auto_send_reminders', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 dark:peer-focus:ring-primary-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary-600"></div>
                </label>
              </div>

              {settings.auto_send_reminders && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Days before due date
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={settings.reminder_days_before}
                    onChange={(e) => updateSetting('reminder_days_before', parseInt(e.target.value) || 3)}
                    className="w-32 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </MerchantLayout>
  );
}
