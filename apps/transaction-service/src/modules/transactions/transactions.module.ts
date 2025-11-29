import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Transaction, TransactionEvent } from '@payment-system/database';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { TransactionStateMachine } from './state-machine/transaction-state-machine';
import { EventSourcingService } from './services/event-sourcing.service';
import { ServiceClientModule } from '../service-client/service-client.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction, TransactionEvent]),
    HttpModule,
    ServiceClientModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionStateMachine, EventSourcingService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
