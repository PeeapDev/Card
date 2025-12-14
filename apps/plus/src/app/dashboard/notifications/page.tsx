"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Bell,
  Check,
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
  ExternalLink,
  Filter,
  CheckCheck,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  type Notification,
  type NotificationCategory,
  type NotificationType,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearAllNotifications,
  subscribeToNotifications,
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

const getCategoryLabel = (category: NotificationCategory): string => {
  const labels: Record<NotificationCategory, string> = {
    payment: "Payments",
    invoice: "Invoices",
    subscription: "Subscriptions",
    staff: "Staff",
    system: "System",
    fuel: "Fuel Sales",
    inventory: "Inventory",
    fleet: "Fleet",
    card: "Cards",
    batch_payment: "Batch Payments",
  };
  return labels[category] || category;
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

const formatDate = (date: Date) => {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } else if (days === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } else if (days < 7) {
    return `${date.toLocaleDateString([], { weekday: "long" })} at ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NotificationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [readFilter, setReadFilter] = useState<string>("all");

  useEffect(() => {
    setNotifications(getNotifications());

    const unsubscribe = subscribeToNotifications((updated) => {
      setNotifications(updated);
    });

    return unsubscribe;
  }, []);

  // Check for highlight param from deeplink
  const highlightId = searchParams.get("highlight");

  const filteredNotifications = notifications.filter((n) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !n.title.toLowerCase().includes(query) &&
        !n.message.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
    if (typeFilter !== "all" && n.type !== typeFilter) return false;
    if (readFilter === "unread" && n.read) return false;
    if (readFilter === "read" && !n.read) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);
    setNotifications(getNotifications());

    if (notification.href) {
      router.push(notification.href);
    }
  };

  const handleMarkAsRead = (id: string) => {
    markAsRead(id);
    setNotifications(getNotifications());
  };

  const handleDelete = (id: string) => {
    deleteNotification(id);
    setNotifications(getNotifications());
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    setNotifications(getNotifications());
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to clear all notifications?")) {
      clearAllNotifications();
      setNotifications([]);
    }
  };

  // Group notifications by date
  const groupedNotifications = filteredNotifications.reduce(
    (groups, notification) => {
      const date = notification.createdAt.toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(notification);
      return groups;
    },
    {} as Record<string, Notification[]>
  );

  const getDateLabel = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Today";
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "You're all caught up!"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all as read
            </Button>
          )}
          {notifications.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={handleClearAll}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="payment">Payments</SelectItem>
                  <SelectItem value="invoice">Invoices</SelectItem>
                  <SelectItem value="subscription">Subscriptions</SelectItem>
                  <SelectItem value="fuel">Fuel Sales</SelectItem>
                  <SelectItem value="inventory">Inventory</SelectItem>
                  <SelectItem value="fleet">Fleet</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="card">Cards</SelectItem>
                  <SelectItem value="batch_payment">Batch Payments</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select value={readFilter} onValueChange={setReadFilter}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="unread">Unread</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Bell className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-1">
              No notifications
            </h3>
            <p className="text-muted-foreground text-center max-w-sm">
              {searchQuery || categoryFilter !== "all" || typeFilter !== "all" || readFilter !== "all"
                ? "No notifications match your filters. Try adjusting your search criteria."
                : "You don't have any notifications yet. They'll appear here when you receive them."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedNotifications).map(([date, items]) => (
            <div key={date}>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">
                {getDateLabel(date)}
              </h3>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {items.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "group flex items-start gap-4 p-4 hover:bg-muted/50 transition-colors",
                        !notification.read && "bg-primary/5",
                        notification.href && "cursor-pointer",
                        highlightId === notification.id && "ring-2 ring-primary ring-inset"
                      )}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                          getTypeStyles(notification.type)
                        )}
                      >
                        {getCategoryIcon(notification.category)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p
                              className={cn(
                                "text-sm",
                                !notification.read
                                  ? "font-semibold text-foreground"
                                  : "text-muted-foreground"
                              )}
                            >
                              {notification.title}
                              {notification.href && (
                                <ExternalLink className="inline-block h-3 w-3 ml-1.5 opacity-50" />
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {notification.message}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="outline" className="text-xs">
                              {getCategoryLabel(notification.category)}
                            </Badge>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatDate(notification.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {notification.actions && notification.actions.length > 0 && (
                          <div className="flex items-center gap-2 mt-3">
                            {notification.actions.map((action, idx) => (
                              <Button
                                key={idx}
                                variant={idx === 0 ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(action.href);
                                }}
                              >
                                {action.label}
                              </Button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkAsRead(notification.id);
                            }}
                            title="Mark as read"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(notification.id);
                          }}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
