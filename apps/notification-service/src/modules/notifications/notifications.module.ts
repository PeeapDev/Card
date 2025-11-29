import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLog, NotificationTemplate } from '@payment-system/database';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationLog, NotificationTemplate])],
  controllers: [NotificationsController],
  providers: [NotificationsService, EmailService, SmsService, PushService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
