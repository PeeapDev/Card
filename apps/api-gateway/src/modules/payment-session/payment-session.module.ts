import { Module } from '@nestjs/common';
import { PaymentSessionService } from './payment-session.service';
import { PaymentSessionController } from './payment-session.controller';
import { CardEngineModule } from '../card-engine/card-engine.module';

@Module({
  imports: [CardEngineModule],
  providers: [PaymentSessionService],
  controllers: [PaymentSessionController],
  exports: [PaymentSessionService],
})
export class PaymentSessionModule {}
