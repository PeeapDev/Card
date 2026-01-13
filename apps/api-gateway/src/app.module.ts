import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR, APP_FILTER } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { RedisModule } from '@nestjs-modules/ioredis';
import { ProxyModule } from './modules/proxy/proxy.module';
import { AuthModule } from './modules/auth/auth.module';
import { RateLimitModule } from './modules/rate-limit/rate-limit.module';
import { HealthModule } from './modules/health/health.module';
import { CryptoModule } from './modules/crypto/crypto.module';
import { CardEngineModule } from './modules/card-engine/card-engine.module';
import { NFCEngineModule } from './modules/nfc-engine/nfc-engine.module';
import { QREngineModule } from './modules/qr-engine/qr-engine.module';
import { PaymentSessionModule } from './modules/payment-session/payment-session.module';
import { P2PTransferModule } from './modules/p2p-transfer/p2p-transfer.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { PaymentIntentsModule } from './modules/payment-intents/payment-intents.module';
import { SchoolModule } from './modules/school/school.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { RequestIdMiddleware } from './middleware/request-id.middleware';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    // Redis for rate limiting and caching
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

    // Throttling
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        throttlers: [
          {
            ttl: configService.get('THROTTLE_TTL', 60000),
            limit: configService.get('THROTTLE_LIMIT', 100),
          },
        ],
      }),
    }),

    // Feature modules
    ProxyModule,
    AuthModule,
    RateLimitModule,
    HealthModule,

    // Peeap Pay Engine modules
    CryptoModule,
    CardEngineModule,
    NFCEngineModule,
    QREngineModule,
    PaymentSessionModule,
    P2PTransferModule,
    CheckoutModule,
    PaymentIntentsModule,

    // School Integration module
    SchoolModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestIdMiddleware, CorrelationIdMiddleware)
      .forRoutes('*');
  }
}
