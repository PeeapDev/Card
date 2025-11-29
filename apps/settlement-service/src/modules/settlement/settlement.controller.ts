import { Controller, Get, Post, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SettlementService } from './settlement.service';

@ApiTags('Settlement')
@Controller('settlements')
export class SettlementController {
  constructor(private readonly settlementService: SettlementService) {}

  @Post('run')
  @ApiOperation({ summary: 'Trigger settlement run' })
  async runSettlement(
    @Query('periodStart') periodStart: string,
    @Query('periodEnd') periodEnd: string,
  ) {
    return this.settlementService.createSettlementBatches(
      new Date(periodStart),
      new Date(periodEnd),
    );
  }

  @Get('batches/:batchId')
  @ApiOperation({ summary: 'Get settlement batch' })
  async getBatch(@Param('batchId') batchId: string) {
    return this.settlementService.getBatch(batchId);
  }

  @Post('batches/:batchId/process')
  @ApiOperation({ summary: 'Process settlement batch' })
  async processBatch(@Param('batchId') batchId: string) {
    return this.settlementService.processBatch(batchId);
  }

  @Get('batches/:batchId/items')
  @ApiOperation({ summary: 'Get batch items' })
  async getBatchItems(@Param('batchId') batchId: string) {
    return this.settlementService.getBatchItems(batchId);
  }

  @Get('merchants/:merchantId')
  @ApiOperation({ summary: 'Get merchant settlement batches' })
  async getMerchantBatches(@Param('merchantId') merchantId: string) {
    return this.settlementService.getMerchantBatches(merchantId);
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }
}
