import { useEffect, useMemo, useState } from 'react';

export type HostedCheckoutReturnStatus = 'success' | 'completed' | 'cancelled' | 'canceled' | 'failed' | 'error' | string;

export type HostedCheckoutReturn = {
  reference: string | null;
  status: HostedCheckoutReturnStatus | null;
  error: string | null;
};

export type UseHostedCheckoutReturnOptions = {
  cleanUrl?: boolean;
  onSuccess?: (payload: HostedCheckoutReturn) => void;
  onCancel?: (payload: HostedCheckoutReturn) => void;
  onError?: (payload: HostedCheckoutReturn) => void;
};

export function useHostedCheckoutReturn(options: UseHostedCheckoutReturnOptions = {}): HostedCheckoutReturn {
  const { cleanUrl = true, onSuccess, onCancel, onError } = options;
  const [payload, setPayload] = useState<HostedCheckoutReturn>({ reference: null, status: null, error: null });

  const parsed = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    const reference = params.get('peeap_ref') || params.get('reference') || params.get('ref');
    const status = params.get('peeap_status') || params.get('status');
    const error = params.get('error');

    return {
      reference,
      status: status as HostedCheckoutReturnStatus | null,
      error: error || null,
    } satisfies HostedCheckoutReturn;
  }, []);

  useEffect(() => {
    if (!parsed.reference || !parsed.status) return;

    setPayload(parsed);

    const statusLower = String(parsed.status).toLowerCase();

    if (statusLower === 'success' || statusLower === 'completed') {
      onSuccess?.(parsed);
    } else if (statusLower === 'cancelled' || statusLower === 'canceled') {
      onCancel?.(parsed);
    } else {
      onError?.(parsed);
    }

    if (cleanUrl && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [cleanUrl, onCancel, onError, onSuccess, parsed]);

  return payload;
}
