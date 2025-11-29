import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey, ApiKeyStatus, ApiKeyEnvironment } from '@payment-system/database';
import { generateApiKey, hashApiKey } from '@payment-system/common';

interface CreateApiKeyDto {
  merchantId?: string;
  developerId?: string;
  name: string;
  environment: ApiKeyEnvironment;
  scopes: string[];
  rateLimitTier?: string;
  ipWhitelist?: string[];
  expiresAt?: Date;
}

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {}

  async createApiKey(dto: CreateApiKeyDto): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const prefix = dto.environment === ApiKeyEnvironment.LIVE ? 'sk_live' : 'sk_test';
    const rawKey = generateApiKey(prefix);
    const keyHash = hashApiKey(rawKey);
    const keyPrefix = rawKey.substring(0, 12);

    const apiKey = this.apiKeyRepository.create({
      merchantId: dto.merchantId,
      developerId: dto.developerId,
      keyHash,
      keyPrefix,
      name: dto.name,
      environment: dto.environment,
      status: ApiKeyStatus.ACTIVE,
      scopes: dto.scopes,
      rateLimitTier: dto.rateLimitTier || 'basic',
      ipWhitelist: dto.ipWhitelist,
      expiresAt: dto.expiresAt,
    });

    await this.apiKeyRepository.save(apiKey);

    this.logger.log(`API key created: ${apiKey.id} (${keyPrefix}...)`);

    // Only return raw key on creation
    return { apiKey, rawKey };
  }

  async validateApiKey(keyHash: string): Promise<{
    valid: boolean;
    id?: string;
    merchantId?: string;
    developerId?: string;
    scopes?: string[];
    rateLimitTier?: string;
    environment?: ApiKeyEnvironment;
  }> {
    const apiKey = await this.apiKeyRepository.findOne({
      where: { keyHash, status: ApiKeyStatus.ACTIVE },
    });

    if (!apiKey) {
      return { valid: false };
    }

    // Check expiry
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return { valid: false };
    }

    // Update last used
    apiKey.lastUsedAt = new Date();
    await this.apiKeyRepository.save(apiKey);

    return {
      valid: true,
      id: apiKey.id,
      merchantId: apiKey.merchantId,
      developerId: apiKey.developerId,
      scopes: apiKey.scopes,
      rateLimitTier: apiKey.rateLimitTier,
      environment: apiKey.environment,
    };
  }

  async getApiKeys(merchantId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.find({
      where: { merchantId },
      order: { createdAt: 'DESC' },
    });
  }

  async revokeApiKey(id: string, reason: string): Promise<ApiKey> {
    const apiKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!apiKey) throw new NotFoundException('API key not found');

    apiKey.status = ApiKeyStatus.REVOKED;
    apiKey.revokedAt = new Date();
    apiKey.revokeReason = reason;
    await this.apiKeyRepository.save(apiKey);

    this.logger.log(`API key revoked: ${id}`);
    return apiKey;
  }

  async rollApiKey(id: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const oldKey = await this.apiKeyRepository.findOne({ where: { id } });
    if (!oldKey) throw new NotFoundException('API key not found');

    // Deprecate old key (still works for 24 hours)
    oldKey.status = ApiKeyStatus.DEPRECATED;
    await this.apiKeyRepository.save(oldKey);

    // Create new key with same settings
    return this.createApiKey({
      merchantId: oldKey.merchantId,
      developerId: oldKey.developerId,
      name: oldKey.name,
      environment: oldKey.environment,
      scopes: oldKey.scopes,
      rateLimitTier: oldKey.rateLimitTier,
      ipWhitelist: oldKey.ipWhitelist,
    });
  }
}
