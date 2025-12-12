export type PeeapCurrency = 'SLE' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'GHS' | 'KES' | 'ZAR' | string;

export type PeeapPaymentMethod = 'mobile_money' | 'card' | 'bank_transfer' | 'qr' | 'wallet' | string;

export type HostedCheckoutCreateRequest = {
  publicKey: string;
  amount: number;
  currency: PeeapCurrency;
  description?: string;
  reference?: string;
  redirectUrl?: string;
  idempotencyKey?: string;
  paymentMethod?: PeeapPaymentMethod;
  customerEmail?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type HostedCheckoutCreateResponse = {
  paymentId?: string;
  sessionId: string;
  paymentUrl: string;
  expiresAt?: string;
  amount?: number;
  currency?: string;
  businessName?: string;
  isTestMode?: boolean;
};

function getApiUrl(): string {
  const base = (import.meta as any).env?.VITE_API_URL || 'https://api.peeap.com';
  const trimmed = String(base).replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

export async function createHostedCheckoutSession(
  req: HostedCheckoutCreateRequest,
): Promise<HostedCheckoutCreateResponse> {
  const apiUrl = getApiUrl();

  const response = await fetch(`${apiUrl}/checkout/create`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  const data = (await response.json().catch(() => ({}))) as any;

  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Failed to create checkout session');
  }

  if (!data?.paymentUrl || !data?.sessionId) {
    throw new Error('Invalid checkout response');
  }

  return data as HostedCheckoutCreateResponse;
}

export async function launchHostedCheckout(req: HostedCheckoutCreateRequest): Promise<HostedCheckoutCreateResponse> {
  const result = await createHostedCheckoutSession(req);
  window.location.href = result.paymentUrl;
  return result;
}
