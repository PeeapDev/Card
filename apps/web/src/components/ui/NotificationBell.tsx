/**
 * NotificationBell Component
 *
 * A bell icon that shows unread notification count and opens a notification panel.
 * Uses database-backed notifications for persistence across sessions and devices.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  CreditCard,
  Banknote,
  Shield,
  Megaphone,
  Settings,
  Car,
  Store,
  ExternalLink,
  UserPlus,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle,
  XCircle,
  Clock,
  ShoppingCart,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Loader2,
  X,
  Check,
} from 'lucide-react';
import { clsx } from 'clsx';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { notificationService, Notification, NotificationType } from '@/services/notification.service';
import { posService } from '@/services/pos.service';
import { StaffInvitationModal } from './StaffInvitationModal';

// Icon mapping for notification types
const notificationIcons: Record<NotificationType, typeof Bell> = {
  staff_invitation: UserPlus,
  payment_received: ArrowDownLeft,
  payment_sent: ArrowUpRight,
  kyc_update: Clock,
  kyc_approved: CheckCircle,
  kyc_rejected: XCircle,
  transaction_alert: AlertTriangle,
  low_balance: AlertTriangle,
  system_announcement: Megaphone,
  promotion: Sparkles,
  security_alert: Shield,
  login_alert: Shield,
  payout_completed: CheckCircle,
  payout_failed: XCircle,
  pos_sale: ShoppingCart,
  pos_receipt: ShoppingCart,
  refund_processed: RefreshCw,
  subscription_expiring: CreditCard,
  feature_unlock: Sparkles,
};

// Color mapping for notification types
const notificationColors: Record<NotificationType, string> = {
  staff_invitation: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  payment_received: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  payment_sent: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  kyc_update: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  kyc_approved: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  kyc_rejected: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  transaction_alert: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
  low_balance: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  system_announcement: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  promotion: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400',
  security_alert: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  login_alert: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  payout_completed: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  payout_failed: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
  pos_sale: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  pos_receipt: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
  refund_processed: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
  subscription_expiring: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
  feature_unlock: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
};

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
  onAcceptInvitation,
  onDeclineInvitation,
  userId,
  staffStatus,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate: (path: string) => void;
  onAcceptInvitation?: (staffId: string, notificationId: string) => void;
  onDeclineInvitation?: (staffId: string, notificationId: string) => void;
  userId?: string;
  staffStatus?: { exists: boolean; invitationStatus?: string };
}) {
  const [processing, setProcessing] = useState(false);
  const Icon = notificationIcons[notification.type] || Bell;
  const colorClass = notificationColors[notification.type] || 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';

  // Check if this is a staff invitation that can be accepted/declined
  const isStaffInvitation = notification.type === 'staff_invitation';
  const staffId = notification.action_data?.staffId;

  // Staff invitation can be responded to if:
  // 1. Staff record exists AND invitation is still pending
  // 2. Or notification hasn't been responded to yet (for backwards compatibility)
  const staffExists = staffStatus?.exists ?? true;
  const isPending = staffStatus?.invitationStatus === 'pending';
  const canRespond = isStaffInvitation && staffId && staffExists && (isPending || !notification.action_data?.responded);

  // Show cancelled status if staff was deleted
  const wasDeleted = isStaffInvitation && !staffExists && notification.action_data?.responded;

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.action_url && !canRespond) {
      onNavigate(notification.action_url);
    }
  };

  const handleAccept = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!staffId || !onAcceptInvitation) return;
    setProcessing(true);
    try {
      await onAcceptInvitation(staffId, notification.id);
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!staffId || !onDeclineInvitation) return;
    setProcessing(true);
    try {
      await onDeclineInvitation(staffId, notification.id);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className={clsx(
        'p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors',
        !notification.is_read && 'bg-blue-50/50 dark:bg-blue-900/20',
        !canRespond && 'cursor-pointer'
      )}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <div className={clsx('p-2 rounded-full flex-shrink-0', colorClass)}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={clsx('text-sm', notification.is_read ? 'text-gray-700 dark:text-gray-300' : 'text-gray-900 dark:text-white font-medium')}>
              {notification.title}
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(notification.id);
              }}
              className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>

          {/* Accept/Decline buttons for staff invitations */}
          {canRespond && (
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleAccept}
                disabled={processing}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Check className="w-3 h-3" />
                )}
                Accept
              </button>
              <button
                onClick={handleDecline}
                disabled={processing}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                {processing ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                Decline
              </button>
            </div>
          )}

          {/* Show responded status */}
          {isStaffInvitation && notification.action_data?.responded && !canRespond && (
            <div className="mt-2">
              <span className={clsx(
                'inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full',
                wasDeleted
                  ? 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                  : notification.action_data.response === 'accepted'
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
              )}>
                {wasDeleted ? (
                  <>
                    <XCircle className="w-3 h-3" />
                    Cancelled
                  </>
                ) : notification.action_data.response === 'accepted' ? (
                  <>
                    <CheckCircle className="w-3 h-3" />
                    Accepted
                  </>
                ) : (
                  <>
                    <XCircle className="w-3 h-3" />
                    Declined
                  </>
                )}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {formatRelativeTime(notification.created_at)}
            </p>
            {notification.action_url && !canRespond && <ExternalLink className="w-3 h-3 text-gray-400" />}
          </div>
          {/* Priority badge for high/urgent */}
          {(notification.priority === 'high' || notification.priority === 'urgent') && (
            <span className={clsx(
              'inline-block mt-1 px-2 py-0.5 text-[10px] font-medium rounded-full',
              notification.priority === 'urgent'
                ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
            )}>
              {notification.priority === 'urgent' ? 'Urgent' : 'Important'}
            </span>
          )}
        </div>
        {!notification.is_read && (
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-2" />
        )}
      </div>
    </div>
  );
}

// State for staff invitation modal
interface InvitationModalState {
  isOpen: boolean;
  staffId: string;
  notificationId: string;
  merchantName: string;
  role: string;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [staffStatuses, setStaffStatuses] = useState<Record<string, { exists: boolean; invitationStatus?: string }>>({});
  const [invitationModal, setInvitationModal] = useState<InvitationModalState>({
    isOpen: false,
    staffId: '',
    notificationId: '',
    merchantName: '',
    role: '',
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Fetch unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user?.id) return;
    try {
      const count = await notificationService.getUnreadCount(user.id);
      setUnreadCount(count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [user?.id]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const { notifications: notifs } = await notificationService.getForUser(user.id, undefined, 20);
      setNotifications(notifs);

      // Check status of staff invitations
      const staffInvitations = notifs.filter(n => n.type === 'staff_invitation' && n.action_data?.staffId);
      if (staffInvitations.length > 0) {
        const statuses: Record<string, { exists: boolean; invitationStatus?: string }> = {};
        await Promise.all(
          staffInvitations.map(async (n) => {
            const staffId = n.action_data?.staffId;
            if (staffId) {
              try {
                const staff = await posService.getStaffById(staffId);
                statuses[staffId] = {
                  exists: !!staff,
                  invitationStatus: staff?.invitation_status,
                };
              } catch {
                statuses[staffId] = { exists: false };
              }
            }
          })
        );
        setStaffStatuses(statuses);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // Initial fetch and polling
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch notifications when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await notificationService.markAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    setMarkingAllRead(true);
    try {
      await notificationService.markAllAsRead(user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      const notification = notifications.find(n => n.id === notificationId);
      await notificationService.delete(notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notification && !notification.is_read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleClearAll = async () => {
    if (!user?.id) return;
    try {
      await notificationService.deleteAllRead(user.id);
      setNotifications(prev => prev.filter(n => !n.is_read));
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Open staff invitation modal
  const handleAcceptInvitation = async (staffId: string, notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification) return;

    // Open the modal with invitation details
    setInvitationModal({
      isOpen: true,
      staffId,
      notificationId,
      merchantName: notification.action_data?.merchantName || 'Business',
      role: notification.action_data?.role || 'staff',
    });
    setIsOpen(false); // Close the notification dropdown
  };

  // Handle actual acceptance with PIN
  const handleConfirmAcceptInvitation = async (pin: string) => {
    if (!user?.id) return;
    const { staffId, notificationId } = invitationModal;

    await posService.acceptStaffInvitation(staffId, user.id, pin);
    // Update notification to show it's been responded to
    await notificationService.update(notificationId, {
      action_data: {
        ...notifications.find(n => n.id === notificationId)?.action_data,
        responded: true,
        response: 'accepted',
      },
      is_read: true,
    });
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, is_read: true, action_data: { ...n.action_data, responded: true, response: 'accepted' } }
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));

    // Navigate to Staff POS page after successful acceptance
    navigate('/dashboard/pos');
  };

  // Handle declining a staff invitation (from notification item)
  const handleDeclineInvitation = async (staffId: string, notificationId: string) => {
    if (!user?.id) return;
    try {
      await posService.declineStaffInvitation(staffId, user.id);
      // Update notification to show it's been responded to
      await notificationService.update(notificationId, {
        action_data: {
          ...notifications.find(n => n.id === notificationId)?.action_data,
          responded: true,
          response: 'declined',
        },
        is_read: true,
      });
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, is_read: true, action_data: { ...n.action_data, responded: true, response: 'declined' } }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error declining invitation:', error);
      alert('Failed to decline invitation');
    }
  };

  // Handle declining from modal
  const handleModalDecline = async () => {
    if (!user?.id) return;
    const { staffId, notificationId } = invitationModal;

    await posService.declineStaffInvitation(staffId, user.id);
    // Update notification to show it's been responded to
    await notificationService.update(notificationId, {
      action_data: {
        ...notifications.find(n => n.id === notificationId)?.action_data,
        responded: true,
        response: 'declined',
      },
      is_read: true,
    });
    setNotifications(prev =>
      prev.map(n =>
        n.id === notificationId
          ? { ...n, is_read: true, action_data: { ...n.action_data, responded: true, response: 'declined' } }
          : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  // Close invitation modal
  const closeInvitationModal = () => {
    setInvitationModal(prev => ({ ...prev, isOpen: false }));
  };

  if (!user) return null;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium text-white bg-red-500 rounded-full">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markingAllRead}
                  className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium disabled:opacity-50"
                >
                  {markingAllRead ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCheck className="w-3.5 h-3.5" />
                  )}
                  Mark all read
                </button>
              )}
              {notifications.some(n => n.is_read) && (
                <button
                  onClick={handleClearAll}
                  className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear read
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto bg-white dark:bg-gray-800">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">No notifications yet</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">We'll notify you when something happens</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  onDelete={handleDelete}
                  onNavigate={handleNavigate}
                  onAcceptInvitation={handleAcceptInvitation}
                  onDeclineInvitation={handleDeclineInvitation}
                  userId={user?.id}
                  staffStatus={notification.action_data?.staffId ? staffStatuses[notification.action_data.staffId] : undefined}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 text-center">
              <Link
                to="/dashboard/notifications"
                onClick={() => setIsOpen(false)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Staff Invitation Modal */}
      <StaffInvitationModal
        isOpen={invitationModal.isOpen}
        onClose={closeInvitationModal}
        onAccept={handleConfirmAcceptInvitation}
        onDecline={handleModalDecline}
        merchantName={invitationModal.merchantName}
        role={invitationModal.role}
      />
    </>
  );
}
