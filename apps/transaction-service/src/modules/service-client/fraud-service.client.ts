import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, catchError, timeout } from 'rxjs';

interface FraudCheckRequest {
  transactionId: string;
  cardToken: string;
  amount: number;
  currency: string;
  merchantId: string;
  merchantMcc?: string;
  entryMode: string;
  ipAddress?: string;
  deviceId?: string;
  userId?: string;
}

interface FraudCheckResult {
  decision: 'APPROVE' | 'DECLINE' | 'REVIEW';
  riskScore: number;
  triggeredRules: string[];
  processingTimeMs: number;
}

@Injectable()
export class FraudServiceClient {
  private readonly logger = new Logger(FraudServiceClient.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get('FRAUD_SERVICE_URL', 'http://localhost:3005');
  }

  async checkTransaction(request: FraudCheckRequest): Promise<FraudCheckResult> {
    try {
      const response = await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/fraud/check`, request).pipe(
          timeout(3000), // Fraud check should be fast
          catchError(error => {
            this.logger.error(`Fraud check failed: ${error.message}`);
            throw error;
          }),
        ),
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Fraud service error: ${error}`);
      // Default to approve on fraud service failure (configurable)
      return {
        decision: 'APPROVE',
        riskScore: 0,
        triggeredRules: ['FRAUD_SERVICE_UNAVAILABLE'],
        processingTimeMs: 0,
      };
    }
  }

  async reportTransaction(
    transactionId: string,
    outcome: 'FRAUD' | 'LEGITIMATE' | 'CHARGEBACK',
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.httpService.post(`${this.baseUrl}/fraud/report`, {
          transactionId,
          outcome,
          reportedAt: new Date(),
        }).pipe(timeout(5000)),
      );
    } catch (error) {
      this.logger.error(`Fraud report failed: ${error}`);
    }
  }
}
