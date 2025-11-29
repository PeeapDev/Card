import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { firstValueFrom, catchError, timeout } from 'rxjs';
import { hashApiKey } from '@payment-system/common';

interface ApiKeyData {
  id: string;
  merchantId?: string;
  developerId?: string;
  scopes: string[];
  rateLimitTier: string;
  environment: 'LIVE' | 'TEST';
}

@Injectable()
export class ApiKeyService {
  private readonly logger = new Logger(ApiKeyService.name);
  private readonly cachePrefix = 'api-key:';
  private readonly cacheTtl = 300; // 5 minutes

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  async validateApiKey(apiKey: string): Promise<ApiKeyData | null> {
    if (!apiKey) {
      return null;
    }

    // Check cache first
    const keyHash = hashApiKey(apiKey);
    const cacheKey = `${this.cachePrefix}${keyHash}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      if (cached === 'INVALID') {
        return null;
      }
      return JSON.parse(cached);
    }

    // Call developer service to validate
    try {
      const developerServiceUrl = this.configService.get(
        'DEVELOPER_SERVICE_URL',
        'http://localhost:3008',
      );

      const response = await firstValueFrom(
        this.httpService.post(`${developerServiceUrl}/api-keys/validate`, {
          keyHash,
        }).pipe(
          timeout(5000),
          catchError(() => {
            throw new Error('Failed to validate API key');
          }),
        ),
      );

      if (response.data?.valid) {
        const keyData: ApiKeyData = {
          id: response.data.id,
          merchantId: response.data.merchantId,
          developerId: response.data.developerId,
          scopes: response.data.scopes || [],
          rateLimitTier: response.data.rateLimitTier || 'basic',
          environment: response.data.environment,
        };

        // Cache valid key
        await this.redis.setex(cacheKey, this.cacheTtl, JSON.stringify(keyData));

        return keyData;
      }

      // Cache invalid key to prevent repeated lookups
      await this.redis.setex(cacheKey, 60, 'INVALID');
      return null;
    } catch (error) {
      this.logger.error(`API key validation error: ${error}`);
      return null;
    }
  }

  async invalidateCache(keyHash: string): Promise<void> {
    const cacheKey = `${this.cachePrefix}${keyHash}`;
    await this.redis.del(cacheKey);
  }
}
