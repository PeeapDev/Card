import { NotificationChannel } from '@payment-system/database';

export interface SendNotificationEvent {
  notificationId: string;
  userId?: string;
  merchantId?: string;
  channel: NotificationChannel;
  recipient: string;
  templateCode: string;
  variables: Record<string, any>;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface NotificationSentEvent {
  notificationId: string;
  channel: NotificationChannel;
  recipient: string;
  externalId?: string;
  sentAt: Date;
}

export interface NotificationDeliveredEvent {
  notificationId: string;
  channel: NotificationChannel;
  deliveredAt: Date;
}

export interface NotificationFailedEvent {
  notificationId: string;
  channel: NotificationChannel;
  errorMessage: string;
  retryable: boolean;
}

export interface WebhookDeliveryRequestedEvent {
  deliveryId: string;
  endpointId: string;
  eventType: string;
  eventId: string;
  payload: Record<string, any>;
}

export interface WebhookDeliverySucceededEvent {
  deliveryId: string;
  endpointId: string;
  responseStatus: number;
  responseTimeMs: number;
}

export interface WebhookDeliveryFailedEvent {
  deliveryId: string;
  endpointId: string;
  attemptCount: number;
  errorMessage: string;
  willRetry: boolean;
  nextRetryAt?: Date;
}

export const NOTIFICATION_EVENT_TYPES = {
  SEND_NOTIFICATION: 'notification.send',
  NOTIFICATION_SENT: 'notification.sent',
  NOTIFICATION_DELIVERED: 'notification.delivered',
  NOTIFICATION_FAILED: 'notification.failed',
  WEBHOOK_DELIVERY_REQUESTED: 'webhook.delivery.requested',
  WEBHOOK_DELIVERY_SUCCEEDED: 'webhook.delivery.succeeded',
  WEBHOOK_DELIVERY_FAILED: 'webhook.delivery.failed',
} as const;
