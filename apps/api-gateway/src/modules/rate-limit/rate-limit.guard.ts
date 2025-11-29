import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RateLimitService } from './rate-limit.service';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Determine rate limit identifier
    let identifier: string;
    let tier: string = 'basic';

    // Check for API key
    const apiKeyData = (request as any).apiKeyData;
    if (apiKeyData) {
      identifier = `api:${apiKeyData.id}`;
      tier = apiKeyData.rateLimitTier || 'basic';
    } else if ((request as any).user) {
      // Authenticated user
      identifier = `user:${(request as any).user.userId}`;
      tier = 'standard';
    } else {
      // IP-based rate limiting
      identifier = `ip:${request.ip || request.socket.remoteAddress}`;
    }

    const result = await this.rateLimitService.checkRateLimit(identifier, tier);

    // Set rate limit headers
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader('X-RateLimit-Reset', result.resetAt.toString());

    if (!result.allowed) {
      response.setHeader('Retry-After', (result.retryAfter || 60).toString());
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          error: 'Too Many Requests',
          retryAfter: result.retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
