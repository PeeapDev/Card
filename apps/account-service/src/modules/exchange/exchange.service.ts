import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { ExchangeTransaction, ExchangeTransactionStatus } from './entities/exchange-transaction.entity';
import { ExchangePermission } from './entities/exchange-permission.entity';
import {
  GetExchangeRateDto,
  CalculateExchangeDto,
  ExecuteExchangeDto,
  SetExchangeRateDto,
  SetExchangePermissionDto,
  ExchangeRateResponseDto,
  ExchangeCalculationResponseDto,
  CanExchangeResponseDto,
  ExecuteExchangeResponseDto,
  ExchangeTransactionResponseDto,
  ExchangePermissionResponseDto,
  PaginatedResponseDto,
} from './dto/exchange.dto';

@Injectable()
export class ExchangeService {
  private supabase;

  constructor(
    @InjectRepository(ExchangeRate)
    private readonly exchangeRateRepository: Repository<ExchangeRate>,
    @InjectRepository(ExchangeTransaction)
    private readonly exchangeTransactionRepository: Repository<ExchangeTransaction>,
    @InjectRepository(ExchangePermission)
    private readonly exchangePermissionRepository: Repository<ExchangePermission>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');
    if (supabaseUrl && supabaseKey) {
      this.supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  // =====================================================
  // PUBLIC: Get Exchange Rate
  // =====================================================
  async getExchangeRate(dto: GetExchangeRateDto): Promise<ExchangeRateResponseDto> {
    const rate = await this.exchangeRateRepository.findOne({
      where: {
        fromCurrency: dto.fromCurrency.toUpperCase(),
        toCurrency: dto.toCurrency.toUpperCase(),
        isActive: true,
      },
    });

    if (!rate) {
      throw new NotFoundException(
        `Exchange rate not found for ${dto.fromCurrency} to ${dto.toCurrency}`,
      );
    }

    const effectiveRate = Number(rate.rate) * (1 - Number(rate.marginPercentage) / 100);

    return {
      id: rate.id,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: Number(rate.rate),
      marginPercentage: Number(rate.marginPercentage),
      effectiveRate,
      isActive: rate.isActive,
      updatedAt: rate.updatedAt,
    };
  }

  // =====================================================
  // PUBLIC: Calculate Exchange Preview
  // =====================================================
  async calculateExchange(
    dto: CalculateExchangeDto,
    userId?: string,
  ): Promise<ExchangeCalculationResponseDto> {
    const rateData = await this.getExchangeRate({
      fromCurrency: dto.fromCurrency,
      toCurrency: dto.toCurrency,
    });

    // Get user's fee percentage if userId provided
    let feePercentage = 0;
    if (userId) {
      const userRole = await this.getUserRole(userId);
      if (userRole) {
        const permission = await this.exchangePermissionRepository.findOne({
          where: { userType: userRole },
        });
        if (permission) {
          feePercentage = Number(permission.feePercentage) || 0;
        }
      }
    }

    const grossAmount = dto.amount * rateData.effectiveRate;
    const feeAmount = grossAmount * (feePercentage / 100);
    const netAmount = grossAmount - feeAmount;

    return {
      fromCurrency: dto.fromCurrency.toUpperCase(),
      toCurrency: dto.toCurrency.toUpperCase(),
      fromAmount: dto.amount,
      toAmount: grossAmount,
      exchangeRate: rateData.effectiveRate,
      feeAmount,
      feePercentage,
      netAmount,
    };
  }

  // =====================================================
  // PUBLIC: Check If User Can Exchange
  // =====================================================
  async canUserExchange(userId: string, amount?: number): Promise<CanExchangeResponseDto> {
    const userRole = await this.getUserRole(userId);
    if (!userRole) {
      return { allowed: false, reason: 'User not found' };
    }

    const permission = await this.exchangePermissionRepository.findOne({
      where: { userType: userRole },
    });

    if (!permission) {
      return { allowed: false, reason: 'No exchange permission configured for your account type' };
    }

    if (!permission.canExchange) {
      return { allowed: false, reason: 'Exchange is not enabled for your account type' };
    }

    // Calculate daily usage
    const dailyUsed = await this.getDailyUsage(userId);
    const monthlyUsed = await this.getMonthlyUsage(userId);

    const dailyRemaining = permission.dailyLimit
      ? Number(permission.dailyLimit) - dailyUsed
      : undefined;
    const monthlyRemaining = permission.monthlyLimit
      ? Number(permission.monthlyLimit) - monthlyUsed
      : undefined;

    // Check limits if amount provided
    if (amount) {
      if (permission.dailyLimit && dailyUsed + amount > Number(permission.dailyLimit)) {
        return {
          allowed: false,
          reason: 'Daily exchange limit exceeded',
          dailyRemaining,
          monthlyRemaining,
          feePercentage: Number(permission.feePercentage),
        };
      }

      if (permission.monthlyLimit && monthlyUsed + amount > Number(permission.monthlyLimit)) {
        return {
          allowed: false,
          reason: 'Monthly exchange limit exceeded',
          dailyRemaining,
          monthlyRemaining,
          feePercentage: Number(permission.feePercentage),
        };
      }

      if (permission.minAmount && amount < Number(permission.minAmount)) {
        return {
          allowed: false,
          reason: `Minimum exchange amount is ${permission.minAmount}`,
          dailyRemaining,
          monthlyRemaining,
          feePercentage: Number(permission.feePercentage),
        };
      }

      if (permission.maxAmount && amount > Number(permission.maxAmount)) {
        return {
          allowed: false,
          reason: `Maximum exchange amount is ${permission.maxAmount}`,
          dailyRemaining,
          monthlyRemaining,
          feePercentage: Number(permission.feePercentage),
        };
      }
    }

    return {
      allowed: true,
      dailyRemaining,
      monthlyRemaining,
      feePercentage: Number(permission.feePercentage),
    };
  }

  // =====================================================
  // PUBLIC: Execute Exchange
  // =====================================================
  async executeExchange(
    userId: string,
    dto: ExecuteExchangeDto,
  ): Promise<ExecuteExchangeResponseDto> {
    // Check if user can exchange
    const canExchange = await this.canUserExchange(userId, dto.amount);
    if (!canExchange.allowed) {
      return { success: false, error: canExchange.reason };
    }

    // Get wallets from Supabase
    const { data: fromWallet, error: fromError } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', dto.fromWalletId)
      .eq('user_id', userId)
      .single();

    if (fromError || !fromWallet) {
      return { success: false, error: 'Source wallet not found or not owned by user' };
    }

    if (fromWallet.status !== 'ACTIVE') {
      return { success: false, error: 'Source wallet is not active' };
    }

    if (Number(fromWallet.balance) < dto.amount) {
      return { success: false, error: 'Insufficient balance in source wallet' };
    }

    const { data: toWallet, error: toError } = await this.supabase
      .from('wallets')
      .select('*')
      .eq('id', dto.toWalletId)
      .eq('user_id', userId)
      .single();

    if (toError || !toWallet) {
      return { success: false, error: 'Destination wallet not found or not owned by user' };
    }

    if (toWallet.status !== 'ACTIVE') {
      return { success: false, error: 'Destination wallet is not active' };
    }

    if (fromWallet.currency === toWallet.currency) {
      return { success: false, error: 'Cannot exchange between wallets with same currency. Use transfer instead.' };
    }

    // Get exchange rate
    let rateData: ExchangeRateResponseDto;
    try {
      rateData = await this.getExchangeRate({
        fromCurrency: fromWallet.currency,
        toCurrency: toWallet.currency,
      });
    } catch (error) {
      return {
        success: false,
        error: `Exchange rate not available for ${fromWallet.currency} to ${toWallet.currency}`,
      };
    }

    // Calculate amounts
    const calculation = await this.calculateExchange(
      {
        amount: dto.amount,
        fromCurrency: fromWallet.currency,
        toCurrency: toWallet.currency,
      },
      userId,
    );

    // Generate reference
    const reference = `EXC-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Execute exchange in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Debit source wallet
      const { error: debitError } = await this.supabase
        .from('wallets')
        .update({
          balance: Number(fromWallet.balance) - dto.amount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dto.fromWalletId);

      if (debitError) {
        throw new Error('Failed to debit source wallet');
      }

      // Credit destination wallet
      const { error: creditError } = await this.supabase
        .from('wallets')
        .update({
          balance: Number(toWallet.balance) + calculation.netAmount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', dto.toWalletId);

      if (creditError) {
        throw new Error('Failed to credit destination wallet');
      }

      // Create exchange transaction record
      const transaction = this.exchangeTransactionRepository.create({
        userId,
        fromWalletId: dto.fromWalletId,
        toWalletId: dto.toWalletId,
        fromCurrency: fromWallet.currency,
        toCurrency: toWallet.currency,
        fromAmount: dto.amount,
        toAmount: calculation.netAmount,
        exchangeRate: calculation.exchangeRate,
        feeAmount: calculation.feeAmount,
        feeCurrency: toWallet.currency,
        status: ExchangeTransactionStatus.COMPLETED,
        reference,
      });

      await queryRunner.manager.save(transaction);
      await queryRunner.commitTransaction();

      // Get updated balances
      const { data: updatedFromWallet } = await this.supabase
        .from('wallets')
        .select('balance')
        .eq('id', dto.fromWalletId)
        .single();

      const { data: updatedToWallet } = await this.supabase
        .from('wallets')
        .select('balance')
        .eq('id', dto.toWalletId)
        .single();

      return {
        success: true,
        transaction: {
          id: transaction.id,
          fromWalletId: transaction.fromWalletId,
          toWalletId: transaction.toWalletId,
          fromCurrency: transaction.fromCurrency,
          toCurrency: transaction.toCurrency,
          fromAmount: Number(transaction.fromAmount),
          toAmount: Number(transaction.toAmount),
          exchangeRate: Number(transaction.exchangeRate),
          feeAmount: Number(transaction.feeAmount),
          status: transaction.status,
          reference: transaction.reference,
          createdAt: transaction.createdAt,
        },
        fromWalletNewBalance: updatedFromWallet?.balance,
        toWalletNewBalance: updatedToWallet?.balance,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      return { success: false, error: error.message || 'Exchange failed' };
    } finally {
      await queryRunner.release();
    }
  }

  // =====================================================
  // PUBLIC: Get User Exchange History
  // =====================================================
  async getExchangeHistory(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponseDto<ExchangeTransactionResponseDto>> {
    const [transactions, total] = await this.exchangeTransactionRepository.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        fromWalletId: tx.fromWalletId,
        toWalletId: tx.toWalletId,
        fromCurrency: tx.fromCurrency,
        toCurrency: tx.toCurrency,
        fromAmount: Number(tx.fromAmount),
        toAmount: Number(tx.toAmount),
        exchangeRate: Number(tx.exchangeRate),
        feeAmount: Number(tx.feeAmount),
        status: tx.status,
        reference: tx.reference,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // =====================================================
  // ADMIN: Set Exchange Rate
  // =====================================================
  async setExchangeRate(
    adminId: string,
    dto: SetExchangeRateDto,
  ): Promise<ExchangeRateResponseDto> {
    const fromCurrency = dto.fromCurrency.toUpperCase();
    const toCurrency = dto.toCurrency.toUpperCase();

    // Upsert the rate
    let rate = await this.exchangeRateRepository.findOne({
      where: { fromCurrency, toCurrency },
    });

    if (rate) {
      rate.rate = dto.rate;
      rate.marginPercentage = dto.marginPercentage ?? rate.marginPercentage;
      rate.setBy = adminId;
      rate.isActive = true;
    } else {
      rate = this.exchangeRateRepository.create({
        fromCurrency,
        toCurrency,
        rate: dto.rate,
        marginPercentage: dto.marginPercentage ?? 0,
        setBy: adminId,
        isActive: true,
      });
    }

    await this.exchangeRateRepository.save(rate);

    const effectiveRate = Number(rate.rate) * (1 - Number(rate.marginPercentage) / 100);

    return {
      id: rate.id,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: Number(rate.rate),
      marginPercentage: Number(rate.marginPercentage),
      effectiveRate,
      isActive: rate.isActive,
      updatedAt: rate.updatedAt,
    };
  }

  // =====================================================
  // ADMIN: Get All Exchange Rates
  // =====================================================
  async getAllExchangeRates(): Promise<ExchangeRateResponseDto[]> {
    const rates = await this.exchangeRateRepository.find({
      order: { fromCurrency: 'ASC', toCurrency: 'ASC' },
    });

    return rates.map((rate) => ({
      id: rate.id,
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      rate: Number(rate.rate),
      marginPercentage: Number(rate.marginPercentage),
      effectiveRate: Number(rate.rate) * (1 - Number(rate.marginPercentage) / 100),
      isActive: rate.isActive,
      updatedAt: rate.updatedAt,
    }));
  }

  // =====================================================
  // ADMIN: Set Exchange Permission
  // =====================================================
  async setExchangePermission(
    dto: SetExchangePermissionDto,
  ): Promise<ExchangePermissionResponseDto> {
    let permission = await this.exchangePermissionRepository.findOne({
      where: { userType: dto.userType },
    });

    if (permission) {
      permission.canExchange = dto.canExchange;
      if (dto.dailyLimit !== undefined) permission.dailyLimit = dto.dailyLimit;
      if (dto.monthlyLimit !== undefined) permission.monthlyLimit = dto.monthlyLimit;
      if (dto.minAmount !== undefined) permission.minAmount = dto.minAmount;
      if (dto.maxAmount !== undefined) permission.maxAmount = dto.maxAmount;
      if (dto.feePercentage !== undefined) permission.feePercentage = dto.feePercentage;
    } else {
      permission = this.exchangePermissionRepository.create({
        userType: dto.userType,
        canExchange: dto.canExchange,
        dailyLimit: dto.dailyLimit,
        monthlyLimit: dto.monthlyLimit,
        minAmount: dto.minAmount ?? 1,
        maxAmount: dto.maxAmount,
        feePercentage: dto.feePercentage ?? 0,
      });
    }

    await this.exchangePermissionRepository.save(permission);

    return {
      id: permission.id,
      userType: permission.userType,
      canExchange: permission.canExchange,
      dailyLimit: permission.dailyLimit ? Number(permission.dailyLimit) : undefined,
      monthlyLimit: permission.monthlyLimit ? Number(permission.monthlyLimit) : undefined,
      minAmount: permission.minAmount ? Number(permission.minAmount) : undefined,
      maxAmount: permission.maxAmount ? Number(permission.maxAmount) : undefined,
      feePercentage: Number(permission.feePercentage),
      updatedAt: permission.updatedAt,
    };
  }

  // =====================================================
  // ADMIN: Get All Permissions
  // =====================================================
  async getAllPermissions(): Promise<ExchangePermissionResponseDto[]> {
    const permissions = await this.exchangePermissionRepository.find({
      order: { userType: 'ASC' },
    });

    return permissions.map((p) => ({
      id: p.id,
      userType: p.userType,
      canExchange: p.canExchange,
      dailyLimit: p.dailyLimit ? Number(p.dailyLimit) : undefined,
      monthlyLimit: p.monthlyLimit ? Number(p.monthlyLimit) : undefined,
      minAmount: p.minAmount ? Number(p.minAmount) : undefined,
      maxAmount: p.maxAmount ? Number(p.maxAmount) : undefined,
      feePercentage: Number(p.feePercentage),
      updatedAt: p.updatedAt,
    }));
  }

  // =====================================================
  // ADMIN: Get All Exchange Transactions
  // =====================================================
  async getAllExchangeTransactions(
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponseDto<ExchangeTransactionResponseDto>> {
    const [transactions, total] = await this.exchangeTransactionRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data: transactions.map((tx) => ({
        id: tx.id,
        fromWalletId: tx.fromWalletId,
        toWalletId: tx.toWalletId,
        fromCurrency: tx.fromCurrency,
        toCurrency: tx.toCurrency,
        fromAmount: Number(tx.fromAmount),
        toAmount: Number(tx.toAmount),
        exchangeRate: Number(tx.exchangeRate),
        feeAmount: Number(tx.feeAmount),
        status: tx.status,
        reference: tx.reference,
        createdAt: tx.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // =====================================================
  // HELPER: Get User Role
  // =====================================================
  private async getUserRole(userId: string): Promise<string | null> {
    const { data: user, error } = await this.supabase
      .from('users')
      .select('roles')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return null;
    }

    return user.roles;
  }

  // =====================================================
  // HELPER: Get Daily Usage
  // =====================================================
  private async getDailyUsage(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.exchangeTransactionRepository
      .createQueryBuilder('tx')
      .select('SUM(CASE WHEN tx.from_currency = :usd THEN tx.from_amount ELSE tx.from_amount * 0.044444 END)', 'total')
      .where('tx.user_id = :userId', { userId })
      .andWhere('tx.created_at >= :today', { today })
      .andWhere('tx.status = :status', { status: ExchangeTransactionStatus.COMPLETED })
      .setParameter('usd', 'USD')
      .getRawOne();

    return Number(result?.total) || 0;
  }

  // =====================================================
  // HELPER: Get Monthly Usage
  // =====================================================
  private async getMonthlyUsage(userId: string): Promise<number> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const result = await this.exchangeTransactionRepository
      .createQueryBuilder('tx')
      .select('SUM(CASE WHEN tx.from_currency = :usd THEN tx.from_amount ELSE tx.from_amount * 0.044444 END)', 'total')
      .where('tx.user_id = :userId', { userId })
      .andWhere('tx.created_at >= :startOfMonth', { startOfMonth })
      .andWhere('tx.status = :status', { status: ExchangeTransactionStatus.COMPLETED })
      .setParameter('usd', 'USD')
      .getRawOne();

    return Number(result?.total) || 0;
  }
}
