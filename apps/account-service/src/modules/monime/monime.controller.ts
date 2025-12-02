import { Controller, Post, Get, Body, Param, Headers, Query, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MonimeService } from './monime.service';
import { InitiateDepositDto, DepositResponseDto } from './dto/deposit.dto';
import { InitiateWithdrawDto, WithdrawResponseDto } from './dto/withdraw.dto';
import { MonimeTransactionType } from './entities/monime-transaction.entity';

@ApiTags('Monime Payments')
@Controller('monime')
export class MonimeController {
  constructor(private readonly monimeService: MonimeService) {}

  @Post('deposit')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a deposit via Monime' })
  @ApiResponse({ status: 201, type: DepositResponseDto })
  async initiateDeposit(
    @Headers('x-user-id') userId: string,
    @Body() dto: InitiateDepositDto,
  ): Promise<DepositResponseDto> {
    return this.monimeService.initiateDeposit(userId, dto);
  }

  @Post('withdraw')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initiate a withdrawal/cashout via Monime' })
  @ApiResponse({ status: 201, type: WithdrawResponseDto })
  async initiateWithdraw(
    @Headers('x-user-id') userId: string,
    @Body() dto: InitiateWithdrawDto,
  ): Promise<WithdrawResponseDto> {
    return this.monimeService.initiateWithdraw(userId, dto);
  }

  @Get('transactions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user Monime transactions' })
  async getTransactions(
    @Headers('x-user-id') userId: string,
    @Query('type') type?: 'DEPOSIT' | 'WITHDRAWAL',
  ) {
    const txType = type === 'DEPOSIT' ? MonimeTransactionType.DEPOSIT :
                   type === 'WITHDRAWAL' ? MonimeTransactionType.WITHDRAWAL : undefined;
    return this.monimeService.getUserTransactions(userId, txType);
  }

  @Get('transactions/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get transaction by ID' })
  async getTransaction(@Param('id') id: string) {
    return this.monimeService.getTransaction(id);
  }

  @Get('banks')
  @ApiOperation({ summary: 'List available banks for withdrawal' })
  async listBanks() {
    return this.monimeService.listBanks();
  }

  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Monime webhook handler' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-monime-signature') signature: string,
  ) {
    await this.monimeService.handleWebhook(payload, signature);
    return { received: true };
  }
}
