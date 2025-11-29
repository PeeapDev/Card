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

    const event = repo.create({
      transactionId: data.transactionId,
      eventType: data.eventType,
      previousState: data.previousState,
      newState: data.newState,
      amount: data.amount,
      metadata: data.metadata,
      performedBy: data.performedBy,
      ipAddress: data.ipAddress,
    });

    await repo.save(event);

    this.logger.debug(
      `Event recorded: ${data.eventType} for transaction ${data.transactionId}`,
    );

    return event;
  }

  async getTransactionHistory(transactionId: string): Promise<TransactionEvent[]> {
    return this.eventRepository.find({
      where: { transactionId },
      order: { createdAt: 'ASC' },
    });
  }

  async replayEvents(transactionId: string): Promise<TransactionState> {
    const events = await this.getTransactionHistory(transactionId);

    if (events.length === 0) {
      return TransactionState.INITIATED;
    }

    const lastEvent = events[events.length - 1];
    return lastEvent.newState || TransactionState.INITIATED;
  }
}
