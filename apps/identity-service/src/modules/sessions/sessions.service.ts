import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Session } from '@payment-system/database';
import * as crypto from 'crypto';

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly sessionPrefix = 'session:';
  private readonly sessionTtl: number;

  constructor(
    @InjectRepository(Session)
    private readonly sessionRepository: Repository<Session>,
    @InjectRedis() private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    // Default 7 days in seconds
    this.sessionTtl = this.configService.get('SESSION_TTL', 7 * 24 * 60 * 60);
  }

  async createSession(
    userId: string,
    ipAddress: string,
    userAgent: string,
    deviceId?: string,
  ): Promise<Session> {
    const expiresAt = new Date(Date.now() + this.sessionTtl * 1000);
    const sessionId = crypto.randomBytes(32).toString('base64url');
    const refreshTokenHash = crypto.randomBytes(32).toString('hex');

    const session = this.sessionRepository.create({
      userId,
      sessionId,
      refreshTokenHash,
      ipAddress,
      userAgent,
      deviceId,
      expiresAt,
      isActive: true,
    });

    await this.sessionRepository.save(session);

    // Store session in Redis for fast validation
    await this.redis.setex(
      `${this.sessionPrefix}${session.id}`,
      this.sessionTtl,
      JSON.stringify({
        userId,
        createdAt: session.createdAt,
        expiresAt: session.expiresAt,
      }),
    );

    // Track user's active sessions
    await this.redis.sadd(`user:sessions:${userId}`, session.id);

    this.logger.debug(`Session created: ${session.id} for user ${userId}`);

    return session;
  }

  async isSessionValid(sessionId: string): Promise<boolean> {
    // Check Redis first (fast path)
    const sessionData = await this.redis.get(`${this.sessionPrefix}${sessionId}`);

    if (sessionData) {
      const session = JSON.parse(sessionData);
      return new Date(session.expiresAt) > new Date();
    }

    // Fallback to database
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId, isActive: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return false;
    }

    // Re-cache in Redis
    const ttl = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
    if (ttl > 0) {
      await this.redis.setex(
        `${this.sessionPrefix}${sessionId}`,
        ttl,
        JSON.stringify({
          userId: session.userId,
          createdAt: session.createdAt,
          expiresAt: session.expiresAt,
        }),
      );
    }

    return true;
  }

  async refreshSession(sessionId: string): Promise<void> {
    const newExpiresAt = new Date(Date.now() + this.sessionTtl * 1000);

    await this.sessionRepository.update(sessionId, {
      expiresAt: newExpiresAt,
      lastActivityAt: new Date(),
    });

    // Update Redis
    const sessionData = await this.redis.get(`${this.sessionPrefix}${sessionId}`);
    if (sessionData) {
      const session = JSON.parse(sessionData);
      session.expiresAt = newExpiresAt;
      await this.redis.setex(
        `${this.sessionPrefix}${sessionId}`,
        this.sessionTtl,
        JSON.stringify(session),
      );
    }
  }

  async terminateSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (session) {
      session.isActive = false;
      session.terminatedAt = new Date();
      await this.sessionRepository.save(session);

      // Remove from Redis
      await this.redis.del(`${this.sessionPrefix}${sessionId}`);
      await this.redis.srem(`user:sessions:${session.userId}`, sessionId);

      this.logger.debug(`Session terminated: ${sessionId}`);
    }
  }

  async terminateAllSessions(userId: string, exceptSessionId?: string): Promise<void> {
    // Get all session IDs for the user
    const sessionIds = await this.redis.smembers(`user:sessions:${userId}`);

    for (const sessionId of sessionIds) {
      if (sessionId !== exceptSessionId) {
        await this.terminateSession(sessionId);
      }
    }

    // Also update database for any sessions not in Redis
    await this.sessionRepository.update(
      { userId, isActive: true },
      { isActive: false, terminatedAt: new Date() },
    );

    this.logger.debug(`All sessions terminated for user: ${userId}`);
  }

  async getUserSessions(userId: string): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async getSessionById(sessionId: string): Promise<Session | null> {
    return this.sessionRepository.findOne({
      where: { id: sessionId },
    });
  }

  async cleanupExpiredSessions(): Promise<number> {
    const result = await this.sessionRepository
      .createQueryBuilder()
      .update(Session)
      .set({ isActive: false })
      .where('expires_at < :now', { now: new Date() })
      .andWhere('is_active = true')
      .execute();

    this.logger.log(`Cleaned up ${result.affected} expired sessions`);
    return result.affected || 0;
  }
}
