import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SettlementBatch, SettlementBatchItem, SettlementBatchStatus, SettlementItemType } from '@payment-system/database';
import { firstValueFrom, timeout } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class SettlementService {
  private readonly logger = new Logger(SettlementService.name);

  constructor(
    @InjectRepository(SettlementBatch)
    private readonly batchRepository: Repository<SettlementBatch>,
    @InjectRepository(SettlementBatchItem)
    private readonly itemRepository: Repository<SettlementBatchItem>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Cron('0 2 * * *') // Run at 2 AM daily
  async runDailySettlement(): Promise<void> {
    this.logger.log('Starting daily settlement process');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    const endOfDay = new Date(yesterday);
    endOfDay.setHours(23, 59, 59, 999);

    await this.createSettlementBatches(yesterday, endOfDay);
  }

  async createSettlementBatches(periodStart: Date, periodEnd: Date): Promise<SettlementBatch[]> {
    // Fetch captured transactions from transaction service
    const transactionServiceUrl = this.configService.get(
      'TRANSACTION_SERVICE_URL',
      'http://localhost:3004',
    );

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${transactionServiceUrl}/transactions/for-settlement`, {
          params: { periodStart, periodEnd },
        }).pipe(timeout(30000)),
      );

      const transactions = response.data;

      // Group by merchant
      const merchantTransactions = new Map<string, any[]>();
      for (const tx of transactions) {
        if (!merchantTransactions.has(tx.merchantId)) {
          merchantTransactions.set(tx.merchantId, []);
        }
        merchantTransactions.get(tx.merchantId)!.push(tx);
      }

      const batches: SettlementBatch[] = [];

      for (const [merchantId, txs] of merchantTransactions) {
        const batch = await this.createBatch(merchantId, txs, periodStart, periodEnd);
        batches.push(batch);
      }

      return batches;
    } catch (error) {
      this.logger.error(`Failed to create settlement batches: ${error}`);
      return [];
    }
  }

  private async createBatch(
    merchantId: string,
    transactions: any[],
    periodStart: Date,
    periodEnd: Date,
  ): Promise<SettlementBatch> {
    const batchNumber = `STL-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    let grossAmount = 0;
    let refundAmount = 0;
    let feeAmount = 0;

    for (const tx of transactions) {
      if (tx.type === 'REFUND') {
        refundAmount += Number(tx.amount);
      } else {
        grossAmount += Number(tx.capturedAmount);
        feeAmount += Number(tx.feeAmount);
      }
    }

    const netAmount = grossAmount - refundAmount - feeAmount;

    const batch = this.batchRepository.create({
      batchNumber,
      merchantId,
      status: SettlementBatchStatus.PENDING,
      settlementDate: new Date(),
      periodStart,
      periodEnd,
      transactionCount: transactions.length,
      grossAmount,
      refundAmount,
      feeAmount,
      netAmount,
      currencyCode: 'USD',
    });

    await this.batchRepository.save(batch);

    // Create batch items
    for (const tx of transactions) {
      const item = this.itemRepository.create({
        batchId: batch.id,
        transactionId: tx.id,
        itemType: tx.type === 'REFUND' ? SettlementItemType.REFUND : SettlementItemType.PAYMENT,
        amount: tx.capturedAmount || tx.amount,
        feeAmount: tx.feeAmount || 0,
        netAmount: (tx.capturedAmount || tx.amount) - (tx.feeAmount || 0),
      });
      await this.itemRepository.save(item);
    }

    this.logger.log(`Settlement batch created: ${batchNumber} for merchant ${merchantId}`);

    return batch;
  }

  async processBatch(batchId: string): Promise<SettlementBatch> {
    const batch = await this.batchRepository.findOne({ where: { id: batchId } });
    if (!batch) throw new Error('Batch not found');

    batch.status = SettlementBatchStatus.PROCESSING;
    await this.batchRepository.save(batch);

    try {
      // Record in ledger
      const accountServiceUrl = this.configService.get('ACCOUNT_SERVICE_URL', 'http://localhost:3002');
      const payoutReference = `PAY-${Date.now()}`;

      await firstValueFrom(
        this.httpService.post(`${accountServiceUrl}/ledger/settlement`, {
          batchId: batch.id,
          merchantId: batch.merchantId,
          amount: batch.netAmount,
          currency: batch.currencyCode,
          payoutReference,
        }).pipe(timeout(10000)),
      );

      batch.status = SettlementBatchStatus.COMPLETED;
      batch.payoutReference = payoutReference;
      batch.processedAt = new Date();
    } catch (error: any) {
      batch.status = SettlementBatchStatus.FAILED;
      batch.failureReason = error.message;
    }

    await this.batchRepository.save(batch);
    return batch;
  }

  async getBatch(batchId: string): Promise<SettlementBatch> {
    const batch = await this.batchRepository.findOne({ where: { id: batchId } });
    if (!batch) throw new Error('Batch not found');
    return batch;
  }

  async getMerchantBatches(merchantId: string): Promise<SettlementBatch[]> {
    return this.batchRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getBatchItems(batchId: string): Promise<SettlementBatchItem[]> {
    return this.itemRepository.find({ where: { batchId } });
  }
}
