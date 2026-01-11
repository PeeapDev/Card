# Peeap School Integration Documentation

Integration guide for connecting the School SaaS system with Peeap Pay.

> **Currency Note:** All amounts are in **New Leones (NLE)**. Sierra Leone redenominated its currency where 1,000 old Leones = 1 New Leone.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCHOOL SAAS (gov.school.edu.sl)                          │
│                         PHP - Multi-tenant                                  │
│                                                                             │
│   ses.gov.school.edu.sl  │  fyp.gov.school.edu.sl  │  xxx.gov.school.edu.sl │
│                                                                             │
│                     ONE DATABASE (school_id differentiates)                 │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ SSO / Internal API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              PEEAP PAY                                      │
│                                                                             │
│                     SEPARATE DATABASE                                       │
│                                                                             │
│   Wallets  │  Payments  │  Transactions  │  Vendors  │  Students            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Points

- **School SaaS**: Multi-tenant PHP system, one database, wildcard subdomains
- **Peeap Pay**: Separate system with its own database
- **Same Ecosystem**: Both owned by same company, internal trusted communication
- **No API Keys**: SSO handles all authentication
- **Market Entrance**: Schools are the gateway for Peeap Pay adoption

---

## Payment Gateway Settings Page (PHP Side)

This section explains how to implement the Peeap Pay gateway option in the School SaaS payment settings.

### UI States

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Peeap Pay (Integrated)                                                     │
│  Manage your school's financial system, student wallets, and shop.          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STATE 1: Not Registered                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ⚠️ Not Registered                                                   │   │
│  │                                                                      │   │
│  │  1. Register School                                                  │   │
│  │     Create your school account on Peeap.                            │   │
│  │     [Register on Peeap] ──► https://school.peeap.com/school/register│   │
│  │                                                                      │   │
│  │  2. Connect via SSO                                                  │   │
│  │     Link your school system with Peeap Pay.                         │   │
│  │     [Connect with Peeap] ──► Disabled until registered              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STATE 2: Registered but Not Connected                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✓ Registered on Peeap                                              │   │
│  │                                                                      │   │
│  │  [Connect with Peeap] ──► OAuth SSO Flow                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  STATE 3: Connected                                                         │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  ✅ Connected to Peeap Pay                                          │   │
│  │  Connected by: admin@school.edu.sl                                  │   │
│  │  Connected on: January 15, 2024                                     │   │
│  │                                                                      │   │
│  │  Students Linked: 450  │  Transactions: 12,500  │  Volume: NLE 45K  │   │
│  │                                                                      │   │
│  │  [Access Dashboard]  [Sync Now]  [Disconnect]                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Button URLs & Actions

| Button | URL / Action |
|--------|--------------|
| **Register on Peeap** | `https://my.peeap.com/register?redirect={school.peeap.com/school/register?return_url=...}` |
| **Connect with Peeap** | OAuth SSO flow (see PHP code below) |
| **Access Dashboard** | `https://school.peeap.com/school/login?quick_access=true&user_id={peeap_user_id}` |
| **Sync Now** | Call internal sync API |
| **Disconnect** | Revoke tokens, clear `peeap_*` fields |

### Registration Flow

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│   SCHOOL SAAS           │     │      MY.PEEAP.COM       │     │   SCHOOL.PEEAP.COM      │
│   (gov.school.edu.sl)   │     │   (Registration/Login)  │     │   (Setup Wizard)        │
│                         │     │                         │     │                         │
│   [Register on Peeap]   │────▶│   Create Account        │────▶│   Setup Wizard          │
│                         │     │   or Login              │     │   (Create PIN, etc)     │
│                         │     │                         │     │                         │
│                         │◀────────────────────────────────────│   [Return to School]    │
│   ?registered=true      │     │                         │     │                         │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
```

**PHP Code for Register Button:**
```php
// Build the registration URL
$return_url = 'https://' . $_SERVER['HTTP_HOST'] . '/settings/payment?registered=true';
$school_redirect = 'https://school.peeap.com/school/register?return_url=' . urlencode($return_url);
$register_url = 'https://my.peeap.com/register?redirect=' . urlencode($school_redirect);

// In your HTML/Blade template:
// <a href="<?= $register_url ?>" target="_blank">Register on Peeap</a>
```

### PHP Implementation for "Connect with Peeap" Button

```php
// In payment-settings.php or gateway controller

// Check current state
function getPeeapConnectionState($school_id) {
    $school = getSchool($school_id);

    if (!empty($school['peeap_school_id']) && !empty($school['peeap_access_token'])) {
        return 'connected';
    }

    // Check if admin has registered (you can track this in DB or check via API)
    if (!empty($school['peeap_registered_at'])) {
        return 'registered';
    }

    return 'not_registered';
}

// Handle "Connect with Peeap" button click
function initiatePeeapConnection() {
    $state = bin2hex(random_bytes(32));
    $_SESSION['peeap_oauth_state'] = $state;

    $params = [
        'response_type' => 'code',
        'client_id' => 'school_saas',
        'redirect_uri' => 'https://' . $_SERVER['HTTP_HOST'] . '/peeap/callback',
        'scope' => 'school:connect school:manage wallet:read',
        'state' => $state,
        'school_id' => getCurrentSchoolId(),
        'user_type' => 'admin'
    ];

    $sso_url = 'https://my.peeap.com/auth/authorize?' . http_build_query($params);

    header('Location: ' . $sso_url);
    exit;
}
```

### Database Fields for School SaaS

```sql
-- Add these columns to your schools table
ALTER TABLE schools ADD COLUMN peeap_registered_at DATETIME NULL;
ALTER TABLE schools ADD COLUMN peeap_school_id VARCHAR(50) NULL;
ALTER TABLE schools ADD COLUMN peeap_user_id VARCHAR(50) NULL;
ALTER TABLE schools ADD COLUMN peeap_access_token TEXT NULL;
ALTER TABLE schools ADD COLUMN peeap_refresh_token TEXT NULL;
ALTER TABLE schools ADD COLUMN peeap_token_expires_at DATETIME NULL;
ALTER TABLE schools ADD COLUMN peeap_connected_by VARCHAR(255) NULL;
ALTER TABLE schools ADD COLUMN peeap_connected_at DATETIME NULL;

-- Index for quick lookups
CREATE INDEX idx_schools_peeap ON schools(peeap_school_id);
```

### Callback Handler (peeap/callback.php)

```php
<?php
// /peeap/callback.php

session_start();

// 1. Verify state (CSRF protection)
if ($_GET['state'] !== $_SESSION['peeap_oauth_state']) {
    die('Invalid state - security error');
}

// 2. Check for errors
if (isset($_GET['error'])) {
    $error_msg = $_GET['error_description'] ?? $_GET['error'];
    header('Location: /settings/payment?error=' . urlencode($error_msg));
    exit;
}

// 3. Exchange authorization code for tokens
$code = $_GET['code'];
$token_response = exchangeCodeForTokens($code);

if (isset($token_response['error'])) {
    header('Location: /settings/payment?error=' . urlencode($token_response['error']));
    exit;
}

// 4. Save connection to database
$school_id = getCurrentSchoolId();
$db->query("
    UPDATE schools SET
        peeap_school_id = ?,
        peeap_user_id = ?,
        peeap_access_token = ?,
        peeap_refresh_token = ?,
        peeap_token_expires_at = ?,
        peeap_connected_by = ?,
        peeap_connected_at = NOW()
    WHERE id = ?
", [
    $token_response['school_connection']['peeap_school_id'] ?? null,
    $token_response['user']['peeap_id'] ?? null,
    $token_response['access_token'],
    $token_response['refresh_token'],
    date('Y-m-d H:i:s', time() + $token_response['expires_in']),
    $token_response['user']['email'] ?? 'Unknown',
    $school_id
]);

// 5. Redirect to settings with success
header('Location: /settings/payment?peeap_connected=true');

function exchangeCodeForTokens($code) {
    $ch = curl_init('https://my.peeap.com/api/oauth/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => 'school_saas',
            'client_secret' => PEEAP_CLIENT_SECRET, // From config
            'redirect_uri' => 'https://' . $_SERVER['HTTP_HOST'] . '/peeap/callback'
        ])
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}
```

### Mark School as Registered

When admin clicks "Register on Peeap", they go through this flow:
1. `my.peeap.com/register` - Create Peeap account (or login if exists)
2. `school.peeap.com/school/register` - Setup wizard (create PIN, etc)
3. Return to School SaaS with `?registered=true`

The return URL is passed through the entire chain automatically.

---

## School Registration & Login Flows

### 1. Register on school.peeap.com

Schools can register directly on `school.peeap.com/school/register`:

1. Fill in school name, admin name, email, phone, password
2. After registration, see integration instructions
3. Log in to dashboard and complete setup wizard (creates wallet PIN)
4. Go to school system and connect with Peeap

### 2. Login Methods

**A. Direct Login (school.peeap.com)**
- Email/phone + password
- Standard authentication

**B. Quick Access from School Dashboard (gov.school.edu.sl)**
- School dashboard has "Access Peeap" button
- Redirects to `school.peeap.com/login?quick_access=true&user_id=xxx`
- User enters 4-digit wallet PIN only
- PIN was created during setup wizard
- Faster than full login

```
┌─────────────────────────┐     ┌─────────────────────────┐
│   SCHOOL DASHBOARD      │     │    PEEAP LOGIN PAGE     │
│   (gov.school.edu.sl)   │     │  (school.peeap.com)     │
│                         │     │                         │
│   [Access Peeap Pay]    │────▶│   Enter PIN: ****       │
│                         │     │                         │
│                         │     │   [Verify & Access]     │
└─────────────────────────┘     └─────────────────────────┘
```

---

## SSO Connection Flows

### OAuth 2.0 Authorization Code Flow (Recommended)

We use the **Authorization Code Flow** for security - tokens are never exposed in the browser URL.

```
┌──────────────┐                                    ┌──────────────┐
│    SCHOOL    │                                    │  PEEAP SSO   │
│    PORTAL    │                                    │    SERVER    │
└──────┬───────┘                                    └──────┬───────┘
       │                                                   │
       │  1. User clicks "Sign in with Peeap"              │
       │──────────────────────────────────────────────────▶│
       │     GET /oauth/authorize                          │
       │     ?response_type=code                           │
       │     &client_id=school_saas                        │
       │     &redirect_uri=https://xxx.gov.school.edu.sl/callback
       │     &scope=wallet:read wallet:write               │
       │     &state={random_csrf_token}                    │
       │                                                   │
       │  2. User logs in / creates account                │
       │                                                   │
       │  3. Peeap redirects back with authorization code  │
       │◀──────────────────────────────────────────────────│
       │     GET /callback                                 │
       │     ?code={authorization_code}                    │
       │     &state={random_csrf_token}                    │
       │                                                   │
       │  4. School exchanges code for tokens (server-side)│
       │──────────────────────────────────────────────────▶│
       │     POST /oauth/token                             │
       │     {code, client_secret, redirect_uri}           │
       │                                                   │
       │  5. Peeap returns tokens + user data              │
       │◀──────────────────────────────────────────────────│
       │     {access_token, refresh_token, user_data}      │
       │                                                   │
```

---

### 1. School Admin Connection

School admin connects their school to Peeap Pay:

**Step 1: Initiate SSO**

```php
// School portal generates SSO URL
$state = bin2hex(random_bytes(32)); // CSRF protection
$_SESSION['oauth_state'] = $state;

$sso_url = "https://my.peeap.com/auth/authorize?" . http_build_query([
    'response_type' => 'code',
    'client_id' => 'school_saas',
    'redirect_uri' => 'https://' . $_SERVER['HTTP_HOST'] . '/peeap/callback',
    'scope' => 'school:connect school:manage',
    'state' => $state,
    'school_id' => $current_school_id,  // Pass school context
    'user_type' => 'admin'
]);

// Redirect user to Peeap
header('Location: ' . $sso_url);
```

**Step 2: Handle Callback**

```php
// /peeap/callback endpoint
function handlePeeapCallback() {
    // Verify state to prevent CSRF attacks
    if ($_GET['state'] !== $_SESSION['oauth_state']) {
        die('Invalid state - possible CSRF attack');
    }

    // Check for errors
    if (isset($_GET['error'])) {
        return handleError($_GET['error'], $_GET['error_description']);
    }

    // Exchange authorization code for tokens
    $token_response = exchangeCodeForTokens($_GET['code']);

    // Store connection in database
    saveSchoolConnection($token_response);

    // Redirect to Payment Settings with success
    header('Location: /settings/payment?connected=true');
}
```

**Step 3: Exchange Code for Tokens (Server-Side)**

```php
function exchangeCodeForTokens($code) {
    $response = http_post('https://my.peeap.com/api/oauth/token', [
        'grant_type' => 'authorization_code',
        'code' => $code,
        'client_id' => 'school_saas',
        'client_secret' => PEEAP_INTERNAL_SECRET,  // Server-side only
        'redirect_uri' => 'https://' . $_SERVER['HTTP_HOST'] . '/peeap/callback'
    ]);

    return json_decode($response, true);
}
```

**Token Response for Admin:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "dGhpcyBpcyBhIHJlZnJl...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "school:connect school:manage",
  "school_connection": {
    "peeap_school_id": "sch_abc123",
    "connected_by": {
      "peeap_id": "usr_admin456",
      "email": "admin@ses.gov.school.edu.sl",
      "name": "John Admin"
    },
    "connected_at": "2024-01-15T10:00:00Z",
    "status": "active"
  }
}
```

**Store in School Database:**

```sql
-- schools table (add columns)
ALTER TABLE schools ADD COLUMN peeap_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE schools ADD COLUMN peeap_school_id VARCHAR(50);
ALTER TABLE schools ADD COLUMN peeap_access_token TEXT;
ALTER TABLE schools ADD COLUMN peeap_refresh_token TEXT;
ALTER TABLE schools ADD COLUMN peeap_token_expires_at DATETIME;
ALTER TABLE schools ADD COLUMN peeap_connected_by VARCHAR(50);
ALTER TABLE schools ADD COLUMN peeap_connected_at DATETIME;
```

---

### 2. Student Wallet Creation

Students create/link their Peeap wallet:

**Step 1: Initiate SSO**

```php
// Student clicks "Sign in with Peeap"
$state = bin2hex(random_bytes(32));
$_SESSION['oauth_state'] = $state;
$_SESSION['linking_student_id'] = $current_student_id;

$sso_url = "https://my.peeap.com/auth/authorize?" . http_build_query([
    'response_type' => 'code',
    'client_id' => 'school_saas',
    'redirect_uri' => 'https://' . $_SERVER['HTTP_HOST'] . '/peeap/student-callback',
    'scope' => 'wallet:read wallet:write',
    'state' => $state,
    'school_id' => $current_school_id,
    'user_type' => 'student',
    'index_number' => $student['index_number'],  // Link wallet to this
    'student_name' => $student['full_name'],
    'student_phone' => $student['phone']
]);

header('Location: ' . $sso_url);
```

**Step 2: Handle Callback**

```php
// /peeap/student-callback endpoint
function handleStudentCallback() {
    // Verify state
    if ($_GET['state'] !== $_SESSION['oauth_state']) {
        die('Invalid state');
    }

    $student_id = $_SESSION['linking_student_id'];

    // Exchange code for tokens
    $token_response = exchangeCodeForTokens($_GET['code']);

    // Store peeap_id in student record
    saveStudentWalletLink($student_id, $token_response);

    // Redirect to wallet page with success
    header('Location: /student/wallet?linked=true');
}
```

**Token Response for Student:**

```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "refresh_token": "c3R1ZGVudCByZWZyZXNo...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "wallet:read wallet:write",
  "user": {
    "peeap_id": "usr_abc123",
    "email": "student@example.com",
    "phone": "+23276123456",
    "name": "Abu Bakar Kamara",
    "is_new_account": false
  },
  "wallet": {
    "wallet_id": "wal_xyz789",
    "balance": 150.00,
    "currency": "NLE",
    "status": "active",
    "daily_limit": 100.00,
    "daily_spent": 25.00
  },
  "link": {
    "index_number": "SL2024/12345",
    "school_id": 1,
    "linked_at": "2024-01-15T10:00:00Z"
  }
}
```

**Store in School Database:**

```sql
-- students table (add columns)
ALTER TABLE students ADD COLUMN peeap_id VARCHAR(50);
ALTER TABLE students ADD COLUMN peeap_wallet_id VARCHAR(50);
ALTER TABLE students ADD COLUMN peeap_linked_at DATETIME;

-- Update student record
UPDATE students SET
    peeap_id = 'usr_abc123',
    peeap_wallet_id = 'wal_xyz789',
    peeap_linked_at = NOW()
WHERE id = 45;
```

---

### Token Management

**Refresh Token (when access token expires):**

```php
function refreshAccessToken($school_id) {
    $school = getSchool($school_id);

    $response = http_post('https://my.peeap.com/api/oauth/token', [
        'grant_type' => 'refresh_token',
        'refresh_token' => $school['peeap_refresh_token'],
        'client_id' => 'school_saas',
        'client_secret' => PEEAP_INTERNAL_SECRET
    ]);

    $tokens = json_decode($response, true);

    // Update stored tokens
    updateSchoolTokens($school_id, $tokens);

    return $tokens['access_token'];
}
```

**Token Expiry Handling:**

```php
function getPeeapAccessToken($school_id) {
    $school = getSchool($school_id);

    // Check if token is expired (with 5 min buffer)
    if (strtotime($school['peeap_token_expires_at']) < time() + 300) {
        return refreshAccessToken($school_id);
    }

    return $school['peeap_access_token'];
}
```

---

### Security Best Practices

| Practice | Implementation |
|----------|----------------|
| **State Parameter** | Random 32-byte hex string, stored in session, verified on callback |
| **HTTPS Only** | All redirect URIs must be HTTPS |
| **Server-Side Token Exchange** | Never expose `client_secret` in browser |
| **Token Storage** | Store tokens encrypted in database, never in cookies/localStorage |
| **Token Refresh** | Refresh before expiry, handle refresh failures gracefully |
| **Scope Limitation** | Request only needed scopes (`wallet:read` vs `school:manage`) |

---

### SSO Scopes

| Scope | Description | Used By |
|-------|-------------|---------|
| `school:connect` | Connect school to Peeap | Admin |
| `school:manage` | Manage school settings, vendors | Admin |
| `wallet:read` | Read wallet balance, transactions | Student |
| `wallet:write` | Make payments, request top-ups | Student |
| `student:sync` | Sync student data | Admin |
| `fee:pay` | Pay school fees | Student/Parent |

---

## Student Identification

### ID Types

| ID Type | Scope | Example | Persists on Transfer? |
|---------|-------|---------|----------------------|
| `admission_no` | School-specific | `2023/001` | ❌ New at each school |
| `index_number` | National (WAEC/BECE) | `SL2024/12345` | ✅ Follows student |
| `student_id` | School DB ID | `45` | ❌ Internal to school |
| `peeap_id` | Peeap user ID | `usr_abc123` | ✅ Wallet identity |

### QR Code Architecture

Schools use their **existing student QR codes** (format: `student-{id}`). QR codes are school-specific:

```
┌─────────────────────────────────────────────────────────────────┐
│                    VENDOR TERMINAL (at School A)                │
│                    school_id: 1                                 │
└─────────────────────────────────────────────────────────────────┘
                                │
                    Student scans: "student-45"
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│              Lookup student 45 at school_id: 1                  │
│                                                                 │
│   ✅ Student 45 at School 1 → Show profile, allow payment       │
│   ❌ Student 45 from School 2 → "Student not found"             │
└─────────────────────────────────────────────────────────────────┘
```

---

## Student Transfer Flow

When a student transfers schools, their Peeap wallet follows them via `index_number`:

```
┌─────────────────┐                      ┌─────────────────┐
│    SCHOOL A     │                      │    SCHOOL B     │
│                 │                      │                 │
│  Student: 45    │   Transfer via       │  Student: 120   │
│  Admission:     │   index_number       │  Admission:     │
│  2023/001       │ ─────────────────▶   │  2024/055       │
│                 │                      │                 │
│  index_number:  │                      │  index_number:  │
│  SL2024/12345   │                      │  SL2024/12345   │
└─────────────────┘                      └─────────────────┘
                            │
                            ▼
              ┌─────────────────────────────┐
              │         PEEAP PAY           │
              │                             │
              │  peeap_id: usr_abc123       │
              │  wallet_id: wal_xyz789      │
              │  index_number: SL2024/12345 │
              │  balance: NLE 50            │
              │                             │
              │  ✅ Wallet follows student  │
              │  via index_number           │
              └─────────────────────────────┘
```

---

## Internal Communication

Since School SaaS and Peeap Pay are in the same ecosystem, communication is internal and trusted.

### School → Peeap (What School System Sends)

| Data | When | Purpose |
|------|------|---------|
| Student info | SSO callback | Link wallet to student |
| `index_number` | Always | Universal student identifier |
| `school_id` | Always | Multi-tenant identifier |
| Fee payment request | Fee payment | Process fee via Peeap |
| Student transfer | Transfer out | Update wallet school link |

### Peeap → School (What Peeap Sends Back)

| Data | When | Purpose |
|------|------|---------|
| Wallet balance | After SSO | Show student their balance |
| Transaction completed | Purchase | Update school records |
| Fee paid | Fee payment | Mark fee as paid in school DB |
| Transport paid | Transport fee | Notify driver, update validity |
| Wallet topped up | Top-up | Notify parent/student |

---

## Webhook Events

Peeap sends these events to the school system:

### transaction.completed

```json
{
  "event": "transaction.completed",
  "school_id": 1,
  "student_id": 45,
  "index_number": "SL2024/12345",
  "amount": 15,
  "vendor_name": "Campus Canteen",
  "balance_after": 135,
  "timestamp": "2024-01-15T12:30:00Z"
}
```

### fee.paid

```json
{
  "event": "fee.paid",
  "school_id": 1,
  "student_id": 45,
  "fee_id": 101,
  "fee_name": "Term 1 Tuition",
  "amount": 150,
  "paid_by": "parent",
  "timestamp": "2024-01-15T10:00:00Z"
}
```

### transport.fee_paid

```json
{
  "event": "transport.fee_paid",
  "school_id": 1,
  "student_id": 45,
  "route_id": "route_a",
  "amount": 5,
  "valid_from": "2024-01-01",
  "valid_to": "2024-01-31",
  "timestamp": "2024-01-15T08:00:00Z"
}
```

### wallet.topup

```json
{
  "event": "wallet.topup",
  "school_id": 1,
  "student_id": 45,
  "amount": 50,
  "new_balance": 200,
  "source": "parent",
  "timestamp": "2024-01-15T08:00:00Z"
}
```

### student.transferred

```json
{
  "event": "student.transferred",
  "index_number": "SL2024/12345",
  "from_school_id": 1,
  "to_school_id": 2,
  "wallet_balance": 50,
  "timestamp": "2024-06-01T00:00:00Z"
}
```

---

## School Payment Settings UI

After school admin connects via SSO, they see:

```
┌─────────────────────────────────────────────────────────────────┐
│  Payment Settings                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ✅ Connected to Peeap Pay                                      │
│  Connected by: admin@ses.gov.school.edu.sl                      │
│  Connected on: January 15, 2024                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Students Linked    │  Total Transactions  │  Volume    │   │
│  │       450           │       12,500         │  NLE 45K   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Sync Settings                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  [✓] Auto-sync new students                             │   │
│  │  [✓] Sync fee payments                                  │   │
│  │  [✓] Sync transport payments                            │   │
│  │  [✓] Enable vendor payments                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Sync Now]                              [Disconnect]           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Student Wallet UI (in School Portal)

After student connects via SSO:

```
┌─────────────────────────────────────────────────────────────────┐
│  My Wallet                                           Abu Bakar  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │           Balance: NLE 150.00                           │   │
│  │                                                         │   │
│  │  Daily Spent: NLE 25 / NLE 100 limit                    │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Recent Transactions                                            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  🍽️ Campus Canteen         -NLE 15      12:30 PM        │   │
│  │  💰 Top-up from Parent      +NLE 50      08:00 AM        │   │
│  │  🍽️ Campus Canteen         -NLE 10      Yesterday       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  [Request Top-up]                        [View All]             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Error Handling

| Error | Description | Action |
|-------|-------------|--------|
| `STUDENT_NOT_FOUND` | Student not at this school | Check school_id |
| `WALLET_NOT_LINKED` | Student hasn't connected Peeap | Show "Sign in with Peeap" |
| `INSUFFICIENT_BALANCE` | Wallet balance too low | Show balance, suggest top-up |
| `DAILY_LIMIT_EXCEEDED` | Over daily spending limit | Show limit, wait for reset |
| `INVALID_PIN` | Wrong PIN entered | Retry (3 attempts) |
| `VENDOR_NOT_APPROVED` | Vendor not approved for school | Contact school admin |

---

## OAuth Endpoints (Live)

| Endpoint | Method | URL |
|----------|--------|-----|
| Authorization | GET | `https://my.peeap.com/auth/authorize` |
| Token Exchange | POST | `https://my.peeap.com/api/oauth/token` |
| User Info | GET | `https://my.peeap.com/api/oauth/userinfo` |
| Revoke Token | POST | `https://my.peeap.com/api/oauth/revoke` |

### OAuth Client ID

```
client_id: school_saas
```

The `client_secret` will be provided separately via secure channel.

---

## Support

- **School Support:** schools@peeap.com
- **Technical Issues:** tech@peeap.com
- **Phone:** +232 76 000 000
