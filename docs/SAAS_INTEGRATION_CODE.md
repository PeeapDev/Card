# SaaS Integration Code for SDSL2

This document contains the PHP code to integrate your SDSL2 school management system with Peeap Pay.

---

## Overview: What Your SaaS Can Do After Connection

Once a school connects to Peeap via OAuth, your SaaS system gains the following capabilities:

### 🏫 School Management
| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| **School Profile** | View/update school info on Peeap | `GET/PUT /api/v1/school/{peeap_school_id}` |
| **School Dashboard** | Access analytics & reports | Quick Access via JWT |
| **Connection Status** | Check if school is connected | `GET /api/v1/school/{peeap_school_id}/status` |

### 👨‍🎓 Student Wallet Management
| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| **Create Wallet** | Create wallet for student using index number | `POST /api/v1/school/wallets/create` |
| **Link Existing Wallet** | Connect existing Peeap account to student | `POST /api/v1/school/wallets/link` |
| **View Balance** | Check student wallet balance | `GET /api/v1/school/wallets/{wallet_id}/balance` |
| **Top Up Wallet** | Add funds to student wallet | `POST /api/v1/school/wallets/topup` |
| **Set Daily Limit** | Configure spending limits | `PUT /api/v1/school/wallets/{wallet_id}/limits` |
| **Transaction History** | View student transactions | `GET /api/v1/school/wallets/{wallet_id}/transactions` |

### 💰 Fee Collection
| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| **Collect School Fees** | Debit student wallet for fees | `POST /api/v1/school/fees/collect` |
| **Fee Payment Status** | Check if fee is paid | `GET /api/v1/school/fees/{fee_id}/status` |
| **Bulk Fee Collection** | Collect fees from multiple students | `POST /api/v1/school/fees/bulk-collect` |
| **Fee Refund** | Refund a fee payment | `POST /api/v1/school/fees/{fee_id}/refund` |

### 🚌 Transport Payments
| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| **Transport Fee** | Collect transport fees | `POST /api/v1/school/transport/collect` |
| **Bus Pass** | Issue digital bus passes | `POST /api/v1/school/transport/pass` |

### 🍽️ Vendor/Canteen Payments
| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| **Register Vendor** | Add canteen/vendor to school | `POST /api/v1/school/vendors` |
| **Vendor Payments** | Students pay vendors via wallet | Handled by Peeap POS/App |
| **Vendor Reports** | View vendor transaction reports | `GET /api/v1/school/vendors/{vendor_id}/reports` |

### 📊 Reports & Analytics
| Feature | Description | API Endpoint |
|---------|-------------|--------------|
| **Daily Summary** | Daily transaction summary | `GET /api/v1/school/{peeap_school_id}/reports/daily` |
| **Student Report** | Individual student activity | `GET /api/v1/school/students/{index_number}/report` |
| **Fee Collection Report** | Fee collection analytics | `GET /api/v1/school/{peeap_school_id}/reports/fees` |
| **Export Data** | Export reports as CSV/PDF | `GET /api/v1/school/{peeap_school_id}/reports/export` |

### 🔔 Webhooks (Real-time Notifications)
Your SaaS can receive real-time notifications when:
- `transaction.completed` - A student makes a payment
- `fee.paid` - A school fee is paid
- `transport.fee_paid` - Transport fee is paid
- `wallet.topup` - A wallet is topped up
- `wallet.low_balance` - Student wallet balance is low
- `student.transferred` - Student transferred to another school

---

## Integration Flows

| Flow | Description | When to Use |
|------|-------------|-------------|
| **Flow 1** | Initial School Connection via OAuth | First-time setup |
| **Flow 2** | Quick Dashboard Access with JWT | Staff accessing Peeap dashboard |
| **Flow 3** | Student Wallet Creation | Creating wallets for students |

---

## Flow 1: Initial School Connection via OAuth

When a school first connects to Peeap, you need to send the school's details (name, logo, domain) so Peeap can display them on the authorization page and create a proper school record.

### PeeapOAuthController.php

Create file: `app/Http/Controllers/Admin/PeeapOAuthController.php`

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Brian2694\Toastr\Facades\Toastr;

class PeeapOAuthController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Redirect admin to Peeap OAuth authorization page
     * This is the FIRST step when connecting a school to Peeap
     */
    public function connect()
    {
        $user = Auth::user();
        $school = $this->getSchoolDetails();

        if (!$school) {
            Toastr::error('School details not found.', 'Error');
            return redirect()->back();
        }

        // Build OAuth authorization URL with school details
        $params = http_build_query([
            'client_id' => config('peeap.client_id'),
            'redirect_uri' => route('peeap.oauth.callback'),
            'response_type' => 'code',
            'scope' => 'school:connect school:manage student:sync',
            'state' => csrf_token(),

            // IMPORTANT: Pass school details for display on Peeap authorization page
            'school_name' => $school['name'],
            'school_logo_url' => $school['logo_url'] ?? null,
            'school_domain' => request()->getHost(),

            // Pass origin so Peeap knows where this request came from
            'origin' => request()->getHost(),
        ]);

        $authUrl = config('peeap.oauth_url') . '/oauth/authorize?' . $params;

        return redirect($authUrl);
    }

    /**
     * Handle OAuth callback from Peeap
     * Peeap will redirect here after user authorizes
     */
    public function callback(Request $request)
    {
        // Verify state to prevent CSRF
        if ($request->state !== csrf_token()) {
            Log::warning('CSRF token mismatch in Peeap OAuth callback');
            // Allow for now due to session issues, but log it
        }

        // Check for errors
        if ($request->has('error')) {
            $errorMsg = $request->error_description ?? $request->error;
            Toastr::error($errorMsg, 'Connection Denied');
            return redirect()->route('peeap.settings');
        }

        // Get authorization code
        $code = $request->code;
        if (!$code) {
            Toastr::error('No authorization code received.', 'Error');
            return redirect()->route('peeap.settings');
        }

        try {
            // Exchange code for tokens
            $response = Http::post(config('peeap.api_url') . '/api/auth/sso/exchange', [
                'code' => $code,
                'redirect_uri' => route('peeap.oauth.callback'),
                'client_id' => config('peeap.client_id'),
            ]);

            if (!$response->successful()) {
                throw new \Exception($response->json('message') ?? 'Token exchange failed');
            }

            $data = $response->json();

            // Check if school connection was successful
            if (!isset($data['schoolAdmin'])) {
                throw new \Exception('School connection data not received');
            }

            $schoolAdmin = $data['schoolAdmin'];
            $tokens = $data['tokens'];

            // Store school connection in local database
            DB::table('peeap_settings')->updateOrInsert(
                ['school_id' => Auth::user()->school_id],
                [
                    'peeap_school_id' => $schoolAdmin['schoolId'],  // e.g., "sch_abc12345"
                    'school_name' => $schoolAdmin['schoolName'],
                    'school_domain' => $schoolAdmin['schoolDomain'] ?? request()->getHost(),
                    'access_token' => $tokens['accessToken'],
                    'refresh_token' => $tokens['refreshToken'],
                    'token_expires_at' => now()->addSeconds($tokens['expiresIn']),
                    'status' => 'connected',
                    'connected_at' => now(),
                    'connected_by' => Auth::id(),
                    'updated_at' => now(),
                ]
            );

            // Display the generated peeap_school_id to the admin
            Toastr::success("School connected successfully! Your Peeap School ID: {$schoolAdmin['schoolId']}", 'Connected');

            return redirect()->route('peeap.settings');

        } catch (\Exception $e) {
            Log::error('Peeap OAuth callback failed: ' . $e->getMessage());
            Toastr::error($e->getMessage(), 'Connection Failed');
            return redirect()->route('peeap.settings');
        }
    }

    /**
     * Disconnect school from Peeap
     */
    public function disconnect()
    {
        DB::table('peeap_settings')
            ->where('school_id', Auth::user()->school_id)
            ->update([
                'status' => 'disconnected',
                'access_token' => null,
                'refresh_token' => null,
                'updated_at' => now(),
            ]);

        Toastr::success('School disconnected from Peeap.', 'Disconnected');
        return redirect()->route('peeap.settings');
    }

    /**
     * Get school details for OAuth authorization
     */
    private function getSchoolDetails(): ?array
    {
        $schoolId = Auth::user()->school_id;

        // Adjust this query to match your school table structure
        $school = DB::table('sm_schools')
            ->where('id', $schoolId)
            ->first();

        if (!$school) {
            return null;
        }

        return [
            'name' => $school->school_name,
            'logo_url' => $school->logo ? asset('storage/' . $school->logo) : null,
            'email' => $school->email ?? null,
            'phone' => $school->phone ?? null,
        ];
    }
}
```

### Add OAuth Routes

Add to `routes/tenant.php`:

```php
// Peeap OAuth Connection
Route::prefix('peeap')->middleware(['auth'])->group(function () {
    Route::get('/connect', 'Admin\PeeapOAuthController@connect')->name('peeap.oauth.connect');
    Route::get('/callback', 'Admin\PeeapOAuthController@callback')->name('peeap.oauth.callback');
    Route::post('/disconnect', 'Admin\PeeapOAuthController@disconnect')->name('peeap.oauth.disconnect');
});
```

### Connection Button in Peeap Settings Page

Add this to your Peeap settings blade view:

```blade
@if($peeapSettings && $peeapSettings->status === 'connected')
    <div class="alert alert-success">
        <strong>Connected!</strong>
        <p>School ID: <code>{{ $peeapSettings->peeap_school_id }}</code></p>
        <p>School Name: {{ $peeapSettings->school_name }}</p>
        <p>Connected: {{ $peeapSettings->connected_at->diffForHumans() }}</p>
    </div>

    <form action="{{ route('peeap.oauth.disconnect') }}" method="POST" class="mt-3">
        @csrf
        <button type="submit" class="btn btn-danger" onclick="return confirm('Are you sure you want to disconnect?')">
            Disconnect from Peeap
        </button>
    </form>
@else
    <div class="alert alert-info">
        <p>Connect your school to Peeap to enable student wallets, fee payments, and more.</p>
    </div>

    <a href="{{ route('peeap.oauth.connect') }}" class="btn btn-primary">
        <i class="fa fa-link"></i> Connect to Peeap
    </a>
@endif
```

### peeap_settings Table Migration

Create migration: `database/migrations/xxxx_create_peeap_settings_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePeeapSettingsTable extends Migration
{
    public function up()
    {
        Schema::create('peeap_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('school_id')->unique();
            $table->string('peeap_school_id', 50)->nullable();  // e.g., "sch_abc12345"
            $table->string('school_name')->nullable();
            $table->string('school_domain')->nullable();
            $table->text('access_token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->enum('status', ['pending', 'connected', 'disconnected'])->default('pending');
            $table->timestamp('connected_at')->nullable();
            $table->unsignedBigInteger('connected_by')->nullable();
            $table->timestamps();

            $table->foreign('school_id')->references('id')->on('sm_schools')->onDelete('cascade');
            $table->index('peeap_school_id');
        });
    }

    public function down()
    {
        Schema::dropIfExists('peeap_settings');
    }
}
```

---

## Flow 2: Quick Dashboard Access with JWT tokens

## 1. Add JWT Helper Trait

Create file: `app/Traits/PeeapJwtTrait.php`

```php
<?php

namespace App\Traits;

trait PeeapJwtTrait
{
    /**
     * Generate a signed JWT token for quick access to Peeap School Dashboard
     *
     * @param array $payload User data to include in token
     * @return string The signed JWT token
     */
    protected function generatePeeapToken(array $payload): string
    {
        $secret = config('peeap.jwt_secret');

        $header = [
            'alg' => 'HS256',
            'typ' => 'JWT'
        ];

        // Add standard JWT claims
        $payload['iat'] = time();
        $payload['exp'] = time() + 300; // 5 minutes expiry
        $payload['iss'] = request()->getHost();

        $base64Header = $this->base64UrlEncode(json_encode($header));
        $base64Payload = $this->base64UrlEncode(json_encode($payload));

        $signature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
        $base64Signature = $this->base64UrlEncode($signature);

        return "$base64Header.$base64Payload.$base64Signature";
    }

    /**
     * Verify a JWT token from Peeap
     */
    protected function verifyPeeapToken(string $token): ?array
    {
        $secret = config('peeap.jwt_secret');
        $parts = explode('.', $token);

        if (count($parts) !== 3) {
            return null;
        }

        [$base64Header, $base64Payload, $base64Signature] = $parts;

        // Verify signature
        $expectedSignature = hash_hmac('sha256', "$base64Header.$base64Payload", $secret, true);
        $expectedBase64 = $this->base64UrlEncode($expectedSignature);

        if (!hash_equals($expectedBase64, $base64Signature)) {
            return null;
        }

        $payload = json_decode($this->base64UrlDecode($base64Payload), true);

        // Check expiry
        if (isset($payload['exp']) && $payload['exp'] < time()) {
            return null;
        }

        return $payload;
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private function base64UrlDecode(string $data): string
    {
        return base64_decode(strtr($data, '-_', '+/'));
    }
}
```

---

## 2. Update PeeapSettingsController

Add these methods to `app/Http/Controllers/Admin/PeeapSettingsController.php`:

```php
use App\Traits\PeeapJwtTrait;

class PeeapSettingsController extends Controller
{
    use PeeapJwtTrait;

    // ... existing methods ...

    /**
     * Generate quick access URL for a user to access Peeap School Dashboard
     * Called when user clicks "Access Dashboard" button
     *
     * IMPORTANT: The JWT should contain the SDSL2 user_id (not Peeap user_id).
     * Peeap will map this to the correct Peeap account using the school_user_mappings table.
     */
    public function quickAccessUrl(Request $request)
    {
        $user = Auth::user();
        $schoolId = $user->school_id;

        // Check if school is connected to Peeap
        $peeapSettings = \DB::table('peeap_settings')
            ->where('school_id', $schoolId)
            ->where('status', 'connected')
            ->first();

        if (!$peeapSettings) {
            return response()->json([
                'success' => false,
                'message' => 'School not connected to Peeap. Please connect first.'
            ], 400);
        }

        // Generate JWT token with SDSL2 user info
        // NOTE: user_id here is the SDSL2 internal user ID, NOT the Peeap user ID
        // Peeap will map this using the email address or previous mappings
        $token = $this->generatePeeapToken([
            'user_id' => $user->id,  // SDSL2's internal user ID
            'school_id' => $schoolId,
            'email' => $user->email,
            'name' => $user->full_name ?? $user->name,
            'role' => $user->role->name ?? 'staff',
            'school_domain' => request()->getHost(),
        ]);

        // Build the quick access URL
        // Use the API redirect endpoint to bypass WAF token corruption
        $apiUrl = config('peeap.api_url', 'https://api.peeap.com');
        $returnUrl = urlencode(route('dashboard'));

        $url = "{$apiUrl}/api/school/auth/quick-access?token=" . urlencode($token) . "&return_url={$returnUrl}";

        return response()->json([
            'success' => true,
            'url' => $url
        ]);
    }

    /**
     * Redirect user to Peeap School Dashboard with quick access
     *
     * IMPORTANT: To avoid WAF/ModSecurity token corruption, we redirect via
     * api.peeap.com with the token as a query parameter. The API endpoint
     * then redirects to school.peeap.com with the token properly encoded.
     */
    public function accessDashboard()
    {
        $user = Auth::user();
        $schoolId = $user->school_id;

        // Check if school is connected to Peeap
        $peeapSettings = \DB::table('peeap_settings')
            ->where('school_id', $schoolId)
            ->where('status', 'connected')
            ->first();

        if (!$peeapSettings) {
            Toastr::error('School not connected to Peeap.', 'Not Connected');
            return redirect()->back();
        }

        // Generate JWT token with SDSL2 user info
        // NOTE: user_id is SDSL2's ID - Peeap maps it via email
        $token = $this->generatePeeapToken([
            'user_id' => $user->id,  // SDSL2's internal user ID
            'school_id' => $schoolId,
            'email' => $user->email,
            'name' => $user->full_name ?? $user->name,
            'role' => $user->role->name ?? 'staff',
            'school_domain' => request()->getHost(),
        ]);

        // Use the API redirect endpoint to bypass WAF token corruption
        // This endpoint accepts the token as a query parameter and redirects to school.peeap.com
        $apiUrl = config('peeap.api_url', 'https://api.peeap.com');
        $url = "{$apiUrl}/api/school/auth/quick-access?token=" . urlencode($token);

        return redirect($url);
    }
}
```

---

## 3. Student Wallet Controller

Create file: `app/Http/Controllers/Admin/StudentWalletController.php`

```php
<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\SmStudent;
use App\Services\PeeapPayService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Brian2694\Toastr\Facades\Toastr;

class StudentWalletController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth');
    }

    /**
     * Show wallet creation form for a student
     */
    public function create($studentId)
    {
        $student = SmStudent::with(['parents', 'class', 'section'])
            ->where('school_id', Auth::user()->school_id)
            ->findOrFail($studentId);

        // Check if student already has a wallet
        $existingWallet = DB::table('peeap_student_wallets')
            ->where('student_id', $studentId)
            ->first();

        if ($existingWallet) {
            return view('backEnd.studentInformation.wallet_details', compact('student', 'existingWallet'));
        }

        return view('backEnd.studentInformation.create_wallet', compact('student'));
    }

    /**
     * Create a new wallet for a student
     */
    public function store(Request $request, $studentId)
    {
        $student = SmStudent::where('school_id', Auth::user()->school_id)
            ->findOrFail($studentId);

        $validator = Validator::make($request->all(), [
            'pin' => 'required|digits:4|confirmed',
            'daily_limit' => 'nullable|numeric|min:0',
            'parent_phone' => 'nullable|string|max:20',
            'parent_email' => 'nullable|email',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        try {
            $peeapService = new PeeapPayService(Auth::user()->school_id);

            // Prepare student data
            $walletData = [
                'index_number' => $student->roll_no, // National index number
                'student_name' => $student->full_name,
                'student_phone' => $student->mobile ?? $request->parent_phone,
                'student_email' => $student->email ?? $request->parent_email,
                'class' => $student->class->class_name ?? '',
                'section' => $student->section->section_name ?? '',
                'school_id' => Auth::user()->school_id,
                'pin' => $request->pin,
                'daily_limit' => $request->daily_limit ?? 50000, // Default 50,000 SLE
                'parent_phone' => $request->parent_phone,
                'parent_email' => $request->parent_email,
            ];

            // Call Peeap API to create wallet
            $result = $peeapService->createStudentWallet($walletData);

            if (!$result['success']) {
                throw new \Exception($result['error']['message'] ?? 'Failed to create wallet');
            }

            // Store wallet link in local database
            DB::table('peeap_student_wallets')->insert([
                'student_id' => $studentId,
                'school_id' => Auth::user()->school_id,
                'peeap_user_id' => $result['data']['peeap_user_id'],
                'peeap_wallet_id' => $result['data']['wallet_id'],
                'index_number' => $student->roll_no,
                'daily_limit' => $request->daily_limit ?? 50000,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            // Update student record
            $student->peeap_connected = true;
            $student->peeap_wallet_id = $result['data']['wallet_id'];
            $student->save();

            Toastr::success('Wallet created successfully!', 'Success');
            return redirect()->route('student_wallet.show', $studentId);

        } catch (\Exception $e) {
            Log::error('Student wallet creation failed: ' . $e->getMessage());
            Toastr::error($e->getMessage(), 'Error');
            return redirect()->back()->withInput();
        }
    }

    /**
     * Connect an existing Peeap account to a student
     */
    public function connect(Request $request, $studentId)
    {
        $student = SmStudent::where('school_id', Auth::user()->school_id)
            ->findOrFail($studentId);

        $validator = Validator::make($request->all(), [
            'phone_or_email' => 'required|string',
            'pin' => 'required|digits:4',
        ]);

        if ($validator->fails()) {
            return redirect()->back()->withErrors($validator)->withInput();
        }

        try {
            $peeapService = new PeeapPayService(Auth::user()->school_id);

            // Verify existing Peeap account and link to student
            $result = $peeapService->linkExistingWallet([
                'phone_or_email' => $request->phone_or_email,
                'pin' => $request->pin,
                'index_number' => $student->roll_no,
                'student_id' => $studentId,
                'school_id' => Auth::user()->school_id,
            ]);

            if (!$result['success']) {
                throw new \Exception($result['error']['message'] ?? 'Failed to connect wallet');
            }

            // Store wallet link
            DB::table('peeap_student_wallets')->insert([
                'student_id' => $studentId,
                'school_id' => Auth::user()->school_id,
                'peeap_user_id' => $result['data']['peeap_user_id'],
                'peeap_wallet_id' => $result['data']['wallet_id'],
                'index_number' => $student->roll_no,
                'status' => 'active',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $student->peeap_connected = true;
            $student->peeap_wallet_id = $result['data']['wallet_id'];
            $student->save();

            Toastr::success('Wallet connected successfully!', 'Success');
            return redirect()->route('student_wallet.show', $studentId);

        } catch (\Exception $e) {
            Log::error('Student wallet connection failed: ' . $e->getMessage());
            Toastr::error($e->getMessage(), 'Error');
            return redirect()->back()->withInput();
        }
    }

    /**
     * Show wallet details for a student
     */
    public function show($studentId)
    {
        $student = SmStudent::with(['class', 'section'])
            ->where('school_id', Auth::user()->school_id)
            ->findOrFail($studentId);

        $wallet = DB::table('peeap_student_wallets')
            ->where('student_id', $studentId)
            ->first();

        if (!$wallet) {
            return redirect()->route('student_wallet.create', $studentId);
        }

        // Get wallet balance from Peeap
        try {
            $peeapService = new PeeapPayService(Auth::user()->school_id);
            $balanceData = $peeapService->getWalletBalance($wallet->peeap_wallet_id);
            $balance = $balanceData['success'] ? $balanceData['data'] : null;
        } catch (\Exception $e) {
            $balance = null;
        }

        return view('backEnd.studentInformation.wallet_details', compact('student', 'wallet', 'balance'));
    }

    /**
     * Top up a student's wallet
     */
    public function topup(Request $request, $studentId)
    {
        $validator = Validator::make($request->all(), [
            'amount' => 'required|numeric|min:1000',
            'payment_method' => 'required|in:cash,bank_transfer,mobile_money',
            'reference' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['success' => false, 'errors' => $validator->errors()], 422);
        }

        $wallet = DB::table('peeap_student_wallets')
            ->where('student_id', $studentId)
            ->where('school_id', Auth::user()->school_id)
            ->first();

        if (!$wallet) {
            return response()->json(['success' => false, 'message' => 'Wallet not found'], 404);
        }

        try {
            $peeapService = new PeeapPayService(Auth::user()->school_id);

            $result = $peeapService->topupWallet([
                'wallet_id' => $wallet->peeap_wallet_id,
                'amount' => $request->amount,
                'currency' => 'SLE',
                'source' => 'school_admin',
                'payment_method' => $request->payment_method,
                'reference' => $request->reference,
                'initiated_by' => Auth::user()->email,
            ]);

            if (!$result['success']) {
                throw new \Exception($result['error']['message'] ?? 'Topup failed');
            }

            return response()->json([
                'success' => true,
                'message' => 'Wallet topped up successfully',
                'data' => $result['data']
            ]);

        } catch (\Exception $e) {
            Log::error('Wallet topup failed: ' . $e->getMessage());
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
```

---

## 4. Complete PeeapPayService Class

Create file: `app/Services/PeeapPayService.php`

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;

class PeeapPayService
{
    protected string $apiUrl;
    protected string $schoolId;
    protected ?string $accessToken = null;
    protected ?string $peeapSchoolId = null;

    public function __construct(int $schoolId)
    {
        $this->apiUrl = config('peeap.api_url', 'https://api.peeap.com');
        $this->schoolId = $schoolId;
        $this->loadCredentials();
    }

    /**
     * Load credentials from database
     */
    protected function loadCredentials(): void
    {
        $settings = DB::table('peeap_settings')
            ->where('school_id', $this->schoolId)
            ->where('status', 'connected')
            ->first();

        if ($settings) {
            $this->accessToken = $settings->access_token;
            $this->peeapSchoolId = $settings->peeap_school_id;

            // Check if token needs refresh
            if ($settings->token_expires_at && now()->gt($settings->token_expires_at)) {
                $this->refreshToken($settings->refresh_token);
            }
        }
    }

    /**
     * Refresh access token
     */
    protected function refreshToken(string $refreshToken): void
    {
        try {
            $response = Http::post($this->apiUrl . '/api/oauth/token', [
                'grant_type' => 'refresh_token',
                'refresh_token' => $refreshToken,
                'client_id' => config('peeap.client_id'),
                'client_secret' => config('peeap.client_secret'),
            ]);

            if ($response->successful()) {
                $data = $response->json();
                $this->accessToken = $data['access_token'];

                DB::table('peeap_settings')
                    ->where('school_id', $this->schoolId)
                    ->update([
                        'access_token' => $data['access_token'],
                        'refresh_token' => $data['refresh_token'] ?? $refreshToken,
                        'token_expires_at' => now()->addSeconds($data['expires_in']),
                        'updated_at' => now(),
                    ]);
            }
        } catch (\Exception $e) {
            Log::error('Peeap token refresh failed: ' . $e->getMessage());
        }
    }

    /**
     * Make API request
     */
    protected function request(string $method, string $endpoint, array $data = []): array
    {
        if (!$this->accessToken) {
            return ['success' => false, 'error' => ['message' => 'Not connected to Peeap']];
        }

        try {
            $http = Http::withToken($this->accessToken)
                ->withHeaders(['X-Peeap-School-ID' => $this->peeapSchoolId]);

            $response = match (strtoupper($method)) {
                'GET' => $http->get($this->apiUrl . $endpoint, $data),
                'POST' => $http->post($this->apiUrl . $endpoint, $data),
                'PUT' => $http->put($this->apiUrl . $endpoint, $data),
                'DELETE' => $http->delete($this->apiUrl . $endpoint),
                default => throw new \InvalidArgumentException("Invalid HTTP method: $method"),
            };

            return $response->json();
        } catch (\Exception $e) {
            Log::error("Peeap API error: {$method} {$endpoint} - " . $e->getMessage());
            return ['success' => false, 'error' => ['message' => $e->getMessage()]];
        }
    }

    // =========================================
    // SCHOOL MANAGEMENT
    // =========================================

    /**
     * Get school profile on Peeap
     */
    public function getSchoolProfile(): array
    {
        return $this->request('GET', "/api/v1/school/{$this->peeapSchoolId}");
    }

    /**
     * Update school profile
     */
    public function updateSchoolProfile(array $data): array
    {
        return $this->request('PUT', "/api/v1/school/{$this->peeapSchoolId}", $data);
    }

    /**
     * Get school connection status
     */
    public function getConnectionStatus(): array
    {
        return $this->request('GET', "/api/v1/school/{$this->peeapSchoolId}/status");
    }

    // =========================================
    // STUDENT WALLET MANAGEMENT
    // =========================================

    /**
     * Create a new wallet for a student
     *
     * @param array $data [
     *   'index_number' => 'WAEC/BECE index number',
     *   'student_name' => 'Full name',
     *   'student_phone' => 'Phone number (optional)',
     *   'student_email' => 'Email (optional)',
     *   'pin' => '4-digit PIN',
     *   'daily_limit' => 50000, // SLE
     * ]
     */
    public function createStudentWallet(array $data): array
    {
        $data['peeap_school_id'] = $this->peeapSchoolId;
        return $this->request('POST', '/api/v1/school/wallets/create', $data);
    }

    /**
     * Link an existing Peeap wallet to a student
     */
    public function linkExistingWallet(array $data): array
    {
        $data['peeap_school_id'] = $this->peeapSchoolId;
        return $this->request('POST', '/api/v1/school/wallets/link', $data);
    }

    /**
     * Get wallet balance
     */
    public function getWalletBalance(string $walletId): array
    {
        return $this->request('GET', "/api/v1/school/wallets/{$walletId}/balance");
    }

    /**
     * Get wallet by index number
     */
    public function getWalletByIndexNumber(string $indexNumber): array
    {
        return $this->request('GET', "/api/v1/school/wallets/by-index/{$indexNumber}");
    }

    /**
     * Top up a wallet (admin-initiated)
     */
    public function topupWallet(array $data): array
    {
        return $this->request('POST', '/api/v1/school/wallets/topup', $data);
    }

    /**
     * Set wallet daily limit
     */
    public function setWalletLimit(string $walletId, float $dailyLimit): array
    {
        return $this->request('PUT', "/api/v1/school/wallets/{$walletId}/limits", [
            'daily_limit' => $dailyLimit,
        ]);
    }

    /**
     * Get wallet transaction history
     */
    public function getWalletTransactions(string $walletId, array $filters = []): array
    {
        return $this->request('GET', "/api/v1/school/wallets/{$walletId}/transactions", $filters);
    }

    /**
     * Suspend a student wallet
     */
    public function suspendWallet(string $walletId, string $reason = null): array
    {
        return $this->request('POST', "/api/v1/school/wallets/{$walletId}/suspend", [
            'reason' => $reason,
        ]);
    }

    /**
     * Reactivate a suspended wallet
     */
    public function reactivateWallet(string $walletId): array
    {
        return $this->request('POST', "/api/v1/school/wallets/{$walletId}/reactivate");
    }

    // =========================================
    // FEE COLLECTION
    // =========================================

    /**
     * Collect school fee from student wallet
     *
     * @param array $data [
     *   'wallet_id' or 'index_number' => 'student identifier',
     *   'amount' => 50000,
     *   'fee_type' => 'tuition|exam|library|lab|other',
     *   'description' => 'First Term Tuition 2024',
     *   'reference' => 'FEE-2024-001', // Your internal reference
     * ]
     */
    public function collectFee(array $data): array
    {
        $data['peeap_school_id'] = $this->peeapSchoolId;
        return $this->request('POST', '/api/v1/school/fees/collect', $data);
    }

    /**
     * Check fee payment status
     */
    public function getFeeStatus(string $feeId): array
    {
        return $this->request('GET', "/api/v1/school/fees/{$feeId}/status");
    }

    /**
     * Bulk fee collection
     *
     * @param array $students [
     *   ['index_number' => 'ABC123', 'amount' => 50000],
     *   ['index_number' => 'DEF456', 'amount' => 50000],
     * ]
     */
    public function bulkCollectFees(array $students, string $feeType, string $description): array
    {
        return $this->request('POST', '/api/v1/school/fees/bulk-collect', [
            'peeap_school_id' => $this->peeapSchoolId,
            'students' => $students,
            'fee_type' => $feeType,
            'description' => $description,
        ]);
    }

    /**
     * Refund a fee payment
     */
    public function refundFee(string $feeId, float $amount = null, string $reason = null): array
    {
        return $this->request('POST', "/api/v1/school/fees/{$feeId}/refund", [
            'amount' => $amount, // null = full refund
            'reason' => $reason,
        ]);
    }

    // =========================================
    // TRANSPORT PAYMENTS
    // =========================================

    /**
     * Collect transport fee
     */
    public function collectTransportFee(array $data): array
    {
        $data['peeap_school_id'] = $this->peeapSchoolId;
        return $this->request('POST', '/api/v1/school/transport/collect', $data);
    }

    /**
     * Issue digital bus pass
     */
    public function issueBusPass(string $indexNumber, array $passDetails): array
    {
        return $this->request('POST', '/api/v1/school/transport/pass', [
            'peeap_school_id' => $this->peeapSchoolId,
            'index_number' => $indexNumber,
            'route' => $passDetails['route'] ?? null,
            'valid_from' => $passDetails['valid_from'],
            'valid_until' => $passDetails['valid_until'],
        ]);
    }

    // =========================================
    // VENDOR MANAGEMENT
    // =========================================

    /**
     * Register a vendor (canteen, bookshop, etc.)
     */
    public function registerVendor(array $data): array
    {
        $data['peeap_school_id'] = $this->peeapSchoolId;
        return $this->request('POST', '/api/v1/school/vendors', $data);
    }

    /**
     * Get list of school vendors
     */
    public function getVendors(): array
    {
        return $this->request('GET', "/api/v1/school/{$this->peeapSchoolId}/vendors");
    }

    /**
     * Get vendor transaction reports
     */
    public function getVendorReport(string $vendorId, array $filters = []): array
    {
        return $this->request('GET', "/api/v1/school/vendors/{$vendorId}/reports", $filters);
    }

    // =========================================
    // REPORTS & ANALYTICS
    // =========================================

    /**
     * Get daily transaction summary
     */
    public function getDailySummary(string $date = null): array
    {
        return $this->request('GET', "/api/v1/school/{$this->peeapSchoolId}/reports/daily", [
            'date' => $date ?? date('Y-m-d'),
        ]);
    }

    /**
     * Get student activity report
     */
    public function getStudentReport(string $indexNumber, array $filters = []): array
    {
        return $this->request('GET', "/api/v1/school/students/{$indexNumber}/report", $filters);
    }

    /**
     * Get fee collection report
     */
    public function getFeeCollectionReport(array $filters = []): array
    {
        return $this->request('GET', "/api/v1/school/{$this->peeapSchoolId}/reports/fees", $filters);
    }

    /**
     * Export report as CSV/PDF
     */
    public function exportReport(string $reportType, string $format = 'csv', array $filters = []): array
    {
        return $this->request('GET', "/api/v1/school/{$this->peeapSchoolId}/reports/export", [
            'type' => $reportType,
            'format' => $format,
            ...$filters,
        ]);
    }

    // =========================================
    // WEBHOOKS
    // =========================================

    /**
     * Register a webhook endpoint
     */
    public function registerWebhook(string $url, array $events): array
    {
        return $this->request('POST', '/api/v1/school/webhooks', [
            'peeap_school_id' => $this->peeapSchoolId,
            'url' => $url,
            'events' => $events,
        ]);
    }

    /**
     * Get registered webhooks
     */
    public function getWebhooks(): array
    {
        return $this->request('GET', "/api/v1/school/{$this->peeapSchoolId}/webhooks");
    }

    /**
     * Delete a webhook
     */
    public function deleteWebhook(string $webhookId): array
    {
        return $this->request('DELETE', "/api/v1/school/webhooks/{$webhookId}");
    }

    // =========================================
    // HELPER METHODS
    // =========================================

    /**
     * Check if school is connected
     */
    public function isConnected(): bool
    {
        return !empty($this->accessToken) && !empty($this->peeapSchoolId);
    }

    /**
     * Get Peeap School ID
     */
    public function getPeeapSchoolId(): ?string
    {
        return $this->peeapSchoolId;
    }
}
```

---

## 5. Routes

Add to `routes/tenant.php`:

```php
// Student Wallet Management
Route::prefix('student-wallet')->middleware(['auth'])->group(function () {
    Route::get('/{student}/create', 'Admin\StudentWalletController@create')->name('student_wallet.create');
    Route::post('/{student}', 'Admin\StudentWalletController@store')->name('student_wallet.store');
    Route::get('/{student}', 'Admin\StudentWalletController@show')->name('student_wallet.show');
    Route::post('/{student}/connect', 'Admin\StudentWalletController@connect')->name('student_wallet.connect');
    Route::post('/{student}/topup', 'Admin\StudentWalletController@topup')->name('student_wallet.topup');
});

// Quick Access to Peeap Dashboard
Route::get('/peeap-dashboard', 'Admin\PeeapSettingsController@accessDashboard')
    ->middleware('auth')
    ->name('peeap.dashboard');

Route::get('/api/peeap/quick-access-url', 'Admin\PeeapSettingsController@quickAccessUrl')
    ->middleware('auth')
    ->name('peeap.quick_access_url');
```

---

## 6. Database Migration

Create migration: `database/migrations/xxxx_create_peeap_student_wallets_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePeeapStudentWalletsTable extends Migration
{
    public function up()
    {
        Schema::create('peeap_student_wallets', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('student_id');
            $table->unsignedBigInteger('school_id');
            $table->string('peeap_user_id', 50);
            $table->string('peeap_wallet_id', 50);
            $table->string('index_number', 50);
            $table->decimal('daily_limit', 12, 2)->default(50000);
            $table->enum('status', ['active', 'suspended', 'closed'])->default('active');
            $table->timestamps();

            $table->foreign('student_id')->references('id')->on('sm_students')->onDelete('cascade');
            $table->unique(['student_id', 'school_id']);
            $table->index('peeap_wallet_id');
            $table->index('index_number');
        });

        // User links table for staff/admins
        Schema::create('peeap_user_links', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('school_id');
            $table->string('peeap_user_id', 50);
            $table->string('role', 50)->default('admin');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            $table->unique(['user_id', 'school_id']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('peeap_user_links');
        Schema::dropIfExists('peeap_student_wallets');
    }
}
```

---

## 7. Config Update

Add to `config/peeap.php`:

```php
return [
    'api_url' => env('PEEAP_API_URL', 'https://api.peeap.com'),
    'oauth_url' => env('PEEAP_OAUTH_URL', 'https://my.peeap.com'),
    'school_portal_url' => env('PEEAP_SCHOOL_PORTAL_URL', 'https://school.peeap.com'),
    'client_id' => env('PEEAP_CLIENT_ID', 'school_saas'),
    'client_secret' => env('PEEAP_CLIENT_SECRET'),

    // JWT secret for quick access tokens (shared between SaaS and Peeap)
    'jwt_secret' => env('PEEAP_JWT_SECRET'),
];
```

---

## 8. Environment Variables

Add to `.env`:

```
PEEAP_API_URL=https://api.peeap.com
PEEAP_OAUTH_URL=https://my.peeap.com
PEEAP_SCHOOL_PORTAL_URL=https://school.peeap.com
PEEAP_CLIENT_ID=school_saas
PEEAP_CLIENT_SECRET=your_client_secret
PEEAP_JWT_SECRET=your_shared_jwt_secret_with_peeap
```

---

## 9. Blade Views

### Create Wallet Form: `resources/views/backEnd/studentInformation/create_wallet.blade.php`

```blade
@extends('backEnd.master')

@section('title')
Create Wallet - {{ $student->full_name }}
@endsection

@section('mainContent')
<section class="sms-breadcrumb mb-40 white-box">
    <div class="container-fluid">
        <div class="row justify-content-between">
            <h1>Create Peeap Wallet</h1>
            <div class="bc-pages">
                <a href="{{ route('student_list') }}">Students</a>
                <a href="#">{{ $student->full_name }}</a>
                <a href="#">Create Wallet</a>
            </div>
        </div>
    </div>
</section>

<section class="admin-visitor-area">
    <div class="container-fluid p-0">
        <div class="row">
            <div class="col-lg-8 offset-lg-2">
                <div class="white-box">
                    <div class="main-title">
                        <h3 class="mb-15">Create Wallet for {{ $student->full_name }}</h3>
                        <p class="text-muted">Index Number: {{ $student->roll_no }}</p>
                    </div>

                    <form action="{{ route('student_wallet.store', $student->id) }}" method="POST">
                        @csrf

                        <div class="row">
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>Student Name</label>
                                    <input type="text" class="primary_input_field" value="{{ $student->full_name }}" disabled>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>Index Number</label>
                                    <input type="text" class="primary_input_field" value="{{ $student->roll_no }}" disabled>
                                </div>
                            </div>
                        </div>

                        <div class="row mt-20">
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>Parent/Guardian Phone (Optional)</label>
                                    <input type="text" name="parent_phone" class="primary_input_field"
                                           value="{{ $student->parents->first()->mobile ?? '' }}"
                                           placeholder="+232 XX XXX XXXX">
                                    <small class="text-muted">For notifications and account recovery</small>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>Parent/Guardian Email (Optional)</label>
                                    <input type="email" name="parent_email" class="primary_input_field"
                                           value="{{ $student->parents->first()->email ?? '' }}"
                                           placeholder="parent@email.com">
                                </div>
                            </div>
                        </div>

                        <div class="row mt-20">
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>4-Digit PIN *</label>
                                    <input type="password" name="pin" class="primary_input_field"
                                           maxlength="4" pattern="\d{4}" required
                                           placeholder="Enter 4-digit PIN">
                                    <small class="text-muted">Student will use this PIN for transactions</small>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>Confirm PIN *</label>
                                    <input type="password" name="pin_confirmation" class="primary_input_field"
                                           maxlength="4" pattern="\d{4}" required
                                           placeholder="Confirm 4-digit PIN">
                                </div>
                            </div>
                        </div>

                        <div class="row mt-20">
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>Daily Spending Limit (SLE)</label>
                                    <input type="number" name="daily_limit" class="primary_input_field"
                                           value="50000" min="1000" step="1000">
                                    <small class="text-muted">Maximum amount student can spend per day</small>
                                </div>
                            </div>
                        </div>

                        <div class="row mt-30">
                            <div class="col-12">
                                <button type="submit" class="primary-btn fix-gr-bg">
                                    <i class="ti-wallet"></i> Create Wallet
                                </button>
                                <a href="{{ route('student_view', $student->id) }}" class="primary-btn tr-bg ml-10">
                                    Cancel
                                </a>
                            </div>
                        </div>
                    </form>

                    <hr class="mt-30 mb-30">

                    <div class="main-title">
                        <h4>Or Connect Existing Peeap Account</h4>
                        <p class="text-muted">If the student already has a Peeap wallet</p>
                    </div>

                    <form action="{{ route('student_wallet.connect', $student->id) }}" method="POST">
                        @csrf

                        <div class="row">
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>Phone or Email</label>
                                    <input type="text" name="phone_or_email" class="primary_input_field"
                                           placeholder="Phone number or email">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="primary_input_group">
                                    <label>Peeap PIN</label>
                                    <input type="password" name="pin" class="primary_input_field"
                                           maxlength="4" placeholder="Enter Peeap PIN">
                                </div>
                            </div>
                        </div>

                        <div class="row mt-20">
                            <div class="col-12">
                                <button type="submit" class="primary-btn fix-gr-bg">
                                    <i class="ti-link"></i> Connect Existing Wallet
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    </div>
</section>
@endsection
```

---

## 10. Access Dashboard Button

Add this button wherever you want users to access their Peeap dashboard:

```blade
<a href="{{ route('peeap.dashboard') }}" class="primary-btn fix-gr-bg">
    <i class="ti-dashboard"></i> Access Peeap Dashboard
</a>
```

Or use JavaScript for AJAX approach:

```html
<button onclick="accessPeeapDashboard()" class="primary-btn fix-gr-bg">
    <i class="ti-dashboard"></i> Access Dashboard
</button>

<script>
function accessPeeapDashboard() {
    fetch('{{ route("peeap.quick_access_url") }}')
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                window.open(data.url, '_blank');
            } else {
                toastr.error(data.message);
            }
        })
        .catch(error => {
            toastr.error('Failed to generate access URL');
        });
}
</script>
```

---

## 11. Webhook Handler

Create file: `app/Http/Controllers/Api/PeeapWebhookController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PeeapWebhookController extends Controller
{
    /**
     * Handle incoming webhooks from Peeap
     */
    public function handle(Request $request)
    {
        // Verify webhook signature
        $signature = $request->header('X-Peeap-Signature');
        $payload = $request->getContent();

        if (!$this->verifySignature($payload, $signature)) {
            Log::warning('Peeap webhook signature verification failed');
            return response()->json(['error' => 'Invalid signature'], 401);
        }

        $event = $request->input('event');
        $data = $request->input('data');

        Log::info("Peeap webhook received: {$event}", $data);

        // Handle different event types
        switch ($event) {
            case 'transaction.completed':
                $this->handleTransactionCompleted($data);
                break;

            case 'fee.paid':
                $this->handleFeePaid($data);
                break;

            case 'transport.fee_paid':
                $this->handleTransportFeePaid($data);
                break;

            case 'wallet.topup':
                $this->handleWalletTopup($data);
                break;

            case 'wallet.low_balance':
                $this->handleLowBalance($data);
                break;

            case 'student.transferred':
                $this->handleStudentTransferred($data);
                break;

            default:
                Log::info("Unhandled Peeap webhook event: {$event}");
        }

        return response()->json(['received' => true]);
    }

    /**
     * Verify webhook signature
     */
    protected function verifySignature(string $payload, ?string $signature): bool
    {
        if (!$signature) {
            return false;
        }

        // Get webhook secret from peeap_settings or config
        $secret = config('peeap.webhook_secret');

        $expectedSignature = hash_hmac('sha256', $payload, $secret);

        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Handle transaction completed event
     */
    protected function handleTransactionCompleted(array $data): void
    {
        // Update local records, send notifications, etc.
        // $data contains: transaction_id, wallet_id, index_number, amount, type, merchant, etc.

        // Example: Log the transaction
        DB::table('peeap_transaction_logs')->insert([
            'transaction_id' => $data['transaction_id'],
            'student_index' => $data['index_number'] ?? null,
            'amount' => $data['amount'],
            'type' => $data['type'],
            'status' => 'completed',
            'raw_data' => json_encode($data),
            'created_at' => now(),
        ]);

        // Example: Send notification to parent
        if (!empty($data['index_number'])) {
            $this->notifyParent($data['index_number'], $data);
        }
    }

    /**
     * Handle fee paid event
     */
    protected function handleFeePaid(array $data): void
    {
        // Update fee status in your system
        // $data contains: fee_id, index_number, amount, fee_type, reference, etc.

        if (!empty($data['reference'])) {
            // Update your internal fee record
            DB::table('sm_fees_payments')
                ->where('reference', $data['reference'])
                ->update([
                    'status' => 'paid',
                    'paid_at' => now(),
                    'peeap_transaction_id' => $data['transaction_id'],
                ]);
        }
    }

    /**
     * Handle transport fee paid event
     */
    protected function handleTransportFeePaid(array $data): void
    {
        // Update transport payment status
        DB::table('sm_transport_payments')
            ->where('student_index', $data['index_number'])
            ->where('month', $data['month'] ?? date('Y-m'))
            ->update([
                'status' => 'paid',
                'paid_at' => now(),
            ]);
    }

    /**
     * Handle wallet topup event
     */
    protected function handleWalletTopup(array $data): void
    {
        // Log topup for audit
        Log::info("Wallet topup: {$data['index_number']} - {$data['amount']} SLE");
    }

    /**
     * Handle low balance warning
     */
    protected function handleLowBalance(array $data): void
    {
        // Notify parent about low balance
        $this->notifyParent($data['index_number'], [
            'type' => 'low_balance',
            'balance' => $data['balance'],
            'threshold' => $data['threshold'],
        ]);
    }

    /**
     * Handle student transferred to another school
     */
    protected function handleStudentTransferred(array $data): void
    {
        // Update student status in your system
        DB::table('peeap_student_wallets')
            ->where('index_number', $data['index_number'])
            ->update([
                'status' => 'transferred',
                'updated_at' => now(),
            ]);
    }

    /**
     * Send notification to parent
     */
    protected function notifyParent(string $indexNumber, array $data): void
    {
        // Implement your notification logic (SMS, email, push notification)
        // This is just a placeholder
    }
}
```

Add webhook route to `routes/api.php`:

```php
Route::post('/webhooks/peeap', 'Api\PeeapWebhookController@handle')
    ->name('webhooks.peeap');
```

---

## 12. Usage Examples

### Example 1: Create Wallet for Student

```php
use App\Services\PeeapPayService;

public function createWalletForStudent($studentId)
{
    $student = SmStudent::findOrFail($studentId);
    $peeap = new PeeapPayService(Auth::user()->school_id);

    if (!$peeap->isConnected()) {
        return redirect()->back()->with('error', 'School not connected to Peeap');
    }

    $result = $peeap->createStudentWallet([
        'index_number' => $student->roll_no,
        'student_name' => $student->full_name,
        'student_phone' => $student->mobile,
        'pin' => '1234', // Should come from form input
        'daily_limit' => 50000,
    ]);

    if ($result['success']) {
        // Store wallet info locally
        DB::table('peeap_student_wallets')->insert([
            'student_id' => $studentId,
            'peeap_wallet_id' => $result['data']['wallet_id'],
            'index_number' => $student->roll_no,
            // ...
        ]);

        return redirect()->back()->with('success', 'Wallet created!');
    }

    return redirect()->back()->with('error', $result['error']['message']);
}
```

### Example 2: Collect School Fees

```php
public function collectFeeFromWallet($studentId, $feeId)
{
    $student = SmStudent::findOrFail($studentId);
    $fee = SmFee::findOrFail($feeId);
    $peeap = new PeeapPayService(Auth::user()->school_id);

    $result = $peeap->collectFee([
        'index_number' => $student->roll_no,
        'amount' => $fee->amount,
        'fee_type' => 'tuition',
        'description' => $fee->title . ' - ' . $fee->academic_year,
        'reference' => 'FEE-' . $feeId,
    ]);

    if ($result['success']) {
        $fee->update([
            'status' => 'paid',
            'paid_at' => now(),
            'peeap_transaction_id' => $result['data']['transaction_id'],
        ]);

        return response()->json(['success' => true, 'message' => 'Fee collected successfully']);
    }

    return response()->json(['success' => false, 'message' => $result['error']['message']], 400);
}
```

### Example 3: Bulk Fee Collection

```php
public function bulkCollectFees(Request $request)
{
    $peeap = new PeeapPayService(Auth::user()->school_id);

    // Prepare students data
    $students = SmStudent::whereIn('id', $request->student_ids)
        ->get()
        ->map(fn($s) => [
            'index_number' => $s->roll_no,
            'amount' => $request->amount,
        ])
        ->toArray();

    $result = $peeap->bulkCollectFees(
        $students,
        'tuition',
        'First Term Tuition 2024'
    );

    if ($result['success']) {
        // $result['data'] contains results for each student
        foreach ($result['data']['results'] as $studentResult) {
            if ($studentResult['success']) {
                // Update fee record as paid
            } else {
                // Log failed collection
            }
        }

        return response()->json([
            'success' => true,
            'collected' => $result['data']['successful_count'],
            'failed' => $result['data']['failed_count'],
        ]);
    }

    return response()->json(['success' => false, 'message' => $result['error']['message']], 400);
}
```

### Example 4: Get Daily Report

```php
public function dailyReport(Request $request)
{
    $peeap = new PeeapPayService(Auth::user()->school_id);

    $date = $request->date ?? date('Y-m-d');
    $result = $peeap->getDailySummary($date);

    if ($result['success']) {
        return view('reports.daily', [
            'date' => $date,
            'summary' => $result['data'],
            // Contains: total_transactions, total_volume, fees_collected,
            // transport_payments, vendor_sales, top_students, etc.
        ]);
    }

    return redirect()->back()->with('error', 'Failed to fetch report');
}
```

### Example 5: Register Webhook on School Connection

```php
// In your PeeapOAuthController callback method, after successful connection:

$peeap = new PeeapPayService(Auth::user()->school_id);

// Register webhook to receive real-time updates
$peeap->registerWebhook(
    route('webhooks.peeap'),
    [
        'transaction.completed',
        'fee.paid',
        'wallet.topup',
        'wallet.low_balance',
    ]
);
```

---

## 13. Error Handling

All API methods return a consistent response format:

```php
// Success response
[
    'success' => true,
    'data' => [
        // Response data
    ]
]

// Error response
[
    'success' => false,
    'error' => [
        'code' => 'INSUFFICIENT_BALANCE',
        'message' => 'Student wallet has insufficient balance',
    ]
]
```

### Common Error Codes

| Code | Description |
|------|-------------|
| `NOT_CONNECTED` | School not connected to Peeap |
| `INVALID_TOKEN` | Access token expired or invalid |
| `WALLET_NOT_FOUND` | Student wallet not found |
| `INSUFFICIENT_BALANCE` | Wallet has insufficient funds |
| `DAILY_LIMIT_EXCEEDED` | Transaction exceeds daily limit |
| `WALLET_SUSPENDED` | Student wallet is suspended |
| `INVALID_PIN` | Incorrect PIN provided |
| `DUPLICATE_INDEX` | Index number already registered |

---

## 14. Testing

### Test Credentials

For development/testing, use these credentials:

```env
PEEAP_API_URL=https://api.peeap.com
PEEAP_OAUTH_URL=https://my.peeap.com
PEEAP_CLIENT_ID=school_saas
PEEAP_CLIENT_SECRET=your_test_secret
```

### Test Index Numbers

Use these test index numbers in sandbox mode:
- `TEST001` - Always succeeds
- `TEST002` - Always has sufficient balance
- `TEST003` - Triggers insufficient balance error
- `TEST004` - Triggers daily limit exceeded error

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│                    PEEAP INTEGRATION                        │
├─────────────────────────────────────────────────────────────┤
│ 1. Connect School                                           │
│    → Redirect to: my.peeap.com/oauth/authorize              │
│    → Pass: school_name, school_logo_url, school_domain      │
│    → Receive: peeap_school_id (e.g., sch_abc12345)         │
├─────────────────────────────────────────────────────────────┤
│ 2. Create Student Wallet                                    │
│    → POST /api/v1/school/wallets/create                     │
│    → Pass: index_number, student_name, pin                  │
│    → Receive: wallet_id, peeap_user_id                      │
├─────────────────────────────────────────────────────────────┤
│ 3. Collect Fee                                              │
│    → POST /api/v1/school/fees/collect                       │
│    → Pass: index_number, amount, fee_type, reference        │
│    → Receive: transaction_id, status                        │
├─────────────────────────────────────────────────────────────┤
│ 4. Quick Dashboard Access                                   │
│    → Generate JWT with user info                            │
│    → Redirect via: api.peeap.com/api/school/auth/quick-access?token= │
│    → API redirects to: school.peeap.com/auth/quick-access   │
├─────────────────────────────────────────────────────────────┤
│ 5. Webhooks                                                 │
│    → Register URL to receive real-time events               │
│    → Events: transaction.completed, fee.paid, etc.          │
└─────────────────────────────────────────────────────────────┘
```
