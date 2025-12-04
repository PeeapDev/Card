import { Controller, Get, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * Quick Checkout Controller
 *
 * Provides simple URL-based checkout for merchants
 * No API integration needed - just redirect users to a URL with query params
 */
@ApiTags('Quick Checkout')
@Controller('checkout/quick')
export class QuickCheckoutController {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Quick checkout - creates session and redirects to hosted page' })
  @ApiQuery({ name: 'merchant_id', required: true, description: 'Merchant ID' })
  @ApiQuery({ name: 'amount', required: true, description: 'Amount in minor units (cents)' })
  @ApiQuery({ name: 'currency', required: false, description: 'Currency code (default: SLE)' })
  @ApiQuery({ name: 'description', required: false, description: 'Payment description' })
  @ApiQuery({ name: 'success_url', required: false, description: 'Success redirect URL' })
  @ApiQuery({ name: 'cancel_url', required: false, description: 'Cancel redirect URL' })
  @ApiQuery({ name: 'merchant_name', required: false, description: 'Merchant name to display' })
  @ApiQuery({ name: 'merchant_logo', required: false, description: 'Merchant logo URL' })
  @ApiQuery({ name: 'brand_color', required: false, description: 'Brand color (hex)' })
  @ApiQuery({ name: 'reference', required: false, description: 'Your order reference' })
  async quickCheckout(
    @Query('merchant_id') merchantId: string,
    @Query('amount') amount: string,
    @Query('currency') currency: string = 'SLE',
    @Query('description') description?: string,
    @Query('success_url') successUrl?: string,
    @Query('cancel_url') cancelUrl?: string,
    @Query('merchant_name') merchantName?: string,
    @Query('merchant_logo') merchantLogo?: string,
    @Query('brand_color') brandColor?: string,
    @Query('reference') reference?: string,
    @Res() res: Response,
  ) {
    try {
      // Validate inputs
      if (!merchantId) {
        throw new HttpException('merchant_id is required', HttpStatus.BAD_REQUEST);
      }

      const amountNum = parseFloat(amount);
      if (!amount || isNaN(amountNum) || amountNum <= 0) {
        throw new HttpException('Valid amount is required', HttpStatus.BAD_REQUEST);
      }

      // Create checkout session
      const merchantServiceUrl = this.configService.get(
        'MERCHANT_SERVICE_URL',
        'http://localhost:3005',
      );

      const sessionData = {
        merchantId,
        amount: amountNum,
        currency: currency.toUpperCase(),
        description: description || 'Payment',
        successUrl: successUrl || `${this.configService.get('FRONTEND_URL', 'http://localhost:5173')}/payment/success`,
        cancelUrl: cancelUrl || `${this.configService.get('FRONTEND_URL', 'http://localhost:5173')}/payment/cancel`,
        merchantName,
        merchantLogoUrl: merchantLogo,
        brandColor: brandColor || '#4F46E5',
        metadata: reference ? { reference } : undefined,
      };

      const response = await firstValueFrom(
        this.httpService.post(`${merchantServiceUrl}/checkout/sessions`, sessionData),
      );

      const { url } = response.data;

      // Redirect to hosted checkout page
      return res.redirect(url);
    } catch (error: any) {
      console.error('Quick checkout error:', error);

      // Return error page instead of JSON
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create checkout session';

      return res.status(error.status || 500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Checkout Error</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .error-card {
              background: white;
              padding: 2rem;
              border-radius: 1rem;
              box-shadow: 0 10px 40px rgba(0,0,0,0.1);
              max-width: 400px;
              text-align: center;
            }
            .error-icon {
              font-size: 3rem;
              margin-bottom: 1rem;
            }
            h1 {
              margin: 0 0 0.5rem 0;
              color: #ef4444;
              font-size: 1.5rem;
            }
            p {
              color: #6b7280;
              margin: 0 0 1.5rem 0;
            }
            button {
              background: #4f46e5;
              color: white;
              border: none;
              padding: 0.75rem 2rem;
              border-radius: 0.5rem;
              font-size: 1rem;
              cursor: pointer;
            }
            button:hover {
              background: #4338ca;
            }
          </style>
        </head>
        <body>
          <div class="error-card">
            <div class="error-icon">❌</div>
            <h1>Checkout Error</h1>
            <p>${errorMessage}</p>
            <button onclick="window.history.back()">Go Back</button>
          </div>
        </body>
        </html>
      `);
    }
  }
}
