import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RiskScore } from '@payment-system/database';
import { FraudController } from './fraud.controller';
import { FraudService } from './fraud.service';
import { VelocityService } from './services/velocity.service';
import { RulesModule } from '../rules/rules.module';

@Module({
  imports: [TypeOrmModule.forFeature([RiskScore]), RulesModule],
  controllers: [FraudController],
  providers: [FraudService, VelocityService],
  exports: [FraudService],
})
export class FraudModule {}
