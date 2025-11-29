import { Logger } from '@nestjs/common';
import { ConsumeMessage } from 'amqplib';
import { EventEnvelope, EventMetadata } from '../types/event-envelope';

export abstract class BaseEventConsumer {
  protected readonly logger = new Logger(this.constructor.name);

  protected parseMessage<T>(msg: ConsumeMessage): EventEnvelope<T> {
    const content = msg.content.toString();
    return JSON.parse(content) as EventEnvelope<T>;
  }

  protected getRetryCount(msg: ConsumeMessage): number {
    const headers = msg.properties.headers || {};
    return headers['x-retry-count'] || 0;
  }

  protected shouldRetry(msg: ConsumeMessage, maxRetries: number = 3): boolean {
    return this.getRetryCount(msg) < maxRetries;
  }

  protected getCorrelationId(msg: ConsumeMessage): string | undefined {
    const headers = msg.properties.headers || {};
    return headers['x-correlation-id'] || msg.properties.correlationId;
  }

  protected logEventReceived<T>(envelope: EventEnvelope<T>): void {
    this.logger.debug(
      `Received event: ${envelope.eventType} (${envelope.eventId})`,
    );
  }

  protected logEventProcessed<T>(envelope: EventEnvelope<T>, durationMs: number): void {
    this.logger.debug(
      `Processed event: ${envelope.eventType} (${envelope.eventId}) in ${durationMs}ms`,
    );
  }

  protected logEventFailed<T>(
    envelope: EventEnvelope<T>,
    error: Error,
    willRetry: boolean,
  ): void {
    this.logger.error(
      `Failed to process event: ${envelope.eventType} (${envelope.eventId}). ` +
      `Will retry: ${willRetry}. Error: ${error.message}`,
      error.stack,
    );
  }

  protected async processWithTiming<T, R>(
    envelope: EventEnvelope<T>,
    processor: () => Promise<R>,
  ): Promise<R> {
    this.logEventReceived(envelope);
    const startTime = Date.now();

    try {
      const result = await processor();
      const duration = Date.now() - startTime;
      this.logEventProcessed(envelope, duration);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Event processing failed after ${duration}ms: ${envelope.eventType} (${envelope.eventId})`,
      );
      throw error;
    }
  }
}
