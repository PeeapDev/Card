import { Module, Global } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { CardServiceClient } from './card-service.client';
import { AccountServiceClient } from './account-service.client';
import { FraudServiceClient } from './fraud-service.client';

@Global()
@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
    }),
    ConfigModule,
  ],
  providers: [CardServiceClient, AccountServiceClient, FraudServiceClient],
  exports: [CardServiceClient, AccountServiceClient, FraudServiceClient],
})
export class ServiceClientModule {}
