import { Module } from '@nestjs/common';
import { CardEngineService } from './card-engine.service';
import { CardEngineController } from './card-engine.controller';

@Module({
  providers: [CardEngineService],
  controllers: [CardEngineController],
  exports: [CardEngineService],
})
export class CardEngineModule {}
