import { Module } from '@nestjs/common';
import { QREngineService } from './qr-engine.service';
import { QREngineController } from './qr-engine.controller';
import { CardEngineModule } from '../card-engine/card-engine.module';

@Module({
  imports: [CardEngineModule],
  providers: [QREngineService],
  controllers: [QREngineController],
  exports: [QREngineService],
})
export class QREngineModule {}
