import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
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

/// Recent transactions provider (hybrid: server first, cache locally)
final recentTransactionsProvider =
    FutureProvider<List<TransactionModel>>((ref) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;
  final db = ref.read(appDatabaseProvider);

  if (userId == null) return [];

  try {
    // Fetch from server first
    final response = await supabase
        .from('transactions')
        .select()
        .or('sender_id.eq.$userId,receiver_id.eq.$userId')
        .order('created_at', ascending: false)
        .limit(10);

    final transactions = (response as List)
        .map((json) => TransactionModel.fromJson(json))
        .toList();

    // Cache to local DB in background
    _cacheTransactionsToLocal(db, transactions);

    return transactions;
  } catch (e) {
    debugPrint('Server fetch failed, trying local: $e');
    // Fallback to local DB if server fails
    final repository = ref.read(transactionRepositoryProvider);
    final localTx = await repository.getRecentTransactions(userId, limit: 10);

    return localTx.map((tx) => TransactionModel(
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
  }
});

/// Cache transactions to local database
Future<void> _cacheTransactionsToLocal(AppDatabase db, List<TransactionModel> transactions) async {
  for (final tx in transactions) {
    try {
      await db.insertTransaction(TransactionsCompanion(
        id: Value(tx.id),
        serverId: Value(tx.id),
        type: Value(tx.type),
        amount: Value(tx.amount),
        currency: Value(tx.currency),
        status: Value(tx.status),
        description: Value(tx.description),
        reference: Value(tx.reference),
        senderWalletId: Value(tx.senderWalletId),
        receiverWalletId: Value(tx.receiverWalletId),
        senderName: Value(tx.senderName),
        receiverName: Value(tx.receiverName),
        fee: Value(tx.fee),
        syncStatus: const Value(SyncStatus.synced),
        createdAt: Value(tx.createdAt ?? DateTime.now()),
        syncedAt: Value(DateTime.now()),
      ));
    } catch (_) {
      // Ignore duplicate key errors
    }
  }
}

/// All transactions with pagination (hybrid approach)
final transactionsProvider = StateNotifierProvider<TransactionsNotifier,
    AsyncValue<List<TransactionModel>>>((ref) {
  return TransactionsNotifier(ref);
});

class TransactionsNotifier
    extends StateNotifier<AsyncValue<List<TransactionModel>>> {
  final Ref _ref;
  final _supabase = Supabase.instance.client;
  int _page = 0;
  final int _limit = 20;
  bool _hasMore = true;
  String? _filter;
  String? _walletId;

  TransactionsNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadTransactions();
  }

  AppDatabase get _db => _ref.read(appDatabaseProvider);

  Future<void> loadTransactions({bool refresh = false}) async {
    if (refresh) {
      _page = 0;
      _hasMore = true;
      state = const AsyncValue.loading();
    }

    if (!_hasMore && !refresh) return;

    try {
      final userId = _supabase.auth.currentUser?.id;
      if (userId == null) {
        state = const AsyncValue.data([]);
        return;
      }

      List<TransactionModel> transactions;

      try {
        // Try server first
        var query = _supabase
            .from('transactions')
            .select()
            .or('sender_id.eq.$userId,receiver_id.eq.$userId');

        // Apply wallet filter
        if (_walletId != null) {
          query = query.or(
              'sender_wallet_id.eq.$_walletId,receiver_wallet_id.eq.$_walletId');
        }

        // Apply type filter
        if (_filter != null && _filter != 'all') {
          query = query.eq('type', _filter!);
        }

        final response = await query
            .order('created_at', ascending: false)
            .range(_page * _limit, (_page + 1) * _limit - 1);

        transactions = (response as List)
            .map((json) => TransactionModel.fromJson(json))
            .toList();

        // Cache to local DB
        _cacheTransactionsToLocal(_db, transactions);
      } catch (e) {
        debugPrint('Server fetch failed, using local: $e');
        // Fallback to local
        final repository = _ref.read(transactionRepositoryProvider);
        final localTx = _walletId != null
            ? await repository.getTransactions(_walletId!, limit: _limit, offset: _page * _limit)
            : await repository.getRecentTransactions(userId, limit: _limit);

        transactions = localTx.map((tx) => TransactionModel(
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

        // Apply type filter locally
        if (_filter != null && _filter != 'all') {
          transactions = transactions.where((tx) => tx.type == _filter).toList();
        }
      }

      _hasMore = transactions.length == _limit;
      _page++;

      if (refresh || state is AsyncLoading) {
        state = AsyncValue.data(transactions);
      } else {
        state = AsyncValue.data([
          ...state.value ?? [],
          ...transactions,
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

/// Single transaction provider (hybrid)
final transactionProvider =
    FutureProvider.family<TransactionModel?, String>((ref, transactionId) async {
  final supabase = Supabase.instance.client;

  try {
    final response = await supabase
        .from('transactions')
        .select()
        .eq('id', transactionId)
        .single();

    return TransactionModel.fromJson(response);
  } catch (e) {
    // Fallback to local
    final repository = ref.read(transactionRepositoryProvider);
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
  }
});

/// Transaction stats provider (from server with local fallback)
final transactionStatsProvider = FutureProvider<TransactionStats>((ref) async {
  final supabase = Supabase.instance.client;
  final userId = supabase.auth.currentUser?.id;

  if (userId == null) {
    return TransactionStats(income: 0, expense: 0, count: 0);
  }

  try {
    // Get this month's transactions from server
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);

    final response = await supabase
        .from('transactions')
        .select()
        .or('sender_id.eq.$userId,receiver_id.eq.$userId')
        .gte('created_at', startOfMonth.toIso8601String())
        .eq('status', 'completed');

    final transactions = (response as List)
        .map((json) => TransactionModel.fromJson(json))
        .toList();

    double income = 0;
    double expense = 0;

    for (final tx in transactions) {
      if (tx.receiverWalletId != null) {
        income += tx.amount;
      } else if (tx.senderWalletId != null) {
        expense += tx.amount;
      }
    }

    return TransactionStats(
      income: income,
      expense: expense,
      count: transactions.length,
    );
  } catch (e) {
    return TransactionStats(income: 0, expense: 0, count: 0);
  }
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
