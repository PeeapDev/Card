import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { SettlementModule } from './modules/settlement/settlement.module';
import { SettlementBatch, SettlementBatchItem } from '@payment-system/database';
import { EXCHANGES } from '@payment-system/events';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 5432),
        username: config.get('DB_USER', 'settlement_user'),
        password: config.get('DB_PASSWORD', 'settlement_pass'),
        database: config.get('DB_NAME', 'settlement_db'),
        entities: [SettlementBatch, SettlementBatchItem],
        synchronize: config.get('NODE_ENV') === 'development',
      }),
    }),
    RabbitMQModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        exchanges: [{ name: EXCHANGES.PAYMENT_EVENTS, type: 'topic' }],
        uri: config.get('RABBITMQ_URL', 'amqp://localhost:5672'),
        connectionInitOptions: { wait: true },
      }),
    }),
    SettlementModule,
  ],
})
export class AppModule {}
