import { useNotification } from '@/context/NotificationContext';
import { ToastContainer } from './Toast';

export function NotificationWrapper() {
  const { toasts, dismissToast } = useNotification();

  return <ToastContainer toasts={toasts} onDismiss={dismissToast} />;
}
