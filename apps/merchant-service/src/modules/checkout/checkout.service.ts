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
    const sessionId = `cs_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const session = this.sessionRepository.create({
      id: sessionId,
      merchantId: dto.merchantId,
      amount: dto.amount,
      currency: dto.currency,
      description: dto.description,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      status: 'PENDING',
      expiresAt,
      metadata: dto.metadata,
    });

    await this.sessionRepository.save(session);
    this.logger.log(`Checkout session created: ${sessionId}`);

    return session;
  }

  async getSession(sessionId: string): Promise<CheckoutSession> {
    const session = await this.sessionRepository.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException('Checkout session not found');
    return session;
  }

  async completeSession(sessionId: string, cardToken: string): Promise<CheckoutSession> {
    const session = await this.getSession(sessionId);

    if (session.status !== 'PENDING') {
      throw new BadRequestException('Session is not pending');
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
          currency: session.currency,
          merchantId: session.merchantId,
          entryMode: 'ECOMMERCE',
          description: session.description,
        }).pipe(timeout(10000)),
      );

      if (response.data.status === 'AUTHORIZED') {
        session.status = 'COMPLETED';
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
        session.status = 'FAILED';
        session.failureReason = response.data.message;
      }
    } catch (error: any) {
      session.status = 'FAILED';
      session.failureReason = error.message;
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
