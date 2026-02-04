import 'dart:async';
import 'package:drift/drift.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../../core/database/app_database.dart';
import '../../../core/database/tables/transactions_table.dart';
import '../../../core/repositories/transaction_repository.dart';
import '../../../core/services/sync_service.dart';
import '../../../core/services/peeap_api_service.dart';
import '../../../shared/models/transaction_model.dart';
import '../../auth/providers/auth_provider.dart';
import '../../wallet/providers/wallet_provider.dart';

/// Stream provider for transactions from local database (reactive, offline-first)
final transactionsStreamProvider =
    StreamProvider.family<List<Transaction>, String>((ref, walletId) {
  final db = ref.watch(appDatabaseProvider);
  return db.watchTransactions(walletId);
});

/// Recent transactions provider (hybrid: API first with timeout, cache locally)
/// Uses API endpoint to bypass RLS issues
final recentTransactionsProvider =
    FutureProvider<List<TransactionModel>>((ref) async {
  final currentUser = ref.watch(currentUserProvider);
  final userId = currentUser?.id;
  final db = ref.read(appDatabaseProvider);

  if (userId == null) {
    debugPrint('recentTransactionsProvider: No user ID available');
    return [];
  }

  debugPrint('recentTransactionsProvider: Fetching for user: $userId');

  // First, try to load from local DB (fast, offline-friendly)
  List<TransactionModel> localTransactions = [];
  try {
    final repository = ref.read(transactionRepositoryProvider);
    final localTx = await repository.getRecentTransactions(userId, limit: 10);

    localTransactions = localTx.map((tx) => TransactionModel(
      id: tx.id,
      type: tx.type,
      amount: (tx.amount as num).toDouble(),
      currency: tx.currency,
      status: tx.status,
      description: tx.description,
      reference: tx.reference,
      senderWalletId: tx.senderWalletId,
      receiverWalletId: tx.receiverWalletId,
      senderName: tx.senderName,
      receiverName: tx.receiverName,
      fee: tx.fee != null ? (tx.fee as num).toDouble() : null,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      syncStatus: tx.syncStatus,
    )).toList();
  } catch (e) {
    debugPrint('recentTransactionsProvider: Local DB error: $e');
  }

  // Try API fetch with timeout (bypasses RLS)
  try {
    final apiTransactions = await peeapApiService.getTransactions(userId, limit: 20)
        .timeout(const Duration(seconds: 10));

    if (apiTransactions.isEmpty && localTransactions.isNotEmpty) {
      debugPrint('recentTransactionsProvider: API returned empty, using local');
      return localTransactions;
    }

    final transactions = apiTransactions.map((json) {
      // Parse amount - handle negative amounts for outgoing
      double amount = 0.0;
      if (json['amount'] != null) {
        amount = (json['amount'] as num).toDouble();
      }

      // Parse fee
      double? fee;
      if (json['fee'] != null) {
        fee = (json['fee'] as num).toDouble();
      }

      return TransactionModel(
        id: json['id'] as String,
        type: json['type'] as String? ?? 'UNKNOWN',
        amount: amount,
        currency: json['currency'] as String? ?? 'SLE',
        status: json['status'] as String? ?? 'PENDING',
        description: json['description'] as String?,
        reference: json['reference'] as String?,
        senderWalletId: json['sender_wallet_id'] as String? ?? json['wallet_id'] as String?,
        receiverWalletId: json['receiver_wallet_id'] as String?,
        senderName: json['sender_name'] as String?,
        receiverName: json['receiver_name'] as String? ?? json['merchant_name'] as String?,
        fee: fee,
        createdAt: json['created_at'] != null
            ? DateTime.parse(json['created_at'] as String)
            : DateTime.now(),
        updatedAt: json['updated_at'] != null
            ? DateTime.parse(json['updated_at'] as String)
            : null,
        syncStatus: 'synced',
        metadata: json['metadata'] as Map<String, dynamic>?,
      );
    }).toList();

    // Cache to local DB in background
    _cacheTransactionsToLocal(db, transactions);

    debugPrint('recentTransactionsProvider: Loaded ${transactions.length} transactions from API');
    return transactions;
  } on TimeoutException {
    debugPrint('recentTransactionsProvider: Timeout - using local data');
    return localTransactions;
  } catch (e) {
    debugPrint('recentTransactionsProvider: API error $e - using local data');
    return localTransactions;
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
  int _page = 0;
  final int _limit = 20;
  bool _hasMore = true;
  String? _filter;
  String? _walletId;

  TransactionsNotifier(this._ref) : super(const AsyncValue.loading()) {
    loadTransactions();
  }

  AppDatabase get _db => _ref.read(appDatabaseProvider);

  // Get user ID from custom auth
  String? get _userId => _ref.read(currentUserProvider)?.id;

  Future<void> loadTransactions({bool refresh = false}) async {
    if (refresh) {
      _page = 0;
      _hasMore = true;
      state = const AsyncValue.loading();
    }

    if (!_hasMore && !refresh) return;

    try {
      final userId = _userId;
      if (userId == null) {
        debugPrint('TransactionsNotifier: No user ID');
        state = const AsyncValue.data([]);
        return;
      }

      List<TransactionModel> transactions;

      try {
        // Fetch from API (bypasses RLS)
        final apiTransactions = await peeapApiService.getTransactions(
          userId,
          limit: _limit * (_page + 1),
        ).timeout(const Duration(seconds: 10));

        if (apiTransactions.isEmpty) {
          transactions = await _getLocalTransactions(userId);
        } else {
          transactions = apiTransactions.map((json) {
            double amount = 0.0;
            if (json['amount'] != null) {
              amount = (json['amount'] as num).toDouble();
            }

            double? fee;
            if (json['fee'] != null) {
              fee = (json['fee'] as num).toDouble();
            }

            return TransactionModel(
              id: json['id'] as String,
              type: json['type'] as String? ?? 'UNKNOWN',
              amount: amount,
              currency: json['currency'] as String? ?? 'SLE',
              status: json['status'] as String? ?? 'PENDING',
              description: json['description'] as String?,
              reference: json['reference'] as String?,
              senderWalletId: json['sender_wallet_id'] as String? ?? json['wallet_id'] as String?,
              receiverWalletId: json['receiver_wallet_id'] as String?,
              senderName: json['sender_name'] as String?,
              receiverName: json['receiver_name'] as String? ?? json['merchant_name'] as String?,
              fee: fee,
              createdAt: json['created_at'] != null
                  ? DateTime.parse(json['created_at'] as String)
                  : DateTime.now(),
              updatedAt: json['updated_at'] != null
                  ? DateTime.parse(json['updated_at'] as String)
                  : null,
              syncStatus: 'synced',
              metadata: json['metadata'] as Map<String, dynamic>?,
            );
          }).toList();

          // Apply type filter locally if needed
          if (_filter != null && _filter != 'all') {
            transactions = transactions.where((tx) => tx.type == _filter).toList();
          }

          // Apply wallet filter if needed
          if (_walletId != null) {
            transactions = transactions.where((tx) =>
              tx.senderWalletId == _walletId || tx.receiverWalletId == _walletId
            ).toList();
          }

          // Apply pagination
          final start = _page * _limit;
          final end = start + _limit;
          if (start < transactions.length) {
            transactions = transactions.sublist(
              start,
              end > transactions.length ? transactions.length : end,
            );
          } else {
            transactions = [];
          }

          // Cache to local DB
          _cacheTransactionsToLocal(_db, transactions);
        }
      } on TimeoutException {
        debugPrint('TransactionsNotifier: Timeout - using local');
        transactions = await _getLocalTransactions(userId);
      } catch (e) {
        debugPrint('TransactionsNotifier: API error $e - using local');
        transactions = await _getLocalTransactions(userId);
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
      debugPrint('TransactionsNotifier: Error $e');
      state = AsyncValue.error(e, st);
    }
  }

  Future<List<TransactionModel>> _getLocalTransactions(String userId) async {
    final repository = _ref.read(transactionRepositoryProvider);
    final localTx = _walletId != null
        ? await repository.getTransactions(_walletId!, limit: _limit, offset: _page * _limit)
        : await repository.getRecentTransactions(userId, limit: _limit);

    var transactions = localTx.map((tx) => TransactionModel(
      id: tx.id,
      type: tx.type,
      amount: (tx.amount as num).toDouble(),
      currency: tx.currency,
      status: tx.status,
      description: tx.description,
      reference: tx.reference,
      senderWalletId: tx.senderWalletId,
      receiverWalletId: tx.receiverWalletId,
      senderName: tx.senderName,
      receiverName: tx.receiverName,
      fee: tx.fee != null ? (tx.fee as num).toDouble() : null,
      createdAt: tx.createdAt,
      updatedAt: tx.updatedAt,
      syncStatus: tx.syncStatus,
    )).toList();

    // Apply type filter locally
    if (_filter != null && _filter != 'all') {
      transactions = transactions.where((tx) => tx.type == _filter).toList();
    }

    return transactions;
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

/// Single transaction provider (hybrid with timeout)
final transactionProvider =
    FutureProvider.family<TransactionModel?, String>((ref, transactionId) async {
  final supabase = Supabase.instance.client;

  try {
    final response = await supabase
        .from('transactions')
        .select()
        .eq('id', transactionId)
        .single()
        .timeout(const Duration(seconds: 5));

    return TransactionModel.fromJson(response);
  } on TimeoutException {
    debugPrint('transactionProvider: Timeout');
    return _getLocalTransaction(ref, transactionId);
  } catch (e) {
    debugPrint('transactionProvider: Error $e');
    return _getLocalTransaction(ref, transactionId);
  }
});

Future<TransactionModel?> _getLocalTransaction(Ref ref, String transactionId) async {
  final repository = ref.read(transactionRepositoryProvider);
  final tx = await repository.getTransaction(transactionId);
  if (tx == null) return null;

  return TransactionModel(
    id: tx.id,
    type: tx.type,
    amount: (tx.amount as num).toDouble(),
    currency: tx.currency,
    status: tx.status,
    description: tx.description,
    reference: tx.reference,
    senderWalletId: tx.senderWalletId,
    receiverWalletId: tx.receiverWalletId,
    senderName: tx.senderName,
    receiverName: tx.receiverName,
    fee: tx.fee != null ? (tx.fee as num).toDouble() : null,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
    syncStatus: tx.syncStatus,
  );
}

/// Transaction stats provider (with timeout)
final transactionStatsProvider = FutureProvider<TransactionStats>((ref) async {
  final supabase = Supabase.instance.client;
  final currentUser = ref.watch(currentUserProvider);
  final userId = currentUser?.id;

  if (userId == null) {
    return TransactionStats(income: 0.0, expense: 0.0, count: 0);
  }

  // Get user's wallet IDs
  List<String> walletIds = [];
  try {
    final wallets = await ref.read(walletsProvider.future);
    walletIds = wallets.map((w) => w.id).toList();
  } catch (e) {
    debugPrint('transactionStatsProvider: Failed to get wallets: $e');
    return TransactionStats(income: 0.0, expense: 0.0, count: 0);
  }

  if (walletIds.isEmpty) {
    return TransactionStats(income: 0.0, expense: 0.0, count: 0);
  }

  try {
    // Get this month's transactions from server
    final now = DateTime.now();
    final startOfMonth = DateTime(now.year, now.month, 1);

    // Build OR filter for wallet IDs
    final senderFilters = walletIds.map((id) => 'sender_wallet_id.eq.$id').join(',');
    final receiverFilters = walletIds.map((id) => 'receiver_wallet_id.eq.$id').join(',');
    final orFilter = '$senderFilters,$receiverFilters';

    final response = await supabase
        .from('transactions')
        .select()
        .or(orFilter)
        .gte('created_at', startOfMonth.toIso8601String())
        .eq('status', 'completed')
        .timeout(const Duration(seconds: 5));

    final transactions = (response as List)
        .map((json) => TransactionModel.fromJson(json))
        .toList();

    double income = 0;
    double expense = 0;

    // Calculate based on whether user's wallet is receiver (income) or sender (expense)
    for (final tx in transactions) {
      final isReceiver = tx.receiverWalletId != null && walletIds.contains(tx.receiverWalletId);
      final isSender = tx.senderWalletId != null && walletIds.contains(tx.senderWalletId);

      if (isReceiver && !isSender) {
        income += tx.amount;
      } else if (isSender && !isReceiver) {
        expense += tx.amount;
      }
      // If both sender and receiver are user's wallets (internal transfer), don't count
    }

    return TransactionStats(
      income: income,
      expense: expense,
      count: transactions.length,
    );
  } on TimeoutException {
    return TransactionStats(income: 0.0, expense: 0.0, count: 0);
  } catch (e) {
    debugPrint('transactionStatsProvider: Error $e');
    return TransactionStats(income: 0.0, expense: 0.0, count: 0);
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
