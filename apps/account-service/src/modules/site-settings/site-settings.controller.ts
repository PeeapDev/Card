import { Controller, Get, Put, Body, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { SiteSettingsService } from './site-settings.service';

// DTO Classes for nested objects
class SocialLinksDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  facebook?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  youtube?: string;
}

class FeatureDto {
  @ApiProperty()
  @IsString()
  icon: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  gradient: string;
}

class PaymentMethodDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  providers: string[];

  @ApiProperty()
  @IsString()
  icon: string;

  @ApiProperty()
  @IsString()
  color: string;

  @ApiProperty()
  @IsBoolean()
  enabled: boolean;
}

class PricingTierDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsString()
  fee: string;

  @ApiProperty()
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty()
  @IsString()
  cta: string;

  @ApiProperty()
  @IsString()
  ctaLink: string;

  @ApiProperty()
  @IsBoolean()
  highlighted: boolean;
}

class StatDto {
  @ApiProperty()
  value: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  prefix?: string;

  @ApiProperty()
  @IsString()
  suffix: string;

  @ApiProperty()
  @IsString()
  label: string;
}

class FooterLinkDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  href: string;
}

class FooterSectionDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty({ type: [FooterLinkDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterLinkDto)
  links: FooterLinkDto[];
}

class NavLinkDto {
  @ApiProperty()
  @IsString()
  label: string;

  @ApiProperty()
  @IsString()
  href: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isExternal?: boolean;
}

// Main Update DTO
class UpdateSiteSettingsDto {
  // General Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  siteName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  siteTagline?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  siteDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  logoUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  faviconUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactEmail?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ required: false, type: SocialLinksDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialLinksDto)
  socialLinks?: SocialLinksDto;

  // Theme Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  primaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  secondaryColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  accentColor?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  darkModeEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customCss?: string;

  // Hero Section
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroBadgeText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroTitleHighlight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroSubtitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroCtaPrimaryText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroCtaPrimaryLink?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroCtaSecondaryText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroCtaSecondaryLink?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  heroBackgroundImage?: string;

  // Features Section
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  featuresTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  featuresTitleHighlight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  featuresSubtitle?: string;

  @ApiProperty({ required: false, type: [FeatureDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeatureDto)
  featuresList?: FeatureDto[];

  // Payment Methods
  @ApiProperty({ required: false, type: [PaymentMethodDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaymentMethodDto)
  paymentMethods?: PaymentMethodDto[];

  // Pricing Section
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pricingTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pricingTitleHighlight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pricingSubtitle?: string;

  @ApiProperty({ required: false, type: [PricingTierDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingTierDto)
  pricingTiers?: PricingTierDto[];

  // Stats Section
  @ApiProperty({ required: false, type: [StatDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StatDto)
  stats?: StatDto[];

  // CTA Section
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ctaTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ctaTitleHighlight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ctaSubtitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ctaButtonText?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ctaButtonLink?: string;

  // Footer Section
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  footerDescription?: string;

  @ApiProperty({ required: false, type: [FooterSectionDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FooterSectionDto)
  footerLinks?: FooterSectionDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  footerCopyright?: string;

  // Navigation
  @ApiProperty({ required: false, type: [NavLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NavLinkDto)
  navLinks?: NavLinkDto[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showSignIn?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  showGetStarted?: boolean;

  // Integration Section
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  integrationTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  integrationTitleHighlight?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  integrationSubtitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  integrationFeatures?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sdkCodeExample?: string;

  // SEO Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  metaKeywords?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  ogImage?: string;

  // Misc Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  maintenanceMessage?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  googleAnalyticsId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customHeadScripts?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customBodyScripts?: string;
}

@ApiTags('Site Settings')
@Controller('site-settings')
export class SiteSettingsController {
  constructor(private readonly siteSettingsService: SiteSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all site settings (admin)' })
  @ApiResponse({ status: 200, description: 'Site settings returned' })
  async getSettings() {
    const settings = await this.siteSettingsService.getSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Get('public')
  @ApiOperation({ summary: 'Get public site settings (for landing page)' })
  @ApiResponse({ status: 200, description: 'Public site settings returned' })
  async getPublicSettings() {
    const settings = await this.siteSettingsService.getPublicSettings();
    return {
      success: true,
      data: settings,
    };
  }

  @Put()
  @HttpCode(200)
  @ApiOperation({ summary: 'Update site settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@Body() dto: UpdateSiteSettingsDto) {
    const settings = await this.siteSettingsService.updateSettings(dto);
    return {
      success: true,
      message: 'Site settings updated successfully',
      data: settings,
      updatedAt: settings.updatedAt,
    };
  }
}
