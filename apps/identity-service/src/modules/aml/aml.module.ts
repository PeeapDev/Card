import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  User,
  AmlAlert,
  AmlRiskProfile,
  AmlScreeningResult,
  AmlSar,
  AmlMonitoringRule,
  AmlWatchlist,
  AmlWatchlistEntry,
  AmlHighRiskCountry,
} from '@payment-system/database';
import { AmlController } from './aml.controller';
import { ScreeningService } from './services/screening.service';
import { AlertService } from './services/alert.service';
import { TransactionMonitoringService } from './services/transaction-monitoring.service';
import { RiskScoringService } from './services/risk-scoring.service';
import { SarService } from './services/sar.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      AmlAlert,
      AmlRiskProfile,
      AmlScreeningResult,
      AmlSar,
      AmlMonitoringRule,
      AmlWatchlist,
      AmlWatchlistEntry,
      AmlHighRiskCountry,
    ]),
  ],
  controllers: [AmlController],
  providers: [
    ScreeningService,
    AlertService,
    TransactionMonitoringService,
    RiskScoringService,
    SarService,
  ],
  exports: [
    ScreeningService,
    AlertService,
    TransactionMonitoringService,
    RiskScoringService,
    SarService,
  ],
})
export class AmlModule {}
