import { Controller, Get, Put, Post, All, Body, HttpCode, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, IsNumber } from 'class-validator';
import { Response } from 'express';
import { SettingsService } from './settings.service';

class UpdateSettingsDto {
  // Monime Config
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  monimeAccessToken?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  monimeSpaceId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  monimeWebhookSecret?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  monimeSourceAccountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  monimePayoutAccountId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  monimeEnabled?: boolean;

  // URL Configuration
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  backendUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  frontendUrl?: string;

  // Withdrawal Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  withdrawalMobileMoneyEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  withdrawalBankTransferEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minWithdrawalAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxWithdrawalAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  dailyWithdrawalLimit?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  withdrawalFeePercent?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  withdrawalFeeFlat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  withdrawalRequirePin?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  withdrawalAutoApproveUnder?: number;

  // Deposit Settings
  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  depositCheckoutEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  depositPaymentCodeEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  depositMobileMoneyEnabled?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  minDepositAmount?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  maxDepositAmount?: number;
}

class TestCheckoutDto {
  @ApiProperty()
  @IsString()
  accessToken: string;

  @ApiProperty()
  @IsString()
  spaceId: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  successUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  cancelUrl?: string;
}

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get payment settings' })
  @ApiResponse({ status: 200, description: 'Payment settings returned' })
  async getSettings() {
    const settings = await this.settingsService.getSettings();

    // Transform to frontend format
    return {
      monimeConfig: {
        accessToken: settings.monimeAccessToken || '',
        spaceId: settings.monimeSpaceId || '',
        webhookSecret: settings.monimeWebhookSecret || '',
        sourceAccountId: settings.monimeSourceAccountId || '',
        payoutAccountId: settings.monimePayoutAccountId || '',
        isEnabled: settings.monimeEnabled,
        backendUrl: settings.backendUrl || '',
        frontendUrl: settings.frontendUrl || '',
      },
      withdrawalSettings: {
        mobileMoneyEnabled: settings.withdrawalMobileMoneyEnabled,
        bankTransferEnabled: settings.withdrawalBankTransferEnabled,
        minWithdrawalAmount: Number(settings.minWithdrawalAmount),
        maxWithdrawalAmount: Number(settings.maxWithdrawalAmount),
        dailyWithdrawalLimit: Number(settings.dailyWithdrawalLimit),
        withdrawalFeePercent: Number(settings.withdrawalFeePercent),
        withdrawalFeeFlat: Number(settings.withdrawalFeeFlat),
        requirePin: settings.withdrawalRequirePin,
        autoApproveUnder: Number(settings.withdrawalAutoApproveUnder),
      },
      depositSettings: {
        checkoutSessionEnabled: settings.depositCheckoutEnabled,
        paymentCodeEnabled: settings.depositPaymentCodeEnabled,
        mobileMoneyEnabled: settings.depositMobileMoneyEnabled,
        minDepositAmount: Number(settings.minDepositAmount),
        maxDepositAmount: Number(settings.maxDepositAmount),
      },
    };
  }

  @Put()
  @ApiOperation({ summary: 'Update payment settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(@Body() dto: UpdateSettingsDto) {
    const settings = await this.settingsService.updateSettings(dto);

    return {
      success: true,
      message: 'Settings updated successfully',
      updatedAt: settings.updatedAt,
    };
  }

  @Post('test-checkout')
  @HttpCode(200)
  @ApiOperation({ summary: 'Create test checkout session' })
  @ApiResponse({ status: 200, description: 'Checkout session created' })
  async testCheckout(@Body() dto: TestCheckoutDto) {
    try {
      // Generate idempotency key
      const idempotencyKey = `test_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      // Get URLs from settings first, fallback to env
      const settings = await this.settingsService.getSettings();
      const baseUrl = settings.backendUrl || process.env.APP_URL || 'http://localhost:3002';
      const frontendUrl = settings.frontendUrl || process.env.FRONTEND_URL || 'http://localhost:5173';

      const successUrl = dto.successUrl || `${baseUrl}/settings/checkout/success?sessionId={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(frontendUrl + '/payment/success')}`;
      const cancelUrl = dto.cancelUrl || `${baseUrl}/settings/checkout/cancel?sessionId={CHECKOUT_SESSION_ID}&redirect=${encodeURIComponent(frontendUrl + '/payment/cancel')}`;

      const response = await fetch('https://api.monime.io/v1/checkout-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${dto.accessToken}`,
          'Content-Type': 'application/json',
          'Monime-Space-Id': dto.spaceId,
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify({
          name: 'Test Payment - Admin Dashboard',
          lineItems: [
            {
              type: 'custom',
              name: 'Test Payment',
              price: {
                currency: dto.currency || 'SLE',
                value: dto.amount,
              },
              quantity: 1,
              description: 'Test payment from admin dashboard',
            },
          ],
          successUrl,
          cancelUrl,
          metadata: {
            type: 'test_payment',
            initiated_by: 'admin_dashboard',
            idempotencyKey,
          },
        }),
      });

      const data = await response.json() as any;

      if (!response.ok || !data.success) {
        return {
          success: false,
          error: data?.error?.message || data?.message || 'Failed to create checkout session',
          details: data,
        };
      }

      return {
        success: true,
        url: data?.result?.redirectUrl,
        sessionId: data?.result?.id,
        orderNumber: data?.result?.orderNumber,
        data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to connect to Monime API',
      };
    }
  }

  @All('checkout/success')
  @ApiOperation({ summary: 'Handle checkout success callback (supports GET and POST)' })
  async checkoutSuccess(
    @Query('sessionId') sessionId: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    try {
      // Get settings to retrieve API credentials
      const settings = await this.settingsService.getSettings();

      // Verify the session with Monime API
      const response = await fetch(`https://api.monime.io/v1/checkout-sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.monimeAccessToken}`,
          'Monime-Space-Id': settings.monimeSpaceId,
        },
      });

      const data = await response.json() as any;

      // Build redirect URL with session data
      const redirectUrl = new URL(redirect || 'http://localhost:5173/payment/success');
      redirectUrl.searchParams.set('sessionId', sessionId);
      redirectUrl.searchParams.set('status', data?.result?.status || 'unknown');

      if (data?.result?.lineItems?.data?.[0]) {
        const lineItem = data.result.lineItems.data[0];
        redirectUrl.searchParams.set('amount', lineItem.price?.value || '0');
        redirectUrl.searchParams.set('currency', lineItem.price?.currency || 'SLE');
      }

      if (data?.result?.orderNumber) {
        redirectUrl.searchParams.set('orderNumber', data.result.orderNumber);
      }

      return res.redirect(redirectUrl.toString());
    } catch (error: any) {
      // Redirect with error
      const redirectUrl = new URL(redirect || 'http://localhost:5173/payment/success');
      redirectUrl.searchParams.set('sessionId', sessionId);
      redirectUrl.searchParams.set('error', error.message || 'Failed to verify session');
      return res.redirect(redirectUrl.toString());
    }
  }

  @All('checkout/cancel')
  @ApiOperation({ summary: 'Handle checkout cancel callback (supports GET and POST)' })
  async checkoutCancel(
    @Query('sessionId') sessionId: string,
    @Query('redirect') redirect: string,
    @Res() res: Response,
  ) {
    // Redirect to cancel page
    const redirectUrl = new URL(redirect || 'http://localhost:5173/payment/cancel');
    redirectUrl.searchParams.set('sessionId', sessionId);
    redirectUrl.searchParams.set('status', 'cancelled');

    return res.redirect(redirectUrl.toString());
  }
}
