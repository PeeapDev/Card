import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { CheckoutSession } from '@payment-system/database';
import { firstValueFrom, timeout } from 'rxjs';
import * as crypto from 'crypto';

interface CreateCheckoutDto {
  merchantId: string;
  amount: number;
  currency: string;
  description?: string;
  successUrl: string;
  cancelUrl: string;
  metadata?: Record<string, any>;
  // Merchant branding
  merchantName?: string;
  merchantLogoUrl?: string;
  brandColor?: string;
  // Payment methods
  paymentMethods?: {
    qr?: boolean;
    card?: boolean;
    mobile?: boolean;
  };
}

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    @InjectRepository(CheckoutSession)
    private readonly sessionRepository: Repository<CheckoutSession>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createSession(dto: CreateCheckoutDto): Promise<CheckoutSession> {
    const externalId = `cs_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const session = this.sessionRepository.create({
      externalId,
      merchantId: dto.merchantId,
      amount: dto.amount,
      currencyCode: dto.currency,
      description: dto.description,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      status: 'OPEN',
      expiresAt,
      metadata: dto.metadata,
      // Branding
      merchantName: dto.merchantName,
      merchantLogoUrl: dto.merchantLogoUrl,
      brandColor: dto.brandColor || '#4F46E5', // Default indigo
      // Payment methods (default to all enabled)
      paymentMethods: dto.paymentMethods || { qr: true, card: true, mobile: true },
    });

    await this.sessionRepository.save(session);
    this.logger.log(`Checkout session created: ${externalId}`);

    return session;
  }

  async getSession(sessionId: string): Promise<CheckoutSession> {
    // Support both UUID (id) and external ID (externalId) lookups
    const session = await this.sessionRepository.findOne({
      where: [
        { id: sessionId },
        { externalId: sessionId }
      ]
    });
    if (!session) throw new NotFoundException('Checkout session not found');
    return session;
  }

  async completeSession(sessionId: string, cardToken: string): Promise<CheckoutSession> {
    const session = await this.getSession(sessionId);

    if (session.status !== 'OPEN') {
      throw new BadRequestException('Session is not open');
    }

    if (session.expiresAt < new Date()) {
      session.status = 'EXPIRED';
      await this.sessionRepository.save(session);
      throw new BadRequestException('Session expired');
    }

    // Call transaction service to authorize
    const transactionServiceUrl = this.configService.get(
      'TRANSACTION_SERVICE_URL',
      'http://localhost:3004',
    );

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${transactionServiceUrl}/transactions/authorize`, {
          cardToken,
          amount: session.amount,
          currency: session.currencyCode,
          merchantId: session.merchantId,
          entryMode: 'ECOMMERCE',
          description: session.description,
        }).pipe(timeout(10000)),
      );

      if (response.data.status === 'AUTHORIZED') {
        session.status = 'COMPLETE';
        session.transactionId = response.data.transactionId;
        session.completedAt = new Date();

        // Auto-capture for checkout
        await firstValueFrom(
          this.httpService.post(
            `${transactionServiceUrl}/transactions/${response.data.transactionId}/capture`,
            {},
          ).pipe(timeout(10000)),
        );
      } else {
        session.status = 'CANCELLED';
      }
    } catch (error: any) {
      session.status = 'CANCELLED';
    }

    await this.sessionRepository.save(session);
    return session;
  }

  async expireSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    session.status = 'EXPIRED';
    await this.sessionRepository.save(session);
  }
}
