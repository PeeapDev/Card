import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { NotificationLog, NotificationTemplate, NotificationChannel, NotificationStatus } from '@payment-system/database';
import { QUEUES, EXCHANGES, ROUTING_KEYS } from '@payment-system/events';
import { EmailService } from './services/email.service';
import { SmsService } from './services/sms.service';
import { PushService } from './services/push.service';

interface SendNotificationDto {
  userId?: string;
  merchantId?: string;
  channel: NotificationChannel;
  recipient: string;
  templateCode: string;
  variables: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectRepository(NotificationLog)
    private readonly logRepository: Repository<NotificationLog>,
    @InjectRepository(NotificationTemplate)
    private readonly templateRepository: Repository<NotificationTemplate>,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly pushService: PushService,
  ) {}

  async send(dto: SendNotificationDto): Promise<NotificationLog> {
    // Get template
    const template = await this.templateRepository.findOne({
      where: { code: dto.templateCode, channel: dto.channel, active: true },
    });

    if (!template) {
      throw new Error(`Template not found: ${dto.templateCode}`);
    }

    // Render template
    const subject = this.renderTemplate(template.subject || '', dto.variables);
    const body = this.renderTemplate(template.body, dto.variables);

    // Create log
    const log = this.logRepository.create({
      userId: dto.userId,
      merchantId: dto.merchantId,
      templateId: template.id,
      channel: dto.channel,
      recipient: dto.recipient,
      subject,
      body,
      status: NotificationStatus.PENDING,
    });

    await this.logRepository.save(log);

    // Send based on channel
    try {
      let externalId: string | undefined;

      switch (dto.channel) {
        case NotificationChannel.EMAIL:
          externalId = await this.emailService.send(dto.recipient, subject, body, template.htmlBody);
          break;
        case NotificationChannel.SMS:
          externalId = await this.smsService.send(dto.recipient, body);
          break;
        case NotificationChannel.PUSH:
          externalId = await this.pushService.send(dto.recipient, subject, body);
          break;
      }

      log.status = NotificationStatus.SENT;
      log.sentAt = new Date();
      log.externalId = externalId;
    } catch (error: any) {
      log.status = NotificationStatus.FAILED;
      log.errorMessage = error.message;
    }

    await this.logRepository.save(log);
    return log;
  }

  @RabbitSubscribe({
    exchange: EXCHANGES.PAYMENT_EVENTS,
    routingKey: ROUTING_KEYS.NOTIFICATION_SEND,
    queue: QUEUES.NOTIFICATION_EMAIL,
  })
  async handleNotificationEvent(msg: any): Promise<void> {
    this.logger.log(`Processing notification: ${msg.eventId}`);
    await this.send(msg.payload);
  }

  private renderTemplate(template: string, variables: Record<string, any>): string {
    let rendered = template;
    for (const [key, value] of Object.entries(variables)) {
      rendered = rendered.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }
    return rendered;
  }

  async getNotificationHistory(userId: string): Promise<NotificationLog[]> {
    return this.logRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
