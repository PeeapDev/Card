# NFC PREPAID CARD SYSTEM - API REFERENCE

## Overview

This document provides the complete API reference for the NFC Prepaid Card System. All endpoints require authentication unless otherwise noted.

**Base URL:** `/api/nfc-cards`

**Authentication:**
- User endpoints: Bearer token (JWT)
- Terminal endpoints: `X-Terminal-API-Key` header
- Vendor endpoints: Bearer token with vendor role

---

## Table of Contents

1. [Card Programs](#card-programs)
2. [Card Batches](#card-batches)
3. [Vendors](#vendors)
4. [Vendor Operations](#vendor-operations)
5. [Card Activation](#card-activation)
6. [Tap-to-Pay](#tap-to-pay)
7. [User Card Management](#user-card-management)
8. [Admin Dashboard](#admin-dashboard)

---

## Card Programs

### List Card Programs

```
GET /api/nfc-cards/programs
```

**Authorization:** Admin, Superadmin

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| includeInactive | boolean | Include inactive programs (default: false) |

**Response:**
```json
{
  "programs": [
    {
      "id": "uuid",
      "programCode": "NFC-ANON-50",
      "programName": "Basic Prepaid 50",
      "description": "Anonymous NFC card with Le 50,000 preloaded",
      "cardCategory": "ANONYMOUS",
      "isReloadable": false,
      "requiresKyc": false,
      "cardPrice": 55000,
      "initialBalance": 50000,
      "currency": "SLE",
      "dailyTransactionLimit": 200000,
      "perTransactionLimit": 100000,
      "chipType": "DESFIRE_EV3",
      "validityMonths": 24,
      "status": "ACTIVE",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Card Program

```
POST /api/nfc-cards/programs
```

**Authorization:** Superadmin only

**Request Body:**
```json
{
  "programCode": "NFC-CUSTOM-100",
  "programName": "Custom Card 100",
  "description": "Custom prepaid card",
  "cardCategory": "ANONYMOUS",
  "isReloadable": false,
  "requiresKyc": false,
  "cardPrice": 105000,
  "initialBalance": 100000,
  "dailyTransactionLimit": 300000,
  "perTransactionLimit": 150000,
  "chipType": "DESFIRE_EV3",
  "validityMonths": 24
}
```

**Response:** `201 Created`
```json
{
  "program": { ... }
}
```

### Get Single Program

```
GET /api/nfc-cards/programs/:id
```

**Authorization:** Admin, Superadmin

**Response:**
```json
{
  "program": { ... }
}
```

### Update Program Status

```
PATCH /api/nfc-cards/programs/:id/status
```

**Authorization:** Superadmin only

**Request Body:**
```json
{
  "status": "SUSPENDED"  // ACTIVE, SUSPENDED, DISCONTINUED
}
```

---

## Card Batches

### List Batches

```
GET /api/nfc-cards/batches
```

**Authorization:** Admin, Superadmin

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| programId | uuid | Filter by program |

**Response:**
```json
{
  "batches": [
    {
      "id": "uuid",
      "batchCode": "BATCH-2024-A1B2C3D4",
      "programId": "uuid",
      "cardCount": 1000,
      "manufacturer": "NXP Secure Elements Ltd",
      "binPrefix": "62000001",
      "sequenceStart": 1,
      "sequenceEnd": 1000,
      "status": "MANUFACTURED",
      "cardsInWarehouse": 1000,
      "cardsDistributed": 0,
      "cardsSold": 0,
      "cardsActivated": 0,
      "wholesalePrice": 45000,
      "retailPrice": 55000,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Batch

```
POST /api/nfc-cards/batches
```

**Authorization:** Superadmin only

**Request Body:**
```json
{
  "programId": "uuid",
  "cardCount": 1000,
  "manufacturer": "NXP Secure Elements Ltd",
  "binPrefix": "62000001",
  "sequenceStart": 1,
  "wholesalePrice": 45000,
  "retailPrice": 55000
}
```

**Response:** `201 Created`

### Update Batch Status

```
PATCH /api/nfc-cards/batches/:id/status
```

**Authorization:** Admin, Superadmin

**Request Body:**
```json
{
  "status": "QUALITY_CHECKED"
  // MANUFACTURED, QUALITY_CHECKED, IN_WAREHOUSE, DISTRIBUTED, FULLY_SOLD, RECALLED
}
```

---

## Vendors

### List Vendors

```
GET /api/nfc-cards/vendors
```

**Authorization:** Admin, Superadmin

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| status | string | Filter by status |

**Response:**
```json
{
  "vendors": [
    {
      "id": "uuid",
      "vendorCode": "VND-A1B2C3",
      "businessName": "Street Corner Shop",
      "contactName": "John Doe",
      "phone": "+232-123-4567",
      "email": "john@example.com",
      "region": "Western Area",
      "district": "Freetown",
      "commissionType": "PERCENTAGE",
      "commissionRate": 5.0,
      "status": "ACTIVE",
      "totalCardsSold": 150,
      "totalSalesValue": 8250000,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Create Vendor

```
POST /api/nfc-cards/vendors
```

**Authorization:** Admin, Superadmin

**Request Body:**
```json
{
  "businessName": "New Vendor Shop",
  "contactName": "Jane Smith",
  "phone": "+232-987-6543",
  "email": "jane@example.com",
  "region": "Western Area",
  "district": "Freetown",
  "address": "123 Main Street",
  "commissionType": "PERCENTAGE",
  "commissionRate": 5.0,
  "maxInventoryValue": 10000000
}
```

**Response:** `201 Created`

### Approve Vendor

```
POST /api/nfc-cards/vendors/:id/approve
```

**Authorization:** Admin, Superadmin

**Response:**
```json
{
  "success": true
}
```

### Assign Inventory to Vendor

```
POST /api/nfc-cards/vendors/:id/inventory
```

**Authorization:** Admin, Superadmin

**Request Body:**
```json
{
  "batchId": "uuid",
  "sequenceStart": 1,
  "sequenceEnd": 100
}
```

**Response:** `201 Created`
```json
{
  "inventory": {
    "id": "uuid",
    "vendorId": "uuid",
    "batchId": "uuid",
    "cardsAssigned": 100,
    "assignedValue": 5500000,
    "status": "ASSIGNED"
  }
}
```

---

## Vendor Operations

### Record Sale

```
POST /api/nfc-cards/vendor/sales
```

**Authorization:** Vendor only

**Request Body:**
```json
{
  "cardId": "uuid",
  "salePrice": 55000,
  "paymentMethod": "CASH"  // CASH, MOBILE_MONEY
}
```

### Get Vendor Dashboard

```
GET /api/nfc-cards/vendor/dashboard
```

**Authorization:** Vendor only

**Response:**
```json
{
  "stats": {
    "cardsAssigned": 100,
    "cardsSold": 45,
    "cardsRemaining": 55,
    "totalSalesValue": 2475000,
    "commissionEarned": 123750,
    "commissionPaid": 100000,
    "commissionPending": 23750,
    "lastSaleAt": "2024-01-15T14:30:00Z"
  }
}
```

---

## Card Activation

### Generate Challenge

```
POST /api/nfc-cards/challenge
```

**Authorization:** None (rate-limited)

**Request Body:**
```json
{
  "cardUid": "04A1B2C3D4E5F6"
}
```

**Response:**
```json
{
  "challenge": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6"
}
```

### Activate Card

```
POST /api/nfc-cards/activate
```

**Authorization:** User

**Request Body:**
```json
{
  "cardUid": "04A1B2C3D4E5F6",
  "activationCode": "A1B2C3D4E5F6",
  "cryptoChallenge": "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6",
  "cryptoResponse": "response-from-card",
  "deviceFingerprint": "device-fingerprint-hash",
  "latitude": 8.4657,
  "longitude": -13.2317
}
```

**Response:**
```json
{
  "success": true,
  "cardId": "uuid",
  "cardNumber": "6200-****-****-1234",
  "balance": 50000,
  "expiresAt": "2026-01-01T00:00:00Z",
  "requiresPin": true
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Card authentication failed"
}
```

### Set PIN

```
POST /api/nfc-cards/:id/pin
```

**Authorization:** User

**Request Body:**
```json
{
  "pin": "1234",
  "confirmPin": "1234"
}
```

---

## Tap-to-Pay

### Process Transaction

```
POST /api/nfc-cards/tap-to-pay
```

**Authorization:** Terminal API Key (`X-Terminal-API-Key` header)

**Request Body:**
```json
{
  "cardUid": "04A1B2C3D4E5F6",
  "amount": 25000,
  "currency": "SLE",
  "cryptoChallenge": "challenge-sent-to-card",
  "cryptoResponse": "response-from-card",
  "pin": "1234",
  "latitude": 8.4657,
  "longitude": -13.2317,
  "isOffline": false
}
```

**Success Response:**
```json
{
  "success": true,
  "transactionId": "uuid",
  "authorizationCode": "A1B2C3D4E5F6",
  "balanceAfter": 25000
}
```

**Decline Response:**
```json
{
  "success": false,
  "declineCode": "01",
  "declineReason": "Insufficient balance"
}
```

**Decline Codes:**
| Code | Reason |
|------|--------|
| 01 | Insufficient balance |
| 02 | Card not activated |
| 03 | Card suspended |
| 04 | Card blocked |
| 05 | Card expired |
| 06 | Transaction limit exceeded |
| 07 | Daily limit exceeded |
| 08 | Invalid PIN |
| 09 | PIN blocked |
| 10 | Merchant not allowed |
| 11 | Authentication failed |
| 12 | Fraud detected |
| 13 | System error |

---

## User Card Management

### Get My Cards

```
GET /api/nfc-cards/my-cards
```

**Authorization:** User

**Response:**
```json
{
  "cards": [
    {
      "id": "uuid",
      "cardNumber": "6200-****-****-1234",
      "balance": 45000,
      "currency": "SLE",
      "state": "ACTIVATED",
      "cardLabel": "My Transport Card",
      "expiresAt": "2026-01-01T00:00:00Z",
      "dailySpent": 5000,
      "dailyLimit": 200000,
      "lastUsedAt": "2024-01-15T10:30:00Z",
      "program": {
        "programName": "Basic Prepaid 50",
        "isReloadable": false
      }
    }
  ]
}
```

### Freeze Card

```
POST /api/nfc-cards/:id/freeze
```

**Authorization:** User

**Request Body:**
```json
{
  "reason": "Lost my card temporarily"
}
```

### Unfreeze Card

```
POST /api/nfc-cards/:id/unfreeze
```

**Authorization:** User

### Block Card (Permanent)

```
POST /api/nfc-cards/:id/block
```

**Authorization:** User

**Request Body:**
```json
{
  "reason": "Card stolen"
}
```

### Request Replacement

```
POST /api/nfc-cards/:id/replacement
```

**Authorization:** User

**Request Body:**
```json
{
  "reason": "STOLEN",  // LOST, STOLEN, DAMAGED, EXPIRED, UPGRADE
  "description": "Card was stolen from my bag",
  "deliveryAddress": "123 Main Street, Freetown"
}
```

**Response:** `201 Created`
```json
{
  "replacementId": "uuid"
}
```

### Reload Card

```
POST /api/nfc-cards/:id/reload
```

**Authorization:** User

**Request Body:**
```json
{
  "amount": 50000,
  "sourceWalletId": "uuid",
  "sourceType": "WALLET"  // WALLET, CASH, BANK_TRANSFER, AGENT
}
```

**Response:**
```json
{
  "newBalance": 95000,
  "transactionId": "uuid"
}
```

### Get Transaction History

```
GET /api/nfc-cards/:id/transactions
```

**Authorization:** User

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | number | Records per page (default: 50) |
| offset | number | Skip records (default: 0) |

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "transactionReference": "TXN-1705312200000-A1B2C3D4",
      "transactionType": "PURCHASE",
      "amount": 15000,
      "feeAmount": 225,
      "netAmount": 14775,
      "balanceBefore": 60000,
      "balanceAfter": 45000,
      "state": "CAPTURED",
      "merchantName": "Corner Shop",
      "merchantMcc": "5411",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Admin Dashboard

### Get Dashboard Statistics

```
GET /api/nfc-cards/admin/dashboard
```

**Authorization:** Admin, Superadmin

**Response:**
```json
{
  "stats": {
    "totalPrograms": 7,
    "activePrograms": 6,
    "totalBatches": 15,
    "totalCards": 15000,
    "cardsByState": {
      "CREATED": 2000,
      "ISSUED": 5000,
      "SOLD": 3000,
      "ACTIVATED": 4500,
      "SUSPENDED": 50,
      "BLOCKED": 100,
      "REPLACED": 300,
      "EXPIRED": 50
    },
    "totalVendors": 25,
    "activeVendors": 20,
    "totalTransactions": 45000,
    "transactionVolume": 675000000,
    "todayTransactions": 1250,
    "todayVolume": 18750000,
    "activationRate": 30,
    "averageCardBalance": 35000
  }
}
```

### List All Cards

```
GET /api/nfc-cards/admin/cards
```

**Authorization:** Admin, Superadmin

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| state | string | Filter by state |
| programId | uuid | Filter by program |
| batchId | uuid | Filter by batch |
| vendorId | uuid | Filter by vendor |
| limit | number | Records per page (default: 50) |
| offset | number | Skip records (default: 0) |

### List All Transactions

```
GET /api/nfc-cards/admin/transactions
```

**Authorization:** Admin, Superadmin

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| state | string | Filter by state |
| cardId | uuid | Filter by card |
| merchantId | uuid | Filter by merchant |
| fromDate | ISO date | From date |
| toDate | ISO date | To date |
| limit | number | Records per page (default: 50) |
| offset | number | Skip records (default: 0) |

### Get Audit Log

```
GET /api/nfc-cards/admin/audit
```

**Authorization:** Superadmin only

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| eventType | string | Filter by event type |
| eventCategory | string | Filter by category |
| entityType | string | Filter by entity type |
| entityId | uuid | Filter by entity ID |
| fromDate | ISO date | From date |
| toDate | ISO date | To date |
| limit | number | Records per page (default: 100) |
| offset | number | Skip records (default: 0) |

**Response:**
```json
{
  "auditLogs": [
    {
      "id": "uuid",
      "eventType": "CARD_ACTIVATED",
      "eventCategory": "CARD_LIFECYCLE",
      "entityType": "nfc_prepaid_cards",
      "entityId": "uuid",
      "actorType": "USER",
      "actorId": "uuid",
      "action": "ACTIVATE",
      "newValues": {
        "userId": "uuid",
        "initialBalance": 50000
      },
      "ipAddress": "192.168.1.1",
      "deviceFingerprint": "abc123",
      "latitude": 8.4657,
      "longitude": -13.2317,
      "createdAt": "2024-01-15T10:30:00Z"
    }
  ]
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

**HTTP Status Codes:**
| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Internal Server Error |

---

## Rate Limiting

| Endpoint | Rate Limit |
|----------|------------|
| `/api/nfc-cards/challenge` | 10 requests/minute per IP |
| `/api/nfc-cards/tap-to-pay` | 60 requests/minute per terminal |
| `/api/nfc-cards/activate` | 5 requests/minute per user |
| All other endpoints | 100 requests/minute per user |

---

## Webhooks

The system can send webhooks for the following events:

| Event | Description |
|-------|-------------|
| `card.activated` | Card was activated |
| `card.frozen` | Card was frozen |
| `card.blocked` | Card was blocked |
| `transaction.completed` | Transaction was completed |
| `transaction.declined` | Transaction was declined |
| `vendor.sale` | Vendor recorded a sale |
| `replacement.requested` | Replacement was requested |

Webhook payload format:
```json
{
  "event": "card.activated",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "cardId": "uuid",
    "userId": "uuid",
    "balance": 50000
  }
}
```
