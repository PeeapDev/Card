import { useCallback, useState } from 'react';
import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';

import {
  createHostedCheckoutSession,
  launchHostedCheckout,
  type HostedCheckoutCreateRequest,
  type HostedCheckoutCreateResponse,
} from '../../lib/hostedCheckout';

export type HostedCheckoutButtonProps = Omit<ButtonProps, 'onClick'> & {
  request: HostedCheckoutCreateRequest;
  autoRedirect?: boolean;
  onCreated?: (result: HostedCheckoutCreateResponse) => void;
  onError?: (error: Error) => void;
};

export function HostedCheckoutButton({
  request,
  autoRedirect = true,
  onCreated,
  onError,
  disabled,
  children,
  ...props
}: HostedCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = useCallback(async () => {
    setLoading(true);
    try {
      const result = autoRedirect
        ? await launchHostedCheckout(request)
        : await createHostedCheckoutSession(request);
      onCreated?.(result);
    } catch (e: any) {
      const err = e instanceof Error ? e : new Error(e?.message || 'Failed to start checkout');
      onError?.(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [autoRedirect, onCreated, onError, request]);

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || loading}
    >
      {children ?? (loading ? 'Starting…' : 'Pay Now')}
    </Button>
  );
}
