import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('site_settings')
export class SiteSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // === GENERAL SETTINGS ===
  @Column({ name: 'site_name', type: 'varchar', length: 255, default: 'Peeap' })
  siteName: string;

  @Column({ name: 'site_tagline', type: 'varchar', length: 500, nullable: true })
  siteTagline: string;

  @Column({ name: 'site_description', type: 'text', nullable: true })
  siteDescription: string;

  @Column({ name: 'logo_url', type: 'varchar', length: 500, nullable: true })
  logoUrl: string;

  @Column({ name: 'favicon_url', type: 'varchar', length: 500, nullable: true })
  faviconUrl: string;

  @Column({ name: 'contact_email', type: 'varchar', length: 255, nullable: true })
  contactEmail: string;

  @Column({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true })
  contactPhone: string;

  @Column({ name: 'address', type: 'text', nullable: true })
  address: string;

  @Column({ name: 'social_links', type: 'jsonb', nullable: true })
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    youtube?: string;
  };

  // === THEME SETTINGS ===
  @Column({ name: 'primary_color', type: 'varchar', length: 20, default: '#4F46E5' })
  primaryColor: string;

  @Column({ name: 'secondary_color', type: 'varchar', length: 20, default: '#9333EA' })
  secondaryColor: string;

  @Column({ name: 'accent_color', type: 'varchar', length: 20, default: '#EC4899' })
  accentColor: string;

  @Column({ name: 'dark_mode_enabled', type: 'boolean', default: true })
  darkModeEnabled: boolean;

  @Column({ name: 'custom_css', type: 'text', nullable: true })
  customCss: string;

  // === HERO SECTION ===
  @Column({ name: 'hero_badge_text', type: 'varchar', length: 255, default: "Sierra Leone's #1 Payment Gateway" })
  heroBadgeText: string;

  @Column({ name: 'hero_title', type: 'varchar', length: 255, default: 'Accept Payments' })
  heroTitle: string;

  @Column({ name: 'hero_title_highlight', type: 'varchar', length: 255, default: 'Anywhere' })
  heroTitleHighlight: string;

  @Column({ name: 'hero_subtitle', type: 'text', nullable: true })
  heroSubtitle: string;

  @Column({ name: 'hero_cta_primary_text', type: 'varchar', length: 100, default: 'Create Merchant Account' })
  heroCtaPrimaryText: string;

  @Column({ name: 'hero_cta_primary_link', type: 'varchar', length: 255, default: '/register' })
  heroCtaPrimaryLink: string;

  @Column({ name: 'hero_cta_secondary_text', type: 'varchar', length: 100, default: 'Watch Demo' })
  heroCtaSecondaryText: string;

  @Column({ name: 'hero_cta_secondary_link', type: 'varchar', length: 255, default: '/register?type=agent' })
  heroCtaSecondaryLink: string;

  @Column({ name: 'hero_background_image', type: 'varchar', length: 500, nullable: true })
  heroBackgroundImage: string;

  // === FEATURES SECTION ===
  @Column({ name: 'features_title', type: 'varchar', length: 255, default: 'Everything You Need to' })
  featuresTitle: string;

  @Column({ name: 'features_title_highlight', type: 'varchar', length: 255, default: 'Accept Payments' })
  featuresTitleHighlight: string;

  @Column({ name: 'features_subtitle', type: 'text', nullable: true })
  featuresSubtitle: string;

  @Column({ name: 'features_list', type: 'jsonb', nullable: true })
  featuresList: Array<{
    icon: string;
    title: string;
    description: string;
    gradient: string;
  }>;

  // === PAYMENT METHODS ===
  @Column({ name: 'payment_methods', type: 'jsonb', nullable: true })
  paymentMethods: Array<{
    name: string;
    providers: string[];
    icon: string;
    color: string;
    enabled: boolean;
  }>;

  // === PRICING SECTION ===
  @Column({ name: 'pricing_title', type: 'varchar', length: 255, default: 'Simple, Transparent' })
  pricingTitle: string;

  @Column({ name: 'pricing_title_highlight', type: 'varchar', length: 255, default: 'Pricing' })
  pricingTitleHighlight: string;

  @Column({ name: 'pricing_subtitle', type: 'text', nullable: true })
  pricingSubtitle: string;

  @Column({ name: 'pricing_tiers', type: 'jsonb', nullable: true })
  pricingTiers: Array<{
    name: string;
    description: string;
    fee: string;
    features: string[];
    cta: string;
    ctaLink: string;
    highlighted: boolean;
  }>;

  // === STATS SECTION ===
  @Column({ name: 'stats', type: 'jsonb', nullable: true })
  stats: Array<{
    value: number;
    prefix?: string;
    suffix: string;
    label: string;
  }>;

  // === CTA SECTION ===
  @Column({ name: 'cta_title', type: 'varchar', length: 255, default: 'Ready to Start' })
  ctaTitle: string;

  @Column({ name: 'cta_title_highlight', type: 'varchar', length: 255, default: 'Accepting Payments?' })
  ctaTitleHighlight: string;

  @Column({ name: 'cta_subtitle', type: 'text', nullable: true })
  ctaSubtitle: string;

  @Column({ name: 'cta_button_text', type: 'varchar', length: 100, default: 'Create Free Account' })
  ctaButtonText: string;

  @Column({ name: 'cta_button_link', type: 'varchar', length: 255, default: '/register' })
  ctaButtonLink: string;

  // === FOOTER SECTION ===
  @Column({ name: 'footer_description', type: 'text', nullable: true })
  footerDescription: string;

  @Column({ name: 'footer_links', type: 'jsonb', nullable: true })
  footerLinks: Array<{
    title: string;
    links: Array<{ name: string; href: string }>;
  }>;

  @Column({ name: 'footer_copyright', type: 'varchar', length: 255, default: '2025 Peeap. All rights reserved.' })
  footerCopyright: string;

  // === NAVIGATION MENU ===
  @Column({ name: 'nav_links', type: 'jsonb', nullable: true })
  navLinks: Array<{
    label: string;
    href: string;
    isExternal?: boolean;
  }>;

  @Column({ name: 'show_sign_in', type: 'boolean', default: true })
  showSignIn: boolean;

  @Column({ name: 'show_get_started', type: 'boolean', default: true })
  showGetStarted: boolean;

  // === INTEGRATION SECTION ===
  @Column({ name: 'integration_title', type: 'varchar', length: 255, default: 'Integrate in' })
  integrationTitle: string;

  @Column({ name: 'integration_title_highlight', type: 'varchar', length: 255, default: 'Minutes' })
  integrationTitleHighlight: string;

  @Column({ name: 'integration_subtitle', type: 'text', nullable: true })
  integrationSubtitle: string;

  @Column({ name: 'integration_features', type: 'jsonb', nullable: true })
  integrationFeatures: string[];

  @Column({ name: 'sdk_code_example', type: 'text', nullable: true })
  sdkCodeExample: string;

  // === SEO SETTINGS ===
  @Column({ name: 'meta_title', type: 'varchar', length: 255, nullable: true })
  metaTitle: string;

  @Column({ name: 'meta_description', type: 'text', nullable: true })
  metaDescription: string;

  @Column({ name: 'meta_keywords', type: 'text', nullable: true })
  metaKeywords: string;

  @Column({ name: 'og_image', type: 'varchar', length: 500, nullable: true })
  ogImage: string;

  // === MISC SETTINGS ===
  @Column({ name: 'maintenance_mode', type: 'boolean', default: false })
  maintenanceMode: boolean;

  @Column({ name: 'maintenance_message', type: 'text', nullable: true })
  maintenanceMessage: string;

  @Column({ name: 'google_analytics_id', type: 'varchar', length: 50, nullable: true })
  googleAnalyticsId: string;

  @Column({ name: 'custom_head_scripts', type: 'text', nullable: true })
  customHeadScripts: string;

  @Column({ name: 'custom_body_scripts', type: 'text', nullable: true })
  customBodyScripts: string;

  // === SESSION SETTINGS ===
  @Column({ name: 'session_timeout_minutes', type: 'integer', default: 0 })
  sessionTimeoutMinutes: number; // 0 = disabled, otherwise timeout in minutes

  // Timestamps
  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  updatedAt: Date;
}
