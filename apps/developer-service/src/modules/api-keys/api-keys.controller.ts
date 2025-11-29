import { Controller, Get, Post, Delete, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ApiKeysService } from './api-keys.service';
import { ApiKeyEnvironment } from '@payment-system/database';
import { hashApiKey } from '@payment-system/common';

@ApiTags('API Keys')
@Controller('api-keys')
@ApiBearerAuth()
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create API key' })
  async createApiKey(
    @Body() dto: {
      name: string;
      environment: ApiKeyEnvironment;
      scopes: string[];
      rateLimitTier?: string;
    },
    @Headers('x-merchant-id') merchantId: string,
  ) {
    const result = await this.apiKeysService.createApiKey({
      ...dto,
      merchantId,
    });

    return {
      id: result.apiKey.id,
      key: result.rawKey, // Only shown once!
      keyPrefix: result.apiKey.keyPrefix,
      name: result.apiKey.name,
      environment: result.apiKey.environment,
      scopes: result.apiKey.scopes,
      createdAt: result.apiKey.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List API keys' })
  async listApiKeys(@Headers('x-merchant-id') merchantId: string) {
    const keys = await this.apiKeysService.getApiKeys(merchantId);
    return keys.map(k => ({
      id: k.id,
      keyPrefix: k.keyPrefix,
      name: k.name,
      environment: k.environment,
      status: k.status,
      scopes: k.scopes,
      lastUsedAt: k.lastUsedAt,
      createdAt: k.createdAt,
    }));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke API key' })
  async revokeApiKey(@Param('id') id: string, @Body('reason') reason: string) {
    return this.apiKeysService.revokeApiKey(id, reason || 'Revoked by user');
  }

  @Post(':id/roll')
  @ApiOperation({ summary: 'Roll API key (create new, deprecate old)' })
  async rollApiKey(@Param('id') id: string) {
    const result = await this.apiKeysService.rollApiKey(id);
    return {
      id: result.apiKey.id,
      key: result.rawKey,
      keyPrefix: result.apiKey.keyPrefix,
    };
  }

  // Internal endpoint for gateway
  @Post('validate')
  async validateApiKey(@Body('keyHash') keyHash: string) {
    return this.apiKeysService.validateApiKey(keyHash);
  }

  @Get('health/live')
  liveness() {
    return { status: 'ok' };
  }
}
