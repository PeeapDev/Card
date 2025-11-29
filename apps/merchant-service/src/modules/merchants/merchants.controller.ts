import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiSecurity } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';

@ApiTags('Merchants')
@Controller('merchants')
@ApiSecurity('api-key')
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Post()
  @ApiOperation({ summary: 'Create merchant' })
  async createMerchant(@Body() dto: any) {
    return this.merchantsService.createMerchant(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get merchant' })
  async getMerchant(@Param('id') id: string) {
    return this.merchantsService.getMerchant(id);
  }

  @Put(':id/activate')
  @ApiOperation({ summary: 'Activate merchant' })
  async activateMerchant(@Param('id') id: string) {
    return this.merchantsService.activateMerchant(id);
  }

  @Put(':id/suspend')
  @ApiOperation({ summary: 'Suspend merchant' })
  async suspendMerchant(@Param('id') id: string, @Body('reason') reason: string) {
    return this.merchantsService.suspendMerchant(id, reason);
  }

  @Post(':id/terminals')
  @ApiOperation({ summary: 'Register terminal' })
  async registerTerminal(@Param('id') id: string, @Body() dto: any) {
    return this.merchantsService.registerTerminal(id, dto);
  }

  @Get(':id/terminals')
  @ApiOperation({ summary: 'Get merchant terminals' })
  async getTerminals(@Param('id') id: string) {
    return this.merchantsService.getMerchantTerminals(id);
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }
}
