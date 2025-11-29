import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

interface TierConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
}

const TIER_CONFIGS: Record<string, TierConfig> = {
  basic: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
  },
  standard: {
    requestsPerMinute: 120,
    requestsPerHour: 3000,
    requestsPerDay: 50000,
  },
  premium: {
    requestsPerMinute: 300,
    requestsPerHour: 10000,
    requestsPerDay: 200000,
  },
  enterprise: {
    requestsPerMinute: 1000,
    requestsPerHour: 50000,
    requestsPerDay: 1000000,
  },
};

@Injectable()
export class RateLimitService {
  private readonly logger = new Logger(RateLimitService.name);

  constructor(
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {}

  async checkRateLimit(
    identifier: string,
    tier: string = 'basic',
  ): Promise<RateLimitResult> {
    const config = TIER_CONFIGS[tier] || TIER_CONFIGS.basic;
    const now = Date.now();

    // Use sliding window algorithm
    const minuteKey = `ratelimit:${identifier}:minute`;
    const hourKey = `ratelimit:${identifier}:hour`;
    const dayKey = `ratelimit:${identifier}:day`;

    // Check minute limit
    const minuteResult = await this.checkWindow(
      minuteKey,
      config.requestsPerMinute,
      60,
      now,
    );
    if (!minuteResult.allowed) {
      return minuteResult;
    }

    // Check hour limit
    const hourResult = await this.checkWindow(
      hourKey,
      config.requestsPerHour,
      3600,
      now,
    );
    if (!hourResult.allowed) {
      return hourResult;
    }

    // Check day limit
    const dayResult = await this.checkWindow(
      dayKey,
      config.requestsPerDay,
      86400,
      now,
    );
    if (!dayResult.allowed) {
      return dayResult;
    }

    // Increment all counters
    await Promise.all([
      this.incrementWindow(minuteKey, 60, now),
      this.incrementWindow(hourKey, 3600, now),
      this.incrementWindow(dayKey, 86400, now),
    ]);

    return {
      allowed: true,
      remaining: Math.min(
        minuteResult.remaining - 1,
        hourResult.remaining - 1,
        dayResult.remaining - 1,
      ),
      resetAt: minuteResult.resetAt,
    };
  }

  private async checkWindow(
    key: string,
    limit: number,
    windowSeconds: number,
    now: number,
  ): Promise<RateLimitResult> {
    const windowStart = now - windowSeconds * 1000;

    // Remove old entries
    await this.redis.zremrangebyscore(key, 0, windowStart);

    // Count current entries
    const count = await this.redis.zcard(key);
    const remaining = Math.max(0, limit - count);
    const resetAt = now + windowSeconds * 1000;

    if (count >= limit) {
      // Get the oldest entry to calculate retry after
      const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
      const retryAfter = oldest.length >= 2
        ? Math.ceil((parseInt(oldest[1]) + windowSeconds * 1000 - now) / 1000)
        : windowSeconds;

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter,
      };
    }

    return {
      allowed: true,
      remaining,
      resetAt,
    };
  }

  private async incrementWindow(
    key: string,
    windowSeconds: number,
    now: number,
  ): Promise<void> {
    const requestId = `${now}:${Math.random().toString(36).substr(2, 9)}`;

    await this.redis
      .multi()
      .zadd(key, now, requestId)
      .expire(key, windowSeconds)
      .exec();
  }

  async getRateLimitInfo(
    identifier: string,
    tier: string = 'basic',
  ): Promise<{
    minute: { used: number; limit: number };
    hour: { used: number; limit: number };
    day: { used: number; limit: number };
  }> {
    const config = TIER_CONFIGS[tier] || TIER_CONFIGS.basic;
    const now = Date.now();

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      this.getWindowCount(`ratelimit:${identifier}:minute`, 60, now),
      this.getWindowCount(`ratelimit:${identifier}:hour`, 3600, now),
      this.getWindowCount(`ratelimit:${identifier}:day`, 86400, now),
    ]);

    return {
      minute: { used: minuteCount, limit: config.requestsPerMinute },
      hour: { used: hourCount, limit: config.requestsPerHour },
      day: { used: dayCount, limit: config.requestsPerDay },
    };
  }

  private async getWindowCount(
    key: string,
    windowSeconds: number,
    now: number,
  ): Promise<number> {
    const windowStart = now - windowSeconds * 1000;
    await this.redis.zremrangebyscore(key, 0, windowStart);
    return this.redis.zcard(key);
  }
}
