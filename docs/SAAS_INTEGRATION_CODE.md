# SaaS Integration Code for SDSL2

This document contains the PHP code to add to your SDSL2 project for:
1. **Flow 2**: Quick Dashboard Access with JWT tokens
2. **Flow 3**: Student Wallet Creation with Index Number

---

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
     */
    public function quickAccessUrl(Request $request)
    {
        $user = Auth::user();
        $schoolId = $user->school_id;

        // Get the user's Peeap connection info
        $peeapUser = \DB::table('peeap_user_links')
            ->where('user_id', $user->id)
            ->where('school_id', $schoolId)
            ->first();

        if (!$peeapUser) {
            return response()->json([
                'success' => false,
                'message' => 'User not connected to Peeap. Please create or connect a wallet first.'
            ], 400);
        }

        // Generate JWT token with user info
        $token = $this->generatePeeapToken([
            'user_id' => $peeapUser->peeap_user_id,
            'school_id' => $schoolId,
            'email' => $user->email,
            'name' => $user->full_name,
            'role' => $user->role->name ?? 'user',
            'school_domain' => request()->getHost(),
        ]);

        // Build the quick access URL
        $baseUrl = config('peeap.school_portal_url', 'https://school.peeap.com');
        $returnUrl = urlencode(route('dashboard'));

        $url = "{$baseUrl}/auth/quick-access?token={$token}&return_url={$returnUrl}";

        return response()->json([
            'success' => true,
            'url' => $url
        ]);
    }

    /**
     * Redirect user to Peeap School Dashboard with quick access
     */
    public function accessDashboard()
    {
        $user = Auth::user();
        $schoolId = $user->school_id;

        // Get the user's Peeap connection info
        $peeapUser = \DB::table('peeap_user_links')
            ->where('user_id', $user->id)
            ->where('school_id', $schoolId)
            ->first();

        if (!$peeapUser) {
            Toastr::error('Please create or connect a Peeap wallet first.', 'Not Connected');
            return redirect()->back();
        }

        // Generate JWT token
        $token = $this->generatePeeapToken([
            'user_id' => $peeapUser->peeap_user_id,
            'school_id' => $schoolId,
            'email' => $user->email,
            'name' => $user->full_name,
            'role' => $user->role->name ?? 'user',
            'school_domain' => request()->getHost(),
        ]);

        $baseUrl = config('peeap.school_portal_url', 'https://school.peeap.com');
        $url = "{$baseUrl}/auth/quick-access?token={$token}";

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

## 4. Add Methods to PeeapPayService

Add these methods to `app/Services/PeeapPayService.php`:

```php
/**
 * Create a new wallet for a student
 */
public function createStudentWallet(array $data)
{
    return $this->request('POST', '/api/v1/school/wallets/create', $data);
}

/**
 * Link an existing Peeap wallet to a student
 */
public function linkExistingWallet(array $data)
{
    return $this->request('POST', '/api/v1/school/wallets/link', $data);
}

/**
 * Get wallet balance
 */
public function getWalletBalance(string $walletId)
{
    return $this->request('GET', "/api/v1/school/wallets/{$walletId}/balance");
}

/**
 * Top up a wallet
 */
public function topupWallet(array $data)
{
    return $this->request('POST', '/api/v1/school/wallets/topup', $data);
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
