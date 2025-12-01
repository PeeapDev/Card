# @peeap/peeapcard

Official JavaScript/TypeScript SDK for the PeeapCard Payment Platform - a modern closed-loop payment system.

## Features

- **Wallet Management** - Balance inquiries, top-ups, withdrawals
- **Card Operations** - Virtual and physical card management
- **Payment Processing** - Charges, refunds, payment links
- **Transfers** - Internal P2P transfers
- **QR Payments** - Generate and scan QR codes
- **NFC/Tap-to-Pay** - NFC tag registration and payments
- **Merchant Tools** - Statistics, settlements, reports
- **Developer APIs** - API keys, webhooks, logs

## Installation

```bash
npm install @peeap/peeapcard
# or
yarn add @peeap/peeapcard
# or
pnpm add @peeap/peeapcard
```

## Quick Start

```typescript
import { PeeapCardSDK } from '@peeap/peeapcard';

const sdk = new PeeapCardSDK({
  apiKey: process.env.PEEAPCARD_API_KEY!,
  environment: 'sandbox' // or 'production'
});
```

## Usage Examples

### Wallet Operations

```typescript
// Get wallet balance
const balance = await sdk.wallet.getBalance();
console.log(`Available: ${balance.available} ${balance.currency}`);

// Top up wallet
const topUp = await sdk.wallet.topUp({
  amount: 50000,
  method: 'card'
});

// Withdraw to bank
const withdrawal = await sdk.wallet.withdraw({
  amount: 25000,
  bankCode: 'BANK001',
  accountNumber: '1234567890'
});

// Get transaction history
const transactions = await sdk.wallet.getTransactions({
  page: 1,
  limit: 20
});
```

### Card Operations

```typescript
// Create virtual card
const card = await sdk.cards.createVirtual({
  spendingLimit: 500000,
  currency: 'USD'
});

// Get card details (sensitive)
const details = await sdk.cards.getDetails(card.id);
console.log(`Card: ${details.cardNumber}`);

// Freeze card
await sdk.cards.freeze(card.id);

// Unfreeze card
await sdk.cards.unfreeze(card.id);

// Get card transactions
const cardTxns = await sdk.cards.getTransactions(card.id);
```

### Payment Processing

```typescript
// Create a charge
const payment = await sdk.payments.charge({
  amount: 25000,
  currency: 'USD',
  customerEmail: 'customer@example.com',
  description: 'Order #12345'
});

// Verify payment
const verified = await sdk.payments.verify(payment.id);

// Process refund
const refund = await sdk.payments.refund({
  paymentId: payment.id,
  amount: 10000, // partial refund
  reason: 'Customer request'
});

// Create payment link
const link = await sdk.payments.createPaymentLink({
  amount: 100000,
  description: 'Premium subscription',
  expiresIn: 3600 // 1 hour
});
```

### Transfers

```typescript
// Send transfer
const transfer = await sdk.transfers.send({
  amount: 10000,
  recipientEmail: 'friend@example.com',
  narration: 'Lunch money'
});

// Validate recipient before sending
const recipient = await sdk.transfers.validateRecipient({
  email: 'friend@example.com'
});

// Request money
const request = await sdk.transfers.request({
  amount: 5000,
  fromEmail: 'friend@example.com',
  narration: 'Pay me back'
});
```

### QR Code Payments

```typescript
// Generate QR code
const qr = await sdk.qr.generate({
  amount: 35000,
  type: 'dynamic'
});
console.log(qr.qrImage); // Base64 QR image

// Scan and decode QR
const decoded = await sdk.qr.decode(scannedPayload);

// Complete QR payment
const qrPayment = await sdk.qr.completePayment(qr.id, userPin);
```

### NFC Payments

```typescript
// Register NFC tag
const tag = await sdk.nfc.register({
  tagId: 'NFC_TAG_12345',
  type: 'payment'
});

// Link to wallet
await sdk.nfc.linkToWallet(tag.id, walletId);

// Process NFC payment
const nfcPayment = await sdk.nfc.processPayment({
  tagId: 'NFC_TAG_12345',
  amount: 15000,
  merchantId: 'merchant_123'
});
```

### Webhooks

```typescript
// Verify webhook signature
const isValid = sdk.webhooks.verifySignature({
  payload: req.body,
  signature: req.headers['x-cardpay-signature'],
  secret: process.env.WEBHOOK_SECRET!
});

// Parse webhook event
const event = sdk.webhooks.parseEvent(req.body);
console.log(`Received event: ${event.type}`);

switch (event.type) {
  case 'payment.completed':
    // Handle completed payment
    break;
  case 'card.transaction.completed':
    // Handle card transaction
    break;
}
```

### Developer Tools

```typescript
// List API keys
const apiKeys = await sdk.developer.listApiKeys();

// Create new API key
const newKey = await sdk.developer.createApiKey({
  name: 'Production Key',
  type: 'live'
});

// Create webhook
const webhook = await sdk.developer.createWebhook({
  url: 'https://myapp.com/webhooks',
  events: ['payment.completed', 'card.created']
});

// Get API usage stats
const stats = await sdk.developer.getUsageStats('month');
```

### Settlements (Merchants)

```typescript
// Get settlement summary
const summary = await sdk.settlements.getSummary();

// Request instant settlement
const settlement = await sdk.settlements.requestInstant();

// Get settlement history
const settlements = await sdk.settlements.list({
  status: 'completed',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

## Error Handling

```typescript
import { PeeapCardSDK, SDKError } from '@peeap/peeapcard';

try {
  const payment = await sdk.payments.charge({
    amount: 1000000,
    currency: 'USD'
  });
} catch (error) {
  const sdkError = error as SDKError;
  console.error(`Error: ${sdkError.message}`);
  console.error(`Code: ${sdkError.code}`);
  console.error(`Status: ${sdkError.status}`);
  console.error(`Request ID: ${sdkError.requestId}`);
}
```

## Configuration Options

```typescript
const sdk = new CardPaySDK({
  apiKey: 'sk_live_...',           // Required
  environment: 'production',        // 'sandbox' | 'production'
  baseUrl: 'https://custom.api.com', // Optional custom base URL
  timeout: 30000,                   // Request timeout in ms
  retryAttempts: 3,                 // Number of retry attempts
  retryDelay: 1000                  // Delay between retries in ms
});
```

## TypeScript Support

This SDK is written in TypeScript and includes full type definitions.

```typescript
import {
  PeeapCardSDK,
  SDKConfig,
  WalletBalance,
  Card,
  Payment,
  Transfer,
  QRCode,
  NFCTag,
  SDKError
} from '@peeap/peeapcard';
```

## Browser Support

The SDK works in both Node.js and browser environments. For browsers, use a bundler like webpack, Rollup, or Vite.

## License

MIT
