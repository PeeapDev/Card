import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Authorization } from '@payment-system/database';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class AuthorizationsService {
  private readonly logger = new Logger(AuthorizationsService.name);

  constructor(
    @InjectRepository(Authorization)
    private readonly authorizationRepository: Repository<Authorization>,
  ) {}

  async createAuthorization(data: {
    transactionId: string;
    walletId: string;
    amount: number;
    expiresAt: Date;
  }): Promise<Authorization> {
    const auth = this.authorizationRepository.create({
      transactionId: data.transactionId,
      walletId: data.walletId,
      amount: data.amount,
      remainingAmount: data.amount,
      expiresAt: data.expiresAt,
      status: 'ACTIVE',
    });

    await this.authorizationRepository.save(auth);
    return auth;
  }

  async getActiveAuthorization(transactionId: string): Promise<Authorization | null> {
    return this.authorizationRepository.findOne({
      where: { transactionId, status: 'ACTIVE' },
    });
  }

  async captureAuthorization(
    transactionId: string,
    amount: number,
  ): Promise<void> {
    const auth = await this.getActiveAuthorization(transactionId);
    if (!auth) return;

    auth.capturedAmount = (Number(auth.capturedAmount) || 0) + amount;
    auth.remainingAmount = Number(auth.amount) - Number(auth.capturedAmount);

    if (auth.remainingAmount <= 0) {
      auth.status = 'CAPTURED';
    }

    await this.authorizationRepository.save(auth);
  }

  async voidAuthorization(transactionId: string): Promise<void> {
    const auth = await this.getActiveAuthorization(transactionId);
    if (!auth) return;

    auth.status = 'VOIDED';
    await this.authorizationRepository.save(auth);
  }

  async expireAuthorization(transactionId: string): Promise<void> {
    const auth = await this.getActiveAuthorization(transactionId);
    if (!auth) return;

    auth.status = 'EXPIRED';
    await this.authorizationRepository.save(auth);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredAuthorizations(): Promise<void> {
    const result = await this.authorizationRepository.update(
      {
        status: 'ACTIVE',
        expiresAt: LessThan(new Date()),
      },
      {
        status: 'EXPIRED',
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} authorizations`);
    }
  }
}
