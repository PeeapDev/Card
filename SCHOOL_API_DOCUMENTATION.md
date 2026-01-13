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

### Connection Flow Diagram

```
┌─────────────────────────┐     ┌─────────────────────────┐     ┌─────────────────────────┐
│   SCHOOL SAAS           │     │      MY.PEEAP.COM       │     │   SCHOOL.PEEAP.COM      │
│   (ses.gov.school.edu.sl)│     │   (Authentication)      │     │   (Setup Wizard)        │
│                         │     │                         │     │                         │
│   [Connect with Peeap]  │────▶│   User Login/Register   │────▶│   Setup Wizard          │
│                         │     │                         │     │   - Verify school data  │
│                         │     │                         │     │   - Upload logo         │
│                         │     │                         │     │   - Configure settings  │
│                         │◀────────────────────────────────────│   [Complete Setup]      │
│   ?peeap_connected=true │     │                         │     │                         │
└─────────────────────────┘     └─────────────────────────┘     └─────────────────────────┘
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
    // Get current school's subdomain (e.g., "ses.gov.school.edu.sl")
    $origin = $_SERVER['HTTP_HOST'];
    $school_id = getCurrentSchoolId();

    // IMPORTANT: redirect_uri points to school.peeap.com, NOT back to this site
    // school.peeap.com will show a setup wizard and then redirect back here
    $params = [
        'response_type' => 'code',
        'client_id' => 'school_saas',
        'redirect_uri' => 'https://school.peeap.com/auth/callback',
        'scope' => 'school:connect school:manage wallet:read',
        'origin' => $origin,           // Pass the school's subdomain
        'school_id' => $school_id,     // Pass the school ID
        'connection' => 'new',         // Indicates this is a new connection
        'user_type' => 'admin'
    ];

    $sso_url = 'https://my.peeap.com/auth/authorize?' . http_build_query($params);

    header('Location: ' . $sso_url);
    exit;
}
```

### What Happens After "Connect with Peeap"

1. **User authenticates on my.peeap.com** (login or register)
2. **Redirected to school.peeap.com/auth/callback** with authorization code
3. **school.peeap.com shows Setup Wizard**:
   - Fetches school data from your API (`https://ses.gov.school.edu.sl/api/peeap/school-info`)
   - Displays school name, student count, fees for verification
   - Lets admin upload school logo (for receipts)
   - Configures payment settings
4. **After setup complete, redirects back** to `https://ses.gov.school.edu.sl/settings/payment?peeap_connected=true`

### API Endpoint for School Data (Required)

You must expose an endpoint on your school SaaS for Peeap to fetch school information:

```php
// /api/peeap/school-info.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://school.peeap.com');
header('Access-Control-Allow-Methods: GET');

$school_id = getCurrentSchoolId();
$school = getSchool($school_id);

echo json_encode([
    'school_id' => $school['id'],
    'school_name' => $school['name'],
    'school_type' => $school['type'],
    'subdomain' => explode('.', $_SERVER['HTTP_HOST'])[0],
    'address' => $school['address'] ?? null,
    'phone' => $school['phone'] ?? null,
    'email' => $school['email'] ?? null,
    'student_count' => getStudentCount($school_id),
    'staff_count' => getStaffCount($school_id),
    'fees' => getSchoolFees($school_id),
    'academic_year' => getCurrentAcademicYear(),
    'term' => getCurrentTerm(),
]);
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

### Handling the Return from Peeap

After setup completes on school.peeap.com, the user is redirected back to your school with query params.

```php
<?php
// /settings/payment.php

// Check if returning from Peeap connection
if (isset($_GET['peeap_connected']) && $_GET['peeap_connected'] === 'true') {
    // Connection successful!
    // school.peeap.com has already stored the connection data
    // You may want to fetch the connection status from Peeap API

    $school_id = getCurrentSchoolId();

    // Optionally verify the connection by calling Peeap API
    $connection_status = verifyPeeapConnection($school_id);

    if ($connection_status['connected']) {
        // Update local database to mark as connected
        $db->query("
            UPDATE schools SET
                peeap_connected = 1,
                peeap_school_id = ?,
                peeap_connected_at = NOW()
            WHERE id = ?
        ", [
            $connection_status['peeap_school_id'],
            $school_id
        ]);

        $success_message = "Successfully connected to Peeap Pay!";
    }
}

if (isset($_GET['error'])) {
    $error_message = urldecode($_GET['error']);
}

function verifyPeeapConnection($school_id) {
    // Call Peeap API to verify connection status
    $ch = curl_init("https://api.peeap.com/api/school/connection/status?school_id={$school_id}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'X-Client-ID: school_saas',
            'X-Client-Secret: ' . PEEAP_CLIENT_SECRET
        ]
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
       │     GET https://my.peeap.com/auth/authorize       │
       │     ?response_type=code                           │
       │     &client_id=school_saas                        │
       │     &redirect_uri=https://xxx.gov.school.edu.sl/peeap/callback
       │     &scope=wallet:read wallet:write               │
       │     &state={random_csrf_token}                    │
       │                                                   │
       │  2. User logs in / creates account on Peeap       │
       │                                                   │
       │  3. Peeap redirects back with authorization code  │
       │◀──────────────────────────────────────────────────│
       │     GET /peeap/callback                           │
       │     ?code={authorization_code}                    │
       │     &state={random_csrf_token}                    │
       │                                                   │
       │  4. School exchanges code for tokens (server-side)│
       │──────────────────────────────────────────────────▶│
       │     POST https://api.peeap.com/api/oauth/token    │
       │     {code, client_id, client_secret, redirect_uri}│
       │                                                   │
       │  5. Peeap returns tokens + user data              │
       │◀──────────────────────────────────────────────────│
       │     {access_token, refresh_token, user, wallet}   │
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
    $ch = curl_init('https://api.peeap.com/api/oauth/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'client_id' => 'school_saas',
            'client_secret' => PEEAP_CLIENT_SECRET // = 'peeap_school_integration_2024_sl',  // Server-side only, from config
            'redirect_uri' => 'https://' . $_SERVER['HTTP_HOST'] . '/peeap/callback'
        ])
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}
```

**Token Response for Admin:**

```json
{
  "access_token": "ABC123xyz...",
  "refresh_token": "DEF456abc...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "school:connect school:manage",
  "user": {
    "peeap_id": "usr_admin456",
    "email": "admin@ses.gov.school.edu.sl",
    "phone": "+23276123456",
    "name": "John Admin",
    "is_new_account": false
  },
  "school_connection": {
    "peeap_school_id": "sch_abc12345",
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
// Configure session for cross-domain compatibility
ini_set('session.cookie_samesite', 'Lax');
ini_set('session.cookie_secure', '1');
session_start();

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

    $ch = curl_init('https://api.peeap.com/api/oauth/token');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_POSTFIELDS => json_encode([
            'grant_type' => 'refresh_token',
            'refresh_token' => $school['peeap_refresh_token'],
            'client_id' => 'school_saas',
            'client_secret' => PEEAP_CLIENT_SECRET // = 'peeap_school_integration_2024_sl'
        ])
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    $tokens = json_decode($response, true);

    if (isset($tokens['error'])) {
        // Handle refresh failure - user may need to re-authenticate
        throw new Exception('Token refresh failed: ' . $tokens['error']);
    }

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

## Troubleshooting

### "Invalid state" or CSRF Errors

If you see "Invalid state - security error" after OAuth redirect, the PHP session is being lost. This is the most common integration issue.

**Causes:**
1. Session cookies not persisting across cross-domain redirect
2. `session_start()` called after output or with wrong settings
3. Load balancer routing to different servers with separate session storage

**Fix:**

```php
// At the VERY TOP of your PHP files (before ANY output)
// In both the initiate file AND callback file:

ini_set('session.cookie_samesite', 'Lax');  // Allow cross-site in Lax mode
ini_set('session.cookie_secure', '1');       // HTTPS only
ini_set('session.cookie_httponly', '1');     // Prevent XSS
session_start();
```

**Alternative: Use Database/Redis for State Storage**

If session issues persist, store the state in database instead:

```php
// When initiating OAuth:
$state = bin2hex(random_bytes(32));
$db->query("INSERT INTO oauth_states (state, school_id, created_at) VALUES (?, ?, NOW())",
    [$state, getCurrentSchoolId()]);

// In callback:
$result = $db->query("SELECT * FROM oauth_states WHERE state = ? AND created_at > NOW() - INTERVAL 10 MINUTE",
    [$_GET['state']]);
if (!$result) {
    die('Invalid or expired state');
}
$db->query("DELETE FROM oauth_states WHERE state = ?", [$_GET['state']]);
```

### Token Exchange Fails

If you get errors when exchanging the code for tokens:

1. **Check `redirect_uri` matches exactly** - Must be identical in both authorization request and token exchange
2. **Check `client_secret`** - Ensure it's correct and not URL-encoded
3. **Code already used** - Authorization codes are single-use, don't retry
4. **Code expired** - Codes expire after 10 minutes

---

## OAuth Endpoints (Live)

| Endpoint | Method | URL |
|----------|--------|-----|
| Authorization | GET | `https://my.peeap.com/auth/authorize` |
| Token Exchange | POST | `https://api.peeap.com/api/oauth/token` |
| User Info | GET | `https://api.peeap.com/api/oauth/userinfo` |
| Revoke Token | POST | `https://api.peeap.com/api/oauth/revoke` |

> **Note:** Authorization happens on `my.peeap.com` (user-facing), but API calls go to `api.peeap.com`.

### OAuth Client Credentials

```
client_id: school_saas
client_secret: peeap_school_integration_2024_sl
```

> **Note:** This is a fixed secret for internal integration. Do not share outside the organization.

---

## Required API Endpoints for School SaaS

The School SaaS system must expose these API endpoints for Peeap integration to work properly. These endpoints are called by both school.peeap.com (during connection setup) and the Peeap mobile app (for parent/guardian access via School Utilities).

### 1. School Information Endpoint

**Endpoint:** `GET /api/peeap/school-info`

Called during connection setup to fetch school details.

```php
<?php
// /api/peeap/school-info.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://school.peeap.com');
header('Access-Control-Allow-Methods: GET');

$school_id = getCurrentSchoolId(); // From subdomain or config
$school = getSchoolDetails($school_id);

echo json_encode([
    'school_id' => $school['id'],
    'school_name' => $school['name'],
    'school_type' => $school['type'], // 'Primary', 'Secondary', etc.
    'subdomain' => getSubdomain(), // e.g., 'ses' from ses.gov.school.edu.sl
    'address' => $school['address'] ?? null,
    'phone' => $school['phone'] ?? null,
    'email' => $school['email'] ?? null,
    'logo_url' => $school['logo_url'] ?? null,
    'student_count' => getStudentCount($school_id),
    'staff_count' => getStaffCount($school_id),
    'fees' => getCurrentFees($school_id),
    'academic_year' => '2024/2025',
    'term' => 'Term 1',
]);

function getCurrentFees($school_id) {
    // Return array of current term fees
    return [
        ['name' => 'Tuition Fee', 'amount' => 500, 'term' => 'Term 1'],
        ['name' => 'Development Levy', 'amount' => 100, 'term' => 'Term 1'],
        ['name' => 'Sports Fee', 'amount' => 50, 'term' => 'Term 1'],
    ];
}
```

### 2. Student Verification Endpoint

**Endpoint:** `POST /api/peeap/verify-student`

Called when parents add their children in the Peeap app. Verifies the student exists.

```php
<?php
// /api/peeap/verify-student.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$index_number = $input['index_number'] ?? '';

if (empty($index_number)) {
    http_response_code(400);
    echo json_encode(['error' => 'Index number is required']);
    exit;
}

$student = findStudentByIndexNumber($index_number);

if (!$student) {
    http_response_code(404);
    echo json_encode([
        'found' => false,
        'error' => 'Student not found with this index number'
    ]);
    exit;
}

echo json_encode([
    'found' => true,
    'student_id' => $student['id'],
    'student_name' => $student['full_name'],
    'class_name' => $student['class_name'],
    'admission_number' => $student['admission_number'],
    'profile_photo_url' => $student['photo_url'] ?? null,
]);
```

### 3. Student Financials Endpoint

**Endpoint:** `POST /api/peeap/student-financials`

Called by the Peeap app to fetch a student's financial data (fees, wallet balance, lunch, transport).

```php
<?php
// /api/peeap/student-financials.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$index_number = $input['index_number'] ?? '';

if (empty($index_number)) {
    http_response_code(400);
    echo json_encode(['error' => 'Index number is required']);
    exit;
}

$student = findStudentByIndexNumber($index_number);

if (!$student) {
    http_response_code(404);
    echo json_encode(['error' => 'Student not found']);
    exit;
}

$student_id = $student['id'];

// Get financial data
$fees = getStudentFees($student_id);
$wallet_balance = getStudentWalletBalance($student_id);
$lunch_balance = getStudentLunchBalance($student_id);
$transport_balance = getStudentTransportBalance($student_id);
$transactions = getRecentTransactions($student_id, 10);

echo json_encode([
    'wallet_balance' => $wallet_balance,
    'lunch_balance' => $lunch_balance,
    'transport_balance' => $transport_balance,
    'fees' => array_map(function($fee) {
        return [
            'id' => $fee['id'],
            'name' => $fee['name'],
            'amount' => $fee['amount'],
            'paid' => $fee['amount_paid'],
            'due_date' => $fee['due_date'],
            'status' => determineFeeStatus($fee),
        ];
    }, $fees),
    'recent_transactions' => array_map(function($tx) {
        return [
            'id' => $tx['id'],
            'type' => $tx['type'], // 'purchase', 'topup', 'fee_payment'
            'amount' => $tx['amount'],
            'description' => $tx['description'],
            'date' => $tx['created_at'],
        ];
    }, $transactions),
]);

function determineFeeStatus($fee) {
    if ($fee['amount_paid'] >= $fee['amount']) return 'paid';
    if ($fee['amount_paid'] > 0) return 'partial';
    if (strtotime($fee['due_date']) < time()) return 'overdue';
    return 'unpaid';
}
```

### 4. Schools Search Endpoint (Central API)

**Endpoint:** `GET /api/schools/search`

This endpoint should be on a central domain (e.g., `api.gov.school.edu.sl`) to allow searching all schools.

```php
<?php
// /api/schools/search.php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$query = $_GET['q'] ?? '';

if (strlen($query) < 2) {
    echo json_encode([]);
    exit;
}

// Search schools by name
$schools = searchSchools($query);

echo json_encode(array_map(function($school) {
    return [
        'id' => $school['id'],
        'subdomain' => $school['subdomain'],
        'name' => $school['name'],
        'school_type' => $school['type'],
        'logo_url' => $school['logo_url'],
        'student_count' => $school['student_count'],
        'is_peeap_connected' => !empty($school['peeap_connected']),
    ];
}, $schools));
```

### API Response Formats

#### Success Response
```json
{
    "success": true,
    "data": { ... }
}
```

#### Error Response
```json
{
    "success": false,
    "error": "Error message here",
    "code": "ERROR_CODE"
}
```

### CORS Configuration

All endpoints must allow CORS from Peeap domains:

```php
// Add to all API files
header('Access-Control-Allow-Origin: *'); // Or specific Peeap domains
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
```

### Security Recommendations

1. **Rate Limiting** - Implement rate limiting to prevent abuse
2. **Input Validation** - Always validate and sanitize inputs
3. **Logging** - Log all API requests for audit purposes
4. **HTTPS Only** - All endpoints must use HTTPS

---

## Support

- **School Support:** schools@peeap.com
- **Technical Issues:** tech@peeap.com
- **Phone:** +232 76 000 000
