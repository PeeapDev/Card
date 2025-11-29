export const EXCHANGES = {
  PAYMENT_EVENTS: 'payment.events',
  PAYMENT_DLX: 'payment.dlx',
} as const;

export const EXCHANGE_TYPES = {
  TOPIC: 'topic',
  DIRECT: 'direct',
  FANOUT: 'fanout',
  HEADERS: 'headers',
} as const;
