import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { NotificationTemplate, NotificationLog } from '@payment-system/database';
import { EXCHANGES, QUEUES } from '@payment-system/events';

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
        username: config.get('DB_USER', 'notification_user'),
        password: config.get('DB_PASSWORD', 'notification_pass'),
        database: config.get('DB_NAME', 'notification_db'),
        entities: [NotificationTemplate, NotificationLog],
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
        queues: [
          { name: QUEUES.NOTIFICATION_EMAIL, options: { durable: true } },
          { name: QUEUES.NOTIFICATION_SMS, options: { durable: true } },
          { name: QUEUES.NOTIFICATION_PUSH, options: { durable: true } },
        ],
      }),
    }),
    NotificationsModule,
    TemplatesModule,
  ],
})
export class AppModule {}
