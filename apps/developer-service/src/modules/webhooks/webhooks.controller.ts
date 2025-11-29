import { Controller, Get, Post, Delete, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';

@ApiTags('Webhooks')
@Controller('webhooks')
@ApiBearerAuth()
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'Create webhook endpoint' })
  async createEndpoint(
    @Body() dto: { url: string; events: string[] },
    @Headers('x-merchant-id') merchantId: string,
  ) {
    const result = await this.webhooksService.createEndpoint({
      ...dto,
      merchantId,
    });

    return {
      id: result.endpoint.id,
      url: result.endpoint.url,
      events: result.endpoint.events,
      secret: result.secret, // Only shown once!
      status: result.endpoint.status,
      createdAt: result.endpoint.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List webhook endpoints' })
  async listEndpoints(@Headers('x-merchant-id') merchantId: string) {
    return this.webhooksService.getEndpoints(merchantId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete webhook endpoint' })
  async deleteEndpoint(@Param('id') id: string) {
    await this.webhooksService.deleteEndpoint(id);
    return { deleted: true };
  }

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get webhook deliveries' })
  async getDeliveries(@Param('id') id: string) {
    return this.webhooksService.getDeliveries(id);
  }

  @Post('deliveries/:id/retry')
  @ApiOperation({ summary: 'Retry webhook delivery' })
  async retryDelivery(@Param('id') id: string) {
    return this.webhooksService.retryDelivery(id);
  }
}
