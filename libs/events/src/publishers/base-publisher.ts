import { Injectable, Logger } from '@nestjs/common';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';
import { EventEnvelope, createEventEnvelope } from '../types/event-envelope';
import { EXCHANGES } from '../constants/exchanges';

@Injectable()
export class BaseEventPublisher {
  protected readonly logger = new Logger(BaseEventPublisher.name);

  constructor(protected readonly amqpConnection: AmqpConnection) {}

  async publish<T>(
    routingKey: string,
    payload: T,
    options?: {
      correlationId?: string;
      causationId?: string;
      userId?: string;
      merchantId?: string;
      metadata?: Record<string, any>;
      exchange?: string;
    },
  ): Promise<string> {
    const envelope = createEventEnvelope(routingKey, payload, {
      source: this.constructor.name,
      correlationId: options?.correlationId,
      causationId: options?.causationId,
      userId: options?.userId,
      merchantId: options?.merchantId,
      metadata: options?.metadata,
    });

    const exchange = options?.exchange || EXCHANGES.PAYMENT_EVENTS;

    try {
      await this.amqpConnection.publish(exchange, routingKey, envelope, {
        persistent: true,
        messageId: envelope.eventId,
        timestamp: envelope.timestamp.getTime(),
        headers: {
          'x-correlation-id': envelope.correlationId,
          'x-causation-id': envelope.causationId,
          'x-event-type': envelope.eventType,
          'x-event-version': envelope.version,
        },
      });

      this.logger.debug(
        `Published event: ${routingKey} (${envelope.eventId})`,
      );

      return envelope.eventId;
    } catch (error) {
      this.logger.error(
        `Failed to publish event: ${routingKey}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }

  async publishBatch<T>(
    events: Array<{
      routingKey: string;
      payload: T;
      options?: {
        correlationId?: string;
        causationId?: string;
        userId?: string;
        merchantId?: string;
        metadata?: Record<string, any>;
      };
    }>,
    exchange: string = EXCHANGES.PAYMENT_EVENTS,
  ): Promise<string[]> {
    const eventIds: string[] = [];

    for (const event of events) {
      const eventId = await this.publish(
        event.routingKey,
        event.payload,
        { ...event.options, exchange },
      );
      eventIds.push(eventId);
    }

    return eventIds;
  }
}
