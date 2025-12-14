"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Trash2,
  CreditCard,
  FileText,
  Users,
  DollarSign,
  Fuel,
  Package,
  Truck,
  Send,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  type Notification,
  type NotificationCategory,
  type NotificationType,
  getNotifications,
  deleteNotification,
  clearAllNotifications,
  subscribeToNotifications,
  initializeSampleNotifications,
} from "@/lib/notifications/notification.service";

const getCategoryIcon = (category: NotificationCategory) => {
  switch (category) {
    case "payment":
      return <DollarSign className="h-4 w-4" />;
    case "invoice":
      return <FileText className="h-4 w-4" />;
    case "subscription":
      return <RefreshCw className="h-4 w-4" />;
    case "staff":
      return <Users className="h-4 w-4" />;
    case "fuel":
      return <Fuel className="h-4 w-4" />;
    case "inventory":
      return <Package className="h-4 w-4" />;
    case "fleet":
      return <Truck className="h-4 w-4" />;
    case "card":
      return <CreditCard className="h-4 w-4" />;
    case "batch_payment":
      return <Send className="h-4 w-4" />;
    default:
      return <Bell className="h-4 w-4" />;
  }
};

const getTypeStyles = (type: NotificationType) => {
  switch (type) {
    case "success":
      return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400";
    case "warning":
      return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
    case "error":
      return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400";
    default:
      return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
  }
};

const formatTimeAgo = (dateInput: Date | string) => {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

export function NotificationsDropdown() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Initialize sample notifications on first load
    initializeSampleNotifications();

    // Load notifications
    setNotifications(getNotifications());

    // Subscribe to updates
    const unsubscribe = subscribeToNotifications((updated) => {
      setNotifications(updated);
    });

    return unsubscribe;
  }, []);

  const notificationCount = notifications.length;

  const handleNotificationClick = (notification: Notification) => {
    // Delete the notification from the list (remove from ribbon)
    deleteNotification(notification.id);
    setNotifications(getNotifications());

    // Close dropdown and navigate to deeplink
    setIsOpen(false);
    if (notification.href) {
      router.push(notification.href);
    }
  };

  const handleActionClick = (e: React.MouseEvent, notificationId: string, href: string) => {
    e.stopPropagation();
    // Delete notification when action is clicked
    deleteNotification(notificationId);
    setNotifications(getNotifications());
    setIsOpen(false);
    router.push(href);
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification(id);
    setNotifications(getNotifications());
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setNotifications([]);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-xl relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {notificationCount > 9 ? "9+" : notificationCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {notificationCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {notificationCount}
              </Badge>
            )}
          </div>
          {notifications.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleClearAll}
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Clear all
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[450px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Bell className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs mt-1">You're all caught up!</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "group px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                )}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className={cn(
                      "flex items-center justify-center w-9 h-9 rounded-lg shrink-0 mt-0.5",
                      getTypeStyles(notification.type)
                    )}
                  >
                    {getCategoryIcon(notification.category)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-tight font-semibold text-foreground">
                        {notification.title}
                      </p>
                      <span className="text-xs text-muted-foreground shrink-0 whitespace-nowrap">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {notification.message}
                    </p>

                    {/* Action buttons */}
                    {notification.actions && notification.actions.length > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        {notification.actions.map((action, idx) => (
                          <Button
                            key={idx}
                            variant={idx === 0 ? "default" : "outline"}
                            size="sm"
                            className="h-6 text-xs px-2"
                            onClick={(e) => handleActionClick(e, notification.id, action.href)}
                          >
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Delete button (hover) */}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
                      onClick={(e) => handleDelete(e, notification.id)}
                      title="Dismiss"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-center px-4 py-2 border-t border-border bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-primary"
              onClick={() => {
                setIsOpen(false);
                router.push("/dashboard/notifications");
              }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Export a hook for creating notifications from anywhere in the app
export {
  createNotification,
  notifyPaymentReceived,
  notifyInvoiceOverdue,
  notifyLowFuelStock,
  notifyFuelSale,
  notifyFleetCreditWarning,
  notifyStaffAccessRequest,
  notifyShiftEnded,
  notifyBatchPaymentComplete,
  notifySubscriptionRenewal,
  notifySubscriptionFailed,
  notifyCardTransaction,
  notifySystem,
} from "@/lib/notifications/notification.service";
