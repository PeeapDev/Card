import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(to: string, body: string): Promise<string> {
    // In production, integrate with SMS provider (Twilio, etc.)
    this.logger.log(`Sending SMS to ${to}: ${body.substring(0, 50)}...`);

    // Simulate sending
    const messageId = `sms_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // TODO: Integrate with actual SMS provider
    // const twilio = require('twilio')(accountSid, authToken);
    // await twilio.messages.create({ body, from: fromNumber, to });

    return messageId;
  }
}
