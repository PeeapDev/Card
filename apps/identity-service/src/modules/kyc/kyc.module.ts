import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, KycApplication } from '@payment-system/database';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { OcrService } from './ocr.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, KycApplication])],
  controllers: [KycController],
  providers: [KycService, OcrService],
  exports: [KycService, OcrService],
})
export class KycModule {}
