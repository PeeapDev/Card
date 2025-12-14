import { useEffect, useState } from 'react';
import { X, CheckCircle, XCircle, AlertTriangle, Info, ExternalLink, DollarSign, CreditCard, Car, Store, Shield, Bell } from 'lucide-react';
import { clsx } from 'clsx';
import { Notification, NotificationType } from '@/context/NotificationContext';
import { useNavigate } from 'react-router-dom';

interface ToastProps {
  notification: Notification;
  onDismiss: (id: string) => void;
}

const icons: Record<NotificationType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styles: Record<NotificationType, { bg: string; icon: string; border: string }> = {
  success: {
    bg: 'bg-green-50 dark:bg-green-900/30',
    icon: 'text-green-500',
    border: 'border-green-200 dark:border-green-800',
  },
  error: {
    bg: 'bg-red-50 dark:bg-red-900/30',
    icon: 'text-red-500',
    border: 'border-red-200 dark:border-red-800',
  },
  warning: {
    bg: 'bg-yellow-50 dark:bg-yellow-900/30',
    icon: 'text-yellow-500',
    border: 'border-yellow-200 dark:border-yellow-800',
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/30',
    icon: 'text-blue-500',
    border: 'border-blue-200 dark:border-blue-800',
  },
};

export function Toast({ notification, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();
  const Icon = icons[notification.type];
  const style = styles[notification.type];

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(notification.id), 300);
  };

  const handleDeepLink = () => {
    // Call action onClick if provided
    if (notification.action?.onClick) {
      notification.action.onClick();
    }
    // Navigate to deepLink if provided
    if (notification.deepLink) {
      navigate(notification.deepLink);
    }
    handleDismiss();
  };

  const hasAction = notification.action || notification.deepLink;

  return (
    <div
      className={clsx(
        'flex items-start gap-3 p-4 rounded-lg border shadow-lg max-w-sm w-full transform transition-all duration-300',
        hasAction && 'cursor-pointer',
        style.bg,
        style.border,
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      )}
      onClick={hasAction ? handleDeepLink : undefined}
    >
      <Icon className={clsx('w-5 h-5 flex-shrink-0 mt-0.5', style.icon)} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{notification.title}</p>
        {notification.message && (
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{notification.message}</p>
        )}
        {notification.action && (
          <div className="mt-2 flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-500">
            <span>{notification.action.label}</span>
            <ExternalLink className="w-3 h-3" />
          </div>
        )}
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleDismiss();
        }}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-200/50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <X className="w-4 h-4 text-gray-400" />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: Notification[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-auto">
      {toasts.map((toast) => (
        <Toast key={toast.id} notification={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
