import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError, timeout } from 'rxjs';

@Injectable()
export class AccountServiceClient {
  private readonly logger = new Logger(AccountServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('ACCOUNT_SERVICE_URL', 'http://localhost:3002');
  }

  async holdFunds(
    walletId: string,
    amount: number,
    transactionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/wallets/${walletId}/hold`, {
          amount,
          transactionId,
        }).pipe(
          timeout(5000),
          catchError(error => {
            throw error;
          }),
        ),
      );

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      this.logger.error(`Hold funds failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async releaseHold(
    walletId: string,
    amount: number,
    transactionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/wallets/${walletId}/release-hold`, {
          amount,
          transactionId,
        }).pipe(timeout(5000)),
      );

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      this.logger.error(`Release hold failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async captureHold(
    walletId: string,
    amount: number,
    transactionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/wallets/${walletId}/capture`, {
          amount,
          transactionId,
        }).pipe(timeout(5000)),
      );

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      this.logger.error(`Capture failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async refund(
    walletId: string,
    amount: number,
    transactionId: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/wallets/${walletId}/refund`, {
          amount,
          transactionId,
        }).pipe(timeout(5000)),
      );

      return { success: true };
    } catch (error: any) {
      const message = error.response?.data?.message || error.message;
      this.logger.error(`Refund failed: ${message}`);
      return { success: false, error: message };
    }
  }

  async recordLedgerCapture(
    walletId: string,
    merchantId: string,
    transactionId: string,
    amount: number,
    feeAmount: number,
    currency: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/ledger/capture`, {
          walletId,
          merchantId,
          transactionId,
          amount,
          feeAmount,
          currency,
        }).pipe(timeout(5000)),
      );
    } catch (error) {
      this.logger.error(`Ledger capture failed: ${error}`);
    }
  }

  async recordLedgerRefund(
    walletId: string,
    merchantId: string,
    transactionId: string,
    amount: number,
    currency: string,
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/ledger/refund`, {
          walletId,
          merchantId,
          transactionId,
          amount,
          currency,
        }).pipe(timeout(5000)),
      );
    } catch (error) {
      this.logger.error(`Ledger refund failed: ${error}`);
    }
  }
}
