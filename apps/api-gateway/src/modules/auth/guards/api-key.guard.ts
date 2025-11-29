import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();

    // Public routes by path pattern
    const publicPaths = ['/api/v1/health', '/api/v1/auth', '/api/docs'];
    const requestPath = request.path || request.url;
    if (publicPaths.some(p => requestPath.startsWith(p))) {
      return true;
    }

    const apiKey = request.headers['x-api-key'] as string;

    // If no API key, check if JWT is present (handled by JwtAuthGuard)
    if (!apiKey) {
      return !!request.user;
    }

    // Validate API key
    const keyData = await this.apiKeyService.validateApiKey(apiKey);

    if (!keyData) {
      throw new UnauthorizedException('Invalid API key');
    }

    // Check if key is for test/live environment
    const isTestKey = apiKey.startsWith('sk_test_') || apiKey.startsWith('pk_test_');

    // Attach key data to request
    (request as any).apiKeyData = {
      ...keyData,
      isTestMode: isTestKey,
    };

    return true;
  }
}
