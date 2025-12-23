import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SiteSettings } from '@payment-system/database';

const DEFAULT_SETTINGS_ID = '00000000-0000-0000-0000-000000000002';

@Injectable()
export class SiteSettingsService {
  private readonly logger = new Logger(SiteSettingsService.name);

  constructor(
    @InjectRepository(SiteSettings)
    private readonly siteSettingsRepository: Repository<SiteSettings>,
  ) {}

  async getSettings(): Promise<SiteSettings> {
    let settings = await this.siteSettingsRepository.findOne({
      where: { id: DEFAULT_SETTINGS_ID },
    });

    if (!settings) {
      // Create default settings if not exists
      settings = this.siteSettingsRepository.create({
        id: DEFAULT_SETTINGS_ID,
        siteName: 'Peeap',
        siteTagline: 'Sierra Leone\'s #1 Payment Gateway',
        primaryColor: '#4F46E5',
        secondaryColor: '#9333EA',
        accentColor: '#EC4899',
      });
      await this.siteSettingsRepository.save(settings);
      this.logger.log('Created default site settings');
    }

    return settings;
  }

  async updateSettings(updates: Partial<SiteSettings>): Promise<SiteSettings> {
    let settings = await this.getSettings();

    // Update fields
    Object.assign(settings, updates);

    settings = await this.siteSettingsRepository.save(settings);
    this.logger.log('Site settings updated');

    return settings;
  }

  async getPublicSettings(): Promise<Partial<SiteSettings>> {
    const settings = await this.getSettings();

    // Return only public-facing settings (exclude sensitive fields)
    return {
      siteName: settings.siteName,
      siteTagline: settings.siteTagline,
      siteDescription: settings.siteDescription,
      logoUrl: settings.logoUrl,
      faviconUrl: settings.faviconUrl,
      contactEmail: settings.contactEmail,
      contactPhone: settings.contactPhone,
      address: settings.address,
      socialLinks: settings.socialLinks,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      darkModeEnabled: settings.darkModeEnabled,
      customCss: settings.customCss,
      heroBadgeText: settings.heroBadgeText,
      heroTitle: settings.heroTitle,
      heroTitleHighlight: settings.heroTitleHighlight,
      heroSubtitle: settings.heroSubtitle,
      heroCtaPrimaryText: settings.heroCtaPrimaryText,
      heroCtaPrimaryLink: settings.heroCtaPrimaryLink,
      heroCtaSecondaryText: settings.heroCtaSecondaryText,
      heroCtaSecondaryLink: settings.heroCtaSecondaryLink,
      heroBackgroundImage: settings.heroBackgroundImage,
      featuresTitle: settings.featuresTitle,
      featuresTitleHighlight: settings.featuresTitleHighlight,
      featuresSubtitle: settings.featuresSubtitle,
      featuresList: settings.featuresList,
      paymentMethods: settings.paymentMethods,
      pricingTitle: settings.pricingTitle,
      pricingTitleHighlight: settings.pricingTitleHighlight,
      pricingSubtitle: settings.pricingSubtitle,
      pricingTiers: settings.pricingTiers,
      stats: settings.stats,
      ctaTitle: settings.ctaTitle,
      ctaTitleHighlight: settings.ctaTitleHighlight,
      ctaSubtitle: settings.ctaSubtitle,
      ctaButtonText: settings.ctaButtonText,
      ctaButtonLink: settings.ctaButtonLink,
      footerDescription: settings.footerDescription,
      footerLinks: settings.footerLinks,
      footerCopyright: settings.footerCopyright,
      navLinks: settings.navLinks,
      showSignIn: settings.showSignIn,
      showGetStarted: settings.showGetStarted,
      integrationTitle: settings.integrationTitle,
      integrationTitleHighlight: settings.integrationTitleHighlight,
      integrationSubtitle: settings.integrationSubtitle,
      integrationFeatures: settings.integrationFeatures,
      sdkCodeExample: settings.sdkCodeExample,
      metaTitle: settings.metaTitle,
      metaDescription: settings.metaDescription,
      metaKeywords: settings.metaKeywords,
      ogImage: settings.ogImage,
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
    };
  }
}
