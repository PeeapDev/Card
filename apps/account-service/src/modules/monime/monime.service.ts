import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MonimeApiService } from './monime-api.service';
import { MonimeTransaction, MonimeTransactionType, MonimeTransactionStatus, MonimeDepositMethod, MonimeWithdrawMethod } from './entities/monime-transaction.entity';
import { InitiateDepositDto, DepositResponseDto, DepositMethod } from './dto/deposit.dto';
import { InitiateWithdrawDto, WithdrawResponseDto, WithdrawMethod } from './dto/withdraw.dto';
import { WalletsService } from '../wallets/wallets.service';
import { LedgerService } from '../ledger/ledger.service';

@Injectable()
export class MonimeService {
  private readonly logger = new Logger(MonimeService.name);
  private readonly callbackBaseUrl: string;

  constructor(
    @InjectRepository(MonimeTransaction)
    private readonly transactionRepo: Repository<MonimeTransaction>,
    private readonly monimeApi: MonimeApiService,
    private readonly walletsService: WalletsService,
    private readonly ledgerService: LedgerService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.callbackBaseUrl = this.configService.get('APP_URL', 'http://localhost:3002');
  }

  async initiateDeposit(userId: string, dto: InitiateDepositDto): Promise<DepositResponseDto> {
    const wallet = await this.walletsService.getWallet(dto.walletId);
    if (!wallet) throw new NotFoundException('Wallet not found');

    const idempotencyKey = uuidv4();
    const transaction = this.transactionRepo.create({
      idempotencyKey,
      type: MonimeTransactionType.DEPOSIT,
      status: MonimeTransactionStatus.PENDING,
      walletId: dto.walletId,
      userId,
      amount: dto.amount,
      currencyCode: dto.currency,
      depositMethod: dto.method as unknown as MonimeDepositMethod,
      description: dto.description,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    if (dto.method === DepositMethod.CHECKOUT_SESSION) {
      const response = await this.monimeApi.createCheckoutSession({
        amount: { currency: dto.currency, value: dto.amount },
        successUrl: dto.successUrl || `${this.callbackBaseUrl}/deposit/success`,
        cancelUrl: dto.cancelUrl || `${this.callbackBaseUrl}/deposit/cancel`,
        metadata: { walletId: dto.walletId, idempotencyKey },
      }, idempotencyKey);

      transaction.monimeReference = response.result.id;
      transaction.paymentUrl = response.result.url;
      transaction.monimeResponse = response;
    } else if (dto.method === DepositMethod.PAYMENT_CODE) {
      const response = await this.monimeApi.createPaymentCode({
        name: `Deposit-${idempotencyKey.slice(0, 8)}`,
        amount: { currency: dto.currency, value: dto.amount },
        mode: 'one_time',
        duration: '15m',
        metadata: { walletId: dto.walletId, idempotencyKey },
      }, idempotencyKey);

      transaction.monimeReference = response.result.id;
      transaction.ussdCode = response.result.ussdCode;
      transaction.monimeResponse = response;
    }

    await this.transactionRepo.save(transaction);
    this.logger.log(`Deposit initiated: ${transaction.id} for wallet ${dto.walletId}`);

    return {
      id: transaction.id,
      monimeReference: transaction.monimeReference,
      status: 'pending',
      paymentUrl: transaction.paymentUrl,
      ussdCode: transaction.ussdCode,
      amount: dto.amount,
      currency: dto.currency,
      expiresAt: transaction.expiresAt.toISOString(),
    };
  }

  async initiateWithdraw(userId: string, dto: InitiateWithdrawDto): Promise<WithdrawResponseDto> {
    const wallet = await this.walletsService.getWallet(dto.walletId);
    if (!wallet) throw new NotFoundException('Wallet not found');
    if (Number(wallet.availableBalance) < dto.amount) {
      throw new BadRequestException('Insufficient funds');
    }

    const idempotencyKey = uuidv4();

    // Hold funds first
    await this.walletsService.holdFunds(dto.walletId, dto.amount, idempotencyKey);

    const transaction = this.transactionRepo.create({
      idempotencyKey,
      type: MonimeTransactionType.WITHDRAWAL,
      status: MonimeTransactionStatus.PROCESSING,
      walletId: dto.walletId,
      userId,
      amount: dto.amount,
      currencyCode: dto.currency,
      withdrawMethod: dto.method === WithdrawMethod.MOBILE_MONEY ? MonimeWithdrawMethod.MOBILE_MONEY : MonimeWithdrawMethod.BANK_TRANSFER,
      destinationPhone: dto.mobileMoneyDestination?.phoneNumber,
      destinationBankCode: dto.bankDestination?.bankCode,
      destinationAccountNumber: dto.bankDestination?.accountNumber,
      destinationAccountName: dto.bankDestination?.accountName || dto.mobileMoneyDestination?.accountName,
      description: dto.description,
    });

    try {
      // For now, use internal transfer API - adjust based on actual Monime payout API
      const response = await this.monimeApi.createInternalTransfer({
        amount: { currency: dto.currency, value: dto.amount },
        sourceFinancialAccount: this.configService.get('MONIME_SOURCE_ACCOUNT_ID'),
        destinationFinancialAccount: this.configService.get('MONIME_PAYOUT_ACCOUNT_ID'),
        description: `Withdrawal to ${dto.method === WithdrawMethod.MOBILE_MONEY ? dto.mobileMoneyDestination?.phoneNumber : dto.bankDestination?.accountNumber}`,
        metadata: { walletId: dto.walletId, idempotencyKey, userId },
      }, idempotencyKey);

      transaction.monimeReference = response.result.id;
      transaction.monimeResponse = response;
    } catch (error) {
      // Release hold on failure
      await this.walletsService.releaseHold(dto.walletId, dto.amount, idempotencyKey);
      throw error;
    }

    await this.transactionRepo.save(transaction);
    this.logger.log(`Withdrawal initiated: ${transaction.id} from wallet ${dto.walletId}`);

    return {
      id: transaction.id,
      monimeReference: transaction.monimeReference,
      status: 'processing',
      amount: dto.amount,
      currency: dto.currency,
      destinationType: dto.method,
      maskedDestination: dto.method === WithdrawMethod.MOBILE_MONEY
        ? `****${dto.mobileMoneyDestination?.phoneNumber?.slice(-4)}`
        : `****${dto.bankDestination?.accountNumber?.slice(-4)}`,
    };
  }

  async handleWebhook(payload: any, signature: string): Promise<void> {
    // TODO: Verify webhook signature with MONIME_WEBHOOK_SECRET
    const { event, data } = payload;
    const eventName = event.name;
    const eventId = event.id;

    this.logger.log(`Webhook received: ${eventName} - ${eventId}`);

    const transaction = await this.transactionRepo.findOne({
      where: { monimeReference: data.id },
    });

    if (!transaction) {
      this.logger.warn(`Transaction not found for Monime reference: ${data.id}`);
      return;
    }

    // Idempotency check
    if (transaction.monimeEventId === eventId) {
      this.logger.debug(`Event already processed: ${eventId}`);
      return;
    }

    // Update webhook history
    transaction.webhookHistory = transaction.webhookHistory || [];
    transaction.webhookHistory.push({ eventId, eventName, timestamp: event.timestamp, data });
    transaction.monimeEventId = eventId;

    switch (eventName) {
      case 'checkout_session.completed':
      case 'payment_code.completed':
        await this.completeDeposit(transaction, data);
        break;
      case 'checkout_session.expired':
      case 'payment_code.expired':
        transaction.status = MonimeTransactionStatus.EXPIRED;
        break;
      case 'checkout_session.cancelled':
        transaction.status = MonimeTransactionStatus.CANCELLED;
        break;
      case 'payout.completed':
        await this.completeWithdrawal(transaction, data);
        break;
      case 'payout.failed':
        await this.failWithdrawal(transaction, data);
        break;
      case 'payout.delayed':
        transaction.status = MonimeTransactionStatus.DELAYED;
        transaction.delayReason = data.delayReason || 'Processing delayed';
        break;
    }

    await this.transactionRepo.save(transaction);
  }

  private async completeDeposit(transaction: MonimeTransaction, data: any): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // Credit wallet
      const wallet = await this.walletsService.getWallet(transaction.walletId);
      await this.walletsService.topUp(transaction.walletId, {
        amount: Number(transaction.amount),
        reference: transaction.monimeReference,
        paymentMethod: 'BANK_TRANSFER' as any, // Monime deposit
        description: `Monime deposit - ${transaction.id}`,
      });

      transaction.status = MonimeTransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
      transaction.fee = data.fees?.value || 0;
      transaction.netAmount = Number(transaction.amount) - (transaction.fee || 0);
    });

    this.logger.log(`Deposit completed: ${transaction.id}`);
  }

  private async completeWithdrawal(transaction: MonimeTransaction, data: any): Promise<void> {
    // Capture the held funds
    await this.walletsService.captureHold(
      transaction.walletId,
      Number(transaction.amount),
      transaction.id,
    );

    transaction.status = MonimeTransactionStatus.COMPLETED;
    transaction.completedAt = new Date();
    this.logger.log(`Withdrawal completed: ${transaction.id}`);
  }

  private async failWithdrawal(transaction: MonimeTransaction, data: any): Promise<void> {
    // Release the held funds back to available
    await this.walletsService.releaseHold(
      transaction.walletId,
      Number(transaction.amount),
      transaction.id,
    );

    transaction.status = MonimeTransactionStatus.FAILED;
    transaction.failureReason = data.failureDetail?.message || 'Withdrawal failed';
    this.logger.error(`Withdrawal failed: ${transaction.id} - ${transaction.failureReason}`);
  }

  async getTransaction(transactionId: string): Promise<MonimeTransaction> {
    const transaction = await this.transactionRepo.findOne({ where: { id: transactionId } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  async getUserTransactions(userId: string, type?: MonimeTransactionType): Promise<MonimeTransaction[]> {
    const where: any = { userId };
    if (type) where.type = type;
    return this.transactionRepo.find({ where, order: { createdAt: 'DESC' }, take: 50 });
  }

  async listBanks() {
    return this.monimeApi.listBanks('SL');
  }
}
