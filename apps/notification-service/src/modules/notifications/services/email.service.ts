import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async send(
    to: string,
    subject: string,
    textBody: string,
    htmlBody?: string,
  ): Promise<string> {
    // In production, integrate with email provider (SendGrid, SES, etc.)
    this.logger.log(`Sending email to ${to}: ${subject}`);

    // Simulate sending
    const messageId = `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // TODO: Integrate with actual email provider
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));
    // await sgMail.send({ to, from, subject, text: textBody, html: htmlBody });

    return messageId;
  }
}
