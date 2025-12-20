import { Injectable, Logger, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { MonimeApiService } from './monime-api.service';
import { MonimeTransaction, MonimeTransactionType, MonimeTransactionStatus, MonimeDepositMethod, MonimeWithdrawMethod } from './entities/monime-transaction.entity';
import { InitiateDepositDto, DepositResponseDto, DepositMethod } from './dto/deposit.dto';
import { InitiateWithdrawDto, WithdrawResponseDto, WithdrawMethod } from './dto/withdraw.dto';
import { getSupabaseWallet, creditSupabaseWallet, SupabaseWallet } from '../../lib/supabase';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class MonimeService {
  private readonly logger = new Logger(MonimeService.name);

  constructor(
    @InjectRepository(MonimeTransaction)
    private readonly transactionRepo: Repository<MonimeTransaction>,
    private readonly monimeApi: MonimeApiService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => SettingsService))
    private readonly settingsService: SettingsService,
  ) {}

  /**
   * Get callback URLs from settings or fallback to config
   */
  private async getUrls(): Promise<{ backendUrl: string; frontendUrl: string }> {
    // First try environment variables (most reliable for deployment)
    let backendUrl = this.configService.get<string>('APP_URL') || '';
    let frontendUrl = this.configService.get<string>('FRONTEND_URL') || '';

    // Try settings if env vars are not set
    if (!backendUrl || !frontendUrl) {
      try {
        const config = await this.settingsService.getMonimeConfig();
        if (config?.backendUrl && config.backendUrl.startsWith('http')) {
          backendUrl = config.backendUrl;
        }
        if (config?.frontendUrl && config.frontendUrl.startsWith('http')) {
          frontendUrl = config.frontendUrl;
        }
      } catch (e) {
        this.logger.debug('Could not get URLs from settings');
      }
    }

    // Final fallback to localhost defaults
    if (!backendUrl || !backendUrl.startsWith('http')) {
      backendUrl = 'http://localhost:3002';
    }
    if (!frontendUrl || !frontendUrl.startsWith('http')) {
      frontendUrl = 'http://localhost:5173';
    }

    // Remove trailing slashes
    backendUrl = backendUrl.replace(/\/$/, '');
    frontendUrl = frontendUrl.replace(/\/$/, '');

    this.logger.log(`Using URLs: backend=${backendUrl}, frontend=${frontendUrl}`);
    return { backendUrl, frontendUrl };
  }

  async initiateDeposit(userId: string, dto: InitiateDepositDto): Promise<DepositResponseDto> {
    // Use Supabase to verify wallet exists (frontend uses Supabase for wallets)
    const supabaseWallet = await getSupabaseWallet(dto.walletId);
    if (!supabaseWallet) {
      this.logger.warn(`Wallet not found in Supabase: ${dto.walletId}`);
      throw new NotFoundException('Wallet not found');
    }
    this.logger.log(`Found wallet in Supabase: ${supabaseWallet.id}, balance: ${supabaseWallet.balance}, currency: ${supabaseWallet.currency}`);

    // Ensure deposit currency matches wallet currency
    const walletCurrency = supabaseWallet.currency?.toUpperCase() || 'SLE';
    const depositCurrency = dto.currency?.toUpperCase() || 'SLE';
    if (depositCurrency !== walletCurrency) {
      throw new BadRequestException(
        `Currency mismatch. Wallet is ${walletCurrency} but deposit is ${depositCurrency}. ` +
        `Please deposit ${walletCurrency} to this wallet or select a ${depositCurrency} wallet.`
      );
    }

    // Use the wallet's user_id if not provided via header
    const effectiveUserId = userId || supabaseWallet.user_id;
    if (!effectiveUserId) {
      this.logger.error('No userId provided and wallet has no user_id');
      throw new BadRequestException('User ID is required');
    }

    const idempotencyKey = uuidv4();
    const transaction = this.transactionRepo.create({
      idempotencyKey,
      type: MonimeTransactionType.DEPOSIT,
      status: MonimeTransactionStatus.PENDING,
      walletId: dto.walletId,
      userId: effectiveUserId,
      amount: dto.amount,
      currencyCode: dto.currency,
      depositMethod: dto.method as unknown as MonimeDepositMethod,
      description: dto.description,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    if (dto.method === DepositMethod.CHECKOUT_SESSION) {
      // Get URLs from settings or config
      const urls = await this.getUrls();

      // Build success/cancel URLs that go through backend first
      const successUrl = `${urls.backendUrl}/monime/deposit/success?sessionId={CHECKOUT_SESSION_ID}&walletId=${dto.walletId}&redirect=${encodeURIComponent(urls.frontendUrl + '/deposit/success')}`;
      const cancelUrl = `${urls.backendUrl}/monime/deposit/cancel?sessionId={CHECKOUT_SESSION_ID}&walletId=${dto.walletId}&redirect=${encodeURIComponent(urls.frontendUrl + '/deposit/cancel')}`;

      this.logger.log(`Creating checkout session with successUrl: ${successUrl}`);
      this.logger.log(`Creating checkout session with cancelUrl: ${cancelUrl}`);

      const response = await this.monimeApi.createCheckoutSession({
        name: 'Wallet Deposit',
        lineItems: [
          {
            type: 'custom',
            name: 'Wallet Deposit',
            price: {
              currency: dto.currency,
              value: dto.amount,
            },
            quantity: 1,
            description: dto.description || 'Add funds to your wallet',
          },
        ],
        successUrl,
        cancelUrl,
        metadata: { walletId: dto.walletId, userId, idempotencyKey, type: 'deposit' },
      }, idempotencyKey);

      transaction.monimeReference = (response as any).result?.id;
      transaction.paymentUrl = (response as any).result?.redirectUrl || (response as any).result?.url;
      transaction.monimeResponse = response;
    } else if (dto.method === DepositMethod.PAYMENT_CODE) {
      const response = await this.monimeApi.createPaymentCode({
        name: `Deposit-${idempotencyKey.slice(0, 8)}`,
        amount: { currency: dto.currency, value: dto.amount },
        mode: 'one_time',
        duration: '15m',
        metadata: { walletId: dto.walletId, idempotencyKey },
      }, idempotencyKey);

      transaction.monimeReference = (response as any).result?.id;
      transaction.ussdCode = (response as any).result?.ussdCode;
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
    // Verify wallet exists via Supabase
    const wallet = await getSupabaseWallet(dto.walletId);
    if (!wallet) throw new NotFoundException('Wallet not found');

    const currentBalance = parseFloat(wallet.balance?.toString() || '0');
    if (currentBalance < dto.amount) {
      throw new BadRequestException('Insufficient funds');
    }

    // USD wallets can only payout to bank accounts (no mobile money)
    const walletCurrency = wallet.currency?.toUpperCase() || 'SLE';
    if (walletCurrency === 'USD' && dto.method === WithdrawMethod.MOBILE_MONEY) {
      throw new BadRequestException('USD payouts are only available to bank accounts. Mobile money is not supported for USD.');
    }

    // Ensure currency matches wallet currency
    if (dto.currency?.toUpperCase() !== walletCurrency) {
      throw new BadRequestException(`Currency mismatch. Wallet currency is ${walletCurrency}, but requested ${dto.currency?.toUpperCase()}`);
    }

    const idempotencyKey = uuidv4();

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
      // Use internal transfer API for payout
      const response = await this.monimeApi.createInternalTransfer({
        amount: { currency: dto.currency, value: dto.amount },
        sourceFinancialAccount: this.configService.get('MONIME_SOURCE_ACCOUNT_ID'),
        destinationFinancialAccount: this.configService.get('MONIME_PAYOUT_ACCOUNT_ID'),
        description: `Withdrawal to ${dto.method === WithdrawMethod.MOBILE_MONEY ? dto.mobileMoneyDestination?.phoneNumber : dto.bankDestination?.accountNumber}`,
        metadata: { walletId: dto.walletId, idempotencyKey, userId },
      }, idempotencyKey);

      transaction.monimeReference = (response as any).result?.id;
      transaction.monimeResponse = response;
    } catch (error) {
      this.logger.error(`Withdrawal failed: ${error}`);
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
    try {
      // Credit wallet via Supabase
      await creditSupabaseWallet(
        transaction.walletId,
        Number(transaction.amount) / 100, // Convert from minor units
        transaction.monimeReference,
        `Monime deposit - ${transaction.id}`,
      );

      transaction.status = MonimeTransactionStatus.COMPLETED;
      transaction.completedAt = new Date();
      transaction.fee = data.fees?.value || 0;
      transaction.netAmount = Number(transaction.amount) - (transaction.fee || 0);

      this.logger.log(`Deposit completed: ${transaction.id}`);
    } catch (error) {
      this.logger.error(`Failed to complete deposit ${transaction.id}: ${error}`);
      throw error;
    }
  }

  private async completeWithdrawal(transaction: MonimeTransaction, data: any): Promise<void> {
    // TODO: Debit wallet via Supabase for withdrawal
    transaction.status = MonimeTransactionStatus.COMPLETED;
    transaction.completedAt = new Date();
    this.logger.log(`Withdrawal completed: ${transaction.id}`);
  }

  private async failWithdrawal(transaction: MonimeTransaction, data: any): Promise<void> {
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

  /**
   * Complete deposit from checkout session callback
   * This is called when user returns from Monime checkout
   */
  async completeDepositFromCallback(sessionId: string, walletId: string): Promise<{
    status: string;
    amount: number;
    currency: string;
    newBalance?: number;
  }> {
    // Find the transaction by Monime reference
    let transaction = await this.transactionRepo.findOne({
      where: { monimeReference: sessionId },
    });

    // If no transaction found, try to verify the session directly with Monime
    const sessionData = await this.monimeApi.getCheckoutSession(sessionId) as any;
    const sessionStatus = sessionData?.result?.status;

    this.logger.log(`Deposit callback - Session ${sessionId} status: ${sessionStatus}`);

    if (!transaction) {
      // Session exists in Monime but not in our DB - this shouldn't happen normally
      // but we handle it gracefully
      this.logger.warn(`No transaction found for session ${sessionId}, session status: ${sessionStatus}`);

      // Get amount from session
      const lineItem = sessionData?.result?.lineItems?.data?.[0];
      const amount = lineItem?.price?.value || 0;
      const currency = lineItem?.price?.currency || 'SLE';

      if (sessionStatus === 'completed') {
        // Credit the wallet via Supabase (frontend wallet database)
        try {
          const { wallet } = await creditSupabaseWallet(
            walletId,
            amount / 100, // Convert from minor units
            sessionId,
            `Monime deposit - ${sessionId}`,
          );

          return {
            status: 'completed',
            amount,
            currency,
            newBalance: wallet ? parseFloat(wallet.balance?.toString() || '0') : undefined,
          };
        } catch (error) {
          this.logger.error(`Failed to credit wallet via Supabase: ${error}`);
          return {
            status: 'completed',
            amount,
            currency,
          };
        }
      }

      return {
        status: sessionStatus || 'unknown',
        amount,
        currency,
      };
    }

    // Check if already completed
    if (transaction.status === MonimeTransactionStatus.COMPLETED) {
      const wallet = await getSupabaseWallet(walletId);
      return {
        status: 'completed',
        amount: Number(transaction.amount),
        currency: transaction.currencyCode,
        newBalance: wallet ? parseFloat(wallet.balance?.toString() || '0') : undefined,
      };
    }

    // Verify session is completed
    if (sessionStatus === 'completed') {
      // Credit the wallet via Supabase
      try {
        const { wallet } = await creditSupabaseWallet(
          transaction.walletId,
          Number(transaction.amount) / 100, // Convert from minor units
          transaction.monimeReference,
          `Monime deposit - ${transaction.id}`,
        );

        // Update transaction status
        transaction.status = MonimeTransactionStatus.COMPLETED;
        transaction.completedAt = new Date();
        await this.transactionRepo.save(transaction);

        this.logger.log(`Deposit completed via callback: ${transaction.id}`);

        return {
          status: 'completed',
          amount: Number(transaction.amount),
          currency: transaction.currencyCode,
          newBalance: wallet ? parseFloat(wallet.balance?.toString() || '0') : undefined,
        };
      } catch (error) {
        this.logger.error(`Failed to credit wallet via Supabase: ${error}`);
        // Still mark as completed in our system
        transaction.status = MonimeTransactionStatus.COMPLETED;
        transaction.completedAt = new Date();
        await this.transactionRepo.save(transaction);

        return {
          status: 'completed',
          amount: Number(transaction.amount),
          currency: transaction.currencyCode,
        };
      }
    }

    return {
      status: sessionStatus || transaction.status,
      amount: Number(transaction.amount),
      currency: transaction.currencyCode,
    };
  }

  /**
   * Cancel a deposit (mark as cancelled)
   */
  async cancelDeposit(sessionId: string): Promise<void> {
    const transaction = await this.transactionRepo.findOne({
      where: { monimeReference: sessionId },
    });

    if (transaction && transaction.status === MonimeTransactionStatus.PENDING) {
      transaction.status = MonimeTransactionStatus.CANCELLED;
      await this.transactionRepo.save(transaction);
      this.logger.log(`Deposit cancelled: ${transaction.id}`);
    }
  }

  /**
   * Get all deposit transactions for admin view
   */
  async getAllDeposits(limit: number = 50, offset: number = 0): Promise<{
    data: MonimeTransaction[];
    total: number;
  }> {
    const [data, total] = await this.transactionRepo.findAndCount({
      where: { type: MonimeTransactionType.DEPOSIT },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
    return { data, total };
  }
}
