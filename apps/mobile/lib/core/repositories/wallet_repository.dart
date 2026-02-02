import 'dart:convert';

import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:uuid/uuid.dart';

import '../database/app_database.dart';
import '../database/tables/sync_queue_table.dart';
import '../database/tables/transactions_table.dart';
import '../services/sync_service.dart';

/// Provider for wallet repository
final walletRepositoryProvider = Provider<WalletRepository>((ref) {
  final db = ref.watch(appDatabaseProvider);
  final syncService = ref.watch(syncServiceProvider);
  return WalletRepository(db, syncService);
});

/// Offline-first wallet repository
/// Local DB is source of truth for UI; server validates all transactions
class WalletRepository {
  final AppDatabase _db;
  final SyncService _syncService;
  final _uuid = const Uuid();

  WalletRepository(this._db, this._syncService);

  /// Watch wallets (reactive stream from local DB)
  Stream<List<Wallet>> watchWallets(String userId) {
    return _db.watchWallets(userId);
  }

  /// Get wallets (from local DB)
  Future<List<Wallet>> getWallets(String userId) {
    return _db.getWallets(userId);
  }

  /// Get primary wallet
  Future<Wallet?> getPrimaryWallet(String userId) {
    return _db.getPrimaryWallet(userId);
  }

  /// Get wallet by ID
  Future<Wallet?> getWallet(String id) {
    return _db.getWallet(id);
  }

  /// Get total balance across all wallets (display only)
  Future<double> getTotalBalance(String userId) async {
    final wallets = await getWallets(userId);
    return wallets.fold<double>(0.0, (double sum, w) => sum + w.balance);
  }

  /// Send money (offline-first)
  /// Creates local pending transaction, queues for sync
  Future<String> sendMoney({
    required String senderWalletId,
    required String receiverPhone,
    required double amount,
    required String currency,
    String? description,
    String? receiverName,
  }) async {
    final txId = _uuid.v4();
    final now = DateTime.now();

    // Get sender wallet for balance check
    final senderWallet = await _db.getWallet(senderWalletId);
    if (senderWallet == null) {
      throw Exception('Sender wallet not found');
    }

    // Optimistic balance check (server will validate)
    if (senderWallet.balance < amount) {
      throw Exception('Insufficient balance');
    }

    // Create pending transaction locally
    await _db.insertTransaction(TransactionsCompanion(
      id: Value(txId),
      type: const Value('transfer'),
      amount: Value(amount),
      currency: Value(currency),
      status: const Value('pending'),
      description: Value(description),
      reference: Value('TXN-${now.millisecondsSinceEpoch}'),
      senderWalletId: Value(senderWalletId),
      senderName: Value(senderWallet.name),
      receiverName: Value(receiverName),
      receiverPhone: Value(receiverPhone),
      syncStatus: const Value(SyncStatus.pending),
      createdAt: Value(now),
    ));

    // Optimistically update local balance
    await _db.updateWalletBalance(
      senderWalletId,
      senderWallet.balance - amount,
    );

    // Queue for sync
    await _syncService.queueSync(
      entityType: 'transactions',
      entityId: txId,
      operation: SyncOperation.create,
      payload: {
        'local_id': txId,
        'type': 'transfer',
        'amount': amount,
        'currency': currency,
        'sender_wallet_id': senderWalletId,
        'receiver_phone': receiverPhone,
        'receiver_name': receiverName,
        'description': description,
        'created_at': now.toIso8601String(),
      },
      priority: 1, // High priority for money transfers
    );

    debugPrint('Transaction $txId queued for sync');
    return txId;
  }

  /// Request money (creates payment link)
  Future<String> requestMoney({
    required String walletId,
    required double amount,
    required String currency,
    String? description,
  }) async {
    final requestId = _uuid.v4();
    final now = DateTime.now();

    // Create local record
    await _db.insertTransaction(TransactionsCompanion(
      id: Value(requestId),
      type: const Value('request'),
      amount: Value(amount),
      currency: Value(currency),
      status: const Value('pending'),
      description: Value(description ?? 'Payment request'),
      receiverWalletId: Value(walletId),
      syncStatus: const Value(SyncStatus.pending),
      createdAt: Value(now),
    ));

    // Queue for sync
    await _syncService.queueSync(
      entityType: 'payment_requests',
      entityId: requestId,
      operation: SyncOperation.create,
      payload: {
        'local_id': requestId,
        'wallet_id': walletId,
        'amount': amount,
        'currency': currency,
        'description': description,
        'created_at': now.toIso8601String(),
      },
      priority: 3,
    );

    return requestId;
  }

  /// Deposit money (mobile money, etc.)
  Future<String> deposit({
    required String walletId,
    required double amount,
    required String currency,
    required String provider, // e.g., 'orange_money', 'africell'
    required String phoneNumber,
  }) async {
    final txId = _uuid.v4();
    final now = DateTime.now();

    // Create pending deposit locally
    await _db.insertTransaction(TransactionsCompanion(
      id: Value(txId),
      type: const Value('deposit'),
      amount: Value(amount),
      currency: Value(currency),
      status: const Value('pending'),
      description: Value('Deposit via $provider'),
      receiverWalletId: Value(walletId),
      metadata: Value(jsonEncode({
        'provider': provider,
        'phone': phoneNumber,
      })),
      syncStatus: const Value(SyncStatus.pending),
      createdAt: Value(now),
    ));

    // Queue for sync - deposit needs server to initiate with provider
    await _syncService.queueSync(
      entityType: 'deposits',
      entityId: txId,
      operation: SyncOperation.create,
      payload: {
        'local_id': txId,
        'wallet_id': walletId,
        'amount': amount,
        'currency': currency,
        'provider': provider,
        'phone': phoneNumber,
        'created_at': now.toIso8601String(),
      },
      priority: 1,
    );

    return txId;
  }

  /// Withdraw money (mobile money payout)
  Future<String> withdraw({
    required String walletId,
    required double amount,
    required String currency,
    required String provider,
    required String phoneNumber,
  }) async {
    final txId = _uuid.v4();
    final now = DateTime.now();

    // Get wallet for balance check
    final wallet = await _db.getWallet(walletId);
    if (wallet == null) {
      throw Exception('Wallet not found');
    }

    if (wallet.balance < amount) {
      throw Exception('Insufficient balance');
    }

    // Create pending withdrawal
    await _db.insertTransaction(TransactionsCompanion(
      id: Value(txId),
      type: const Value('withdrawal'),
      amount: Value(amount),
      currency: Value(currency),
      status: const Value('pending'),
      description: Value('Withdrawal to $provider'),
      senderWalletId: Value(walletId),
      metadata: Value(jsonEncode({
        'provider': provider,
        'phone': phoneNumber,
      })),
      syncStatus: const Value(SyncStatus.pending),
      createdAt: Value(now),
    ));

    // Optimistically update balance
    await _db.updateWalletBalance(walletId, wallet.balance - amount);

    // Queue for sync
    await _syncService.queueSync(
      entityType: 'withdrawals',
      entityId: txId,
      operation: SyncOperation.create,
      payload: {
        'local_id': txId,
        'wallet_id': walletId,
        'amount': amount,
        'currency': currency,
        'provider': provider,
        'phone': phoneNumber,
        'created_at': now.toIso8601String(),
      },
      priority: 1,
    );

    return txId;
  }

  /// Handle server callback for transaction status
  Future<void> handleTransactionCallback({
    required String localId,
    required String status,
    String? serverId,
    String? error,
    double? actualAmount,
    double? fee,
  }) async {
    final tx = await _db.getTransaction(localId);
    if (tx == null) return;

    if (status == 'completed' || status == 'successful') {
      await _db.updateTransactionSyncStatus(
        localId,
        status: SyncStatus.synced,
        serverId: serverId,
      );

      // Update balance with actual amount if different
      if (actualAmount != null && actualAmount != tx.amount) {
        final wallet = tx.senderWalletId != null
            ? await _db.getWallet(tx.senderWalletId!)
            : await _db.getWallet(tx.receiverWalletId!);

        if (wallet != null) {
          final diff = actualAmount - tx.amount;
          await _db.updateWalletBalance(wallet.id, wallet.balance - diff);
        }
      }
    } else if (status == 'failed') {
      await _db.updateTransactionSyncStatus(
        localId,
        status: SyncStatus.failed,
        error: error,
      );

      // Rollback optimistic balance update
      if (tx.senderWalletId != null) {
        final wallet = await _db.getWallet(tx.senderWalletId!);
        if (wallet != null) {
          await _db.updateWalletBalance(wallet.id, wallet.balance + tx.amount);
        }
      }
    }
  }
}
