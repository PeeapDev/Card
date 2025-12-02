import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { MonimeController } from './monime.controller';
import { MonimeService } from './monime.service';
import { MonimeApiService } from './monime-api.service';
import { MonimeTransaction } from './entities/monime-transaction.entity';
import { WalletsModule } from '../wallets/wallets.module';
import { LedgerModule } from '../ledger/ledger.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([MonimeTransaction]),
    ConfigModule,
    WalletsModule,
    LedgerModule,
  ],
  controllers: [MonimeController],
  providers: [MonimeService, MonimeApiService],
  exports: [MonimeService, MonimeApiService],
})
export class MonimeModule {}
