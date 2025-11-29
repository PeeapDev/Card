import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  Transaction,
  TransactionState,
  TransactionType,
  TransactionEntryMode,
} from '@payment-system/database';
import { generateTransactionId, generateAuthCode } from '@payment-system/common';
import { TransactionStateMachine } from './state-machine/transaction-state-machine';
import { EventSourcingService } from './services/event-sourcing.service';
import { CardServiceClient } from '../service-client/card-service.client';
import { AccountServiceClient } from '../service-client/account-service.client';
import { FraudServiceClient } from '../service-client/fraud-service.client';

interface AuthorizeRequest {
  cardToken: string;
  amount: number;
  currency: string;
  merchantId: string;
  merchantName?: string;
  merchantMcc?: string;
  terminalId?: string;
  entryMode: TransactionEntryMode;
  ipAddress?: string;
  deviceId?: string;
  description?: string;
}

interface CaptureRequest {
  transactionId: string;
  amount?: number;
  finalCapture?: boolean;
}

interface RefundRequest {
  transactionId: string;
  amount: number;
  reason?: string;
}

interface AuthorizeResult {
  transactionId: string;
  authorizationCode: string;
  status: TransactionState;
  approvedAmount: number;
  riskScore?: number;
  message: string;
}

@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    private readonly stateMachine: TransactionStateMachine,
    private readonly eventSourcingService: EventSourcingService,
    private readonly cardClient: CardServiceClient,
    private readonly accountClient: AccountServiceClient,
    private readonly fraudClient: FraudServiceClient,
  ) {}

  async authorize(request: AuthorizeRequest): Promise<AuthorizeResult> {
    return this.dataSource.transaction(async (manager) => {
      const transactionId = generateTransactionId();
      const startTime = Date.now();

      // Step 1: Verify card
      const cardVerification = await this.cardClient.verifyCard(
        request.cardToken,
        request.amount,
      );

      if (!cardVerification.valid) {
        // Create failed transaction record
        const transaction = manager.create(Transaction, {
          id: transactionId,
          transactionType: TransactionType.PURCHASE,
          cardToken: request.cardToken,
          merchantId: request.merchantId,
          merchantName: request.merchantName,
          merchantMcc: request.merchantMcc,
          terminalId: request.terminalId,
          entryMode: request.entryMode,
          amount: request.amount,
          authorizedAmount: 0,
          currency: request.currency,
          state: TransactionState.FAILED,
          declineReason: cardVerification.reason,
          ipAddress: request.ipAddress,
          deviceId: request.deviceId,
          description: request.description,
        });

        await manager.save(transaction);

        await this.eventSourcingService.recordEvent({
          transactionId,
          eventType: 'AUTHORIZATION_FAILED',
          newState: TransactionState.FAILED,
          amount: request.amount,
          metadata: { reason: cardVerification.reason },
        }, manager);

        return {
          transactionId,
          authorizationCode: '',
          status: TransactionState.FAILED,
          approvedAmount: 0,
          message: cardVerification.reason || 'Card verification failed',
        };
      }

      const card = cardVerification.card!;

      // Step 2: Fraud check
      const fraudResult = await this.fraudClient.checkTransaction({
        transactionId,
        cardToken: request.cardToken,
        amount: request.amount,
        currency: request.currency,
        merchantId: request.merchantId,
        merchantMcc: request.merchantMcc,
        entryMode: request.entryMode,
        ipAddress: request.ipAddress,
        deviceId: request.deviceId,
        userId: card.userId,
      });

      if (fraudResult.decision === 'DECLINE') {
        const transaction = manager.create(Transaction, {
          id: transactionId,
          transactionType: TransactionType.PURCHASE,
          cardToken: request.cardToken,
          cardId: card.id,
          walletId: card.walletId,
          userId: card.userId,
          merchantId: request.merchantId,
          merchantName: request.merchantName,
          merchantMcc: request.merchantMcc,
          terminalId: request.terminalId,
          entryMode: request.entryMode,
          amount: request.amount,
          authorizedAmount: 0,
          currency: request.currency,
          state: TransactionState.FAILED,
          declineReason: 'Fraud check failed',
          riskScore: fraudResult.riskScore,
          fraudDecision: fraudResult.decision,
          triggeredRules: fraudResult.triggeredRules,
          ipAddress: request.ipAddress,
          deviceId: request.deviceId,
          description: request.description,
        });

        await manager.save(transaction);

        await this.eventSourcingService.recordEvent({
          transactionId,
          eventType: 'FRAUD_DECLINED',
          newState: TransactionState.FAILED,
          amount: request.amount,
          metadata: { riskScore: fraudResult.riskScore, rules: fraudResult.triggeredRules },
        }, manager);

        return {
          transactionId,
          authorizationCode: '',
          status: TransactionState.FAILED,
          approvedAmount: 0,
          riskScore: fraudResult.riskScore,
          message: 'Transaction declined',
        };
      }

      // Step 3: Hold funds
      const holdResult = await this.accountClient.holdFunds(
        card.walletId,
        request.amount,
        transactionId,
      );

      if (!holdResult.success) {
        const transaction = manager.create(Transaction, {
          id: transactionId,
          transactionType: TransactionType.PURCHASE,
          cardToken: request.cardToken,
          cardId: card.id,
          walletId: card.walletId,
          userId: card.userId,
          merchantId: request.merchantId,
          merchantName: request.merchantName,
          merchantMcc: request.merchantMcc,
          terminalId: request.terminalId,
          entryMode: request.entryMode,
          amount: request.amount,
          authorizedAmount: 0,
          currency: request.currency,
          state: TransactionState.FAILED,
          declineReason: holdResult.error || 'Insufficient funds',
          riskScore: fraudResult.riskScore,
          fraudDecision: fraudResult.decision,
          ipAddress: request.ipAddress,
          deviceId: request.deviceId,
          description: request.description,
        });

        await manager.save(transaction);

        return {
          transactionId,
          authorizationCode: '',
          status: TransactionState.FAILED,
          approvedAmount: 0,
          riskScore: fraudResult.riskScore,
          message: holdResult.error || 'Insufficient funds',
        };
      }

      // Step 4: Create authorized transaction
      const authorizationCode = generateAuthCode();
      const processingTime = Date.now() - startTime;

      const transaction = manager.create(Transaction, {
        id: transactionId,
        transactionType: TransactionType.PURCHASE,
        cardToken: request.cardToken,
        cardId: card.id,
        walletId: card.walletId,
        userId: card.userId,
        merchantId: request.merchantId,
        merchantName: request.merchantName,
        merchantMcc: request.merchantMcc,
        terminalId: request.terminalId,
        entryMode: request.entryMode,
        amount: request.amount,
        authorizedAmount: request.amount,
        currency: request.currency,
        state: TransactionState.AUTHORIZED,
        authorizationCode,
        authorizedAt: new Date(),
        authorizationExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        riskScore: fraudResult.riskScore,
        fraudDecision: fraudResult.decision,
        triggeredRules: fraudResult.triggeredRules,
        processingTimeMs: processingTime,
        ipAddress: request.ipAddress,
        deviceId: request.deviceId,
        description: request.description,
      });

      await manager.save(transaction);

      // Record card spend
      await this.cardClient.recordSpend(card.id, request.amount);

      await this.eventSourcingService.recordEvent({
        transactionId,
        eventType: 'AUTHORIZED',
        previousState: TransactionState.INITIATED,
        newState: TransactionState.AUTHORIZED,
        amount: request.amount,
        metadata: { authorizationCode, riskScore: fraudResult.riskScore },
      }, manager);

      this.logger.log(`Transaction authorized: ${transactionId} for ${request.amount} ${request.currency}`);

      return {
        transactionId,
        authorizationCode,
        status: TransactionState.AUTHORIZED,
        approvedAmount: request.amount,
        riskScore: fraudResult.riskScore,
        message: 'Approved',
      };
    });
  }

  async capture(request: CaptureRequest): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await manager.findOne(Transaction, {
        where: { id: request.transactionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      this.stateMachine.validateTransition(transaction.state, TransactionState.CAPTURED);

      const captureAmount = request.amount || Number(transaction.authorizedAmount);

      if (captureAmount > Number(transaction.authorizedAmount)) {
        throw new BadRequestException('Capture amount exceeds authorized amount');
      }

      // Calculate fee (2.9% + $0.30 typical)
      const feePercentage = 0.029;
      const feeFixed = 0.30;
      const feeAmount = captureAmount * feePercentage + feeFixed;

      // Capture the hold
      const captureResult = await this.accountClient.captureHold(
        transaction.walletId,
        captureAmount,
        transaction.id,
      );

      if (!captureResult.success) {
        throw new BadRequestException(captureResult.error || 'Capture failed');
      }

      // Record in ledger
      await this.accountClient.recordLedgerCapture(
        transaction.walletId,
        transaction.merchantId,
        transaction.id,
        captureAmount,
        feeAmount,
        transaction.currency,
      );

      transaction.state = TransactionState.CAPTURED;
      transaction.capturedAmount = captureAmount;
      transaction.feeAmount = feeAmount;
      transaction.netAmount = captureAmount - feeAmount;
      transaction.capturedAt = new Date();

      await manager.save(transaction);

      await this.eventSourcingService.recordEvent({
        transactionId: transaction.id,
        eventType: 'CAPTURED',
        previousState: TransactionState.AUTHORIZED,
        newState: TransactionState.CAPTURED,
        amount: captureAmount,
        metadata: { feeAmount, netAmount: transaction.netAmount },
      }, manager);

      this.logger.log(`Transaction captured: ${transaction.id} for ${captureAmount}`);

      return transaction;
    });
  }

  async void(transactionId: string, reason: string): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await manager.findOne(Transaction, {
        where: { id: transactionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      this.stateMachine.validateTransition(transaction.state, TransactionState.VOIDED);

      // Release the hold
      await this.accountClient.releaseHold(
        transaction.walletId,
        Number(transaction.authorizedAmount),
        transaction.id,
      );

      // Reverse card spend
      await this.cardClient.reverseSpend(transaction.cardId, Number(transaction.authorizedAmount));

      transaction.state = TransactionState.VOIDED;
      transaction.voidedAt = new Date();
      transaction.voidReason = reason;

      await manager.save(transaction);

      await this.eventSourcingService.recordEvent({
        transactionId: transaction.id,
        eventType: 'VOIDED',
        previousState: TransactionState.AUTHORIZED,
        newState: TransactionState.VOIDED,
        metadata: { reason },
      }, manager);

      this.logger.log(`Transaction voided: ${transactionId}`);

      return transaction;
    });
  }

  async refund(request: RefundRequest): Promise<Transaction> {
    return this.dataSource.transaction(async (manager) => {
      const transaction = await manager.findOne(Transaction, {
        where: { id: request.transactionId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      if (!this.stateMachine.canBeRefunded(transaction.state)) {
        throw new BadRequestException('Transaction cannot be refunded');
      }

      const currentRefunded = Number(transaction.refundedAmount) || 0;
      const captured = Number(transaction.capturedAmount);
      const available = captured - currentRefunded;

      if (request.amount > available) {
        throw new BadRequestException(
          `Refund amount ${request.amount} exceeds available ${available}`,
        );
      }

      // Refund to wallet
      const refundResult = await this.accountClient.refund(
        transaction.walletId,
        request.amount,
        transaction.id,
      );

      if (!refundResult.success) {
        throw new BadRequestException(refundResult.error || 'Refund failed');
      }

      // Record in ledger
      await this.accountClient.recordLedgerRefund(
        transaction.walletId,
        transaction.merchantId,
        transaction.id,
        request.amount,
        transaction.currency,
      );

      // Reverse card spend
      await this.cardClient.reverseSpend(transaction.cardId, request.amount);

      const newRefundedAmount = currentRefunded + request.amount;
      const isFullRefund = newRefundedAmount >= captured;

      transaction.refundedAmount = newRefundedAmount;
      transaction.state = isFullRefund
        ? TransactionState.REFUNDED
        : TransactionState.PARTIAL_REFUND;

      await manager.save(transaction);

      await this.eventSourcingService.recordEvent({
        transactionId: transaction.id,
        eventType: isFullRefund ? 'REFUNDED' : 'PARTIAL_REFUND',
        previousState: TransactionState.CAPTURED,
        newState: transaction.state,
        amount: request.amount,
        metadata: { reason: request.reason, totalRefunded: newRefundedAmount },
      }, manager);

      this.logger.log(`Transaction refunded: ${request.transactionId} for ${request.amount}`);

      return transaction;
    });
  }

  async getTransaction(transactionId: string): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async getTransactionHistory(transactionId: string) {
    return this.eventSourcingService.getTransactionHistory(transactionId);
  }

  async getUserTransactions(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getMerchantTransactions(
    merchantId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
