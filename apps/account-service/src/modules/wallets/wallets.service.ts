import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { Wallet, WalletStatus, WalletOwnerType } from '@payment-system/database';
import { LedgerService } from '../ledger/ledger.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { TopUpWalletDto } from './dto/topup-wallet.dto';

@Injectable()
export class WalletsService {
  private readonly logger = new Logger(WalletsService.name);

  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    private readonly dataSource: DataSource,
    private readonly ledgerService: LedgerService,
  ) {}

  async createWallet(userId: string, dto: CreateWalletDto): Promise<Wallet> {
    // Check if user already has a wallet for this currency
    const existingWallet = await this.walletRepository.findOne({
      where: { ownerId: userId, ownerType: WalletOwnerType.USER, currencyCode: dto.currencyCode },
    });

    if (existingWallet) {
      throw new ConflictException(
        `Wallet for ${dto.currencyCode} already exists`,
      );
    }

    const wallet = this.walletRepository.create({
      ownerId: userId,
      ownerType: WalletOwnerType.USER,
      externalId: `wallet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      currencyCode: dto.currencyCode,
      availableBalance: 0,
      heldBalance: 0,
      status: WalletStatus.ACTIVE,
    });

    await this.walletRepository.save(wallet);

    // Create corresponding ledger account
    await this.ledgerService.createUserLiabilityAccount(wallet.id, userId);

    this.logger.log(`Wallet created: ${wallet.id} for user ${userId}`);

    return wallet;
  }

  async getWallet(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { id: walletId },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getWalletByUser(userId: string, currencyCode: string = 'USD'): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { ownerId: userId, ownerType: WalletOwnerType.USER, currencyCode },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    return wallet;
  }

  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { ownerId: userId, ownerType: WalletOwnerType.USER },
      order: { currencyCode: 'ASC' },
    });
  }

  async topUp(
    walletId: string,
    dto: TopUpWalletDto,
    operatorId?: string,
  ): Promise<Wallet> {
    return this.dataSource.transaction(async (manager) => {
      // Lock wallet row for update
      const wallet = await manager.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException('Wallet is not active');
      }

      const previousBalance = Number(wallet.availableBalance);
      wallet.availableBalance = previousBalance + dto.amount;

      await manager.save(wallet);

      // Record in ledger
      await this.ledgerService.recordTopUp(
        wallet.id,
        dto.amount,
        wallet.currencyCode,
        dto.reference,
        dto.paymentMethod,
        manager,
      );

      this.logger.log(
        `Wallet ${walletId} topped up: ${dto.amount} ${wallet.currencyCode}`,
      );

      return wallet;
    });
  }

  async holdFunds(
    walletId: string,
    amount: number,
    transactionId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const execute = async (em: EntityManager) => {
      const wallet = await em.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      if (wallet.status !== WalletStatus.ACTIVE) {
        throw new BadRequestException('Wallet is not active');
      }

      const availableBalance = Number(wallet.availableBalance);
      if (availableBalance < amount) {
        throw new BadRequestException('Insufficient funds');
      }

      wallet.availableBalance = availableBalance - amount;
      wallet.heldBalance = Number(wallet.heldBalance) + amount;

      await em.save(wallet);

      this.logger.debug(
        `Held ${amount} for transaction ${transactionId} on wallet ${walletId}`,
      );
    };

    if (manager) {
      await execute(manager);
    } else {
      await this.dataSource.transaction(execute);
    }
  }

  async releaseHold(
    walletId: string,
    amount: number,
    transactionId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const execute = async (em: EntityManager) => {
      const wallet = await em.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const heldBalance = Number(wallet.heldBalance);
      if (heldBalance < amount) {
        throw new BadRequestException('Invalid hold amount');
      }

      wallet.heldBalance = heldBalance - amount;
      wallet.availableBalance = Number(wallet.availableBalance) + amount;

      await em.save(wallet);

      this.logger.debug(
        `Released hold ${amount} for transaction ${transactionId} on wallet ${walletId}`,
      );
    };

    if (manager) {
      await execute(manager);
    } else {
      await this.dataSource.transaction(execute);
    }
  }

  async captureHold(
    walletId: string,
    amount: number,
    transactionId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const execute = async (em: EntityManager) => {
      const wallet = await em.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      const heldBalance = Number(wallet.heldBalance);
      if (heldBalance < amount) {
        throw new BadRequestException('Invalid hold amount');
      }

      // Move from held to captured (deducted)
      wallet.heldBalance = heldBalance - amount;

      await em.save(wallet);

      this.logger.debug(
        `Captured ${amount} for transaction ${transactionId} on wallet ${walletId}`,
      );
    };

    if (manager) {
      await execute(manager);
    } else {
      await this.dataSource.transaction(execute);
    }
  }

  async refund(
    walletId: string,
    amount: number,
    transactionId: string,
    manager?: EntityManager,
  ): Promise<void> {
    const execute = async (em: EntityManager) => {
      const wallet = await em.findOne(Wallet, {
        where: { id: walletId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new NotFoundException('Wallet not found');
      }

      wallet.availableBalance = Number(wallet.availableBalance) + amount;

      await em.save(wallet);

      this.logger.debug(
        `Refunded ${amount} for transaction ${transactionId} to wallet ${walletId}`,
      );
    };

    if (manager) {
      await execute(manager);
    } else {
      await this.dataSource.transaction(execute);
    }
  }

  async suspendWallet(walletId: string, reason: string): Promise<Wallet> {
    const wallet = await this.getWallet(walletId);

    wallet.status = WalletStatus.FROZEN;
    await this.walletRepository.save(wallet);

    this.logger.warn(`Wallet ${walletId} suspended: ${reason}`);

    return wallet;
  }

  async reactivateWallet(walletId: string): Promise<Wallet> {
    const wallet = await this.getWallet(walletId);

    wallet.status = WalletStatus.ACTIVE;
    await this.walletRepository.save(wallet);

    this.logger.log(`Wallet ${walletId} reactivated`);

    return wallet;
  }
}
