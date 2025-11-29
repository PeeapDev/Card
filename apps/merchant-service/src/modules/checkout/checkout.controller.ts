import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';

@ApiTags('Checkout')
@Controller('checkout')
@ApiSecurity('api-key')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create checkout session' })
  async createSession(@Body() dto: any) {
    const session = await this.checkoutService.createSession(dto);
    return {
      sessionId: session.id,
      url: `${process.env.CHECKOUT_BASE_URL || 'https://checkout.example.com'}/pay/${session.id}`,
      expiresAt: session.expiresAt,
    };
  }

  @Get('sessions/:sessionId')
  @ApiOperation({ summary: 'Get checkout session' })
  async getSession(@Param('sessionId') sessionId: string) {
    return this.checkoutService.getSession(sessionId);
  }

  @Post('sessions/:sessionId/complete')
  @ApiOperation({ summary: 'Complete checkout with card token' })
  async completeSession(
    @Param('sessionId') sessionId: string,
    @Body('cardToken') cardToken: string,
  ) {
    return this.checkoutService.completeSession(sessionId, cardToken);
  }
}
