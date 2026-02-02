import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../database/app_database.dart';
import '../database/tables/transactions_table.dart';
import '../services/sync_service.dart';

/// Provider for transaction repository
final transactionRepositoryProvider = Provider<TransactionRepository>((ref) {
  final db = ref.watch(appDatabaseProvider);
  return TransactionRepository(db);
});

/// Transaction filter options
class TransactionFilter {
  final String? type;
  final String? status;
  final String? syncStatus;
  final DateTime? startDate;
  final DateTime? endDate;
  final double? minAmount;
  final double? maxAmount;

  const TransactionFilter({
    this.type,
    this.status,
    this.syncStatus,
    this.startDate,
    this.endDate,
    this.minAmount,
    this.maxAmount,
  });
}

/// Offline-first transaction repository
/// Local DB is source of truth for display
class TransactionRepository {
  final AppDatabase _db;

  TransactionRepository(this._db);

  /// Watch transactions for a wallet (reactive stream)
  Stream<List<Transaction>> watchTransactions(String walletId, {int limit = 50}) {
    return _db.watchTransactions(walletId, limit: limit);
  }

  /// Get transactions for a wallet
  Future<List<Transaction>> getTransactions(
    String walletId, {
    int limit = 50,
    int offset = 0,
    TransactionFilter? filter,
  }) {
    return _db.getTransactions(walletId, limit: limit, offset: offset);
  }

  /// Get a single transaction
  Future<Transaction?> getTransaction(String id) {
    return _db.getTransaction(id);
  }

  /// Get pending transactions (for sync status UI)
  Future<List<Transaction>> getPendingTransactions() {
    return _db.getPendingTransactions();
  }

  /// Get recent transactions across all wallets for a user
  Future<List<Transaction>> getRecentTransactions(
    String userId, {
    int limit = 10,
  }) async {
    final wallets = await _db.getWallets(userId);
    if (wallets.isEmpty) return [];

    // Collect transactions from all wallets
    final allTransactions = <Transaction>[];
    for (final wallet in wallets) {
      final txs = await _db.getTransactions(wallet.id, limit: limit);
      allTransactions.addAll(txs);
    }

    // Sort by date and take top N
    allTransactions.sort((a, b) => b.createdAt.compareTo(a.createdAt));
    return allTransactions.take(limit).toList();
  }

  /// Get transaction statistics
  Future<TransactionStats> getStats(String walletId, {int days = 30}) async {
    final since = DateTime.now().subtract(Duration(days: days));
    final transactions = await _db.getTransactions(walletId, limit: 1000);

    final recentTxs = transactions.where(
      (tx) => tx.createdAt.isAfter(since),
    );

    double totalIn = 0;
    double totalOut = 0;
    int count = 0;

    for (final tx in recentTxs) {
      count++;
      if (tx.receiverWalletId == walletId) {
        totalIn += tx.amount;
      } else if (tx.senderWalletId == walletId) {
        totalOut += tx.amount;
      }
    }

    return TransactionStats(
      totalIn: totalIn,
      totalOut: totalOut,
      transactionCount: count,
      periodDays: days,
    );
  }

  /// Check if a transaction is synced
  Future<bool> isTransactionSynced(String id) async {
    final tx = await _db.getTransaction(id);
    return tx?.syncStatus == SyncStatus.synced;
  }

  /// Get sync status summary
  Future<SyncStatusSummary> getSyncStatusSummary() async {
    final pending = await _db.getPendingTransactions();
    final failed = pending.where((tx) => tx.syncStatus == SyncStatus.failed);

    return SyncStatusSummary(
      pendingCount: pending.where((tx) => tx.syncStatus == SyncStatus.pending).length,
      syncingCount: pending.where((tx) => tx.syncStatus == SyncStatus.syncing).length,
      failedCount: failed.length,
      failedTransactions: failed.toList(),
    );
  }
}

/// Transaction statistics
class TransactionStats {
  final double totalIn;
  final double totalOut;
  final int transactionCount;
  final int periodDays;

  TransactionStats({
    required this.totalIn,
    required this.totalOut,
    required this.transactionCount,
    required this.periodDays,
  });

  double get netFlow => totalIn - totalOut;
  double get averageTransaction =>
      transactionCount > 0 ? (totalIn + totalOut) / transactionCount : 0;
}

/// Sync status summary
class SyncStatusSummary {
  final int pendingCount;
  final int syncingCount;
  final int failedCount;
  final List<Transaction> failedTransactions;

  SyncStatusSummary({
    required this.pendingCount,
    required this.syncingCount,
    required this.failedCount,
    required this.failedTransactions,
  });

  bool get hasPending => pendingCount > 0 || syncingCount > 0;
  bool get hasFailed => failedCount > 0;
  int get totalPending => pendingCount + syncingCount;
}
