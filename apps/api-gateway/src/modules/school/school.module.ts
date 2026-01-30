import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SchoolController, PaymentsController } from './school.controller';
import { SchoolService } from './school.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { SchoolWalletController } from './school-wallet.controller';
import { SchoolWalletService } from './school-wallet.service';
import { MessagingController, WebhookController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { SchoolChatParentController, SchoolChatSchoolController } from './school-chat.controller';
import { SchoolChatService } from './school-chat.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [
    SchoolController,
    PaymentsController,
    OAuthController,
    SchoolWalletController,
    MessagingController,
    WebhookController,
    SchoolChatParentController,
    SchoolChatSchoolController,
  ],
  providers: [
    SchoolService,
    OAuthService,
    SchoolWalletService,
    MessagingService,
    SchoolChatService,
  ],
  exports: [
    SchoolService,
    OAuthService,
    SchoolWalletService,
    MessagingService,
    SchoolChatService,
  ],
})
export class SchoolModule {}
