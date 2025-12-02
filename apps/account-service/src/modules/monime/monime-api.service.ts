import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MonimeApiService {
  private readonly logger = new Logger(MonimeApiService.name);
  private readonly baseUrl: string;
  private readonly accessToken: string;
  private readonly spaceId: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('MONIME_API_URL', 'https://api.monime.io');
    this.accessToken = this.configService.get<string>('MONIME_ACCESS_TOKEN', '');
    this.spaceId = this.configService.get<string>('MONIME_SPACE_ID', '');
  }

  private getHeaders(idempotencyKey?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
      'Monime-Space-Id': this.spaceId,
    };
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
    return headers;
  }

  private async request<T>(method: string, endpoint: string, body?: any, idempotencyKey?: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: this.getHeaders(idempotencyKey),
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

  isTestMode(): boolean {
    return this.accessToken.startsWith('mon_test_');
  }
}
