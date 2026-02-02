import 'package:drift/drift.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:uuid/uuid.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/tables/sync_queue_table.dart';
import '../../../core/repositories/wallet_repository.dart';
import '../../../core/services/sync_service.dart';
import '../../../shared/models/wallet_model.dart';

/// Stream provider for wallets from local database (reactive, offline-first)
final walletsStreamProvider = StreamProvider<List<Wallet>>((ref) {
  final db = ref.watch(appDatabaseProvider);
  final userId = Supabase.instance.client.auth.currentUser?.id;

  if (userId == null) return Stream.value([]);

  return db.watchWallets(userId);
});

/// Wallets list provider (for compatibility, converts to WalletModel)
final walletsProvider = FutureProvider<List<WalletModel>>((ref) async {
  final db = ref.watch(appDatabaseProvider);
  final userId = Supabase.instance.client.auth.currentUser?.id;

  if (userId == null) return [];

  final wallets = await db.getWallets(userId);
  return wallets.map((w) => WalletModel(
    id: w.id,
    userId: w.userId,
    name: w.name,
    type: w.type,
    balance: w.balance,
    currency: w.currency,
    isActive: w.isActive,
    isFrozen: w.isFrozen,
    isPrimary: w.isPrimary,
    accountNumber: w.accountNumber,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  )).toList();
});

/// Single wallet provider
final walletProvider =
    FutureProvider.family<WalletModel?, String>((ref, walletId) async {
  final db = ref.watch(appDatabaseProvider);

  final wallet = await db.getWallet(walletId);
  if (wallet == null) return null;

  return WalletModel(
    id: wallet.id,
    userId: wallet.userId,
    name: wallet.name,
    type: wallet.type,
    balance: wallet.balance,
    currency: wallet.currency,
    isActive: wallet.isActive,
    isFrozen: wallet.isFrozen,
    isPrimary: wallet.isPrimary,
    accountNumber: wallet.accountNumber,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  );
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

/// Total balance provider (across all wallets, from local DB)
final totalBalanceProvider = FutureProvider<double>((ref) async {
  final repository = ref.watch(walletRepositoryProvider);
  final userId = Supabase.instance.client.auth.currentUser?.id;

  if (userId == null) return 0.0;

  return repository.getTotalBalance(userId);
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
      final userId = Supabase.instance.client.auth.currentUser?.id;
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
}

/// Real-time wallet balance from local database (reactive stream)
final walletBalanceStreamProvider =
    StreamProvider.family<double, String>((ref, walletId) {
  final db = ref.watch(appDatabaseProvider);

  return db.watchWallets(Supabase.instance.client.auth.currentUser?.id ?? '')
      .map((wallets) {
        final wallet = wallets.where((w) => w.id == walletId).firstOrNull;
        return wallet?.balance ?? 0.0;
      });
});

/// Sync status stream for UI feedback
final walletSyncStatusProvider = Provider<SyncState>((ref) {
  return ref.watch(syncStatusProvider);
});
