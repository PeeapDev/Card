import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../shared/models/user_model.dart';
import '../../../core/storage/secure_storage.dart';

// Auth state provider - listens to Supabase auth changes
final authStateProvider = StreamProvider<User?>((ref) {
  return Supabase.instance.client.auth.onAuthStateChange.map((event) {
    return event.session?.user;
  });
});

// Current user provider
final currentUserProvider = FutureProvider<UserModel?>((ref) async {
  final authState = ref.watch(authStateProvider);

  return authState.when(
    data: (user) async {
      if (user == null) return null;

      final response = await Supabase.instance.client
          .from('profiles')
          .select()
          .eq('id', user.id)
          .single();

      return UserModel(
        id: user.id,
        email: user.email ?? '',
        phone: response['phone'],
        firstName: response['first_name'],
        lastName: response['last_name'],
        avatarUrl: response['avatar_url'],
        isVerified: response['is_verified'] ?? false,
        isMerchant: response['is_merchant'] ?? false,
        role: response['role'] ?? 'user',
        kycStatus: response['kyc_status'],
        createdAt: DateTime.tryParse(response['created_at'] ?? ''),
        updatedAt: DateTime.tryParse(response['updated_at'] ?? ''),
      );
    },
    loading: () => null,
    error: (_, __) => null,
  );
});

// Auth notifier for login/register/logout actions
final authNotifierProvider =
    StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref);
});

class AuthState {
  final bool isLoading;
  final String? error;
  final bool isAuthenticated;

  const AuthState({
    this.isLoading = false,
    this.error,
    this.isAuthenticated = false,
  });

  AuthState copyWith({
    bool? isLoading,
    String? error,
    bool? isAuthenticated,
  }) {
    return AuthState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      isAuthenticated: isAuthenticated ?? this.isAuthenticated,
    );
  }
}

class AuthNotifier extends StateNotifier<AuthState> {
  final Ref _ref;
  final _supabase = Supabase.instance.client;

  AuthNotifier(this._ref) : super(const AuthState());

  // Login with email and password
  Future<bool> loginWithEmail(String email, String password) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _supabase.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        state = state.copyWith(isLoading: false, isAuthenticated: true);
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        error: 'Login failed. Please try again.',
      );
      return false;
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred',
      );
      return false;
    }
  }

  // Login with phone (OTP)
  Future<bool> loginWithPhone(String phone) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _supabase.auth.signInWithOtp(
        phone: phone,
      );

      state = state.copyWith(isLoading: false);
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred',
      );
      return false;
    }
  }

  // Verify OTP
  Future<bool> verifyOtp(String phone, String otp) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _supabase.auth.verifyOTP(
        phone: phone,
        token: otp,
        type: OtpType.sms,
      );

      if (response.user != null) {
        state = state.copyWith(isLoading: false, isAuthenticated: true);
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        error: 'Invalid OTP. Please try again.',
      );
      return false;
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred',
      );
      return false;
    }
  }

  // Register with email
  Future<bool> registerWithEmail({
    required String email,
    required String password,
    required String firstName,
    required String lastName,
    String? phone,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _supabase.auth.signUp(
        email: email,
        password: password,
        data: {
          'first_name': firstName,
          'last_name': lastName,
          'phone': phone,
        },
      );

      if (response.user != null) {
        // Create profile record
        await _supabase.from('profiles').insert({
          'id': response.user!.id,
          'email': email,
          'first_name': firstName,
          'last_name': lastName,
          'phone': phone,
        });

        state = state.copyWith(isLoading: false, isAuthenticated: true);
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        error: 'Registration failed. Please try again.',
      );
      return false;
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred',
      );
      return false;
    }
  }

  // Forgot password
  Future<bool> sendPasswordResetEmail(String email) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      await _supabase.auth.resetPasswordForEmail(email);
      state = state.copyWith(isLoading: false);
      return true;
    } on AuthException catch (e) {
      state = state.copyWith(isLoading: false, error: e.message);
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An unexpected error occurred',
      );
      return false;
    }
  }

  // Logout
  Future<void> logout() async {
    state = state.copyWith(isLoading: true);

    try {
      await _supabase.auth.signOut();

      // Clear secure storage
      final secureStorage = _ref.read(secureStorageProvider);
      await secureStorage.clearAll();

      state = const AuthState();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Logout failed');
    }
  }

  // Clear error
  void clearError() {
    state = state.copyWith(error: null);
  }
}

// PIN providers
final pinSetupProvider =
    StateNotifierProvider<PinSetupNotifier, PinSetupState>((ref) {
  return PinSetupNotifier(ref);
});

class PinSetupState {
  final String? pin;
  final String? confirmPin;
  final bool isLoading;
  final String? error;

  const PinSetupState({
    this.pin,
    this.confirmPin,
    this.isLoading = false,
    this.error,
  });

  PinSetupState copyWith({
    String? pin,
    String? confirmPin,
    bool? isLoading,
    String? error,
  }) {
    return PinSetupState(
      pin: pin ?? this.pin,
      confirmPin: confirmPin ?? this.confirmPin,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class PinSetupNotifier extends StateNotifier<PinSetupState> {
  final Ref _ref;

  PinSetupNotifier(this._ref) : super(const PinSetupState());

  void setPin(String pin) {
    state = state.copyWith(pin: pin, error: null);
  }

  void setConfirmPin(String pin) {
    state = state.copyWith(confirmPin: pin, error: null);
  }

  Future<bool> savePin() async {
    if (state.pin != state.confirmPin) {
      state = state.copyWith(error: 'PINs do not match');
      return false;
    }

    state = state.copyWith(isLoading: true, error: null);

    try {
      final secureStorage = _ref.read(secureStorageProvider);
      await secureStorage.savePin(state.pin!);

      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Failed to save PIN');
      return false;
    }
  }

  void reset() {
    state = const PinSetupState();
  }
}
