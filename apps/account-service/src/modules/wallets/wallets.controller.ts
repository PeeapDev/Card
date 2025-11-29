import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { TopUpWalletDto } from './dto/topup-wallet.dto';

@ApiTags('Wallets')
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new wallet' })
  @ApiResponse({ status: 201, description: 'Wallet created' })
  async createWallet(
    @Headers('x-user-id') userId: string,
    @Body() dto: CreateWalletDto,
  ) {
    return this.walletsService.createWallet(userId, dto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all wallets for current user' })
  @ApiResponse({ status: 200, description: 'List of wallets' })
  async getUserWallets(@Headers('x-user-id') userId: string) {
    return this.walletsService.getUserWallets(userId);
  }

  @Get(':walletId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiResponse({ status: 200, description: 'Wallet details' })
  async getWallet(@Param('walletId') walletId: string) {
    const wallet = await this.walletsService.getWallet(walletId);
    return {
      id: wallet.id,
      currencyCode: wallet.currencyCode,
      availableBalance: wallet.availableBalance,
      heldBalance: wallet.heldBalance,
      totalBalance: wallet.totalBalance,
      status: wallet.status,
      createdAt: wallet.createdAt,
    };
  }

  @Get(':walletId/balance')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get wallet balance' })
  @ApiResponse({ status: 200, description: 'Wallet balance' })
  async getBalance(@Param('walletId') walletId: string) {
    const wallet = await this.walletsService.getWallet(walletId);
    return {
      available: wallet.availableBalance,
      held: wallet.heldBalance,
      total: wallet.totalBalance,
      currency: wallet.currencyCode,
    };
  }

  @Post(':walletId/topup')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Top up wallet' })
  @ApiResponse({ status: 200, description: 'Wallet topped up' })
  async topUp(
    @Param('walletId') walletId: string,
    @Body() dto: TopUpWalletDto,
    @Headers('x-user-id') userId: string,
  ) {
    const wallet = await this.walletsService.topUp(walletId, dto, userId);
    return {
      id: wallet.id,
      newBalance: wallet.availableBalance,
      currency: wallet.currencyCode,
    };
  }
}
