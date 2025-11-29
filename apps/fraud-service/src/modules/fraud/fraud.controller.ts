import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { FraudService } from './fraud.service';

@ApiTags('Fraud')
@Controller('fraud')
export class FraudController {
  constructor(private readonly fraudService: FraudService) {}

  @Post('check')
  @ApiOperation({ summary: 'Check transaction for fraud' })
  async checkTransaction(@Body() dto: any) {
    return this.fraudService.checkTransaction(dto);
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }
}
