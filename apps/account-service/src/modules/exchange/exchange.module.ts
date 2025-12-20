import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ExchangeController } from './exchange.controller';
import { ExchangeService } from './exchange.service';
import { ExchangeRate } from './entities/exchange-rate.entity';
import { ExchangeTransaction } from './entities/exchange-transaction.entity';
import { ExchangePermission } from './entities/exchange-permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ExchangeRate,
      ExchangeTransaction,
      ExchangePermission,
    ]),
    ConfigModule,
  ],
  controllers: [ExchangeController],
  providers: [ExchangeService],
  exports: [ExchangeService],
})
export class ExchangeModule {}
