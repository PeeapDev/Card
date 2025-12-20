import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User, KycApplication, PaymentSettings } from '@payment-system/database';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { OcrService } from './ocr.service';
import { SLVerificationService } from './sl-verification.service';
import { MonimeKycService } from './monime-kyc.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, KycApplication, PaymentSettings])],
  controllers: [KycController],
  providers: [KycService, OcrService, SLVerificationService, MonimeKycService],
  exports: [KycService, OcrService, SLVerificationService, MonimeKycService],
})
export class KycModule {}
