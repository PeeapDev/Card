import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { MerchantsModule } from './modules/merchants/merchants.module';
import { CheckoutModule } from './modules/checkout/checkout.module';
import { Merchant, Terminal, CheckoutSession } from '@payment-system/database';
import { EXCHANGES } from '@payment-system/events';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('DB_HOST', 'localhost'),
        port: config.get('DB_PORT', 5432),
        username: config.get('DB_USER', 'merchant_user'),
        password: config.get('DB_PASSWORD', 'merchant_pass'),
        database: config.get('DB_NAME', 'merchant_db'),
        entities: [Merchant, Terminal, CheckoutSession],
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
    MerchantsModule,
    CheckoutModule,
  ],
})
export class AppModule {}
