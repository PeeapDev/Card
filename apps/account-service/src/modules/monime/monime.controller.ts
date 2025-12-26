import { Controller, Post, Get, All, Body, Param, Headers, Query, HttpCode, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiProperty } from '@nestjs/swagger';
import { Response } from 'express';
import { MonimeService } from './monime.service';
import { InitiateDepositDto, DepositResponseDto } from './dto/deposit.dto';
import { InitiateWithdrawDto, WithdrawResponseDto } from './dto/withdraw.dto';
import { MonimeTransactionType } from './entities/monime-transaction.entity';

class TestCheckoutDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  spaceId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ default: 'SLE' })
  currency?: string;

  @ApiProperty({ required: false })
  successUrl?: string;

  @ApiProperty({ required: false })
  cancelUrl?: string;
}

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
  async listBanks(@Query('country') country?: string) {
    return this.monimeService.listBanks(country);
  }

  @Get('deposits')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all deposits (admin)' })
  async getAllDeposits(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.monimeService.getAllDeposits(
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
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

  @All('deposit/success')
  @ApiOperation({ summary: 'Handle deposit success callback (supports GET and POST)' })
  async depositSuccess(
    @Query('sessionId') sessionId: string,
    @Query('walletId') walletId: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    try {
      // Complete the deposit by verifying session and crediting wallet
      const result = await this.monimeService.completeDepositFromCallback(sessionId, walletId);

      // Build redirect URL with deposit data
      const redirectUrl = new URL(redirect || 'http://localhost:5173/deposit/success');
      redirectUrl.searchParams.set('sessionId', sessionId);
      redirectUrl.searchParams.set('walletId', walletId);
      redirectUrl.searchParams.set('status', result.status);
      redirectUrl.searchParams.set('amount', result.amount.toString());
      redirectUrl.searchParams.set('currency', result.currency);
      if (result.newBalance !== undefined) {
        redirectUrl.searchParams.set('newBalance', result.newBalance.toString());
      }

      return res.redirect(redirectUrl.toString());
    } catch (error: any) {
      // Redirect with error
      const redirectUrl = new URL(redirect || 'http://localhost:5173/deposit/success');
      redirectUrl.searchParams.set('sessionId', sessionId);
      redirectUrl.searchParams.set('walletId', walletId);
      redirectUrl.searchParams.set('error', error.message || 'Failed to complete deposit');
      return res.redirect(redirectUrl.toString());
    }
  }

  @All('deposit/cancel')
  @ApiOperation({ summary: 'Handle deposit cancel callback (supports GET and POST)' })
  async depositCancel(
    @Query('sessionId') sessionId: string,
    @Query('walletId') walletId: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    // Mark deposit as cancelled
    await this.monimeService.cancelDeposit(sessionId);

    // Redirect to cancel page
    const redirectUrl = new URL(redirect || 'http://localhost:5173/deposit/cancel');
    redirectUrl.searchParams.set('sessionId', sessionId);
    redirectUrl.searchParams.set('walletId', walletId);
    redirectUrl.searchParams.set('status', 'cancelled');

    return res.redirect(redirectUrl.toString());
  }

  @Post('test-checkout')
  @ApiOperation({ summary: 'Create a test checkout session (admin only)' })
  @ApiResponse({ status: 201, description: 'Checkout session created' })
  async testCheckout(@Body() dto: TestCheckoutDto) {
    const response = await fetch('https://api.monime.io/v1/checkout-sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${dto.accessToken}`,
        'Content-Type': 'application/json',
        'Monime-Space-Id': dto.spaceId,
      },
      body: JSON.stringify({
        amount: dto.amount,
        currency: dto.currency || 'SLE',
        description: 'Test Payment - Admin Dashboard',
        success_url: dto.successUrl || 'https://example.com/success',
        cancel_url: dto.cancelUrl || 'https://example.com/cancel',
        metadata: {
          type: 'test_payment',
          initiated_by: 'admin_dashboard',
        },
      }),
    });

    const data = await response.json() as any;

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || data?.error || 'Failed to create checkout session',
        details: data,
      };
    }

    return {
      success: true,
      url: data?.url,
      sessionId: data?.id,
      data,
    };
  }
}
