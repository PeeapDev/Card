# peeap-sdk

Accept payments easily with Peeap. Supports Mobile Money (Orange Money, Africell), Cards, and Bank Transfers in Sierra Leone.

## Installation

### npm / yarn

```bash
npm install peeap-sdk
# or
yarn add peeap-sdk
```

### CDN (Browser)

```html
<script src="https://my.peeap.com/embed/peeap-sdk.js"></script>
```

## Quick Start

### Using npm/ES Modules

```javascript
import Peeap from 'peeap-sdk';

// Initialize with your business ID
const peeap = new Peeap({
  businessId: 'your-business-id',
  currency: 'SLE',
});

// Create a payment
async function pay() {
  try {
    await peeap.checkout({
      amount: 50000,        // Amount in SLE (50,000 Leones)
      description: 'Order #123',
      customer: {
        email: 'customer@example.com',
        phone: '+23276123456',
      },
    });
    // User will be redirected to payment page
  } catch (error) {
    console.error('Payment failed:', error.message);
  }
}
```

### Using CDN (Browser)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Checkout</title>
</head>
<body>
  <button id="pay-btn">Pay Le 50,000</button>

  <script src="https://my.peeap.com/embed/peeap-sdk.js"></script>
  <script>
    // Initialize SDK
    PeeapSDK.init({
      businessId: 'your-business-id',
      currency: 'SLE',
      onSuccess: function(payment) {
        console.log('Payment successful!', payment);
        alert('Thank you for your payment!');
      },
      onError: function(error) {
        console.error('Payment failed:', error);
        alert('Payment failed: ' + error.message);
      },
    });

    // Handle pay button click
    document.getElementById('pay-btn').onclick = function() {
      PeeapSDK.createPayment({
        amount: 50000,
        description: 'Product purchase',
      });
    };
  </script>
</body>
</html>
```

## API Reference

### Configuration Options

```typescript
interface PeeapConfig {
  businessId: string;           // Required: Your Peeap business ID
  mode?: 'live' | 'test';       // Default: 'live'
  currency?: Currency;          // Default: 'SLE'
  theme?: 'light' | 'dark';     // Default: 'light'
  onSuccess?: (payment) => void;
  onError?: (error) => void;
  onCancel?: () => void;
}
```

### Payment Options

```typescript
interface PaymentOptions {
  amount: number;               // Required: Amount to charge
  currency?: Currency;          // Default: config currency
  reference?: string;           // Your unique order reference
  description?: string;         // Shown to customer
  customer?: {
    email?: string;
    phone?: string;
    name?: string;
  };
  paymentMethod?: 'mobile_money' | 'card' | 'bank_transfer';
  redirectUrl?: string;         // URL to redirect after payment
  metadata?: object;            // Custom data to attach
}
```

### Methods

#### `init(config)`
Initialize the SDK with your credentials.

```javascript
PeeapSDK.init({
  businessId: 'your-business-id',
  currency: 'SLE',
});
```

#### `checkout(options)` / `createPayment(options)`
Create a payment and redirect to the payment page.

```javascript
await PeeapSDK.checkout({
  amount: 25000,
  description: 'Monthly subscription',
});
```

#### `createButton(options)`
Create a styled payment button element.

```javascript
const button = PeeapSDK.createButton({
  amount: 50000,
  text: 'Buy Now - Le 50,000',
  style: 'primary',  // 'primary', 'secondary', 'minimal'
  size: 'medium',    // 'small', 'medium', 'large'
});

document.getElementById('button-container').appendChild(button);
```

#### `formatAmount(amount, currency?)`
Format an amount with currency symbol.

```javascript
PeeapSDK.formatAmount(50000, 'SLE'); // "Le 50,000.00"
```

#### `verifyPayment(reference)`
Verify a payment status (use server-side for security).

```javascript
const payment = await PeeapSDK.verifyPayment('ref_123456');
console.log(payment.status); // 'completed', 'pending', 'failed'
```

## Supported Currencies

- `SLE` - Sierra Leone Leone (default)
- `USD` - US Dollar
- `EUR` - Euro
- `GBP` - British Pound
- `NGN` - Nigerian Naira
- `GHS` - Ghanaian Cedi

## Payment Methods

- **Mobile Money**: Orange Money, Africell Money
- **Cards**: Visa, Mastercard
- **Bank Transfer**: Direct bank transfers

## Webhooks

Set up webhooks in your Peeap dashboard to receive payment notifications:

```javascript
// Your webhook endpoint
app.post('/webhooks/peeap', (req, res) => {
  const { event, data } = req.body;

  if (event === 'payment.completed') {
    // Update order status
    console.log('Payment completed:', data.reference);
  }

  res.status(200).json({ received: true });
});
```

## React Example

```jsx
import { useEffect } from 'react';
import Peeap from '@peeap/sdk';

function CheckoutButton({ amount, productName }) {
  const peeap = new Peeap({
    businessId: process.env.REACT_APP_PEEAP_BUSINESS_ID,
  });

  const handleCheckout = async () => {
    try {
      await peeap.checkout({
        amount,
        description: `Purchase: ${productName}`,
      });
    } catch (error) {
      alert('Payment failed: ' + error.message);
    }
  };

  return (
    <button onClick={handleCheckout}>
      Pay {peeap.formatAmount(amount)}
    </button>
  );
}
```

## Next.js Example

```jsx
'use client';
import { useEffect, useState } from 'react';

export default function CheckoutPage() {
  const [peeap, setPeeap] = useState(null);

  useEffect(() => {
    import('peeap-sdk').then((module) => {
      const sdk = new module.PeeapSDK({
        businessId: process.env.NEXT_PUBLIC_PEEAP_BUSINESS_ID,
      });
      setPeeap(sdk);
    });
  }, []);

  const handlePay = () => {
    peeap?.checkout({ amount: 100000 });
  };

  return <button onClick={handlePay}>Pay Le 100,000</button>;
}
```

## Support

- Documentation: https://my.peeap.com/docs
- Dashboard: https://my.peeap.com
- Email: support@peeap.com

## License

MIT
