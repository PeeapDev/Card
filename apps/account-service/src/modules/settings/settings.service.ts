import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentSettings } from '@payment-system/database';

const DEFAULT_SETTINGS_ID = '00000000-0000-0000-0000-000000000001';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);

  constructor(
    @InjectRepository(PaymentSettings)
    private readonly settingsRepository: Repository<PaymentSettings>,
  ) {}

  async getSettings(): Promise<PaymentSettings> {
    let settings = await this.settingsRepository.findOne({
      where: { id: DEFAULT_SETTINGS_ID },
    });

    if (!settings) {
      // Create default settings if not exists
      settings = this.settingsRepository.create({
        id: DEFAULT_SETTINGS_ID,
      });
      await this.settingsRepository.save(settings);
    }

    return settings;
  }

  async updateSettings(updates: Partial<PaymentSettings>): Promise<PaymentSettings> {
    let settings = await this.getSettings();

    // Update fields
    Object.assign(settings, updates);

    settings = await this.settingsRepository.save(settings);
    this.logger.log('Payment settings updated');

    return settings;
  }

  async getMonimeConfig() {
    const settings = await this.getSettings();
    return {
      accessToken: settings.monimeAccessToken,
      spaceId: settings.monimeSpaceId,
      webhookSecret: settings.monimeWebhookSecret,
      sourceAccountId: settings.monimeSourceAccountId,
      payoutAccountId: settings.monimePayoutAccountId,
      isEnabled: settings.monimeEnabled,
      successUrl: settings.monimeSuccessUrl,
      cancelUrl: settings.monimeCancelUrl,
      backendUrl: settings.backendUrl,
      frontendUrl: settings.frontendUrl,
    };
  }
}
