export interface EventEnvelope<T = any> {
  eventId: string;
  eventType: string;
  version: string;
  timestamp: Date;
  source: string;
  correlationId?: string;
  causationId?: string;
  userId?: string;
  merchantId?: string;
  metadata?: Record<string, any>;
  payload: T;
}

export interface EventMetadata {
  retryCount?: number;
  maxRetries?: number;
  originalTimestamp?: Date;
  deadLetterReason?: string;
}

export function createEventEnvelope<T>(
  eventType: string,
  payload: T,
  options?: {
    source?: string;
    correlationId?: string;
    causationId?: string;
    userId?: string;
    merchantId?: string;
    metadata?: Record<string, any>;
  },
): EventEnvelope<T> {
  return {
    eventId: crypto.randomUUID(),
    eventType,
    version: '1.0',
    timestamp: new Date(),
    source: options?.source || 'unknown',
    correlationId: options?.correlationId,
    causationId: options?.causationId,
    userId: options?.userId,
    merchantId: options?.merchantId,
    metadata: options?.metadata,
    payload,
  };
}
