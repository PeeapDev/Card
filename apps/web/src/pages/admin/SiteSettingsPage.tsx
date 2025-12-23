/**
 * Site Settings Page
 *
 * Admin page to manage:
 * - General site settings (name, logo, contact)
 * - Theme customization (colors, dark mode)
 * - Landing page content (hero, features, pricing)
 * - Navigation menu editing
 * - SEO settings
 */

import { useState, useEffect } from 'react';
import {
  Settings,
  Palette,
  Layout,
  Menu,
  Globe,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Plus,
  Trash2,
  GripVertical,
  Eye,
  Image,
  Type,
  Link as LinkIcon,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Youtube,
  Mail,
  Phone,
  MapPin,
  Code,
  FileText,
  BarChart3,
  Sparkles,
  Smartphone,
  CreditCard,
  QrCode,
  Shield,
  TrendingUp,
  Clock,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/lib/supabase';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000002';

interface SiteSettings {
  // General
  siteName: string;
  siteTagline: string;
  siteDescription: string;
  logoUrl: string;
  faviconUrl: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  // Theme
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  darkModeEnabled: boolean;
  customCss: string;

  // Hero
  heroBadgeText: string;
  heroTitle: string;
  heroTitleHighlight: string;
  heroSubtitle: string;
  heroCtaPrimaryText: string;
  heroCtaPrimaryLink: string;
  heroCtaSecondaryText: string;
  heroCtaSecondaryLink: string;
  heroBackgroundImage: string;

  // Features
  featuresTitle: string;
  featuresTitleHighlight: string;
  featuresSubtitle: string;
  featuresList: Array<{
    icon: string;
    title: string;
    description: string;
    gradient: string;
  }>;

  // Payment Methods
  paymentMethods: Array<{
    name: string;
    providers: string[];
    icon: string;
    color: string;
    enabled: boolean;
  }>;

  // Pricing
  pricingTitle: string;
  pricingTitleHighlight: string;
  pricingSubtitle: string;
  pricingTiers: Array<{
    name: string;
    description: string;
    fee: string;
    features: string[];
    cta: string;
    ctaLink: string;
    highlighted: boolean;
  }>;

  // Stats
  stats: Array<{
    value: number;
    prefix?: string;
    suffix: string;
    label: string;
  }>;

  // CTA
  ctaTitle: string;
  ctaTitleHighlight: string;
  ctaSubtitle: string;
  ctaButtonText: string;
  ctaButtonLink: string;

  // Footer
  footerDescription: string;
  footerLinks: Array<{
    title: string;
    links: Array<{ name: string; href: string }>;
  }>;
  footerCopyright: string;

  // Navigation
  navLinks: Array<{
    label: string;
    href: string;
    isExternal?: boolean;
  }>;
  showSignIn: boolean;
  showGetStarted: boolean;

  // Integration
  integrationTitle: string;
  integrationTitleHighlight: string;
  integrationSubtitle: string;
  integrationFeatures: string[];
  sdkCodeExample: string;

  // SEO
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  ogImage: string;

  // Misc
  maintenanceMode: boolean;
  maintenanceMessage: string;
  googleAnalyticsId: string;
  customHeadScripts: string;
  customBodyScripts: string;

  // Session
  sessionTimeoutMinutes: number;
}

const DEFAULT_SETTINGS: SiteSettings = {
  siteName: 'Peeap',
  siteTagline: "Sierra Leone's #1 Payment Gateway",
  siteDescription: 'Accept Mobile Money, Cards, and QR payments with ease.',
  logoUrl: '',
  faviconUrl: '',
  contactEmail: '',
  contactPhone: '',
  address: 'Freetown, Sierra Leone',
  socialLinks: {},
  primaryColor: '#4F46E5',
  secondaryColor: '#9333EA',
  accentColor: '#EC4899',
  darkModeEnabled: true,
  customCss: '',
  heroBadgeText: "Sierra Leone's #1 Payment Gateway",
  heroTitle: 'Accept Payments',
  heroTitleHighlight: 'Anywhere',
  heroSubtitle: 'Peeap makes it easy for businesses in Sierra Leone to accept Mobile Money, Card payments, and QR codes.',
  heroCtaPrimaryText: 'Create Merchant Account',
  heroCtaPrimaryLink: '/register',
  heroCtaSecondaryText: 'Watch Demo',
  heroCtaSecondaryLink: '/register?type=agent',
  heroBackgroundImage: '',
  featuresTitle: 'Everything You Need to',
  featuresTitleHighlight: 'Accept Payments',
  featuresSubtitle: "A complete payment solution designed for Sierra Leone's businesses.",
  featuresList: [
    { icon: 'Smartphone', title: 'Mobile Money', description: 'Accept Orange Money, Africell Money and more through our Monime integration.', gradient: 'from-orange-500 to-amber-500' },
    { icon: 'CreditCard', title: 'Peeap Cards', description: 'Accept payments from Peeap prepaid cardholders - instant settlement.', gradient: 'from-blue-500 to-cyan-500' },
    { icon: 'QrCode', title: 'QR Code Payments', description: 'Generate QR codes for in-store payments. Customers scan with Peeap app.', gradient: 'from-purple-500 to-pink-500' },
    { icon: 'Shield', title: 'Secure & Compliant', description: 'Bank-grade encryption, fraud detection, and regulatory compliance built-in.', gradient: 'from-green-500 to-emerald-500' },
    { icon: 'Code', title: 'Simple Integration', description: 'Add payments to your site with just a few lines of code. Full API docs available.', gradient: 'from-indigo-500 to-violet-500' },
    { icon: 'TrendingUp', title: 'Real-Time Dashboard', description: 'Track payments, view analytics, and manage your business from one place.', gradient: 'from-rose-500 to-red-500' },
  ],
  paymentMethods: [
    { name: 'Mobile Money', providers: ['Orange Money', 'Africell Money'], icon: 'Smartphone', color: 'bg-gradient-to-br from-orange-400 to-orange-600', enabled: true },
    { name: 'Peeap Card', providers: ['Virtual Cards', 'Physical Cards'], icon: 'CreditCard', color: 'bg-gradient-to-br from-blue-400 to-indigo-600', enabled: true },
    { name: 'QR Code', providers: ['Peeap App Scan'], icon: 'QrCode', color: 'bg-gradient-to-br from-purple-400 to-purple-600', enabled: true },
  ],
  pricingTitle: 'Simple, Transparent',
  pricingTitleHighlight: 'Pricing',
  pricingSubtitle: 'Pay only for what you use. No monthly fees, no setup costs.',
  pricingTiers: [
    { name: 'Starter', description: 'For small businesses getting started', fee: '2.9% + Le 0.30', features: ['Accept all payment methods', 'Standard payout (T+2)', 'Basic dashboard', 'Email support', 'Up to Le 10,000/month'], cta: 'Start Free', ctaLink: '/register', highlighted: false },
    { name: 'Growth', description: 'For growing businesses', fee: '2.5% + Le 0.20', features: ['Everything in Starter', 'Next-day payout (T+1)', 'Advanced analytics', 'Priority support', 'Up to Le 100,000/month', 'Webhook notifications'], cta: 'Get Started', ctaLink: '/register', highlighted: true },
    { name: 'Enterprise', description: 'For large scale operations', fee: 'Custom', features: ['Everything in Growth', 'Same-day payout', 'Dedicated account manager', '24/7 phone support', 'Unlimited volume', 'Custom integration support', 'SLA guarantee'], cta: 'Contact Sales', ctaLink: '/contact', highlighted: false },
  ],
  stats: [
    { value: 500, suffix: '+', label: 'Merchants' },
    { value: 1, prefix: 'Le ', suffix: 'B+', label: 'Processed' },
    { value: 99.9, suffix: '%', label: 'Uptime' },
    { value: 24, suffix: '/7', label: 'Support' },
  ],
  ctaTitle: 'Ready to Start',
  ctaTitleHighlight: 'Accepting Payments?',
  ctaSubtitle: 'Create your merchant account today. No setup fees, no monthly minimums. Start accepting payments in minutes.',
  ctaButtonText: 'Create Free Account',
  ctaButtonLink: '/register',
  footerDescription: "Sierra Leone's leading payment gateway. Accept Mobile Money, Cards, and QR payments with ease.",
  footerLinks: [
    { title: 'Product', links: [{ name: 'Features', href: '#features' }, { name: 'Pricing', href: '#pricing' }, { name: 'Calculator', href: '#calculator' }, { name: 'API Docs', href: '/docs/SDK_INTEGRATION.md' }] },
    { title: 'Company', links: [{ name: 'About Us', href: '#' }, { name: 'Careers', href: '#' }, { name: 'Blog', href: '#' }, { name: 'Contact', href: '#' }] },
    { title: 'Legal', links: [{ name: 'Privacy Policy', href: '#' }, { name: 'Terms of Service', href: '#' }, { name: 'Security', href: '#' }] },
  ],
  footerCopyright: '2025 Peeap. All rights reserved.',
  navLinks: [
    { label: 'Features', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Calculator', href: '#calculator' },
  ],
  showSignIn: true,
  showGetStarted: true,
  integrationTitle: 'Integrate in',
  integrationTitleHighlight: 'Minutes',
  integrationSubtitle: 'Add Peeap to your website with just a few lines of code. Works with any platform.',
  integrationFeatures: ['Simple JavaScript SDK', 'REST API for custom integrations', 'Hosted checkout page - no code needed', 'Webhook notifications'],
  sdkCodeExample: '',
  metaTitle: '',
  metaDescription: '',
  metaKeywords: '',
  ogImage: '',
  maintenanceMode: false,
  maintenanceMessage: '',
  googleAnalyticsId: '',
  customHeadScripts: '',
  customBodyScripts: '',
  sessionTimeoutMinutes: 0,
};

type TabType = 'general' | 'theme' | 'landing' | 'menu' | 'seo' | 'advanced';

const ICON_OPTIONS = [
  { value: 'Smartphone', label: 'Smartphone' },
  { value: 'CreditCard', label: 'Credit Card' },
  { value: 'QrCode', label: 'QR Code' },
  { value: 'Shield', label: 'Shield' },
  { value: 'Code', label: 'Code' },
  { value: 'TrendingUp', label: 'Trending Up' },
  { value: 'Globe', label: 'Globe' },
  { value: 'Wallet', label: 'Wallet' },
  { value: 'Zap', label: 'Zap' },
  { value: 'Lock', label: 'Lock' },
];

const GRADIENT_OPTIONS = [
  { value: 'from-orange-500 to-amber-500', label: 'Orange' },
  { value: 'from-blue-500 to-cyan-500', label: 'Blue' },
  { value: 'from-purple-500 to-pink-500', label: 'Purple' },
  { value: 'from-green-500 to-emerald-500', label: 'Green' },
  { value: 'from-indigo-500 to-violet-500', label: 'Indigo' },
  { value: 'from-rose-500 to-red-500', label: 'Rose' },
  { value: 'from-yellow-500 to-orange-500', label: 'Yellow' },
  { value: 'from-teal-500 to-cyan-500', label: 'Teal' },
];

export function SiteSettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from('site_settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No settings exist, create default
          const { data: newData, error: insertError } = await supabase
            .from('site_settings')
            .insert({ id: SETTINGS_ID })
            .select()
            .single();

          if (insertError) throw insertError;
          if (newData) {
            setSettings(mapDbToState(newData));
          }
        } else {
          throw fetchError;
        }
      } else if (data) {
        setSettings(mapDbToState(data));
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError('Failed to load site settings');
    } finally {
      setLoading(false);
    }
  };

  const mapDbToState = (data: any): SiteSettings => ({
    siteName: data.site_name || DEFAULT_SETTINGS.siteName,
    siteTagline: data.site_tagline || DEFAULT_SETTINGS.siteTagline,
    siteDescription: data.site_description || DEFAULT_SETTINGS.siteDescription,
    logoUrl: data.logo_url || '',
    faviconUrl: data.favicon_url || '',
    contactEmail: data.contact_email || '',
    contactPhone: data.contact_phone || '',
    address: data.address || '',
    socialLinks: data.social_links || {},
    primaryColor: data.primary_color || DEFAULT_SETTINGS.primaryColor,
    secondaryColor: data.secondary_color || DEFAULT_SETTINGS.secondaryColor,
    accentColor: data.accent_color || DEFAULT_SETTINGS.accentColor,
    darkModeEnabled: data.dark_mode_enabled ?? true,
    customCss: data.custom_css || '',
    heroBadgeText: data.hero_badge_text || DEFAULT_SETTINGS.heroBadgeText,
    heroTitle: data.hero_title || DEFAULT_SETTINGS.heroTitle,
    heroTitleHighlight: data.hero_title_highlight || DEFAULT_SETTINGS.heroTitleHighlight,
    heroSubtitle: data.hero_subtitle || DEFAULT_SETTINGS.heroSubtitle,
    heroCtaPrimaryText: data.hero_cta_primary_text || DEFAULT_SETTINGS.heroCtaPrimaryText,
    heroCtaPrimaryLink: data.hero_cta_primary_link || DEFAULT_SETTINGS.heroCtaPrimaryLink,
    heroCtaSecondaryText: data.hero_cta_secondary_text || DEFAULT_SETTINGS.heroCtaSecondaryText,
    heroCtaSecondaryLink: data.hero_cta_secondary_link || DEFAULT_SETTINGS.heroCtaSecondaryLink,
    heroBackgroundImage: data.hero_background_image || '',
    featuresTitle: data.features_title || DEFAULT_SETTINGS.featuresTitle,
    featuresTitleHighlight: data.features_title_highlight || DEFAULT_SETTINGS.featuresTitleHighlight,
    featuresSubtitle: data.features_subtitle || DEFAULT_SETTINGS.featuresSubtitle,
    featuresList: data.features_list || DEFAULT_SETTINGS.featuresList,
    paymentMethods: data.payment_methods || DEFAULT_SETTINGS.paymentMethods,
    pricingTitle: data.pricing_title || DEFAULT_SETTINGS.pricingTitle,
    pricingTitleHighlight: data.pricing_title_highlight || DEFAULT_SETTINGS.pricingTitleHighlight,
    pricingSubtitle: data.pricing_subtitle || DEFAULT_SETTINGS.pricingSubtitle,
    pricingTiers: data.pricing_tiers || DEFAULT_SETTINGS.pricingTiers,
    stats: data.stats || DEFAULT_SETTINGS.stats,
    ctaTitle: data.cta_title || DEFAULT_SETTINGS.ctaTitle,
    ctaTitleHighlight: data.cta_title_highlight || DEFAULT_SETTINGS.ctaTitleHighlight,
    ctaSubtitle: data.cta_subtitle || DEFAULT_SETTINGS.ctaSubtitle,
    ctaButtonText: data.cta_button_text || DEFAULT_SETTINGS.ctaButtonText,
    ctaButtonLink: data.cta_button_link || DEFAULT_SETTINGS.ctaButtonLink,
    footerDescription: data.footer_description || DEFAULT_SETTINGS.footerDescription,
    footerLinks: data.footer_links || DEFAULT_SETTINGS.footerLinks,
    footerCopyright: data.footer_copyright || DEFAULT_SETTINGS.footerCopyright,
    navLinks: data.nav_links || DEFAULT_SETTINGS.navLinks,
    showSignIn: data.show_sign_in ?? true,
    showGetStarted: data.show_get_started ?? true,
    integrationTitle: data.integration_title || DEFAULT_SETTINGS.integrationTitle,
    integrationTitleHighlight: data.integration_title_highlight || DEFAULT_SETTINGS.integrationTitleHighlight,
    integrationSubtitle: data.integration_subtitle || DEFAULT_SETTINGS.integrationSubtitle,
    integrationFeatures: data.integration_features || DEFAULT_SETTINGS.integrationFeatures,
    sdkCodeExample: data.sdk_code_example || '',
    metaTitle: data.meta_title || '',
    metaDescription: data.meta_description || '',
    metaKeywords: data.meta_keywords || '',
    ogImage: data.og_image || '',
    maintenanceMode: data.maintenance_mode ?? false,
    maintenanceMessage: data.maintenance_message || '',
    googleAnalyticsId: data.google_analytics_id || '',
    customHeadScripts: data.custom_head_scripts || '',
    customBodyScripts: data.custom_body_scripts || '',
    sessionTimeoutMinutes: data.session_timeout_minutes ?? 0,
  });

  const mapStateToDb = (state: SiteSettings) => ({
    site_name: state.siteName,
    site_tagline: state.siteTagline,
    site_description: state.siteDescription,
    logo_url: state.logoUrl,
    favicon_url: state.faviconUrl,
    contact_email: state.contactEmail,
    contact_phone: state.contactPhone,
    address: state.address,
    social_links: state.socialLinks,
    primary_color: state.primaryColor,
    secondary_color: state.secondaryColor,
    accent_color: state.accentColor,
    dark_mode_enabled: state.darkModeEnabled,
    custom_css: state.customCss,
    hero_badge_text: state.heroBadgeText,
    hero_title: state.heroTitle,
    hero_title_highlight: state.heroTitleHighlight,
    hero_subtitle: state.heroSubtitle,
    hero_cta_primary_text: state.heroCtaPrimaryText,
    hero_cta_primary_link: state.heroCtaPrimaryLink,
    hero_cta_secondary_text: state.heroCtaSecondaryText,
    hero_cta_secondary_link: state.heroCtaSecondaryLink,
    hero_background_image: state.heroBackgroundImage,
    features_title: state.featuresTitle,
    features_title_highlight: state.featuresTitleHighlight,
    features_subtitle: state.featuresSubtitle,
    features_list: state.featuresList,
    payment_methods: state.paymentMethods,
    pricing_title: state.pricingTitle,
    pricing_title_highlight: state.pricingTitleHighlight,
    pricing_subtitle: state.pricingSubtitle,
    pricing_tiers: state.pricingTiers,
    stats: state.stats,
    cta_title: state.ctaTitle,
    cta_title_highlight: state.ctaTitleHighlight,
    cta_subtitle: state.ctaSubtitle,
    cta_button_text: state.ctaButtonText,
    cta_button_link: state.ctaButtonLink,
    footer_description: state.footerDescription,
    footer_links: state.footerLinks,
    footer_copyright: state.footerCopyright,
    nav_links: state.navLinks,
    show_sign_in: state.showSignIn,
    show_get_started: state.showGetStarted,
    integration_title: state.integrationTitle,
    integration_title_highlight: state.integrationTitleHighlight,
    integration_subtitle: state.integrationSubtitle,
    integration_features: state.integrationFeatures,
    sdk_code_example: state.sdkCodeExample,
    meta_title: state.metaTitle,
    meta_description: state.metaDescription,
    meta_keywords: state.metaKeywords,
    og_image: state.ogImage,
    maintenance_mode: state.maintenanceMode,
    maintenance_message: state.maintenanceMessage,
    google_analytics_id: state.googleAnalyticsId,
    custom_head_scripts: state.customHeadScripts,
    custom_body_scripts: state.customBodyScripts,
    session_timeout_minutes: state.sessionTimeoutMinutes,
  });

  const handleSave = async () => {
    setSaving(true);
    setSuccess(null);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('site_settings')
        .update(mapStateToDb(settings))
        .eq('id', SETTINGS_ID);

      if (updateError) throw updateError;

      setSuccess('Site settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save site settings');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general' as TabType, label: 'General', icon: Settings },
    { id: 'theme' as TabType, label: 'Theme', icon: Palette },
    { id: 'landing' as TabType, label: 'Landing Page', icon: Layout },
    { id: 'menu' as TabType, label: 'Menu & Navigation', icon: Menu },
    { id: 'seo' as TabType, label: 'SEO', icon: Globe },
    { id: 'advanced' as TabType, label: 'Advanced', icon: Code },
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-96">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Site Settings</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Customize your landing page, branding, and site configuration
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={fetchSettings}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Eye className="w-4 h-4" />
              Preview
            </a>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Alerts */}
        {success && (
          <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex gap-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'general' && (
            <GeneralSettings settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'theme' && (
            <ThemeSettings settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'landing' && (
            <LandingPageSettings settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'menu' && (
            <MenuSettings settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'seo' && (
            <SeoSettings settings={settings} setSettings={setSettings} />
          )}
          {activeTab === 'advanced' && (
            <AdvancedSettings settings={settings} setSettings={setSettings} />
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

// General Settings Tab
function GeneralSettings({ settings, setSettings }: { settings: SiteSettings; setSettings: (s: SiteSettings) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Site Identity</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Site Name</label>
            <input
              type="text"
              value={settings.siteName}
              onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tagline</label>
            <input
              type="text"
              value={settings.siteTagline}
              onChange={(e) => setSettings({ ...settings, siteTagline: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={3}
              value={settings.siteDescription}
              onChange={(e) => setSettings({ ...settings, siteDescription: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo URL</label>
            <input
              type="url"
              value={settings.logoUrl}
              onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Favicon URL</label>
            <input
              type="url"
              value={settings.faviconUrl}
              onChange={(e) => setSettings({ ...settings, faviconUrl: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Contact Information</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Mail className="w-4 h-4 inline mr-1" /> Email
            </label>
            <input
              type="email"
              value={settings.contactEmail}
              onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
              placeholder="contact@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Phone className="w-4 h-4 inline mr-1" /> Phone
            </label>
            <input
              type="tel"
              value={settings.contactPhone}
              onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
              placeholder="+232 ..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <MapPin className="w-4 h-4 inline mr-1" /> Address
            </label>
            <textarea
              rows={2}
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-4">Social Links</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Facebook className="w-4 h-4 inline mr-1" /> Facebook
            </label>
            <input
              type="url"
              value={settings.socialLinks.facebook || ''}
              onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, facebook: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Twitter className="w-4 h-4 inline mr-1" /> Twitter
            </label>
            <input
              type="url"
              value={settings.socialLinks.twitter || ''}
              onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, twitter: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Instagram className="w-4 h-4 inline mr-1" /> Instagram
            </label>
            <input
              type="url"
              value={settings.socialLinks.instagram || ''}
              onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, instagram: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              <Linkedin className="w-4 h-4 inline mr-1" /> LinkedIn
            </label>
            <input
              type="url"
              value={settings.socialLinks.linkedin || ''}
              onChange={(e) => setSettings({ ...settings, socialLinks: { ...settings.socialLinks, linkedin: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}

// Theme Settings Tab
function ThemeSettings({ settings, setSettings }: { settings: SiteSettings; setSettings: (s: SiteSettings) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Brand Colors</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.secondaryColor}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(e) => setSettings({ ...settings, secondaryColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Accent Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.accentColor}
                onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                className="w-12 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={settings.accentColor}
                onChange={(e) => setSettings({ ...settings, accentColor: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        {/* Color Preview */}
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview</h4>
          <div className="flex gap-2">
            <div className="flex-1 h-20 rounded-lg" style={{ background: `linear-gradient(to right, ${settings.primaryColor}, ${settings.secondaryColor})` }} />
            <div className="w-20 h-20 rounded-lg" style={{ backgroundColor: settings.accentColor }} />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Theme Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Dark Mode Toggle</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Allow users to switch between light and dark mode</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, darkModeEnabled: !settings.darkModeEnabled })}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.darkModeEnabled ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.darkModeEnabled ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-4">Custom CSS</h3>
        <textarea
          rows={8}
          value={settings.customCss}
          onChange={(e) => setSettings({ ...settings, customCss: e.target.value })}
          placeholder="/* Add custom CSS here */"
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm"
        />
      </Card>
    </div>
  );
}

// Landing Page Settings Tab
function LandingPageSettings({ settings, setSettings }: { settings: SiteSettings; setSettings: (s: SiteSettings) => void }) {
  const [activeSection, setActiveSection] = useState<'hero' | 'features' | 'pricing' | 'stats' | 'cta' | 'footer'>('hero');

  return (
    <div className="space-y-6">
      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {['hero', 'features', 'pricing', 'stats', 'cta', 'footer'].map((section) => (
          <button
            key={section}
            onClick={() => setActiveSection(section as any)}
            className={`px-4 py-2 rounded-lg capitalize ${
              activeSection === section
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {section}
          </button>
        ))}
      </div>

      {/* Hero Section */}
      {activeSection === 'hero' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hero Section</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Badge Text</label>
              <input
                type="text"
                value={settings.heroBadgeText}
                onChange={(e) => setSettings({ ...settings, heroBadgeText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Background Image URL</label>
              <input
                type="url"
                value={settings.heroBackgroundImage}
                onChange={(e) => setSettings({ ...settings, heroBackgroundImage: e.target.value })}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title (before highlight)</label>
              <input
                type="text"
                value={settings.heroTitle}
                onChange={(e) => setSettings({ ...settings, heroTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title Highlight (colored)</label>
              <input
                type="text"
                value={settings.heroTitleHighlight}
                onChange={(e) => setSettings({ ...settings, heroTitleHighlight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
              <textarea
                rows={2}
                value={settings.heroSubtitle}
                onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary CTA Text</label>
              <input
                type="text"
                value={settings.heroCtaPrimaryText}
                onChange={(e) => setSettings({ ...settings, heroCtaPrimaryText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Primary CTA Link</label>
              <input
                type="text"
                value={settings.heroCtaPrimaryLink}
                onChange={(e) => setSettings({ ...settings, heroCtaPrimaryLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary CTA Text</label>
              <input
                type="text"
                value={settings.heroCtaSecondaryText}
                onChange={(e) => setSettings({ ...settings, heroCtaSecondaryText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Secondary CTA Link</label>
              <input
                type="text"
                value={settings.heroCtaSecondaryLink}
                onChange={(e) => setSettings({ ...settings, heroCtaSecondaryLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Features Section */}
      {activeSection === 'features' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Features Section</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={settings.featuresTitle}
                onChange={(e) => setSettings({ ...settings, featuresTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title Highlight</label>
              <input
                type="text"
                value={settings.featuresTitleHighlight}
                onChange={(e) => setSettings({ ...settings, featuresTitleHighlight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
              <input
                type="text"
                value={settings.featuresSubtitle}
                onChange={(e) => setSettings({ ...settings, featuresSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Feature Cards</h4>
          <div className="space-y-4">
            {settings.featuresList.map((feature, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-500">Feature {index + 1}</span>
                  <button
                    onClick={() => {
                      const newList = settings.featuresList.filter((_, i) => i !== index);
                      setSettings({ ...settings, featuresList: newList });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Title</label>
                    <input
                      type="text"
                      value={feature.title}
                      onChange={(e) => {
                        const newList = [...settings.featuresList];
                        newList[index] = { ...feature, title: e.target.value };
                        setSettings({ ...settings, featuresList: newList });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Icon</label>
                    <select
                      value={feature.icon}
                      onChange={(e) => {
                        const newList = [...settings.featuresList];
                        newList[index] = { ...feature, icon: e.target.value };
                        setSettings({ ...settings, featuresList: newList });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    >
                      {ICON_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={feature.description}
                      onChange={(e) => {
                        const newList = [...settings.featuresList];
                        newList[index] = { ...feature, description: e.target.value };
                        setSettings({ ...settings, featuresList: newList });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Gradient</label>
                    <select
                      value={feature.gradient}
                      onChange={(e) => {
                        const newList = [...settings.featuresList];
                        newList[index] = { ...feature, gradient: e.target.value };
                        setSettings({ ...settings, featuresList: newList });
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    >
                      {GRADIENT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  featuresList: [
                    ...settings.featuresList,
                    { icon: 'Globe', title: 'New Feature', description: 'Feature description', gradient: 'from-blue-500 to-cyan-500' }
                  ]
                });
              }}
              className="flex items-center gap-2 px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50"
            >
              <Plus className="w-4 h-4" /> Add Feature
            </button>
          </div>
        </Card>
      )}

      {/* Pricing Section */}
      {activeSection === 'pricing' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pricing Section</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={settings.pricingTitle}
                onChange={(e) => setSettings({ ...settings, pricingTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title Highlight</label>
              <input
                type="text"
                value={settings.pricingTitleHighlight}
                onChange={(e) => setSettings({ ...settings, pricingTitleHighlight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
              <input
                type="text"
                value={settings.pricingSubtitle}
                onChange={(e) => setSettings({ ...settings, pricingSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>

          <h4 className="font-medium text-gray-900 dark:text-white mb-3">Pricing Tiers</h4>
          <div className="space-y-4">
            {settings.pricingTiers.map((tier, index) => (
              <div key={index} className={`p-4 rounded-lg ${tier.highlighted ? 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200' : 'bg-gray-50 dark:bg-gray-800'}`}>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-sm font-medium text-gray-500">Tier {index + 1}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        const newTiers = [...settings.pricingTiers];
                        newTiers[index] = { ...tier, highlighted: !tier.highlighted };
                        setSettings({ ...settings, pricingTiers: newTiers });
                      }}
                      className={`px-2 py-1 text-xs rounded ${tier.highlighted ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}
                    >
                      {tier.highlighted ? 'Featured' : 'Normal'}
                    </button>
                    <button
                      onClick={() => {
                        const newTiers = settings.pricingTiers.filter((_, i) => i !== index);
                        setSettings({ ...settings, pricingTiers: newTiers });
                      }}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Name</label>
                    <input
                      type="text"
                      value={tier.name}
                      onChange={(e) => {
                        const newTiers = [...settings.pricingTiers];
                        newTiers[index] = { ...tier, name: e.target.value };
                        setSettings({ ...settings, pricingTiers: newTiers });
                      }}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fee</label>
                    <input
                      type="text"
                      value={tier.fee}
                      onChange={(e) => {
                        const newTiers = [...settings.pricingTiers];
                        newTiers[index] = { ...tier, fee: e.target.value };
                        setSettings({ ...settings, pricingTiers: newTiers });
                      }}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CTA Text</label>
                    <input
                      type="text"
                      value={tier.cta}
                      onChange={(e) => {
                        const newTiers = [...settings.pricingTiers];
                        newTiers[index] = { ...tier, cta: e.target.value };
                        setSettings({ ...settings, pricingTiers: newTiers });
                      }}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">CTA Link</label>
                    <input
                      type="text"
                      value={tier.ctaLink}
                      onChange={(e) => {
                        const newTiers = [...settings.pricingTiers];
                        newTiers[index] = { ...tier, ctaLink: e.target.value };
                        setSettings({ ...settings, pricingTiers: newTiers });
                      }}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div className="col-span-2 lg:col-span-4">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <input
                      type="text"
                      value={tier.description}
                      onChange={(e) => {
                        const newTiers = [...settings.pricingTiers];
                        newTiers[index] = { ...tier, description: e.target.value };
                        setSettings({ ...settings, pricingTiers: newTiers });
                      }}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div className="col-span-2 lg:col-span-4">
                    <label className="block text-xs text-gray-500 mb-1">Features (one per line)</label>
                    <textarea
                      rows={3}
                      value={tier.features.join('\n')}
                      onChange={(e) => {
                        const newTiers = [...settings.pricingTiers];
                        newTiers[index] = { ...tier, features: e.target.value.split('\n').filter(f => f.trim()) };
                        setSettings({ ...settings, pricingTiers: newTiers });
                      }}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  pricingTiers: [
                    ...settings.pricingTiers,
                    { name: 'New Tier', description: 'Tier description', fee: 'Custom', features: ['Feature 1'], cta: 'Get Started', ctaLink: '/register', highlighted: false }
                  ]
                });
              }}
              className="flex items-center gap-2 px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50"
            >
              <Plus className="w-4 h-4" /> Add Tier
            </button>
          </div>
        </Card>
      )}

      {/* Stats Section */}
      {activeSection === 'stats' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stats Section</h3>
          <div className="space-y-4">
            {settings.stats.map((stat, index) => (
              <div key={index} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-4">
                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Value</label>
                    <input
                      type="number"
                      value={stat.value}
                      onChange={(e) => {
                        const newStats = [...settings.stats];
                        newStats[index] = { ...stat, value: parseFloat(e.target.value) || 0 };
                        setSettings({ ...settings, stats: newStats });
                      }}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Prefix</label>
                    <input
                      type="text"
                      value={stat.prefix || ''}
                      onChange={(e) => {
                        const newStats = [...settings.stats];
                        newStats[index] = { ...stat, prefix: e.target.value };
                        setSettings({ ...settings, stats: newStats });
                      }}
                      placeholder="e.g. Le "
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Suffix</label>
                    <input
                      type="text"
                      value={stat.suffix}
                      onChange={(e) => {
                        const newStats = [...settings.stats];
                        newStats[index] = { ...stat, suffix: e.target.value };
                        setSettings({ ...settings, stats: newStats });
                      }}
                      placeholder="e.g. +"
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Label</label>
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => {
                        const newStats = [...settings.stats];
                        newStats[index] = { ...stat, label: e.target.value };
                        setSettings({ ...settings, stats: newStats });
                      }}
                      className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    const newStats = settings.stats.filter((_, i) => i !== index);
                    setSettings({ ...settings, stats: newStats });
                  }}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  stats: [...settings.stats, { value: 0, suffix: '+', label: 'New Stat' }]
                });
              }}
              className="flex items-center gap-2 px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50"
            >
              <Plus className="w-4 h-4" /> Add Stat
            </button>
          </div>
        </Card>
      )}

      {/* CTA Section */}
      {activeSection === 'cta' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call-to-Action Section</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={settings.ctaTitle}
                onChange={(e) => setSettings({ ...settings, ctaTitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title Highlight</label>
              <input
                type="text"
                value={settings.ctaTitleHighlight}
                onChange={(e) => setSettings({ ...settings, ctaTitleHighlight: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subtitle</label>
              <textarea
                rows={2}
                value={settings.ctaSubtitle}
                onChange={(e) => setSettings({ ...settings, ctaSubtitle: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Button Text</label>
              <input
                type="text"
                value={settings.ctaButtonText}
                onChange={(e) => setSettings({ ...settings, ctaButtonText: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Button Link</label>
              <input
                type="text"
                value={settings.ctaButtonLink}
                onChange={(e) => setSettings({ ...settings, ctaButtonLink: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          </div>
        </Card>
      )}

      {/* Footer Section */}
      {activeSection === 'footer' && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Footer Section</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Footer Description</label>
              <textarea
                rows={2}
                value={settings.footerDescription}
                onChange={(e) => setSettings({ ...settings, footerDescription: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Copyright Text</label>
              <input
                type="text"
                value={settings.footerCopyright}
                onChange={(e) => setSettings({ ...settings, footerCopyright: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>

            <h4 className="font-medium text-gray-900 dark:text-white mt-6 mb-3">Footer Link Sections</h4>
            {settings.footerLinks.map((section, sectionIndex) => (
              <div key={sectionIndex} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex justify-between items-center mb-3">
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => {
                      const newLinks = [...settings.footerLinks];
                      newLinks[sectionIndex] = { ...section, title: e.target.value };
                      setSettings({ ...settings, footerLinks: newLinks });
                    }}
                    className="px-2 py-1 text-sm font-medium border rounded bg-white dark:bg-gray-700"
                    placeholder="Section Title"
                  />
                  <button
                    onClick={() => {
                      const newLinks = settings.footerLinks.filter((_, i) => i !== sectionIndex);
                      setSettings({ ...settings, footerLinks: newLinks });
                    }}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-2">
                  {section.links.map((link, linkIndex) => (
                    <div key={linkIndex} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={link.name}
                        onChange={(e) => {
                          const newLinks = [...settings.footerLinks];
                          newLinks[sectionIndex].links[linkIndex] = { ...link, name: e.target.value };
                          setSettings({ ...settings, footerLinks: newLinks });
                        }}
                        placeholder="Link Name"
                        className="flex-1 px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                      />
                      <input
                        type="text"
                        value={link.href}
                        onChange={(e) => {
                          const newLinks = [...settings.footerLinks];
                          newLinks[sectionIndex].links[linkIndex] = { ...link, href: e.target.value };
                          setSettings({ ...settings, footerLinks: newLinks });
                        }}
                        placeholder="URL"
                        className="flex-1 px-2 py-1 text-sm border rounded bg-white dark:bg-gray-700"
                      />
                      <button
                        onClick={() => {
                          const newLinks = [...settings.footerLinks];
                          newLinks[sectionIndex].links = section.links.filter((_, i) => i !== linkIndex);
                          setSettings({ ...settings, footerLinks: newLinks });
                        }}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newLinks = [...settings.footerLinks];
                      newLinks[sectionIndex].links.push({ name: 'New Link', href: '#' });
                      setSettings({ ...settings, footerLinks: newLinks });
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    + Add Link
                  </button>
                </div>
              </div>
            ))}
            <button
              onClick={() => {
                setSettings({
                  ...settings,
                  footerLinks: [...settings.footerLinks, { title: 'New Section', links: [{ name: 'Link', href: '#' }] }]
                });
              }}
              className="flex items-center gap-2 px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50"
            >
              <Plus className="w-4 h-4" /> Add Section
            </button>
          </div>
        </Card>
      )}
    </div>
  );
}

// Menu Settings Tab
function MenuSettings({ settings, setSettings }: { settings: SiteSettings; setSettings: (s: SiteSettings) => void }) {
  const [pages, setPages] = useState<Array<{ id: string; title: string; slug: string; status: string }>>([]);
  const [loadingPages, setLoadingPages] = useState(true);

  useEffect(() => {
    fetchPages();
  }, []);

  const fetchPages = async () => {
    try {
      const { data, error } = await supabase
        .from('pages')
        .select('id, title, slug, status')
        .order('title');

      if (error) throw error;
      setPages(data || []);
    } catch (err) {
      console.error('Error fetching pages:', err);
    } finally {
      setLoadingPages(false);
    }
  };

  const addPageToNav = (page: { title: string; slug: string }) => {
    const exists = settings.navLinks.some(link => link.href === `/p/${page.slug}`);
    if (!exists) {
      setSettings({
        ...settings,
        navLinks: [...settings.navLinks, { label: page.title, href: `/p/${page.slug}` }]
      });
    }
  };

  const addPageToFooter = (page: { title: string; slug: string }, sectionIndex: number) => {
    const newFooterLinks = [...settings.footerLinks];
    const exists = newFooterLinks[sectionIndex]?.links.some(link => link.href === `/p/${page.slug}`);
    if (!exists && newFooterLinks[sectionIndex]) {
      newFooterLinks[sectionIndex].links.push({ name: page.title, href: `/p/${page.slug}` });
      setSettings({ ...settings, footerLinks: newFooterLinks });
    }
  };

  return (
    <div className="space-y-6">
      {/* Content Pages Section */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content Pages</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Add your custom pages to navigation menus</p>
          </div>
          <a
            href="/admin/pages"
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm"
          >
            <Plus className="w-4 h-4" />
            Create New Page
          </a>
        </div>

        {loadingPages ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-400 mb-2">No pages created yet</p>
            <a href="/admin/pages" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
              Create your first page →
            </a>
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => (
              <div key={page.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{page.title}</p>
                    <p className="text-xs text-gray-500">/p/{page.slug}</p>
                  </div>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    page.status === 'published'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {page.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => addPageToNav(page)}
                    disabled={settings.navLinks.some(link => link.href === `/p/${page.slug}`)}
                    className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 rounded-lg hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    + Header
                  </button>
                  <div className="relative group">
                    <button className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200">
                      + Footer ▾
                    </button>
                    <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border dark:border-gray-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                      {settings.footerLinks.map((section, idx) => (
                        <button
                          key={idx}
                          onClick={() => addPageToFooter(page, idx)}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
                        >
                          {section.title}
                        </button>
                      ))}
                    </div>
                  </div>
                  <a
                    href={`/admin/pages/${page.id}/edit`}
                    className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                  >
                    Edit
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Header Navigation</h3>
        <div className="space-y-4">
          {settings.navLinks.map((link, index) => (
            <div key={index} className="flex gap-2 items-center">
              <input
                type="text"
                value={link.label}
                onChange={(e) => {
                  const newLinks = [...settings.navLinks];
                  newLinks[index] = { ...link, label: e.target.value };
                  setSettings({ ...settings, navLinks: newLinks });
                }}
                placeholder="Label"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
              <input
                type="text"
                value={link.href}
                onChange={(e) => {
                  const newLinks = [...settings.navLinks];
                  newLinks[index] = { ...link, href: e.target.value };
                  setSettings({ ...settings, navLinks: newLinks });
                }}
                placeholder="URL (e.g. #features or /about)"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
              <button
                onClick={() => {
                  const newLinks = settings.navLinks.filter((_, i) => i !== index);
                  setSettings({ ...settings, navLinks: newLinks });
                }}
                className="p-2 text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              setSettings({
                ...settings,
                navLinks: [...settings.navLinks, { label: 'New Link', href: '#' }]
              });
            }}
            className="flex items-center gap-2 px-4 py-2 text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50"
          >
            <Plus className="w-4 h-4" /> Add Navigation Link
          </button>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Navigation Options</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Show Sign In Button</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Display the sign in link in navigation</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, showSignIn: !settings.showSignIn })}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.showSignIn ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showSignIn ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Show Get Started Button</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Display the main CTA button in navigation</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, showGetStarted: !settings.showGetStarted })}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.showGetStarted ? 'bg-primary-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.showGetStarted ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
        </div>
      </Card>
    </div>
    </div>
  );
}

// SEO Settings Tab
function SeoSettings({ settings, setSettings }: { settings: SiteSettings; setSettings: (s: SiteSettings) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meta Tags</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Title</label>
            <input
              type="text"
              value={settings.metaTitle}
              onChange={(e) => setSettings({ ...settings, metaTitle: e.target.value })}
              placeholder="Page title for search engines"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 mt-1">{settings.metaTitle.length}/60 characters recommended</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Description</label>
            <textarea
              rows={3}
              value={settings.metaDescription}
              onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })}
              placeholder="Description for search engines"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
            <p className="text-xs text-gray-500 mt-1">{settings.metaDescription.length}/160 characters recommended</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Meta Keywords</label>
            <input
              type="text"
              value={settings.metaKeywords}
              onChange={(e) => setSettings({ ...settings, metaKeywords: e.target.value })}
              placeholder="payment gateway, mobile money, sierra leone"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Social Sharing</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OG Image URL</label>
            <input
              type="url"
              value={settings.ogImage}
              onChange={(e) => setSettings({ ...settings, ogImage: e.target.value })}
              placeholder="https://... (1200x630 recommended)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
            />
          </div>
          {settings.ogImage && (
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Preview:</p>
              <img src={settings.ogImage} alt="OG Preview" className="max-w-full h-32 object-cover rounded" />
            </div>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mt-6 mb-4">Analytics</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Google Analytics ID</label>
          <input
            type="text"
            value={settings.googleAnalyticsId}
            onChange={(e) => setSettings({ ...settings, googleAnalyticsId: e.target.value })}
            placeholder="G-XXXXXXXXXX"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
          />
        </div>
      </Card>
    </div>
  );
}

// Advanced Settings Tab
function AdvancedSettings({ settings, setSettings }: { settings: SiteSettings; setSettings: (s: SiteSettings) => void }) {
  const timeoutPresets = [
    { value: 0, label: 'Disabled' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
    { value: 480, label: '8 hours' },
    { value: 1440, label: '24 hours' },
  ];

  return (
    <div className="space-y-6">
      {/* Session Timeout Settings */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Session Timeout</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Automatically log out all users (including admins) after a period of inactivity. This applies to everyone in the system.
        </p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Auto-logout after inactivity
            </label>
            <div className="flex gap-3 items-center">
              <select
                value={settings.sessionTimeoutMinutes}
                onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: parseInt(e.target.value) })}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {timeoutPresets.map((preset) => (
                  <option key={preset.value} value={preset.value}>
                    {preset.label}
                  </option>
                ))}
              </select>
              <span className="text-gray-500 dark:text-gray-400">or</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="10080"
                  value={settings.sessionTimeoutMinutes}
                  onChange={(e) => setSettings({ ...settings, sessionTimeoutMinutes: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  placeholder="0"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">minutes</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {settings.sessionTimeoutMinutes === 0
                ? 'Session timeout is disabled. Users will not be automatically logged out.'
                : `Users will be logged out after ${settings.sessionTimeoutMinutes} minute${settings.sessionTimeoutMinutes !== 1 ? 's' : ''} of inactivity.`}
            </p>
          </div>

          {settings.sessionTimeoutMinutes > 0 && settings.sessionTimeoutMinutes < 5 && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm">
              Warning: Very short timeout periods may frustrate users. Consider using at least 5 minutes.
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Maintenance Mode</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div>
              <p className="font-medium text-yellow-800 dark:text-yellow-300">Enable Maintenance Mode</p>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">When enabled, visitors will see a maintenance message</p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.maintenanceMode ? 'bg-yellow-600' : 'bg-gray-300'}`}
            >
              <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.maintenanceMode ? 'left-7' : 'left-1'}`} />
            </button>
          </div>
          {settings.maintenanceMode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Maintenance Message</label>
              <textarea
                rows={3}
                value={settings.maintenanceMessage}
                onChange={(e) => setSettings({ ...settings, maintenanceMessage: e.target.value })}
                placeholder="We're currently performing scheduled maintenance. Please check back soon."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800"
              />
            </div>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Custom Scripts</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Head Scripts
              <span className="text-xs text-gray-500 ml-2">(Added before &lt;/head&gt;)</span>
            </label>
            <textarea
              rows={5}
              value={settings.customHeadScripts}
              onChange={(e) => setSettings({ ...settings, customHeadScripts: e.target.value })}
              placeholder="<!-- Add tracking scripts, meta tags, etc. -->"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Custom Body Scripts
              <span className="text-xs text-gray-500 ml-2">(Added before &lt;/body&gt;)</span>
            </label>
            <textarea
              rows={5}
              value={settings.customBodyScripts}
              onChange={(e) => setSettings({ ...settings, customBodyScripts: e.target.value })}
              placeholder="<!-- Add chat widgets, analytics scripts, etc. -->"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 font-mono text-sm"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
