# NFC PREPAID CARD SYSTEM - ARCHITECTURE DOCUMENT

## Executive Summary

This document describes the complete architecture for a **closed-loop NFC prepaid card system** designed for large-scale, low-cost distribution through street vendors. The system follows bank-grade and transport-grade security principles while being optimized for low-infrastructure environments.

**Key Principles:**
- No balance stored on card
- No secrets exposed to POS terminals
- No UID-only authorization (cryptographic auth required)
- All final decisions made server-side
- Secure element (DESFire EV3) mandatory for real money

---

## 1. SYSTEM OVERVIEW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NFC PREPAID CARD ECOSYSTEM                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │   ISSUER     │     │   VENDOR     │     │    USER      │                │
│  │   BACKEND    │     │  (Street)    │     │  (Mobile)    │                │
│  └──────┬───────┘     └──────┬───────┘     └──────┬───────┘                │
│         │                    │                    │                         │
│         ▼                    ▼                    ▼                         │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │     HSM      │     │  Physical    │     │   Mobile     │                │
│  │ (Key Vault)  │     │  NFC Cards   │     │    App       │                │
│  └──────────────┘     └──────────────┘     └──────────────┘                │
│                              │                    │                         │
│                              │    ┌───────────────┘                         │
│                              ▼    ▼                                         │
│                       ┌──────────────┐                                      │
│                       │  NFC TAP     │                                      │
│                       │ (Activation) │                                      │
│                       └──────────────┘                                      │
│                                                                             │
│  ┌──────────────┐                          ┌──────────────┐                │
│  │   MERCHANT   │◄────────────────────────►│   POS/NFC    │                │
│  │   BACKEND    │    Tap-to-Pay            │   TERMINAL   │                │
│  └──────────────┘                          └──────────────┘                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. CARD TYPES & HARDWARE

### 2.1 Supported Card Types

| Chip Type | Security Level | Use Case | Transaction Limits | Risk Level |
|-----------|---------------|----------|-------------------|------------|
| UID-only | NONE | ❌ DO NOT USE for money | N/A | CRITICAL |
| DESFire EV1 | MEDIUM | Legacy systems only | Le 100,000/day | HIGH |
| DESFire EV2 | HIGH | Standard prepaid | Le 500,000/day | MEDIUM |
| DESFire EV3 | VERY HIGH | All use cases | Le 1,000,000+/day | LOW |

### 2.2 Why Secure NFC Chips Are Mandatory

**UID-Only Cards are INSECURE because:**
1. UID can be read by any NFC reader
2. UID can be cloned to another card in seconds
3. No cryptographic proof of authenticity
4. Anyone with a $20 device can create a perfect copy

**DESFire EV2/EV3 Cards are SECURE because:**
1. Contain a tamper-resistant secure element
2. Store cryptographic keys that cannot be extracted
3. Perform challenge-response authentication
4. Each card proves its identity cryptographically
5. Cloning requires physical chip deconstruction (millions of dollars)

### 2.3 Card Hardware Specification

```
┌─────────────────────────────────────────────────┐
│              NFC PREPAID CARD                   │
├─────────────────────────────────────────────────┤
│                                                 │
│  CHIP: NXP DESFire EV3 8KB                     │
│  ├── UID: 7-byte random (factory assigned)     │
│  ├── Master Key: AES-128 (diversified)         │
│  ├── Application Key 1: Authentication         │
│  ├── Application Key 2: MAC generation         │
│  └── Application Key 3: Encryption (optional)  │
│                                                 │
│  NO DATA STORED ON CARD:                        │
│  ❌ No balance                                  │
│  ❌ No transaction history                      │
│  ❌ No personal data                            │
│  ❌ No account number                           │
│                                                 │
│  STORED ON CARD:                                │
│  ✓ UID (for identification)                    │
│  ✓ Diversified keys (for authentication)       │
│  ✓ Card serial (for display)                   │
│                                                 │
│  PRINTED ON CARD:                               │
│  • Masked card number (****-****-****-1234)    │
│  • Activation QR code                          │
│  • Issuer branding                             │
│  • Expiry date                                 │
│                                                 │
└─────────────────────────────────────────────────┘
```

---

## 3. KEY MANAGEMENT & HSM INTEGRATION

### 3.1 Key Hierarchy

```
                    ┌──────────────────────┐
                    │   ISSUER MASTER KEY  │
                    │   (AES-256, HSM)     │
                    │   Never leaves HSM   │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
    │  BATCH KEY 001  │ │  BATCH KEY 002  │ │  BATCH KEY 003  │
    │  (Derived)      │ │  (Derived)      │ │  (Derived)      │
    └────────┬────────┘ └────────┬────────┘ └────────┬────────┘
             │                   │                   │
    ┌────────┴────────┐          │          ┌────────┴────────┐
    ▼        ▼        ▼          ▼          ▼        ▼        ▼
  Card 1   Card 2   Card N    Card N+1    Card M   Card M+1  ...
  Key      Key      Key       Key         Key      Key
  (Diversified from Batch Key + UID)
```

### 3.2 Key Derivation Process

```
Per-Card Key = AES-CMAC(BatchKey, UID || CardSerial || DiversificationConstant)
```

**Key derivation happens ONLY during manufacturing:**
1. HSM generates random Issuer Master Key (once, stored in HSM)
2. For each batch, HSM derives Batch Master Key
3. For each card, HSM derives Card Keys using UID
4. Card Keys are injected into card during personalization
5. Database stores: UID → BatchID → KeySlotReference (NO ACTUAL KEYS)

### 3.3 What Is Stored Where

| Component | Stores | Does NOT Store |
|-----------|--------|----------------|
| **HSM** | Master keys, batch keys | Per-card keys (derived on demand) |
| **Database** | Key slot references, UIDs, batch IDs | Any actual key values |
| **Card** | Diversified keys (in secure element) | Master keys, batch keys |
| **POS Terminal** | Nothing sensitive | Any keys whatsoever |
| **Mobile App** | Nothing sensitive | Any keys whatsoever |

### 3.4 HSM Operations

```
┌─────────────────────────────────────────────────────────────────┐
│                      HSM OPERATIONS                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. KEY GENERATION (Setup)                                      │
│     HSM.GenerateMasterKey() → KeySlotID                        │
│                                                                 │
│  2. BATCH KEY DERIVATION (Manufacturing)                        │
│     HSM.DeriveKey(MasterKeySlot, BatchID) → BatchKeySlot       │
│                                                                 │
│  3. CARD KEY DERIVATION (Manufacturing)                         │
│     HSM.DeriveCardKey(BatchKeySlot, UID) → [AuthKey, MACKey]   │
│     → Keys injected into card, NEVER returned to application   │
│                                                                 │
│  4. CHALLENGE GENERATION (Transaction)                          │
│     HSM.GenerateRandomChallenge() → 16-byte challenge          │
│                                                                 │
│  5. RESPONSE VALIDATION (Transaction)                           │
│     HSM.ValidateCMAC(BatchKeySlot, UID, Challenge, Response)   │
│     → Returns: VALID or INVALID                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Key Security Guarantees

1. **Master Key**: Never leaves HSM, never readable, hardware-protected
2. **Batch Keys**: Derived in HSM, never exported
3. **Card Keys**: Derived in HSM, injected into card during manufacturing only
4. **Database**: Only stores references (KeySlotID, BatchID), never actual keys
5. **Application**: Never sees any key material, only validation results

---

## 4. VENDOR STREET SALE FLOW

### 4.1 Overview

Vendors are the first point of distribution. They sell inactive cards for cash. Critical security: vendors have NO access to card values, user data, or cryptographic keys.

### 4.2 Vendor Onboarding Flow

```
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Vendor  │      │  Admin   │      │  System  │      │  Vendor  │
│  Applies │ ──►  │  Review  │ ──►  │  Approve │ ──►  │  Active  │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
     │                 │                 │                 │
     │ Submit KYC      │ Verify docs     │ Create account  │ Receive
     │ documents       │ Check region    │ Set commission  │ cards
     │                 │                 │                 │
```

**Vendor receives:**
- Vendor code (e.g., VND-001)
- PIN for authentication
- Mobile app for reconciliation
- Physical card batches

**Vendor CANNOT:**
- Activate cards
- View card balances
- Access user data
- Modify card prices
- Issue refunds

### 4.3 Card Sale Flow

```
Step 1: Customer approaches vendor
        └── Customer selects card type (e.g., Le 50,000 prepaid)

Step 2: Vendor retrieves physical card from inventory
        └── Card is in ISSUED state

Step 3: Customer pays cash
        └── Vendor verifies cash amount matches card price

Step 4: Vendor scans card barcode/QR in vendor app
        └── System marks card as SOLD
        └── Records: vendor ID, timestamp, sale price

Step 5: Customer receives card
        └── Card is still INACTIVE (cannot be used)
        └── Customer must activate via mobile app

Step 6: Vendor app shows sale confirmation
        └── Vendor inventory decremented
        └── Commission calculated (not paid yet)
```

### 4.4 Fraud Containment at Vendor Level

| Threat | Mitigation |
|--------|------------|
| Vendor steals cards | Inventory tracking per batch, serial ranges, reconciliation |
| Vendor sells above price | Price printed on card, customer can verify |
| Vendor activates cards | Vendor has NO access to activation (requires NFC tap + user app) |
| Vendor clones cards | Impossible - secure element cannot be cloned |
| Collusion with customers | Cards worthless until activated by legitimate user |

### 4.5 Batch Reconciliation

```
┌─────────────────────────────────────────────────────────────────┐
│                    VENDOR RECONCILIATION                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Weekly Reconciliation Report:                                  │
│  ─────────────────────────────                                 │
│  Vendor: VND-001 (Street Corner Freetown)                      │
│  Period: 2024-01-15 to 2024-01-21                              │
│                                                                 │
│  Cards Assigned (start of week):     100                       │
│  Cards Sold:                          73                       │
│  Cards Returned (damaged):             2                       │
│  Cards Remaining:                     25                       │
│  Discrepancy:                          0  ✓                    │
│                                                                 │
│  Financial Summary:                                             │
│  ─────────────────                                             │
│  Gross Sales:          Le 3,650,000                            │
│  Commission (5%):      Le   182,500                            │
│  Net Payable:          Le 3,467,500                            │
│                                                                 │
│  Status: PENDING SETTLEMENT                                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. USER ACTIVATION FLOW (CRITICAL)

### 5.1 Overview

Activation is the security-critical moment where a physical card is cryptographically bound to a user's wallet. This process CANNOT be faked or bypassed.

### 5.2 Step-by-Step Activation

```
┌─────────────────────────────────────────────────────────────────┐
│                   USER ACTIVATION FLOW                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  STEP 1: User installs mobile app                              │
│  ────────────────────────────────                              │
│  • Download from App Store / Play Store                        │
│  • App is the issuer's official app                            │
│                                                                 │
│  STEP 2: User creates wallet or logs in                        │
│  ──────────────────────────────────────                        │
│  • Phone number verification (OTP)                             │
│  • Basic KYC if required by card type                          │
│  • Wallet created (if new user)                                │
│                                                                 │
│  STEP 3: User selects "Activate Physical Card"                 │
│  ─────────────────────────────────────────────                 │
│  • App shows activation screen                                 │
│  • Prompts for card details                                    │
│                                                                 │
│  STEP 4: User scans QR code OR enters activation code          │
│  ──────────────────────────────────────────────────            │
│  • QR code printed on card                                     │
│  • Contains: CardSerial + ActivationCode (encrypted)           │
│  • Alternative: 12-digit activation code                       │
│                                                                 │
│  STEP 5: User taps card to phone (NFC read)                    │
│  ─────────────────────────────────────────                     │
│  • Phone's NFC reads card's UID                                │
│  • Phone sends challenge to card                               │
│  • Card responds with CMAC                                     │
│                                                                 │
│  STEP 6: Backend validates everything                          │
│  ────────────────────────────────────                          │
│  Validation checks:                                            │
│  ✓ Card exists in database                                     │
│  ✓ Card state is SOLD or INACTIVE                              │
│  ✓ Card not expired                                            │
│  ✓ UID matches database record                                 │
│  ✓ Activation code matches (if provided)                       │
│  ✓ Cryptographic response is VALID (HSM check)                 │
│  ✓ No duplicate activation attempts                            │
│                                                                 │
│  STEP 7: Backend binds card to user                            │
│  ──────────────────────────────────                            │
│  • Card.user_id = User.id                                      │
│  • Card.wallet_id = User.wallet_id                             │
│  • Card.state = ACTIVATED                                      │
│  • Card.activated_at = NOW()                                   │
│  • Initial balance credited (from program)                     │
│                                                                 │
│  STEP 8: User sets PIN                                         │
│  ────────────────────────                                      │
│  • 4-6 digit PIN                                               │
│  • PIN hashed and stored                                       │
│  • Required for transactions (optional per program)            │
│                                                                 │
│  STEP 9: User names the card (optional)                        │
│  ─────────────────────────────────────                         │
│  • E.g., "My Transport Card"                                   │
│  • Displayed in app                                            │
│                                                                 │
│  STEP 10: Card ready to use                                    │
│  ──────────────────────────                                    │
│  • Balance shown in app                                        │
│  • Tap-to-pay enabled                                          │
│  • Transaction history available                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Cryptographic Authentication During Activation

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  Mobile  │         │  Backend │         │   HSM    │         │   Card   │
│   App    │         │  Server  │         │          │         │  (NFC)   │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │  1. Request        │                    │                    │
     │     Activation     │                    │                    │
     ├───────────────────►│                    │                    │
     │                    │                    │                    │
     │                    │  2. Generate       │                    │
     │                    │     Challenge      │                    │
     │                    ├───────────────────►│                    │
     │                    │                    │                    │
     │                    │  Challenge (16B)   │                    │
     │                    │◄───────────────────┤                    │
     │                    │                    │                    │
     │  3. Challenge      │                    │                    │
     │◄───────────────────┤                    │                    │
     │                    │                    │                    │
     │  4. Send to Card   │                    │                    │
     │    (NFC APDU)      │                    │                    │
     ├────────────────────┼────────────────────┼───────────────────►│
     │                    │                    │                    │
     │                    │                    │    5. Card computes│
     │                    │                    │    CMAC(Key,       │
     │                    │                    │    Challenge+UID)  │
     │                    │                    │                    │
     │  6. Response (CMAC)│                    │                    │
     │◄───────────────────┼────────────────────┼────────────────────┤
     │                    │                    │                    │
     │  7. Send Response  │                    │                    │
     │     + UID          │                    │                    │
     ├───────────────────►│                    │                    │
     │                    │                    │                    │
     │                    │  8. Validate CMAC  │                    │
     │                    ├───────────────────►│                    │
     │                    │                    │                    │
     │                    │     VALID/INVALID  │                    │
     │                    │◄───────────────────┤                    │
     │                    │                    │                    │
     │  9. Success/Fail   │                    │                    │
     │◄───────────────────┤                    │                    │
     │                    │                    │                    │
```

### 5.4 Data Captured During Activation

| Data | Stored | Purpose |
|------|--------|---------|
| User ID | ✓ | Card ownership |
| Card UID | ✓ (hashed) | Identification |
| Device fingerprint | ✓ | Fraud detection |
| IP address | ✓ | Audit trail |
| GPS location | ✓ | Fraud detection |
| Timestamp | ✓ | Audit trail |
| Activation code | ✓ (consumed) | One-time use |

### 5.5 What Is NEVER Stored on Card

- Balance
- Transaction history
- Personal data
- Account number
- Wallet ID
- User name

---

## 6. TAP-TO-PAY TRANSACTION FLOW

### 6.1 Transaction Lifecycle

```
┌─────────────────────────────────────────────────────────────────┐
│                   TAP-TO-PAY FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────┐    ┌────────┐    ┌────────┐    ┌────────┐          │
│  │  TAP   │───►│ AUTH   │───►│CAPTURE │───►│SETTLE  │          │
│  │        │    │        │    │        │    │        │          │
│  └────────┘    └────────┘    └────────┘    └────────┘          │
│      │             │             │             │                │
│      │             │             │             │                │
│   Card +        Crypto +      Debit        Batch to            │
│   Terminal      Limit         Balance      Merchant            │
│   handshake     checks                                         │
│                                                                 │
│  Time: <1s      <2s           <1s          Daily batch         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Detailed Transaction Steps

```
Step 1: Card Tap at Merchant POS
────────────────────────────────
• Customer holds card to NFC reader
• Terminal reads card UID
• Terminal requests challenge from backend

Step 2: Challenge-Response Authentication
─────────────────────────────────────────
• Backend generates random 16-byte challenge
• Terminal sends challenge to card via NFC
• Card computes CMAC using internal key
• Card returns response to terminal
• Terminal sends (UID, Challenge, Response) to backend

Step 3: Backend Validation
──────────────────────────
• HSM validates CMAC response
• If INVALID: Decline immediately (potential clone)
• If VALID: Continue to authorization

Step 4: Authorization Checks
────────────────────────────
• Card state = ACTIVATED?
• Card not expired?
• Card not suspended/blocked?
• Sufficient balance?
• Under per-transaction limit?
• Under daily/weekly/monthly limit?
• Merchant allowed (MCC check)?
• Fraud score acceptable?
• Velocity check pass?

Step 5: Ledger Debit
────────────────────
• Atomic transaction:
  - Decrement card balance
  - Increment merchant balance (pending settlement)
  - Create transaction record
  - Update spending trackers
• Generate authorization code

Step 6: Response to Terminal
────────────────────────────
• SUCCESS: Authorization code + masked balance
• DECLINE: Reason code (insufficient funds, limit exceeded, etc.)

Step 7: Settlement (Async)
──────────────────────────
• Daily batch processing
• Merchant receives funds
• Transaction marked SETTLED
```

### 6.3 Transaction Flow Diagram

```
┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
│   Card   │    │   POS    │    │ Backend  │    │   HSM    │    │  Ledger  │
│  (NFC)   │    │ Terminal │    │  Server  │    │          │    │          │
└────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘
     │               │               │               │               │
     │  1. Tap       │               │               │               │
     │◄──────────────┤               │               │               │
     │               │               │               │               │
     │  2. UID       │               │               │               │
     ├──────────────►│               │               │               │
     │               │               │               │               │
     │               │  3. Init Txn  │               │               │
     │               │  (UID, Amt,   │               │               │
     │               │   MerchantID) │               │               │
     │               ├──────────────►│               │               │
     │               │               │               │               │
     │               │               │  4. Challenge │               │
     │               │               ├──────────────►│               │
     │               │               │               │               │
     │               │               │  Challenge    │               │
     │               │               │◄──────────────┤               │
     │               │               │               │               │
     │               │  5. Challenge │               │               │
     │               │◄──────────────┤               │               │
     │               │               │               │               │
     │  6. Challenge │               │               │               │
     │◄──────────────┤               │               │               │
     │               │               │               │               │
     │  7. CMAC      │               │               │               │
     ├──────────────►│               │               │               │
     │               │               │               │               │
     │               │  8. Response  │               │               │
     │               ├──────────────►│               │               │
     │               │               │               │               │
     │               │               │  9. Validate  │               │
     │               │               ├──────────────►│               │
     │               │               │               │               │
     │               │               │  VALID        │               │
     │               │               │◄──────────────┤               │
     │               │               │               │               │
     │               │               │  10. Debit    │               │
     │               │               ├───────────────┼──────────────►│
     │               │               │               │               │
     │               │               │  Success      │               │
     │               │               │◄──────────────┼───────────────┤
     │               │               │               │               │
     │               │  11. Approved │               │               │
     │               │◄──────────────┤               │               │
     │               │               │               │               │
```

### 6.4 Decline Codes

| Code | Reason | User Message |
|------|--------|--------------|
| 01 | Insufficient balance | Transaction declined - low balance |
| 02 | Card not activated | Please activate your card first |
| 03 | Card suspended | Card is temporarily frozen |
| 04 | Card blocked | Card is blocked - contact support |
| 05 | Card expired | Card has expired |
| 06 | Transaction limit exceeded | Exceeds transaction limit |
| 07 | Daily limit exceeded | Daily spending limit reached |
| 08 | Invalid PIN | Incorrect PIN |
| 09 | PIN blocked | Too many PIN attempts |
| 10 | Merchant not allowed | This merchant type not allowed |
| 11 | Crypto validation failed | Authentication failed |
| 12 | Fraud detected | Transaction declined |
| 13 | System error | Try again later |

### 6.5 Offline Transaction Support (Optional)

For environments with intermittent connectivity:

```
OFFLINE MODE (if enabled for card program):
───────────────────────────────────────────

1. Terminal detects no connectivity
2. Terminal has cached card's offline limit
3. Transaction under offline limit? Proceed locally
4. Store transaction with timestamp + signature
5. Sync when connectivity restored

OFFLINE LIMITS:
• Per-transaction: Le 20,000 (example)
• Daily total: Le 50,000 (example)
• Max stored transactions: 5

SYNC PROCESS:
1. Terminal connects to backend
2. Sends all stored offline transactions
3. Backend validates each (may decline retroactively)
4. Terminal receives updated limits
```

### 6.6 Anti-Replay Protections

1. **Challenge Expiry**: Challenges expire in 30 seconds
2. **Challenge Uniqueness**: Each challenge used only once
3. **Transaction Nonce**: Each transaction has unique reference
4. **Timestamp Validation**: Transactions must be recent
5. **Sequence Tracking**: Detect replayed transactions

---

## 7. FRAUD & CLONING DEFENSE

### 7.1 Why UID Alone Is Insufficient

```
THREAT SCENARIO: UID Cloning
────────────────────────────

Attacker reads UID from victim's card (takes 1 second)
         │
         ▼
Attacker programs UID onto blank card ($20 device)
         │
         ▼
If system uses UID-only: Attacker makes purchases on victim's balance
         │
         ▼
RESULT: Financial loss, system compromise
```

**UID Cloning Prevention:**
- DESFire EV3 performs mutual authentication
- Card proves it knows a secret key
- Key CANNOT be extracted from secure element
- Cloned UID fails cryptographic challenge

### 7.2 How Secure Elements Defeat Cloning

```
┌─────────────────────────────────────────────────────────────────┐
│              SECURE ELEMENT PROTECTION                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ATTACKER ATTEMPTS:                                             │
│  ──────────────────                                            │
│                                                                 │
│  1. Read UID               → ✓ Possible (UID is public)        │
│  2. Clone UID to new card  → ✓ Possible                        │
│  3. Read cryptographic key → ✗ IMPOSSIBLE (hardware protected) │
│  4. Clone key to new card  → ✗ IMPOSSIBLE (cannot extract)     │
│  5. Use cloned card        → ✗ FAILS crypto challenge          │
│                                                                 │
│  PROTECTION MECHANISM:                                          │
│  ─────────────────────                                         │
│                                                                 │
│  Backend: "Here's a random challenge: 0x7A3F...B2C1"           │
│  Card: "Here's my CMAC: 0x9E21...4F8A" (computed with secret)  │
│  Backend: "Let me verify..." (asks HSM)                        │
│  HSM: "VALID - this card knows the correct key"                │
│                                                                 │
│  Cloned Card: Cannot compute correct CMAC without key          │
│  Result: AUTHENTICATION FAILED → Transaction DECLINED          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Backend Risk Scoring

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRAUD SCORING MODEL                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Each transaction receives a fraud score (0-100):               │
│                                                                 │
│  SCORE FACTORS:                                                 │
│  ───────────────                                               │
│  + 0-10  : Transaction amount (higher = more points)           │
│  + 0-20  : Velocity (transactions per hour)                    │
│  + 0-30  : Geographic anomaly (impossible travel)              │
│  + 0-15  : Time of day (unusual hours)                         │
│  + 0-10  : Merchant risk (high-risk MCC)                       │
│  + 0-15  : Device fingerprint (new/unknown device)             │
│                                                                 │
│  DECISION MATRIX:                                               │
│  ────────────────                                              │
│  Score 0-30  : APPROVE (low risk)                              │
│  Score 31-60 : FLAG (allow, but mark for review)               │
│  Score 61-80 : STEP-UP (require PIN or additional auth)        │
│  Score 81-100: DECLINE (high risk, block transaction)          │
│                                                                 │
│  AUTOMATIC BLOCKS:                                              │
│  ─────────────────                                             │
│  • Crypto validation failure                                   │
│  • Impossible travel (500km in 30 minutes)                     │
│  • >10 transactions in 1 hour                                  │
│  • Same card used at 2 locations simultaneously                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 7.4 Fraud Detection Rules

```sql
-- Example: Impossible Travel Detection
SELECT
    t1.id AS first_transaction,
    t2.id AS second_transaction,
    calculate_distance(t1.latitude, t1.longitude, t2.latitude, t2.longitude) AS distance_km,
    EXTRACT(EPOCH FROM t2.created_at - t1.created_at) / 60 AS minutes_apart
FROM nfc_card_transactions t1
JOIN nfc_card_transactions t2 ON t1.card_id = t2.card_id
WHERE t2.created_at > t1.created_at
  AND t2.created_at < t1.created_at + INTERVAL '60 minutes'
  AND calculate_distance(t1.latitude, t1.longitude, t2.latitude, t2.longitude) > 100 -- 100km
  -- 100km in 60 minutes is possible by car, but 500km is not
```

### 7.5 Simultaneous Tap Detection

```
DETECTION LOGIC:
────────────────

IF two transactions from same card occur:
   AND they are < 60 seconds apart
   AND they are at different terminals
THEN:
   BLOCK second transaction
   FLAG card for review
   ALERT fraud team

REASON: Physical impossibility - card cannot be in two places at once
```

---

## 8. LOST / STOLEN CARD HANDLING

### 8.1 User-Initiated Freeze

```
┌─────────────────────────────────────────────────────────────────┐
│                    FREEZE CARD FLOW                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: User opens mobile app                                 │
│  Step 2: User navigates to card management                     │
│  Step 3: User taps "Freeze Card"                               │
│  Step 4: System immediately:                                   │
│          • Sets card.state = SUSPENDED                         │
│          • Sets card.suspended_at = NOW()                      │
│          • All pending transactions declined                   │
│  Step 5: User receives confirmation                            │
│                                                                 │
│  FREEZE IS REVERSIBLE:                                          │
│  • User can unfreeze from app                                  │
│  • Balance remains intact                                      │
│  • No fee for freeze/unfreeze                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Reporting Lost/Stolen

```
┌─────────────────────────────────────────────────────────────────┐
│                   REPORT LOST/STOLEN                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: User reports card as lost/stolen                      │
│  Step 2: System immediately BLOCKS card (irreversible)         │
│          • card.state = BLOCKED                                │
│          • card.blocked_at = NOW()                             │
│  Step 3: Balance is protected (cannot be spent)                │
│  Step 4: User is prompted to request replacement               │
│                                                                 │
│  BLOCK IS PERMANENT:                                            │
│  • Card cannot be unblocked                                    │
│  • Physical card is worthless                                  │
│  • Even if found, card cannot be reactivated                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.3 Wallet Safety Guarantees

```
BALANCE PROTECTION:
───────────────────

✓ Balance is stored in database, NOT on physical card
✓ Blocking card does not affect balance
✓ Balance can be transferred to replacement card
✓ Balance can be withdrawn to user's wallet

NO LOSS SCENARIO:
─────────────────

• User loses card → Balance safe in database
• Thief has card → Cannot use (blocked immediately)
• User gets replacement → Balance transferred
• Net loss to user → Zero (if reported promptly)
```

### 8.4 Replacement Card Issuance

```
┌─────────────────────────────────────────────────────────────────┐
│                  REPLACEMENT FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Step 1: User requests replacement in app                      │
│          • Selects reason: LOST, STOLEN, DAMAGED               │
│          • Confirms delivery address (if applicable)           │
│                                                                 │
│  Step 2: System creates replacement request                    │
│          • status = REQUESTED                                  │
│          • original_balance recorded                           │
│          • replacement_fee calculated                          │
│                                                                 │
│  Step 3: Admin approves request                                │
│          • Verifies user identity                              │
│          • Approves or rejects                                 │
│                                                                 │
│  Step 4: New card issued                                       │
│          • New card from inventory                             │
│          • New UID, new keys                                   │
│          • Same user binding                                   │
│                                                                 │
│  Step 5: Balance transfer                                      │
│          • Old card balance → New card                         │
│          • Less replacement fee                                │
│          • Old card marked REPLACED                            │
│                                                                 │
│  Step 6: New card activated                                    │
│          • User receives new card                              │
│          • User taps to activate                               │
│          • Balance available immediately                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 8.5 Rebinding Process

```
NEW CARD ACTIVATION:
────────────────────

1. User receives replacement card
2. User opens app, selects "Activate Replacement"
3. User taps new card to phone
4. System validates:
   • User has pending replacement request
   • New card is in ISSUED state
   • New card's crypto is valid
5. System binds new card to same user
6. Balance transferred automatically
7. Old card permanently invalidated
```

---

## 9. DATABASE & API DESIGN

### 9.1 Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                   ENTITY RELATIONSHIP DIAGRAM                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌───────────────┐        ┌───────────────┐                    │
│  │    users      │        │   wallets     │                    │
│  │───────────────│        │───────────────│                    │
│  │ id            │◄──────►│ owner_id      │                    │
│  │ email         │        │ balance       │                    │
│  │ phone         │        │ currency      │                    │
│  └───────┬───────┘        └───────────────┘                    │
│          │                                                      │
│          │ 1:N                                                  │
│          ▼                                                      │
│  ┌───────────────┐        ┌───────────────┐                    │
│  │nfc_prepaid_   │        │nfc_card_      │                    │
│  │   cards       │◄──────►│ programs      │                    │
│  │───────────────│  N:1   │───────────────│                    │
│  │ id            │        │ id            │                    │
│  │ user_id       │        │ program_code  │                    │
│  │ program_id    │        │ card_price    │                    │
│  │ balance       │        │ initial_bal   │                    │
│  │ state         │        │ limits        │                    │
│  └───────┬───────┘        └───────────────┘                    │
│          │                                                      │
│          │ N:1                                                  │
│          ▼                                                      │
│  ┌───────────────┐        ┌───────────────┐                    │
│  │nfc_card_      │        │nfc_card_      │                    │
│  │  batches      │◄──────►│  vendors      │                    │
│  │───────────────│  N:M   │───────────────│                    │
│  │ id            │  via   │ id            │                    │
│  │ batch_code    │inventory│ vendor_code  │                    │
│  │ card_count    │        │ commission    │                    │
│  └───────────────┘        └───────────────┘                    │
│          │                                                      │
│          │ 1:N                                                  │
│          ▼                                                      │
│  ┌───────────────┐                                             │
│  │nfc_card_      │        ┌───────────────┐                    │
│  │ transactions  │◄──────►│ merchants     │                    │
│  │───────────────│  N:1   │───────────────│                    │
│  │ id            │        │ id            │                    │
│  │ card_id       │        │ mcc           │                    │
│  │ amount        │        │ name          │                    │
│  │ state         │        │               │                    │
│  └───────────────┘        └───────────────┘                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Key Status Fields

```
CARD STATES:
────────────
CREATED    → Manufactured, in warehouse
ISSUED     → Assigned to vendor
SOLD       → Vendor marked as sold
INACTIVE   → Sold but not activated
ACTIVATED  → User activated, ready to use
SUSPENDED  → Temporarily frozen by user/admin
BLOCKED    → Permanently blocked
REPLACED   → Balance transferred to new card
EXPIRED    → Past expiry date
DESTROYED  → Physically destroyed

TRANSACTION STATES:
───────────────────
PENDING    → Transaction initiated
AUTHORIZED → Crypto validated, funds held
CAPTURED   → Funds debited
SETTLED    → Merchant paid
DECLINED   → Authorization rejected
REVERSED   → Transaction reversed
FAILED     → System error
EXPIRED    → Authorization expired

VENDOR STATES:
──────────────
PENDING    → Applied, awaiting approval
APPROVED   → Approved, can receive inventory
ACTIVE     → Actively selling
SUSPENDED  → Temporarily suspended
TERMINATED → Permanently removed
```

### 9.3 Audit Requirements

```
AUDIT LOG CAPTURES:
───────────────────

• Every card state transition
• Every transaction attempt (success and failure)
• Every admin action
• Every key operation reference
• Every vendor sale
• Every fraud trigger
• Every user action on cards

RETENTION:
──────────

• Transaction logs: 7 years (regulatory requirement)
• Audit logs: 7 years
• Key references: Permanent
• Fraud events: 10 years
```

---

## 10. FUTURE EXTENSIONS

### 10.1 Mobile NFC (Same Wallet)

```
FUTURE: Host Card Emulation (HCE)
─────────────────────────────────

• User's phone emulates physical card
• Same wallet, same balance
• Tokenized credentials
• Cloud-based authentication
• Fallback to physical card

INTEGRATION POINT:
• Same nfc_prepaid_cards table
• Add: is_virtual BOOLEAN
• Add: parent_card_id (link to physical)
• Share balance with physical card
```

### 10.2 QR Code Fallback

```
FOR MERCHANTS WITHOUT NFC:
──────────────────────────

• User generates dynamic QR code in app
• QR contains: encrypted(card_id, timestamp, amount, signature)
• Merchant scans QR with camera
• Backend validates signature
• Same authorization flow

USE CASE:
• Low-cost merchants
• Feature phone users
• NFC terminal failures
```

### 10.3 Virtual Cards

```
ONLINE PURCHASES:
─────────────────

• Generate virtual card number (different from physical)
• Same underlying balance
• Can have different limits
• Instant issuance in app
• Disposable for single use

DATABASE:
• nfc_virtual_cards table
• Links to nfc_prepaid_cards.id
• Separate card_number, CVV
```

### 10.4 Migration to Open-Loop

```
IF EVER REQUIRED:
─────────────────

• Partner with Visa/Mastercard processor
• Issue dual-branded cards
• Existing closed-loop for issuer merchants
• Open-loop for external acceptance
• Complex: requires PCI-DSS Level 1, EMV certification

RECOMMENDATION:
• Stay closed-loop unless absolutely necessary
• Open-loop adds significant complexity and cost
```

---

## APPENDIX A: SECURITY CHECKLIST

```
□ DESFire EV3 chips only (no UID-only)
□ HSM for all key operations
□ No keys in database (references only)
□ Challenge-response for every transaction
□ Challenge expiry < 30 seconds
□ Anti-replay nonce tracking
□ Fraud scoring on all transactions
□ Geographic velocity checks
□ Simultaneous tap detection
□ PIN attempt limiting
□ Automatic card blocking on fraud
□ Audit logging for all operations
□ Encrypted communications (TLS 1.3)
□ Database encryption at rest
□ Row-level security policies
□ Regular key rotation schedule
□ Penetration testing schedule
```

---

## APPENDIX B: COMPLIANCE CONSIDERATIONS

```
REGULATORY:
───────────

• KYC/AML for reloadable cards
• Transaction limits for anonymous cards
• Reporting thresholds
• Data retention requirements
• Consumer protection rules

DATA PROTECTION:
────────────────

• Minimize data collection
• Encrypt sensitive data
• Audit access to PII
• Right to deletion (where applicable)
• Breach notification procedures
```

---

## APPENDIX C: OPERATIONAL PROCEDURES

```
DAILY:
──────
• Monitor transaction volumes
• Review fraud alerts
• Check system health
• Verify batch settlements

WEEKLY:
───────
• Vendor reconciliation
• Commission payments
• Inventory review
• Security log review

MONTHLY:
────────
• Key usage audit
• Performance metrics
• Fraud trend analysis
• System updates

QUARTERLY:
──────────
• Penetration testing
• Disaster recovery drill
• Policy review
• Vendor performance review
```

---

*Document Version: 1.0*
*Last Updated: 2024*
*Classification: Internal Use Only*
