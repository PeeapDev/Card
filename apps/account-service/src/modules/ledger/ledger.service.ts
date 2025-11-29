import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import {
  Account,
  LedgerEntry,
  JournalEntry,
  AccountType,
  LedgerEntryType,
  JournalType,
} from '@payment-system/database';
import { generateTransactionId } from '@payment-system/common';

// System accounts - created at bootstrap
const SYSTEM_ACCOUNTS = {
  CASH: 'system:cash',
  CARD_RECEIVABLE: 'system:card_receivable',
  MERCHANT_PAYABLE: 'system:merchant_payable',
  FEE_REVENUE: 'system:fee_revenue',
  INTERCHANGE_REVENUE: 'system:interchange_revenue',
  SETTLEMENT_CLEARING: 'system:settlement_clearing',
  SUSPENSE: 'system:suspense',
};

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
    const account = this.accountRepository.create({
      code: `user:${userId}:wallet:${walletId}`,
      name: `User ${userId} Wallet`,
      type: AccountType.LIABILITY,
      balance: 0,
      walletId,
      userId,
      isSystem: false,
    });

    await this.accountRepository.save(account);
    this.logger.debug(`Created user liability account: ${account.code}`);

    return account;
  }

  async createMerchantAccount(merchantId: string): Promise<Account> {
    const account = this.accountRepository.create({
      code: `merchant:${merchantId}`,
      name: `Merchant ${merchantId} Account`,
      type: AccountType.LIABILITY,
      balance: 0,
      merchantId,
      isSystem: false,
    });

    await this.accountRepository.save(account);
    this.logger.debug(`Created merchant account: ${account.code}`);

    return account;
  }

  async recordTopUp(
    walletId: string,
    amount: number,
    currency: string,
    reference: string,
    paymentMethod: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    const execute = async (em: EntityManager) => {
      // Get user's wallet account
      const userAccount = await em.findOne(Account, {
        where: { walletId },
      });

      if (!userAccount) {
        throw new NotFoundException('User account not found');
      }

      // Get cash account (asset)
      const cashAccount = await this.getOrCreateSystemAccount(
        SYSTEM_ACCOUNTS.CASH,
        AccountType.ASSET,
        em,
      );

      // Create journal entry
      const journal = em.create(JournalEntry, {
        journalNumber: generateTransactionId(),
        type: JournalType.TOP_UP,
        description: `Top-up via ${paymentMethod}: ${reference}`,
        reference,
        currencyCode: currency,
        totalAmount: amount,
        postedAt: new Date(),
      });

      await em.save(journal);

      // Double-entry: Debit Cash, Credit User Liability
      await this.createEntry(
        journal.id,
        cashAccount.id,
        LedgerEntryType.DEBIT,
        amount,
        currency,
        em,
      );

      await this.createEntry(
        journal.id,
        userAccount.id,
        LedgerEntryType.CREDIT,
        amount,
        currency,
        em,
      );

      // Update account balances
      cashAccount.balance = Number(cashAccount.balance) + amount;
      userAccount.balance = Number(userAccount.balance) + amount;

      await em.save([cashAccount, userAccount]);

      this.logger.log(`Recorded top-up: ${journal.journalNumber}`);

      return journal;
    };

    if (manager) {
      return execute(manager);
    }
    return this.dataSource.transaction(execute);
  }

  async recordAuthorization(
    transactionId: string,
    userWalletId: string,
    merchantId: string,
    amount: number,
    currency: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    const execute = async (em: EntityManager) => {
      const userAccount = await em.findOne(Account, {
        where: { walletId: userWalletId },
      });

      if (!userAccount) {
        throw new NotFoundException('User account not found');
      }

      // Authorization creates a memo entry (off-balance sheet hold)
      const journal = em.create(JournalEntry, {
        journalNumber: generateTransactionId(),
        type: JournalType.AUTHORIZATION,
        description: `Authorization for transaction ${transactionId}`,
        reference: transactionId,
        currencyCode: currency,
        totalAmount: amount,
        postedAt: new Date(),
        metadata: {
          transactionId,
          merchantId,
          userWalletId,
        },
      });

      await em.save(journal);

      this.logger.log(`Recorded authorization: ${journal.journalNumber}`);

      return journal;
    };

    if (manager) {
      return execute(manager);
    }
    return this.dataSource.transaction(execute);
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
    const execute = async (em: EntityManager) => {
      const userAccount = await em.findOne(Account, {
        where: { walletId: userWalletId },
      });

      if (!userAccount) {
        throw new NotFoundException('User account not found');
      }

      let merchantAccount = await em.findOne(Account, {
        where: { merchantId },
      });

      if (!merchantAccount) {
        merchantAccount = await this.createMerchantAccountInTx(merchantId, em);
      }

      const feeRevenueAccount = await this.getOrCreateSystemAccount(
        SYSTEM_ACCOUNTS.FEE_REVENUE,
        AccountType.REVENUE,
        em,
      );

      const netAmount = amount - feeAmount;

      // Create journal entry
      const journal = em.create(JournalEntry, {
        journalNumber: generateTransactionId(),
        type: JournalType.CAPTURE,
        description: `Capture for transaction ${transactionId}`,
        reference: transactionId,
        currencyCode: currency,
        totalAmount: amount,
        postedAt: new Date(),
        metadata: {
          transactionId,
          merchantId,
          userWalletId,
          feeAmount,
          netAmount,
        },
      });

      await em.save(journal);

      // Double-entry:
      // 1. Debit User Liability (reduce what we owe user)
      await this.createEntry(
        journal.id,
        userAccount.id,
        LedgerEntryType.DEBIT,
        amount,
        currency,
        em,
      );

      // 2. Credit Merchant Payable (increase what we owe merchant)
      await this.createEntry(
        journal.id,
        merchantAccount.id,
        LedgerEntryType.CREDIT,
        netAmount,
        currency,
        em,
      );

      // 3. Credit Fee Revenue
      await this.createEntry(
        journal.id,
        feeRevenueAccount.id,
        LedgerEntryType.CREDIT,
        feeAmount,
        currency,
        em,
      );

      // Update account balances
      userAccount.balance = Number(userAccount.balance) - amount;
      merchantAccount.balance = Number(merchantAccount.balance) + netAmount;
      feeRevenueAccount.balance = Number(feeRevenueAccount.balance) + feeAmount;

      await em.save([userAccount, merchantAccount, feeRevenueAccount]);

      this.logger.log(`Recorded capture: ${journal.journalNumber}`);

      return journal;
    };

    if (manager) {
      return execute(manager);
    }
    return this.dataSource.transaction(execute);
  }

  async recordRefund(
    transactionId: string,
    userWalletId: string,
    merchantId: string,
    amount: number,
    currency: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    const execute = async (em: EntityManager) => {
      const userAccount = await em.findOne(Account, {
        where: { walletId: userWalletId },
      });

      if (!userAccount) {
        throw new NotFoundException('User account not found');
      }

      const merchantAccount = await em.findOne(Account, {
        where: { merchantId },
      });

      if (!merchantAccount) {
        throw new NotFoundException('Merchant account not found');
      }

      // Create journal entry
      const journal = em.create(JournalEntry, {
        journalNumber: generateTransactionId(),
        type: JournalType.REFUND,
        description: `Refund for transaction ${transactionId}`,
        reference: transactionId,
        currencyCode: currency,
        totalAmount: amount,
        postedAt: new Date(),
        metadata: {
          transactionId,
          merchantId,
          userWalletId,
        },
      });

      await em.save(journal);

      // Double-entry (reverse of capture):
      // 1. Credit User Liability (increase what we owe user)
      await this.createEntry(
        journal.id,
        userAccount.id,
        LedgerEntryType.CREDIT,
        amount,
        currency,
        em,
      );

      // 2. Debit Merchant Payable (reduce what we owe merchant)
      await this.createEntry(
        journal.id,
        merchantAccount.id,
        LedgerEntryType.DEBIT,
        amount,
        currency,
        em,
      );

      // Update account balances
      userAccount.balance = Number(userAccount.balance) + amount;
      merchantAccount.balance = Number(merchantAccount.balance) - amount;

      await em.save([userAccount, merchantAccount]);

      this.logger.log(`Recorded refund: ${journal.journalNumber}`);

      return journal;
    };

    if (manager) {
      return execute(manager);
    }
    return this.dataSource.transaction(execute);
  }

  async recordSettlement(
    batchId: string,
    merchantId: string,
    amount: number,
    currency: string,
    payoutReference: string,
    manager?: EntityManager,
  ): Promise<JournalEntry> {
    const execute = async (em: EntityManager) => {
      const merchantAccount = await em.findOne(Account, {
        where: { merchantId },
      });

      if (!merchantAccount) {
        throw new NotFoundException('Merchant account not found');
      }

      const cashAccount = await this.getOrCreateSystemAccount(
        SYSTEM_ACCOUNTS.CASH,
        AccountType.ASSET,
        em,
      );

      // Create journal entry
      const journal = em.create(JournalEntry, {
        journalNumber: generateTransactionId(),
        type: JournalType.SETTLEMENT,
        description: `Settlement batch ${batchId}`,
        reference: payoutReference,
        currencyCode: currency,
        totalAmount: amount,
        postedAt: new Date(),
        metadata: {
          batchId,
          merchantId,
          payoutReference,
        },
      });

      await em.save(journal);

      // Double-entry:
      // 1. Debit Merchant Payable (reduce what we owe merchant)
      await this.createEntry(
        journal.id,
        merchantAccount.id,
        LedgerEntryType.DEBIT,
        amount,
        currency,
        em,
      );

      // 2. Credit Cash (reduce our cash)
      await this.createEntry(
        journal.id,
        cashAccount.id,
        LedgerEntryType.CREDIT,
        amount,
        currency,
        em,
      );

      // Update account balances
      merchantAccount.balance = Number(merchantAccount.balance) - amount;
      cashAccount.balance = Number(cashAccount.balance) - amount;

      await em.save([merchantAccount, cashAccount]);

      this.logger.log(`Recorded settlement: ${journal.journalNumber}`);

      return journal;
    };

    if (manager) {
      return execute(manager);
    }
    return this.dataSource.transaction(execute);
  }

  async getAccountBalance(accountId: string): Promise<number> {
    const account = await this.accountRepository.findOne({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    return Number(account.balance);
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
      relations: ['journal'],
    });
  }

  async getJournalsByReference(reference: string): Promise<JournalEntry[]> {
    return this.journalRepository.find({
      where: { reference },
      relations: ['entries'],
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

    const totalDebits = Number(result.total_debits) || 0;
    const totalCredits = Number(result.total_credits) || 0;

    return {
      balanced: Math.abs(totalDebits - totalCredits) < 0.01, // Allow for floating point
      totalDebits,
      totalCredits,
    };
  }

  private async createEntry(
    journalId: string,
    accountId: string,
    entryType: LedgerEntryType,
    amount: number,
    currency: string,
    manager: EntityManager,
  ): Promise<LedgerEntry> {
    const entry = manager.create(LedgerEntry, {
      journalId,
      accountId,
      entryType,
      amount,
      currencyCode: currency,
    });

    await manager.save(entry);
    return entry;
  }

  private async getOrCreateSystemAccount(
    code: string,
    type: AccountType,
    manager: EntityManager,
  ): Promise<Account> {
    let account = await manager.findOne(Account, {
      where: { code },
    });

    if (!account) {
      account = manager.create(Account, {
        code,
        name: code.replace('system:', '').replace('_', ' ').toUpperCase(),
        type,
        balance: 0,
        isSystem: true,
      });

      await manager.save(account);
      this.logger.log(`Created system account: ${code}`);
    }

    return account;
  }

  private async createMerchantAccountInTx(
    merchantId: string,
    manager: EntityManager,
  ): Promise<Account> {
    const account = manager.create(Account, {
      code: `merchant:${merchantId}`,
      name: `Merchant ${merchantId} Account`,
      type: AccountType.LIABILITY,
      balance: 0,
      merchantId,
      isSystem: false,
    });

    await manager.save(account);
    return account;
  }
}
