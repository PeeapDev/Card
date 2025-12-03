import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager } from 'typeorm';
import { TransactionEvent, TransactionState } from '@payment-system/database';

interface EventData {
  transactionId: string;
  eventType: string;
  previousState?: TransactionState;
  newState?: TransactionState;
  amount?: number;
  metadata?: Record<string, any>;
  performedBy?: string;
  ipAddress?: string;
}

@Injectable()
export class EventSourcingService {
  private readonly logger = new Logger(EventSourcingService.name);

  constructor(
    @InjectRepository(TransactionEvent)
    private readonly eventRepository: Repository<TransactionEvent>,
  ) {}

  async recordEvent(
    data: EventData,
    manager?: EntityManager,
  ): Promise<TransactionEvent> {
    const repo = manager
      ? manager.getRepository(TransactionEvent)
      : this.eventRepository;

    // Get the next version number for this aggregate
    const lastEvent = await repo.findOne({
      where: { aggregateId: data.transactionId },
      order: { version: 'DESC' },
    });
    const nextVersion = lastEvent ? lastEvent.version + 1 : 1;

    const event = repo.create({
      aggregateId: data.transactionId,
      aggregateType: 'Transaction',
      eventType: data.eventType,
      eventData: {
        previousState: data.previousState,
        newState: data.newState,
        amount: data.amount,
        ...data.metadata,
      },
      version: nextVersion,
      metadata: {
        userId: data.performedBy,
        ipAddress: data.ipAddress,
      },
    });

    await repo.save(event);

    this.logger.debug(
      `Event recorded: ${data.eventType} for transaction ${data.transactionId}`,
    );

    return event;
  }

  async getTransactionHistory(transactionId: string): Promise<TransactionEvent[]> {
    return this.eventRepository.find({
      where: { aggregateId: transactionId },
      order: { createdAt: 'ASC' },
    });
  }

  async replayEvents(transactionId: string): Promise<TransactionState> {
    const events = await this.getTransactionHistory(transactionId);

    if (events.length === 0) {
      return TransactionState.INITIATED;
    }

    const lastEvent = events[events.length - 1];
    return lastEvent.eventData?.newState || TransactionState.INITIATED;
  }
}
