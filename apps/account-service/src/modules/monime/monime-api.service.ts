import { Injectable, Logger, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { SettingsService } from '../settings/settings.service';

interface MonimeCredentials {
  accessToken: string;
  spaceId: string;
}

@Injectable()
export class MonimeApiService {
  private readonly logger = new Logger(MonimeApiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService,
  ) {
    this.baseUrl = this.configService.get<string>('MONIME_API_URL', 'https://api.monime.io');
  }

  private async getCredentials(): Promise<MonimeCredentials> {
    const config = await this.settingsService.getMonimeConfig();
    return {
      accessToken: config.accessToken || '',
      spaceId: config.spaceId || '',
    };
  }

  private getHeaders(credentials: MonimeCredentials, idempotencyKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${credentials.accessToken}`,
      'Content-Type': 'application/json',
      'Monime-Space-Id': credentials.spaceId,
    };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return headers;
  }

  private async request<T>(method: string, endpoint: string, body?: any, idempotencyKey?: string): Promise<T> {
    const credentials = await this.getCredentials();
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: this.getHeaders(credentials, idempotencyKey),
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!response.ok) throw new HttpException(data, response.status);
    return data as T;
  }

  async createCheckoutSession(request: any, idempotencyKey?: string) {
    return this.request('POST', '/v1/checkout-sessions', request, idempotencyKey || uuidv4());
  }

  async getCheckoutSession(sessionId: string) {
    return this.request('GET', `/v1/checkout-sessions/${sessionId}`);
  }

  async createPaymentCode(request: any, idempotencyKey?: string) {
    return this.request('POST', '/v1/payment-codes', request, idempotencyKey || uuidv4());
  }

  async getPaymentCode(codeId: string) {
    return this.request('GET', `/v1/payment-codes/${codeId}`);
  }

  async createInternalTransfer(request: any, idempotencyKey?: string) {
    return this.request('POST', '/v1/internal-transfers', request, idempotencyKey || uuidv4());
  }

  async getInternalTransfer(transferId: string) {
    return this.request('GET', `/v1/internal-transfers/${transferId}`);
  }

  async listBanks(country: string = 'SL') {
    return this.request('GET', `/v1/banks?country=${country}&limit=50`);
  }

  async getPayment(paymentId: string) {
    return this.request('GET', `/v1/payments/${paymentId}`);
  }

  async isTestMode(): Promise<boolean> {
    const credentials = await this.getCredentials();
    return credentials.accessToken.startsWith('mon_test_');
  }
}
