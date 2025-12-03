import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  Account,
  LedgerEntry,
  JournalEntry,
  LedgerEntryType,
  JournalType,
} from '@payment-system/database';

/**
 * LedgerService - Stub Implementation
 *
 * This is a temporary stub to allow the account-service to start.
 * The ledger functionality needs to be reimplemented to match the current
 * database schema which uses:
 * - Account: accountNumber, accountType, accountName, ownerId, ownerType
 * - JournalEntry: journalType (not type), no journalNumber
 * - AccountType: specific types like ASSET_USER_WALLET, LIABILITY_USER_DEPOSITS
 */
@Injectable()
export class LedgerService {
  private readonly logger = new Logger(LedgerService.name);

  constructor(
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
    @InjectRepository(LedgerEntry)
    private readonly ledgerEntryRepository: Repository<LedgerEntry>,
    @InjectRepository(JournalEntry)
    private readonly journalRepository: Repository<JournalEntry>,
    private readonly dataSource: DataSource,
  ) {}

  async createUserLiabilityAccount(walletId: string, userId: string): Promise<Account> {
    this.logger.warn('createUserLiabilityAccount: Stub implementation - needs to be updated for new schema');
    throw new Error('Ledger service needs to be reimplemented for new schema');
  }

  async createMerchantAccount(merchantId: string): Promise<Account> {
    this.logger.warn('createMerchantAccount: Stub implementation - needs to be updated for new schema');
    throw new Error('Ledger service needs to be reimplemented for new schema');
  }

  async recordTopUp(
    walletId: string,
    amount: number,
    currency: string,
    reference: string,
    paymentMethod: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    this.logger.warn('recordTopUp: Stub implementation - needs to be updated for new schema');
    throw new Error('Ledger service needs to be reimplemented for new schema');
  }

  async recordAuthorization(
    transactionId: string,
    userWalletId: string,
    merchantId: string,
    amount: number,
    currency: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    this.logger.warn('recordAuthorization: Stub implementation - needs to be updated for new schema');
    throw new Error('Ledger service needs to be reimplemented for new schema');
  }

  async recordCapture(
    transactionId: string,
    userWalletId: string,
    merchantId: string,
    amount: number,
    feeAmount: number,
    currency: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    this.logger.warn('recordCapture: Stub implementation - needs to be updated for new schema');
    throw new Error('Ledger service needs to be reimplemented for new schema');
  }

  async recordRefund(
    transactionId: string,
    userWalletId: string,
    merchantId: string,
    amount: number,
    currency: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    this.logger.warn('recordRefund: Stub implementation - needs to be updated for new schema');
    throw new Error('Ledger service needs to be reimplemented for new schema');
  }

  async recordSettlement(
    batchId: string,
    merchantId: string,
    amount: number,
    currency: string,
    payoutReference: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    this.logger.warn('recordSettlement: Stub implementation - needs to be updated for new schema');
    throw new Error('Ledger service needs to be reimplemented for new schema');
  }

  async getAccountBalance(accountId: string): Promise<number> {
    // This method can work with the current schema
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    // Note: Account entity doesn't have balance field in current schema
    // Would need to calculate from ledger entries
    this.logger.warn('getAccountBalance: Needs reimplementation - balance must be calculated from entries');
    return 0;
  }

  async getAccountEntries(
    accountId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<LedgerEntry[]> {
    return this.ledgerEntryRepository.find({
      where: { accountId },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }

  async getJournalsByReference(referenceId: string): Promise<JournalEntry[]> {
    return this.journalRepository.find({
      where: { referenceId },
      order: { createdAt: 'ASC' },
    });
  }

  async verifyTrialBalance(): Promise<{
    balanced: boolean;
    totalDebits: number;
    totalCredits: number;
  }> {
    const result = await this.ledgerEntryRepository
      .createQueryBuilder('entry')
      .select([
        'SUM(CASE WHEN entry.entry_type = :debit THEN entry.amount ELSE 0 END) as total_debits',
        'SUM(CASE WHEN entry.entry_type = :credit THEN entry.amount ELSE 0 END) as total_credits',
      ])
      .setParameter('debit', LedgerEntryType.DEBIT)
      .setParameter('credit', LedgerEntryType.CREDIT)
      .getRawOne();

    const totalDebits = Number(result?.total_debits) || 0;
    const totalCredits = Number(result?.total_credits) || 0;

    return {
      balanced: Math.abs(totalDebits - totalCredits) < 0.01,
      totalDebits,
      totalCredits,
    };
  }
}
