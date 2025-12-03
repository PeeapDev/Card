import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Authorization, AuthorizationStatus } from '@payment-system/database';
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
    amountAuthorized: number;
    currencyCode: string;
    expiresAt: Date;
  }): Promise<Authorization> {
    const auth = this.authorizationRepository.create({
      transactionId: data.transactionId,
      amountAuthorized: data.amountAuthorized,
      currencyCode: data.currencyCode,
      expiresAt: data.expiresAt,
      status: AuthorizationStatus.PENDING,
    });

    await this.authorizationRepository.save(auth);
    return auth;
  }

  async getActiveAuthorization(transactionId: string): Promise<Authorization | null> {
    return this.authorizationRepository.findOne({
      where: { transactionId, status: AuthorizationStatus.APPROVED },
    });
  }

  async captureAuthorization(
    transactionId: string,
    amount: number,
  ): Promise<void> {
    const auth = await this.getActiveAuthorization(transactionId);
    if (!auth) return;

    auth.amountCaptured = (Number(auth.amountCaptured) || 0) + amount;
    auth.capturedAt = new Date();

    if (auth.getRemainingCapturable() <= 0) {
      auth.status = AuthorizationStatus.CAPTURED;
    }

    await this.authorizationRepository.save(auth);
  }

  async voidAuthorization(transactionId: string): Promise<void> {
    const auth = await this.getActiveAuthorization(transactionId);
    if (!auth) return;

    auth.status = AuthorizationStatus.VOIDED;
    auth.voidedAt = new Date();
    await this.authorizationRepository.save(auth);
  }

  async expireAuthorization(transactionId: string): Promise<void> {
    const auth = await this.getActiveAuthorization(transactionId);
    if (!auth) return;

    auth.status = AuthorizationStatus.EXPIRED;
    await this.authorizationRepository.save(auth);
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredAuthorizations(): Promise<void> {
    const result = await this.authorizationRepository.update(
      {
        status: AuthorizationStatus.APPROVED,
        expiresAt: LessThan(new Date()),
      },
      {
        status: AuthorizationStatus.EXPIRED,
      },
    );

    if (result.affected && result.affected > 0) {
      this.logger.log(`Expired ${result.affected} authorizations`);
    }
  }
}
