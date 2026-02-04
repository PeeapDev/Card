import 'dart:async';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/tables/sync_queue_table.dart';
import '../../../core/repositories/wallet_repository.dart';
import '../../../core/services/sync_service.dart';
import '../../../core/services/peeap_api_service.dart';
import '../../../shared/models/wallet_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/providers/account_type_provider.dart';

/// Stream provider for wallets from local database (reactive, offline-first)
final walletsStreamProvider = StreamProvider<List<Wallet>>((ref) {
  final db = ref.watch(appDatabaseProvider);
  // Use custom auth user ID (not Supabase Auth)
  final currentUser = ref.watch(currentUserProvider);
  final userId = currentUser?.id;

  if (userId == null) return Stream.value([]);

  return db.watchWallets(userId);
});

/// Wallets list provider (hybrid: API first with timeout, cache locally)
/// Uses API endpoint to bypass RLS issues
final walletsProvider = FutureProvider<List<WalletModel>>((ref) async {
  // Use custom auth user ID (not Supabase Auth)
  final currentUser = ref.watch(currentUserProvider);
  final userId = currentUser?.id;
  final db = ref.read(appDatabaseProvider);

  if (userId == null) {
    debugPrint('walletsProvider: No user ID available');
    return [];
  }

  debugPrint('walletsProvider: Fetching wallets for user: $userId');

  // Helper to safely parse balance as double
  double safeParseBalance(dynamic value) {
    if (value == null) return 0.0;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value) ?? 0.0;
    return 0.0;
  }

  // First, try to load from local DB (fast, offline-friendly)
  List<WalletModel> localWallets = [];
  try {
    final dbWallets = await db.getWallets(userId);
    localWallets = dbWallets.map((w) {
      return WalletModel(
        id: w.id,
        userId: w.userId,
        name: w.name,
        type: w.type,
        balance: safeParseBalance(w.balance),
        currency: w.currency,
        isActive: w.isActive,
        isFrozen: w.isFrozen,
        isPrimary: w.isPrimary,
        accountNumber: w.accountNumber,
        createdAt: w.createdAt,
        updatedAt: w.updatedAt,
      );
    }).toList();
  } catch (e) {
    debugPrint('walletsProvider: Local DB error: $e');
  }

  // Try API fetch with timeout (bypasses RLS)
  try {
    final apiWallets = await peeapApiService.getWallets(userId)
        .timeout(const Duration(seconds: 10));

    if (apiWallets.isEmpty && localWallets.isNotEmpty) {
      debugPrint('walletsProvider: API returned empty, using local');
      return localWallets;
    }

    final wallets = apiWallets.map((json) {
      // Parse wallet type - handle different field names
      String walletType = json['wallet_type'] as String? ??
                          json['type'] as String? ??
                          'primary';

      // Determine if primary based on wallet_type or is_primary
      bool isPrimary = json['is_primary'] == true ||
                       walletType == 'primary';

      // Get wallet name, fallback to type-based name
      String walletName = json['name'] as String? ??
                          _getDefaultWalletName(walletType);

      return WalletModel(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        name: walletName,
        type: walletType,
        balance: safeParseBalance(json['balance']),
        currency: json['currency'] as String? ?? 'SLE',
        isActive: json['is_active'] ?? json['status'] == 'ACTIVE',
        isFrozen: json['is_frozen'] ?? false,
        isPrimary: isPrimary,
        accountNumber: json['external_id'] as String?,
        createdAt: json['created_at'] != null
            ? DateTime.parse(json['created_at'] as String)
            : DateTime.now(),
        updatedAt: json['updated_at'] != null
            ? DateTime.parse(json['updated_at'] as String)
            : null,
      );
    }).toList();

    // Cache to local DB in background
    _cacheWalletsToLocal(db, wallets);

    debugPrint('walletsProvider: Loaded ${wallets.length} wallets from API');
    return wallets;
  } on TimeoutException {
    debugPrint('walletsProvider: Timeout - using local data');
    return localWallets;
  } catch (e) {
    debugPrint('walletsProvider: API error $e - using local data');
    return localWallets;
  }
});

/// Get default wallet name based on type
String _getDefaultWalletName(String type) {
  switch (type.toLowerCase()) {
    case 'primary':
      return 'Main Wallet';
    case 'savings':
      return 'Savings';
    case 'student':
      return 'Student Wallet';
    case 'merchant':
      return 'Business Wallet';
    case 'pos':
    case 'app_pos':
      return 'POS Wallet';
    case 'driver':
    case 'app_driver_wallet':
      return 'Driver Wallet';
    case 'app_events':
      return 'Events Wallet';
    case 'app_payment_links':
      return 'Payment Links';
    case 'app_invoices':
      return 'Invoice Wallet';
    case 'app_terminal':
      return 'Terminal Wallet';
    default:
      return type.replaceAll('_', ' ').replaceAll('app ', '');
  }
}

/// Cache wallets to local database
Future<void> _cacheWalletsToLocal(AppDatabase db, List<WalletModel> wallets) async {
  for (final w in wallets) {
    try {
      await db.upsertWallet(WalletsCompanion(
        id: Value(w.id),
        userId: Value(w.userId),
        name: Value(w.name),
        type: Value(w.type),
        balance: Value(w.balance),
        currency: Value(w.currency),
        isActive: Value(w.isActive),
        isFrozen: Value(w.isFrozen),
        isPrimary: Value(w.isPrimary),
        accountNumber: Value(w.accountNumber),
        createdAt: Value(w.createdAt),
        updatedAt: Value(w.updatedAt),
        lastSyncedAt: Value(DateTime.now()),
      ));
    } catch (_) {}
  }
}

/// Single wallet provider (hybrid)
final walletProvider =
    FutureProvider.family<WalletModel?, String>((ref, walletId) async {
  final supabase = Supabase.instance.client;
  final db = ref.read(appDatabaseProvider);

  try {
    final response = await supabase
        .from('wallets')
        .select()
        .eq('id', walletId)
        .single();

    return WalletModel.fromJson(response);
  } catch (e) {
    // Fallback to local
    try {
      final wallet = await db.getWallet(walletId);
      if (wallet == null) return null;

      // Helper to safely parse balance as double
      double safeParseBalance(dynamic value) {
        if (value == null) return 0.0;
        if (value is double) return value;
        if (value is int) return value.toDouble();
        if (value is num) return value.toDouble();
        if (value is String) return double.tryParse(value) ?? 0.0;
        return 0.0;
      }

      return WalletModel(
        id: wallet.id,
        userId: wallet.userId,
        name: wallet.name,
        type: wallet.type,
        balance: safeParseBalance(wallet.balance),
        currency: wallet.currency,
        isActive: wallet.isActive,
        isFrozen: wallet.isFrozen,
        isPrimary: wallet.isPrimary,
        accountNumber: wallet.accountNumber,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      );
    } catch (localError) {
      debugPrint('walletProvider: Local DB error: $localError');
      return null;
    }
  }
});

/// Primary wallet provider
final primaryWalletProvider = FutureProvider<WalletModel?>((ref) async {
  final wallets = await ref.watch(walletsProvider.future);
  if (wallets.isEmpty) return null;

  return wallets.firstWhere(
    (w) => w.isPrimary,
    orElse: () => wallets.first,
  );
});

/// Filtered wallets based on account type
final filteredWalletsProvider = FutureProvider<List<WalletModel>>((ref) async {
  final wallets = await ref.watch(walletsProvider.future);
  final accountType = ref.watch(currentAccountTypeProvider);

  switch (accountType) {
    case AccountType.personal:
      // Personal: Show primary, savings, and student wallets
      return wallets.where((w) {
        final type = w.type.toLowerCase();
        return type == 'primary' || type == 'savings' || type == 'student';
      }).toList();

    case AccountType.business:
      // Business: Show business wallets
      return wallets.where((w) {
        final type = w.type.toLowerCase();
        return type == 'business' || type == 'school';
      }).toList();

    case AccountType.businessPlus:
      // Business Plus: Show all wallets
      return wallets;
  }
});

/// Total balance for current account type
final accountTypeBalanceProvider = FutureProvider<double>((ref) async {
  final wallets = await ref.watch(filteredWalletsProvider.future);
  return wallets.fold<double>(0.0, (sum, w) => sum + w.balance);
});

/// Total balance provider (across all wallets)
final totalBalanceProvider = FutureProvider<double>((ref) async {
  final wallets = await ref.watch(walletsProvider.future);
  return wallets.fold<double>(0.0, (sum, w) => sum + w.balance);
});

/// Wallet operations state
class WalletOperationsState {
  final bool isLoading;
  final String? error;
  final String? successMessage;
  final String? pendingTransactionId;

  const WalletOperationsState({
    this.isLoading = false,
    this.error,
    this.successMessage,
    this.pendingTransactionId,
  });

  WalletOperationsState copyWith({
    bool? isLoading,
    String? error,
    String? successMessage,
    String? pendingTransactionId,
  }) {
    return WalletOperationsState(
      isLoading: isLoading ?? this.isLoading,
      error: error,
      successMessage: successMessage,
      pendingTransactionId: pendingTransactionId,
    );
  }
}

/// Wallet operations notifier (offline-first)
final walletOperationsProvider =
    StateNotifierProvider<WalletOperationsNotifier, WalletOperationsState>(
        (ref) {
  return WalletOperationsNotifier(ref);
});

class WalletOperationsNotifier extends StateNotifier<WalletOperationsState> {
  final Ref _ref;

  WalletOperationsNotifier(this._ref) : super(const WalletOperationsState());

  WalletRepository get _repository => _ref.read(walletRepositoryProvider);

  /// Send money to another user (offline-first)
  /// Creates local pending transaction, queues for sync
  Future<bool> sendMoney({
    required String recipientPhone,
    required double amount,
    required String walletId,
    String? note,
    String? recipientName,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final txId = await _repository.sendMoney(
        senderWalletId: walletId,
        receiverPhone: recipientPhone,
        amount: amount,
        currency: 'SLE',
        description: note,
        receiverName: recipientName,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Money sent! Transaction pending sync.',
        pendingTransactionId: txId,
      );

      // Refresh wallet data
      _ref.invalidate(walletsProvider);
      _ref.invalidate(walletsStreamProvider);

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  /// Deposit via mobile money (offline-first)
  Future<bool> depositMobileMoney({
    required String provider,
    required String phoneNumber,
    required double amount,
    required String walletId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final txId = await _repository.deposit(
        walletId: walletId,
        amount: amount,
        currency: 'SLE',
        provider: provider,
        phoneNumber: phoneNumber,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Deposit initiated. Approval prompt will be sent to your phone.',
        pendingTransactionId: txId,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  /// Withdraw to mobile money (offline-first)
  Future<bool> withdrawMobileMoney({
    required String provider,
    required String phoneNumber,
    required double amount,
    required String walletId,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final txId = await _repository.withdraw(
        walletId: walletId,
        amount: amount,
        currency: 'SLE',
        provider: provider,
        phoneNumber: phoneNumber,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Withdrawal initiated. Funds will arrive shortly.',
        pendingTransactionId: txId,
      );

      // Refresh wallet data
      _ref.invalidate(walletsProvider);
      _ref.invalidate(walletsStreamProvider);

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  /// Request money (creates payment link)
  Future<bool> requestMoney({
    required String walletId,
    required double amount,
    String? description,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final requestId = await _repository.requestMoney(
        walletId: walletId,
        amount: amount,
        currency: 'SLE',
        description: description,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Payment request created!',
        pendingTransactionId: requestId,
      );

      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: e.toString().replaceFirst('Exception: ', ''),
      );
      return false;
    }
  }

  /// Create a new wallet (offline-first)
  Future<bool> createWallet({
    required String name,
    required String type,
    String currency = 'SLE',
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      // Use custom auth user ID (not Supabase Auth)
      final userId = _ref.read(authNotifierProvider.notifier).currentUserId;
      if (userId == null) {
        state = state.copyWith(isLoading: false, error: 'Not authenticated');
        return false;
      }

      final db = _ref.read(appDatabaseProvider);
      final syncService = _ref.read(syncServiceProvider);
      final walletId = const Uuid().v4();
      final now = DateTime.now();

      // Create wallet locally first
      await db.upsertWallet(WalletsCompanion(
        id: Value(walletId),
        userId: Value(userId),
        name: Value(name),
        type: Value(type),
        balance: const Value(0.0),
        currency: Value(currency),
        isActive: const Value(true),
        isFrozen: const Value(false),
        isPrimary: const Value(false),
        createdAt: Value(now),
        updatedAt: Value(now),
      ));

      // Queue for sync
      await syncService.queueSync(
        entityType: 'wallets',
        entityId: walletId,
        operation: SyncOperation.create,
        payload: {
          'id': walletId,
          'user_id': userId,
          'name': name,
          'type': type,
          'balance': 0,
          'currency': currency,
          'is_active': true,
          'is_frozen': false,
          'is_primary': false,
          'created_at': now.toIso8601String(),
        },
        priority: 2,
      );

      state = state.copyWith(
        isLoading: false,
        successMessage: 'Wallet created successfully',
      );
      _ref.invalidate(walletsProvider);
      _ref.invalidate(walletsStreamProvider);
      return true;
    } catch (e) {
      state = state.copyWith(
        isLoading: false,
        error: 'Failed to create wallet: ${e.toString()}',
      );
      return false;
    }
  }

  /// Force sync all pending transactions
  Future<void> forceSyncNow() async {
    try {
      final syncService = _ref.read(syncServiceProvider);
      await syncService.forceSyncNow();
      state = state.copyWith(successMessage: 'Sync completed');
    } catch (e) {
      state = state.copyWith(error: 'Sync failed: ${e.toString()}');
    }
  }

  void clearMessages() {
    state = state.copyWith(error: null, successMessage: null);
  }

  /// Initiate USSD deposit - generates a payment code
  Future<Map<String, dynamic>?> initiateUssdDeposit({
    required String walletId,
    required double amount,
  }) async {
    state = state.copyWith(isLoading: true, error: null);

    try {
      final supabase = Supabase.instance.client;

      // Call the Monime deposit API via Edge Function or direct API
      final response = await supabase.functions.invoke(
        'monime-deposit',
        body: {
          'walletId': walletId,
          'amount': amount.toInt(), // SLE is whole numbers
          'currency': 'SLE',
          'method': 'PAYMENT_CODE',
        },
      );

      if (response.status == 200 && response.data != null) {
        final data = response.data as Map<String, dynamic>;

        state = state.copyWith(
          isLoading: false,
          successMessage: 'Payment code generated',
        );

        return {
          'ussdCode': data['ussdCode'],
          'paymentCodeId': data['paymentCodeId'],
          'expiresAt': data['expiresAt'],
        };
      } else {
        // Fallback: Try direct RPC call
        final rpcResponse = await supabase.rpc('generate_payment_code', params: {
          'p_wallet_id': walletId,
          'p_amount': amount.toInt(),
          'p_currency': 'SLE',
        });

        if (rpcResponse != null) {
          state = state.copyWith(isLoading: false);
          return {
            'ussdCode': rpcResponse['ussd_code'] ?? '*144*1*${amount.toInt()}#',
            'paymentCodeId': rpcResponse['id'],
            'expiresAt': rpcResponse['expires_at'],
          };
        }

        // Ultimate fallback: Generate a demo USSD code
        state = state.copyWith(isLoading: false);
        return {
          'ussdCode': '*144*1*${amount.toInt()}#',
          'paymentCodeId': 'demo_${DateTime.now().millisecondsSinceEpoch}',
          'expiresAt': DateTime.now().add(const Duration(minutes: 5)).toIso8601String(),
        };
      }
    } catch (e) {
      // Fallback for demo/testing
      state = state.copyWith(isLoading: false);
      return {
        'ussdCode': '*144*1*${amount.toInt()}#',
        'paymentCodeId': 'demo_${DateTime.now().millisecondsSinceEpoch}',
        'expiresAt': DateTime.now().add(const Duration(minutes: 5)).toIso8601String(),
      };
    }
  }

  /// Check payment status for a payment code
  Future<String> checkPaymentStatus(String paymentCodeId) async {
    try {
      final supabase = Supabase.instance.client;

      // Check transaction status
      final response = await supabase
          .from('monime_transactions')
          .select('status')
          .eq('payment_code_id', paymentCodeId)
          .maybeSingle();

      if (response != null) {
        return response['status'] as String? ?? 'pending';
      }

      return 'pending';
    } catch (e) {
      return 'pending';
    }
  }
}

/// Real-time wallet balance from local database (reactive stream)
final walletBalanceStreamProvider =
    StreamProvider.family<double, String>((ref, walletId) {
  final db = ref.watch(appDatabaseProvider);
  // Use custom auth user ID (not Supabase Auth)
  final currentUser = ref.watch(currentUserProvider);
  final userId = currentUser?.id ?? '';

  return db.watchWallets(userId)
      .map((wallets) {
        final wallet = wallets.where((w) => w.id == walletId).firstOrNull;
        return wallet?.balance ?? 0.0;
      });
});

/// Sync status stream for UI feedback
final walletSyncStatusProvider = Provider<SyncState>((ref) {
  return ref.watch(syncStatusProvider);
});
