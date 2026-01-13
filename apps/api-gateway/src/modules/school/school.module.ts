import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { SchoolController, PaymentsController } from './school.controller';
import { SchoolService } from './school.service';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';

@Module({
  imports: [
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [SchoolController, PaymentsController, OAuthController],
  providers: [SchoolService, OAuthService],
  exports: [SchoolService, OAuthService],
})
export class SchoolModule {}
