export interface CardRequestedEvent {
  requestId: string;
  userId: string;
  cardType: 'VIRTUAL' | 'PHYSICAL';
  tier: string;
}

export interface CardIssuedEvent {
  cardId: string;
  userId: string;
  cardType: 'VIRTUAL' | 'PHYSICAL';
  cardToken: string;
  lastFour: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface CardActivatedEvent {
  cardId: string;
  userId: string;
  activatedAt: Date;
}

export interface CardBlockedEvent {
  cardId: string;
  userId: string;
  reason: string;
  blockedBy: 'USER' | 'SYSTEM' | 'ADMIN';
}

export interface CardUnblockedEvent {
  cardId: string;
  userId: string;
  unblockedBy: string;
}

export interface CardCancelledEvent {
  cardId: string;
  userId: string;
  reason: string;
  cancelledBy: 'USER' | 'SYSTEM' | 'ADMIN';
}

export interface CardLimitsUpdatedEvent {
  cardId: string;
  userId: string;
  previousLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    perTransactionLimit: number;
  };
  newLimits: {
    dailyLimit: number;
    monthlyLimit: number;
    perTransactionLimit: number;
  };
}

export interface CardPinSetEvent {
  cardId: string;
  userId: string;
  setAt: Date;
}

export interface PhysicalCardShippedEvent {
  cardId: string;
  userId: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: Date;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
}

export const CARD_EVENT_TYPES = {
  CARD_REQUESTED: 'card.requested',
  CARD_ISSUED: 'card.issued',
  CARD_ACTIVATED: 'card.activated',
  CARD_BLOCKED: 'card.blocked',
  CARD_UNBLOCKED: 'card.unblocked',
  CARD_CANCELLED: 'card.cancelled',
  CARD_LIMITS_UPDATED: 'card.limits_updated',
  CARD_PIN_SET: 'card.pin_set',
  PHYSICAL_CARD_SHIPPED: 'card.physical.shipped',
} as const;
