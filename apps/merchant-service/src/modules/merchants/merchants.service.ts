import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant, MerchantStatus, Terminal } from '@payment-system/database';

@Injectable()
export class MerchantsService {
  private readonly logger = new Logger(MerchantsService.name);

  constructor(
    @InjectRepository(Merchant)
    private readonly merchantRepository: Repository<Merchant>,
    @InjectRepository(Terminal)
    private readonly terminalRepository: Repository<Terminal>,
  ) {}

  async createMerchant(data: Partial<Merchant>): Promise<Merchant> {
    const merchant = this.merchantRepository.create({
      ...data,
      status: MerchantStatus.PENDING,
    });
    await this.merchantRepository.save(merchant);
    this.logger.log(`Merchant created: ${merchant.id}`);
    return merchant;
  }

  async getMerchant(id: string): Promise<Merchant> {
    const merchant = await this.merchantRepository.findOne({ where: { id } });
    if (!merchant) throw new NotFoundException('Merchant not found');
    return merchant;
  }

  async activateMerchant(id: string): Promise<Merchant> {
    const merchant = await this.getMerchant(id);
    merchant.status = MerchantStatus.ACTIVE;
    merchant.activatedAt = new Date();
    await this.merchantRepository.save(merchant);
    this.logger.log(`Merchant activated: ${id}`);
    return merchant;
  }

  async suspendMerchant(id: string, reason: string): Promise<Merchant> {
    const merchant = await this.getMerchant(id);
    merchant.status = MerchantStatus.SUSPENDED;
    merchant.suspendedAt = new Date();
    merchant.suspendedReason = reason;
    await this.merchantRepository.save(merchant);
    this.logger.warn(`Merchant suspended: ${id}, reason: ${reason}`);
    return merchant;
  }

  async registerTerminal(merchantId: string, data: Partial<Terminal>): Promise<Terminal> {
    const merchant = await this.getMerchant(merchantId);
    const terminal = this.terminalRepository.create({
      ...data,
      merchantId: merchant.id,
      status: 'ACTIVE',
    });
    await this.terminalRepository.save(terminal);
    return terminal;
  }

  async getMerchantTerminals(merchantId: string): Promise<Terminal[]> {
    return this.terminalRepository.find({ where: { merchantId } });
  }
}
