export const QUEUES = {
  // Transaction processing
  TRANSACTION_PROCESSING: 'transaction.processing',
  TRANSACTION_SETTLEMENT: 'transaction.settlement',

  // Fraud detection
  FRAUD_ANALYSIS: 'fraud.analysis',
  FRAUD_ALERTS: 'fraud.alerts',

  // Card operations
  CARD_ISSUANCE: 'card.issuance',
  CARD_LIFECYCLE: 'card.lifecycle',

  // Notifications
  NOTIFICATION_EMAIL: 'notification.email',
  NOTIFICATION_SMS: 'notification.sms',
  NOTIFICATION_PUSH: 'notification.push',
  WEBHOOK_DELIVERY: 'webhook.delivery',

  // Settlement
  SETTLEMENT_PROCESSING: 'settlement.processing',
  SETTLEMENT_PAYOUT: 'settlement.payout',

  // Identity
  KYC_VERIFICATION: 'identity.kyc.verification',

  // Dead letter queues
  TRANSACTION_PROCESSING_DLQ: 'transaction.processing.dlq',
  FRAUD_ANALYSIS_DLQ: 'fraud.analysis.dlq',
  NOTIFICATION_DLQ: 'notification.dlq',
  WEBHOOK_DELIVERY_DLQ: 'webhook.delivery.dlq',
} as const;
