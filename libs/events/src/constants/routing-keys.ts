export const ROUTING_KEYS = {
  // Payment events
  PAYMENT_ALL: 'payment.#',
  PAYMENT_TRANSACTION_ALL: 'payment.transaction.#',
  PAYMENT_TRANSACTION_INITIATED: 'payment.transaction.initiated',
  PAYMENT_TRANSACTION_AUTHORIZED: 'payment.transaction.authorized',
  PAYMENT_TRANSACTION_CAPTURED: 'payment.transaction.captured',
  PAYMENT_TRANSACTION_SETTLED: 'payment.transaction.settled',
  PAYMENT_TRANSACTION_FAILED: 'payment.transaction.failed',
  PAYMENT_TRANSACTION_REFUNDED: 'payment.transaction.refunded',
  PAYMENT_TRANSACTION_VOIDED: 'payment.transaction.voided',
  PAYMENT_BALANCE_UPDATED: 'payment.balance.updated',

  // Identity events
  IDENTITY_ALL: 'identity.#',
  IDENTITY_USER_ALL: 'identity.user.#',
  IDENTITY_USER_REGISTERED: 'identity.user.registered',
  IDENTITY_USER_VERIFIED: 'identity.user.verified',
  IDENTITY_KYC_ALL: 'identity.kyc.#',
  IDENTITY_KYC_SUBMITTED: 'identity.kyc.submitted',
  IDENTITY_KYC_APPROVED: 'identity.kyc.approved',
  IDENTITY_KYC_REJECTED: 'identity.kyc.rejected',

  // Card events
  CARD_ALL: 'card.#',
  CARD_ISSUED: 'card.issued',
  CARD_ACTIVATED: 'card.activated',
  CARD_BLOCKED: 'card.blocked',
  CARD_CANCELLED: 'card.cancelled',

  // Merchant events
  MERCHANT_ALL: 'merchant.#',
  MERCHANT_CHECKOUT_ALL: 'merchant.checkout.#',
  MERCHANT_CHECKOUT_CREATED: 'merchant.checkout.created',
  MERCHANT_CHECKOUT_COMPLETED: 'merchant.checkout.completed',

  // Settlement events
  SETTLEMENT_ALL: 'settlement.#',
  SETTLEMENT_BATCH_CREATED: 'settlement.batch.created',
  SETTLEMENT_BATCH_PROCESSED: 'settlement.batch.processed',

  // Notification events
  NOTIFICATION_ALL: 'notification.#',
  NOTIFICATION_SEND: 'notification.send',
  WEBHOOK_ALL: 'webhook.#',
  WEBHOOK_DELIVERY: 'webhook.delivery.#',
} as const;
