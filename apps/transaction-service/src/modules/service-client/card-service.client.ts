import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError, timeout } from 'rxjs';

interface CardVerifyResult {
  valid: boolean;
  card?: {
    id: string;
    walletId: string;
    userId: string;
    lastFour: string;
    status: string;
  };
  reason?: string;
}

@Injectable()
export class CardServiceClient {
  private readonly logger = new Logger(CardServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('CARD_SERVICE_URL', 'http://localhost:3003');
  }

  async verifyCard(
    cardToken: string,
    amount: number,
  ): Promise<CardVerifyResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/cards/verify`, {
          cardToken,
          amount,
          checkExpiry: true,
          checkStatus: true,
          checkLimits: true,
        }).pipe(
          timeout(5000),
          catchError(error => {
            this.logger.error(`Card verification failed: ${error.message}`);
            throw error;
          }),
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Card service error: ${error}`);
      return { valid: false, reason: 'Card service unavailable' };
    }
  }

  async recordSpend(cardId: string, amount: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/cards/${cardId}/spend`, {
          amount,
        }).pipe(timeout(5000)),
      );
    } catch (error) {
      this.logger.error(`Failed to record spend: ${error}`);
    }
  }

  async reverseSpend(cardId: string, amount: number): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/cards/${cardId}/reverse-spend`, {
          amount,
        }).pipe(timeout(5000)),
      );
    } catch (error) {
      this.logger.error(`Failed to reverse spend: ${error}`);
    }
  }
}
