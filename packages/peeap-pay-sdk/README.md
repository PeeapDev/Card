# @peeap/pay-sdk

Official Peeap Pay SDK for Web and Mobile Integration - NFC, QR, and Payment Processing.

## Features

- **QR Code Payments** - Generate and scan dynamic payment QR codes
- **NFC Tap-to-Pay** - Web NFC support for contactless payments
- **Payment Sessions** - Create and manage secure payment sessions
- **Checkout Modal** - Pre-built checkout UI component
- **Deep Linking** - Native app integration support
- **TypeScript** - Full type definitions included

## Installation

### NPM/Yarn

```bash
npm install @peeap/pay-sdk
# or
yarn add @peeap/pay-sdk
# or
pnpm add @peeap/pay-sdk
```

### CDN (Browser)

```html
<!-- jsDelivr -->
<script src="https://cdn.jsdelivr.net/gh/PeeapDev/pay-sdk@latest/dist/peeap-pay.js"></script>

<!-- or Cloudflare CDN -->
<script src="https://cdn.peeappay.com/sdk/v1/peeap-pay.js"></script>
```

## Quick Start

### Initialize SDK

```typescript
import { PeeapPay } from '@peeap/pay-sdk';

const peeap = new PeeapPay({
  publicKey: 'pk_live_your_public_key',
  environment: 'production', // or 'sandbox'
  onPaymentComplete: (result) => {
    console.log('Payment completed:', result);
  },
  onError: (error) => {
    console.error('Payment error:', error);
  }
});
```

### Browser Usage (CDN)

```html
<script src="https://cdn.peeappay.com/sdk/v1/peeap-pay.js"></script>
<script>
  const peeap = new PeeapPay({
    publicKey: 'pk_live_your_public_key'
  });
</script>
```

## QR Code Payments

### Generate Payment QR

```typescript
const qr = await peeap.qr.generate({
  amount: 5000, // Amount in cents
  currency: 'USD',
  description: 'Order #12345'
});

console.log(qr.qrImage); // Base64 QR image
console.log(qr.paymentUrl); // Payment URL
console.log(qr.expiresAt); // Expiry timestamp
```

### Display QR Code

```typescript
// Render to canvas
const canvas = document.getElementById('qr-canvas');
peeap.qr.renderToCanvas(canvas, qr.qrImage, 200);

// Or use as image
const img = document.createElement('img');
img.src = qr.qrImage;
```

### Decode QR Code

```typescript
const decoded = await peeap.qr.decode(scannedPayload);
if (decoded.valid) {
  console.log('Card ID:', decoded.cardId);
  console.log('Amount:', decoded.amount);
}
```

## NFC Payments

### Check NFC Support

```typescript
if (peeap.nfc.isSupported()) {
  console.log('Web NFC is available');
}
```

### Listen for NFC Taps

```typescript
// Start reading NFC
await peeap.nfc.startReading();

// Register callback
const unsubscribe = peeap.nfc.onTap((event) => {
  console.log('NFC tap detected:', event.token);
  console.log('Timestamp:', event.timestamp);

  // Process payment
  processNFCPayment(event.token);
});

// Later: stop listening
peeap.nfc.stopReading();
unsubscribe();
```

### Write NFC Tag

```typescript
const nfcUrl = await peeap.nfc.getWriteToken(cardId);
await peeap.nfc.write(nfcUrl);
```

## Payment Sessions

### Create Session

```typescript
const session = await peeap.session.create({
  amount: 10000,
  currency: 'USD',
  description: 'Premium subscription',
  customer: {
    email: 'customer@example.com'
  },
  redirectUrl: 'https://myapp.com/success',
  callbackUrl: 'https://myapp.com/webhooks/peeap'
});

console.log(session.id);
console.log(session.paymentUrl);
console.log(session.deepLink);
```

### Verify Session

```typescript
const result = await peeap.session.verify(token);
if (result.valid) {
  console.log('Session valid:', result.session);
}
```

### Get Session Status

```typescript
const session = await peeap.session.get(sessionId);
console.log('Status:', session.status);
```

## Checkout

### Open Checkout Modal

```typescript
await peeap.checkout.open({
  session: paymentSession,
  onSuccess: (result) => {
    console.log('Payment successful:', result.transactionId);
  },
  onCancel: () => {
    console.log('Payment cancelled');
  },
  onError: (error) => {
    console.error('Payment failed:', error.message);
  }
});
```

### Redirect to Hosted Checkout

```typescript
peeap.checkout.redirect(session);
```

### Close Checkout Modal

```typescript
peeap.checkout.close();
```

## Configuration Options

```typescript
const peeap = new PeeapPay({
  // Required
  publicKey: 'pk_live_...',

  // Optional
  environment: 'production',  // 'sandbox' | 'production'
  baseUrl: 'https://api.peeappay.com', // Custom API URL

  // Callbacks
  onError: (error) => {
    console.error(error.code, error.message);
  },
  onPaymentComplete: (result) => {
    console.log(result.transactionId);
  }
});
```

## TypeScript Support

Full TypeScript definitions are included:

```typescript
import {
  PeeapPay,
  PeeapPayConfig,
  PeeapPayError,
  PaymentResult,
  PaymentSession,
  QRGenerateRequest,
  QRGenerateResponse,
  NFCReadEvent
} from '@peeap/pay-sdk';
```

## Error Handling

```typescript
try {
  const session = await peeap.session.create({
    amount: 5000,
    currency: 'USD'
  });
} catch (error) {
  const peeapError = error as PeeapPayError;
  console.error('Error code:', peeapError.code);
  console.error('Message:', peeapError.message);

  switch (peeapError.code) {
    case 'INVALID_KEY':
      // Handle invalid API key
      break;
    case 'NETWORK_ERROR':
      // Handle network issues
      break;
    case 'SESSION_EXPIRED':
      // Handle expired session
      break;
  }
}
```

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| QR Codes | Yes | Yes | Yes | Yes |
| Web NFC | Android 89+ | No | No | No |
| Checkout | Yes | Yes | Yes | Yes |

## Security

- Never expose your Secret Key (SK) in client-side code
- Only use the Public Key (PK) in the SDK
- All tokens are signed server-side with the SK
- Tokens expire after 5-15 minutes

## Support

- Documentation: https://docs.peeap.com/pay-sdk
- Issues: https://github.com/peeap/pay-sdk/issues
- Email: developers@peeap.com

## License

MIT
