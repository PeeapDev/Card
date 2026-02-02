import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../shared/models/wallet_model.dart';

// Wallets list provider
final walletsProvider = FutureProvider<List<WalletModel>>((ref) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;

  if (userId == null) return [];

  final response = await supabase
      .from('wallets')
      .select()
      .eq('user_id', userId)
      .order('is_primary', ascending: false)
      .order('created_at', ascending: true);

  return (response as List)
      .map((json) => WalletModel.fromJson(json))
      .toList();
});

// Single wallet provider
final walletProvider =
    FutureProvider.family<WalletModel?, String>((ref, walletId) async {
  final supabase = Supabase.instance.client;

  final response = await supabase
      .from('wallets')
      .select()
      .eq('id', walletId)
      .single();

  return WalletModel.fromJson(response);
});

// Primary wallet provider
final primaryWalletProvider = FutureProvider<WalletModel?>((ref) async {
  final wallets = await ref.watch(walletsProvider.future);
  if (wallets.isEmpty) return null;

  return wallets.firstWhere(
    (w) => w.isPrimary,
    orElse: () => wallets.first,
  );
});

// Total balance provider (across all wallets)
final totalBalanceProvider = FutureProvider<double>((ref) async {
  final wallets = await ref.watch(walletsProvider.future);
  return wallets.fold<double>(0.0, (double sum, wallet) => sum + wallet.balance);
});

// Wallet operations notifier
final walletOperationsProvider =
    StateNotifierProvider<WalletOperationsNotifier, WalletOperationsState>(
        (ref) {
  return WalletOperationsNotifier(ref);
});

class WalletOperationsState {
  final bool isLoading;
  final String? error;
  final String? successMessage;

  const WalletOperationsState({
    this.isLoading = false,
    this.error,
    this.successMessage,
  });

  WalletOperationsState copyWith({
    bool? isLoading,
    String? error,
    String? successMessage,
  }) {
    return WalletOperationsState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      successMessage: successMessage,
    );
  }
}

class WalletOperationsNotifier extends StateNotifier<WalletOperationsState> {
  final Ref _ref;
  final _supabase = Supabase.instance.client;

  WalletOperationsNotifier(this._ref) : super(const WalletOperationsState());

  // Send money to another user
  Future<bool> sendMoney({
    required String recipientPhone,
    required double amount,
    required String walletId,
    String? note,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Call the transfer function in Supabase
      final response = await _supabase.rpc('transfer_money', params: {
        'sender_wallet_id': walletId,
        'recipient_phone': recipientPhone,
        'amount': amount,
        'note': note,
      });

      if (response['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Money sent successfully',
        );
        _ref.invalidate(walletsProvider);
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        error: response['message'] ?? 'Transfer failed',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An error occurred: ${e.toString()}',
      );
      return false;
    }
  }

  // Deposit via mobile money
  Future<bool> depositMobileMoney({
    required String provider,
    required String phoneNumber,
    required double amount,
    required String walletId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _supabase.rpc('initiate_deposit', params: {
        'wallet_id': walletId,
        'provider': provider,
        'phone_number': phoneNumber,
        'amount': amount,
      });

      if (response['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Deposit initiated. Please approve on your phone.',
        );
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        error: response['message'] ?? 'Deposit failed',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An error occurred: ${e.toString()}',
      );
      return false;
    }
  }

  // Withdraw to mobile money
  Future<bool> withdrawMobileMoney({
    required String provider,
    required String phoneNumber,
    required double amount,
    required String walletId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final response = await _supabase.rpc('initiate_withdrawal', params: {
        'wallet_id': walletId,
        'provider': provider,
        'phone_number': phoneNumber,
        'amount': amount,
      });

      if (response['success'] == true) {
        state = state.copyWith(
          isLoading: false,
          successMessage: 'Withdrawal initiated. Funds will arrive shortly.',
        );
        _ref.invalidate(walletsProvider);
        return true;
      }

      state = state.copyWith(
        isLoading: false,
        error: response['message'] ?? 'Withdrawal failed',
      );
      return false;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'An error occurred: ${e.toString()}',
      );
      return false;
    }
  }

  // Create new wallet
  Future<bool> createWallet({
    required String name,
    required String type,
    String currency = 'SLE',
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        state = state.copyWith(isLoading: false, error: 'Not authenticated');
        return false;
      }

      await _supabase.from('wallets').insert({
        'user_id': userId,
        'name': name,
        'type': type,
        'currency': currency,
        'balance': 0,
        'is_active': true,
        'is_frozen': false,
        'is_primary': false,
      });

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Wallet created successfully',
      );
      _ref.invalidate(walletsProvider);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to create wallet: ${e.toString()}',
      );
      return false;
    }
  }

  void clearMessages() {
    state = state.copyWith(error: null, successMessage: null);
  }
}

// Real-time wallet balance subscription
final walletBalanceStreamProvider =
    StreamProvider.family<double, String>((ref, walletId) {
  final supabase = Supabase.instance.client;

  return supabase
      .from('wallets')
      .stream(primaryKey: ['id'])
      .eq('id', walletId)
      .map((data) {
        if (data.isEmpty) return 0.0;
        return (data.first['balance'] as num).toDouble();
      });
});
