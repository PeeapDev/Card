import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

interface VelocityCheck {
  cardToken: string;
  userId?: string;
  merchantId: string;
  amount: number;
}

interface VelocityResult {
  score: number;
  violations: string[];
}

@Injectable()
export class VelocityService {
  private readonly logger = new Logger(VelocityService.name);

  constructor(@InjectRedis() private readonly redis: Redis) {}

  async checkVelocity(data: VelocityCheck): Promise<VelocityResult> {
    const violations: string[] = [];
    let score = 0;

    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    // Check card velocity
    const cardHourKey = `velocity:card:${data.cardToken}:hour`;
    const cardDayKey = `velocity:card:${data.cardToken}:day`;

    await this.redis.zremrangebyscore(cardHourKey, 0, hourAgo);
    await this.redis.zremrangebyscore(cardDayKey, 0, dayAgo);

    const cardHourCount = await this.redis.zcard(cardHourKey);
    const cardDayCount = await this.redis.zcard(cardDayKey);

    // Velocity thresholds
    if (cardHourCount >= 10) {
      violations.push('HIGH_CARD_VELOCITY_HOUR');
      score += 30;
    } else if (cardHourCount >= 5) {
      score += 15;
    }

    if (cardDayCount >= 50) {
      violations.push('HIGH_CARD_VELOCITY_DAY');
      score += 25;
    }

    // Check amount velocity
    const amountKey = `velocity:card:${data.cardToken}:amount:day`;
    await this.redis.zremrangebyscore(amountKey, 0, dayAgo);
    const amounts = await this.redis.zrange(amountKey, 0, -1);
    const totalAmount = amounts.reduce((sum, a) => sum + parseFloat(a), 0) + data.amount;

    if (totalAmount > 5000) {
      violations.push('HIGH_AMOUNT_VELOCITY');
      score += 20;
    }

    // Record this transaction
    const txId = `${now}:${Math.random().toString(36).substr(2, 9)}`;
    await Promise.all([
      this.redis.zadd(cardHourKey, now, txId),
      this.redis.expire(cardHourKey, 3600),
      this.redis.zadd(cardDayKey, now, txId),
      this.redis.expire(cardDayKey, 86400),
      this.redis.zadd(amountKey, now, data.amount.toString()),
      this.redis.expire(amountKey, 86400),
    ]);

    return { score: Math.min(score, 100), violations };
  }
}
