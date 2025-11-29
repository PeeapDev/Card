import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ApiKey, WebhookEndpoint, WebhookDelivery } from '@payment-system/database';
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
        username: config.get('DB_USER', 'developer_user'),
        password: config.get('DB_PASSWORD', 'developer_pass'),
        database: config.get('DB_NAME', 'developer_db'),
        entities: [ApiKey, WebhookEndpoint, WebhookDelivery],
        synchronize: config.get('NODE_ENV') === 'development',
      }),
    }),
    RabbitMQModule.forRootAsync(RabbitMQModule, {
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        exchanges: [{ name: EXCHANGES.PAYMENT_EVENTS, type: 'topic' }],
        uri: config.get('RABBITMQ_URL', 'amqp://localhost:5672'),
        connectionInitOptions: { wait: true },
      }),
    }),
    ApiKeysModule,
    WebhooksModule,
  ],
})
export class AppModule {}
