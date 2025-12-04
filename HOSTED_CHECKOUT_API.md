# Hosted Checkout API Documentation

## Overview

The Hosted Checkout API provides a PayPal/Stripe-like instant checkout experience for developers. Create a checkout session via API, redirect your users to our hosted checkout page, and receive payment confirmation through webhooks or redirect URLs.

**Benefits:**
- 🚀 **Instant Integration** - No frontend payment forms needed
- 🎨 **Customizable Branding** - Add your logo, colors, and business name
- 💳 **Multiple Payment Methods** - QR Code, National Cards, Mobile Money
- 🔒 **PCI Compliant** - We handle all payment security
- 📱 **Mobile Optimized** - Works seamlessly across all devices

---

## Quick Start

### 1. Create a Checkout Session

**Endpoint:** `POST /checkout/sessions`

**Headers:**
```http
Content-Type: application/json
X-API-Key: your_api_key_here
```

**Request Body:**
```json
{
  "merchantId": "mer_1234567890",
  "amount": 50000,
  "currency": "SLE",
  "description": "Premium Plan Subscription",
  "successUrl": "https://yourapp.com/payment/success",
  "cancelUrl": "https://yourapp.com/payment/cancel",
  "merchantName": "Your Business Name",
  "merchantLogoUrl": "https://yourapp.com/logo.png",
  "brandColor": "#FF5722",
  "paymentMethods": {
    "qr": true,
    "card": true,
    "mobile": true
  },
  "metadata": {
    "orderId": "order_12345",
    "customerId": "cust_67890"
  }
}
```

**Response:**
```json
{
  "sessionId": "cs_a1b2c3d4e5f6g7h8i9j0",
  "url": "https://yourapp.com/checkout/pay/cs_a1b2c3d4e5f6g7h8i9j0",
  "expiresAt": "2024-01-15T14:30:00Z"
}
```

### 2. Redirect User to Checkout

Redirect your user to the `url` returned in the response:

```javascript
// Redirect user
window.location.href = response.url;

// Or open in new tab
window.open(response.url, '_blank');
```

### 3. Handle Redirects

After payment completion or cancellation, the user will be redirected to your specified URLs:

**Success:** `https://yourapp.com/payment/success?session_id={sessionId}`
**Cancel:** `https://yourapp.com/payment/cancel?session_id={sessionId}`

---

## API Reference

### Create Checkout Session

**`POST /checkout/sessions`**

Creates a new checkout session and returns a hosted checkout URL.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `merchantId` | string | ✅ | Your merchant ID |
| `amount` | number | ✅ | Amount in minor units (cents, kobo, etc.) |
| `currency` | string | ✅ | ISO 4217 currency code (SLE, USD, NGN, etc.) |
| `description` | string | ❌ | Payment description shown to customer |
| `successUrl` | string | ✅ | URL to redirect after successful payment |
| `cancelUrl` | string | ✅ | URL to redirect after cancelled payment |
| `merchantName` | string | ❌ | Your business name displayed on checkout |
| `merchantLogoUrl` | string | ❌ | URL to your logo image (PNG, JPG, SVG) |
| `brandColor` | string | ❌ | Hex color code for buttons/accents (default: #4F46E5) |
| `paymentMethods` | object | ❌ | Enable/disable payment methods (default: all enabled) |
| `metadata` | object | ❌ | Custom key-value pairs for your reference |

#### Payment Methods Object

```json
{
  "qr": true,      // QR code scanning with Peeap app
  "card": true,    // National card payments
  "mobile": true   // Mobile money (Orange Money, etc.)
}
```

#### Response

```json
{
  "sessionId": "cs_a1b2c3d4e5f6g7h8i9j0",
  "url": "https://checkout.peeap.com/pay/cs_a1b2c3d4e5f6g7h8i9j0",
  "expiresAt": "2024-01-15T14:30:00Z"
}
```

---

### Get Checkout Session

**`GET /checkout/sessions/:sessionId`**

Retrieves the details of a checkout session.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | string | ✅ | The checkout session ID |

#### Response

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "externalId": "cs_a1b2c3d4e5f6g7h8i9j0",
  "merchantId": "mer_1234567890",
  "status": "OPEN",
  "amount": 50000,
  "currencyCode": "SLE",
  "description": "Premium Plan Subscription",
  "merchantName": "Your Business Name",
  "merchantLogoUrl": "https://yourapp.com/logo.png",
  "brandColor": "#FF5722",
  "paymentMethods": {
    "qr": true,
    "card": true,
    "mobile": true
  },
  "successUrl": "https://yourapp.com/payment/success",
  "cancelUrl": "https://yourapp.com/payment/cancel",
  "transactionId": null,
  "metadata": {
    "orderId": "order_12345",
    "customerId": "cust_67890"
  },
  "expiresAt": "2024-01-15T14:30:00Z",
  "completedAt": null,
  "createdAt": "2024-01-15T14:00:00Z"
}
```

#### Session Status

- `OPEN` - Active session, awaiting payment
- `COMPLETE` - Payment successfully completed
- `EXPIRED` - Session expired (30 minutes timeout)
- `CANCELLED` - Payment was cancelled by user

---

## Integration Examples

### Node.js / Express

```javascript
const axios = require('axios');

// Create checkout session
app.post('/create-checkout', async (req, res) => {
  try {
    const response = await axios.post('https://api.peeap.com/checkout/sessions', {
      merchantId: process.env.MERCHANT_ID,
      amount: 50000, // Le 500.00
      currency: 'SLE',
      description: 'Premium Subscription',
      successUrl: `${process.env.APP_URL}/payment/success`,
      cancelUrl: `${process.env.APP_URL}/payment/cancel`,
      merchantName: 'My Awesome App',
      merchantLogoUrl: `${process.env.APP_URL}/logo.png`,
      brandColor: '#FF5722',
      metadata: {
        userId: req.user.id,
        plan: 'premium'
      }
    }, {
      headers: {
        'X-API-Key': process.env.PEEAP_API_KEY
      }
    });

    // Redirect user to checkout
    res.redirect(response.data.url);
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Handle success redirect
app.get('/payment/success', async (req, res) => {
  const { session_id } = req.query;

  try {
    // Verify session status
    const session = await axios.get(
      `https://api.peeap.com/checkout/sessions/${session_id}`,
      {
        headers: { 'X-API-Key': process.env.PEEAP_API_KEY }
      }
    );

    if (session.data.status === 'COMPLETE') {
      // Payment successful - activate user's subscription
      await activateSubscription(session.data.metadata.userId);
      res.render('success', { session: session.data });
    } else {
      res.redirect('/payment/pending');
    }
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).render('error');
  }
});
```

---

### Python / Flask

```python
import requests
from flask import Flask, redirect, request, render_template
import os

app = Flask(__name__)

PEEAP_API_URL = 'https://api.peeap.com'
PEEAP_API_KEY = os.getenv('PEEAP_API_KEY')
MERCHANT_ID = os.getenv('MERCHANT_ID')

@app.route('/create-checkout', methods=['POST'])
def create_checkout():
    try:
        response = requests.post(
            f'{PEEAP_API_URL}/checkout/sessions',
            json={
                'merchantId': MERCHANT_ID,
                'amount': 50000,  # Le 500.00
                'currency': 'SLE',
                'description': 'Premium Subscription',
                'successUrl': f'{request.host_url}payment/success',
                'cancelUrl': f'{request.host_url}payment/cancel',
                'merchantName': 'My Awesome App',
                'merchantLogoUrl': f'{request.host_url}static/logo.png',
                'brandColor': '#FF5722',
                'metadata': {
                    'userId': request.user.id,
                    'plan': 'premium'
                }
            },
            headers={'X-API-Key': PEEAP_API_KEY}
        )

        data = response.json()
        return redirect(data['url'])

    except Exception as e:
        print(f'Checkout error: {e}')
        return {'error': 'Failed to create checkout session'}, 500

@app.route('/payment/success')
def payment_success():
    session_id = request.args.get('session_id')

    try:
        # Verify session status
        response = requests.get(
            f'{PEEAP_API_URL}/checkout/sessions/{session_id}',
            headers={'X-API-Key': PEEAP_API_KEY}
        )

        session = response.json()

        if session['status'] == 'COMPLETE':
            # Payment successful
            activate_subscription(session['metadata']['userId'])
            return render_template('success.html', session=session)
        else:
            return redirect('/payment/pending')

    except Exception as e:
        print(f'Verification error: {e}')
        return render_template('error.html'), 500
```

---

### PHP / Laravel

```php
<?php

use Illuminate\Support\Facades\Http;
use Illuminate\Http\Request;

class CheckoutController extends Controller
{
    public function createCheckout(Request $request)
    {
        try {
            $response = Http::withHeaders([
                'X-API-Key' => config('services.peeap.api_key'),
            ])->post('https://api.peeap.com/checkout/sessions', [
                'merchantId' => config('services.peeap.merchant_id'),
                'amount' => 50000, // Le 500.00
                'currency' => 'SLE',
                'description' => 'Premium Subscription',
                'successUrl' => route('payment.success'),
                'cancelUrl' => route('payment.cancel'),
                'merchantName' => 'My Awesome App',
                'merchantLogoUrl' => asset('images/logo.png'),
                'brandColor' => '#FF5722',
                'metadata' => [
                    'userId' => auth()->id(),
                    'plan' => 'premium'
                ]
            ]);

            $data = $response->json();
            return redirect($data['url']);
        } catch (\Exception $e) {
            \Log::error('Checkout error: ' . $e->getMessage());
            return back()->withErrors(['error' => 'Failed to create checkout session']);
        }
    }

    public function paymentSuccess(Request $request)
    {
        $sessionId = $request->query('session_id');

        try {
            $response = Http::withHeaders([
                'X-API-Key' => config('services.peeap.api_key'),
            ])->get("https://api.peeap.com/checkout/sessions/{$sessionId}");

            $session = $response->json();

            if ($session['status'] === 'COMPLETE') {
                // Payment successful
                $this->activateSubscription($session['metadata']['userId']);
                return view('payment.success', ['session' => $session]);
            } else {
                return redirect()->route('payment.pending');
            }
        } catch (\Exception $e) {
            \Log::error('Verification error: ' . $e->getMessage());
            return view('payment.error')->withErrors(['error' => 'Payment verification failed']);
        }
    }
}
```

---

## Supported Currencies

| Code | Currency | Decimals |
|------|----------|----------|
| SLE | Sierra Leonean Leone | 2 |
| USD | US Dollar | 2 |
| EUR | Euro | 2 |
| GBP | British Pound | 2 |
| NGN | Nigerian Naira | 2 |
| GHS | Ghanaian Cedi | 2 |

**Amount Format:** Always provide amounts in minor units (cents). For example:
- Le 500.00 = 50000
- $10.50 = 1050
- €25.99 = 2599

---

## Payment Methods

### 1. QR Code Payment

Users scan a dynamically generated QR code with the Peeap mobile app. Works instantly for users already logged into the app.

**Best for:** In-person payments, mobile-first experiences

### 2. National Card Payment

Direct card entry for local/national card networks. Supports card number, expiry, CVV, and cardholder name.

**Best for:** Standard e-commerce checkout flows

### 3. Mobile Money

Integration with Orange Money and other mobile wallet providers via Monime gateway. Requires user login/registration.

**Best for:** Mobile-first markets, unbanked customers

---

## Security & Compliance

### PCI Compliance

All payment data is handled securely on our hosted checkout page. You never touch sensitive card information, making PCI compliance simple.

### HTTPS Required

All API calls and redirect URLs must use HTTPS in production.

### API Key Security

- Never expose API keys in frontend code
- Use environment variables
- Rotate keys regularly
- Use different keys for development and production

---

## Testing

### Test Mode

Use test API keys to create checkout sessions without real transactions:

```bash
# Test API Key
X-API-Key: test_sk_1234567890abcdef

# Test Merchant ID
merchantId: test_mer_1234567890
```

### Test Cards

```
Card Number: 4111 1111 1111 1111
Expiry: Any future date (MM/YY)
CVV: Any 3 digits
Name: Any name
```

### Test Mobile Money

Use test phone numbers:
- `+232 76 000 0001` - Successful payment
- `+232 76 000 0002` - Failed payment
- `+232 76 000 0003` - Timeout

---

## Error Handling

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `session_not_found` | 404 | Invalid session ID |
| `session_expired` | 400 | Session has expired (30 min timeout) |
| `session_completed` | 400 | Session already completed |
| `invalid_amount` | 400 | Amount must be positive |
| `invalid_currency` | 400 | Currency not supported |
| `invalid_merchant` | 403 | Invalid merchant ID |
| `payment_failed` | 400 | Payment processing failed |

### Error Response Format

```json
{
  "error": {
    "code": "session_expired",
    "message": "This checkout session has expired",
    "details": "Sessions expire after 30 minutes of inactivity"
  }
}
```

---

## Webhooks (Coming Soon)

Receive real-time payment notifications via webhooks:

```json
POST https://yourapp.com/webhooks/peeap

{
  "event": "checkout.completed",
  "sessionId": "cs_a1b2c3d4e5f6g7h8i9j0",
  "status": "COMPLETE",
  "amount": 50000,
  "currency": "SLE",
  "transactionId": "txn_xyz789",
  "metadata": {
    "orderId": "order_12345"
  },
  "timestamp": "2024-01-15T14:30:00Z"
}
```

**Webhook Events:**
- `checkout.completed` - Payment successful
- `checkout.expired` - Session expired without payment
- `checkout.cancelled` - User cancelled payment

---

## Best Practices

### 1. Always Verify Payment Status

Never trust redirect URLs alone. Always verify the session status via API:

```javascript
// ❌ Bad - Don't trust redirects alone
app.get('/payment/success', (req, res) => {
  activateSubscription(req.user.id); // UNSAFE!
});

// ✅ Good - Verify session status
app.get('/payment/success', async (req, res) => {
  const session = await verifySession(req.query.session_id);
  if (session.status === 'COMPLETE') {
    activateSubscription(req.user.id);
  }
});
```

### 2. Use Idempotency

Store session IDs to prevent duplicate charges:

```javascript
// Check if session already processed
const existing = await db.payments.findOne({ sessionId });
if (existing) {
  return res.redirect('/already-paid');
}

// Process payment and store session ID
await db.payments.create({ sessionId, userId, amount });
```

### 3. Handle Expiration

Sessions expire after 30 minutes. Always check expiration:

```javascript
if (new Date(session.expiresAt) < new Date()) {
  // Session expired - create new one
  return res.redirect('/checkout');
}
```

### 4. Provide Clear Success/Cancel URLs

Make redirect URLs specific and descriptive:

```javascript
// ✅ Good
successUrl: 'https://yourapp.com/orders/12345/payment-success'
cancelUrl: 'https://yourapp.com/orders/12345/payment-cancelled'

// ❌ Bad
successUrl: 'https://yourapp.com/success'
cancelUrl: 'https://yourapp.com/cancel'
```

---

## Rate Limits

- **Checkout Session Creation:** 100 requests/minute per merchant
- **Session Retrieval:** 1000 requests/minute per merchant

Exceeding rate limits returns `429 Too Many Requests`.

---

## Support

### Documentation
- API Reference: https://docs.peeap.com/api
- Integration Guides: https://docs.peeap.com/guides

### Contact
- Email: support@peeap.com
- Developer Portal: https://dashboard.peeap.com
- GitHub: https://github.com/peeap

---

## Changelog

### v1.0.0 (2024-01-15)
- Initial release
- QR code, card, and mobile money payments
- Merchant branding support
- Session-based checkout flow
