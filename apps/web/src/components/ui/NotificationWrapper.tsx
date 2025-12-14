import { useNotification } from '@/context/NotificationContext';
import { ToastContainer } from './Toast';
import { useEffect } from 'react';

export function NotificationWrapper() {
  const { toasts, dismissToast } = useNotification();

  useEffect(() => {
    if (toasts.length > 0) {
    }
  }, [toasts]);

  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}
