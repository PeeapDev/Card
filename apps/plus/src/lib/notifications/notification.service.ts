/**
 * Notification Service
 * Manages in-app notifications with deeplink support using IndexedDB
 */

import { getAll, put, remove, clearStore, STORES, getById } from '../db/indexed-db';

export type NotificationType = "info" | "success" | "warning" | "error";

export type NotificationCategory =
  | "payment"
  | "invoice"
  | "subscription"
  | "staff"
  | "system"
  | "fuel"
  | "inventory"
  | "fleet"
  | "card"
  | "batch_payment";

export interface NotificationAction {
  label: string;
  href: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  category: NotificationCategory;
  read: boolean;
  createdAt: string;  // ISO string for IndexedDB
  // Deeplink support
  href?: string;
  resourceId?: string;
  resourceType?: string;
  actions?: NotificationAction[];
  metadata?: Record<string, unknown>;
  userId?: string;  // For user-specific notifications
}

export interface CreateNotificationInput {
  title: string;
  message: string;
  type?: NotificationType;
  category: NotificationCategory;
  href?: string;
  resourceId?: string;
  resourceType?: string;
  actions?: NotificationAction[];
  metadata?: Record<string, unknown>;
  userId?: string;
}

const MAX_NOTIFICATIONS = 100;

// Event emitter for notification updates
type NotificationListener = (notifications: Notification[]) => void;
const listeners: Set<NotificationListener> = new Set();

// In-memory cache
let notificationsCache: Notification[] | null = null;
let cacheInitialized = false;

/**
 * Generate unique ID
 */
function generateId(): string {
  return `notif_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Build deeplink URL based on resource type and ID
 */
export function buildDeeplink(resourceType: string, resourceId: string): string {
  const deeplinkMap: Record<string, string> = {
    invoice: `/dashboard/invoices/${resourceId}`,
    subscription: `/dashboard/subscriptions/${resourceId}`,
    transaction: `/dashboard/transactions?id=${resourceId}`,
    fuel_sale: `/dashboard/fuel/sales/${resourceId}`,
    fuel_station: `/dashboard/fuel/stations/${resourceId}`,
    fuel_delivery: `/dashboard/fuel/inventory/deliveries?id=${resourceId}`,
    fleet_customer: `/dashboard/fuel/fleet/${resourceId}`,
    fleet_invoice: `/dashboard/fuel/fleet/invoices/${resourceId}`,
    fuel_card: `/dashboard/fuel/cards/${resourceId}`,
    staff: `/dashboard/hr/employees/${resourceId}`,
    shift: `/dashboard/fuel/shifts/${resourceId}`,
    batch_payment: `/dashboard/batch-payments/${resourceId}`,
    card: `/dashboard/cards?id=${resourceId}`,
    expense: `/dashboard/expenses/${resourceId}`,
    report: `/dashboard/reports?type=${resourceId}`,
  };

  return deeplinkMap[resourceType] || `/dashboard`;
}

/**
 * Notify all listeners
 */
function notifyListeners(notifications: Notification[]): void {
  listeners.forEach(listener => listener(notifications));
}

/**
 * Load notifications from IndexedDB
 */
async function loadNotifications(): Promise<Notification[]> {
  if (cacheInitialized && notificationsCache !== null) {
    return notificationsCache;
  }

  try {
    const notifications = await getAll<Notification>(STORES.NOTIFICATIONS);
    // Sort by createdAt descending
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    notificationsCache = notifications;
    cacheInitialized = true;
    return notifications;
  } catch (error) {
    console.error('Error loading notifications:', error);
    return [];
  }
}

/**
 * Save notification to IndexedDB
 */
async function saveNotification(notification: Notification): Promise<boolean> {
  try {
    const success = await put(STORES.NOTIFICATIONS, notification);
    if (success) {
      // Update cache
      if (notificationsCache) {
        const index = notificationsCache.findIndex(n => n.id === notification.id);
        if (index >= 0) {
          notificationsCache[index] = notification;
        } else {
          notificationsCache.unshift(notification);
          // Trim to max
          if (notificationsCache.length > MAX_NOTIFICATIONS) {
            const removed = notificationsCache.pop();
            if (removed) {
              remove(STORES.NOTIFICATIONS, removed.id);
            }
          }
        }
      }
    }
    return success;
  } catch (error) {
    console.error('Error saving notification:', error);
    return false;
  }
}

/**
 * Get all notifications (async)
 */
export async function getNotificationsAsync(): Promise<Notification[]> {
  return loadNotifications();
}

/**
 * Get all notifications (sync - returns cached)
 */
export function getNotifications(): Notification[] {
  return notificationsCache || [];
}

/**
 * Initialize notifications (call on app start)
 */
export async function initializeNotifications(): Promise<Notification[]> {
  const notifications = await loadNotifications();

  // If empty, create sample notifications
  if (notifications.length === 0) {
    await initializeSampleNotifications();
    return loadNotifications();
  }

  return notifications;
}

/**
 * Subscribe to notification updates
 */
export function subscribeToNotifications(listener: NotificationListener): () => void {
  listeners.add(listener);

  // Send current notifications immediately
  if (notificationsCache) {
    listener(notificationsCache);
  } else {
    loadNotifications().then(notifications => listener(notifications));
  }

  return () => listeners.delete(listener);
}

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification> {
  // Build href from resource if not provided
  let href = input.href;
  if (!href && input.resourceType && input.resourceId) {
    href = buildDeeplink(input.resourceType, input.resourceId);
  }

  const notification: Notification = {
    id: generateId(),
    title: input.title,
    message: input.message,
    type: input.type || "info",
    category: input.category,
    read: false,
    createdAt: new Date().toISOString(),
    href,
    resourceId: input.resourceId,
    resourceType: input.resourceType,
    actions: input.actions,
    metadata: input.metadata,
    userId: input.userId,
  };

  await saveNotification(notification);

  // Reload and notify
  const notifications = await loadNotifications();
  notifyListeners(notifications);

  return notification;
}

/**
 * Mark notification as read
 */
export async function markAsRead(id: string): Promise<void> {
  const notification = await getById<Notification>(STORES.NOTIFICATIONS, id);
  if (notification) {
    notification.read = true;
    await saveNotification(notification);
    notifyListeners(notificationsCache || []);
  }
}

/**
 * Mark all notifications as read
 */
export async function markAllAsRead(): Promise<void> {
  const notifications = await loadNotifications();
  for (const notification of notifications) {
    if (!notification.read) {
      notification.read = true;
      await put(STORES.NOTIFICATIONS, notification);
    }
  }
  notificationsCache = notifications;
  notifyListeners(notifications);
}

/**
 * Delete a notification
 */
export async function deleteNotification(id: string): Promise<void> {
  await remove(STORES.NOTIFICATIONS, id);

  // Update cache
  if (notificationsCache) {
    notificationsCache = notificationsCache.filter(n => n.id !== id);
  }

  notifyListeners(notificationsCache || []);
}

/**
 * Clear all notifications
 */
export async function clearAllNotifications(): Promise<void> {
  await clearStore(STORES.NOTIFICATIONS);
  notificationsCache = [];
  notifyListeners([]);
}

/**
 * Get unread count
 */
export function getUnreadCount(): number {
  return (notificationsCache || []).filter(n => !n.read).length;
}

// ============================================
// Notification Factory Functions (Helpers)
// ============================================

/**
 * Payment received notification
 */
export async function notifyPaymentReceived(params: {
  invoiceNumber: string;
  invoiceId: string;
  customerName: string;
  amount: string;
}): Promise<Notification> {
  return createNotification({
    title: "Payment Received",
    message: `Invoice ${params.invoiceNumber} has been paid by ${params.customerName} (${params.amount})`,
    type: "success",
    category: "payment",
    resourceType: "invoice",
    resourceId: params.invoiceId,
    actions: [
      { label: "View Invoice", href: `/dashboard/invoices/${params.invoiceId}` },
    ],
  });
}

/**
 * Invoice overdue notification
 */
export async function notifyInvoiceOverdue(params: {
  invoiceNumber: string;
  invoiceId: string;
  customerName: string;
  daysOverdue: number;
  amount: string;
}): Promise<Notification> {
  return createNotification({
    title: "Invoice Overdue",
    message: `Invoice ${params.invoiceNumber} from ${params.customerName} is ${params.daysOverdue} days overdue (${params.amount})`,
    type: "error",
    category: "invoice",
    resourceType: "invoice",
    resourceId: params.invoiceId,
    actions: [
      { label: "View Invoice", href: `/dashboard/invoices/${params.invoiceId}` },
      { label: "Send Reminder", href: `/dashboard/invoices/${params.invoiceId}?action=remind` },
    ],
  });
}

/**
 * Low fuel stock notification
 */
export async function notifyLowFuelStock(params: {
  stationName: string;
  stationId: string;
  fuelType: string;
  currentLevel: number;
  tankId: string;
}): Promise<Notification> {
  return createNotification({
    title: "Low Fuel Stock",
    message: `${params.fuelType} at ${params.stationName} is at ${params.currentLevel}% capacity`,
    type: "warning",
    category: "inventory",
    resourceType: "fuel_station",
    resourceId: params.stationId,
    actions: [
      { label: "View Station", href: `/dashboard/fuel/stations/${params.stationId}` },
      { label: "Order Delivery", href: `/dashboard/fuel/inventory/deliveries/new?tank=${params.tankId}` },
    ],
    metadata: { tankId: params.tankId, fuelType: params.fuelType },
  });
}

/**
 * New fuel sale notification
 */
export async function notifyFuelSale(params: {
  saleId: string;
  stationName: string;
  amount: string;
  liters: string;
  fuelType: string;
  paymentMethod: string;
}): Promise<Notification> {
  return createNotification({
    title: "Fuel Sale Recorded",
    message: `${params.liters}L of ${params.fuelType} sold at ${params.stationName} for ${params.amount} (${params.paymentMethod})`,
    type: "success",
    category: "fuel",
    resourceType: "fuel_sale",
    resourceId: params.saleId,
  });
}

/**
 * Fleet credit limit warning
 */
export async function notifyFleetCreditWarning(params: {
  customerId: string;
  customerName: string;
  usedPercentage: number;
  currentBalance: string;
  creditLimit: string;
}): Promise<Notification> {
  return createNotification({
    title: "Fleet Credit Limit Warning",
    message: `${params.customerName} has used ${params.usedPercentage}% of their credit limit (${params.currentBalance}/${params.creditLimit})`,
    type: "warning",
    category: "fleet",
    resourceType: "fleet_customer",
    resourceId: params.customerId,
    actions: [
      { label: "View Account", href: `/dashboard/fuel/fleet/${params.customerId}` },
      { label: "Generate Invoice", href: `/dashboard/fuel/fleet/${params.customerId}/invoices/new` },
    ],
  });
}

/**
 * Staff access request notification
 */
export async function notifyStaffAccessRequest(params: {
  staffId: string;
  staffName: string;
  requestedAccess: string;
}): Promise<Notification> {
  return createNotification({
    title: "Staff Access Request",
    message: `${params.staffName} requested access to ${params.requestedAccess}`,
    type: "info",
    category: "staff",
    resourceType: "staff",
    resourceId: params.staffId,
    actions: [
      { label: "Approve", href: `/dashboard/hr/employees/${params.staffId}?action=approve` },
      { label: "Review", href: `/dashboard/hr/employees/${params.staffId}` },
    ],
  });
}

/**
 * Shift ended notification
 */
export async function notifyShiftEnded(params: {
  shiftId: string;
  staffName: string;
  stationName: string;
  totalSales: string;
  variance?: string;
}): Promise<Notification> {
  const hasVariance = params.variance && params.variance !== "NLe 0.00";
  return createNotification({
    title: "Shift Ended",
    message: `${params.staffName} ended shift at ${params.stationName}. Total sales: ${params.totalSales}${hasVariance ? ` (Variance: ${params.variance})` : ""}`,
    type: hasVariance ? "warning" : "info",
    category: "fuel",
    resourceType: "shift",
    resourceId: params.shiftId,
    actions: [
      { label: "View Shift Report", href: `/dashboard/fuel/shifts/${params.shiftId}` },
    ],
  });
}

/**
 * Batch payment completed notification
 */
export async function notifyBatchPaymentComplete(params: {
  batchId: string;
  successCount: number;
  failedCount: number;
  totalAmount: string;
}): Promise<Notification> {
  const hasFailures = params.failedCount > 0;
  return createNotification({
    title: "Batch Payment Complete",
    message: `${params.successCount} payments processed successfully${hasFailures ? `, ${params.failedCount} failed` : ""}. Total: ${params.totalAmount}`,
    type: hasFailures ? "warning" : "success",
    category: "batch_payment",
    resourceType: "batch_payment",
    resourceId: params.batchId,
    actions: [
      { label: "View Details", href: `/dashboard/batch-payments/${params.batchId}` },
    ],
  });
}

/**
 * Subscription renewal notification
 */
export async function notifySubscriptionRenewal(params: {
  subscriptionId: string;
  customerName: string;
  planName: string;
  amount: string;
  nextBillingDate: string;
}): Promise<Notification> {
  return createNotification({
    title: "Subscription Renewed",
    message: `${params.customerName}'s ${params.planName} subscription renewed for ${params.amount}. Next billing: ${params.nextBillingDate}`,
    type: "success",
    category: "subscription",
    resourceType: "subscription",
    resourceId: params.subscriptionId,
  });
}

/**
 * Subscription failed notification
 */
export async function notifySubscriptionFailed(params: {
  subscriptionId: string;
  customerName: string;
  planName: string;
  reason: string;
}): Promise<Notification> {
  return createNotification({
    title: "Subscription Payment Failed",
    message: `Payment failed for ${params.customerName}'s ${params.planName} subscription: ${params.reason}`,
    type: "error",
    category: "subscription",
    resourceType: "subscription",
    resourceId: params.subscriptionId,
    actions: [
      { label: "Retry Payment", href: `/dashboard/subscriptions/${params.subscriptionId}?action=retry` },
      { label: "Contact Customer", href: `/dashboard/subscriptions/${params.subscriptionId}` },
    ],
  });
}

/**
 * Card transaction notification
 */
export async function notifyCardTransaction(params: {
  cardId: string;
  cardLast4: string;
  staffName: string;
  amount: string;
  merchant?: string;
}): Promise<Notification> {
  return createNotification({
    title: "Card Transaction",
    message: `${params.staffName}'s card (****${params.cardLast4}) used for ${params.amount}${params.merchant ? ` at ${params.merchant}` : ""}`,
    type: "info",
    category: "card",
    resourceType: "card",
    resourceId: params.cardId,
  });
}

/**
 * System notification
 */
export async function notifySystem(params: {
  title: string;
  message: string;
  type?: NotificationType;
  href?: string;
}): Promise<Notification> {
  return createNotification({
    title: params.title,
    message: params.message,
    type: params.type || "info",
    category: "system",
    href: params.href,
  });
}

// ============================================
// Initialize with sample notifications
// ============================================

export async function initializeSampleNotifications(): Promise<void> {
  // Create sample notifications with links to main list pages
  await createNotification({
    title: "Payment Received",
    message: "Invoice INV-2024-001 has been paid by Acme Corp (NLe 2,500.00)",
    type: "success",
    category: "payment",
    href: "/dashboard/invoices",
  });

  await createNotification({
    title: "Low Fuel Stock",
    message: "Petrol at Main Station is at 18% capacity",
    type: "warning",
    category: "inventory",
    href: "/dashboard/fuel/inventory",
  });

  await createNotification({
    title: "Staff Access Request",
    message: "John Doe requested access to Fuel Sales",
    type: "info",
    category: "staff",
    href: "/dashboard/hr/employees",
  });

  await createNotification({
    title: "Invoice Overdue",
    message: "Invoice INV-2024-003 from Beta Industries is 7 days overdue (NLe 5,200.00)",
    type: "error",
    category: "invoice",
    href: "/dashboard/invoices",
  });
}
