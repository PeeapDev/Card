/**
 * Peeap Pay P2P Transfer Controller
 */

import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  P2PTransferService,
  P2PTransferRequest,
  FeeConfig,
  TransferLimits,
} from './p2p-transfer.service';

interface TransferDto {
  recipientId?: string;
  recipientWalletId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
  amount: number;
  currency: string;
  note?: string;
  method?: 'wallet' | 'qr' | 'nfc' | 'phone' | 'link';
}

interface FeeCalculationDto {
  amount: number;
  userType?: string;
}

interface UpdateFeeDto {
  userType: string;
  config: FeeConfig;
}

interface UpdateLimitsDto {
  userType: string;
  limits: TransferLimits;
}

@Controller('p2p')
export class P2PTransferController {
  constructor(private readonly p2pService: P2PTransferService) {}

  /**
   * Send money P2P
   */
  @Post('send')
  @HttpCode(HttpStatus.OK)
  async sendMoney(
    @Body() dto: TransferDto,
    @Headers('x-user-id') userId: string,
    @Headers('x-wallet-id') walletId: string,
    @Headers('x-user-type') userType: string = 'standard',
    @Headers('x-idempotency-key') idempotencyKey?: string
  ) {
    const request: P2PTransferRequest = {
      senderId: userId,
      senderWalletId: walletId,
      recipientId: dto.recipientId,
      recipientWalletId: dto.recipientWalletId,
      recipientPhone: dto.recipientPhone,
      recipientEmail: dto.recipientEmail,
      amount: dto.amount,
      currency: dto.currency,
      note: dto.note,
      method: dto.method || 'wallet',
      idempotencyKey,
    };

    return this.p2pService.processTransfer(request, userType);
  }

  /**
   * Calculate fee for transfer
   */
  @Post('calculate-fee')
  @HttpCode(HttpStatus.OK)
  calculateFee(@Body() dto: FeeCalculationDto) {
    const fee = this.p2pService.calculateFee(dto.amount, dto.userType);
    const netAmount = dto.amount - fee;

    return {
      amount: dto.amount,
      fee,
      netAmount,
      userType: dto.userType || 'standard',
    };
  }

  /**
   * Get transfer limits for user type
   */
  @Get('limits/:userType')
  getLimits(@Param('userType') userType: string) {
    return this.p2pService.getLimits(userType);
  }

  /**
   * Get transaction by ID
   */
  @Get('transaction/:id')
  getTransaction(@Param('id') id: string) {
    const transaction = this.p2pService.getTransaction(id);
    if (!transaction) {
      return { error: 'Transaction not found' };
    }
    return transaction;
  }

  /**
   * Get transactions for user
   */
  @Get('transactions')
  getTransactions(
    @Headers('x-user-id') userId: string,
    @Query('limit') limit?: string
  ) {
    return this.p2pService.getTransactionsForUser(
      userId,
      limit ? parseInt(limit, 10) : 50
    );
  }

  /**
   * Get wallet balance
   */
  @Get('balance/:walletId')
  getBalance(@Param('walletId') walletId: string) {
    return {
      walletId,
      balance: this.p2pService.getWalletBalance(walletId),
    };
  }

  /**
   * Generate transfer link
   */
  @Post('generate-link')
  @HttpCode(HttpStatus.OK)
  generateTransferLink(
    @Body() dto: { amount: number; currency: string; expiresIn?: number },
    @Headers('x-user-id') userId: string
  ) {
    return this.p2pService.generateTransferLink(
      userId,
      dto.amount,
      dto.currency,
      dto.expiresIn
    );
  }

  /**
   * Claim transfer from link
   */
  @Post('claim/:token')
  @HttpCode(HttpStatus.OK)
  async claimTransfer(
    @Param('token') token: string,
    @Headers('x-user-id') userId: string,
    @Headers('x-wallet-id') walletId: string
  ) {
    return this.p2pService.claimTransfer(token, userId, walletId);
  }

  // ============ Admin Endpoints ============

  /**
   * Get all fee configurations (admin)
   */
  @Get('admin/fees')
  getAllFees() {
    const fees = this.p2pService.getAllFeeConfigs();
    const result: Record<string, FeeConfig> = {};
    fees.forEach((config, key) => {
      result[key] = config;
    });
    return result;
  }

  /**
   * Update fee configuration (admin)
   */
  @Put('admin/fees')
  updateFee(@Body() dto: UpdateFeeDto) {
    this.p2pService.updateFeeConfig(dto.userType, dto.config);
    return { success: true, message: `Fee config updated for ${dto.userType}` };
  }

  /**
   * Get all transfer limits (admin)
   */
  @Get('admin/limits')
  getAllLimits() {
    const limits = this.p2pService.getAllLimits();
    const result: Record<string, TransferLimits> = {};
    limits.forEach((config, key) => {
      result[key] = config;
    });
    return result;
  }

  /**
   * Update transfer limits (admin)
   */
  @Put('admin/limits')
  updateLimits(@Body() dto: UpdateLimitsDto) {
    this.p2pService.updateLimits(dto.userType, dto.limits);
    return { success: true, message: `Limits updated for ${dto.userType}` };
  }

  /**
   * Set wallet balance (admin/testing)
   */
  @Put('admin/wallet/:walletId/balance')
  setBalance(
    @Param('walletId') walletId: string,
    @Body() dto: { balance: number }
  ) {
    this.p2pService.setWalletBalance(walletId, dto.balance);
    return {
      success: true,
      walletId,
      balance: dto.balance,
    };
  }
}
