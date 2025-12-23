import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentIntentsController } from './payment-intents.controller';
import { PaymentIntentsService } from './payment-intents.service';

@Module({
  imports: [ConfigModule],
  controllers: [PaymentIntentsController],
  providers: [PaymentIntentsService],
  exports: [PaymentIntentsService],
})
export class PaymentIntentsModule {}
