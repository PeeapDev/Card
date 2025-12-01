import { Module } from '@nestjs/common';
import { NFCEngineService } from './nfc-engine.service';
import { NFCEngineController } from './nfc-engine.controller';
import { CardEngineModule } from '../card-engine/card-engine.module';

@Module({
  imports: [CardEngineModule],
  providers: [NFCEngineService],
  controllers: [NFCEngineController],
  exports: [NFCEngineService],
})
export class NFCEngineModule {}
