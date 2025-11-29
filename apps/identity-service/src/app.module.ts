import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { KycModule } from './modules/kyc/kyc.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { HealthModule } from './modules/health/health.module';
import { User, KycApplication, Session } from '@payment-system/database';
import { EXCHANGES } from '@payment-system/events';
import * as path from 'path';

// Resolve .env file path from project root
const envFilePath = [
  path.resolve(process.cwd(), '.env.local'),
  path.resolve(process.cwd(), '.env'),
];

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath,
    }),

    // Database
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USER', 'identity_user'),
        password: configService.get('DB_PASSWORD', 'identity_pass'),
        database: configService.get('DB_NAME', 'identity_db'),
        entities: [User, KycApplication, Session],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    // Redis for sessions
    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

    // RabbitMQ
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        exchanges: [
          {
            name: EXCHANGES.PAYMENT_EVENTS,
            type: 'topic',
          },
        ],
        uri: configService.get('RABBITMQ_URL', 'amqp://localhost:5672'),
        connectionInitOptions: { wait: true },
      }),
    }),

    // JWT - Global configuration for access tokens
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET') || 'default-jwt-secret-change-in-production',
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN') || '15m',
          algorithm: 'HS256',
        },
      }),
    }),

    // Feature modules
    AuthModule,
    UsersModule,
    KycModule,
    SessionsModule,
    HealthModule,
  ],
})
export class AppModule {}
