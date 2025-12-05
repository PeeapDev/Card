import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { QuickCheckoutController } from './quick-checkout.controller';
import { TokenizeController } from './tokenize.controller';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
  ],
  controllers: [QuickCheckoutController, TokenizeController],
})
export class CheckoutModule {}
