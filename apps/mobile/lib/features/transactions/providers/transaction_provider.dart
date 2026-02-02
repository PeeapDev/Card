import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/tables/transactions_table.dart';
import '../../../core/repositories/transaction_repository.dart';
import '../../../core/services/sync_service.dart';
import '../../../shared/models/transaction_model.dart';

/// Stream provider for transactions from local database (reactive, offline-first)
final transactionsStreamProvider =
    StreamProvider.family<List<Transaction>, String>((ref, walletId) {
  final db = ref.watch(appDatabaseProvider);
  return db.watchTransactions(walletId);
});

/// Recent transactions provider (for home screen, from local DB)
final recentTransactionsProvider =
    FutureProvider<List<TransactionModel>>((ref) async {
  final repository = ref.watch(transactionRepositoryProvider);
  final userId = Supabase.instance.client.auth.currentUser?.id;

  if (userId == null) return [];

  final transactions = await repository.getRecentTransactions(userId, limit: 10);

  return transactions.map((tx) => TransactionModel(
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status,
    description: tx.description,
    reference: tx.reference,
    senderWalletId: tx.senderWalletId,
    receiverWalletId: tx.receiverWalletId,
    senderName: tx.senderName,
    receiverName: tx.receiverName,
    fee: tx.fee,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    syncStatus: tx.syncStatus,
  )).toList();
});

/// All transactions with pagination (offline-first)
final transactionsProvider = StateNotifierProvider<TransactionsNotifier,
    AsyncValue<List<TransactionModel>>>((ref) {
  return TransactionsNotifier(ref);
});

class TransactionsNotifier
    extends StateNotifier<AsyncValue<List<TransactionModel>>> {
  final Ref _ref;
  int _page = 0;
  final int _limit = 20;
  bool _hasMore = true;
  String? _filter;
  String? _walletId;

  TransactionsNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadTransactions();
  }

  TransactionRepository get _repository => _ref.read(transactionRepositoryProvider);
  AppDatabase get _db => _ref.read(appDatabaseProvider);

  Future<void> loadTransactions({bool refresh = false}) async {
    if (refresh) {
      _page = 0;
      _hasMore = true;
      state = const AsyncValue.loading();
    }

    if (!_hasMore && !refresh) return;

    try {
      final userId = Supabase.instance.client.auth.currentUser?.id;
      if (userId == null) {
        state = const AsyncValue.data([]);
        return;
      }

      List<Transaction> transactions;

      if (_walletId != null) {
        // Get transactions for specific wallet from local DB
        transactions = await _repository.getTransactions(
          _walletId!,
          limit: _limit,
          offset: _page * _limit,
        );
      } else {
        // Get all recent transactions for user
        transactions = await _repository.getRecentTransactions(
          userId,
          limit: _limit,
        );
      }

      // Apply type filter locally
      if (_filter != null && _filter != 'all') {
        transactions = transactions.where((tx) => tx.type == _filter).toList();
      }

      final transactionModels = transactions.map((tx) => TransactionModel(
        id: tx.id,
        type: tx.type,
        amount: tx.amount,
        currency: tx.currency,
        status: tx.status,
        description: tx.description,
        reference: tx.reference,
        senderWalletId: tx.senderWalletId,
        receiverWalletId: tx.receiverWalletId,
        senderName: tx.senderName,
        receiverName: tx.receiverName,
        fee: tx.fee,
        createdAt: tx.createdAt,
        updatedAt: tx.updatedAt,
        syncStatus: tx.syncStatus,
      )).toList();

      _hasMore = transactionModels.length == _limit;
      _page++;

      if (refresh || state is AsyncLoading) {
        state = AsyncValue.data(transactionModels);
      } else {
        state = AsyncValue.data([
          ...state.value ?? [],
          ...transactionModels,
        ]);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void setFilter(String? filter) {
    _filter = filter;
    loadTransactions(refresh: true);
  }

  void setWalletId(String? walletId) {
    _walletId = walletId;
    loadTransactions(refresh: true);
  }

  bool get hasMore => _hasMore;
}

/// Single transaction provider (from local DB)
final transactionProvider =
    FutureProvider.family<TransactionModel?, String>((ref, transactionId) async {
  final repository = ref.watch(transactionRepositoryProvider);

  final tx = await repository.getTransaction(transactionId);
  if (tx == null) return null;

  return TransactionModel(
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    currency: tx.currency,
    status: tx.status,
    description: tx.description,
    reference: tx.reference,
    senderWalletId: tx.senderWalletId,
    receiverWalletId: tx.receiverWalletId,
    senderName: tx.senderName,
    receiverName: tx.receiverName,
    fee: tx.fee,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    syncStatus: tx.syncStatus,
  );
});

/// Transaction stats provider (from local DB)
final transactionStatsProvider =
    FutureProvider.family<TransactionStats, String?>((ref, walletId) async {
  final repository = ref.watch(transactionRepositoryProvider);
  final userId = Supabase.instance.client.auth.currentUser?.id;

  if (userId == null) {
    return TransactionStats(income: 0, expense: 0, count: 0);
  }

  // Get primary wallet if no wallet specified
  final db = ref.read(appDatabaseProvider);
  final targetWalletId = walletId ?? (await db.getPrimaryWallet(userId))?.id;

  if (targetWalletId == null) {
    return TransactionStats(income: 0, expense: 0, count: 0);
  }

  final stats = await repository.getStats(targetWalletId, days: 30);

  return TransactionStats(
    income: stats.totalIn,
    expense: stats.totalOut,
    count: stats.transactionCount,
  );
});

/// Pending transactions provider (for sync status UI)
final pendingTransactionsProvider = FutureProvider<List<Transaction>>((ref) async {
  final repository = ref.watch(transactionRepositoryProvider);
  return repository.getPendingTransactions();
});

/// Sync status summary provider
final syncStatusSummaryProvider = FutureProvider<SyncStatusSummary>((ref) async {
  final repository = ref.watch(transactionRepositoryProvider);
  return repository.getSyncStatusSummary();
});

class TransactionStats {
  final double income;
  final double expense;
  final int count;

  TransactionStats({
    required this.income,
    required this.expense,
    required this.count,
  });

  double get net => income - expense;
}
