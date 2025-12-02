import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { RedisModule } from '@nestjs-modules/ioredis';
import { HttpModule } from '@nestjs/axios';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { AuthorizationsModule } from './modules/authorizations/authorizations.module';
import { HealthModule } from './modules/health/health.module';
import { Transaction, Authorization, TransactionEvent } from '@payment-system/database';
import { EXCHANGES } from '@payment-system/events';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST', 'localhost'),
        port: configService.get('DB_PORT', 5432),
        username: configService.get('DB_USER', 'transaction_user'),
        password: configService.get('DB_PASSWORD', 'transaction_pass'),
        database: configService.get('DB_NAME', 'transaction_db'),
        entities: [Transaction, Authorization, TransactionEvent],
        synchronize: configService.get('NODE_ENV') === 'development',
        logging: configService.get('NODE_ENV') === 'development',
      }),
    }),

    RedisModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get('REDIS_URL', 'redis://localhost:6379'),
      }),
    }),

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

    HttpModule,
    TransactionsModule,
    AuthorizationsModule,
    HealthModule,
  ],
})
export class AppModule {}
